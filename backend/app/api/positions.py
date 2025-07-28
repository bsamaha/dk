import logging
from typing import Dict, List, Optional

from fastapi import APIRouter, HTTPException, Path, Query

from ..models.schemas import (
    AggregationType,
    Position,
    PositionRoundCount,
    PositionStatsResponse,
    RosterConstruction,
)
from ..services.query_service import query_service

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/stats", response_model=PositionStatsResponse)
async def get_position_stats():
    """Get statistics for all positions."""
    try:
        stats = query_service.get_position_stats()
        total_picks = sum(stat.total_drafted for stat in stats)
        return PositionStatsResponse(position_stats=stats, total_picks=total_picks)
    except Exception:
        logger.exception("Error getting position stats")
        raise HTTPException(status_code=500, detail="An internal error occurred")


@router.get("/stats/first_player")
async def get_first_player_position_stats():
    """Get the avg, min, and max pick for the first player drafted at each position."""
    try:
        stats = query_service.get_first_player_draft_stats()
        return {"first_player_stats": stats}
    except Exception:
        logger.exception("Error getting first player stats")
        raise HTTPException(status_code=500, detail="An internal error occurred")


@router.get("/stats/{position}/by_round")
async def get_position_draft_counts_by_round(
    position: Position = Path(...),
    aggregation: AggregationType = AggregationType.MEAN,
) -> List[PositionRoundCount]:
    """Get draft counts by round for a specific position."""
    try:
        return query_service.get_position_draft_counts_by_round(
            position=position, aggregation=aggregation
        )
    except Exception:
        logger.exception("Error getting position draft counts")
        raise HTTPException(status_code=500, detail="An internal error occurred")


@router.get("/roster-construction")
async def get_roster_construction() -> List[RosterConstruction]:
    """Get roster construction statistics."""
    try:
        return query_service.get_roster_construction()
    except Exception:
        logger.exception("Error getting roster construction")
        raise HTTPException(status_code=500, detail="An internal error occurred")


@router.get("/roster-construction/counts")
async def get_roster_construction_counts(
    required_players: Optional[List[str]] = Query(None),
) -> List[Dict[str, int]]:
    """Get aggregated counts of unique roster constructions."""
    try:
        return query_service.get_roster_construction_counts(
            required_players=required_players
        )
    except Exception:
        logger.exception("Error getting roster construction counts")
        raise HTTPException(status_code=500, detail="An internal error occurred")
