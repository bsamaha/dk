import logging
from typing import List, Optional

from fastapi import APIRouter, HTTPException, Query

from ..models.schemas import (
    PageInfo,
    PlayerDetailsResponse,
    PlayersResponse,
    Position,
    SortableColumn,
    SortOrder,
)
from ..services.query_service import query_service

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/", response_model=PlayersResponse)
async def get_players(
    positions: Optional[List[Position]] = Query(None),
    search_term: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    sort_by: SortableColumn = Query(SortableColumn.AVG_PICK),
    sort_order: SortOrder = Query(SortOrder.ASC),
):
    """Get players with optional filtering and pagination."""
    try:
        players, total_count = query_service.get_players(
            positions=positions,
            search_term=search_term,
            limit=limit,
            offset=offset,
            sort_by=sort_by,
            sort_order=sort_order,
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
    except Exception:
        logger.exception("Error getting players")
        raise HTTPException(status_code=500, detail="An internal error occurred")


@router.get("/search", response_model=PlayersResponse)
async def search_players(
    q: str = Query(..., min_length=1),
    limit: int = Query(50, ge=1, le=100),
):
    """Search players by name."""
    try:
        players, total_count = query_service.get_players(
            search_term=q,
            limit=limit,
            offset=0,
        )

        return PlayersResponse(
            players=players,
            total_count=total_count,
            page_info=PageInfo(
                total_count=total_count,
                limit=limit,
                offset=0,
                has_next=False,
                has_previous=False,
                current_page=1,
                total_pages=1,
            ),
        )
    except Exception:
        logger.exception("Error searching players")
        raise HTTPException(status_code=500, detail="An internal error occurred")


@router.get("/details", response_model=PlayerDetailsResponse)
async def get_player_details(
    player_name: str = Query(...),
    position: str = Query(...),
    team: str = Query(...),
):
    """Get detailed statistics for a specific player."""
    try:
        details = query_service.get_player_details(player_name, position, team)

        if not details:
            raise HTTPException(status_code=404, detail="Player not found")

        return PlayerDetailsResponse(**details)
    except HTTPException:
        raise
    except Exception:
        logger.exception("Error getting player details")
        raise HTTPException(status_code=500, detail="An internal error occurred")
