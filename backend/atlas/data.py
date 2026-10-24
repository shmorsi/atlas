"""Frozen country cache: geometries, World Bank rows, and read-only queries."""

import json
import math
import sqlite3
from pathlib import Path

import duckdb
import polars as pl

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "data"
INDICATORS = {
    "NY.GDP.MKTP.CD": ("GDP", "current US$"),
    "SP.POP.TOTL": ("Population", "people"),
    "NY.GDP.MKTP.KD.ZG": ("GDP growth", "annual %"),
    "NE.TRD.GNFS.ZS": ("Trade openness", "% of GDP"),
}


def prepare() -> None:
    """Normalize the raw country file and World Bank cache into the processed tables."""
    geo = json.loads((DATA / "raw/countries.geojson").read_text())
    countries = []
    for i, f in enumerate(geo["features"]):
        p = f["properties"]
        code = p["ADM0_A3"]
        wb = p.get("WB_A3")
        if not wb or wb == "-99":
            wb = code
        countries.append(
            {
                "id": code,
                "wb_id": wb,
                "name": p["ADMIN"],
                "region": p["CONTINENT"],
                "subregion": p["SUBREGION"],
                "longitude": p["LABEL_X"],
                "latitude": p["LABEL_Y"],
            }
        )
        f["id"] = i
        f["properties"] = {
            "id": code,
            "name": p["ADMIN"],
            "region": p["CONTINENT"],
            "longitude": p["LABEL_X"],
            "latitude": p["LABEL_Y"],
        }
    (DATA / "processed/countries.json").write_text(json.dumps(countries))
    (ROOT / "frontend/public/data/world.geojson").write_text(
        json.dumps(geo, separators=(",", ":"))
    )
    lookup = {c["wb_id"]: c["id"] for c in countries}
    manifest = json.loads((DATA / "manifest.json").read_text())
    sources = {s.get("indicator"): s for s in manifest}
    rows = []
    for code, (_, unit) in INDICATORS.items():
        for o in json.loads((DATA / f"raw/{code}.json").read_text())[1]:
            entity = lookup.get(o["countryiso3code"])
            if entity is None:
                continue
            value = o["value"]
            if value is not None and not math.isfinite(value):
                raise ValueError("Non-finite observation")
            rows.append(
                {
                    "entity": entity,
                    "indicator": code,
                    "value": value,
                    "unit": unit,
                    "observation_date": f"{o['date']}-12-31",
                    "year": int(o["date"]),
                    "publication_date": None,
                    "vintage": None,
                    "retrieved_at": sources[code]["retrieved_at"],
                    "source": "World Bank WDI",
                    "quality_flag": "missing"
                    if value is None
                    else "revised_history;release_date_unknown",
                }
            )
    df = pl.DataFrame(rows).with_columns(
        pl.col("publication_date").cast(pl.String), pl.col("vintage").cast(pl.String)
    )
    df.write_parquet(DATA / "processed/observations.parquet")
    with sqlite3.connect(DATA / "metadata.sqlite") as db:
        db.execute(
            "CREATE TABLE IF NOT EXISTS sources (name TEXT PRIMARY KEY, manifest TEXT NOT NULL)"
        )
        db.execute(
            "INSERT OR REPLACE INTO sources VALUES (?,?)",
            ("offline-cache", json.dumps(manifest)),
        )
    print(
        f"{len(countries)} country geometries; {len(rows)} observations including missing values"
    )


def query(sql: str, params: list | None = None) -> list[dict]:
    """Run a read-only DuckDB query against the frozen observations file."""
    with duckdb.connect(":memory:") as db:
        db.read_parquet(str(DATA / "processed/observations.parquet")).create_view(
            "observations"
        )
        result = db.execute(sql, params or [])
        names = [c[0] for c in result.description]
        return [dict(zip(names, r)) for r in result.fetchall()]


def latest_annual() -> dict:
    """Return the separate latest-year cache. It is not the forecast training set."""
    path = DATA / "processed/latest-annual.json"
    return (
        json.loads(path.read_text())
        if path.exists()
        else {"year": 2024, "observations": [], "sources": []}
    )


def countries(year: int = 2024) -> list[dict]:
    """Country geometries joined to one common observation year."""
    items = json.loads((DATA / "processed/countries.json").read_text())
    obs = (
        [o for o in latest_annual()["observations"] if o["year"] == year]
        if year > 2024 else query(
            "SELECT entity,indicator,value,year,unit FROM observations WHERE year=?", [year]
        )
    )
    by = {}
    for o in obs:
        by.setdefault(o["entity"], {})[o["indicator"]] = o
    return [{**c, "indicators": by.get(c["id"], {})} for c in items]


def history(code: str) -> list[dict]:
    """All cached annual observations for one Natural Earth area code."""
    return query("SELECT * FROM observations WHERE entity=? ORDER BY year", [code]) + [
        o for o in latest_annual()["observations"] if o["entity"] == code
    ]
