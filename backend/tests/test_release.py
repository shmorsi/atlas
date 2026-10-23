import hashlib
import json

import numpy as np
import pytest
from atlas.api import app
from atlas.data import DATA
from atlas.finance import parse_prices, walk_forward
from atlas.forecast import infer, load_checkpoint
from atlas.treasury import parse_xml
from fastapi.testclient import TestClient

client = TestClient(app)


def test_readiness_and_real_pytorch_replay():
    ready = client.get("/api/ready")
    assert ready.status_code == 200
    assert len(ready.json()["models"]) == 6
    report = client.get("/api/forecast/evaluation").json()
    for model, pred in report["predictions"].items():
        if not model.startswith("gru_"):
            continue
        response = client.get(f"/api/forecast/replay?model={model}&year=2024")
        assert response.status_code == 200
        value = response.json()
        assert value["framework"] == "PyTorch" and value["device"] == "cpu"
        assert value["mean"] == pytest.approx(pred["mean"][-1], abs=1e-5)
        assert value["upper80"] == pytest.approx(pred["upper80"][-1], abs=1e-5)
        assert value["input_years"][-1] == 2022
        assert value["observed"] == report["test_actual"][-1]


def test_model_cache_and_validation():
    path = DATA / "models/gru_multivariate_seed17.pt"
    assert load_checkpoint(path)[0] is load_checkpoint(path)[0]
    assert not load_checkpoint(path)[0].training
    assert all(not p.requires_grad for p in load_checkpoint(path)[0].parameters())
    with pytest.raises(ValueError):
        infer(path, np.full((5, 4), 1e300))
    assert (
        client.post("/api/forecast/infer", json={"window": [[1] * 3] * 5}).status_code
        == 422
    )
    assert client.get("/api/forecast/replay?model=../../bad").status_code == 422
    assert (
        client.get("/api/health", headers={"host": "malicious.example"}).status_code
        == 400
    )


def test_treasury_source_and_known_values():
    manifest = json.loads((DATA / "treasury-manifest.json").read_text())
    assert (
        hashlib.sha256((DATA / manifest["raw_file"]).read_bytes()).hexdigest()
        == manifest["sha256"]
    )
    result = client.get("/api/rates/treasury").json()
    assert len(result["curves"]) >= 250
    first = result["curves"][0]
    assert first["date"] == "2024-01-02"
    assert (
        next(p for p in first["points"] if p["months"] == 120)["yield_percent"] == 3.95
    )
    assert len(first["points"]) == 13
    with pytest.raises(ValueError):
        parse_xml(b"<feed/>")
    with pytest.raises(ValueError):
        parse_xml(b"<!DOCTYPE test><feed/>")


def test_walk_forward_drift_costs_and_no_lookahead():
    # Synthetic numerical test, not a demonstration market dataset.
    returns = np.tile([0.10, 0.0], (16, 1))
    dates = [f"2024-01-{i + 1:02}" for i in range(16)]
    result = walk_forward(
        returns, dates, [0.5, 0.5], train_window=10, rebalance_every=2, cost_bps=100
    )
    original = result["strategies"]["original"]
    # First two holding periods: initial weights then drift, no daily rebalance.
    assert original["net_returns"][0] == pytest.approx(0.05)
    assert original["net_returns"][1] == pytest.approx(0.1 * (0.55 / 1.05))
    drifted = 0.5 * 1.1**2 / (0.5 * 1.1**2 + 0.5)
    charge = abs(drifted - 0.5) * 2 * 0.01
    assert original["rebalances"][1]["cost_fraction"] == pytest.approx(charge)
    assert original["net_returns"][2] == pytest.approx((1 - charge) * 1.05 - 1)
    assert original["statistics"]["total_return"] == pytest.approx(
        np.prod(1 + np.array(original["net_returns"])) - 1
    )
    for record in result["strategies"]["optimized"]["rebalances"]:
        assert record["training_end"] < record["trade_date"]
    changed = returns.copy()
    changed[10:] = [-0.15, 0.07]
    second = walk_forward(
        changed, dates, [0.5, 0.5], train_window=10, rebalance_every=2, cost_bps=100
    )
    assert result["strategies"]["optimized"]["rebalances"][0][
        "weights"
    ] == pytest.approx(second["strategies"]["optimized"]["rebalances"][0]["weights"])
    zero_cost = walk_forward(
        returns, dates, [0.5, 0.5], train_window=10, rebalance_every=2, cost_bps=0
    )
    assert (
        zero_cost["strategies"]["original"]["statistics"]["total_return"]
        > original["statistics"]["total_return"]
    )


def test_csv_and_backtest_boundaries():
    with pytest.raises(ValueError, match="extra columns"):
        parse_prices("date,A,B\n2020-01-01,1,2,3")
    with pytest.raises(ValueError, match="two out-of-sample"):
        walk_forward(
            np.ones((10, 2)) * 0.01, list(range(10)), [0.5, 0.5], train_window=10
        )


def test_request_size_limit():
    response = client.post(
        "/api/portfolio",
        content=b"x" * 4_000_001,
        headers={"content-type": "application/json"},
    )
    assert response.status_code == 413
    assert client.get("/api/health").status_code == 200
