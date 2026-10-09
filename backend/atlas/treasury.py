"""Historical Treasury par curves. Not spot curves or total-return observations."""

import datetime
import hashlib
import json
import math
import xml.etree.ElementTree as ET
import polars as pl
from atlas.data import DATA

SOURCE = "https://home.treasury.gov/resource-center/data-chart-center/interest-rates/pages/xml?data=daily_treasury_yield_curve&field_tdr_date_value=2024"
TENORS = {
    "1MONTH": 1,
    "2MONTH": 2,
    "3MONTH": 3,
    "4MONTH": 4,
    "6MONTH": 6,
    "1YEAR": 12,
    "2YEAR": 24,
    "3YEAR": 36,
    "5YEAR": 60,
    "7YEAR": 84,
    "10YEAR": 120,
    "20YEAR": 240,
    "30YEAR": 360,
}


def parse_xml(raw, include_six_week=False):
    if b"<!DOCTYPE" in raw.upper() or b"<!ENTITY" in raw.upper():
        raise ValueError("XML declarations are not supported")
    root = ET.fromstring(raw)
    ns = {
        "m": "http://schemas.microsoft.com/ado/2007/08/dataservices/metadata",
        "d": "http://schemas.microsoft.com/ado/2007/08/dataservices",
    }
    rows = []
    seen = set()
    for props in root.findall(".//m:properties", ns):
        date = props.findtext("d:NEW_DATE", namespaces=ns)
        if not date:
            raise ValueError("Treasury observation date missing")
        date = datetime.date.fromisoformat(date[:10]).isoformat()
        if date in seen:
            raise ValueError("Duplicate Treasury date")
        seen.add(date)
        tenors = {**TENORS, **({"1_5MONTH": 1.5} if include_six_week else {})}
        for tenor, months in tenors.items():
            node = props.find("d:BC_" + tenor, ns)
            value = None if node is None or not node.text else float(node.text)
            if value is not None and (
                not math.isfinite(value) or not -10 <= value <= 100
            ):
                raise ValueError("Invalid Treasury yield")
            rows.append(
                {
                    "date": date,
                    "tenor": tenor,
                    "months": months,
                    "yield_percent": value,
                    "quality_flag": "missing" if value is None else "observed",
                }
            )
    if not rows:
        raise ValueError("No Treasury observations found")
    return sorted(rows, key=lambda r: (r["date"], r["months"]))


def prepare():
    raw = (DATA / "raw/treasury-2024.xml").read_bytes()
    rows = parse_xml(raw)
    if any(not r["date"].startswith("2024-") for r in rows):
        raise ValueError("Unexpected Treasury observation year")
    pl.DataFrame(rows).write_parquet(DATA / "processed/treasury.parquet")
    manifest = {
        "name": "US Treasury daily par yield curves",
        "source_url": SOURCE,
        "raw_file": "raw/treasury-2024.xml",
        "sha256": hashlib.sha256(raw).hexdigest(),
        "retrieved_at": "2026-10-09",
        "unit": "percent per annum",
        "license": "US federal government data; Treasury attribution retained",
        "publication_date": None,
        "vintage": None,
        "observations": len(rows),
        "dates": len({r["date"] for r in rows}),
        "limitation": "Historical revised feed; original release vintages unavailable. Par yields are not spot rates or investment returns.",
    }
    (DATA / "treasury-manifest.json").write_text(json.dumps(manifest, indent=2))
    return manifest


def curves():
    path = DATA / "processed/treasury.parquet"
    if not path.exists():
        raise FileNotFoundError("Treasury cache unavailable")
    df = pl.read_parquet(path).sort(["date", "months"])
    grouped = {}
    for row in df.to_dicts():
        grouped.setdefault(row["date"], []).append(row)
    source = json.loads((DATA / "treasury-manifest.json").read_text())
    current = DATA / "processed/treasury-current.json"
    if current.exists():
        latest = json.loads(current.read_text())
        for curve in latest["curves"]:
            grouped[curve["date"]] = curve["points"]
        original = {k: source[k] for k in ["raw_file", "sha256", "retrieved_at"]}
        source = {**source, **latest["source"], "dates": len(grouped), "observations": sum(len(p) for p in grouped.values()), "sources": [{**original, "year": 2024}, *latest["source"]["sources"]]}
        source.pop("raw_file", None)
        source.pop("sha256", None)
    return {
        "kind": "observed",
        "source": source,
        "curves": [
            {"date": date, "points": points} for date, points in sorted(grouped.items())
        ],
    }
