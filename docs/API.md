# Local API contracts

Interactive OpenAPI: http://127.0.0.1:8000/docs while running. JSON response kinds separate evidence categories.

| Endpoint | Purpose | Evidence type |
|---|---|---|
| GET /api/health | Process liveness | System status |
| GET /api/countries?year=2024 | Common-year country cross-section | Observed, revised history |
| GET /api/countries/JPN | Metadata and historical observations | Observed, revised history |
| GET /api/sources | Source URLs, licenses, hashes | Provenance |
| POST /api/shocks | A, shock vector, price/quantity mode | Hypothetical structural estimate |
| POST /api/bonds | Coupon, yield, maturity, frequency, shift | Hypothetical valuation |
| POST /api/portfolio | CSV, total-return attestation, source, weights, constraints | User-supplied historical analysis |
| GET /api/forecast/evaluation | Saved experiments and all seeds | Retrospective learned prediction evaluation |
| POST /api/forecast/infer | Five-by-four finite feature window; allow-listed saved model | Neural prediction, not causal |

Portfolio returns fractions; UI formats percentages. WDI GDP growth already uses percent units. Never multiply those units together without a specified model.

Inference feature order is US growth, Canadian growth, Japanese growth, US trade/GDP; all in source percent units. Window shape is exactly five annual rows by four features. Input dates are supplied/managed by the caller, and the API does not attest original availability. Error 404 means a required artifact is missing; 422 means invalid input. No external fetching or training occurs in request handling.

## Release endpoints

- `GET /api/ready`: checks required caches and six CPU PyTorch checkpoints; returns 503 when required artifacts are missing/invalid. Readiness is operational, not a research-quality endorsement.
- `GET /api/rates/treasury`: 694 dated curves spanning 2024–2026, with the newer six-week tenor, observed annual percent yields, source metadata and explicit nulls. No spot-curve or total-return inference.
- `GET /api/forecast/replay?model=gru_multivariate_seed17&year=2024`: executes saved PyTorch weights on the actual five-year input window for a held-out target. Returns model output, interval, inputs and separate observed outcome. Model names and target years are allow-listed.
- `POST /api/portfolio/walk-forward`: existing portfolio request plus `train_window` (10–5000) and `rebalance_every` (1–1000). At least two holdout observations and at most 100 rebalances. Repeated costs apply to original/equal-weight/optimized paths, with all allocations and fit dates returned.

Request bodies are capped at 4 MB before parsing (413); unknown hosts are rejected (400). Model windows require exactly 5×4 finite values. Inference loads weights safely with `weights_only=True`, uses evaluation/inference mode and caches up to eight checkpoint identities. Local uploads remain in memory. No Internet-facing deployment or multiuser authentication is provided.

## Network and explicit public-data refresh

- `GET /api/data/coverage`: latest cached annual year, row counts and frozen research cutoff.
- `GET /api/network`: country-sector mapping, source hashes, aggregation and reconciliation diagnostics.
- `GET /api/network/country/{code}?year=2022`: sector output, supplier flows and gross-output shares; supported years 2016–2022.
- `POST /api/network/scenario`: `{country:"SAU",sector:"Energy",shock:0.1,year:2022}`. Fractional cost shock within ±0.5; returns 405-node decomposition, 81 weighted country effects and residual. Hypothetical fixed-coefficient price model.
- `POST /api/studio/simulate`: `{shocks:[{country,sector,shock}], year, pass_through, focus}`. One to five distinct shocks. `country` and `focus` are three-letter area codes; `sector` is Primary, Energy, Manufacturing, Construction or Services; each shock is within ±0.5; `pass_through` is in [0, 1]; `year` is 2016–2022. Defaults are year 2022, pass-through 1 and focus JPN. PyTorch solves the fixed-share system in float64 and differentiates the focus result. Hypothetical cost scenario, not GDP, inflation or an asset return. Unknown or duplicate shocks return 422.
- `GET /api/network/replay?model=graph_seed17`: replays one saved graph checkpoint on the 2022 held-out year. Allowed models are `graph` or `no_graph` with seed 17, 29 or 43. Unknown names return 422. This is held-out historical replay, separate from the structural scenario.
- `GET /api/network/evaluation`: actual all-seed graph/no-graph/baseline results and the one-year test limitation.
- `GET /api/events`: dated official headlines/links and retrieval/source metadata.
- `POST /api/updates`: explicitly starts one bounded background Treasury/Fed/ECB refresh; 202. Duplicate requests share the running job. Browser mutation origins must be local.
- `GET /api/updates`: running/completed/partial_failure/failed status. Download/validation failure preserves the previously published cache for that source group.

Annual WDI updates are a separate CLI (`npm run refresh:annual`); frozen forecasting history is unchanged. No data refresh occurs automatically at startup.
