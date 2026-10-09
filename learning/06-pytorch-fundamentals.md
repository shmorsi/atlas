# 06 — PyTorch Fundamentals

## Variables and representation

Tensors have shape batch×time×features. nn.Module owns learned parameters; an optimizer updates them from gradients.

## Derivation and implementation

The training loop zeroes gradients, computes Gaussian loss, backpropagates, clips gradient norm at one, and steps Adam. Evaluation uses eval() and no_grad(). The best validation checkpoint is deep-copied and saved.

[Read the implementation](../backend/atlas/forecast.py).

## Worked example and expected behavior

The test suite trains a tiny model for three updates and verifies that weights change; it then saves, reloads and runs inference. Synthetic test inputs are never displayed as economic history.

## Interview question

Why deepcopy a state_dict? Otherwise the saved best state can share live tensor storage and be overwritten by subsequent optimization.

## Limits

Deterministic CPU seeds improve reproducibility, but different library versions and hardware can still change numerical details.
