"""Local release readiness and verified, bounded model serving."""

import hashlib
import json
from atlas.data import DATA, ROOT


def readiness():
    required = [
        DATA / "processed/observations.parquet",
        DATA / "processed/countries.json",
        ROOT / "frontend/public/data/world.geojson",
        DATA / "models/evaluation.json",
    ]
    missing = [str(p.relative_to(ROOT)) for p in required if not p.is_file()]
    model_status = []
    if not missing:
        from atlas.forecast import load_checkpoint

        report = json.loads((DATA / "models/evaluation.json").read_text())
        for result in report["results"]:
            if result["seed"] is None:
                continue
            key = f"{result['model']}_seed{result['seed']}"
            path = DATA / "models" / f"{key}.pt"
            try:
                _, state = load_checkpoint(path)
                model_status.append(
                    {
                        "model": key,
                        "ready": True,
                        "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
                        "framework": "PyTorch",
                        "device": "cpu",
                    }
                )
            except (OSError, ValueError, RuntimeError, KeyError):
                model_status.append({"model": key, "ready": False})
    return {
        "status": "ready"
        if not missing and model_status and all(m["ready"] for m in model_status)
        else "not_ready",
        "missing_files": missing,
        "models": model_status,
        "scope": "Local application readiness; not scientific validation of unsupported models",
    }
