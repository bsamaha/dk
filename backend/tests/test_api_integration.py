from unittest.mock import patch

import pytest
from app.main import create_app
from fastapi.testclient import TestClient

# Mock settings to allow testserver host
test_allowed_hosts = ["localhost", "127.0.0.1", "testserver"]

with patch("app.core.config.settings.ALLOWED_HOSTS", test_allowed_hosts):
    app = create_app()

client = TestClient(app)


def test_health_endpoint():
    """Test the health check endpoint."""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy"}


def test_metadata_endpoint():
    """Test the metadata endpoint."""
    response = client.get("/api/metadata/")
    assert response.status_code == 200
    data = response.json()
    assert "total_players" in data
    assert "total_drafts" in data
    assert "total_teams" in data
    assert "all_players" in data
    assert isinstance(data["all_players"], list)


def test_players_endpoint():
    """Test the players endpoint with default parameters."""
    response = client.get("/api/players/")
    assert response.status_code == 200
    data = response.json()
    assert "players" in data
    assert "total_count" in data
    assert "page_info" in data
    assert isinstance(data["players"], list)


@pytest.mark.parametrize("position", ["QB", "RB", "WR", "TE"])
def test_players_endpoint_with_filters(position):
    """Test the players endpoint with position filter for multiple positions."""
    response = client.get(f"/api/players/?positions={position}&limit=10")
    assert response.status_code == 200
    data = response.json()
    assert "players" in data
    assert len(data["players"]) <= 10
    # Check that all returned players have the correct position
    for player in data["players"]:
        assert player["position"] == position


def test_players_search():
    """Test the player search endpoint."""
    response = client.get("/api/players/search?q=Josh&limit=5")
    assert response.status_code == 200
    data = response.json()
    assert "players" in data
    assert len(data["players"]) <= 5


def test_players_search_missing_q():
    """Test the player search endpoint with missing 'q' parameter."""
    response = client.get("/api/players/search?limit=5")
    assert response.status_code == 422 or response.status_code == 400


def test_players_search_empty_q():
    """Test the player search endpoint with empty 'q' parameter."""
    response = client.get("/api/players/search?q=&limit=5")
    assert response.status_code == 422 or response.status_code == 400


def test_player_details():
    """Test the player details endpoint."""
    # First get a player from the list
    players_response = client.get("/api/players/?limit=1")
    assert players_response.status_code == 200
    players = players_response.json()["players"]

    if players:
        player = players[0]
        response = client.get(
            f"/api/players/details?player_name={player['name']}&position={player['position']}&team={player['team']}"
        )
        assert response.status_code == 200
        data = response.json()
        assert "player_name" in data
        assert "avg_pick" in data


def test_position_stats():
    """Test the position stats endpoint."""
    response = client.get("/api/positions/stats")
    assert response.status_code == 200
    data = response.json()
    assert "position_stats" in data
    assert "total_picks" in data
    assert isinstance(data["position_stats"], list)


def test_first_player_stats():
    """Test the first player stats endpoint."""
    response = client.get("/api/positions/stats/first_player")
    assert response.status_code == 200
    data = response.json()
    assert "first_player_stats" in data


def test_position_by_round():
    """Test position draft counts by round."""
    response = client.get("/api/positions/stats/QB/by_round")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)


def test_position_by_round_invalid_position():
    """Test position draft counts by round with invalid position."""
    response = client.get("/api/positions/stats/INVALIDPOS/by_round")
    assert response.status_code == 422
    data = response.json()
    assert "detail" in data


def test_roster_construction():
    """Test roster construction endpoint."""
    response = client.get("/api/positions/roster-construction")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)


def test_player_combinations():
    """Test player combinations endpoint."""
    response = client.get(
        "/api/combinations/?required_players=Josh Allen&required_players=Stefon Diggs"
    )
    assert response.status_code == 200
    data = response.json()
    assert "combinations" in data
    assert "required_players" in data


def test_player_combinations_missing_required_players():
    """Test player combinations endpoint with missing required_players parameter."""
    response = client.get("/api/combinations/")
    # Adjust the expected status code if your API returns something other than 422
    assert response.status_code in (400, 422)
    data = response.json()
    # Adjust the key/message check below to match your API's error response format
    assert "detail" in data


def test_analytics_heat_map():
    """Test analytics heat map endpoint."""
    response = client.get("/api/analytics/heat-map")
    assert response.status_code == 200
    data = response.json()
    assert "heat_map" in data


def test_analytics_stacks():
    """Test analytics stacks endpoint."""
    response = client.get("/api/analytics/stacks?n_rounds=5&limit=10")
    assert response.status_code == 200
    data = response.json()
    assert "stacks" in data


def test_analytics_draft_slot():
    """Test analytics draft slot correlation endpoint."""
    response = client.get("/api/analytics/draft-slot?slot=1&metric=percent&top_n=10")
    assert response.status_code == 200
    data = response.json()
    assert "slot" in data
    assert "metric" in data
    assert "rows" in data


def test_analytics_drift():
    """Test analytics ADP drift endpoint."""
    response = client.get("/api/analytics/drift")
    assert response.status_code == 200
    data = response.json()
    assert "adp_drift" in data


def test_analytics_drift_empty_db(monkeypatch):
    """Test analytics ADP drift endpoint with empty database."""

    # Patch the QueryService or relevant service to return empty data
    def mock_get_adp_drift(*args, **kwargs):
        return []

    monkeypatch.setattr(
        "app.services.query_service.QueryService.get_adp_drift", mock_get_adp_drift
    )

    response = client.get("/api/analytics/drift")
    assert response.status_code == 200
    data = response.json()
    assert "adp_drift" in data
    assert data["adp_drift"] == []


def test_error_handling():
    """Test error handling for invalid requests."""
    # Test invalid position
    response = client.get(
        "/api/players/details?player_name=NonExistent&position=QB&team=BUF"
    )
    assert response.status_code == 404

    # Test invalid draft slot
    response = client.get("/api/analytics/draft-slot?slot=15")  # Invalid slot number
    assert response.status_code == 422
