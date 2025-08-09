"""New analytics endpoints powered by DuckDB."""

import logging

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import ValidationError

from ..dependencies import get_query_service
from ..models.schemas import Week17BringBackPlayer, Week17BringBackResponse
from ..models.validation import (
    AnalyticsDraftSlotQueryParams,
    AnalyticsStacksQueryParams,
    AnalyticsWeek17BringBackQueryParams,
)
from ..services.query_service import QueryService

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/heat-map")
async def get_heat_map(qs: QueryService = Depends(get_query_service)):
    """Get heat map data showing pick counts by round and position."""
    try:
        return {"heat_map": qs.get_heat_map()}
    except Exception:
        logger.exception("Error getting heat map")
        raise HTTPException(status_code=500, detail="An internal error occurred")


@router.get("/stacks")
async def get_stacks(
    n_rounds: int = Query(10, ge=1, le=20),
    limit: int = Query(100, ge=1, le=1000),
    qs: QueryService = Depends(get_query_service),
):
    """Find QB/receiver stacks drafted within first n_rounds."""
    try:
        # Validate query parameters using Pydantic schema
        params = AnalyticsStacksQueryParams(n_rounds=n_rounds, limit=limit)

        return {"stacks": qs.get_stacks(n_rounds=params.n_rounds, limit=params.limit)}
    except Exception:
        logger.exception("Error getting stacks")
        raise HTTPException(status_code=500, detail="An internal error occurred")


@router.get("/draft-slot")
async def get_draft_slot_correlation(
    request: Request,
    slot: int = Query(..., ge=1, le=12),
    metric: str = Query("percent"),
    top_n: int = Query(25, ge=1, le=100),
    min_teams: int = Query(10, ge=1),
    qs: QueryService = Depends(get_query_service),
):
    """Get players most correlated with a specific draft slot."""
    try:
        # Validate query parameters using Pydantic schema
        params = AnalyticsDraftSlotQueryParams(
            slot=slot, metric=metric, top_n=top_n, min_teams=min_teams
        )

        return {
            "slot": params.slot,
            "metric": params.metric,
            "rows": qs.get_draft_slot_correlation(
                slot=params.slot,
                metric=params.metric,
                top_n=params.top_n,
                min_teams=params.min_teams,
            ),
        }
    except Exception:
        logger.exception("Error getting draft slot correlation")
        raise HTTPException(status_code=500, detail="An internal error occurred")


@router.get("/drift")
async def get_adp_drift(qs: QueryService = Depends(get_query_service)):
    """Get ADP drift between early and late drafts."""
    try:
        return {"adp_drift": qs.get_adp_drift()}
    except Exception:
        logger.exception("Error getting ADP drift")
        raise HTTPException(status_code=500, detail="An internal error occurred")


@router.get("/week17-bringback", response_model=Week17BringBackResponse)
async def get_week17_bringback(
    request: Request,
    scope: str = Query(
        ..., pattern="^(team|player)$", description="View scope: 'team' or 'player'"
    ),
    entity: str = Query(
        ..., description="Team abbreviation (e.g., 'BUF') or player name"
    ),
    limit: int = Query(10, ge=1, le=25, description="Number of top players to return"),
    qs: QueryService = Depends(get_query_service),
):
    """Get Week 17 bring back analytics data.

    - Team view: Shows most-drafted players from the selected team's Week 17 opponent
    - Player view: Shows opponent players most often drafted with the selected player
    """
    try:
        # Validate query parameters using Pydantic schema
        params = AnalyticsWeek17BringBackQueryParams(
            scope=scope, entity=entity, limit=limit
        )

        if params.scope == "team":
            # Team view - aggregate draft percentages
            players_data = qs.get_week17_bringback_team_view(
                params.entity, params.limit
            )
            opponent = qs.get_week17_opponent(params.entity)

            players = [
                Week17BringBackPlayer(
                    player=row["player"],
                    position=row["position"],
                    percentage=row["percentage"],
                    draft_count=row["draft_count"],
                    co_occurrence_count=None,
                )
                for row in players_data
            ]

        else:  # scope == "player"
            # Player view - conditional co-draft percentages
            players_data = qs.get_week17_bringback_player_view(
                params.entity, params.limit
            )

            # Get opponent from first result or query directly
            if players_data:
                # Get the player's team to find opponent
                player_team_result = qs.query(
                    "SELECT DISTINCT Team FROM picks WHERE player = ?", [params.entity]
                )
                if len(player_team_result) > 0:
                    player_team = player_team_result["Team"][0]
                    opponent = qs.get_week17_opponent(player_team)
                else:
                    opponent = None
            else:
                opponent = None

            players = [
                Week17BringBackPlayer(
                    player=row["player"],
                    position=row["position"],
                    percentage=row["percentage"],
                    draft_count=None,
                    co_occurrence_count=row["co_occurrence_count"],
                )
                for row in players_data
            ]

        return Week17BringBackResponse(
            scope=params.scope,
            entity=params.entity,
            opponent=opponent,
            total_drafts=qs.total_drafts,
            players=players,
        )

    except ValidationError:
        # Let the global validation exception handler deal with this
        raise
    except Exception:
        logger.exception(
            "Error getting Week 17 bring back data for %s: %s", scope, entity
        )
        raise HTTPException(status_code=500, detail="An internal error occurred")
