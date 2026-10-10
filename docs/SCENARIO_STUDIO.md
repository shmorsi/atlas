# Scenario Studio

Scenario Studio turns the OECD production network into an interactive, mathematically inspectable cost experiment. Open **Guided → What if?**. Choose a preset, customize up to five distinct country-sector shocks, select a focus economy, and run. The neural evidence view runs actual saved PyTorch checkpoints separately.

## What the model computes

Let Z[i,j] be inputs sold by supplier i to buyer j, and X[j] baseline buyer output. Input shares are A[i,j] = Z[i,j] / X[j]. For direct unit-cost changes s and uniform intermediate cost pass-through α in [0,1]:

```
p = s + α Aᵀ p
p = solve(I − α Aᵀ, s)
```

The backend uses `torch.linalg.solve` in float64 on 405 nodes. The seven observed networks have spectral radius below one; α ≤ 1 preserves invertibility. No explicit matrix inverse is formed. Each scenario uses one historical annual network; it is not a dynamic simulation. Negative shocks mean lower costs, not a modeled productivity or supply improvement. Direct shocks are relative to baseline unit costs, are not multiplied by α, and are summed simultaneously. Duplicate country-sector entries are rejected to avoid ambiguous inputs. Resulting costs below zero are rejected.

A country result is the fixed gross-output-weighted mean of its five sector cost changes. It is not GDP, CPI, welfare or an asset return. The unchanged baseline is zero cost change. Positive and negative shocks can offset each other.

## Explanations computed from the same system

- Direct: s. First round: α Aᵀ s. Higher rounds: p − s − α Aᵀ s.
- The round chart accumulates transmission terms through round eight. Its remaining tail is displayed; the headline uses the exact solve including all rounds. Rounds are not calendar time.
- `torch.autograd.grad` differentiates the focus economy's weighted cost index with respect to every source shock and α. Source sensitivities are percentage points per one percentage-point direct change.
- Since this system is linear in s, each source's gradient multiplied by its direct shock is its additive contribution; the contributions sum to the focus total.
- The assumption comparison solves the same system at 0%, 25%, 50%, 75%, 100% and the selected pass-through. Invalid price-domain points are explicitly unavailable. This is sensitivity analysis, not a confidence interval or event probability.
- JSON export contains all 81 country results, 405 node results, source attribution, assumptions, year, shock vector, sensitivity points and numerical residual.

## Where deep learning belongs today

The **Neural evidence** view runs one of six trained graph/no-graph checkpoints on the held-out 2022 target. The graph architecture is:

```
ŷ = W₂ tanh(W₁ x + Wₘ Aᵀ x + b₁) + b₂
```

There are four input features, eight hidden units and 81 trainable parameters. Three seeds and the no-network ablation remain visible alongside ridge, persistence and training-mean baselines. Inference uses PyTorch CPU with safe weights-only loading. The view compares all five sectors of the chosen economy with observed output changes and the ridge baseline.

Training target years are 2018–2020; validation is 2021; test is 2022. Every target uses the preceding year's graph and features. These revised historical data are not point-in-time backtest evidence. The 405 related nodes are dependent; only one independent test year exists. Ridge has the lowest held-out RMSE among the tested models. No calibrated uncertainty or causal shock conditioning is established.

Consequently, the learned predictor is not added to the structural cost response: it predicts a different quantity and has not been validated for that use. The six existing GRU checkpoints remain accessible in Research → Macro Forecasting. Longer compatible histories and identified targets are prerequisites for evaluating a learned structural correction.

## Interface and engineering

The studio loads lazily. One FastAPI process handles inference and static production assets; no new service, database or external API is required. Inputs invalidate prior results immediately, and request generations suppress superseded responses. The map has a selector/table fallback. Charts have numerical tables, inputs have accessible labels, mobile layouts stack, and focus indicators remain visible. Human accessibility and comprehension studies are not claimed.

Tests compare the new PyTorch solve with the independent SciPy implementation; verify zero shocks, zero pass-through, superposition, attribution and the round tail; compare autograd with central finite differences; and reject unsupported/ambiguous API inputs. Browser tests cover combined shocks, JSON downloads, replay controls, request failures, stale responses and 1440/820/390 pixel layouts.

The broader ETF/event proposal in SCENARIO_STUDIO_RESEARCH.md remains a research specification. This implementation is explicitly the historical production-cost studio described here.
