import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))
from atlas.graph_forecast import train_graph

r = train_graph()
for row in r["results"]:
    print(row)
print("Seconds", r["elapsed_seconds"])
