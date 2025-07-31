"""Tests for input validation schemas."""

import pytest
from app.models.schemas import AggregationType, Position, SortableColumn, SortOrder
from app.models.validation import (
    AnalyticsDraftSlotQueryParams,
    AnalyticsStacksQueryParams,
    AnalyticsWeek17BringBackQueryParams,
    CombinationsQueryParams,
    PlayerDetailsQueryParams,
    PlayerSearchQueryParams,
    PlayersQueryParams,
    PositionStatsQueryParams,
    RosterConstructionCountsQueryParams,
)
from pydantic import ValidationError


class TestPlayersQueryParams:
    """Test validation for players endpoint query parameters."""

    def test_valid_params(self):
        """Test valid parameters."""
        params = PlayersQueryParams(
            positions=[Position.QB, Position.RB],
            search_term="Tom Brady",
            limit=50,
            offset=10,
            sort_by=SortableColumn.AVG_PICK,
            sort_order=SortOrder.ASC,
        )
        assert params.positions == ["QB", "RB"]
        assert params.search_term == "Tom Brady"
        assert params.limit == 50
        assert params.offset == 10

    def test_invalid_search_term(self):
        """Test invalid search term with special characters."""
        with pytest.raises(ValidationError) as exc_info:
            PlayersQueryParams(
                positions=None,
                search_term="Tom@Brady",
                limit=100,
                offset=0,
                sort_by=SortableColumn.AVG_PICK,
                sort_order=SortOrder.ASC,
            )
        assert "Search term contains invalid characters" in str(exc_info.value)

    def test_empty_search_term(self):
        """Test empty search term."""
        with pytest.raises(ValidationError) as exc_info:
            PlayersQueryParams(
                positions=None,
                search_term="   ",
                limit=100,
                offset=0,
                sort_by=SortableColumn.AVG_PICK,
                sort_order=SortOrder.ASC,
            )
        assert "Search term cannot be empty or only whitespace" in str(exc_info.value)

    def test_invalid_limit(self):
        """Test invalid limit."""
        with pytest.raises(ValidationError) as exc_info:
            PlayersQueryParams(
                positions=None,
                search_term=None,
                limit=0,
                offset=0,
                sort_by=SortableColumn.AVG_PICK,
                sort_order=SortOrder.ASC,
            )
        assert "Input should be greater than or equal to 1" in str(exc_info.value)

    def test_invalid_offset(self):
        """Test invalid offset."""
        with pytest.raises(ValidationError) as exc_info:
            PlayersQueryParams(
                positions=None,
                search_term=None,
                limit=100,
                offset=-1,
                sort_by=SortableColumn.AVG_PICK,
                sort_order=SortOrder.ASC,
            )
        assert "Input should be greater than or equal to 0" in str(exc_info.value)


class TestPlayerSearchQueryParams:
    """Test validation for player search endpoint query parameters."""

    def test_valid_params(self):
        """Test valid parameters."""
        params = PlayerSearchQueryParams(q="Tom Brady", limit=25)
        assert params.q == "Tom Brady"
        assert params.limit == 25

    def test_invalid_search_query(self):
        """Test invalid search query."""
        with pytest.raises(ValidationError) as exc_info:
            PlayerSearchQueryParams(q="Tom@Brady", limit=50)
        assert "Search query contains invalid characters" in str(exc_info.value)

    def test_empty_search_query(self):
        """Test empty search query."""
        with pytest.raises(ValidationError) as exc_info:
            PlayerSearchQueryParams(q="   ", limit=50)
        assert "Search query cannot be empty or only whitespace" in str(exc_info.value)

    def test_limit_minimum_boundary(self):
        """Test limit at minimum allowed value."""
        params = PlayerSearchQueryParams(q="Tom Brady", limit=1)
        assert params.limit == 1

    def test_limit_below_minimum(self):
        """Test limit below minimum allowed value."""
        with pytest.raises(ValidationError) as exc_info:
            PlayerSearchQueryParams(q="Tom Brady", limit=0)
        assert "Input should be greater than or equal to 1" in str(exc_info.value)

    def test_limit_maximum_boundary(self):
        """Test limit at maximum allowed value."""
        params = PlayerSearchQueryParams(q="Tom Brady", limit=100)
        assert params.limit == 100

    def test_limit_above_maximum(self):
        """Test limit above maximum allowed value."""
        with pytest.raises(ValidationError) as exc_info:
            PlayerSearchQueryParams(q="Tom Brady", limit=101)
        assert "Input should be less than or equal to 100" in str(exc_info.value)


