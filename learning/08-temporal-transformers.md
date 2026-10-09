# 08 — Temporal Transformers

## Variables and representation

A Transformer represents a temporal sequence using attention weights softmax(QKᵀ/√d). Position information distinguishes dates.

## Derivation and implementation

The current working alternative is an eight-unit GRU: a compact recurrent model with gates controlling state retention. It is appropriate for a deliberately small annual demonstration and has far fewer parameters than a typical Transformer.

[Read the implementation](../backend/atlas/forecast.py).

## Worked example and expected behavior

The multivariate GRU has 354 learned parameters. Expanding architecture size without increasing independent history does not create information.

## Interview question

Why not add a Transformer for a stronger résumé? Architectural complexity is not evidence. A defensible comparison needs sufficient data, baselines and predeclared chronological evaluation.

## Limits

No Transformer is implemented or claimed. Larger temporal architectures require a richer monthly dataset with release-aware alignment.
