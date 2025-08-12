import logging
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from starlette.concurrency import run_in_threadpool

from ..dependencies import get_query_service
from ..models.schemas import (
    PageInfo,
    PlayerDetailsResponse,
    PlayersResponse,
    Position,
    SortableColumn,
    SortOrder,
)
from ..models.validation import (
    PlayerDetailsQueryParams,
    PlayerSearchQueryParams,
    PlayersQueryParams,
)
from ..services.query_service import QueryService

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/", response_model=PlayersResponse)
async def get_players(
    request: Request,
    positions: Optional[List[Position]] = Query(None),
    search_term: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    sort_by: SortableColumn = Query(SortableColumn.AVG_PICK),
    sort_order: SortOrder = Query(SortOrder.ASC),
    qs: QueryService = Depends(get_query_service),
):
    """Get players with optional filtering and pagination."""
    # Validate query parameters using Pydantic schema
    params = PlayersQueryParams(
        positions=positions,
        search_term=search_term,
        limit=limit,
        offset=offset,
        sort_by=sort_by,
        sort_order=sort_order,
    )

    players, total_count = await run_in_threadpool(
        qs.get_players,
        positions=params.positions,
        search_term=params.search_term,
        limit=params.limit,
        offset=params.offset,
        sort_by=params.sort_by,
        sort_order=params.sort_order,
    )

    return PlayersResponse(
        players=players,
        total_count=total_count,
        page_info=PageInfo(
            total_count=total_count,
            limit=limit,
            offset=offset,
            has_next=offset + limit < total_count,
            has_previous=offset > 0,
            current_page=(offset // limit) + 1,
            total_pages=(total_count + limit - 1) // limit if limit > 0 else 1,
        ),
    )


@router.get("/search", response_model=PlayersResponse)
async def search_players(
    request: Request,
    q: str = Query(..., min_length=1),
    limit: int = Query(50, ge=1, le=100),
    qs: QueryService = Depends(get_query_service),
):
    """Search players by name."""
    # Validate query parameters using Pydantic schema
    params = PlayerSearchQueryParams(q=q, limit=limit)

    players, total_count = await run_in_threadpool(
        qs.get_players,
        search_term=params.q,
        limit=params.limit,
        offset=0,
    )

    return PlayersResponse(
        players=players,
        total_count=total_count,
        page_info=PageInfo(
            total_count=total_count,
            limit=limit,
            offset=0,
            has_next=total_count > limit,
            has_previous=False,
            current_page=1,
            total_pages=(total_count + limit - 1) // limit if limit > 0 else 1,
        ),
    )


@router.get("/details", response_model=PlayerDetailsResponse)
async def get_player_details(
    request: Request,
    player_name: str = Query(...),
    position: str = Query(...),
    team: str = Query(...),
    qs: QueryService = Depends(get_query_service),
):
    """Get detailed statistics for a specific player."""
    # Validate query parameters using Pydantic schema
    params = PlayerDetailsQueryParams(
        player_name=player_name, position=position, team=team
    )

    details = await run_in_threadpool(
        qs.get_player_details, params.player_name, params.position, params.team
    )

    if details["total_drafts"] == 0:
        raise HTTPException(status_code=404, detail="Player not found")

    return PlayerDetailsResponse(**details)
