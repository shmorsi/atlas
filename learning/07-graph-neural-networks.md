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

The architecture and gradient tests work; empirical GNN training and a no-edge economic ablation are blocked by the unavailable verified network and outcome panel. No GNN accuracy is reported.
