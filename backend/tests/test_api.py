"""Basic integration tests for API endpoints.

These tests use FastAPI's TestClient to spin up the app in-memory and hit a
few critical endpoints to ensure the DuckDB integration remains stable.
"""

from typing import List

import pytest
from starlette.testclient import TestClient

from backend.app.main import app

client = TestClient(app)


@pytest.fixture(scope="module")
def default_players() -> List[dict]:
    """Fetch a default players page once per module for re-use."""
    response = client.get("/api/players/?limit=30")
    assert response.status_code == 200
    payload = response.json()
    return payload["players"]


def test_players_endpoint_works():
    """`/api/players/` should return at least one player and consistent counts."""
    resp = client.get("/api/players/?limit=50")
    assert resp.status_code == 200
    data = resp.json()
    assert "players" in data and "total_count" in data
    players = data["players"]
    total_count = data["total_count"]
    assert len(players) > 0
    assert total_count >= len(players)


def test_search_players_case_insensitive():
    """Searching by a lowercase substring should return matches."""
    resp = client.get("/api/players/", params={"search_term": "brown", "limit": 50})
    assert resp.status_code == 200
    payload = resp.json()
    assert payload["total_count"] > 0
    # All returned players should contain the substring (case-insensitive)
    assert all("brown" in p["name"].lower() for p in payload["players"])


def test_filter_by_position():
    """Filtering by a single position returns only that position."""
    resp = client.get("/api/players/", params={"positions": "WR", "limit": 30})
    assert resp.status_code == 200
    payload = resp.json()
    assert len(payload["players"]) > 0
    assert all(p["position"] == "WR" for p in payload["players"])


def test_combinations_endpoint_basic():
    """Ensure combinations endpoint returns 200 for two popular players."""
    resp = client.get(
        "/api/combinations/",
        params={
            "required_players": [
                "A.J. Brown",
                "Jalen Hurts",
            ],
            "n_rounds": 6,
            "limit": 20,
        },
    )
    # Even if zero combos exist, service should succeed with 200
    assert resp.status_code == 200
    payload = resp.json()
    assert "combinations" in payload


def test_roster_construction_endpoint():
    resp = client.get("/api/combinations/roster-construction/")
    assert resp.status_code == 200
    payload = resp.json()
    assert "roster_constructions" in payload
    # Each entry should have expected keys
    sample = payload["roster_constructions"][0]
    assert {"draft_id", "team_id", "position_counts"}.issubset(sample.keys())
