import numpy as np
import pytest
from atlas.api import app
from atlas.network import scenario
from atlas.studio import simulate
from fastapi.testclient import TestClient

SHOCK = {"country": "SAU", "sector": "Energy", "shock": 0.1}


def test_torch_solution_matches_independent_scipy_engine():
    actual = simulate([SHOCK])
    reference = scenario()
    assert [n["total"] for n in actual["nodes"]] == pytest.approx(
        [n["total"] for n in reference["nodes"]], abs=1e-12
    )
    assert actual["residual"] < 1e-12
    assert actual["rounds"][-1]["total"] + actual[
        "remaining_after_rounds"
    ] == pytest.approx(actual["focus"]["total"])
    assert sum(r["contribution"] for r in actual["attribution"]) == pytest.approx(
        actual["focus"]["total"]
    )


def test_combined_shocks_superposition_and_zero_pass_through():
    second = {"country": "CHN", "sector": "Manufacturing", "shock": -0.05}
    first = simulate([SHOCK], pass_through=0.7)
    other = simulate([second], pass_through=0.7)
    both = simulate([SHOCK, second], pass_through=0.7)
    assert np.array([n["total"] for n in both["nodes"]]) == pytest.approx(
        np.array([n["total"] for n in first["nodes"]])
        + np.array([n["total"] for n in other["nodes"]]),
        abs=1e-12,
    )
    assert sum(r["contribution"] for r in both["attribution"]) == pytest.approx(
        both["focus"]["total"]
    )
    zero = simulate([SHOCK], pass_through=0)
    assert all(
        n["total"] == n["direct"] and n["higher_order"] == 0 for n in zero["nodes"]
    )
    assert all(n["total"] == 0 for n in simulate([{**SHOCK, "shock": 0}])["nodes"])


def test_autograd_matches_finite_differences():
    baseline = simulate([SHOCK], pass_through=0.6)
    epsilon = 1e-5
    plus = simulate([SHOCK], pass_through=0.6 + epsilon)["focus"]["total"]
    minus = simulate([SHOCK], pass_through=0.6 - epsilon)["focus"]["total"]
    assert baseline["pass_through_derivative"] == pytest.approx(
        (plus - minus) / (2 * epsilon), rel=1e-7
    )
    driver = baseline["drivers"][0]
    change = {
        "country": driver["country"],
        "sector": driver["sector"],
        "shock": epsilon,
    }
    plus = simulate([SHOCK, change], pass_through=0.6)["focus"]["total"]
    assert driver["derivative"] == pytest.approx(
        (plus - baseline["focus"]["total"]) / epsilon, rel=1e-8
    )


def test_api_rejects_invalid_and_ambiguous_scenarios():
    client = TestClient(app)
    for body in [
        {"shocks": []},
        {"shocks": [SHOCK, SHOCK]},
        {"shocks": [SHOCK], "pass_through": 1.1},
        {"shocks": [SHOCK], "focus": "ZZZ"},
        {"shocks": [{**SHOCK, "shock": 0.6}]},
        {"shocks": [{**SHOCK, "country": "ZZZ"}]},
        {"shocks": [SHOCK], "year": 2025},
    ]:
        assert client.post("/api/studio/simulate", json=body).status_code == 422
    response = client.post("/api/studio/simulate", json={"shocks": [SHOCK]})
    assert response.status_code == 200
    assert response.json()["framework"] == "PyTorch"
    assert client.get("/api/network/replay?model=invalid").status_code == 422
    response = client.get("/api/network/replay?model=graph_seed17")
    assert response.status_code == 200
    assert len(response.json()["predictions"]) == 405
