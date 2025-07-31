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
    # Should return dictionary with player identifiers and null statistical values
    assert details is not None
    assert details["player_name"] == "NonExistentPlayer"
    assert details["position"] == "QB"
    assert details["team"] == "XXX"
    assert details["avg_pick"] is None
    assert details["total_drafts"] == 0
    assert details["picks"] == []
    assert details["rounds"] == []


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
        for combination in combinations:
            assert isinstance(combination, dict)
            # Adjust the expected keys as per your actual combination structure
            expected_keys = {
                "players",
                "positions",
                "draft_id",
                "draft_position",
                "position_counts",
            }
            assert expected_keys.issubset(combination.keys())


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


@patch("app.services.query_service.QueryService._validate_and_sanitize_path")
def test_get_data_path_error_handling(mock_validate):
    """Test error handling when data file doesn't exist."""
    mock_validate.side_effect = ValueError("Path does not exist: /fake/path")

    with pytest.raises(ValueError, match="Path does not exist"):
        QueryService()


def test_query_service_singleton_behavior():
    """Test that the query_service singleton works correctly."""
    # Import the singleton again to check identity
    from app.services.query_service import query_service
    from app.services.query_service import query_service as query_service_again

    # The singleton should be initialized and functional
    assert query_service is not None
    metadata = query_service.get_metadata()
    assert "total_players" in metadata
    # Assert that both imports refer to the same instance
    assert query_service is query_service_again


# ============================================================================
# Week 17 Bring Back Tests
# ============================================================================


def test_week17_matchups_loaded(query_service):
    """Test that Week 17 matchups are properly loaded."""
    # Test that the week17_matchups table exists and has data
    result = query_service.query("SELECT COUNT(*) as count FROM week17_matchups")
    assert not result.is_empty()
    assert result["count"][0] == 32  # Should have all 32 teams

    # Test that we have both directions (each team maps to an opponent)
    teams_result = query_service.query("SELECT DISTINCT team FROM week17_matchups")
    opponents_result = query_service.query(
        "SELECT DISTINCT opponent FROM week17_matchups"
    )

    teams = set(teams_result["team"].to_list())
    opponents = set(opponents_result["opponent"].to_list())

    # All teams should appear as both team and opponent
    assert teams == opponents
    assert len(teams) == 32


def test_get_week17_opponent_valid_team(query_service):
    """Test getting Week 17 opponent for a valid team."""
    # Test with a known matchup from our data
    opponent = query_service.get_week17_opponent("BUF")
    assert opponent == "PHI"

    # Test the reverse
    opponent = query_service.get_week17_opponent("PHI")
    assert opponent == "BUF"

    # Test another matchup
    opponent = query_service.get_week17_opponent("KC")
    assert opponent == "DEN"


def test_get_week17_opponent_invalid_team(query_service):
    """Test getting Week 17 opponent for an invalid team."""
    opponent = query_service.get_week17_opponent("INVALID")
    assert opponent is None

    opponent = query_service.get_week17_opponent("")
    assert opponent is None


def test_get_week17_opponent_case_sensitivity(query_service):
    """Test that Week 17 opponent lookup is case sensitive."""
    # Our data uses uppercase team names
    opponent = query_service.get_week17_opponent("buf")  # lowercase
    assert opponent is None  # Should not match

    opponent = query_service.get_week17_opponent("BUF")  # uppercase
    assert opponent == "PHI"  # Should match

    opponent = query_service.get_week17_opponent("BuF")  # mixed case
    assert opponent is None  # Should not match


def test_get_week17_bringback_team_view_valid_team(query_service):
    """Test Week 17 bring back team view for a valid team."""
    # Test with a team that should have data
    result = query_service.get_week17_bringback_team_view("BUF", limit=5)

    assert isinstance(result, list)
    assert len(result) <= 5

    for player_data in result:
        assert "player" in player_data
        assert "position" in player_data
        assert "percentage" in player_data
        assert "draft_count" in player_data

        # Validate data types
        assert isinstance(player_data["player"], str)
        assert isinstance(player_data["position"], str)
        assert isinstance(player_data["percentage"], (int, float))
        assert isinstance(player_data["draft_count"], int)

        # Validate ranges
        assert 0 <= player_data["percentage"] <= 100
        assert player_data["draft_count"] >= 0


def test_get_week17_bringback_team_view_invalid_team(query_service):
    """Test Week 17 bring back team view for an invalid team."""
    result = query_service.get_week17_bringback_team_view("INVALID", limit=5)
    assert result == []


def test_get_week17_bringback_team_view_no_opponent(query_service):
    """Test Week 17 bring back team view for a team with no Week 17 opponent."""
    # Mock a scenario where opponent lookup fails
    with patch.object(query_service, "get_week17_opponent", return_value=None):
        result = query_service.get_week17_bringback_team_view("BUF", limit=5)
        assert result == []


def test_get_week17_bringback_team_view_limit_parameter(query_service):
    """Test that the limit parameter works correctly for team view."""
    result_small = query_service.get_week17_bringback_team_view("BUF", limit=3)
    result_large = query_service.get_week17_bringback_team_view("BUF", limit=10)

    assert len(result_small) <= 3
    assert len(result_large) <= 10
    assert len(result_large) >= len(result_small)


