# Local API contracts

Interactive OpenAPI: http://127.0.0.1:8000/docs while running. JSON response kinds separate evidence categories.

| Endpoint | Purpose | Evidence type |
|---|---|---|
| GET /api/health | Local readiness | System status |
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
