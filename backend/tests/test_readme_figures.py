"""The README key results must quote committed JSON, not a retyped or rounded figure."""

import importlib.util
import json
import re

from atlas.data import ROOT


def _numbers(text: str, fields: str) -> list[str]:
    return re.findall(rf'"(?:{fields})": ([0-9.]+)', text)


def test_readme_key_results_match_committed_json():
    readme = (ROOT / "README.md").read_text(encoding="utf-8")
    graph = (
        (ROOT / "data/models/gnn/evaluation.json")
        .read_text(encoding="utf-8")
        .split('"predictions"', 1)[0]
    )
    forecast = (
        (ROOT / "data/models/evaluation.json")
        .read_text(encoding="utf-8")
        .split('"predictions"', 1)[0]
    )
    latency = json.loads((ROOT / "docs/LOCAL_LATENCY.json").read_text(encoding="utf-8"))
    quoted = _numbers(graph, "rmse_log_percentage_points|mae_log_percentage_points")
    quoted += _numbers(forecast, "rmse|mae|coverage_80")
    for row in latency["results"]:
        quoted.append(str(row["median_ms"]))
        quoted.append(str(row["max_ms"]))
    missing = [number for number in quoted if number not in readme]
    assert not missing


def _figures():
    path = ROOT / "scripts" / "render_readme_figures.py"
    spec = importlib.util.spec_from_file_location("render_readme_figures", path)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_readme_svgs_match_the_generator_and_quote_rmse_tokens():
    module = _figures()
    held, architecture = module.render()
    assert (ROOT / "docs/figures/held-out-rmse.svg").read_text(encoding="utf-8") == held
    assert (ROOT / "docs/figures/architecture.svg").read_text(
        encoding="utf-8"
    ) == architecture
    graph = (
        (ROOT / "data/models/gnn/evaluation.json")
        .read_text(encoding="utf-8")
        .split('"predictions"', 1)[0]
    )
    forecast = (
        (ROOT / "data/models/evaluation.json")
        .read_text(encoding="utf-8")
        .split('"predictions"', 1)[0]
    )
    for number in _numbers(graph, "rmse_log_percentage_points"):
        assert number in held
        assert number not in architecture
    for number in _numbers(forecast, "rmse"):
        assert number in held
        assert number not in architecture
