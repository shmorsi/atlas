"""Validate source observations and persist a normalized analytical cache."""

import json, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))
from atlas.data import prepare

if __name__ == "__main__":
    prepare()
