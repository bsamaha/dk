"""Comprehensive input validation schemas for API endpoints."""

import re
from typing import List, Optional

from pydantic import BaseModel, Field, field_validator, model_validator

from .schemas import AggregationType, Position, SortableColumn, SortOrder

# Validation patterns
PLAYER_NAME_PATTERN = r"^[A-Za-z\s\.\-']{1,50}$"
TEAM_ABBR_PATTERN = r"^[A-Z]{2,4}$"
SEARCH_TERM_PATTERN = r"^[A-Za-z\s\.\-']{1,30}$"


class PlayersQueryParams(BaseModel):
    """Validation schema for players endpoint query parameters."""

    positions: Optional[List[Position]] = Field(None, description="Filter by positions")
    search_term: Optional[str] = Field(None, description="Search term for player names")
    limit: int = Field(100, description="Maximum number of results", ge=1, le=1000)
    offset: int = Field(0, description="Offset for pagination", ge=0, le=10000)
    sort_by: SortableColumn = Field(
        SortableColumn.AVG_PICK, description="Column to sort by"
    )
    sort_order: SortOrder = Field(SortOrder.ASC, description="Sort order")

    @field_validator("search_term")
    @classmethod
    def validate_search_term(cls, v):
        if v is not None:
            # Remove extra whitespace
            v = " ".join(v.split())
            if not v.strip():
                raise ValueError("Search term cannot be empty or only whitespace")
            # Validate pattern
            if not re.match(SEARCH_TERM_PATTERN, v):
                raise ValueError("Search term contains invalid characters")
        return v


class PlayerSearchQueryParams(BaseModel):
    """Validation schema for player search endpoint query parameters."""

    q: str = Field(..., description="Search query")
    limit: int = Field(50, description="Maximum number of results", ge=1, le=100)

    @field_validator("q")
    @classmethod
    def validate_search_query(cls, v):
        # Remove extra whitespace
        v = " ".join(v.split())
        if not v.strip():
            raise ValueError("Search query cannot be empty or only whitespace")
        # Validate pattern
        if not re.match(SEARCH_TERM_PATTERN, v):
            raise ValueError("Search query contains invalid characters")
        return v


class PlayerDetailsQueryParams(BaseModel):
    """Validation schema for player details endpoint query parameters."""

    player_name: str = Field(..., description="Player name")
    position: str = Field(..., description="Player position")
    team: str = Field(..., description="Player team")

    @field_validator("player_name")
    @classmethod
    def validate_player_name(cls, v):
        # Remove extra whitespace
        v = " ".join(v.split())
        if not v.strip():
            raise ValueError("Player name cannot be empty or only whitespace")
        # Validate pattern
        if not re.match(PLAYER_NAME_PATTERN, v):
            raise ValueError("Player name contains invalid characters")
        return v

    @field_validator("position")
    @classmethod
    def validate_position(cls, v):
        if v not in Position._value2member_map_:
            raise ValueError("Invalid position")
        return v

    @field_validator("team")
    @classmethod
    def validate_team(cls, v):
        if not re.match(TEAM_ABBR_PATTERN, v):
            raise ValueError('Team must be a valid abbreviation (e.g., "BUF", "PHI")')
        return v


class AnalyticsStacksQueryParams(BaseModel):
    """Validation schema for analytics stacks endpoint query parameters."""

    n_rounds: int = Field(10, description="Number of rounds to consider", ge=1, le=20)
    limit: int = Field(100, description="Maximum number of results", ge=1, le=1000)


class AnalyticsDraftSlotQueryParams(BaseModel):
    """Validation schema for analytics draft slot endpoint query parameters."""

    slot: int = Field(..., description="Draft slot (1-12)", ge=1, le=12)
    metric: str = Field("percent", description="Metric type for correlation")
    top_n: int = Field(25, description="Number of top players to return", ge=1, le=100)
    min_teams: int = Field(
        10, description="Minimum number of teams required", ge=1, le=1000
    )

    @field_validator("metric")
    @classmethod
    def validate_metric(cls, v):
        valid_metrics = ["count", "percent", "ratio"]
        if v not in valid_metrics:
            raise ValueError(f"Metric must be one of: {', '.join(valid_metrics)}")
        return v


