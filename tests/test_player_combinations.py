import polars as pl
import pytest
from polars.testing import assert_frame_equal

from src.player_combinations import find_unique_player_combinations


@pytest.fixture
def sample_data():
    """Create a sample DataFrame for testing."""
    data = {
        "draft": [1, 1, 1, 1, 2, 2, 2, 2],
        "round": [1, 2, 1, 2, 1, 2, 1, 2],
        "team_id": [101, 101, 102, 102, 201, 201, 202, 202],
        "draft_position": [1, 1, 2, 2, 1, 1, 2, 2],
        "player": ["PlayerA", "PlayerB", "PlayerA", "PlayerC", "PlayerD", "PlayerE", "PlayerD", "PlayerF"],
    }
    return pl.DataFrame(data)


def test_no_required_players(sample_data):
    """Test that it returns all unique rosters within N rounds."""
    result = find_unique_player_combinations(sample_data, n_rounds=2, required_players=[])
    expected_data = {
        "team_id": [101, 102, 201, 202],
        "draft": [1, 1, 2, 2],
        "draft_position": [1, 2, 1, 2],
        "players": [["PlayerA", "PlayerB"], ["PlayerA", "PlayerC"], ["PlayerD", "PlayerE"], ["PlayerD", "PlayerF"]],
    }
    expected = pl.DataFrame(expected_data).sort("team_id")
    assert_frame_equal(result.sort("team_id"), expected)


def test_with_required_players(sample_data):
    """Test that it correctly filters for teams with required players."""
    result = find_unique_player_combinations(sample_data, n_rounds=2, required_players=["PlayerA"])
    expected_data = {
        "team_id": [101, 102],
        "draft": [1, 1],
        "draft_position": [1, 2],
        "players": [["PlayerA", "PlayerB"], ["PlayerA", "PlayerC"]],
    }
    expected = pl.DataFrame(expected_data).sort("team_id")
    assert_frame_equal(result.sort("team_id"), expected)


def test_multiple_required_players(sample_data):
    """Test filtering with multiple required players."""
    result = find_unique_player_combinations(sample_data, n_rounds=2, required_players=["PlayerA", "PlayerC"])
    expected_data = {
        "team_id": [102],
        "draft": [1],
        "draft_position": [2],
        "players": [["PlayerA", "PlayerC"]],
    }
    expected = pl.DataFrame(expected_data)
    assert_frame_equal(result, expected)


def test_n_rounds_filter(sample_data):
    """Test that it correctly filters by n_rounds and returns unique combinations."""
    # In round 1, teams 101 and 102 both draft PlayerA, creating a non-unique combination.
    # The function should return only one of these, the one kept by the `unique` logic.
    result = find_unique_player_combinations(sample_data, n_rounds=1, required_players=["PlayerA"])
    expected_data = {
        "team_id": [102],
        "draft": [1],
        "draft_position": [2],
        "players": [["PlayerA"]],
    }
    expected = pl.DataFrame(expected_data)
    assert_frame_equal(result, expected)


def test_no_matching_players(sample_data):
    """Test that it returns an empty DataFrame when no players match."""
    result = find_unique_player_combinations(sample_data, n_rounds=2, required_players=["PlayerZ"])
    assert result.is_empty()


def test_empty_dataframe():
    """Test that it handles an empty input DataFrame gracefully."""
    empty_df = pl.DataFrame({
        "draft": [], "round": [], "team_id": [], "draft_position": [], "player": []
    }, schema={
        "draft": pl.Int64, "round": pl.Int64, "team_id": pl.Int64, "draft_position": pl.Int64, "player": pl.Utf8
    })
    result = find_unique_player_combinations(empty_df, n_rounds=2, required_players=["PlayerA"])
    assert result.is_empty()
