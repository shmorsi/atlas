# ATLAS release status — 2026-10-09

A packaged local research terminal with production asset serving, reproducible PyTorch experiments, actual OECD tables, dated public-source caches, and a simpler Guided experience. This is the release scope; comprehensive world news, real-time trading and validated causal forecasting are not claimed.

| Area | Included | Boundary |
|---|---|---|
| Country exploration | 177 geometries; 42,900 frozen 1960–2024 WDI rows; separate 660-row 2025 update (592 nonmissing); comparison, maps, search, Guided/Research modes | Revised history, unknown release vintages, explicit missing values |
| Production dependencies | Seven OECD annual tables, 2016–2022; 81 areas × five groups; supplier map, actual bilateral intermediate flows, sector dependence | Aggregated historical statistical tables, not current transport routes or infrastructure |
| Scenarios | 405-node price system, direct/first/higher-order effects, contribution diagnostics; separate editable teaching price/quantity solver | Fixed coefficients and full pass-through; no identified causal oil/monetary or asset-price bridge |
| Rates and portfolios | 694 Treasury curve dates through 2026-10-09; bond math; total-return CSV; CVXPY variance/CVaR optimization; repeated-cost walk-forward backtests | No bundled ETF total-return histories, impact/tax model or multiple-stress robust optimizer |
| PyTorch | Six GRU checkpoints and six graph/no-graph checkpoints; chronological evaluation; baselines; actual inference replay | Small annual samples; graph ridge baseline wins; no consistent neural advantage or calibrated reliability guarantee |
| Events | 30 dated official Fed/ECB releases, filters, source links, explanatory transmission channels, explicit update button | Selected official feeds, not comprehensive global news; no headline-to-return predictions |
| Release | Single loopback FastAPI server, bounded requests, trusted hosts/local-origin mutations, source/model integrity gate, checksummed ZIP | Setup, backend and build passed clean GitHub runners on macOS/Windows/Linux; browser tests are macOS Chromium; Safari/Firefox and human accessibility/comprehension testing remain unverified |

The original broad brief remains incomplete in the boundary column. Those limits are research/data/product requirements, not hidden working features. See RELEASE.md for installation, VALIDATION.md for final checks, and RESEARCH_REPORT.md for measured results.

## Data fidelity

All seven aggregate networks reconcile within the documented sum of constituent tolerances. Published 2020 accounting exceptions remain visible in metadata; no balancing or missing-value imputation is performed. Six independently computed raw CSV transaction-block sums and buyer outputs match the saved aggregation (ICIO_SAMPLE_AUDIT.json). All seven spectral radii are below one.

The 2025 annual cache and refreshable rates/events are separate from frozen model-evaluation data. Offline startup performs no downloads. Forecast evaluation data must be explicitly retrained if changed; the release gate rejects mismatches.

## Known engineering limits

Vite reports a large map/chart bundle advisory. The population overlay and research modules load lazily (28% less compressed initial main JavaScript), network matrices cache in the Python process, and evaluation weights are cached for GRU inference. An upstream Starlette TestClient/httpx deprecation warning remains. The app is for local single-user operation; remote multi-user deployment needs authentication, deployment-specific security, monitoring and operating tests.
