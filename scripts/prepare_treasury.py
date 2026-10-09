"""Normalize the bundled official XML without any network access."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))
from atlas.treasury import prepare

print(prepare())
