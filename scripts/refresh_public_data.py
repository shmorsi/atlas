"""Explicit network refresh, separate from offline startup and frozen training data."""

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))
from atlas.updates import refresh

results = refresh()
print(json.dumps(results, indent=2))
if any(r["status"] != "updated" for r in results):
    sys.exit(1)
