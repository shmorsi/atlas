"""Exploratory graph experiment: three training years, one validation year, one test year."""

import copy
import hashlib
import json
import time
from pathlib import Path

import numpy as np
import torch
from torch import nn

from atlas.data import DATA
from atlas.network import DIRECTORY, load, metadata


class GraphPredictor(nn.Module):
    """One-layer incoming-share predictor for the saved graph experiment."""

    def __init__(self, features: int = 4, hidden: int = 8) -> None:
        """Build the local map, the share map, and the scalar head."""
        super().__init__()
        self.local = nn.Linear(features, hidden)
        self.message = nn.Linear(features, hidden, bias=False)
        self.head = nn.Linear(hidden, 1)

    def forward(self, x: torch.Tensor, a: torch.Tensor) -> torch.Tensor:
        """Apply one batched incoming-share message and a pointwise tanh."""
        message = torch.einsum("bij,bif->bjf", a, x)
        return self.head(torch.tanh(self.local(x) + self.message(message))).squeeze(-1)


def panel() -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """Build the 2016–2022 country-sector panel used by the graph experiment."""
    tables = [load(y) for y in range(2016, 2023)]
    output = np.array([d["output"] for d in tables])
    valid = (output > 0).all(0)
    if not valid.all():
        raise ValueError("Zero-output aggregate nodes need a predeclared panel policy")
    growth = np.diff(np.log(output), axis=0) * 100
    foreign = np.array(
        [
            [n["country"] != m["country"] for m in metadata()["nodes"]]
            for n in metadata()["nodes"]
        ]
    )
    x = []
    graphs = []
    targets = []
    for i in range(2, 7):
        a = tables[i - 1]["a"]
        x.append(
            np.stack(
                [growth[i - 2], np.log(output[i - 1]), a.sum(0), (a * foreign).sum(0)],
                axis=1,
            )
        )
        graphs.append(a)
        targets.append(growth[i - 1])
    return np.array(x), np.array(graphs), np.array(targets)


