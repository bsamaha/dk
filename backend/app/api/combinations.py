import logging
from typing import List, Optional

from fastapi import APIRouter, HTTPException, Query

from ..services.query_service import query_service

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/")
async def get_player_combinations(
    required_players: List[str] = Query(...),
    n_rounds: int = Query(20, ge=1, le=20),
    limit: int = Query(100, ge=1, le=1000),
):
    """Get teams that drafted all specified players within the first n rounds."""
    try:
        combinations = query_service.get_player_combinations(
            required_players=required_players,
            n_rounds=n_rounds,
            limit=limit,
        )
        return {
            "required_players": required_players,
            "n_rounds": n_rounds,
            "combinations": combinations,
            "total_found": len(combinations),
        }
    except Exception:
        logger.exception("Error getting player combinations")
        raise HTTPException(status_code=500, detail="An internal error occurred")


@router.get("/roster-construction/")
async def get_roster_construction():
    """Get roster construction counts."""
    try:
        return {"roster_constructions": query_service.get_roster_construction()}
    except Exception:
        logger.exception("Error getting roster construction")
        raise HTTPException(status_code=500, detail="An internal error occurred")


@router.get("/roster-construction/counts/")
async def get_roster_construction_counts(
    required_players: Optional[List[str]] = Query(None),
):
    """Get aggregated counts of unique roster constructions."""
    try:
        return {
            "roster_construction_counts": query_service.get_roster_construction_counts(
                required_players=required_players
            )
        }
    except Exception:
        logger.exception("Error getting roster construction counts")
        raise HTTPException(status_code=500, detail="An internal error occurred")
