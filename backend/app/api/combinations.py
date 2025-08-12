import logging
from typing import List, Optional

from fastapi import APIRouter, Depends, Query, Request

from ..core.async_utils import run_service
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
    limit: int = Query(50, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    qs: QueryService = Depends(get_query_service),
):
    """Get teams that drafted all specified players within the first n rounds."""
    # Validate query parameters using Pydantic schema
    params = CombinationsQueryParams(
        required_players=required_players,
        n_rounds=n_rounds,
        limit=limit,
        offset=offset,
    )

    # Fetch total count (without pagination) and a paged window
    combinations_all = await run_service(
        qs.get_player_combinations,
        params.required_players,
        params.n_rounds,
        1000,  # cap for safety to avoid runaway
        0,
    )
    total_count = len(combinations_all)
    combinations = await run_service(
        qs.get_player_combinations,
        params.required_players,
        params.n_rounds,
        params.limit,
        params.offset,
    )
    return {
        "combinations": combinations,
        "total_combinations": total_count,
        "filter_applied": {
            "required_players": params.required_players,
            "n_rounds": params.n_rounds,
            "limit": params.limit,
            "offset": params.offset,
        },
    }


@router.get("/roster-construction/")
async def get_roster_construction(qs: QueryService = Depends(get_query_service)):
    """Get roster construction counts."""
    result = await run_service(qs.get_roster_construction)
    return {"roster_constructions": result}


@router.get("/roster-construction/counts/")
async def get_roster_construction_counts(
    request: Request,
    required_players: Optional[List[str]] = Query(None),
    qs: QueryService = Depends(get_query_service),
):
    """Get aggregated counts of unique roster constructions."""
    # Validate query parameters using Pydantic schema
    params = RosterConstructionCountsQueryParams(required_players=required_players)
    counts = await run_service(
        qs.get_roster_construction_counts, params.required_players
    )
    return {"roster_construction_counts": counts}