def train_graph(
    output_dir: Path = DATA / "models/gnn", epochs: int = 250
) -> dict:
    """Train the graph and no-graph seeds and write their checkpoints and evaluation."""
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    start = time.perf_counter()
    torch.set_num_threads(1)
    torch.use_deterministic_algorithms(True)
    x, a, y = panel()
    xm = x[:3].mean((0, 1))
    xs = x[:3].std((0, 1))
    xs[xs < 1e-8] = 1
    ym = y[:3].mean()
    ys = y[:3].std()
    xt = torch.tensor((x - xm) / xs, dtype=torch.float32)
    at = torch.tensor(a, dtype=torch.float32)
    yt = torch.tensor((y - ym) / ys, dtype=torch.float32)
    results = []
    predictions = {}

    def record(key, pred, **extra):
        error = pred - y[4]
        results.append(
            {
                "model": key,
                "mae_log_percentage_points": float(abs(error).mean()),
                "rmse_log_percentage_points": float(np.sqrt(np.mean(error**2))),
                **extra,
            }
        )
        predictions[key] = pred.tolist()

    for use_graph in [True, False]:
        for seed in [17, 29, 43]:
            torch.manual_seed(seed)
            model = GraphPredictor()
            opt = torch.optim.Adam(model.parameters(), lr=0.01, weight_decay=0.001)
            graph = at if use_graph else torch.zeros_like(at)
            best = float("inf")
            state = None
            wait = 0
            best_epoch = 0
            for epoch in range(epochs):
                model.train()
                opt.zero_grad()
                loss = (model(xt[:3], graph[:3]) - yt[:3]).square().mean()
                loss.backward()
                nn.utils.clip_grad_norm_(model.parameters(), 1)
                opt.step()
                model.eval()
                with torch.no_grad():
                    val = float((model(xt[3:4], graph[3:4]) - yt[3:4]).square().mean())
                if val < best - 1e-6:
                    best = val
                    state = copy.deepcopy(model.state_dict())
                    wait = 0
                    best_epoch = epoch + 1
                else:
                    wait += 1
                if wait >= 30:
                    break
            model.load_state_dict(state)
            model.eval()
            with torch.inference_mode():
                pred = model(xt[4:5], graph[4:5])[0].numpy() * ys + ym
            key = ("graph" if use_graph else "no_graph") + f"_seed{seed}"
            checkpoint = {
                "state_dict": state,
                "mean": xm.tolist(),
                "scale": xs.tolist(),
                "target_mean": float(ym),
                "target_scale": float(ys),
                "use_graph": use_graph,
                "seed": seed,
            }
            torch.save(checkpoint, output_dir / f"{key}.pt")
            record(
                key,
                pred,
                seed=seed,
                parameters=sum(p.numel() for p in model.parameters()),
                best_epoch=best_epoch,
                validation_mse_standardized=best,
            )
    design = np.concatenate([np.ones((*x.shape[:2], 1)), (x - xm) / xs], axis=-1)
    candidates = []
    pen = np.eye(5)
    pen[0, 0] = 0
    for alpha in [0.1, 1, 10, 100]:
        fit = design[:3].reshape(-1, 5)
        beta = np.linalg.solve(fit.T @ fit + alpha * pen, fit.T @ y[:3].reshape(-1))
        candidates.append((float(np.mean((design[3] @ beta - y[3]) ** 2)), alpha, beta))
    _, alpha, beta = min(candidates, key=lambda r: r[0])
    record("ridge", design[4] @ beta, alpha=alpha)
    record("persistence", x[4, :, 0])
    record("training_mean", np.full(405, ym))
    report = {
        "kind": "exploratory_graph_evaluation",
        "target": "Next annual log change in country-sector gross output, current USD (100 × log ratio)",
        "train_target_years": [2018, 2019, 2020],
        "validation_target_years": [2021],
        "test_target_years": [2022],
        "features": [
            "Previous annual log output change",
            "Log current output",
            "Intermediate input share",
            "Foreign intermediate input share",
        ],
        "graph_timing": "Each target year uses only the preceding year input shares and features",
        "independent_training_years": 3,
        "held_out_years": 1,
        "related_nodes_per_year": 405,
        "results": results,
        "predictions": predictions,
        "actual": y[4].tolist(),
        "nodes": metadata()["nodes"],
        "dataset_hashes": {
            str(year): hashlib.sha256(
                (DIRECTORY / f"{year}.npz").read_bytes()
            ).hexdigest()
            for year in range(2016, 2023)
        },
        "elapsed_seconds": time.perf_counter() - start,
        "torch_version": torch.__version__,
        "limitations": [
            "Only three training years and ONE held-out year: exploratory feasibility demonstration, not reliable generalization evidence",
            "405 connected nodes are dependent observations, not 405 independent annual samples",
            "Nominal USD output changes mix real activity, inflation and exchange rates",
            "Revised historical tables; original release timing unavailable; not point-in-time trading evidence",
            "No causal shock conditioning or calibrated uncertainty; all seeds and ablations reported",
        ],
    }
    (output_dir / "evaluation.json").write_text(json.dumps(report, indent=2))
    return report


def replay(model: str = "graph_seed17") -> np.ndarray:
    """Replay one saved graph or no-graph checkpoint on the 2022 held-out year."""
    if model not in {
        f"{kind}_seed{s}" for kind in ["graph", "no_graph"] for s in [17, 29, 43]
    }:
        raise ValueError("Unknown graph checkpoint")
    state = torch.load(
        DATA / "models/gnn" / f"{model}.pt", map_location="cpu", weights_only=True
    )
    m = GraphPredictor()
    m.load_state_dict(state["state_dict"])
    m.eval()
    x, a, _ = panel()
    x = (x[4:5] - np.array(state["mean"])) / np.array(state["scale"])
    with torch.inference_mode():
        pred = (
            m(
                torch.tensor(x, dtype=torch.float32),
                torch.tensor(
                    a[4:5] if state["use_graph"] else np.zeros_like(a[4:5]),
                    dtype=torch.float32,
                ),
            )[0].numpy()
            * state["target_scale"]
            + state["target_mean"]
        )
    return pred