def test_get_week17_bringback_player_view_valid_player(query_service):
    """Test Week 17 bring back player view for a valid player."""
    # Get a player that exists in the dataset
    players_result = query_service.query(
        "SELECT player FROM picks WHERE Position = 'QB' LIMIT 1"
    )
    if len(players_result) == 0:
        pytest.skip("No QB players found in test dataset")

    test_player = players_result["player"][0]
    result = query_service.get_week17_bringback_player_view(test_player, limit=5)

    assert isinstance(result, list)
    assert len(result) <= 5

    for player_data in result:
        assert "player" in player_data
        assert "position" in player_data
        assert "percentage" in player_data
        assert "co_occurrence_count" in player_data

        # Validate data types
        assert isinstance(player_data["player"], str)
        assert isinstance(player_data["position"], str)
        assert isinstance(player_data["percentage"], (int, float))
        assert isinstance(player_data["co_occurrence_count"], int)

        # Validate ranges
        assert 0 <= player_data["percentage"] <= 100
        assert player_data["co_occurrence_count"] >= 0


def test_get_week17_bringback_player_view_invalid_player(query_service):
    """Test Week 17 bring back player view for an invalid player."""
    result = query_service.get_week17_bringback_player_view("INVALID_PLAYER", limit=5)
    assert result == []


def test_get_week17_bringback_player_view_no_opponent(query_service):
    """Test Week 17 bring back player view when opponent lookup fails."""
    # Get a valid player first
    players_result = query_service.query("SELECT player FROM picks LIMIT 1")
    if len(players_result) == 0:
        pytest.skip("No players found in test dataset")

    test_player = players_result["player"][0]

    # Mock the get_week17_opponent to return None
    with patch.object(query_service, "get_week17_opponent", return_value=None):
        result = query_service.get_week17_bringback_player_view(test_player, limit=5)
        assert result == []


def test_get_week17_bringback_player_view_limit_parameter(query_service):
    """Test that the limit parameter works correctly for player view."""
    # Get a player that exists
    players_result = query_service.query("SELECT player FROM picks LIMIT 1")
    if len(players_result) == 0:
        pytest.skip("No players found in test dataset")

    test_player = players_result["player"][0]

    result_small = query_service.get_week17_bringback_player_view(test_player, limit=2)
    result_large = query_service.get_week17_bringback_player_view(test_player, limit=8)

    assert len(result_small) <= 2
    assert len(result_large) <= 8
    assert len(result_large) >= len(result_small)


def test_week17_calculations_accuracy(query_service):
    """Test that Week 17 percentage calculations are accurate."""
    # Test team view calculation accuracy
    result = query_service.get_week17_bringback_team_view("BUF", limit=1)

    if len(result) > 0:
        player_data = result[0]
        calculated_percentage = player_data["percentage"]
        draft_count = player_data["draft_count"]

        # Manually calculate the expected percentage
        total_drafts = query_service.total_drafts
        expected_percentage = (draft_count / total_drafts) * 100

        # Allow for small floating point differences
        assert abs(calculated_percentage - expected_percentage) < 0.01


def test_week17_data_consistency(query_service):
    """Test that Week 17 data is consistent between views."""
    # Get a team and verify its opponent relationship is bidirectional
    team1 = "BUF"
    team2 = query_service.get_week17_opponent(team1)

    if team2:
        # team2's opponent should be team1
        reverse_opponent = query_service.get_week17_opponent(team2)
        assert reverse_opponent == team1


def test_week17_matchups_file_integration(query_service):
    """Test that Week 17 matchups file was loaded successfully in integration."""
    # This tests the actual file loading in the real service instance
    # Verify that some known matchups exist
    opponent = query_service.get_week17_opponent("BUF")
    assert opponent is not None, "Week 17 matchups should be loaded"

    # Verify bidirectional relationship
    reverse_opponent = query_service.get_week17_opponent(opponent)
    assert reverse_opponent == "BUF", "Week 17 matchups should be bidirectional"


def test_validate_required_players_edge_cases(query_service):
    """Test required_players validation with edge cases."""
    # Test empty list (now allowed)
    result = query_service._validate_required_players([])
    assert result == []

    # Test non-list input
    with pytest.raises(ValueError, match="required_players must be a list"):
        query_service._validate_required_players("not a list")

    # Test list with non-string elements
    with pytest.raises(ValueError, match="Player at index 0 must be a string"):
        query_service._validate_required_players([123])

    # Test empty string
    with pytest.raises(ValueError, match="Player at index 0 cannot be empty"):
        query_service._validate_required_players([""])

    # Test whitespace-only string
    with pytest.raises(ValueError, match="Player at index 1 cannot be empty"):
        query_service._validate_required_players(["Josh Allen", "   "])

    # Test valid input with whitespace
    result = query_service._validate_required_players(
        ["  Josh Allen  ", "Stefon Diggs"]
    )
    assert result == ["Josh Allen", "Stefon Diggs"]

    # Test valid input without whitespace
    result = query_service._validate_required_players(["Josh Allen", "Stefon Diggs"])
    assert result == ["Josh Allen", "Stefon Diggs"]

    # Test 50-player limit
    valid_players = [f"Player{i}" for i in range(50)]
    result = query_service._validate_required_players(valid_players)
    assert result == valid_players

    # Test exceeding 50-player limit
    too_many_players = [f"Player{i}" for i in range(51)]
    with pytest.raises(
        ValueError, match="A maximum of 50 required players can be specified"
    ):
        query_service._validate_required_players(too_many_players)
