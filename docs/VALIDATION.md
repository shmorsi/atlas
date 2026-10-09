# Validation record — 2026-10-08

Environment: macOS ARM64, Python 3.12.14, Node 22.23.3, Playwright Chromium 156. All model execution used CPU.

| Check | Observed result |
|---|---|
| `.venv/bin/python -m pytest -q` | **24 passed**, 3.93 seconds; one upstream TestClient/httpx deprecation warning |
| `npm run build` | TypeScript checking and Vite production build passed; large-bundle advisory remains |
| `npm run test:ui` | **10 passed**, 25.8 seconds; includes comparison to the saved desktop visual baseline |
| `scripts/check_notebooks.py` | All three notebooks executed; captured outputs saved |
| `npm run setup` | Passed with existing environment; rebuilt bundled data without a data download |
| `.venv/bin/python -m pip check` | No broken requirements |
| Data manifest checks | Source hashes, unique geographic IDs, retained missing values and expected country lookup passed |
| Model replay | All six saved checkpoints reproduced their reported first held-out prediction within 1e-5 |
| Network isolation | Browser blocked all non-local requests; atlas remained operational and issued no external requests |

Screenshots were inspected at 1440px, 1920px, 820px and 390px, plus the structural and forecasting workspaces. The mobile map-note spacing received one final CSS correction and a targeted mobile-layout rerun. No failing tests were deleted. The screenshot baseline is specific to this rendering platform; other operating systems may have legitimate font differences.

Recorded defects fixed during this build: parameter binding in DuckDB view creation, all-null Parquet column types, updated MapLibre import/worker packaging, an empty map color expression, duplicate world copies, chart legend collision, narrow-table wrapping, mobile button accessible names, stale scenario output on changed inputs, CVaR fractional tail weighting, and inadmissible negative modeled prices.

No test establishes causal economic identification, investment profitability, calibrated forecasting reliability or a verified global production network. Those remain outside the available evidence.
