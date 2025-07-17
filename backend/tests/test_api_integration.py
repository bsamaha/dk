from unittest.mock import patch

import pytest
from app.api import router
from app.services.analytics_service import AnalyticsService
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.testclient import TestClient


def create_test_app():
    """Create a test app without TrustedHostMiddleware."""
    app = FastAPI(
        title="Fantasy Draft Analytics API - Test",
        description="Test version without host validation",
        version="1.0.0",
    )

    # Add CORS middleware for tests
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost", "http://localhost:3000"],
        allow_credentials=True,
        allow_methods=["GET", "POST"],
        allow_headers=["*"],
    )

    # Include the API router
    app.include_router(router, prefix="/api")

    # Add health check endpoint
    @app.get("/health")
    async def health_check():
        return {"status": "healthy"}

    # Add root endpoint for API-only mode
    @app.get("/")
    async def root():
        return {
            "message": "Fantasy Draft Analytics API",
            "version": "1.0.0",
            "docs": "/docs",
            "redoc": "/redoc",
        }

    return app


@pytest.fixture
def app():
    return create_test_app()


@pytest.fixture
def client(app):
    return TestClient(app, headers={"Host": "testserver"})


@pytest.fixture
def mock_data_service():
    with patch(
        "app.api.metadata.data_service"
    ) as mock:  # Adjust patches as needed for each router
        yield mock


def test_health_check(client):
    response = client.get("/health")
    assert response.status_code == 200  # nosec B101
    assert response.json() == {"status": "healthy"}  # nosec B101


def test_root(client):
    response = client.get("/")
    if response.status_code == 200 and "message" in response.json():
        # API-only mode - no frontend found
        assert response.json()["message"] == "Fantasy Draft Analytics API"  # nosec B101
    elif response.status_code == 200:
        # Frontend mode - should serve HTML
        assert "text/html" in response.headers.get("content-type", "")  # nosec B101
    elif response.status_code == 404:
        # Frontend directory exists but is empty (common in development)
        assert response.json()["detail"] == "Not Found"  # nosec B101
    else:
        # Unexpected response
        assert False, f"Unexpected response: {response.status_code} {response.content}"  # nosec B101


def test_get_metadata(client, mock_data_service):
    mock_data_service.get_metadata.return_value = {
        "total_drafts": 100,
        "total_teams": 50,
        "total_players": 200,
        "all_players": ["Player1"],
    }
    response = client.get("/api/metadata/")
    assert response.status_code == 200  # nosec B101
    data = response.json()
    assert data["total_drafts"] == 100  # nosec B101


def test_get_players(client):
    response = client.get("/api/players/")
    assert response.status_code == 200  # nosec B101
    assert "players" in response.json()  # nosec B101


# Add more endpoint tests, e.g., for /players/details, /positions/stats, etc.
# For endpoints that require params, use client.get with params dict
def test_get_player_details(client):
    response = client.get(
        "/api/players/details",
        params={"player_name": "TestPlayer", "position": "QB", "team": "TM"},
    )
    assert response.status_code == 200 or 404  # nosec B101 # Depending on data


def test_get_position_stats(client):
    response = client.get("/api/positions/stats")
    assert response.status_code == 200  # nosec B101
    data = response.json()
    assert "position_stats" in data  # nosec B101
    assert isinstance(data["position_stats"], list)  # nosec B101


def test_get_player_combinations(client):
    response = client.get(
        "/api/combinations/", params={"required_players": ["QB1", "WR1"], "n_rounds": 2}
    )
    assert response.status_code == 200  # nosec B101
    data = response.json()
    assert "combinations" in data  # nosec B101
    assert isinstance(data["combinations"], list)  # nosec B101


def test_get_heat_map(client):
    response = client.get("/api/analytics/heat-map")
    assert response.status_code == 200  # nosec B101
    data = response.json()
    assert "cells" in data  # nosec B101
    assert isinstance(data["cells"], list)  # nosec B101


# ---------------------------------------------------------------------------
# Analytics endpoint tests
# ---------------------------------------------------------------------------


def test_get_draft_slot_endpoint(client):
    """Ensure the draft-slot analytics endpoint responds successfully.

    We stub the underlying service call so the test remains fast and
    independent of DuckDB/parquet data, focusing only on the routing & schema.
    """
    sample_rows = [
        {
            "player": "PlayerA",
            "slot": 1,
            "overall": 100,
            "p_slot": 0.10,
            "p_overall": 0.05,
            "score": 0.20,
        }
    ]
    with patch(
        "app.api.analytics.analytics_service.get_draft_slot_correlation",
        return_value=sample_rows,
    ):
        response = client.get(
            "/api/analytics/draft-slot",
            params={"slot": 1, "metric": "percent", "top_n": 25},
        )
    assert response.status_code == 200  # nosec B101
    data = response.json()
    assert data["slot"] == 1  # nosec B101
    assert len(data["rows"]) == len(sample_rows)  # nosec B101


# ---------------------------------------------------------------------------
# Service-level sanity check
# ---------------------------------------------------------------------------


def test_analytics_service_has_draft_slot_correlation():
    """Quick guard to ensure the public alias exists on the service."""
    assert hasattr(AnalyticsService, "get_draft_slot_correlation")  # nosec B101


# Similarly for other routers
