# 04 — Probability and Economic Forecasting

## Variables and representation

Y is annual GDP growth in percentage points. The Gaussian model outputs conditional mean μ and positive scale σ.

## Derivation and implementation

Negative log likelihood is ½log(2π)+log σ+(Y−μ)²/(2σ²). A nominal 80% Gaussian interval uses μ±1.28155σ. Coverage is the proportion of held-out observations inside it.

[Read the implementation](../backend/atlas/forecast.py).

## Worked example and expected behavior

For μ=2 and σ=1.5, the nominal interval is approximately [0.078,3.922] percentage points. This is a distributional assumption, not a guaranteed error bound.

## Interview question

Does 80% coverage on ten years prove calibration? No. The sample is tiny and serially dependent; coverage changes by ten points for each observation.

## Limits

The intervals in this build are uncalibrated. No conformal correction or repeated-window reliability study is implemented.