class TestPlayerDetailsQueryParams:
    """Test validation for player details endpoint query parameters."""

    def test_valid_params(self):
        """Test valid parameters."""
        params = PlayerDetailsQueryParams(
            player_name="Tom Brady", position="QB", team="TB"
        )
        assert params.player_name == "Tom Brady"
        assert params.position == "QB"
        assert params.team == "TB"

    def test_invalid_player_name(self):
        """Test invalid player name."""
        with pytest.raises(ValidationError) as exc_info:
            PlayerDetailsQueryParams(player_name="Tom@Brady", position="QB", team="TB")
        assert "Player name contains invalid characters" in str(exc_info.value)

    def test_invalid_position(self):
        """Test invalid position."""
        with pytest.raises(ValidationError) as exc_info:
            PlayerDetailsQueryParams(player_name="Tom Brady", position="XX", team="TB")
        assert "Invalid position" in str(exc_info.value)

    def test_invalid_team(self):
        """Test invalid team abbreviation."""
        with pytest.raises(ValidationError) as exc_info:
            PlayerDetailsQueryParams(
                player_name="Tom Brady", position="QB", team="TAMPA"
            )
        assert "Team must be a valid abbreviation" in str(exc_info.value)

    def test_position_case_sensitivity(self):
        """Test that position validation is case sensitive."""
        with pytest.raises(ValidationError) as exc_info:
            PlayerDetailsQueryParams(player_name="Tom Brady", position="qb", team="TB")
        assert "Invalid position" in str(exc_info.value)
        with pytest.raises(ValidationError) as exc_info:
            PlayerDetailsQueryParams(player_name="Tom Brady", position="qB", team="TB")
        assert "Invalid position" in str(exc_info.value)

    def test_team_case_sensitivity(self):
        """Test that team abbreviation validation is case sensitive."""
        with pytest.raises(ValidationError) as exc_info:
            PlayerDetailsQueryParams(player_name="Tom Brady", position="QB", team="tb")
        assert "Team must be a valid abbreviation" in str(exc_info.value)
        with pytest.raises(ValidationError) as exc_info:
            PlayerDetailsQueryParams(player_name="Tom Brady", position="QB", team="tB")
        assert "Team must be a valid abbreviation" in str(exc_info.value)


class TestAnalyticsStacksQueryParams:
    """Test validation for analytics stacks endpoint query parameters."""

    def test_valid_params(self):
        """Test valid parameters."""
        params = AnalyticsStacksQueryParams(n_rounds=15, limit=200)
        assert params.n_rounds == 15
        assert params.limit == 200

    def test_invalid_n_rounds(self):
        """Test invalid n_rounds."""
        with pytest.raises(ValidationError) as exc_info:
            AnalyticsStacksQueryParams(n_rounds=25, limit=100)
        assert "Input should be less than or equal to 20" in str(exc_info.value)

    def test_invalid_limit(self):
        """Test invalid limit."""
        with pytest.raises(ValidationError) as exc_info:
            AnalyticsStacksQueryParams(limit=2000, n_rounds=10)
        assert "Input should be less than or equal to 1000" in str(exc_info.value)


class TestAnalyticsDraftSlotQueryParams:
    """Test validation for analytics draft slot endpoint query parameters."""

    def test_valid_params(self):
        """Test valid parameters."""
        params = AnalyticsDraftSlotQueryParams(
            slot=5, metric="percent", top_n=50, min_teams=20
        )
        assert params.slot == 5
        assert params.metric == "percent"
        assert params.top_n == 50
        assert params.min_teams == 20

    def test_invalid_slot(self):
        """Test invalid slot."""
        with pytest.raises(ValidationError) as exc_info:
            AnalyticsDraftSlotQueryParams(
                slot=15, metric="percent", top_n=25, min_teams=10
            )
        assert "Input should be less than or equal to 12" in str(exc_info.value)

    def test_min_teams_minimum_boundary(self):
        """Test min_teams at its minimum allowed value."""
        params = AnalyticsDraftSlotQueryParams(
            slot=3, metric="percent", top_n=10, min_teams=1
        )
        assert params.min_teams == 1

    def test_min_teams_maximum_boundary(self):
        """Test min_teams at its maximum allowed value."""
        params = AnalyticsDraftSlotQueryParams(
            slot=3, metric="percent", top_n=10, min_teams=1000
        )
        assert params.min_teams == 1000

    def test_invalid_metric(self):
        """Test invalid metric."""
        with pytest.raises(ValidationError) as exc_info:
            AnalyticsDraftSlotQueryParams(
                slot=5, metric="invalid", top_n=25, min_teams=10
            )
        assert "Metric must be one of: count, percent, ratio" in str(exc_info.value)


