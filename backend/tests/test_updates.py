import json
from urllib.parse import urlparse
import pytest
from fastapi.testclient import TestClient
from atlas.api import app
from atlas import updates
from atlas.treasury import curves
from atlas.data import DATA


def test_current_rates_and_official_events():
    rates = curves()
    assert rates["curves"][-1]["date"] >= "2026-01-01"
    assert len(rates["curves"]) > 500
    assert any(p["months"] == 1.5 for p in rates["curves"][-1]["points"])
    data = json.loads((DATA / "processed/events.json").read_text())
    assert len(data["entries"]) > 0
    assert all(
        urlparse(e["url"]).hostname in {"www.federalreserve.gov", "www.ecb.europa.eu"}
        for e in data["entries"]
    )
    assert all(e["published_at"] for e in data["entries"])


def test_feed_rejects_markup_and_foreign_link():
    with pytest.raises(ValueError):
        updates.parse_feed(b"<!DOCTYPE foo><rss/>", "fed")
    xml = b"<rss><channel><item><title>Invalid link</title><link>javascript:alert(1)</link><pubDate>Thu, 08 Oct 2026 12:00:00 GMT</pubDate></item></channel></rss>"
    with pytest.raises(ValueError):
        updates.parse_feed(xml, "fed")


def test_failed_refresh_preserves_existing_cache(monkeypatch, tmp_path):
    monkeypatch.setattr(updates, "DATA", tmp_path)
    (tmp_path / "processed").mkdir()
    path = tmp_path / "processed/events.json"
    path.write_text("previous publication")

    def fail(url):
        raise OSError("offline")

    monkeypatch.setattr(updates, "download", fail)
    result = updates.refresh()
    assert all(r["status"] == "failed" for r in result)
    assert path.read_text() == "previous publication"


def test_update_mutation_requires_local_origin():
    client = TestClient(app)
    result = client.post(
        "/api/updates", json={}, headers={"origin": "https://untrusted.example"}
    )
    assert result.status_code == 403


def test_latest_annual_is_separate_from_frozen_forecasts():
    import hashlib
    client = TestClient(app)
    before = hashlib.sha256((DATA / 'processed/observations.parquet').read_bytes()).hexdigest()
    coverage = client.get('/api/data/coverage').json()
    assert coverage['latest_year'] == 2025
    assert coverage['annual_records'] == 660
    assert coverage['annual_nonmissing'] == 592
    result = client.get('/api/countries?year=2025').json()
    assert len(result['countries']) == 177
    assert any(c['indicators'].get('SP.POP.TOTL', {}).get('value') for c in result['countries'])
    assert client.get('/api/countries?year=2050').status_code == 422
    report = json.loads((DATA / 'models/evaluation.json').read_text())
    assert before == report['dataset_sha256']


def test_partial_download_does_not_replace_raw_or_published_feeds(monkeypatch, tmp_path):
    real_data = DATA
    monkeypatch.setattr(updates, 'DATA', tmp_path)
    (tmp_path / 'raw').mkdir()
    (tmp_path / 'processed').mkdir()
    for name in ['events-fed.xml', 'events-ecb.xml']:
        (tmp_path / 'raw' / name).write_bytes(b'previous raw')
    (tmp_path / 'processed/events.json').write_bytes(b'previous cache')
    def download(url):
        if url == updates.FEEDS['fed'][1]:
            return (real_data / 'raw/events-fed.xml').read_bytes()
        raise OSError('source unavailable')
    monkeypatch.setattr(updates, 'download', download)
    result = updates.refresh()
    assert next(r for r in result if r['source']=='fed')['status']=='retained_previous_cache'
    assert (tmp_path / 'raw/events-fed.xml').read_bytes()==b'previous raw'
    assert (tmp_path / 'processed/events.json').read_bytes()==b'previous cache'


def test_network_api_errors_and_results():
    client = TestClient(app)
    assert client.get('/api/network/country/NOPE').status_code == 422
    assert client.get('/api/network/country/JPN?year=2025').status_code == 422
    assert client.post('/api/network/scenario', json={'country':'SAU','sector':'Energy','shock':1,'year':2022}).status_code == 422
    response = client.post('/api/network/scenario', json={'country':'SAU','sector':'Energy','shock':0.1,'year':2022})
    assert response.status_code == 200
    assert len(response.json()['nodes']) == 405
    assert response.json()['residual'] < 1e-10
