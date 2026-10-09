"""Deterministic cash-flow mathematics and historical portfolio analytics."""

import csv, io, datetime
import numpy as np
from scipy.optimize import brentq
import cvxpy as cp


def bond(face, coupon, yield_rate, years, frequency=2, shift_bp=100):
    if (
        face <= 0
        or coupon < 0
        or years <= 0
        or frequency not in (1, 2, 4)
        or yield_rate <= -frequency
    ):
        raise ValueError("Invalid bond conventions")
    n = round(years * frequency)
    if not np.isclose(n, years * frequency):
        raise ValueError("Maturity must be a whole number of coupon periods")
    t = np.arange(1, n + 1, dtype=float)
    cf = np.full(n, face * coupon / frequency)
    cf[-1] += face

    def price(y):
        return float(np.sum(cf / (1 + y / frequency) ** t))

    pv = cf / (1 + yield_rate / frequency) ** t
    p = float(pv.sum())
    duration = float(np.sum(t / frequency * pv) / p / (1 + yield_rate / frequency))
    convexity = float(
        np.sum(t * (t + 1) / frequency**2 * pv) / p / (1 + yield_rate / frequency) ** 2
    )
    dy = shift_bp / 10000
    if yield_rate + dy <= -frequency:
        raise ValueError("Shifted yield outside pricing domain")
    return {
        "kind": "hypothetical_valuation",
        "price": p,
        "modified_duration": duration,
        "convexity": convexity,
        "shifted_price": price(yield_rate + dy),
        "approximate_change": p * (-duration * dy + 0.5 * convexity * dy**2),
        "exact_change": price(yield_rate + dy) - p,
        "convention": "Nominal annual yield; coupon-period compounding; valuation on coupon date; no accrued interest",
    }


def yield_to_maturity(price, face, coupon, years, frequency=2):
    if price <= 0:
        raise ValueError("Price must be positive")
    return float(
        brentq(
            lambda y: bond(face, coupon, y, years, frequency)["price"] - price,
            -0.95 * frequency,
            100,
        )
    )


def parse_prices(text):
    reader = csv.DictReader(io.StringIO(text))
    fields = reader.fieldnames or []
    if len(fields) < 3 or fields[0] != "date" or len(set(fields)) != len(fields):
        raise ValueError("CSV requires date and at least two unique asset columns")
    if len(fields) > 21:
        raise ValueError("Maximum 20 assets")
    dates = []
    rows = []
    for row in reader:
        try:
            d = datetime.date.fromisoformat(row["date"])
            values = [float(row[k]) for k in fields[1:]]
        except (ValueError, TypeError, KeyError):
            raise ValueError("Invalid date, missing value or nonnumeric price")
        if dates and d <= dates[-1]:
            raise ValueError(
                "Dates must be unique and strictly increasing; no automatic alignment"
            )
        if not np.isfinite(values).all() or min(values) <= 0:
            raise ValueError("Prices must be finite and positive")
        dates.append(d)
        rows.append(values)
    if not 21 <= len(rows) <= 10000:
        raise ValueError("Require 21–10,000 complete price rows")
    p = np.asarray(rows)
    return fields[1:], [d.isoformat() for d in dates[1:]], p[1:] / p[:-1] - 1


def empirical_cvar(losses, alpha=0.95):
    # Rockafellar–Uryasev empirical expected shortfall, including fractional tail mass.
    q = float(np.quantile(losses, alpha, method="inverted_cdf"))
    return q + float(np.maximum(np.asarray(losses) - q, 0).mean()) / (1 - alpha)


def portfolio_stats(returns, weights, periods=252):
    r = np.asarray(returns, float)
    w = np.asarray(weights, float)
    if (
        r.ndim != 2
        or w.shape != (r.shape[1],)
        or not np.isfinite(r).all()
        or not np.isfinite(w).all()
    ):
        raise ValueError("Invalid returns or weights")
    if (w < 0).any() or not np.isclose(w.sum(), 1, atol=1e-6):
        raise ValueError("Long-only weights must sum to one")
    rp = r @ w
    wealth = np.r_[1, np.cumprod(1 + rp)]
    draw = wealth / np.maximum.accumulate(wealth) - 1
    sd = r.std(axis=0, ddof=1)
    cov = np.atleast_2d(np.cov(r, rowvar=False))
    denom = np.outer(sd, sd)
    corr = np.divide(cov, denom, out=np.zeros_like(cov), where=denom > 0)
    return {
        "total_return": float(wealth[-1] - 1),
        "annualized_volatility": float(rp.std(ddof=1) * np.sqrt(periods)),
        "max_drawdown": float(draw.min()),
        "cvar_95": empirical_cvar(-rp),
        "correlation": [
            [None if denom[i, j] == 0 else float(v) for j, v in enumerate(row)]
            for i, row in enumerate(corr)
        ],
        "wealth": wealth.tolist(),
        "drawdown": draw.tolist(),
        "assumption": "Rebalanced to fixed weights each observation; no missing-price filling",
        "observations": len(r),
    }


def optimize(returns, original, method="variance", cap=1, turnover_limit=2, cost_bps=0):
    r = np.asarray(returns, float)
    n = r.shape[1]
    original = np.asarray(original, float)
    if cap * n < 1 - 1e-8:
        raise ValueError("Infeasible concentration cap")
    w = cp.Variable(n)
    constraints = [
        cp.sum(w) == 1,
        w >= 0,
        w <= cap,
        cp.norm1(w - original) <= turnover_limit,
    ]
    turnover = cp.norm1(w - original)
    cost = cost_bps / 10000 * turnover
    if method == "cvar":
        eta = cp.Variable()
        u = cp.Variable(len(r), nonneg=True)
        constraints += [u >= -r @ w - eta]
        objective = eta + cp.sum(u) / (0.05 * len(r)) + cost
    elif method == "variance":
        cov = np.atleast_2d(np.cov(r, rowvar=False))
        objective = cp.quad_form(w, cp.psd_wrap(cov)) + cost
    else:
        raise ValueError("Method must be variance or cvar")
    problem = cp.Problem(cp.Minimize(objective), constraints)
    problem.solve(solver="CLARABEL")
    if problem.status not in ("optimal", "optimal_inaccurate") or w.value is None:
        raise ValueError(f"Optimization failed: {problem.status}")
    weights = np.maximum(w.value, 0)
    weights /= weights.sum()
    if (
        weights.max() > cap + 1e-5
        or np.abs(weights - original).sum() > turnover_limit + 1e-5
    ):
        raise ValueError("Solver constraint residual too large")
    return {
        "weights": weights.tolist(),
        "solver_status": problem.status,
        "objective": float(problem.value),
        "turnover": float(np.abs(weights - original).sum()),
        "transaction_cost": float(np.abs(weights - original).sum() * cost_bps / 10000),
    }
