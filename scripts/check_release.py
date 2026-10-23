"""Reproducible release gate: verify data hashes and actual saved PyTorch inference."""

import hashlib
import json
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))
from atlas.data import DATA
from atlas.forecast import dataset, infer
from atlas.runtime import readiness


def check():
    ready = readiness()
    if ready["status"] != "ready":
        raise RuntimeError(f"Application not ready: {ready}")
    for source in json.loads((DATA / "manifest.json").read_text()):
        filename = (
            f"{source['indicator']}.json"
            if "indicator" in source
            else "countries.geojson"
        )
        if (
            hashlib.sha256((DATA / "raw" / filename).read_bytes()).hexdigest()
            != source["sha256"]
        ):
            raise RuntimeError(f"Source integrity failed: {filename}")
    treasury = json.loads((DATA / "treasury-manifest.json").read_text())
    if (
        hashlib.sha256((DATA / treasury["raw_file"]).read_bytes()).hexdigest()
        != treasury["sha256"]
    ):
        raise RuntimeError("Treasury source integrity failed")
    report = json.loads((DATA / "models/evaluation.json").read_text())
    if (
        hashlib.sha256(
            (DATA / "processed/observations.parquet").read_bytes()
        ).hexdigest()
        != report["dataset_sha256"]
    ):
        raise RuntimeError(
            "Forecast dataset differs from the evaluated dataset; retrain explicitly before release"
        )
    x, _, years, _ = dataset()
    count = 0
    start = time.perf_counter()
    for model, predictions in report["predictions"].items():
        if not model.startswith("gru_"):
            continue
        for i, year in enumerate(report["test_years"]):
            actual = infer(DATA / "models" / f"{model}.pt", x[years == year][0])
            if abs(actual["mean"] - predictions["mean"][i]) > 1e-5:
                raise RuntimeError(f"Checkpoint replay mismatch: {model}/{year}")
            if abs(actual["upper80"] - predictions["upper80"][i]) > 1e-5:
                raise RuntimeError(f"Interval replay mismatch: {model}/{year}")
            count += 1
    for source in __import__("atlas.data", fromlist=["latest_annual"]).latest_annual()[
        "sources"
    ]:
        if (
            hashlib.sha256((DATA / source["raw_file"]).read_bytes()).hexdigest()
            != source["sha256"]
        ):
            raise RuntimeError("Latest annual source integrity failed")
    for filename in ["events.json", "treasury-current.json"]:
        snapshot = json.loads((DATA / "processed" / filename).read_text())
        sources = (
            snapshot["sources"]
            if filename == "events.json"
            else snapshot["source"]["sources"]
        )
        for source in sources:
            if (
                hashlib.sha256((DATA / source["raw_file"]).read_bytes()).hexdigest()
                != source["sha256"]
            ):
                raise RuntimeError("Public-source snapshot integrity failed")
    from atlas.graph_forecast import replay
    from atlas.network import DIRECTORY, metadata

    network = metadata()
    graph_report = json.loads((DATA / "models/gnn/evaluation.json").read_text())
    for item in network["validation"]:
        digest = hashlib.sha256(
            (DIRECTORY / f"{item['year']}.npz").read_bytes()
        ).hexdigest()
        if (
            digest != item["aggregate_sha256"]
            or digest != graph_report["dataset_hashes"][str(item["year"])]
        ):
            raise RuntimeError("Network archive differs from evaluated graph data")
    import numpy as np

    graph_replayed = 0
    for key, predictions in graph_report["predictions"].items():
        if not key.startswith(("graph_", "no_graph_")):
            continue
        actual = replay(key)
        if not np.allclose(actual, predictions, atol=1e-4, rtol=0):
            raise RuntimeError(f"Graph checkpoint replay mismatch: {key}")
        graph_replayed += int(np.asarray(predictions).size)
    return {
        "status": "passed",
        "models": len(ready["models"]),
        "graph_models": 6,
        "graph_node_predictions_replayed": graph_replayed,
        "replayed_predictions": count,
        "device": "cpu",
        "framework": "PyTorch",
        "replay_seconds": round(time.perf_counter() - start, 4),
        "scope": "Artifact integrity and reproducibility; not a scientific acceptance claim for unavailable features",
    }


if __name__ == "__main__":
    print(json.dumps(check(), indent=2))
