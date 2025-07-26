"""Tests for the unified QueryService."""

from unittest.mock import patch

import pytest
from app.models.schemas import AggregationType, Position, SortableColumn, SortOrder
from app.services.query_service import QueryService


@pytest.fixture
def query_service():
    """Create a QueryService instance for testing."""
    return QueryService()


def test_query_service_initialization(query_service):
    """Test that QueryService initializes correctly."""
    assert query_service._con is not None
    # Test that the picks view was created
    result = query_service.query("SELECT COUNT(*) as count FROM picks LIMIT 1")
    assert not result.is_empty()


def test_get_metadata(query_service):
    """Test metadata retrieval."""
    metadata = query_service.get_metadata()
    assert "total_players" in metadata
    assert "total_drafts" in metadata
    assert "total_teams" in metadata
    assert "all_players" in metadata
    assert isinstance(metadata["all_players"], list)
    assert metadata["total_players"] > 0
    assert metadata["total_drafts"] > 0


def test_get_players_basic(query_service):
    """Test basic player retrieval."""
    players, total_count = query_service.get_players(limit=10)
    assert len(players) <= 10
    assert total_count >= len(players)
    assert all(hasattr(p, "name") for p in players)
    assert all(hasattr(p, "position") for p in players)


def test_get_players_with_position_filter(query_service):
    """Test player retrieval with position filter."""
    players, total_count = query_service.get_players(positions=[Position.QB], limit=5)
    assert len(players) <= 5
    assert all(p.position == Position.QB for p in players)


def test_get_players_with_search(query_service):
    """Test player retrieval with search term."""
    players, total_count = query_service.get_players(search_term="Josh", limit=5)
    assert len(players) <= 5
    # All returned players should have "Josh" in their name (case insensitive)
    for player in players:
        assert "josh" in player.name.lower()


def test_get_players_sorting(query_service):
    """Test player retrieval with different sorting options."""
    players_asc, _ = query_service.get_players(
        limit=5, sort_by=SortableColumn.AVG_PICK, sort_order=SortOrder.ASC
    )
    players_desc, _ = query_service.get_players(
        limit=5, sort_by=SortableColumn.AVG_PICK, sort_order=SortOrder.DESC
    )

    assert len(players_asc) > 0
    assert len(players_desc) > 0

    # Check that sorting actually works
    if len(players_asc) > 1:
        assert players_asc[0].avg_pick <= players_asc[1].avg_pick
    if len(players_desc) > 1:
        assert players_desc[0].avg_pick >= players_desc[1].avg_pick


def test_get_player_details(query_service):
    """Test detailed player information retrieval."""
    # First get a player
    players, _ = query_service.get_players(limit=1)
    assert len(players) > 0

    player = players[0]
    details = query_service.get_player_details(
        player.name, player.position, player.team
    )

    assert "player_name" in details
    assert "avg_pick" in details
    assert "total_drafts" in details
    assert details["player_name"] == player.name


def test_get_player_details_nonexistent(query_service):
    """Test player details for non-existent player."""
    details = query_service.get_player_details("NonExistentPlayer", "QB", "XXX")
    # DuckDB returns NULL values for non-existent players, not an empty dict
    # Check that at least the player_name was set correctly even if no data was found
    assert details["player_name"] == "NonExistentPlayer"
    assert details["position"] == "QB"
    assert details["team"] == "XXX"
    # The numeric fields should be None/null since no data exists
    assert details["avg_pick"] is None


def test_get_position_stats(query_service):
    """Test position statistics retrieval."""
    stats = query_service.get_position_stats()
    assert isinstance(stats, list)
    assert len(stats) > 0

    # Check that we have the main positions
    positions = [stat.position for stat in stats]
    assert "QB" in positions
    assert "RB" in positions
    assert "WR" in positions
    assert "TE" in positions

    # Check that stats have required fields
    for stat in stats:
        assert hasattr(stat, "total_drafted")
        assert hasattr(stat, "unique_players")
        assert hasattr(stat, "median_draft_count")


def test_get_first_player_draft_stats(query_service):
    """Test first player draft statistics."""
    stats = query_service.get_first_player_draft_stats()
    assert isinstance(stats, list)
    assert len(stats) > 0

    for stat in stats:
        assert "Position" in stat
        assert "avg_first_pick" in stat
        assert "min_first_pick" in stat
        assert "max_first_pick" in stat


