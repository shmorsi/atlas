"""Independent streaming Decimal check of selected raw transaction blocks (no importer reuse)."""
import csv
import io
import json
import sys
import zipfile
from decimal import Decimal
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
meta = json.loads((ROOT / "data/processed/network/metadata.json").read_text())
nodes = {n["id"]: i for i, n in enumerate(meta["nodes"])}
checks = []


def industry_match(code, group, energy_codes):
    if group == "ENERGY":
        return code in energy_codes
    if group == "MANUFACTURING":
        return code.startswith("C") and code not in energy_codes
    return not code.startswith(("A", "B", "C", "F")) and code != "D"


def member_columns(node, header_row, energy_codes, groups):
    area, group = node.split("_")
    return {
        h
        for h in header_row
        if h.startswith(area + "_")
        and industry_match(h.partition("_")[2], group, energy_codes)
        and h.partition("_")[2] in groups
    }


with zipfile.ZipFile(sys.argv[1]) as archive:
    for year in [2016, 2020, 2022]:
        with archive.open(f"{year}_SML.csv") as f:
            reader = csv.reader(io.TextIOWrapper(f))
            headers = next(reader)
            energy = {"B05", "B06", "B09", "C19", "D"}
            pairs = [
                ("SAU_ENERGY", "JPN_MANUFACTURING"),
                ("USA_SERVICES", "CAN_ENERGY"),
            ]
            blocks = [
                (
                    member_columns(a, headers, energy, meta["industry_groups"]),
                    member_columns(b, headers, energy, meta["industry_groups"]),
                )
                for a, b in pairs
            ]
            columns = [[headers.index(c) for c in cols] for _,cols in blocks]
            sums = [Decimal(0),Decimal(0)]; outputs = [Decimal(0),Decimal(0)]
            for row in reader:
                for i,(rows,_) in enumerate(blocks):
                    if row[0] in rows: sums[i] += sum((Decimal(row[j]) for j in columns[i]),Decimal(0))
                    if row[0] == 'OUT': outputs[i] = sum((Decimal(row[j]) for j in columns[i]),Decimal(0))
            with np.load(ROOT / f'data/processed/network/{year}.npz') as d:
                for i,(a,b) in enumerate(pairs):
                    stored = float(d['z'][nodes[a], nodes[b]])
                    error = abs(stored-float(sums[i]))
                    assert error < 1e-7, (year,a,b,sums[i],stored,blocks[i])
                    assert abs(float(d['output'][nodes[b]])-float(outputs[i])) < 1e-7
                    checks.append({'year':year,'supplier':a,'buyer':b,'raw_decimal_sum':str(sums[i]),'aggregate_value':stored,'absolute_error':error,'buyer_output_verified':str(outputs[i])})
print(json.dumps({'method':'Independent stdlib CSV and Decimal block sums; no importer aggregation function reused','checks':checks},indent=2))
