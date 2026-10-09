# 07 — Graph Neural Networks

## Variables and representation

X[b,i,f] is a feature of node i at time b. A[i,j] is an observed input share when a valid network is available.

## Derivation and implementation

Messages use M[b,j,f]=ΣᵢA[i,j]X[b,i,f]. A learned linear transform of M is combined with a learned local transform of X, passed through tanh, then a prediction head.

[Read the implementation](../backend/atlas/forecast.py).

## Worked example and expected behavior

A[0,1]=.5 means node 1 receives half of node 0’s features before the learned message transform. The gradient test verifies that the message weights receive a gradient.

## Interview question

Are thousands of nodes thousands of independent temporal samples? No. They share shocks and graph structure. The temporal sample count and effective dependence must be assessed separately.

## Limits

An actual PyTorch graph/no-edge experiment now uses the seven supplied OECD tables: three training target years, one validation and one test year. All three seeds and baselines are reported in docs/RESEARCH_REPORT.md. Ridge beats the graph on the single held-out year; 405 dependent nodes do not constitute 405 independent annual samples.
