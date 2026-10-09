# 01 — Linear Algebra for Economic Networks

## Variables and representation

A is an n×n input-share matrix. A column is the input bill of one buyer, divided by that buyer’s output. s and Δp are n-vectors of fractional unit-cost shocks and price changes.

## Derivation and implementation

Start with Δp = AᵀΔp + s. Rearranging gives (I−Aᵀ)Δp=s. Solve that system; forming an inverse is unnecessary and less stable. If spectral radius ρ(A)<1, the Neumann series I+Aᵀ+(Aᵀ)²+… converges.

[Read the implementation](../backend/atlas/economics.py).

## Worked example and expected behavior

For A=[[0,.5],[0,0]] and s=[.1,0], the first sector receives 10% direct cost pressure and the second receives 5%; no further round survives.

## Interview question

Why is the transpose needed? Supplier i sells to buyer j in A[i,j]; buyer j’s price receives the weighted sum of supplier price changes. Quantity propagation instead uses A.

## Limits

A small residual proves numerical consistency, not economic realism.
