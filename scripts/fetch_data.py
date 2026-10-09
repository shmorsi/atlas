"""Explicit, opt-in data refresh. Normal startup never accesses the internet."""

import json, hashlib, datetime, urllib.request, concurrent.futures
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "data/raw"
INDICATORS = {
    "NY.GDP.MKTP.CD": ("GDP", "current US$"),
    "SP.POP.TOTL": ("Population", "people"),
    "NY.GDP.MKTP.KD.ZG": ("GDP growth", "annual %"),
    "NE.TRD.GNFS.ZS": ("Trade openness", "% of GDP"),
}


def fetch(code):
    url = f"https://api.worldbank.org/v2/country/all/indicator/{code}?format=json&date=1960:2024&per_page=20000&source=2"
    with urllib.request.urlopen(url, timeout=120) as r:
        raw = r.read()
    payload = json.loads(raw)
    if not isinstance(payload, list) or len(payload) < 2:
        raise ValueError(f"Invalid World Bank response: {code}")
    if payload[0]["pages"] != 1:
        raise ValueError("Pagination needs handling; refusing incomplete cache")
    (RAW / f"{code}.json").write_bytes(raw)
    return {
        "indicator": code,
        "label": INDICATORS[code][0],
        "unit": INDICATORS[code][1],
        "url": url,
        "retrieved_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "sha256": hashlib.sha256(raw).hexdigest(),
        "source": "World Bank · World Development Indicators",
        "license": "CC BY 4.0 with World Bank additional terms",
        "last_updated": payload[0].get("lastupdated"),
        "publication_date": None,
        "vintage": None,
    }


if __name__ == "__main__":
    RAW.mkdir(parents=True, exist_ok=True)
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        sources = list(pool.map(fetch, INDICATORS))
    geo = RAW / "countries.geojson"
    sources.append(
        {
            "source": "Natural Earth",
            "url": "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson",
            "license": "Public domain",
            "sha256": hashlib.sha256(geo.read_bytes()).hexdigest(),
            "retrieved_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            "scale": "1:110 million",
        }
    )
    (ROOT / "data/manifest.json").write_text(json.dumps(sources, indent=2))
    print("Downloaded", len(sources), "sources; run scripts/prepare_data.py")
