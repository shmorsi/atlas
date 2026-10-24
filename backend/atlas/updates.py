"""Explicit, bounded public-source refresh. Offline startup never calls this module's downloader."""

import datetime
import email.utils
import hashlib
import json
import os
import ssl
import tempfile
import threading
import urllib.request
import xml.etree.ElementTree as ET
from concurrent.futures import ThreadPoolExecutor
from urllib.parse import urlparse

import certifi

from atlas.data import DATA
from atlas.treasury import parse_xml

FEEDS = {
    "fed": (
        "Federal Reserve",
        "https://www.federalreserve.gov/feeds/press_monetary.xml",
        "www.federalreserve.gov",
    ),
    "ecb": (
        "European Central Bank",
        "https://www.ecb.europa.eu/rss/press.html",
        "www.ecb.europa.eu",
    ),
}
EXECUTOR = ThreadPoolExecutor(max_workers=1)
LOCK = threading.Lock()
STATE = {"status": "idle", "results": []}


def atomic_write(path, content: bytes) -> None:
    """Replace a file by writing a temporary sibling and renaming it into place."""
    path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(dir=path.parent, delete=False) as f:
        f.write(content)
        name = f.name
    os.replace(name, path)


def parse_feed(raw: bytes, key: str) -> list[dict]:
    """Parse one official RSS feed into dated headline rows."""
    if b"<!DOCTYPE" in raw.upper() or b"<!ENTITY" in raw.upper():
        raise ValueError("Unsupported XML declaration")
    root = ET.fromstring(raw)
    name, _url, host = FEEDS[key]
    rows = []
    for item in root.findall(".//item"):
        title = (item.findtext("title") or "").strip()
        link = (item.findtext("link") or "").strip()
        published = item.findtext("pubDate")
        if (
            not title
            or not published
            or urlparse(link).scheme != "https"
            or urlparse(link).hostname != host
        ):
            continue
        dt = email.utils.parsedate_to_datetime(published)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=datetime.timezone.utc)
        rows.append(
            {
                "title": title[:500],
                "url": link,
                "published_at": dt.isoformat(),
                "source": name,
            }
        )
    if not rows:
        raise ValueError("No valid dated feed entries")
    # Headlines and links only. No page content, markup or model instructions are consumed.
    return sorted(rows, key=lambda r: r["published_at"], reverse=True)[:20]


def prepare_rates(years: list[int]) -> dict:
    """Turn downloaded Treasury XML into the current par-curve cache."""
    sources = []
    grouped = {}
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    for year in years:
        path = DATA / f"raw/treasury-{year}.xml"
        raw = path.read_bytes()
        rows = parse_xml(raw, include_six_week=True)
        if any(not r["date"].startswith(str(year) + "-") for r in rows):
            raise ValueError("Unexpected observation year")
        for row in rows:
            grouped.setdefault(row["date"], []).append(row)
        sources.append(
            {
                "raw_file": str(path.relative_to(DATA)),
                "sha256": hashlib.sha256(raw).hexdigest(),
                "year": year,
            }
        )
    result = {
        "source": {
            "name": "US Treasury daily par yield curves",
            "retrieved_at": now,
            "latest_observation": max(grouped),
            "source_url": f"https://home.treasury.gov/resource-center/data-chart-center/interest-rates/pages/xml?data=daily_treasury_yield_curve&field_tdr_date_value={max(years)}",
            "unit": "percent per annum",
            "sources": sources,
        },
        "curves": [{"date": d, "points": p} for d, p in sorted(grouped.items())],
    }
    atomic_write(DATA / "processed/treasury-current.json", json.dumps(result).encode())
    return result["source"]


