import logging
from typing import List, Optional

from fastapi import APIRouter, Depends, Query, Request
from starlette.concurrency import run_in_threadpool

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
    # Validate query parameters using Pydantic schema
    params = CombinationsQueryParams(
        required_players=required_players,
        n_rounds=n_rounds,
        limit=limit,
    )

    combinations = await run_in_threadpool(
        qs.get_player_combinations,
        params.required_players,
        params.n_rounds,
        params.limit,
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


@router.get("/roster-construction/")
async def get_roster_construction(qs: QueryService = Depends(get_query_service)):
    """Get roster construction counts."""
    result = await run_in_threadpool(qs.get_roster_construction)
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
    counts = await run_in_threadpool(
        qs.get_roster_construction_counts, params.required_players
    )
    return {"roster_construction_counts": counts}
