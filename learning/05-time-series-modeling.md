# 05 — Time-Series Modeling

## Variables and representation

Each sample has a five-year sequence of four macro features and one US growth target. Inputs end in year t−2 for a target in year t.

## Derivation and implementation

Train targets end in 2005; validation targets cover 2006–2014; test targets cover 2015–2024. Normalization parameters are fitted only on training windows. Windows containing missing data are dropped explicitly.

[Read the implementation](../backend/atlas/forecast.py).

## Worked example and expected behavior

A target for 2024 uses features from 2018–2022. Its actual value cannot enter its own input sequence. Revised history can still contain revision leakage, which the lag does not remove.

## Interview question

Why not randomly split windows? Overlap and time ordering would contaminate the evaluation with future regimes and possibly future observations.

## Limits

WDI publication dates and original vintages are missing. This is retrospective forecasting, not a point-in-time tradable backtest.
