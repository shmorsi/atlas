"""Small-sample retrospective annual forecasting experiment, CPU only.

No original release dates exist in this cache. This is revised-history evaluation,
not a tradable point-in-time backtest. Inputs stop two annual periods before target.
"""

import copy, hashlib, json, random, time
from pathlib import Path
import numpy as np
import torch
from torch import nn
from atlas.data import DATA, query


class TemporalGaussian(nn.Module):
    def __init__(self, features, hidden=8):
        super().__init__()
        self.gru = nn.GRU(features, hidden, batch_first=True)
        self.head = nn.Linear(hidden, 2)

    def forward(self, x):
        h, _ = self.gru(x)
        out = self.head(h[:, -1])
        return out[:, 0], nn.functional.softplus(out[:, 1]) + 0.05


class EconomicGNN(nn.Module):
    """Incoming input-share messages; no training/economic claims without verified A."""

    def __init__(self, features, hidden=8):
        super().__init__()
        self.local = nn.Linear(features, hidden)
        self.message = nn.Linear(features, hidden, bias=False)
        self.out = nn.Linear(hidden, 1)

    def forward(self, x, a):
        # A[i,j] is supplier i's input share in j. Batch dimension is time, not independent nodes.
        incoming = torch.einsum("ij,bif->bjf", a, x)
        return self.out(torch.tanh(self.local(x) + self.message(incoming))).squeeze(-1)


def dataset():
    specs = [
        ("USA", "NY.GDP.MKTP.KD.ZG"),
        ("CAN", "NY.GDP.MKTP.KD.ZG"),
        ("JPN", "NY.GDP.MKTP.KD.ZG"),
        ("USA", "NE.TRD.GNFS.ZS"),
    ]
    years = np.arange(1961, 2025)
    lookup = {
        (r["entity"], r["indicator"], r["year"]): r["value"]
        for r in query("SELECT entity,indicator,year,value FROM observations")
    }
    values = np.array(
        [
            [
                np.nan if lookup.get((c, k, int(y))) is None else lookup[(c, k, int(y))]
                for c, k in specs
            ]
            for y in years
        ],
        dtype=float,
    )
    x = []
    targets = []
    target_year = []
    for t in range(6, len(years)):
        # Last input = t-2, not t-1. No interpolation, backward-fill, or imputation.
        window = values[t - 6 : t - 1]
        if np.isfinite(window).all() and np.isfinite(values[t, 0]):
            x.append(window)
            targets.append(values[t, 0])
            target_year.append(years[t])
    return np.array(x), np.array(targets), np.array(target_year), specs


def metrics(y, mean, sd=None):
    out = {
        "mae": float(np.mean(np.abs(y - mean))),
        "rmse": float(np.sqrt(np.mean((y - mean) ** 2))),
    }
    if sd is not None:
        out.update(
            {
                "gaussian_nll": float(
                    np.mean(
                        0.5 * np.log(2 * np.pi)
                        + np.log(sd)
                        + 0.5 * ((y - mean) / sd) ** 2
                    )
                ),
                "coverage_80": float(np.mean(np.abs(y - mean) <= 1.2815515655 * sd)),
                "mean_interval_width_80": float(np.mean(2 * 1.2815515655 * sd)),
            }
        )
    return out


