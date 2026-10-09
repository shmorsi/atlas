"""Explicit, bounded public-source refresh. Offline startup never calls this module's downloader."""

import datetime, email.utils, hashlib, json, os, tempfile, threading
from concurrent.futures import ThreadPoolExecutor
from urllib.parse import urlparse
import urllib.request
import ssl, certifi
import xml.etree.ElementTree as ET
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


def atomic_write(path, content):
    path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(dir=path.parent, delete=False) as f:
        f.write(content)
        name = f.name
    os.replace(name, path)


def parse_feed(raw, key):
    if b"<!DOCTYPE" in raw.upper() or b"<!ENTITY" in raw.upper():
        raise ValueError("Unsupported XML declaration")
    root = ET.fromstring(raw)
    name, url, host = FEEDS[key]
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


def prepare_rates(years):
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


def prepare_events():
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


def download(url):
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


def refresh():
    results = []
    year = datetime.date.today().year
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
        except Exception as e:
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
        except Exception as e:
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
    except Exception as e:
        final = {"status": "failed", "results": [{"detail": str(e)}]}
    with LOCK:
        STATE.update(final)


def start_refresh():
    with LOCK:
        if STATE["status"] == "running":
            return dict(STATE)
        STATE.update(status="running", results=[])
        EXECUTOR.submit(_job)
        return dict(STATE)


def status():
    with LOCK:
        return dict(STATE)
