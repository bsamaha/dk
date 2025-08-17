from enum import Enum
from typing import Dict, List, Optional

from pydantic import BaseModel, Field


class Position(str, Enum):
    """Player positions enum."""

    QB = "QB"
    RB = "RB"
    WR = "WR"
    TE = "TE"


class SortableColumn(str, Enum):
    """Columns that can be sorted."""

    NAME = "name"
    POSITION = "position"
    TEAM = "team"
    DRAFT_PERCENTAGE = "draft_percentage"
    AVG_PICK = "avg_pick"
    AVG_ROUND = "avg_round"


class SortOrder(str, Enum):
    """Sort order."""

    ASC = "asc"
    DESC = "desc"


class AggregationType(str, Enum):
    """Aggregation type for statistical calculations."""

    MEAN = "mean"
    MEDIAN = "median"


class MetadataResponse(BaseModel):
    """Response model for dataset metadata."""

    total_players: int = Field(..., description="Total number of unique players")
    total_drafts: int = Field(..., description="Total number of drafts")
    total_teams: int = Field(..., description="Total number of teams")
    all_players: List[str] = Field(..., description="List of all player names")


class Player(BaseModel):
    """Player model."""

    name: Optional[str] = Field(None, description="Player name")
    position: Optional[Position] = Field(None, description="Player position")
    team: Optional[str] = Field(None, description="NFL team")
    avg_pick: Optional[float] = Field(None, description="Average draft pick")
    min_pick: Optional[int] = Field(None, description="Minimum draft pick")
    max_pick: Optional[int] = Field(None, description="Maximum draft pick")
    draft_percentage: Optional[float] = Field(
        None, description="Percentage of drafts the player was in"
    )


class PageInfo(BaseModel):
    """Pagination information model."""

    total_count: int
    limit: int
    offset: int
    has_next: bool
    has_previous: bool
    current_page: int
    total_pages: int


class PlayersResponse(BaseModel):
    """Response model for players list."""

    players: List[Player] = Field(..., description="List of players")
    total_count: int = Field(..., description="Total number of players matching filter")
    page_info: PageInfo = Field(..., description="Pagination information")


class TeamsResponse(BaseModel):
    """Response model for unique team list."""

    teams: List[str] = Field(..., description="List of unique NFL teams")
    total_count: int = Field(..., description="Total number of unique teams")


class PositionStats(BaseModel):
    """Position statistics model."""

    position: Position = Field(..., description="Position name")
    total_drafted: int = Field(..., description="Total times this position was drafted")
    unique_players: int = Field(
        ..., description="Number of unique players at this position"
    )
    median_draft_count: float = Field(
        ..., description="Median number of players drafted per team for this position"
    )


class PositionStatsResponse(BaseModel):
    """Response model for position statistics."""

    position_stats: List[PositionStats] = Field(
        ..., description="Statistics by position"
    )
    total_picks: int = Field(..., description="Total draft picks analyzed")


class FirstPlayerDraftStats(BaseModel):
    """Statistics for the first player drafted at a position."""

    Position: str = Field(..., description="Position name")
    avg_first_pick: float = Field(
        ..., description="Average pick of the first player drafted at this position"
    )
    min_first_pick: int = Field(
        ..., description="Earliest pick of the first player drafted at this position"
    )
    max_first_pick: int = Field(
        ..., description="Latest pick of the first player drafted at this position"
    )


class PositionRoundCount(BaseModel):
    """Draft counts per round for a position."""

    round: int = Field(..., description="Draft round")
    count: float = Field(
        ..., description="Average number of players drafted in this round"
    )


class PlayerDetailsResponse(BaseModel):
    """Response model for single player details."""

    player_name: str = Field(..., description="Player name")
    position: str = Field(..., description="Player position")
    team: str = Field(..., description="Player team")
    avg_pick: Optional[float] = Field(None, description="Average draft pick")
    avg_round: Optional[float] = Field(None, description="Average draft round")
    min_pick: Optional[int] = Field(None, description="Minimum draft pick")
    max_pick: Optional[int] = Field(None, description="Maximum draft pick")
    std_dev_pick: Optional[float] = Field(
        None, description="Standard deviation of draft picks"
    )
    total_drafts: Optional[int] = Field(None, description="Total number of drafts")
    picks: List[int] = Field(..., description="List of draft picks")
    rounds: List[int] = Field(..., description="List of draft rounds")


class RosterConstruction(BaseModel):
    """Model for a single team's roster construction."""

    draft_id: int = Field(..., description="Draft identifier")
    draft_position: int = Field(..., description="Draft position of the team owner")
    position_counts: Dict[str, int] = Field(
        ..., description="Counts of players per position"
    )


class Week17BringBackPlayer(BaseModel):
    """Model for Week 17 bring back player data."""

    player: str = Field(..., description="Player name")
    position: str = Field(..., description="Player position")
    percentage: float = Field(..., description="Draft or co-occurrence percentage")
    draft_count: Optional[int] = Field(None, description="Raw draft count (team view)")
    co_occurrence_count: Optional[int] = Field(
        None, description="Co-occurrence count (player view)"
    )


class Week17BringBackResponse(BaseModel):
    """Response model for Week 17 bring back data."""

    scope: str = Field(..., description="View scope: 'team' or 'player'")
    entity: str = Field(..., description="Selected team or player name")
    opponent: Optional[str] = Field(None, description="Week 17 opponent team")
    total_drafts: int = Field(..., description="Total drafts in dataset")
    players: List[Week17BringBackPlayer] = Field(
        ..., description="Top bring back players"
    )
