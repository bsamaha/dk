from fastapi import APIRouter, HTTPException
import logging
from typing import List, Dict, Any

from ..models.schemas import (
    Position,
    PositionStatsResponse,
    ErrorResponse,
    FirstPlayerDraftStats,
    PositionRoundCountsResponse,
    AggregationType,
    RosterConstruction
)
from ..services.data_service import data_service

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/stats", response_model=PositionStatsResponse)
async def get_position_stats():
    """Get statistics by position including draft counts and averages."""
    try:
        logger.info("Fetching position statistics")
        
        position_stats = data_service.get_position_stats()
        total_picks = sum(stat.total_drafted for stat in position_stats)
        
        return PositionStatsResponse(
            position_stats=position_stats,
            total_picks=total_picks
        )
    
    except Exception as e:
        logger.error(f"Error fetching position stats: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch position statistics: {str(e)}"
        )

@router.get("/stats/first_player", response_model=List[FirstPlayerDraftStats])
async def get_first_player_position_stats():
    """Get the avg, min, and max pick for the first player drafted at each position."""
    try:
        logger.info("Fetching first player draft stats by position")
        stats = data_service.get_first_player_draft_stats()
        return stats
    except Exception as e:
        logger.error(f"Error fetching first player draft stats: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch first player draft stats: {str(e)}"
        )

@router.get("/stats/{position}/by_round", response_model=PositionRoundCountsResponse)
async def get_position_draft_counts_by_round(position: Position, aggregation: AggregationType = AggregationType.MEAN):
    """Get draft counts per round for a specific position."""
    try:
        logger.info(f"Fetching draft counts by round for position: {position.value}")
        round_counts = data_service.get_position_draft_counts_by_round(position, aggregation)
        return PositionRoundCountsResponse(
            position=position,
            round_counts=round_counts
        )
    except Exception as e:
        logger.error(f"Error fetching position draft counts by round for {position.value}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch position draft counts by round: {str(e)}"
        )

@router.get("/roster-construction", response_model=List[RosterConstruction])
async def get_roster_construction():
    """Get roster construction for each team across all drafts."""
    try:
        logger.info("Fetching roster construction data")
        constructions = data_service.get_roster_construction()
        return constructions
    except Exception as e:
        logger.error(f"Error fetching roster construction data: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/roster-construction/counts", response_model=List[Dict[str, Any]])
async def get_roster_construction_counts():
    """Get aggregated counts of unique roster constructions."""
    try:
        logger.info("Fetching aggregated roster construction counts")
        counts = data_service.get_roster_construction_counts()
        return counts
    except Exception as e:
        logger.error(f"Error fetching roster construction counts: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")
