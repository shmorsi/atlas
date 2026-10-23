"""The README key results must quote committed JSON, not a retyped or rounded figure."""

import json
import re

from atlas.data import ROOT


def _numbers(text: str, fields: str) -> list[str]:
    return re.findall(rf'"(?:{fields})": ([0-9.]+)', text)


def test_readme_key_results_match_committed_json():
    readme = (ROOT / "README.md").read_text()
    graph = (ROOT / "data/models/gnn/evaluation.json").read_text().split(
        '"predictions"', 1
    )[0]
    forecast = (ROOT / "data/models/evaluation.json").read_text().split(
        '"predictions"', 1
    )[0]
    latency = json.loads((ROOT / "docs/LOCAL_LATENCY.json").read_text())
    quoted = _numbers(graph, "rmse_log_percentage_points|mae_log_percentage_points")
    quoted += _numbers(forecast, "rmse|mae|coverage_80")
    for row in latency["results"]:
        quoted.append(str(row["median_ms"]))
        quoted.append(str(row["max_ms"]))
    missing = [number for number in quoted if number not in readme]
    assert not missing
