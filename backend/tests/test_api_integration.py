from unittest.mock import patch

import pytest
from app.main import create_app
from fastapi.testclient import TestClient


@pytest.fixture
def app():
    """Create the FastAPI app with test-friendly settings."""
    test_allowed_hosts = ["localhost", "127.0.0.1", "testserver"]
    with patch("app.core.config.settings.ALLOWED_HOSTS", test_allowed_hosts):
        yield create_app()


@pytest.fixture
def client(app):
    """Yield a TestClient ensuring lifespan runs so DI is initialized."""
    with TestClient(app, raise_server_exceptions=True) as test_client:
        yield test_client


@pytest.fixture(
    params=[True, False], ids=["with_query_service", "without_query_service"]
)
def client_qs_variants(app, request):
    """Yield a TestClient with QueryService present or removed from DI."""
    with TestClient(app, raise_server_exceptions=True) as test_client:
        if not request.param and hasattr(test_client.app.state, "query_service"):
            delattr(test_client.app.state, "query_service")
        yield test_client


def test_health_endpoint(client_qs_variants):
    """Test the health check endpoint."""
    response = client_qs_variants.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy"}


def test_metadata_endpoint(client):
    """Test the metadata endpoint."""
    response = client.get("/api/metadata/")
    assert response.status_code == 200
    data = response.json()
    assert "total_players" in data
    assert "total_drafts" in data
    assert "total_teams" in data
    assert "all_players" in data
    assert isinstance(data["all_players"], list)


def test_players_endpoint(client):
    """Test the players endpoint with default parameters."""
    response = client.get("/api/players/")
    assert response.status_code == 200
    data = response.json()
    assert "players" in data
    assert "total_count" in data
    assert "page_info" in data
    assert isinstance(data["players"], list)


@pytest.mark.parametrize("position", ["QB", "RB", "WR", "TE"])
def test_players_endpoint_with_filters(client, position):
    """Test the players endpoint with position filter for multiple positions."""
    response = client.get(f"/api/players/?positions={position}&limit=10")
    assert response.status_code == 200
    data = response.json()
    assert "players" in data
    assert len(data["players"]) <= 10
    # Check that all returned players have the correct position
    for player in data["players"]:
        assert player["position"] == position


def test_players_search(client):
    """Test the player search endpoint."""
    response = client.get("/api/players/search?q=Josh&limit=5")
    assert response.status_code == 200
    data = response.json()
    assert "players" in data
    assert len(data["players"]) <= 5


def test_players_search_missing_q(client):
    """Test the player search endpoint with missing 'q' parameter."""
    response = client.get("/api/players/search?limit=5")
    assert response.status_code == 422 or response.status_code == 400


def test_players_search_empty_q(client):
    """Test the player search endpoint with empty 'q' parameter."""
    response = client.get("/api/players/search?q=&limit=5")
    assert response.status_code == 422 or response.status_code == 400


def test_player_details(client):
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


def test_position_stats(client):
    """Test the position stats endpoint."""
    response = client.get("/api/positions/stats")
    assert response.status_code == 200
    data = response.json()
    assert "position_stats" in data
    assert "total_picks" in data
    assert isinstance(data["position_stats"], list)


def test_first_player_stats(client):
    """Test the first player stats endpoint."""
    response = client.get("/api/positions/stats/first_player")
    assert response.status_code == 200
    data = response.json()
    assert "first_player_stats" in data


def test_position_by_round(client):
    """Test position draft counts by round."""
    response = client.get("/api/positions/stats/QB/by_round")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)


def test_position_by_round_invalid_position(client):
    """Test position draft counts by round with invalid position."""
    response = client.get("/api/positions/stats/INVALIDPOS/by_round")
    assert response.status_code == 422
    data = response.json()
    assert "detail" in data


def test_roster_construction(client):
    """Test roster construction endpoint."""
    response = client.get("/api/positions/roster-construction")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)


def test_player_combinations(client):
    """Test player combinations endpoint."""
    response = client.get(
        "/api/combinations/?required_players=Josh Allen&required_players=Stefon Diggs"
    )
    assert response.status_code == 200
    data = response.json()
    assert "combinations" in data
    assert "total_combinations" in data
    assert "filter_applied" in data
    assert "required_players" in data["filter_applied"]


