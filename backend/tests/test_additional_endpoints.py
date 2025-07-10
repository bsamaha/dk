"""Additional integration tests for metadata and positions endpoints."""

from starlette.testclient import TestClient

from backend.app.main import app

client = TestClient(app)


def test_metadata_endpoint():
    resp = client.get("/api/metadata")
    assert resp.status_code == 200
    data = resp.json()
    assert {
        "total_players",
        "total_drafts",
        "total_teams",
        "all_players",
    }.issubset(data.keys())


def test_position_stats_endpoint():
    resp = client.get("/api/positions/stats")
    assert resp.status_code == 200
    payload = resp.json()
    assert "position_stats" in payload and "total_picks" in payload
    assert len(payload["position_stats"]) > 0