def train(output: Path, epochs=300, seeds=(17, 29, 43)):
    output.mkdir(parents=True, exist_ok=True)
    start = time.perf_counter()
    x, y, years, specs = dataset()
    tr = years <= 2005
    va = (years >= 2006) & (years <= 2014)
    te = years >= 2015
    if min(tr.sum(), va.sum(), te.sum()) < 5:
        raise ValueError("Insufficient chronological observations")
    xm = x[tr].mean(axis=(0, 1))
    xs = x[tr].std(axis=(0, 1))
    xs[xs < 1e-8] = 1
    ym = y[tr].mean()
    ys = y[tr].std()
    xt = torch.tensor((x - xm) / xs, dtype=torch.float32)
    yt = torch.tensor((y - ym) / ys, dtype=torch.float32)
    records = []
    predictions = {}
    torch.set_num_threads(1)
    for name, features in [
        ("gru_multivariate", list(range(x.shape[-1]))),
        ("gru_domestic_only", [0]),
    ]:
        for seed in seeds:
            random.seed(seed)
            np.random.seed(seed)
            torch.manual_seed(seed)
            torch.use_deterministic_algorithms(True)
            model = TemporalGaussian(len(features))
            optimizer = torch.optim.Adam(
                model.parameters(), lr=0.01, weight_decay=0.001
            )
            best = float("inf")
            wait = 0
            state = None
            best_epoch = 0
            for epoch in range(epochs):
                model.train()
                optimizer.zero_grad()
                mu, sd = model(xt[tr][:, :, features])
                loss = (sd.log() + 0.5 * ((yt[tr] - mu) / sd) ** 2).mean()
                loss.backward()
                nn.utils.clip_grad_norm_(model.parameters(), 1)
                optimizer.step()
                model.eval()
                with torch.no_grad():
                    vm, vs = model(xt[va][:, :, features])
                    vl = float((vs.log() + 0.5 * ((yt[va] - vm) / vs) ** 2).mean())
                if vl < best - 1e-5:
                    best = vl
                    state = copy.deepcopy(model.state_dict())
                    best_epoch = epoch + 1
                    wait = 0
                else:
                    wait += 1
                if wait >= 30:
                    break
            model.load_state_dict(state)
            model.eval()
            with torch.no_grad():
                mu, sd = model(xt[te][:, :, features])
                mean = mu.numpy() * ys + ym
                std = sd.numpy() * ys
            key = f"{name}_seed{seed}"
            record = {
                "model": name,
                "seed": seed,
                "parameters": sum(p.numel() for p in model.parameters()),
                "best_epoch": best_epoch,
                "validation_nll_standardized_without_constant": best,
                **metrics(y[te], mean, std),
            }
            records.append(record)
            predictions[key] = {
                "mean": mean.tolist(),
                "lower80": (mean - 1.2815515655 * std).tolist(),
                "upper80": (mean + 1.2815515655 * std).tolist(),
            }
            torch.save(
                {
                    "state_dict": state,
                    "features": features,
                    "mean": xm.tolist(),
                    "scale": xs.tolist(),
                    "target_mean": float(ym),
                    "target_scale": float(ys),
                    "architecture": "GRU(8) + Gaussian head",
                    "seed": seed,
                    "last_training_target": 2005,
                },
                output / f"{key}.pt",
            )
    flat = ((x - xm) / xs).reshape(len(x), -1)
    design = np.c_[np.ones(len(x)), flat]
    pen = np.eye(design.shape[1])
    pen[0, 0] = 0
    ridge_candidates = []
    for alpha in [0.1, 1, 10, 100]:
        beta = np.linalg.solve(
            design[tr].T @ design[tr] + alpha * pen, design[tr].T @ y[tr]
        )
        ridge_candidates.append(
            (float(np.mean((design[va] @ beta - y[va]) ** 2)), alpha, beta)
        )
    _, alpha, beta = min(ridge_candidates, key=lambda z: z[0])
    for name, pred in [
        ("persistence_lag2", x[te, -1, 0]),
        ("training_mean", np.full(te.sum(), ym)),
        ("ridge", design[te] @ beta),
    ]:
        records.append(
            {
                "model": name,
                "seed": None,
                **metrics(y[te], pred),
                **({"alpha": alpha} if name == "ridge" else {}),
            }
        )
        predictions[name] = {"mean": pred.tolist()}
    report = {
        "kind": "retrospective_neural_evaluation",
        "target": "USA real GDP growth, annual percent",
        "forecast_horizon": "Target year t, inputs ending t-2",
        "dataset_sha256": hashlib.sha256(
            (DATA / "processed/observations.parquet").read_bytes()
        ).hexdigest(),
        "features": [list(s) for s in specs],
        "train_years": years[tr].tolist(),
        "validation_years": years[va].tolist(),
        "test_years": years[te].tolist(),
        "n_temporal_targets": int(len(years)),
        "test_actual": y[te].tolist(),
        "results": records,
        "predictions": predictions,
        "elapsed_seconds": time.perf_counter() - start,
        "torch_version": torch.__version__,
        "limitations": [
            "Small annual sample: demonstration, not reliable forecast evidence",
            "Revised history; no release dates/vintages, not point-in-time evaluation",
            "Gaussian intervals are uncalibrated; coverage measured on only 10 annual targets",
            "No causal identification; no scenario-to-asset mapping",
            "All seeds reported; no selection using test performance",
            "GNN empirical training blocked: no verified production network; nodes do not create independent years",
        ],
    }
    (output / "evaluation.json").write_text(json.dumps(report, indent=2))
    return report


def infer(checkpoint: Path, window):
    state = torch.load(checkpoint, map_location="cpu", weights_only=True)
    model = TemporalGaussian(len(state["features"]))
    model.load_state_dict(state["state_dict"])
    model.eval()
    x = np.asarray(window, float)
    if x.shape != (5, 4) or not np.isfinite(x).all():
        raise ValueError("Require a complete 5-year, 4-feature window")
    x = (x - np.array(state["mean"])) / np.array(state["scale"])
    with torch.no_grad():
        mean, sd = model(
            torch.tensor(x[None][:, :, state["features"]], dtype=torch.float32)
        )
    return {
        "kind": "neural_prediction",
        "mean": float(mean[0]) * state["target_scale"] + state["target_mean"],
        "standard_deviation": float(sd[0]) * state["target_scale"],
        "validated_for_causal_scenarios": False,
    }
