"""New analytics endpoints powered by DuckDB."""

from fastapi import APIRouter, HTTPException, Query
import logging
from typing import List

from ..models.schemas import (
    HeatMapResponse,
    HeatMapCell,
    StackFinderResponse,
    StackEntry,
    DriftResponse,
    DriftEntry,
    DraftSlotRow,
    DraftSlotResponse,
)
from ..services.analytics_service import analytics_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/heat-map", response_model=HeatMapResponse)
async def get_heat_map():
    try:
        cells = [HeatMapCell(**c) for c in analytics_service.get_heat_map()]
        total = sum(c.count for c in cells)
        return HeatMapResponse(cells=cells, total_picks=total)
    except Exception as exc:
        logger.exception("Heat map error: %s", exc)
        raise HTTPException(status_code=500, detail="Failed to compute heat map")


@router.get("/stacks", response_model=StackFinderResponse)
async def get_stacks(n_rounds: int = Query(10, ge=1, le=20), limit: int = Query(100, ge=1, le=1000)):
    try:
        stacks = [StackEntry(**row) for row in analytics_service.get_stacks(n_rounds, limit)]
        return StackFinderResponse(stacks=stacks, total_stacks=len(stacks))
    except Exception as exc:
        logger.exception("Stack finder error: %s", exc)
        raise HTTPException(status_code=500, detail="Failed to compute stacks")


@router.get("/draft-slot", response_model=DraftSlotResponse)
async def get_draft_slot(
    slot: int = Query(..., ge=1, le=12),
    metric: str = Query("percent", regex="^(count|percent|ratio)$"),
    top_n: int = Query(25, ge=1, le=100),
):
    try:
        rows = [DraftSlotRow(**r) for r in analytics_service.get_draft_slot_correlation(slot, metric, top_n)]
        return DraftSlotResponse(slot=slot, metric=metric, rows=rows)
    except Exception as exc:
        logger.exception("Draft slot correlation error: %s", exc)
        raise HTTPException(status_code=500, detail="Failed to compute draft slot correlation")


@router.get("/drift", response_model=DriftResponse)
async def get_adp_drift(limit: int = Query(100, ge=1, le=1000)):
    try:
        drifts = [DriftEntry(**d) for d in analytics_service.get_adp_drift()[:limit]]
        return DriftResponse(drifts=drifts)
    except Exception as exc:
        logger.exception("Drift error: %s", exc)
        raise HTTPException(status_code=500, detail="Failed to compute ADP drift")
