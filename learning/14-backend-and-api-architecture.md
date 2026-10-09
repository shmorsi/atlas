# 14 — Backend and API Architecture

## Variables and representation

FastAPI serves data and models through local loopback endpoints. Request schemas validate allowed fields, domains and finite numeric values. Mathematical modules do not import frontend code.

## Derivation and implementation

Raw downloads are hashed. Preparation preserves nulls and source fields in Parquet, queries use DuckDB, and source metadata lives in SQLite. Training is a separate explicit script; the app reads saved evaluation output.

[Read the implementation](../backend/atlas/api.py).

## Worked example and expected behavior

POST /api/shocks with A=[[0,.5],[0,0]] and shock=[.1,0] returns [.1,.05]. An unstable A=[[1]] returns a validation error.

## Interview question

Why not retrain when a slider changes? It is slow, mixes research and inference, and can make results irreproducible. Checkpoints separate those responsibilities.

## Limits

The API is local research software without authentication or a remote deployment hardening layer. It deliberately binds only to 127.0.0.1.