class AnalyticsWeek17BringBackQueryParams(BaseModel):
    """Validation schema for Week 17 bring back analytics endpoint query parameters."""

    scope: str = Field(..., description="View scope: 'team' or 'player'")
    entity: str = Field(..., description="Team abbreviation or player name")
    limit: int = Field(10, description="Number of top players to return", ge=1, le=25)

    @field_validator("scope")
    @classmethod
    def validate_scope(cls, v):
        valid_scopes = ["team", "player"]
        if v not in valid_scopes:
            raise ValueError(f"Scope must be one of: {', '.join(valid_scopes)}")
        return v

    @model_validator(mode="after")
    def validate_scope_and_entity(self):
        scope = getattr(self, "scope", None)
        entity = getattr(self, "entity", None)

        if scope == "team":
            if not re.match(TEAM_ABBR_PATTERN, entity or ""):
                raise ValueError(
                    'Entity must be a valid team abbreviation (e.g., "BUF", "PHI")'
                )
        elif scope == "player":
            if not re.match(PLAYER_NAME_PATTERN, entity or ""):
                raise ValueError("Entity must be a valid player name")

        # Remove extra whitespace
        if entity is not None:
            cleaned_entity = " ".join(entity.split())
            if not cleaned_entity.strip():
                raise ValueError("Entity cannot be empty or only whitespace")
            self.entity = cleaned_entity

        return self


class CombinationsQueryParams(BaseModel):
    """Validation schema for combinations endpoint query parameters."""

    required_players: List[str] = Field(..., description="List of required players")
    n_rounds: int = Field(20, description="Number of rounds to consider", ge=1, le=20)
    limit: int = Field(
        50, description="Maximum number of results per page", ge=1, le=1000
    )
    offset: int = Field(0, description="Offset for pagination", ge=0)

    @field_validator("required_players")
    @classmethod
    def validate_required_players(cls, v):
        if not v:
            raise ValueError("At least one required player must be specified")

        # Normalize and validate each player name
        normalized_players = []
        for player in v:
            # Normalize whitespace first
            player_clean = " ".join(player.split())
            if not player_clean.strip():
                raise ValueError("Player name cannot be empty or only whitespace")
            if not re.match(PLAYER_NAME_PATTERN, player_clean):
                raise ValueError(f"Invalid player name: {player_clean}")
            normalized_players.append(player_clean)

        # Remove duplicates while preserving order
        seen = set()
        unique_players = []
        for player in normalized_players:
            if player not in seen:
                seen.add(player)
                unique_players.append(player)

        return unique_players


class RosterConstructionCountsQueryParams(BaseModel):
    """Validation schema for roster construction counts endpoint query parameters."""

    required_players: Optional[List[str]] = Field(
        None, description="List of required players"
    )

    @field_validator("required_players")
    @classmethod
    def validate_required_players(cls, v):
        if v is not None:
            # Validate each player name
            for player in v:
                if not re.match(PLAYER_NAME_PATTERN, player):
                    raise ValueError(f"Invalid player name: {player}")
                # Remove extra whitespace
                player_clean = " ".join(player.split())
                if not player_clean.strip():
                    raise ValueError("Player name cannot be empty or only whitespace")

            # Remove duplicates while preserving order
            seen = set()
            unique_players = []
            for player in v:
                player_clean = " ".join(player.split())
                if player_clean not in seen:
                    seen.add(player_clean)
                    unique_players.append(player_clean)

            return unique_players
        return v


class PositionStatsQueryParams(BaseModel):
    """Validation schema for position stats endpoint query parameters."""

    position: Position = Field(..., description="Position to get stats for")
    aggregation: AggregationType = Field(
        AggregationType.MEAN, description="Aggregation type"
    )


# Request body models for POST endpoints (if any are added in the future)
class PlayerFilterRequest(BaseModel):
    """Request body model for filtering players."""

    positions: Optional[List[Position]] = Field(None, description="Filter by positions")
    search_term: Optional[str] = Field(None, description="Search term for player names")
    limit: Optional[int] = Field(
        100, description="Maximum number of results", ge=1, le=1000
    )
    offset: Optional[int] = Field(
        0, description="Offset for pagination", ge=0, le=10000
    )
    sort_by: Optional[SortableColumn] = Field(
        SortableColumn.AVG_PICK, description="Column to sort by"
    )
    sort_order: Optional[SortOrder] = Field(SortOrder.ASC, description="Sort order")

    @field_validator("search_term")
    @classmethod
    def validate_search_term(cls, v):
        if v is not None:
            # Remove extra whitespace
            v = " ".join(v.split())
            if not v.strip():
                raise ValueError("Search term cannot be empty or only whitespace")
            # Validate pattern
            if not re.match(SEARCH_TERM_PATTERN, v):
                raise ValueError("Search term contains invalid characters")
        return v


# Error response models
class ValidationErrorResponse(BaseModel):
    """Validation error response model."""

    error: str = Field(..., description="Error message")
    field: str = Field(..., description="Field that failed validation")
    value: Optional[str] = Field(None, description="Invalid value provided")
    detail: Optional[str] = Field(None, description="Detailed error information")


class ErrorResponse(BaseModel):
    """Generic error response model."""

    error: str = Field(..., description="Error message")
    detail: Optional[str] = Field(None, description="Detailed error information")
    code: Optional[int] = Field(None, description="Error code")
    request_id: Optional[str] = Field(None, description="Correlation ID for this request")
