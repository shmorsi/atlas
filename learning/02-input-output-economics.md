# 02 — Input-Output Economics

## Variables and representation

Z[i,j] is the monetary flow from supplier i to buyer j. x[j] is gross output, positive and in the same monetary units. Define A[i,j]=Z[i,j]/x[j].

## Derivation and implementation

Quantity balance is x=Ax+f, giving x=(I−A)⁻¹f. The price model holds physical input requirements and value-added cost assumptions fixed. Column sums above one are rejected by this simplified model because they imply negative residual value-added shares.

[Read the implementation](../backend/atlas/economics.py).

## Worked example and expected behavior

A one-sector economy using half its output as intermediate input has multiplier 1/(1−.5)=2. A .1 direct unit-cost shift gives .2 total price change.

## Interview question

Does an oil-price input identify an oil supply shock? No. Identification requires a structural or empirical design beyond imposing a price change.

## Limits

No substitution, capacity, margins adjustment, policy reaction, timing or market-price dynamics are modeled.
