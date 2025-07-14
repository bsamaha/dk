from unittest.mock import patch

import polars as pl
import pytest
from app.models.schemas import AggregationType, Position
from app.services.data_service import DataService


@pytest.fixture
def sample_data():
    return {
        "player": ["QB1", "RB1", "WR1", "QB1", "RB2", "WR1"],
        "Position": ["QB", "RB", "WR", "QB", "RB", "WR"],
        "Team": ["TeamA", "TeamB", "TeamC", "TeamA", "TeamB", "TeamC"],
        "pick": [1, 2, 3, 4, 5, 6],
        "round": [1, 1, 1, 2, 2, 2],
        "draft": ["draft1", "draft1", "draft1", "draft2", "draft2", "draft2"],
        "team_id": ["team1", "team1", "team1", "team2", "team2", "team2"],
        "draft_position": [1, 2, 3, 1, 2, 3],
    }


@pytest.fixture
def sample_df(sample_data):
    return pl.DataFrame(sample_data)


@patch("app.services.data_service.pl.scan_parquet")
def test_data_service_init(mock_scan_parquet, sample_df):
    mock_scan_parquet.return_value = sample_df.lazy().with_columns(
        pl.col("pick").cast(pl.Int16)  # Simulate the cast
    )
    service = DataService()
    assert service._df.shape == sample_df.shape  # nosec B101
    assert service._metadata["total_drafts"] == 2  # nosec B101
    assert service._metadata["total_teams"] == 2  # nosec B101
    assert service._metadata["total_players"] == 4  # nosec B101 # QB1, RB1, WR1, RB2


@patch("app.services.data_service.pl.scan_parquet")
@pytest.mark.parametrize(
    "positions, search_term, expected_count",
    [
        (None, None, 4),  # All unique players
        ([Position.QB], None, 1),
        (None, "QB", 1),
    ],
)
def test_get_players(
    mock_scan_parquet, sample_df, positions, search_term, expected_count
):
    mock_scan_parquet.return_value = sample_df.lazy()
    service = DataService()
    players, total = service.get_players(
        positions=positions, search_term=search_term, limit=100, offset=0
    )
    assert total == expected_count  # nosec B101
    assert len(players) == min(expected_count, 100)  # nosec B101


# Add more tests for other methods...


@patch("app.services.data_service.pl.scan_parquet")
def test_get_player_details(mock_scan_parquet, sample_df):
    mock_scan_parquet.return_value = sample_df.lazy()
    service = DataService()
    details = service.get_player_details("QB1", "QB", "TeamA")
    assert details["avg_pick"] == 2.5  # nosec B101 # (1+4)/2
    assert details["total_drafts"] == 2  # nosec B101


@patch("app.services.data_service.pl.scan_parquet")
def test_get_position_stats(mock_scan_parquet, sample_df):
    mock_scan_parquet.return_value = sample_df.lazy()
    service = DataService()
    stats = service.get_position_stats()
    qb_stats = next(s for s in stats if s.position == "QB")
    assert qb_stats.median_draft_count == 1.0  # nosec B101 # 1 QB per draft


# Similarly for other methods


@patch("app.services.data_service.pl.scan_parquet")
def test_get_first_player_draft_stats(mock_scan_parquet, sample_df):
    mock_scan_parquet.return_value = sample_df.lazy()
    service = DataService()
    stats = service.get_first_player_draft_stats()
    qb_stats = next(s for s in stats if s["Position"] == "QB")
    assert qb_stats["avg_first_pick"] == 2.5  # nosec B101
    assert qb_stats["min_first_pick"] == 1  # nosec B101
    assert qb_stats["max_first_pick"] == 4  # nosec B101


@patch("app.services.data_service.pl.scan_parquet")
def test_get_position_draft_counts_by_round(mock_scan_parquet, sample_df):
    mock_scan_parquet.return_value = sample_df.lazy()
    service = DataService()
    counts = service.get_position_draft_counts_by_round(
        Position.QB, AggregationType.MEAN
    )
    assert len(counts) == 2  # nosec B101
    assert counts[0].round == 1  # nosec B101
    assert counts[0].count == 0.5  # nosec B101
    assert counts[1].round == 2  # nosec B101
    assert counts[1].count == 0.5  # nosec B101


# Add similar for other methods


@patch("app.services.data_service.pl.scan_parquet")
def test_get_player_combinations(mock_scan_parquet, sample_df):
    mock_scan_parquet.return_value = sample_df.lazy()
    service = DataService()
    combos = service.get_player_combinations(
        required_players=["QB1", "WR1"], n_rounds=2, limit=10
    )
    assert len(combos) > 0  # nosec B101 # Based on sample, teams with both


@patch("app.services.data_service.pl.scan_parquet")
def test_get_roster_construction(mock_scan_parquet, sample_df):
    mock_scan_parquet.return_value = sample_df.lazy()
    service = DataService()
    rosters = service.get_roster_construction()
    assert len(rosters) > 0  # nosec B101
    # Assert specific counts based on sample


# Add edge case tests
@patch("app.services.data_service.pl.scan_parquet")
def test_get_players_empty(mock_scan_parquet):
    schema = {
        "player": pl.String,
        "Position": pl.String,
        "Team": pl.String,
        "pick": pl.Int8,
        "round": pl.Int8,
        "draft": pl.String,
        "team_id": pl.String,
        "draft_position": pl.Int8,
    }
    mock_scan_parquet.return_value = pl.LazyFrame(schema=schema)
    service = DataService()
    players, total = service.get_players()
    assert total == 0  # nosec B101
    assert len(players) == 0  # nosec B101
