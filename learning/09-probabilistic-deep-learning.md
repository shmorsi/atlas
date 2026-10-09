# 09 — Probabilistic Deep Learning

## Variables and representation

The final two outputs represent μ and an unconstrained scale logit. σ=softplus(logit)+.05 prevents zero or negative scales.

## Derivation and implementation

Training minimizes Gaussian log score without its constant in normalized target units. Reported test NLL includes the constant and uses the original target units. MAE/RMSE assess point predictions; coverage and width assess interval behavior.

[Read the implementation](../backend/atlas/forecast.py).

## Worked example and expected behavior

A model can reduce NLL by widening intervals when uncertain, but excessively wide intervals are penalized by log σ. Good average likelihood does not ensure tail calibration.

## Interview question

Why report multiple seeds? Tiny samples make optimization unstable. Showing all preselected seeds prevents selecting a favorable test result after the fact.

## Limits

No probabilistic market stress simulator exists. Conditional statistical uncertainty is not causal uncertainty.
