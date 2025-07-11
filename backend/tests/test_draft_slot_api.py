"""Integration test for /api/analytics/draft-slot endpoint."""

from starlette.testclient import TestClient

from backend.app.main import app

client = TestClient(app)


def test_draft_slot_endpoint_basic():
    resp = client.get("/api/analytics/draft-slot", params={"slot": 1, "metric": "percent", "top_n": 15})
    assert resp.status_code == 200
    payload = resp.json()
    assert payload["slot"] == 1
    assert payload["metric"] == "percent"
    rows = payload["rows"]
    assert isinstance(rows, list)
    assert len(rows) <= 15
    if rows:
        sample = rows[0]
        assert {"player", "slot", "overall", "p_slot", "p_overall", "score"}.issubset(sample.keys())


def test_draft_slot_invalid_metric():
    resp = client.get("/api/analytics/draft-slot", params={"slot": 1, "metric": "foo"})
    # FastAPI validation should yield 422
    assert resp.status_code == 422
