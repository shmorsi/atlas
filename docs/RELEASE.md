# ATLAS local release candidate

2026-10-09. This package is intended for a local, single-user research demonstration. It does not satisfy every research objective in the original brief and is not an Internet-facing financial service.

## Install and run

Install Node 22+ and Python 3.12–3.13. Extract the archive, open a terminal inside `atlas`, then run:

```sh
npm ci
npm run setup
npm run atlas
```

Open **http://127.0.0.1:8000**. Startup verifies cached source hashes and all saved neural predictions, compiles the frontend, and starts one loopback-only FastAPI server. No data download or model training occurs at startup. Installation needs Internet access for dependencies. Stop with Ctrl+C. If the port is occupied, stop your previous ATLAS instance or set `ATLAS_PORT` to another free port (for example 8001). On PowerShell use `$env:ATLAS_PORT = "8001"`; on macOS/Linux use `ATLAS_PORT=8001 npm run atlas`.

The backend is Python/FastAPI with genuine **PyTorch CPU training and inference**. The structural linear solves use NumPy/SciPy and allocation optimization uses CVXPY; these are appropriate deterministic numerical tools, not neural predictions. Six trained GRU checkpoints and six graph/no-graph checkpoints with chronological evaluations are included. `npm run verify:release` checks all 60 held-out GRU predictions/intervals and 2,430 graph node predictions against actual inference.

## Included and verified

- Guided country exploration, explanations, comparison, responsive map and clearly labeled teaching scenario; full Research view retained.
- 177 geographic entities, 42,900 frozen World Bank records plus 660 separate 2025 records including nulls; source hashes and revised-history limitations.
- 694 observed US Treasury dates spanning 2024–2026 through October 9, with 13 original maturities and newer six-week tenor, local Parquet/XML cache, chart and accessible table.
- Real price/quantity propagation, bond valuation, total-return CSV analysis and constrained variance/CVaR optimization.
- Walk-forward allocation: trailing training windows, drift between rebalances, repeated costs, baseline comparisons and inspectable trade records.
- Actual PyTorch inference from saved weights inside the forecasting UI, with the input window and observed outcome shown separately.
- Bounded request bodies, strict model names/shapes, host validation, checkpoint cache invalidation, source/model integrity gate and production asset serving.
- Actual OECD network, 405 nodes × seven years, supplier map, source audit and exploratory PyTorch graph evaluation.
- Official Fed/ECB event feeds, explicit bounded updates, retained caches on download failure, and separate current-year data.
- Final backend/browser evidence is recorded in VALIDATION.md. GitHub Actions runs setup, backend tests, artifact replay and the production build on Ubuntu, macOS and Windows. The Docker workflow builds the image and smoke-tests the loopback API and UI. Browser interaction tests remain local Chromium evidence.

## Portfolio backtest convention

At each scheduled rebalance, the optimized target is fitted to returns strictly before the trade date. Turnover is the L1 distance from drifted pre-trade holdings. With cost rate c, turnover T and next portfolio return r, net growth is `(1 − cT)(1 + r)`. Costs are proportionally deducted before the holding period; remaining holdings adopt the target weights. Between trades, each asset weight grows by its own gross return and is normalized by portfolio gross return. There is no assumption of cost-free daily rebalancing in this mode. The first supplied allocation is already held; acquiring it is excluded. Baseline allocations are not subjected to optimizer constraints. No spread, impact, tax or liquidity model is implied.

## Remaining release boundaries

The supplied OECD archive has been imported and validated. The five-sector aggregation preserves summed flows and outputs; original 2020 accounting discrepancies are reported rather than repaired. Its historical relationships end in 2022. Graph results use only one held-out year, and ridge outperforms the graph models. Official events cover selected Fed/ECB releases rather than comprehensive world news.

The packaged app includes derived OECD matrices. Rebuilding them requires the original ZIP, as documented in OECD_IMPORT.md. Explicit source refresh is available via `npm run refresh:public`, `npm run refresh:annual`, and the Events update button. No credential is needed for those public sources.

There is no identified oil/monetary causal model, validated shock-to-market bridge, release-vintage-aware forecast dataset, redistributable ETF history, or multi-scenario resilient allocation model. These are substantive research objectives, not interface switches. The neural experiment has only 10 held-out annual outcomes and does not consistently beat its baselines. Its intervals are not calibrated reliability guarantees.

Setup, backend tests, artifact replay and frontend builds passed clean GitHub runners on macOS, Windows and Linux. Browser tests passed on local macOS/Chromium; Safari/Firefox remain unverified. Beginner comprehension and full assistive-technology review require human testing. A large map/chart bundle advisory and an upstream TestClient deprecation warning remain. The application must stay bound to loopback until authentication and service-specific security work are separately designed.

## Packaging and evidence

`npm run package` builds the frontend, runs the integrity gate, and creates `../ATLAS-release.zip` with source, production assets, caches and checkpoints. A `.sha256` checksum accompanies it. Local virtual environments, node_modules and uploaded portfolios are excluded. Package creation uses Git-tracked source: commit/stage intended new files first. Research claims remain limited by `BUILD_STATUS.md`; a passing engineering suite does not supply missing scientific evidence.
