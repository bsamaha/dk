from fastapi import APIRouter, HTTPException, Query
from typing import List
import logging

from ..models.schemas import CombinationsResponse, CombinationFilter, RosterConstructionResponse
from ..services.data_service import data_service  # still used for roster construction
from ..services.analytics_service import analytics_service

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/", response_model=CombinationsResponse, summary="Get Player Combinations")
async def get_player_combinations(
    required_players: List[str] = Query(..., description="List of players that must be on the same team"),
    n_rounds: int = Query(20, description="Number of draft rounds to consider (1-20)", ge=1, le=20),
    limit: int = Query(100, description="Maximum number of team results to return", ge=1, le=1000)
):
    """
    Find and return teams that have all of the `required_players` drafted within the first `n_rounds`.
    """
    try:
        logger.info(f"Fetching player combinations for players: {required_players} within {n_rounds} rounds")

        filter_params = CombinationFilter(
            required_players=required_players,
            n_rounds=n_rounds,
            limit=limit
        )

        combinations_data = analytics_service.get_player_combinations(
            required_players=required_players,
            n_rounds=n_rounds,
            limit=limit
        )

        return CombinationsResponse(
            combinations=combinations_data,
            total_combinations=len(combinations_data),
            filter_applied=filter_params
        )

    except Exception as e:
        logger.exception(f"Error fetching player combinations: {e}")
        raise HTTPException(
            status_code=500,
            detail="An unexpected error occurred while fetching player combinations."
        )


@router.get("/roster-construction/", response_model=RosterConstructionResponse, summary="Get Roster Construction Analysis")
async def get_roster_construction():
    """
    Get the roster construction for every team, showing counts of players at each position.
    """
    try:
        logger.info("Fetching roster construction data for all teams")

        roster_data = data_service.get_roster_construction()

        return RosterConstructionResponse(
            roster_constructions=roster_data
        )

    except Exception as e:
        logger.exception(f"Error fetching roster construction data: {e}")
        raise HTTPException(
            status_code=500,
            detail="An unexpected error occurred while fetching roster construction data."
        )