class TestAnalyticsWeek17BringBackQueryParams:
    """Test validation for Week 17 bring back analytics endpoint query parameters."""

    def test_valid_team_scope(self):
        """Test valid team scope parameters."""
        params = AnalyticsWeek17BringBackQueryParams(
            scope="team", entity="BUF", limit=15
        )
        assert params.scope == "team"
        assert params.entity == "BUF"
        assert params.limit == 15

    def test_valid_player_scope(self):
        """Test valid player scope parameters."""
        params = AnalyticsWeek17BringBackQueryParams(
            scope="player", entity="Tom Brady", limit=15
        )
        assert params.scope == "player"
        assert params.entity == "Tom Brady"
        assert params.limit == 15

    def test_invalid_scope(self):
        """Test invalid scope."""
        with pytest.raises(ValidationError) as exc_info:
            AnalyticsWeek17BringBackQueryParams(scope="invalid", entity="BUF", limit=15)
        assert "Scope must be one of: team, player" in str(exc_info.value)

    def test_invalid_team_entity(self):
        """Test invalid team entity for team scope."""
        with pytest.raises(ValidationError) as exc_info:
            AnalyticsWeek17BringBackQueryParams(
                scope="team", entity="BUFFALO", limit=15
            )
        assert "Entity must be a valid team abbreviation" in str(exc_info.value)

    def test_invalid_player_entity(self):
        """Test invalid player entity for player scope."""
        with pytest.raises(ValidationError) as exc_info:
            AnalyticsWeek17BringBackQueryParams(
                scope="player", entity="Tom@Brady", limit=15
            )
        assert "Entity must be a valid player name" in str(exc_info.value)

    @pytest.mark.parametrize(
        "scope,entity,expected_error",
        [
            ("team", "", "Entity must be a valid team abbreviation"),
            ("team", "   ", "Entity must be a valid team abbreviation"),
            ("player", "", "Entity must be a valid player name"),
            ("player", "   ", "Entity cannot be empty or only whitespace"),
        ],
    )
    def test_empty_or_whitespace_entity(self, scope, entity, expected_error):
        """Test empty or whitespace-only entity values for both scopes."""
        with pytest.raises(ValidationError) as exc_info:
            AnalyticsWeek17BringBackQueryParams(scope=scope, entity=entity, limit=15)
        assert expected_error in str(exc_info.value)


class TestCombinationsQueryParams:
    """Test validation for combinations endpoint query parameters."""

    def test_valid_params(self):
        """Test valid parameters."""
        params = CombinationsQueryParams(
            required_players=["Tom Brady", "Mike Evans"], n_rounds=15, limit=200
        )
        assert params.required_players == ["Tom Brady", "Mike Evans"]
        assert params.n_rounds == 15
        assert params.limit == 200

    def test_empty_required_players(self):
        """Test empty required players."""
        with pytest.raises(ValidationError) as exc_info:
            CombinationsQueryParams(required_players=[], n_rounds=20, limit=100)
        assert "At least one required player must be specified" in str(exc_info.value)

    def test_invalid_player_name(self):
        """Test invalid player name."""
        with pytest.raises(ValidationError) as exc_info:
            CombinationsQueryParams(
                required_players=["Tom@Brady"], n_rounds=20, limit=100
            )
        assert "Invalid player name: Tom@Brady" in str(exc_info.value)

    def test_duplicate_players(self):
        """Test duplicate players are removed."""
        params = CombinationsQueryParams(
            required_players=["Tom Brady", "Tom Brady", "Mike Evans"],
            n_rounds=20,
            limit=100,
        )
        assert params.required_players == ["Tom Brady", "Mike Evans"]


class TestRosterConstructionCountsQueryParams:
    """Test validation for roster construction counts endpoint query parameters."""

    def test_valid_params(self):
        """Test valid parameters."""
        params = RosterConstructionCountsQueryParams(
            required_players=["Tom Brady", "Mike Evans"]
        )
        assert params.required_players == ["Tom Brady", "Mike Evans"]

    def test_none_required_players(self):
        """Test None required players."""
        params = RosterConstructionCountsQueryParams(required_players=None)
        assert params.required_players is None

    def test_invalid_player_name(self):
        """Test invalid player name."""
        with pytest.raises(ValidationError) as exc_info:
            RosterConstructionCountsQueryParams(required_players=["Tom@Brady"])
        assert "Invalid player name: Tom@Brady" in str(exc_info.value)

    def test_empty_or_whitespace_player_name(self):
        """Test empty or whitespace-only player names are rejected."""
        with pytest.raises(ValidationError) as exc_info:
            RosterConstructionCountsQueryParams(required_players=[""])
        assert "Invalid player name: " in str(exc_info.value)
        with pytest.raises(ValidationError) as exc_info:
            RosterConstructionCountsQueryParams(required_players=["   "])
        assert "Player name cannot be empty or only whitespace" in str(exc_info.value)


class TestPositionStatsQueryParams:
    """Test validation for position stats endpoint query parameters."""

    def test_valid_params(self):
        """Test valid parameters."""
        params = PositionStatsQueryParams(
            position=Position.QB, aggregation=AggregationType.MEAN
        )
        assert params.position == Position.QB
        assert params.aggregation == AggregationType.MEAN

    def test_invalid_position(self):
        """Test invalid position."""
        with pytest.raises(ValidationError) as exc_info:
            PositionStatsQueryParams(position="XX", aggregation=AggregationType.MEAN)  # type: ignore
        assert "Input should be 'QB', 'RB', 'WR' or 'TE'" in str(exc_info.value)
