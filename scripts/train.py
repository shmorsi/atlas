import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))
from atlas.forecast import train

if __name__ == "__main__":
    report = train(ROOT / "data/models")
    print("Held-out results (all seeds, no cherry-picking):")
    for r in report["results"]:
        print(r)
    print("Execution seconds:", report["elapsed_seconds"])
