"""Import the official regular ICIO ZIP with strict code alignment and explicit aggregation."""

import sys, json, hashlib, zipfile
from pathlib import Path
import numpy as np
import polars as pl
from scipy.sparse import csr_matrix

ROOT = Path(__file__).resolve().parents[1]
SCHEMA = json.loads((ROOT / "data/reference/oecd/schema.json").read_text())
GROUPS = ["Primary", "Energy", "Manufacturing", "Construction", "Services"]


def group(code):
    if code in ["B05", "B06", "B09", "C19", "D"]:
        return 1
    if code.startswith(("A", "B")):
        return 0
    if code.startswith("C"):
        return 2
    if code == "F":
        return 3
    return 4


def import_archive(path):
    output = ROOT / "data/processed/network"
    output.mkdir(parents=True, exist_ok=True)
    areas = SCHEMA["areas"]
    industries = SCHEMA["industries"]
    sector_codes = [a["code"] + "_" + s["code"] for a in areas for s in industries]
    assignment = np.array(
        [a * 5 + group(s["code"]) for a in range(81) for s in industries]
    )
    aggregation = csr_matrix(
        (np.ones(4050), (assignment, np.arange(4050))), shape=(405, 4050)
    )
    nodes = [
        {
            "id": a["code"] + "_" + g.upper(),
            "country": a["code"],
            "country_name": a["name"],
            "sector": g,
        }
        for a in areas
        for g in GROUPS
    ]
    reports = []
    with zipfile.ZipFile(path) as archive:
        for year in range(2016, 2023):
            name = f"{year}_SML.csv"
            raw = archive.read(name)
            df = pl.read_csv(raw, null_values=["NA", "na", ""], infer_schema_length=0)
            if set(df.columns[1:]) != set(SCHEMA["column_codes"]):
                raise ValueError(f"{year}: unexpected column codes")
            labels = df["V1"].to_list()
            if len(set(labels)) != 4053 or set(labels) != set(SCHEMA["row_codes"]):
                raise ValueError(f"{year}: unexpected row codes")
            row_index = {code: i for i, code in enumerate(labels)}
            cols = (
                sector_codes
                + [
                    c
                    for c in SCHEMA["column_codes"]
                    if c not in sector_codes and c != "OUT"
                ]
                + ["OUT"]
            )
            matrix = df.select(cols).cast(pl.Float64).to_numpy()
            if not np.isfinite(matrix).all():
                raise ValueError(
                    f"{year}: missing/nonfinite source cells; no imputation permitted"
                )
            z = matrix[[row_index[c] for c in sector_codes], :4050]
            x = matrix[row_index["OUT"], :4050]
            output_rows = matrix[[row_index[c] for c in sector_codes], -1]
            if not np.array_equal(x, output_rows):
                raise ValueError("Row/column output denominators disagree")
            if (z < 0).any() or (x < 0).any():
                raise ValueError(
                    "Negative intermediate use/output needs explicit treatment"
                )
            inactive = x == 0
            if np.any(z[inactive]) or np.any(z[:, inactive]):
                raise ValueError("Zero output node has nonzero intermediate flows")
            row_res = matrix[[row_index[c] for c in sector_codes], :-1].sum(1) - x
            col_res = (
                z.sum(0)
                + matrix[row_index["TLS"], :4050]
                + matrix[row_index["VA"], :4050]
                - x
            )
            source_exceptions = [
                {
                    "node": sector_codes[i],
                    "row_residual": float(row_res[i]),
                    "column_residual": float(col_res[i]),
                }
                for i in range(4050)
                if abs(row_res[i]) > 0.25 + 1e-4 * x[i]
                or abs(col_res[i]) > 0.25 + 1e-4 * x[i]
            ]
            # Source uses 4-decimal USD-million values; record all discrepancies rather than rebalance.
            max_relative = float(
                max(
                    np.max(abs(row_res) / np.maximum(x, 1)),
                    np.max(abs(col_res) / np.maximum(x, 1)),
                )
            )
            zg = np.asarray((aggregation @ z) @ aggregation.T)
            xg = np.asarray(aggregation @ x)
            aggregate_row_res = aggregation @ row_res
            aggregate_col_res = aggregation @ col_res
            aggregate_pass = bool(
                np.all(
                    abs(aggregate_row_res)
                    <= (aggregation @ np.full(4050, 0.25)) + 1e-4 * xg
                )
                and np.all(
                    abs(aggregate_col_res)
                    <= (aggregation @ np.full(4050, 0.25)) + 1e-4 * xg
                )
            )
            if not aggregate_pass:
                raise ValueError(
                    f"{year}: aggregate accounting residual exceeds summed constituent tolerances"
                )
            a = np.divide(zg, xg[None, :], out=np.zeros_like(zg), where=xg[None, :] > 0)
            rho = float(np.max(abs(np.linalg.eigvals(a))))
            if rho >= 1:
                raise ValueError(f"{year}: unstable aggregate coefficients")
            np.savez_compressed(output / f"{year}.npz", z=zg, output=xg, a=a)
            reports.append(
                {
                    "year": year,
                    "member": name,
                    "member_sha256": hashlib.sha256(raw).hexdigest(),
                    "source_missing_cells": 0,
                    "source_accounting_exceptions": source_exceptions,
                    "aggregate_accounting_within_tolerance": aggregate_pass,
                    "accounting_tolerance": "Sum of constituent tolerances: 0.25 million USD per original sector + 0.01% output; source exceptions retained, not rebalanced",
                    "aggregate_max_row_relative_residual": float(
                        np.max(abs(aggregate_row_res) / np.maximum(xg, 1))
                    ),
                    "aggregate_max_column_relative_residual": float(
                        np.max(abs(aggregate_col_res) / np.maximum(xg, 1))
                    ),
                    "source_zero_output_nodes": int(inactive.sum()),
                    "max_row_balance_residual_million_usd": float(abs(row_res).max()),
                    "max_column_balance_residual_million_usd": float(
                        abs(col_res).max()
                    ),
                    "max_balance_residual_relative_to_max_output_or_1": max_relative,
                    "spectral_radius": rho,
                    "world_output_million_usd": float(xg.sum()),
                    "aggregate_sha256": hashlib.sha256(
                        (output / f"{year}.npz").read_bytes()
                    ).hexdigest(),
                }
            )
            print(json.dumps(reports[-1]), flush=True)
    metadata = {
        "kind": "observed_historical_network",
        "source": "OECD ICIO 2025 regular tables",
        "url": "https://www.oecd.org/en/data/datasets/inter-country-input-output-tables.html",
        "citation": "OECD (2025), OECD Inter-Country Input-Output Tables, https://oe.cd/icio",
        "archive_sha256": hashlib.sha256(Path(path).read_bytes()).hexdigest(),
        "unit": "current USD million",
        "years": list(range(2016, 2023)),
        "nodes": nodes,
        "industry_groups": {s["code"]: GROUPS[group(s["code"])] for s in industries},
        "validation": reports,
        "limitations": [
            "Historical revised tables, not current observed relationships",
            "Five-sector aggregation preserves summed flows/output but loses within-group heterogeneity",
            "Energy combines coal, oil/gas extraction, mining support, refining and electricity/gas; it is not pure oil",
            "2020 source rows have accounting exceptions beyond tolerance; the five-sector aggregation is checked separately and all exceptions are retained",
            "Published accounting residuals are retained and reported, not repaired",
            "No release-vintage or causal market-transmission claim",
        ],
    }
    (output / "metadata.json").write_text(
        json.dumps(metadata, indent=2, ensure_ascii=False)
    )
    return metadata


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit(
            "Usage: python scripts/import_icio.py /path/to/2016-2022_SML.zip"
        )
    import_archive(Path(sys.argv[1]))
