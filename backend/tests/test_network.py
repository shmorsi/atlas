import hashlib
import json

import numpy as np
import pytest
from atlas.data import DATA
from atlas.graph_forecast import panel, replay
from atlas.network import DIRECTORY, load, metadata, profile, scenario


def test_observed_network_integrity_and_orientation():
    meta = metadata()
    assert len(meta["nodes"]) == 405
    assert len({n["id"] for n in meta["nodes"]}) == 405
    for record in meta["validation"]:
        d = load(record["year"])
        assert d["z"].shape == (405, 405)
        assert np.isfinite(d["z"]).all() and (d["z"] >= 0).all()
        assert np.allclose(d["a"] * d["output"][None, :], d["z"], rtol=1e-12, atol=1e-9)
        assert d["output"].sum() == pytest.approx(record["world_output_million_usd"])
        assert record["spectral_radius"] < 1
        assert record["aggregate_accounting_within_tolerance"]
        assert (
            hashlib.sha256(
                (DIRECTORY / f"{record['year']}.npz").read_bytes()
            ).hexdigest()
            == record["aggregate_sha256"]
        )
    assert next(r for r in meta["validation"] if r["year"] == 2020)[
        "source_accounting_exceptions"
    ]


def test_network_profiles_and_scenario_conservation():
    p = profile("JPN", 2022)
    assert len(p["sectors"]) == 5 and len(p["suppliers"]) == 81
    assert sum(s["output_million_usd"] for s in p["sectors"]) == pytest.approx(
        p["output_million_usd"]
    )
    result = scenario("SAU", "Energy", 0.1, 2022)
    a = load(2022)["a"]
    values = np.array([r["total"] for r in result["nodes"]])
    direct = np.array([r["direct"] for r in result["nodes"]])
    assert values == pytest.approx(direct + a.T @ values, abs=1e-10)
    for row in result["nodes"]:
        assert row["total"] == pytest.approx(
            row["direct"] + row["first_order"] + row["higher_order"], abs=1e-12
        )
    assert result["residual"] < 1e-10
    idx = [i for i, n in enumerate(metadata()["nodes"]) if n["country"] == "JPN"]
    weights = load(2022)["output"][idx]
    expected = weights @ values[idx] / weights.sum()
    assert next(r for r in result["countries"] if r["country"] == "JPN")[
        "total"
    ] == pytest.approx(expected)
    assert all(r["total"] == 0 for r in scenario(shock=0)["nodes"])
    with pytest.raises(ValueError):
        profile("ZZZ")


def test_graph_chronology_and_real_checkpoint_replay():
    x, a, y = panel()
    assert x.shape == (5, 405, 4) and y.shape == (5, 405)
    assert np.array_equal(a[-1], load(2021)["a"])
    assert y[-1] == pytest.approx(
        100 * np.log(load(2022)["output"] / load(2021)["output"])
    )
    assert x[-1, :, 0] == pytest.approx(
        100 * np.log(load(2021)["output"] / load(2020)["output"])
    )
    r = json.loads((DATA / "models/gnn/evaluation.json").read_text())
    assert r["independent_training_years"] == 3 and r["held_out_years"] == 1
    for model in [
        f"{kind}_seed{s}" for kind in ["graph", "no_graph"] for s in [17, 29, 43]
    ]:
        assert replay(model) == pytest.approx(r["predictions"][model], abs=1e-4)
    assert len(r["results"]) == 9
