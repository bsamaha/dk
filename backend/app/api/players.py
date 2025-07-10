from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
import logging

from ..models.schemas import (
    PlayersResponse, PlayerFilter, Position, ErrorResponse, PlayerDetailsResponse, SortableColumn, SortOrder, PageInfo
)
from ..services.data_service import data_service
from ..services.analytics_service import analytics_service

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/", response_model=PlayersResponse)
async def get_players(
    positions: Optional[List[Position]] = Query(None, description="Filter by positions"),
    search_term: Optional[str] = Query(None, description="Search term for player names"),
    limit: int = Query(100, description="Maximum number of results", ge=1, le=1000),
    offset: int = Query(0, description="Offset for pagination", ge=0),
    sort_by: Optional[SortableColumn] = Query(SortableColumn.AVG_PICK, description="Column to sort by"),
    sort_order: Optional[SortOrder] = Query(SortOrder.ASC, description="Sort order (asc or desc)")
):
    """Get players with optional filtering and pagination."""
    try:
        logger.info(f"Fetching players with filters: positions={positions}, search_term={search_term}")
        
        players, total_count = analytics_service.get_players(
            positions=positions,
            search_term=search_term,
            limit=limit,
            offset=offset,
            sort_by=sort_by,
            sort_order=sort_order
        )
        
        # Calculate pagination info
        page_info_obj = PageInfo(
            total_count=total_count,
            limit=limit,
            offset=offset,
            has_next=(offset + limit) < total_count,
            has_previous=offset > 0,
            current_page=(offset // limit) + 1,
            total_pages=(total_count + limit - 1) // limit if limit > 0 else 1
        )

        return PlayersResponse(
            players=players,
            page_info=page_info_obj,
            total_count=total_count
        )
    
    except Exception as e:
        logger.error(f"Error fetching players: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch players: {str(e)}"
        )


@router.get("/search")
async def search_players(
    q: str = Query(..., description="Search query for player names"),
    limit: int = Query(20, description="Maximum number of results", ge=1, le=100)
):
    """Search players by name."""
    try:
        logger.info(f"Searching players with query: {q}")
        
        players, total_count = analytics_service.get_players(
            search_term=q,
            limit=limit,
            offset=0
        )
        
        return {
            "query": q,
            "results": players,
            "total_found": total_count
        }
    
    except Exception as e:
        logger.error(f"Error searching players: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to search players: {str(e)}"
        )


@router.get("/details", response_model=PlayerDetailsResponse)
async def get_player_details(
    player_name: str = Query(..., description="Player's name"),
    position: str = Query(..., description="Player's position"),
    team: str = Query(..., description="Player's team"),
):
    """Get detailed draft data for a single player."""
    try:
        logger.info(f"Fetching details for player: {player_name}, position: {position}, team: {team}")
        details = data_service.get_player_details(player_name, position, team)
        if not details:
            raise HTTPException(status_code=404, detail="Player not found")
        return PlayerDetailsResponse(**details)
    except Exception as e:
        logger.error(f"Error fetching player details: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch player details: {str(e)}"
        )
