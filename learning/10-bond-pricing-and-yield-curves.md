# 10 — Bond Pricing and Yield Curves

## Variables and representation

F is face value, c annual coupon rate, y nominal annual yield, m coupon frequency, n=mT coupon periods. CF[k] is coupon plus principal at maturity.

## Derivation and implementation

P=Σ CF[k](1+y/m)^−k. Modified duration is −P′(y)/P. Convexity is P″(y)/P. The second-order expansion gives ΔP/P≈−DmodΔy+½CΔy².

[Read the implementation](../backend/atlas/finance.py).

## Worked example and expected behavior

A 100-face, 5% coupon, 10-year bond with 5% yield and semiannual coupons prices at 100. Finite-difference tests verify duration and convexity.

## Interview question

What is missing from this bond model? Accrued interest, irregular coupon dates, day counts, default, embedded options and nonparallel yield shifts.

## Limits

The interface now includes 694 historical Treasury par curves through 2026-10-09 with an observed-data label. These are par yields, not spot discount factors or investment returns. The separate bond calculator accepts explicitly hypothetical yield assumptions; rates are fractions and shifts are basis points.
