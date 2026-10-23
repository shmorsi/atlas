"""Add the latest completed annual WDI observations without changing the frozen forecast dataset."""

import datetime
import hashlib
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))
from atlas.data import DATA, INDICATORS
from atlas.updates import atomic_write, download

year = datetime.datetime.now().astimezone().date().year - 1
countries = json.loads((DATA / "processed/countries.json").read_text())
lookup = {c["wb_id"]: c["id"] for c in countries}
rows = []
sources = []
raws = {}
for code, (label, unit) in INDICATORS.items():
    url = f"https://api.worldbank.org/v2/country/all/indicator/{code}?format=json&date={year}&per_page=20000&source=2"
    raw = download(url)
    payload = json.loads(raw)
    if not isinstance(payload, list) or len(payload) != 2 or payload[0]["pages"] != 1:
        raise ValueError("Incomplete WDI response")
    retrieved = datetime.datetime.now(datetime.timezone.utc).isoformat()
    filename = f"raw/latest-{code}-{year}.json"
    raws[filename] = raw
    sources.append(
        {
            "source": "World Bank WDI",
            "indicator": code,
            "label": label,
            "year": year,
            "url": url,
            "raw_file": filename,
            "sha256": hashlib.sha256(raw).hexdigest(),
            "retrieved_at": retrieved,
            "last_updated": payload[0].get("lastupdated"),
            "license": "CC BY 4.0 with World Bank additional terms",
        }
    )
    for o in payload[1]:
        entity = lookup.get(o["countryiso3code"])
        if entity is None:
            continue
        if int(o["date"]) != year:
            raise ValueError("Unexpected WDI year")
        value = o["value"]
        if value is not None and not __import__("math").isfinite(value):
            raise ValueError("Invalid observation")
        rows.append(
            {
                "entity": entity,
                "indicator": code,
                "value": value,
                "year": year,
                "unit": unit,
                "observation_date": f"{year}-12-31",
                "publication_date": None,
                "vintage": None,
                "retrieved_at": retrieved,
                "source": "World Bank WDI",
                "quality_flag": "missing"
                if value is None
                else "revised_history;release_date_unknown",
            }
        )
for name, raw in raws.items():
    atomic_write(DATA / name, raw)
atomic_write(
    DATA / "processed/latest-annual.json",
    json.dumps({"year": year, "observations": rows, "sources": sources}).encode(),
)
print(
    "Year",
    year,
    "records",
    len(rows),
    "nonmissing",
    sum(r["value"] is not None for r in rows),
)
