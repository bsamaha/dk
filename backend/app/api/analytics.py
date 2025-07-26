"""New analytics endpoints powered by DuckDB."""

import logging

from fastapi import APIRouter, HTTPException, Query

from ..services.query_service import query_service

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/heat-map")
async def get_heat_map():
    """Get heat map data showing pick counts by round and position."""
    try:
        return {"heat_map": query_service.get_heat_map()}
    except Exception as e:
        logger.error(f"Error getting heat map: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stacks")
async def get_stacks(
    n_rounds: int = Query(10, ge=1, le=20),
    limit: int = Query(100, ge=1, le=1000),
):
    """Find QB/receiver stacks drafted within first n_rounds."""
    try:
        return {"stacks": query_service.get_stacks(n_rounds=n_rounds, limit=limit)}
    except Exception as e:
        logger.error(f"Error getting stacks: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/draft-slot")
async def get_draft_slot_correlation(
    slot: int = Query(..., ge=1, le=12),
    metric: str = Query("percent"),
    top_n: int = Query(25, ge=1, le=100),
    min_teams: int = Query(10, ge=1),
):
    """Get players most correlated with a specific draft slot."""
    try:
        return {
            "slot": slot,
            "metric": metric,
            "rows": query_service.get_draft_slot_correlation(
                slot=slot, metric=metric, top_n=top_n, min_teams=min_teams
            ),
        }
    except Exception as e:
        logger.error(f"Error getting draft slot correlation: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/drift")
async def get_adp_drift():
    """Get ADP drift between early and late drafts."""
    try:
        return {"adp_drift": query_service.get_adp_drift()}
    except Exception as e:
        logger.error(f"Error getting ADP drift: {e}")
        raise HTTPException(status_code=500, detail=str(e))
