import pytest
from fastapi.testclient import TestClient
from app.main import create_app  # Import the FastAPI app

from unittest.mock import patch

@pytest.fixture
def override_env(monkeypatch):
    monkeypatch.setenv("ALLOWED_ORIGINS", '["http://localhost", "http://localhost:3000"]')
    yield

@pytest.fixture
def no_static_mount():
    with patch('pathlib.Path.exists', return_value=False):
        yield

@pytest.fixture
def app(no_static_mount):
    return create_app()

@pytest.fixture
def client(app):
    return TestClient(app)

@pytest.fixture
def mock_data_service():
    with patch('app.api.metadata.data_service') as mock:  # Adjust patches as needed for each router
        yield mock

def test_health_check(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy"}

def test_root(client):
    response = client.get("/")
    if response.status_code == 200 and 'message' in response.json():
        assert response.json()['message'] == "Fantasy Draft Analytics API"
    else:
        assert response.status_code == 200  # HTML for frontend

def test_get_metadata(client, mock_data_service):
    mock_data_service.get_metadata.return_value = {"total_drafts": 100, "total_teams": 50, "total_players": 200, "all_players": ["Player1"]}
    response = client.get("/api/metadata/")
    assert response.status_code == 200
    data = response.json()
    assert data["total_drafts"] == 100

def test_get_players(client):
    response = client.get("/api/players/")
    assert response.status_code == 200
    assert "players" in response.json()

# Add more endpoint tests, e.g., for /players/details, /positions/stats, etc.
# For endpoints that require params, use client.get with params dict
def test_get_player_details(client):
    response = client.get("/api/players/details", params={"player_name": "TestPlayer", "position": "QB", "team": "TM"})
    assert response.status_code == 200 or 404  # Depending on data

def test_get_position_stats(client):
    response = client.get("/api/positions/stats")
    assert response.status_code == 200
    data = response.json()
    assert "position_stats" in data
    assert isinstance(data["position_stats"], list)

def test_get_player_combinations(client):
    response = client.get("/api/combinations/", params={"required_players": ["QB1", "WR1"], "n_rounds": 2})
    assert response.status_code == 200
    data = response.json()
    assert "combinations" in data
    assert isinstance(data["combinations"], list)

def test_get_heat_map(client):
    response = client.get("/api/analytics/heat-map")
    assert response.status_code == 200
    data = response.json()
    assert 'cells' in data
    assert isinstance(data['cells'], list)

# Similarly for other routers 