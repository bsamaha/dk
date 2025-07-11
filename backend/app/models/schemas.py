from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from enum import Enum


class Position(str, Enum):
    """Player positions enum."""
    QB = "QB"
    RB = "RB" 
    WR = "WR"
    TE = "TE"
    K = "K"
    DST = "DST"


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


class PlayerFilter(BaseModel):
    """Request model for filtering players."""
    positions: Optional[List[Position]] = Field(None, description="Filter by positions")
    search_term: Optional[str] = Field(None, description="Search term for player names")
    limit: Optional[int] = Field(100, description="Maximum number of results", ge=1, le=1000)
    offset: Optional[int] = Field(0, description="Offset for pagination", ge=0)


class Player(BaseModel):
    """Player model."""
    name: Optional[str] = Field(None, description="Player name")
    position: Optional[Position] = Field(None, description="Player position")
    team: Optional[str] = Field(None, description="NFL team")
    avg_pick: Optional[float] = Field(None, description="Average draft pick")
    min_pick: Optional[int] = Field(None, description="Minimum draft pick")
    max_pick: Optional[int] = Field(None, description="Maximum draft pick")
    draft_percentage: Optional[float] = Field(None, description="Percentage of drafts the player was in")


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


class PositionStats(BaseModel):
    """Position statistics model."""
    position: Position = Field(..., description="Position name")
    total_drafted: int = Field(..., description="Total times this position was drafted")
    unique_players: int = Field(..., description="Number of unique players at this position")
    median_draft_count: float = Field(..., description="Median number of players drafted per team for this position")


class PositionStatsResponse(BaseModel):
    """Response model for position statistics."""
    position_stats: List[PositionStats] = Field(..., description="Statistics by position")
    total_picks: int = Field(..., description="Total draft picks analyzed")


class TeamCombination(BaseModel):
    """Detailed model for a team with a specific player combination."""
    team_id: int = Field(..., description="Unique team identifier")
    draft_id: int = Field(..., description="Draft identifier")
    draft_position: int = Field(..., description="Draft position of the team owner")
    players: List[str] = Field(..., description="Full list of players on the team")
    position_counts: str = Field(..., description="Comma-separated string of position counts (e.g., 'QB: 2, RB: 5')")


class CombinationFilter(BaseModel):
    """Request model for player combination filtering."""
    required_players: Optional[List[str]] = Field(None, description="Players that must be in combinations")
    n_rounds: int = Field(20, description="Number of draft rounds to consider", ge=1, le=20)
    limit: Optional[int] = Field(100, description="Maximum number of results", ge=1, le=1000)


class CombinationsResponse(BaseModel):
    """Response model for player combinations."""
    combinations: List[TeamCombination] = Field(..., description="List of teams matching the combination criteria")
    total_combinations: int = Field(..., description="Total number of teams found")
    filter_applied: CombinationFilter = Field(..., description="Applied filters")


class FirstPlayerDraftStats(BaseModel):
    """Statistics for the first player drafted at a position."""
    Position: str = Field(..., description="Position name")
    avg_first_pick: float = Field(..., description="Average pick of the first player drafted at this position")
    min_first_pick: int = Field(..., description="Earliest pick of the first player drafted at this position")
    max_first_pick: int = Field(..., description="Latest pick of the first player drafted at this position")

class PositionRoundCount(BaseModel):
    """Draft counts per round for a position."""
    round: int = Field(..., description="Draft round")
    count: float = Field(..., description="Average number of players drafted in this round")

class PositionRoundCountsResponse(BaseModel):
    """Response model for position draft counts by round."""
    position: Position = Field(..., description="The position for which the counts are provided")
    round_counts: List[PositionRoundCount] = Field(..., description="List of draft counts per round")

class PlayerDetailsResponse(BaseModel):
    """Response model for single player details."""
    player_name: str = Field(..., description="Player name")
    position: str = Field(..., description="Player position")
    team: str = Field(..., description="Player team")
    picks: List[int] = Field(..., description="List of draft picks")
    rounds: List[int] = Field(..., description="List of draft rounds")


class RosterConstruction(BaseModel):
    """Model for a single team's roster construction."""
    draft_id: int = Field(..., description="Draft identifier")
    team_id: int = Field(..., description="Unique team identifier")
    position_counts: Dict[str, int] = Field(..., description="Counts of players per position")


class DriftEntry(BaseModel):
    """ADP drift for a player between two time periods."""
    name: str
    position: Position
    avg_pick_early: float
    avg_pick_late: float
    drift: float  # positive means rising (later pick number), negative means ADP climbs


class DriftResponse(BaseModel):
    drifts: List[DriftEntry]


class HeatMapCell(BaseModel):
    round: int
    position: Position
    count: int


class HeatMapResponse(BaseModel):
    cells: List[HeatMapCell]
    total_picks: int


class DraftSlotRow(BaseModel):
    """Statistics for a single player relative to a draft slot."""
    player: str = Field(..., description="Player name")
    slot: int = Field(..., description="Number of teams in the slot that drafted the player")
    overall: int = Field(..., description="Number of teams overall that drafted the player")
    p_slot: float = Field(..., description="Percentage of slot teams drafting the player")
    p_overall: float = Field(..., description="Percentage of all teams drafting the player")
    score: float = Field(..., description="Metric score used for ranking")


class DraftSlotResponse(BaseModel):
    """Response payload for draft slot correlation request."""
    slot: int = Field(..., description="Draft slot analysed (1-12)")
    metric: str = Field(..., description="Metric used – count | percent | ratio")
    rows: List[DraftSlotRow] = Field(..., description="Top players correlated with the slot")


class StackEntry(BaseModel):
    draft_id: int
    team_id: int
    nfl_team: str  # e.g., PHI
    qb: str
    receiver: str  # WR or TE
    round_qb: int
    round_receiver: int


class StackFinderResponse(BaseModel):
    stacks: List[StackEntry]
    total_stacks: int


class RosterConstructionResponse(BaseModel):
    """Response model for roster construction analysis."""
    roster_constructions: List[RosterConstruction] = Field(..., description="List of team roster constructions")


class ErrorResponse(BaseModel):
    """Error response model."""
    error: str = Field(..., description="Error message")
    detail: Optional[str] = Field(None, description="Detailed error information")
    code: Optional[int] = Field(None, description="Error code")
