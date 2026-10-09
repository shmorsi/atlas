# Validation record — 2026-10-09

Environment: macOS ARM64, Python 3.12.14, Node 22.23.3, Playwright Chromium 156. All model execution used CPU.

| Check | Observed result |
|---|---|
| `.venv/bin/python -m pytest -q` | **30 passed**, 3.99 seconds; one upstream TestClient/httpx deprecation warning |
| `npm run build` | TypeScript checking and Vite production build passed; large-bundle advisory remains |
| `npm run test:ui` | **19 passed**, 37.4 seconds against the production server; research regression suite plus guided country/comparison/scenario, scrolling, missing/error states and four responsive layouts. Research desktop and guided desktop/mobile screenshot comparisons included |
| `scripts/check_notebooks.py` | All three notebooks executed; captured outputs saved |
| `npm run setup` | Passed with existing environment; rebuilt bundled data without a data download |
| `.venv/bin/python -m pip check` | No broken requirements |
| Data manifest checks | Source hashes, unique geographic IDs, retained missing values and expected country lookup passed |
| Model replay | All six saved checkpoints reproduced all 60 reported held-out predictions within 1e-5 |
| Network isolation | Browser blocked all non-local requests; atlas remained operational and issued no external requests |

The 2026-10-09 release update passed the backend suite, production build, artifact replay gate and browser suite against a single FastAPI process serving built assets on port 8001. Earlier notebook/setup evidence remains from 2026-10-08. No visual baselines needed updating for this release: existing research and guided comparisons passed. Treasury rendering was separately inspected.


Screenshots were inspected at 1440px, 1920px, 820px and 390px, plus the structural and forecasting workspaces. The mobile map-note spacing received one final CSS correction and a targeted mobile-layout rerun. No failing tests were deleted. The screenshot baseline is specific to this rendering platform; other operating systems may have legitimate font differences.

Recorded defects fixed during this build: parameter binding in DuckDB view creation, all-null Parquet column types, updated MapLibre import/worker packaging, an empty map color expression, duplicate world copies, chart legend collision, narrow-table wrapping, mobile button accessible names, stale scenario output on changed inputs, CVaR fractional tail weighting, and inadmissible negative modeled prices.

No test establishes causal economic identification, investment profitability, calibrated forecasting reliability or a verified global production network. Those remain outside the available evidence.

Release ZIP extraction was verified in a temporary directory whose path contained spaces. Source hashes and all 60 PyTorch predictions passed there using the existing Python dependencies; production HTML/map workers were present and local environments absent. This checks artifact completeness, not a clean dependency installation on another OS.
