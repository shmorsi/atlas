import numpy as np
import pytest
from atlas.economics import propagate
from atlas.finance import (
    bond,
    yield_to_maturity,
    portfolio_stats,
    empirical_cvar,
    optimize,
    parse_prices,
)


def test_price_orientation_and_decomposition():
    r = propagate([[0, 0.5], [0, 0]], [0.1, 0])
    assert r["total"] == pytest.approx([0.1, 0.05])
    assert r["residual"] < 1e-12
    assert np.array(r["direct"]) + r["first_order"] + np.array(
        r["higher_order"]
    ) == pytest.approx(r["total"])


def test_geometric_feedback():
    assert propagate([[0.5]], [0.1])["total"] == pytest.approx([0.2])
    assert propagate([[0, 0.5], [0, 0]], [0, 10], "quantity")["total"] == pytest.approx(
        [5, 10]
    )


@pytest.mark.parametrize(
    "a", [[[1]], [[1.2]], [[float("nan")]], [[0, -0.2], [0, 0]], [[1, 2]]]
)
def test_invalid_networks(a):
    with pytest.raises(ValueError):
        propagate(a, [0.1])


def test_par_bond_and_duration():
    r = bond(100, 0.05, 0.05, 10)
    assert r["price"] == pytest.approx(100)
    eps = 1e-5
    low = bond(100, 0.05, 0.05 - eps, 10)["price"]
    high = bond(100, 0.05, 0.05 + eps, 10)["price"]
    assert -(high - low) / (2 * eps) / 100 == pytest.approx(
        r["modified_duration"], rel=1e-6
    )
    assert (high + low - 200) / eps**2 / 100 == pytest.approx(r["convexity"], rel=1e-5)
    assert yield_to_maturity(100, 100, 0.05, 10) == pytest.approx(0.05)


def test_drawdown_includes_initial_capital():
    s = portfolio_stats([[-0.1, 0], [0, 0]], [1, 0])
    assert s["max_drawdown"] == pytest.approx(-0.1)


def test_tail_fraction():
    assert empirical_cvar([0, 1, 2, 3], 0.5) == pytest.approx(2.5)


def test_optimization_constraints():
    # Synthetic test fixture only; never presented as market history.
    rng = np.random.default_rng(42)
    r = rng.normal(0, 0.01, (100, 3))
    w = [0.3, 0.3, 0.4]
    for method in ["variance", "cvar"]:
        result = optimize(r, w, method, cap=0.5, turnover_limit=0.4)
        assert sum(result["weights"]) == pytest.approx(1)
        assert max(result["weights"]) <= 0.5 + 1e-5
        assert result["turnover"] <= 0.4 + 1e-5
    with pytest.raises(ValueError):
        optimize(r, w, cap=0.2)


def test_csv_rejects_incomplete_prices():
    with pytest.raises(ValueError):
        parse_prices("date,SPY,TLT\n2020-01-01,100,\n")


def test_quant_api_contracts():
    from fastapi.testclient import TestClient
    from atlas.api import app

    client = TestClient(app)
    assert client.post(
        "/api/shocks", json={"coefficients": [[0, 0.5], [0, 0]], "shock": [0.1, 0]}
    ).json()["total"] == pytest.approx([0.1, 0.05])
    assert client.post("/api/bonds", json={}).json()["price"] == pytest.approx(100)
    assert client.post("/api/bonds", json={"years": 0.1}).status_code == 422
    assert (
        client.post(
            "/api/shocks", json={"coefficients": [[1]], "shock": [0.1]}
        ).status_code
        == 422
    )
    assert (
        client.post(
            "/api/portfolio",
            json={
                "csv_text": "",
                "source": "test",
                "weights": [0.5, 0.5],
                "total_return_confirmed": False,
            },
        ).status_code
        == 422
    )


def test_portfolio_chronological_evaluation_and_cost():
    import datetime
    from fastapi.testclient import TestClient
    from atlas.api import app

    rows = ["date,TEST_A,TEST_B"] + [
        f"{datetime.date(2020, 1, 1) + datetime.timedelta(days=i)},{100 + i * 0.1 + np.sin(i)},{100 + i * 0.05 + np.cos(i)}"
        for i in range(40)
    ]
    d = (
        TestClient(app)
        .post(
            "/api/portfolio",
            json={
                "csv_text": "\n".join(rows),
                "source": "synthetic test only",
                "weights": [0.5, 0.5],
                "total_return_confirmed": True,
                "cost_bps": 10,
            },
        )
        .json()
    )
    assert d["train_period"][1] < d["test_period"][0]
    assert d["held_out"]["net_total_return"] == pytest.approx(
        (1 + d["held_out"]["total_return"])
        * (1 - d["optimization"]["transaction_cost"])
        - 1
    )
