# ATLAS technical research report

## Scope and scientific boundary

This build is a working local research terminal with real cached macro observations, verified mathematical routines, user-provided portfolio analysis and a small trained PyTorch forecasting experiment. It is **not the completed global causal simulation product**. Historical country-sector production relationships and a limited graph experiment are now included; their scope is documented below.

The pipeline retains 42,900 annual WDI records including nulls for 165 mapped economies, with 177 geographic entities overall. Raw downloads are retained and hashed. Data end in 2024; source retrieval is later and does not define historical publication time. Parquet nullable string fields avoid a DuckDB all-null-column compatibility problem found during testing.

## Structural and financial models

`economics.py` validates finite nonnegative square technical coefficients, column cost shares, spectral radius below one and condition number below 1e8. It solves a linear system for price or quantity propagation and returns direct, first-order and higher-order effects plus relationship contributions and residuals. The default UI matrix is explicitly synthetic. The separate OECD network derives 405-node matrices from seven published tables and provides historical country-sector exposure.

`finance.py` prices coupon cash flows, solves yield-to-maturity, derives duration and convexity and compares exact repricing with a Taylor approximation. Tests include par pricing and finite differences. Portfolio CSV inputs must be complete, positive and date-ordered; the user must explicitly attest total-return adjustment. CVXPY/Clarabel imposes long-only, concentration and turnover constraints. The first 70% of returns fit allocations and the remaining 30% evaluate them. CVaR uses empirical order statistics and fractional tail mass. One-time turnover costs are applied to initial held-out capital; repeated rebalancing costs remain excluded in that single-split mode. A separate walk-forward endpoint now fits trailing windows, allows holdings to drift, and charges proportional costs at every scheduled rebalance. Original and equal-weight baselines use the same dates and cost rates. Trade records expose each training interval and allocation.

## Forecasting design

Target: US annual real GDP growth, in percentage points. Five-year feature windows end at t−2. Features: US, Canadian and Japanese GDP growth plus US trade/GDP. Missing windows are excluded. This leaves 30 training targets (1976–2005), 9 validation targets (2006–2014), and 10 held-out targets (2015–2024). These years are not asserted to be statistically independent.

The compact GRU has eight hidden units and a Gaussian output head, totaling 354 parameters with all features or 282 in the domestic-only ablation. Normalization fits training data only. Adam uses lr=.01 and weight decay=.001; gradient norm is capped at one. Maximum 300 epochs, early-stopping patience 30, validation improvement threshold 1e-5. Seeds 17, 29 and 43 are all retained and reported. Training and inference use CPU. Saved state dictionaries, preprocessing statistics, dataset hash and experiment metadata support reproduction.

Ridge alpha is selected from .1,1,10,100 using validation MSE. The displayed seed 17 was chosen as the default before test inspection. No model is selected for deployment using test ranking. Test metrics below are actual execution outputs, not estimates.

| Model | Seed | MAE (pp) | RMSE (pp) | Nominal 80% coverage |
|---|---:|---:|---:|---:|
| gru_multivariate | 17 | 1.1803 | 1.9452 | 0.8 |
| gru_multivariate | 29 | 1.3959 | 2.0580 | 0.8 |
| gru_multivariate | 43 | 1.4982 | 2.1051 | 0.7 |
| gru_domestic_only | 17 | 1.2015 | 1.9772 | 0.8 |
| gru_domestic_only | 29 | 1.6165 | 2.1727 | 0.8 |
| gru_domestic_only | 43 | 1.3685 | 2.0341 | 0.8 |
| persistence_lag2 | — | 2.0002 | 2.6945 | — |
| training_mean | — | 1.3626 | 2.0438 | — |
| ridge | — | 1.3091 | 1.9776 | — |

## Interpretation

Performance varies across seeds. The multivariate neural model does not consistently beat ridge or the training mean. Ten held-out annual targets provide weak evidence about generalization or interval reliability. Gaussian intervals have not been recalibrated. The 2020 target is a major test-period disturbance; smooth predictions do not demonstrate anticipation of the event.

The two-year input lag is an explicit timing convention, **not** a release-time guarantee. Revised WDI values lack original vintages, so revision leakage cannot be ruled out. This is a retrospective educational experiment rather than a tradable backtest. Annual sample size makes a large Transformer or a strong empirical GNN claim unjustified.

## Exploratory graph experiment

The supplied regular OECD tables are validated and aggregated from 4,050 to 405 nodes, preserving transaction/output sums. Incoming messages use A[i,j] from supplier i to buyer j. Four features at t−1 predict 100 × log(X[t]/X[t−1]): previous growth, log output, total intermediate-input share and foreign-input share. Nominal USD outcomes mix activity, inflation and exchange rates. Network coefficients and features come from the preceding year. This is revised-history timing, not a historical release-vintage guarantee.

Training targets: 2018–2020; validation: 2021; test: 2022. The 405 connected node observations are dependent. Train-only normalization, validation early stopping, three seeds, zero-edge ablation and ridge/persistence/mean baselines are retained. The small model has 81 parameters. All six saved checkpoints replay all 405 held-out nodes in the release gate.

| Model | MAE (log pp) | RMSE (log pp) |
|---|---:|---:|
| graph_seed17 | 9.4850 | 14.2782 |
| graph_seed29 | 10.9011 | 15.8831 |
| graph_seed43 | 10.2392 | 15.1302 |
| no_graph_seed17 | 9.6255 | 14.5382 |
| no_graph_seed29 | 10.6868 | 15.6420 |
| no_graph_seed43 | 10.1999 | 15.0884 |
| ridge | 9.3973 | 14.0001 |
| persistence | 11.8300 | 16.5121 |
| training_mean | 10.7350 | 15.8222 |

Ridge performs best. The graph does not consistently improve over the zero-edge ablation. Three training years and one test year are feasibility evidence only; no generalization, significance, calibration or causal scenario-prediction claim follows. No Transformer is warranted by this sample.


## Unavailable integrations

No causal oil-supply identification, monetary-policy transmission, neural shock-conditioning, market-pricing bridge, real ETF stress responses, verified energy infrastructure, or point-in-time event replay is implemented. The UI explains those limits. The quantity solver accepts hypothetical demand shocks; it does not infer a trade-demand shock from news.

## Reproduction

Run `scripts/train.py` to reproduce the evaluation and checkpoints. `scripts/check_notebooks.py` executes the three notebooks and saves their actual outputs. `pytest` verifies mathematics, data provenance, chronology and checkpoint inference. Playwright covers cross-workspace interactions, geographic hover/click, responsive layouts, error recovery and offline network isolation. A screenshot baseline supports visual regression on the tested Chromium/macOS setup.

## Architecture tradeoffs

One local FastAPI process serving production assets (Vite only for development), compact models and bundled data avoid cloud infrastructure. Requests are validated and independent of frontend calculations. No background retraining occurs. MapLibre workers and geographic assets are local; deck.gl population circles use observed population at Natural Earth cartographic reference points, not infrastructure locations or production exposure. ECharts uses only the required chart modules. Browser bundles remain substantial and are a performance improvement opportunity.

## Release engineering extension — 2026-10-09

The rates workspace now presents 694 observed Treasury par curves through 2026-10-09 separately from hypothetical bond valuations. Six saved PyTorch checkpoints execute on demand with immutable cached weights; the release gate verifies all 60 held-out means and intervals. Production serves built assets from the local FastAPI process. These changes improve implementation and reproducibility; they do not strengthen the statistical evidence from the unchanged small annual forecast sample.
