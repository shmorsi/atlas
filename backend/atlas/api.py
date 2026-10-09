from fastapi import FastAPI, HTTPException, Query, Response
from fastapi.staticfiles import StaticFiles
from starlette.middleware.trustedhost import TrustedHostMiddleware
from atlas.schemas import ForecastResponse, WalkForwardRequest
from fastapi.middleware.cors import CORSMiddleware
from atlas import data
from atlas.http_limits import RequestLimits
from atlas.schemas import CountriesResponse, CountryDetailResponse, ForecastRequest
import json

app = FastAPI(
    title="ATLAS Research API",
    version="0.1.0",
    description="Offline observations and explicitly labeled quantitative models.",
)
app.add_middleware(RequestLimits)
app.add_middleware(
    TrustedHostMiddleware, allowed_hosts=["127.0.0.1", "localhost", "testserver"]
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:5173", "http://localhost:5173"],
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)


@app.get("/api/health")
def health():
    return {"status": "ok", "mode": "offline", "version": "0.1.0"}


@app.get("/api/countries", response_model=CountriesResponse)
def countries(year: int = Query(2024, ge=1960, le=2024)):
    return {"kind": "observed", "year": year, "countries": data.countries(year)}


@app.get("/api/countries/{code}", response_model=CountryDetailResponse)
def country(code: str):
    item = next((c for c in data.countries() if c["id"] == code), None)
    if item is None:
        raise HTTPException(404, "Country not found")
    return {
        **item,
        "observations": data.history(code),
        "kind": "observed",
        "vintage_warning": "Revised history; original publication dates and vintages unavailable. Not point-in-time evidence.",
    }


@app.get("/api/sources")
def sources():
    items = json.loads((data.DATA / "manifest.json").read_text())
    treasury_path = data.DATA / "treasury-manifest.json"
    if treasury_path.exists():
        treasury = json.loads(treasury_path.read_text())
        items.append(
            {
                **treasury,
                "source": treasury["name"],
                "label": "Daily par yield curves",
                "url": treasury["source_url"],
            }
        )
    return items


from atlas.schemas import ShockRequest, BondRequest, PortfolioRequest
from atlas.economics import propagate
from atlas.finance import bond, parse_prices, portfolio_stats, optimize


@app.post("/api/shocks")
def shock(request: ShockRequest):
    try:
        return propagate(request.coefficients, request.shock, request.mode)
    except ValueError as e:
        raise HTTPException(422, str(e))


@app.post("/api/bonds")
def bonds(request: BondRequest):
    try:
        return bond(**request.model_dump())
    except ValueError as e:
        raise HTTPException(422, str(e))


@app.post("/api/portfolio")
def portfolio(request: PortfolioRequest):
    import numpy as np

    try:
        assets, dates, r = parse_prices(request.csv_text)
        # Validate weights before using optimizer; train/test are chronological and disjoint.
        full = portfolio_stats(r, request.weights, request.periods)
        split = int(len(r) * 0.7)
        fit = r[:split]
        test = r[split:]
        optimized = optimize(
            fit,
            request.weights,
            request.method,
            request.cap,
            request.turnover_limit,
            request.cost_bps,
        )
        held = portfolio_stats(test, optimized["weights"], request.periods)
        held["net_total_return"] = (1 + held["total_return"]) * (
            1 - optimized["transaction_cost"]
        ) - 1
        return {
            "kind": "historical_analysis",
            "source": request.source,
            "assets": assets,
            "dates": dates,
            "original": full,
            "optimization": optimized,
            "held_out": held,
            "original_held_out": portfolio_stats(
                test, request.weights, request.periods
            ),
            "equal_weight_held_out": portfolio_stats(
                test, np.ones(len(assets)) / len(assets), request.periods
            ),
            "train_period": [dates[0], dates[split - 1]],
            "test_period": [dates[split], dates[-1]],
            "limitations": [
                "User attests total-return prices; ATLAS cannot independently verify this",
                "Single chronological split; not a rolling backtest",
                "Turnover cost is one-time initial allocation cost; repeated rebalancing costs excluded",
                "Variance objective cost is a regularization penalty, not expected utility",
            ],
        }
    except (ValueError, TypeError) as e:
        raise HTTPException(422, str(e))


@app.get("/api/forecast/evaluation")
def evaluation():
    path = data.DATA / "models/evaluation.json"
    if not path.exists():
        raise HTTPException(404, "No trained model. Run scripts/train.py separately.")
    return json.loads(path.read_text())


@app.post("/api/forecast/infer", response_model=ForecastResponse)
def forecast_inference(request: ForecastRequest):
    from atlas.forecast import infer

    path = data.DATA / "models" / f"{request.model}.pt"
    if not path.exists():
        raise HTTPException(404, "Requested model has not been trained")
    try:
        return infer(path, request.window)
    except ValueError as e:
        raise HTTPException(422, str(e))


@app.get("/api/ready")
def ready(response: Response):
    from atlas.runtime import readiness

    result = readiness()
    if result["status"] != "ready":
        response.status_code = 503
    return result


@app.get("/api/forecast/replay")
def replay(
    model: str = Query(
        "gru_multivariate_seed17",
        pattern=r"^gru_(multivariate|domestic_only)_seed(17|29|43)$",
    ),
    year: int = Query(2024, ge=2015, le=2024),
):
    from atlas.forecast import dataset, infer

    x, y, years, specs = dataset()
    indices = (years == year).nonzero()[0]
    if len(indices) != 1:
        raise HTTPException(404, "Complete historical input window unavailable")
    i = int(indices[0])
    try:
        result = infer(data.DATA / "models" / f"{model}.pt", x[i])
    except FileNotFoundError:
        raise HTTPException(404, "Model checkpoint unavailable")
    return {
        **result,
        "target_year": year,
        "input_years": list(range(year - 6, year - 1)),
        "features": specs,
        "window": x[i].tolist(),
        "observed": float(y[i]),
        "limitation": "Retrospective revised-history replay, not a point-in-time forecast or causal scenario",
    }


@app.get("/api/rates/treasury")
def treasury_curves():
    from atlas.treasury import curves

    try:
        return curves()
    except FileNotFoundError as e:
        raise HTTPException(404, str(e))


@app.post("/api/portfolio/walk-forward")
def portfolio_walk_forward(request: WalkForwardRequest):
    from atlas.finance import walk_forward

    try:
        assets, dates, returns = parse_prices(request.csv_text)
        result = walk_forward(
            returns,
            dates,
            request.weights,
            request.train_window,
            request.rebalance_every,
            request.periods,
            request.method,
            request.cap,
            request.turnover_limit,
            request.cost_bps,
        )
        return {**result, "assets": assets, "source": request.source}
    except ValueError as e:
        raise HTTPException(422, str(e))


# Added last so API routes take precedence. Release mode needs no Vite server.
if (data.ROOT / "dist/index.html").is_file():
    app.mount(
        "/", StaticFiles(directory=data.ROOT / "dist", html=True), name="frontend"
    )
