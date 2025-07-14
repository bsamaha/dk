from unittest.mock import patch

import polars as pl
import pytest
from app.services.analytics_service import AnalyticsService


@pytest.fixture
def mock_duckdb_service():
    with patch("app.services.analytics_service.duckdb_service") as mock:
        yield mock


@pytest.fixture
def mock_data_service():
    with patch("app.services.analytics_service.data_service") as mock:
        yield mock


def test_get_players(mock_duckdb_service, mock_data_service):
    df_total_drafts = pl.DataFrame({"n": [100]})
    df_total_count = pl.DataFrame({"cnt": [1]})
    df_players = pl.DataFrame(
        [
            {
                "player": "Test",
                "Position": "QB",
                "Team": "TM",
                "avg_pick": 10.0,
                "min_pick": 5,
                "max_pick": 15,
                "draft_percentage": 50.0,
            }
        ]
    )
    mock_duckdb_service.query.side_effect = [
        df_total_drafts,
        df_total_count,
        df_players,
    ]
    players, total = AnalyticsService.get_players(limit=1)
    assert total == 1  # nosec B101
    assert len(players) == 1  # nosec B101
    assert players[0].name == "Test"  # nosec B101


# Add tests for fallback logic
def test_get_players_fallback(mock_duckdb_service, mock_data_service):
    mock_duckdb_service.query.side_effect = lambda sql: (
        pl.DataFrame({"n": [100]})
        if "COUNT(DISTINCT draft)" in sql
        else pl.DataFrame({"cnt": [0]})
        if "COUNT(*)" in sql
        else pl.DataFrame()
    )
    with patch(
        "time.perf_counter", side_effect=[0, 0.06, 0.061, 0.07]
    ):  # dur_duck=0.06, dur_pol=0.009 < 0.048
        mock_data_service.get_players.return_value = ([], 0)
        players, total = AnalyticsService.get_players()
    mock_data_service.get_players.assert_called()


# Similarly for other methods like get_player_combinations, get_draft_slot_correlation, etc.
