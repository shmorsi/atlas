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
- `GET /api/rates/treasury`: 250 dated curves / 13 maturities, observed annual percent yields, source metadata and explicit nulls. No spot-curve or total-return inference.
- `GET /api/forecast/replay?model=gru_multivariate_seed17&year=2024`: executes saved PyTorch weights on the actual five-year input window for a held-out target. Returns model output, interval, inputs and separate observed outcome. Model names and target years are allow-listed.
- `POST /api/portfolio/walk-forward`: existing portfolio request plus `train_window` (10–5000) and `rebalance_every` (1–1000). At least two holdout observations and at most 100 rebalances. Repeated costs apply to original/equal-weight/optimized paths, with all allocations and fit dates returned.

Request bodies are capped at 4 MB before parsing (413); unknown hosts are rejected (400). Model windows require exactly 5×4 finite values. Inference loads weights safely with `weights_only=True`, uses evaluation/inference mode and caches up to eight checkpoint identities. Local uploads remain in memory. No Internet-facing deployment or multiuser authentication is provided.
