# 13 — Model Validation and Backtesting

## Variables and representation

Training fits parameters, validation chooses epochs/hyperparameters, and test measures outcomes once. Portfolio fitting uses the first 70% of returns and evaluates on the remaining 30%.

## Derivation and implementation

The financial holdout starts strictly after the fitting period. Allocation weights stay fixed as rebalance targets. A one-time turnover cost reduces initial holdout wealth; repeated rebalance costs are not modeled.

[Read the implementation](../backend/atlas/forecast.py).

## Worked example and expected behavior

Ridge regularization is chosen from .1,1,10,100 using validation error, never test error. All neural seeds are reported, including runs worse than a simple baseline.

## Interview question

Is this a complete trading backtest? No. The system lacks point-in-time releases, rolling portfolio re-estimation, realistic execution and full transaction cost accounting.

## Limits

Report actual metrics and denominators. Annual data and a ten-year test set cannot establish reliable economic forecasting superiority.
