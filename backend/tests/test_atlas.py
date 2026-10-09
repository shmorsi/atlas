import json
import pytest
from fastapi.testclient import TestClient
from atlas.api import app
from atlas import data

client = TestClient(app)


def test_countries():
    r = client.get("/api/countries?year=2024")
    assert r.status_code == 200
    rows = r.json()["countries"]
    assert len(rows) == 177
    japan = next(x for x in rows if x["id"] == "JPN")
    assert japan["name"] == "Japan"
    assert japan["indicators"]["SP.POP.TOTL"]["value"] > 100_000_000
    assert client.get("/api/countries?year=2050").status_code == 422


def test_country_history_and_missing():
    d = client.get("/api/countries/JPN").json()
    assert len(d["observations"]) == 260
    assert all(o["publication_date"] is None for o in d["observations"])
    assert client.get("/api/countries/NOPE").status_code == 404
    assert (
        data.query("SELECT count(*) AS n FROM observations WHERE value IS NULL")[0]["n"]
        > 0
    )


def test_source_integrity():
    import hashlib

    manifest = client.get("/api/sources").json()
    for source in manifest:
        name = (
            f"{source['indicator']}.json"
            if "indicator" in source
            else "countries.geojson"
        )
        assert (
            hashlib.sha256((data.DATA / "raw" / name).read_bytes()).hexdigest()
            == source["sha256"]
        )


def test_geo_has_unique_ids():
    g = json.loads((data.ROOT / "frontend/public/data/world.geojson").read_text())
    ids = [f["properties"]["id"] for f in g["features"]]
    assert len(ids) == len(set(ids))