def prepare_events() -> dict:
    """Turn downloaded official feeds into the events cache."""
    entries = []
    sources = []
    for key, (name, url, host) in FEEDS.items():
        path = DATA / f"raw/events-{key}.xml"
        if not path.exists():
            continue
        raw = path.read_bytes()
        entries.extend(parse_feed(raw, key))
        sources.append(
            {
                "name": name,
                "url": url,
                "raw_file": str(path.relative_to(DATA)),
                "sha256": hashlib.sha256(raw).hexdigest(),
            }
        )
    if not entries:
        raise ValueError("No cached event feeds")
    # Sort instants, not display timezone strings.
    entries.sort(
        key=lambda r: datetime.datetime.fromisoformat(r["published_at"]), reverse=True
    )
    result = {
        "kind": "official_source_headlines",
        "retrieved_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "entries": entries,
        "sources": sources,
        "limitation": "Selected Fed/ECB releases only; not comprehensive world news or causal market-impact estimates",
    }
    atomic_write(DATA / "processed/events.json", json.dumps(result).encode())
    return result


def download(url: str) -> bytes:
    """Fetch one HTTPS document with a timeout, a size cap, and the CA bundle."""
    request = urllib.request.Request(
        url, headers={"User-Agent": "ATLAS-local-research/0.1"}
    )
    with urllib.request.urlopen(
        request, timeout=25, context=ssl.create_default_context(cafile=certifi.where())
    ) as response:
        content = response.read(5_000_001)
    if len(content) > 5_000_000:
        raise ValueError("Source exceeds 5 MB limit")
    return content


def refresh() -> list[dict]:
    """Download Treasury and official event feeds. Failure keeps the previous cache."""
    results = []
    year = datetime.datetime.now().astimezone().date().year
    years = [year - 1, year]
    staged = {}
    phase = []
    for y in years:
        try:
            raw = download(
                f"https://home.treasury.gov/resource-center/data-chart-center/interest-rates/pages/xml?data=daily_treasury_yield_curve&field_tdr_date_value={y}"
            )
            rows = parse_xml(raw, include_six_week=True)
            if any(not r["date"].startswith(str(y) + "-") for r in rows):
                raise ValueError("Unexpected year")
            staged[DATA / f"raw/treasury-{y}.xml"] = raw
            phase.append({"source": f"Treasury {y}", "status": "validated"})
        except Exception as e:  # noqa: BLE001 — a failed download must not replace the cache
            phase.append(
                {"source": f"Treasury {y}", "status": "failed", "detail": str(e)}
            )
    if all(r["status"] == "validated" for r in phase):
        for path, raw in staged.items():
            atomic_write(path, raw)
        prepare_rates(years)
        for r in phase:
            r["status"] = "updated"
    else:
        for r in phase:
            if r["status"] == "validated":
                r["status"] = "retained_previous_cache"
    results.extend(phase)
    staged = {}
    phase = []
    for key, (_, url, _) in FEEDS.items():
        try:
            raw = download(url)
            parse_feed(raw, key)
            staged[DATA / f"raw/events-{key}.xml"] = raw
            phase.append({"source": key, "status": "validated"})
        except Exception as e:  # noqa: BLE001 — a failed download must not replace the cache
            phase.append({"source": key, "status": "failed", "detail": str(e)})
    if all(r["status"] == "validated" for r in phase):
        for path, raw in staged.items():
            atomic_write(path, raw)
        prepare_events()
        for r in phase:
            r["status"] = "updated"
    else:
        for r in phase:
            if r["status"] == "validated":
                r["status"] = "retained_previous_cache"
    return results + phase


def _job():
    try:
        results = refresh()
        final = {
            "status": "completed"
            if all(r["status"] == "updated" for r in results)
            else "partial_failure",
            "results": results,
        }
    except Exception as e:  # noqa: BLE001 — the refresh job reports failure instead of crashing
        final = {"status": "failed", "results": [{"detail": str(e)}]}
    with LOCK:
        STATE.update(final)


def start_refresh() -> dict:
    """Start at most one background refresh and return its current state."""
    with LOCK:
        if STATE["status"] == "running":
            return dict(STATE)
        STATE.update(status="running", results=[])
        EXECUTOR.submit(_job)
        return dict(STATE)


def status() -> dict:
    """Return the latest explicit refresh state."""
    with LOCK:
        return dict(STATE)
