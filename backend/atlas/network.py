"""Observed OECD flows, documented aggregation, and hypothetical fixed-coefficient scenarios."""

import json
from functools import lru_cache

import numpy as np
from scipy.linalg import solve

from atlas.data import DATA

DIRECTORY = DATA / "processed/network"


@lru_cache(maxsize=7)
def load(year: int = 2022) -> dict[str, np.ndarray]:
    """Load one frozen annual aggregate. The returned arrays are read-only."""
    if year not in range(2016, 2023):
        raise ValueError("Network year must be 2016–2022")
    with np.load(DIRECTORY / f"{year}.npz", allow_pickle=False) as f:
        arrays = {k: f[k] for k in ["a", "z", "output"]}
    for v in arrays.values():
        v.flags.writeable = False
    return arrays


def metadata() -> dict:
    """Return the committed network metadata, including reconciliation records."""
    return json.loads((DIRECTORY / "metadata.json").read_text())


def profile(country: str = "JPN", year: int = 2022) -> dict:
    """Observed supplier flows and sector output for one area and year."""
    meta = metadata()
    nodes = meta["nodes"]
    d = load(year)
    selected = [i for i, n in enumerate(nodes) if n["country"] == country]
    if not selected:
        raise ValueError("Country is not separately represented in regular ICIO")
    output = float(d["output"][selected].sum())
    geography = {
        c["id"]: c for c in json.loads((DATA / "processed/countries.json").read_text())
    }
    links = []
    for code in dict.fromkeys(n["country"] for n in nodes):
        idx = [i for i, n in enumerate(nodes) if n["country"] == code]
        value = float(d["z"][np.ix_(idx, selected)].sum())
        links.append(
            {
                "country": code,
                "name": nodes[idx[0]]["country_name"],
                "flow_million_usd": value,
                "share_of_buyer_output": value / output if output else None,
                "domestic": code == country,
                "coordinates": [
                    geography[code]["longitude"],
                    geography[code]["latitude"],
                ]
                if code in geography
                else None,
            }
        )
    links.sort(key=lambda r: r["flow_million_usd"], reverse=True)
    sector_rows = []
    for j in selected:
        foreign = sum(
            d["z"][i, j] for i, n in enumerate(nodes) if n["country"] != country
        )
        sector_rows.append(
            {
                **nodes[j],
                "output_million_usd": float(d["output"][j]),
                "foreign_input_share": float(foreign / d["output"][j])
                if d["output"][j] > 0
                else None,
            }
        )
    return {
        "kind": "observed_historical_network",
        "country": country,
        "year": year,
        "output_million_usd": output,
        "coordinates": [geography[country]["longitude"], geography[country]["latitude"]]
        if country in geography
        else None,
        "suppliers": links,
        "sectors": sector_rows,
        "limitations": meta["limitations"],
    }


def scenario(
    country: str = "SAU",
    sector: str = "Energy",
    shock: float = 0.1,
    year: int = 2022,
) -> dict:
    """Hypothetical fixed-coefficient cost scenario on one observed network."""
    if not np.isfinite(shock) or not -0.5 <= shock <= 0.5:
        raise ValueError("Direct cost change must be within −50% to +50%")
    meta = metadata()
    nodes = meta["nodes"]
    d = load(year)
    source = next(
        (
            i
            for i, n in enumerate(nodes)
            if n["country"] == country and n["sector"] == sector
        ),
        None,
    )
    if source is None:
        raise ValueError("Unknown country/sector")
    if d["output"][source] <= 0:
        raise ValueError("Selected sector has no measured output")
    a = d["a"]
    s = np.zeros(len(a))
    s[source] = shock
    total = solve(np.eye(len(a)) - a.T, s)
    if not np.isfinite(total).all() or (total < -1).any():
        raise ValueError("Scenario outside price domain")
    first = a.T @ s
    higher = total - s - first
    rows = [
        {
            **n,
            "direct": float(s[i]),
            "first_order": float(first[i]),
            "higher_order": float(higher[i]),
            "total": float(total[i]),
        }
        for i, n in enumerate(nodes)
    ]
    countries = []
    for code in dict.fromkeys(n["country"] for n in nodes):
        idx = [i for i, n in enumerate(nodes) if n["country"] == code]
        w = d["output"][idx]
        denom = float(w.sum())
        countries.append(
            {
                "country": code,
                "name": nodes[idx[0]]["country_name"],
                "total": float(w @ total[idx] / denom) if denom else None,
            }
        )
    countries.sort(key=lambda r: abs(r["total"] or 0), reverse=True)
    contributions = []
    for j in np.argsort(abs(total))[-10:][::-1]:
        for i in np.argsort(abs(a[:, j] * total))[-3:][::-1]:
            if a[i, j] != 0:
                contributions.append(
                    {
                        "supplier": nodes[i]["id"],
                        "buyer": nodes[j]["id"],
                        "contribution": float(a[i, j] * total[i]),
                    }
                )
    return {
        "kind": "hypothetical_structural_estimate",
        "network_year": year,
        "source_node": nodes[source]["id"],
        "direct_cost_change": shock,
        "countries": countries,
        "nodes": rows,
        "largest_recipient_contributions": contributions,
        "residual": float(np.linalg.norm(total - a.T @ total - s)),
        "units": "fractional modeled cost changes; country means weighted by baseline gross output, not CPI or GDP",
        "assumptions": [
            "Fixed historical input shares",
            "Full cost pass-through",
            "No substitution or dynamic horizon",
            "Exogenous unit-cost shock, not an identified oil-supply shock",
            "No causal macro or investment-return mapping",
        ],
    }
