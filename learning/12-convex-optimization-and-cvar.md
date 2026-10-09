# 12 — Convex Optimization and CVaR

## Variables and representation

w is allocation, Σ the training sample covariance, Lₜ(w)=−rₜ·w loss, α=.95. η is a loss threshold and uₜ a nonnegative excess-loss variable.

## Derivation and implementation

Minimum variance solves min wᵀΣw. CVaR solves min η+Σuₜ/[(1−α)T], with uₜ≥Lₜ−η and uₜ≥0. Constraints enforce sum(w)=1, w≥0, per-asset cap and an L1 turnover limit.

[Read the implementation](../backend/atlas/finance.py).

## Worked example and expected behavior

A three-asset cap of .2 is infeasible because the maximum total allocation is .6. The API rejects it instead of returning normalized invalid weights.

## Interview question

Is CVaR just the average loss exceeding a sample quantile? Not always with small samples or ties. The implemented hinge-loss formula correctly handles fractional tail mass.

## Limits

One-time turnover cost is reported separately. In the variance objective its penalty is a user-chosen regularizer; mixing risk and cost is not a utility model. No expected-return optimization is claimed.