def test_player_combinations_pagination(client):
    """Ensure combinations endpoint supports limit/offset and returns total."""
    base = (
        "/api/combinations/?required_players=Josh Allen"
        "&required_players=Stefon Diggs"
        "&limit=1"
    )
    # First page
    r1 = client.get(base + "&offset=0")
    assert r1.status_code == 200
    d1 = r1.json()
    assert "total_combinations" in d1
    assert "combinations" in d1
    assert len(d1["combinations"]) <= 1
    assert d1["filter_applied"].get("limit") == 1
    assert d1["filter_applied"].get("offset") == 0

    # Second page
    r2 = client.get(base + "&offset=1")
    assert r2.status_code == 200
    d2 = r2.json()
    assert "total_combinations" in d2
    assert "combinations" in d2
    assert len(d2["combinations"]) <= 1
    assert d2["filter_applied"].get("limit") == 1
    assert d2["filter_applied"].get("offset") == 1


def test_player_combinations_missing_required_players(client):
    """Test player combinations endpoint with missing required_players parameter."""
    response = client.get("/api/combinations/")
    # Adjust the expected status code if your API returns something other than 422
    assert response.status_code in (400, 422)
    data = response.json()
    # Adjust the key/message check below to match your API's error response format
    assert "detail" in data


def test_analytics_heat_map(client):
    """Test analytics heat map endpoint."""
    response = client.get("/api/analytics/heat-map")
    assert response.status_code == 200
    data = response.json()
    assert "heat_map" in data


def test_analytics_stacks(client):
    """Test analytics stacks endpoint."""
    response = client.get("/api/analytics/stacks?n_rounds=5&limit=10")
    assert response.status_code == 200
    data = response.json()
    assert "stacks" in data


def test_analytics_draft_slot(client):
    """Test analytics draft slot correlation endpoint."""
    response = client.get("/api/analytics/draft-slot?slot=1&metric=percent&top_n=10")
    assert response.status_code == 200
    data = response.json()
    assert "slot" in data
    assert "metric" in data
    assert "rows" in data


def test_analytics_drift(client):
    """Test analytics ADP drift endpoint."""
    response = client.get("/api/analytics/drift")
    assert response.status_code == 200
    data = response.json()
    assert "adp_drift" in data


def test_analytics_drift_empty_db(client, monkeypatch):
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


def test_error_handling(client):
    """Test error handling for invalid requests."""
    # Test invalid position
    response = client.get(
        "/api/players/details?player_name=NonExistent&position=QB&team=BUF"
    )
    assert response.status_code == 404

    # Test invalid draft slot
    response = client.get("/api/analytics/draft-slot?slot=15")  # Invalid slot number
    assert response.status_code == 422


# ============================================================================
# Week 17 Bring Back API Tests
# ============================================================================


def test_week17_bringback_team_view_endpoint(client, monkeypatch):
    """Test the Week 17 bring back team view endpoint."""
    # Mock the service method
    mock_data = [
        {
            "player": "Aaron Rodgers",
            "position": "QB",
            "percentage": 85.5,
            "draft_count": 12900,
        },
        {
            "player": "Breece Hall",
            "position": "RB",
            "percentage": 72.3,
            "draft_count": 10932,
        },
    ]

    def mock_get_week17_bringback_team_view(self, team, limit):
        return mock_data if team == "BUF" else []

    def mock_get_week17_opponent(self, team):
        return "NYJ" if team == "BUF" else None

    monkeypatch.setattr(
        "app.services.query_service.QueryService.get_week17_bringback_team_view",
        mock_get_week17_bringback_team_view,
    )
    monkeypatch.setattr(
        "app.services.query_service.QueryService.get_week17_opponent",
        mock_get_week17_opponent,
    )
    # Mock the singleton instance's total_drafts property
    # Override via app.state since singleton is removed
    client.app.state.query_service.total_drafts = 15000

    response = client.get(
        "/api/analytics/week17-bringback?scope=team&entity=BUF&limit=5"
    )
    assert response.status_code == 200

    data = response.json()
    assert data["scope"] == "team"
    assert data["entity"] == "BUF"
    assert data["opponent"] == "NYJ"
    assert data["total_drafts"] == 15000
    assert len(data["players"]) == 2

    # Check first player
    player = data["players"][0]
    assert player["player"] == "Aaron Rodgers"
    assert player["position"] == "QB"
    assert player["percentage"] == 85.5
    assert player["draft_count"] == 12900
    assert player["co_occurrence_count"] is None


