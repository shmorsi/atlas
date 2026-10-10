"""Differentiable, historical fixed-share price scenarios. No learned causal claims."""

import torch
from atlas.network import load, metadata


def simulate(shocks, year=2022, pass_through=1.0, focus="JPN"):
    meta = metadata()
    nodes = meta["nodes"]
    d = load(year)
    ids = {n["id"]: i for i, n in enumerate(nodes)}
    s = torch.zeros(len(nodes), dtype=torch.float64)
    seen = set()
    for shock in shocks:
        key = next(
            (
                n["id"]
                for n in nodes
                if n["country"] == shock["country"] and n["sector"] == shock["sector"]
            ),
            None,
        )
        if key is None or key in seen:
            raise ValueError("Choose distinct, available country-sector shocks")
        seen.add(key)
        i = ids[key]
        if d["output"][i] <= 0:
            raise ValueError("Selected sector has no measured output")
        s[i] = shock["shock"]
    selected = [i for i, n in enumerate(nodes) if n["country"] == focus]
    if not selected:
        raise ValueError("Focus country is not in the OECD network")
    a = torch.tensor(d["a"], dtype=torch.float64)
    output = torch.tensor(d["output"], dtype=torch.float64)
    weight = torch.zeros_like(s)
    weight[selected] = output[selected] / output[selected].sum()
    identity = torch.eye(len(nodes), dtype=torch.float64)
    s.requires_grad_()
    alpha = torch.tensor(pass_through, dtype=torch.float64, requires_grad=True)
    total = torch.linalg.solve(identity - alpha * a.T, s)
    if not torch.isfinite(total).all() or (total < -1).any():
        raise ValueError(
            "Combined scenario implies a cost below zero; reduce its magnitude"
        )
    focused = weight @ total
    gradient, alpha_gradient = torch.autograd.grad(focused, (s, alpha))
    direct = s.detach()
    first = pass_through * a.T @ direct
    values = total.detach()
    higher = values - direct - first
    rows = [
        {
            **n,
            "direct": float(direct[i]),
            "first_order": float(first[i]),
            "higher_order": float(higher[i]),
            "total": float(values[i]),
        }
        for i, n in enumerate(nodes)
    ]
    countries = []
    for code in dict.fromkeys(n["country"] for n in nodes):
        idx = [i for i, n in enumerate(nodes) if n["country"] == code]
        w = output[idx] / output[idx].sum()
        countries.append(
            {
                "country": code,
                "name": nodes[idx[0]]["country_name"],
                **{
                    key: float(w @ tensor[idx])
                    for key, tensor in [
                        ("total", values),
                        ("direct", direct),
                        ("first_order", first),
                        ("higher_order", higher),
                    ]
                },
            }
        )
    countries.sort(key=lambda r: abs(r["total"]), reverse=True)
    rounds = [{"round": 0, "total": float(weight @ direct)}]
    term, cumulative = direct.clone(), direct.clone()
    for step in range(1, 9):
        term = pass_through * a.T @ term
        cumulative = cumulative + term
        rounds.append({"round": step, "total": float(weight @ cumulative)})
    sensitivity = []
    for rate in sorted(set([0.0, 0.25, 0.5, 0.75, 1.0, pass_through])):
        value = torch.linalg.solve(identity - rate * a.T, direct)
        sensitivity.append(
            {
                "pass_through": rate,
                "total": float(weight @ value),
                "within_price_domain": bool((value >= -1).all()),
            }
        )
    attribution = [
        {
            **nodes[ids[key]],
            "shock": float(direct[ids[key]]),
            "contribution": float(gradient[ids[key]] * direct[ids[key]]),
        }
        for key in sorted(seen)
    ]
    attribution.sort(key=lambda r: abs(r["contribution"]), reverse=True)
    return {
        "kind": "hypothetical_structural_estimate",
        "framework": "PyTorch",
        "network_year": year,
        "pass_through": pass_through,
        "shocks": shocks,
        "network_sha256": next(
            r["aggregate_sha256"] for r in meta["validation"] if r["year"] == year
        ),
        "source_url": meta["url"],
        "engine": "fixed_share_price_v1",
        "countries": countries,
        "nodes": rows,
        "focus": next(c for c in countries if c["country"] == focus),
        "rounds": rounds,
        "remaining_after_rounds": float(weight @ (values - cumulative)),
        "sensitivity": sensitivity,
        "attribution": attribution,
        "drivers": [
            {**nodes[i], "derivative": float(gradient[i])}
            for i in torch.argsort(gradient, descending=True)[:8].tolist()
        ],
        "pass_through_derivative": float(alpha_gradient),
        "residual": float(
            torch.linalg.vector_norm(values - pass_through * a.T @ values - direct)
        ),
        "equation": "p = s + α Aᵀ p; p = (I − α Aᵀ)⁻¹ s",
        "units": "Fractional unit-cost changes; country aggregates weighted by historical gross output",
        "assumptions": [
            "Historical input shares stay fixed",
            "Uniform pass-through on intermediate-input cost changes",
            "Direct shocks are additive changes relative to baseline unit costs",
            "No substitution, demand response, monetary response, or time horizon",
            "Sensitivity is an assumption comparison, not a probability interval",
            "These are cost scenarios, not GDP, CPI, asset-return or event forecasts",
        ],
    }
