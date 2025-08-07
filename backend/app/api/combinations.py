import logging
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request

from ..dependencies import get_query_service
from ..models.validation import (
    CombinationsQueryParams,
    RosterConstructionCountsQueryParams,
)
from ..services.query_service import QueryService

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/")
async def get_player_combinations(
    required_players: List[str] = Query(...),
    n_rounds: int = Query(20, ge=1, le=20),
    limit: int = Query(100, ge=1, le=1000),
    qs: QueryService = Depends(get_query_service),
):
    """Get teams that drafted all specified players within the first n rounds."""
    try:
        # Validate query parameters using Pydantic schema
        params = CombinationsQueryParams(
            required_players=required_players,
            n_rounds=n_rounds,
            limit=limit,
        )

        combinations = qs.get_player_combinations(
            required_players=params.required_players,
            n_rounds=params.n_rounds,
            limit=params.limit,
        )
        return {
            "combinations": combinations,
            "total_combinations": len(combinations),
            "filter_applied": {
                "required_players": params.required_players,
                "n_rounds": params.n_rounds,
                "limit": params.limit,
            },
        }
    except Exception:
        logger.exception("Error getting player combinations")
        raise HTTPException(status_code=500, detail="An internal error occurred")


@router.get("/roster-construction/")
async def get_roster_construction(qs: QueryService = Depends(get_query_service)):
    """Get roster construction counts."""
    try:
        return {"roster_constructions": qs.get_roster_construction()}
    except Exception:
        logger.exception("Error getting roster construction")
        raise HTTPException(status_code=500, detail="An internal error occurred")


@router.get("/roster-construction/counts/")
async def get_roster_construction_counts(
    request: Request,
    required_players: Optional[List[str]] = Query(None),
    qs: QueryService = Depends(get_query_service),
):
    """Get aggregated counts of unique roster constructions."""
    try:
        # Validate query parameters using Pydantic schema
        params = RosterConstructionCountsQueryParams(required_players=required_players)

        return {
            "roster_construction_counts": qs.get_roster_construction_counts(
                required_players=params.required_players
            )
        }
    except Exception:
        logger.exception("Error getting roster construction counts")
        raise HTTPException(status_code=500, detail="An internal error occurred")