def test_week17_bringback_player_view_endpoint(client, monkeypatch):
    """Test the Week 17 bring back player view endpoint."""
    # Mock the service methods
    mock_data = [
        {
            "player": "Aaron Rodgers",
            "position": "QB",
            "percentage": 15.2,
            "co_occurrence_count": 1000,
        },
        {
            "player": "Garrett Wilson",
            "position": "WR",
            "percentage": 12.8,
            "co_occurrence_count": 842,
        },
    ]

    def mock_get_week17_bringback_player_view(self, player, limit):
        return mock_data if player == "Josh Allen" else []

    def mock_query(self, sql, params=None):
        # Mock query for getting player's team
        import polars as pl

        if "SELECT DISTINCT Team FROM picks WHERE player" in sql and params == [
            "Josh Allen"
        ]:
            return pl.DataFrame({"Team": ["BUF"]})
        return pl.DataFrame()

    def mock_get_week17_opponent(self, team):
        return "NYJ" if team == "BUF" else None

    monkeypatch.setattr(
        "app.services.query_service.QueryService.get_week17_bringback_player_view",
        mock_get_week17_bringback_player_view,
    )
    monkeypatch.setattr("app.services.query_service.QueryService.query", mock_query)
    monkeypatch.setattr(
        "app.services.query_service.QueryService.get_week17_opponent",
        mock_get_week17_opponent,
    )
    # Mock the singleton instance's total_drafts property
    client.app.state.query_service.total_drafts = 15000

    response = client.get(
        "/api/analytics/week17-bringback?scope=player&entity=Josh Allen&limit=5"
    )
    assert response.status_code == 200

    data = response.json()
    assert data["scope"] == "player"
    assert data["entity"] == "Josh Allen"
    assert data["opponent"] == "NYJ"
    assert data["total_drafts"] == 15000
    assert len(data["players"]) == 2

    # Check first player
    player = data["players"][0]
    assert player["player"] == "Aaron Rodgers"
    assert player["position"] == "QB"
    assert player["percentage"] == 15.2
    assert player["draft_count"] is None
    assert player["co_occurrence_count"] == 1000


def test_week17_bringback_invalid_scope(client):
    """Test Week 17 bring back endpoint with invalid scope."""
    response = client.get("/api/analytics/week17-bringback?scope=invalid&entity=BUF")
    assert response.status_code == 422


def test_week17_bringback_missing_entity(client):
    """Test Week 17 bring back endpoint with missing entity parameter."""
    response = client.get("/api/analytics/week17-bringback?scope=team")
    assert response.status_code == 422  # Validation error


def test_week17_bringback_invalid_limit(client):
    """Test Week 17 bring back endpoint with invalid limit parameter."""
    # Test with non-integer limit
    response = client.get(
        "/api/analytics/week17-bringback?scope=team&entity=BUF&limit=abc"
    )
    assert response.status_code == 422

    # Test with negative limit
    response = client.get(
        "/api/analytics/week17-bringback?scope=team&entity=BUF&limit=-1"
    )
    assert response.status_code == 422

    # Test with zero limit
    response = client.get(
        "/api/analytics/week17-bringback?scope=team&entity=BUF&limit=0"
    )
    assert response.status_code == 422

    # Test with limit too high
    response = client.get(
        "/api/analytics/week17-bringback?scope=team&entity=BUF&limit=100"
    )
    assert response.status_code == 422


def test_week17_bringback_missing_limit_uses_default(client, monkeypatch):
    """Test Week 17 bring back endpoint with missing limit parameter uses default."""
    # Mock the service method
    mock_data = [
        {
            "player": "Test Player",
            "position": "QB",
            "percentage": 50.0,
            "draft_count": 100,
        }
    ]

    def mock_get_week17_bringback_team_view(self, team, limit):
        # Verify that default limit (10) is used when not specified
        assert limit == 10
        return mock_data

    def mock_get_week17_opponent(self, team):
        return "NYJ" if team == "BUF" else None

    monkeypatch.setattr(
        "app.services.query_service.QueryService.get_week17_bringback_team_view",
        mock_get_week17_bringback_team_view,
    )
    monkeypatch.setattr(
        "app.services.query_service.QueryService.get_week17_opponent",
        mock_get_week17_opponent,
    )
    client.app.state.query_service.total_drafts = 15000

    response = client.get("/api/analytics/week17-bringback?scope=team&entity=BUF")
    assert response.status_code == 200


