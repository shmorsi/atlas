# ATLAS build status — 2026-10-08

This is a functioning partial implementation, not completion of the full original specification. The application remains locally runnable. No unavailable feature is filled with invented observations or performance.

## Completion matrix

| Milestone | Working and validated | Still required |
|---|---|---|
| 1 — World Atlas | Accepted vertical slice: React/Vite terminal, navigation, real offline map, hover/click, keyboard search, country selection, common-year controls, source register, responsive panels, globe/flat mode, zoom-aware labels, resizable inspector and observed-population overlay | Broader map product features (infrastructure, trade relationships) depend on later data work |
| 2 — Data and production network | World Bank ingestion, validation, hashes, 42,900 records including missing values, 177 geometries / 165 WDI-matched economies, DuckDB/Parquet, SQLite provenance | **Blocked:** OECD official archive returned HTTP 403. No verified production network loaded |
| 3 — Structural propagation | Price and quantity solvers, correct matrix orientation, first/higher-order decomposition, relationship contributions, eigenvalue/conditioning checks, negative-price domain guard and analytic tests | Real country-industry aggregation, coefficient sensitivity study and measured network paths |
| 4 — Finance / portfolios | Bond PV/YTM/duration/convexity; local total-return CSV; volatility, correlation, drawdown, CVaR; CVXPY constraints and chronological holdout with one-time turnover cost | Observed Treasury curves, rolling backtest, repeated rebalancing costs, multi-scenario stress portfolios and supported expected-return model |
| 5 — Forecast pipeline | CPU PyTorch GRU, Gaussian head, seeds, normalization, missing-window filtering, early stopping, saved checkpoints/inference, ridge/mean/persistence baselines, chronological evaluation | Release-vintage-aware monthly data and stronger out-of-sample evidence |
| 6 — GNN / temporal experiments | Six real trained GRU checkpoints; domestic-feature ablation; actual held-out metrics; GNN message/gradient tests and documented feasibility gate | **GNN empirical evaluation blocked** by missing verified network/outcome panel. No Transformer is claimed |
| 7 — Prediction integration | Saved neural evaluations and inference API; clearly separated from hypothetical structural outputs | No validated causal shock-to-macro or macro-to-market bridge. Such outputs remain unavailable |
| 8 — Events / teaching / polish | Annual historical GDP context; 15 learning chapters; 3 executed notebooks; research report, API docs, architecture diagram, demo script, measured résumé suggestions and screenshot gallery | True point-in-time historical replay, daily event/market datasets, and broader product completion |

## Validation evidence

- Backend: 24 Pytest cases (analytic orientation, propagation, unstable inputs, bond finite differences, CVaR fractional tail mass, allocation feasibility, CSV validation, chronology, source hashes, tiny training, checkpoint replay and API contracts).
- Browser: 10 Playwright cases cover navigation/search, historical years, 1440/1920/820/390px layouts, error recovery, end-to-end labs, offline network isolation, rendered polygons, actual map hover/click, population overlay and screenshot comparison.
- Final build/test outputs are recorded in `docs/VALIDATION.md`; all listed checks passed.
- Three notebooks executed and saved with real outputs using `scripts/check_notebooks.py`.
- Screenshot inspection found and fixed duplicated wide-map worlds, map-worker loading, chart-legend overlap, table wrapping, stale scenario outputs, and mobile navigation labels.
- Dependency audit after the visualization library updates reported zero vulnerabilities at installation time.

## Research results

30 training years (1976–2005), 9 validation years, 10 held-out years (2015–2024). Revised-history data with inputs ending t−2. Multivariate GRU RMSEs: 1.9452, 2.0580 and 2.1051 percentage points for seeds 17, 29, 43. Ridge RMSE: 1.9776. Training-mean RMSE: 2.0438. Performance is not consistently better than simple baselines. No large-sample significance or calibration claim. Full seed/ablation tables are in `RESEARCH_REPORT.md` and `data/models/evaluation.json`.

## Data limits and known issues

- Original publication dates and vintages are unknown. No point-in-time evaluation claim.
- Natural Earth 1:110m generalizes boundaries and omits small territories; uses de facto control.
- No verified ICIO, bilateral trade, energy infrastructure, oil series or redistributable ETF history is bundled.
- No causal monetary-policy, oil-supply identification or market-price transmission.
- Portfolio rebalancing costs after initial allocation are excluded and disclosed; no rolling portfolio re-estimation.
- Some chart bundles are large; Vite emits a bundle-size advisory. Local loading works, but further lazy loading is worthwhile.
- Starlette emits a TestClient/httpx deprecation warning. Tests pass; migrating the test transport is future maintenance.
- macOS ARM64 / Python 3.12 / Chromium verified. Windows and Linux setup paths are provided but not executed here. Python 3.12–3.13 is required by the pinned NumPy/SciPy build.

## Next milestone / smallest unblock

Obtain the official OECD regular ICIO archive and metadata through an authorized download, then implement and test ingestion with sector/output/units checks. Do not bypass the source's 403 response. Validate a small documented aggregation before enabling country exposure, graph experiments or geographic economic links. Independently, obtain licensed total-return histories and historical releases for stronger financial and forecasting research.
