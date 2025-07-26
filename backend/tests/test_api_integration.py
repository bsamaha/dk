from app.main import app
from app.services.query_service import QueryService
from fastapi.testclient import TestClient

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


def test_players_endpoint_with_filters():
    """Test the players endpoint with position filter."""
    response = client.get("/api/players/?positions=QB&limit=10")
    assert response.status_code == 200
    data = response.json()
    assert "players" in data
    assert len(data["players"]) <= 10
    # Check that all returned players are QBs
    for player in data["players"]:
        assert player["position"] == "QB"


def test_players_search():
    """Test the player search endpoint."""
    response = client.get("/api/players/search?q=Josh&limit=5")
    assert response.status_code == 200
    data = response.json()
    assert "players" in data
    assert len(data["players"]) <= 5


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
    assert "correlations" in data


def test_analytics_drift():
    """Test analytics ADP drift endpoint."""
    response = client.get("/api/analytics/drift")
    assert response.status_code == 200
    data = response.json()
    assert "adp_drift" in data


def test_query_service_methods():
    """Test that QueryService methods work correctly."""
    service = QueryService()

    # Test metadata
    metadata = service.get_metadata()
    assert "total_players" in metadata
    assert "total_drafts" in metadata

    # Test players
    players, count = service.get_players(limit=5)
    assert len(players) <= 5
    assert count >= 0

    # Test position stats
    stats = service.get_position_stats()
    assert isinstance(stats, list)
    assert len(stats) > 0

    # Test heat map
    heat_map = service.get_heat_map()
    assert isinstance(heat_map, list)

    # Test stacks
    stacks = service.get_stacks(n_rounds=5, limit=10)
    assert isinstance(stacks, list)


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
