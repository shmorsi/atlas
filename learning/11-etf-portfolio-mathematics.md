# 11 — ETF Portfolio Mathematics

## Variables and representation

P[t,i] is a positive total-return price/index. r[t,i]=P[t,i]/P[t−1,i]−1. Weights are long-only and sum to one.

## Derivation and implementation

A periodically rebalanced portfolio has rₚ[t]=r[t]·w. Wealth multiplies (1+rₚ). Drawdown compares wealth with its running peak, including initial capital. Volatility is sample standard deviation times √periods_per_year.

[Read the implementation](../backend/atlas/finance.py).

## Worked example and expected behavior

A first-period loss of 10% must produce −10% drawdown even if all later returns are zero. Omitting the initial capital point would miss that decline.

## Interview question

Why require total-return prices? Unadjusted prices can omit distributions and mishandle splits; substituting them silently changes the financial quantity being measured.

## Limits

User confirmation is not independent verification. Complete common dates are required; no interpolation. Constant assets have undefined correlations, represented as null.
