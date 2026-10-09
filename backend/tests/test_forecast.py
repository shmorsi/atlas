import numpy as np
import torch
from atlas.forecast import TemporalGaussian, EconomicGNN, dataset, infer


def test_dataset_lag_and_periods():
    x, y, years, _ = dataset()
    assert x.shape[1:] == (5, 4)
    assert np.all(np.diff(years) > 0)
    assert np.isfinite(x).all()
    # Last input in target 2024 must match actual US growth from 2022.
    from atlas.data import query

    value = query(
        "SELECT value FROM observations WHERE entity='USA' AND indicator='NY.GDP.MKTP.KD.ZG' AND year=2022"
    )[0]["value"]
    assert x[years == 2024][0, -1, 0] == value


def test_training_checkpoint_and_inference(tmp_path):
    torch.manual_seed(17)
    model = TemporalGaussian(4)
    opt = torch.optim.Adam(model.parameters(), lr=0.01)
    x = torch.ones(4, 5, 4)
    before = model.head.weight.detach().clone()
    for _ in range(3):
        opt.zero_grad()
        m, s = model(x)
        loss = ((m - 0.5) ** 2 + s).mean()
        loss.backward()
        opt.step()
    assert not torch.equal(before, model.head.weight)
    path = tmp_path / "tiny.pt"
    torch.save(
        {
            "state_dict": model.state_dict(),
            "features": [0, 1, 2, 3],
            "mean": [0] * 4,
            "scale": [1] * 4,
            "target_mean": 0,
            "target_scale": 1,
        },
        path,
    )
    out = infer(path, np.ones((5, 4)))
    assert np.isfinite(out["mean"])
    assert out["standard_deviation"] > 0


def test_gnn_messages_and_gradient():
    torch.manual_seed(1)
    m = EconomicGNN(2)
    x = torch.randn(2, 3, 2)
    a = torch.tensor([[0.0, 0.5, 0], [0, 0, 0.2], [0, 0, 0]])
    y = m(x, a)
    assert y.shape == (2, 3)
    assert not torch.equal(y, m(x, torch.zeros_like(a)))
    y.square().mean().backward()
    assert m.message.weight.grad.abs().sum() > 0


def test_saved_checkpoints_reproduce_report():
    import json
    from atlas.data import DATA

    x, _, years, _ = dataset()
    report = json.loads((DATA / "models/evaluation.json").read_text())
    for key, prediction in report["predictions"].items():
        if not key.startswith("gru_"):
            continue
        actual = infer(DATA / "models" / f"{key}.pt", x[years == 2015][0])
        assert abs(actual["mean"] - prediction["mean"][0]) < 1e-5