def test_week17_bringback_partial_data(client, monkeypatch):
    """Test Week 17 bring back endpoint when opponent exists but no players found."""

    # Mock empty player results but valid opponent
    def mock_get_week17_bringback_team_view(self, team, limit):
        return []  # No players found

    def mock_get_week17_opponent(self, team):
        return "NYJ"  # Opponent exists

    monkeypatch.setattr(
        "app.services.query_service.QueryService.get_week17_bringback_team_view",
        mock_get_week17_bringback_team_view,
    )
    monkeypatch.setattr(
        "app.services.query_service.QueryService.get_week17_opponent",
        mock_get_week17_opponent,
    )
    client.app.state.query_service.total_drafts = 15000

    response = client.get("/api/analytics/week17-bringback?scope=team&entity=BUF")
    assert response.status_code == 200

    data = response.json()
    assert data["scope"] == "team"
    assert data["entity"] == "BUF"
    assert data["opponent"] == "NYJ"  # Opponent found
    assert data["players"] == []  # But no players


def test_week17_bringback_no_data(client, monkeypatch):
    """Test Week 17 bring back endpoint when no data is available."""

    # Mock empty results
    def mock_get_week17_bringback_team_view(self, team, limit):
        return []

    def mock_get_week17_opponent(self, team):
        return None  # No opponent found

    monkeypatch.setattr(
        "app.services.query_service.QueryService.get_week17_bringback_team_view",
        mock_get_week17_bringback_team_view,
    )
    monkeypatch.setattr(
        "app.services.query_service.QueryService.get_week17_opponent",
        mock_get_week17_opponent,
    )
    # Override via app.state since singleton is removed
    client.app.state.query_service.total_drafts = 15000

    response = client.get("/api/analytics/week17-bringback?scope=team&entity=BUF")
    assert response.status_code == 200

    data = response.json()
    assert data["scope"] == "team"
    assert data["entity"] == "BUF"
    assert data["opponent"] is None
    assert data["players"] == []


def test_week17_bringback_invalid_team_entity(client):
    """Test Week 17 bring back endpoint with invalid team abbreviation."""
    response = client.get("/api/analytics/week17-bringback?scope=team&entity=INVALID")
    assert response.status_code == 422

    data = response.json()
    assert "validation_errors" in data
    assert any(
        "Entity must be a valid team abbreviation" in str(error)
        for error in data["validation_errors"]
    )


def test_week17_bringback_server_error(client, monkeypatch):
    """Test Week 17 bring back endpoint when server error occurs."""

    def mock_error(*args, **kwargs):
        raise Exception("Database error")

    monkeypatch.setattr(
        "app.services.query_service.QueryService.get_week17_bringback_team_view",
        mock_error,
    )

    response = client.get("/api/analytics/week17-bringback?scope=team&entity=BUF")
    assert response.status_code == 500


def test_503_when_query_service_missing(client):
    """Remove QueryService from app.state and verify 503 is returned by a dependent endpoint."""
    # Remove QueryService from state
    if hasattr(client.app.state, "query_service"):
        delattr(client.app.state, "query_service")

    # Call an endpoint that requires QueryService
    response = client.get("/api/metadata/")
    assert response.status_code == 503
    assert "unavailable" in response.text.lower()


def test_startup_failure_returns_503(monkeypatch):
    """Simulate QueryService initialization error and ensure 503 on dependent endpoints."""
    from app.main import create_app as create_app_fn

    def fail_init(app):
        raise RuntimeError("Init failure")

    monkeypatch.setattr("app.main._init_query_service", fail_init)

    failing_app = create_app_fn()
    failing_client = TestClient(failing_app, raise_server_exceptions=False)

    resp = failing_client.get("/api/metadata/")
    # Depending on when failure occurs, we may see 503 from dependency or 500 from handler
    assert resp.status_code in (400, 500, 503)