def test_get_position_draft_counts_by_round(query_service):
    """Test position draft counts by round."""
    counts = query_service.get_position_draft_counts_by_round(
        Position.QB, AggregationType.MEAN
    )
    assert isinstance(counts, list)
    assert len(counts) > 0

    for count in counts:
        assert hasattr(count, "round")
        assert hasattr(count, "count")
        assert count.round > 0


def test_get_player_combinations(query_service):
    """Test player combinations retrieval."""
    # Get a couple of players first
    players, _ = query_service.get_players(limit=2)
    if len(players) >= 2:
        required_players = [players[0].name, players[1].name]
        combinations = query_service.get_player_combinations(
            required_players=required_players, n_rounds=20, limit=10
        )
        assert isinstance(combinations, list)
        # We might not have combinations, but the structure should be correct


def test_get_player_combinations_empty_list(query_service):
    """Test player combinations with empty required players list."""
    combinations = query_service.get_player_combinations(
        required_players=[], n_rounds=20, limit=10
    )
    assert combinations == []


def test_get_stacks(query_service):
    """Test QB/receiver stacks retrieval."""
    stacks = query_service.get_stacks(n_rounds=10, limit=5)
    assert isinstance(stacks, list)

    for stack in stacks:
        assert "qb" in stack
        assert "receiver" in stack
        assert "nfl_team" in stack


def test_get_heat_map(query_service):
    """Test heat map data retrieval."""
    heat_map = query_service.get_heat_map()
    assert isinstance(heat_map, list)
    assert len(heat_map) > 0

    for cell in heat_map:
        assert "round" in cell
        assert "position" in cell
        assert "count" in cell


def test_get_draft_slot_correlation(query_service):
    """Test draft slot correlation analysis."""
    correlations = query_service.get_draft_slot_correlation(
        slot=1, metric="percent", top_n=5, min_teams=1
    )
    assert isinstance(correlations, list)

    for correlation in correlations:
        assert "player" in correlation
        assert "slot" in correlation
        assert "score" in correlation


def test_get_draft_slot_correlation_invalid_metric(query_service):
    """Test draft slot correlation with invalid metric."""
    with pytest.raises(ValueError):
        query_service.get_draft_slot_correlation(slot=1, metric="invalid", top_n=5)


def test_get_adp_drift(query_service):
    """Test ADP drift analysis."""
    drift = query_service.get_adp_drift()
    assert isinstance(drift, list)

    for item in drift:
        assert "player" in item
        assert "Position" in item
        assert "drift" in item


def test_get_roster_construction(query_service):
    """Test roster construction analysis."""
    constructions = query_service.get_roster_construction()
    assert isinstance(constructions, list)

    for construction in constructions:
        assert hasattr(construction, "position_counts")
        assert isinstance(construction.position_counts, dict)


def test_get_roster_construction_counts(query_service):
    """Test roster construction counts."""
    counts = query_service.get_roster_construction_counts()
    assert isinstance(counts, list)

    for count in counts:
        assert "QB" in count
        assert "RB" in count
        assert "WR" in count
        assert "TE" in count
        assert "count" in count


def test_query_method_basic(query_service):
    """Test the basic query method."""
    result = query_service.query("SELECT COUNT(*) as total FROM picks")
    assert not result.is_empty()
    assert "total" in result.columns
    assert result["total"][0] > 0


def test_query_method_with_params(query_service):
    """Test the query method with parameters."""
    result = query_service.query(
        "SELECT COUNT(*) as count FROM picks WHERE Position = ?", ["QB"]
    )
    assert not result.is_empty()
    assert "count" in result.columns
    assert result["count"][0] > 0


@patch("app.services.query_service.Path")
def test_get_data_path_error_handling(mock_path):
    """Test error handling when data file doesn't exist."""
    mock_path.return_value.exists.return_value = False

    with pytest.raises(ValueError, match="Invalid or unsafe path"):
        QueryService()


def test_query_service_singleton_behavior():
    """Test that the query_service singleton works correctly."""
    from app.services.query_service import query_service

    # The singleton should be initialized and functional
    assert query_service is not None
    metadata = query_service.get_metadata()
    assert "total_players" in metadata
