import logging
from typing import Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Path, Query, Request
from pydantic import ValidationError
from starlette.concurrency import run_in_threadpool

from ..dependencies import get_query_service
from ..models.schemas import (
    AggregationType,
    Position,
    PositionRoundCount,
    PositionStatsResponse,
    RosterConstruction,
)
from ..models.validation import (
    PositionStatsQueryParams,
    RosterConstructionCountsQueryParams,
)
from ..services.query_service import QueryService

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/stats", response_model=PositionStatsResponse)
async def get_position_stats(qs: QueryService = Depends(get_query_service)):
    """Get statistics for all positions and log raw payload when validation fails."""
    try:
        stats = await run_in_threadpool(qs.get_position_stats)
        # Compute total picks defensively; treat None as 0
        total_picks = sum((s.total_drafted or 0) for s in stats)
        return PositionStatsResponse(position_stats=stats, total_picks=total_picks)
    except ValidationError as exc:  # type: ignore[pylint]
        # Log both the validation error and the redacted payload to make debugging easier
        logger.error("Schema validation failed for /positions/stats -> %s", exc)
        try:
            import json

            # Helper to redact sensitive fields
            def redact_pii(
                data, pii_keys={"email", "name", "ssn", "password", "token"}
            ):
                if isinstance(data, dict):
                    return {
                        k: (
                            "<redacted>"
                            if k.lower() in pii_keys
                            else redact_pii(v, pii_keys)
                        )
                        for k, v in data.items()
                    }
                elif isinstance(data, list):
                    return [redact_pii(item, pii_keys) for item in data]
                return data

            # If stats failed to initialize earlier, ensure we don't reference it
            raw_payload = []
            redacted_payload = redact_pii(raw_payload)
            logger.error(
                "Redacted payload for /positions/stats -> %s",
                json.dumps(redacted_payload),
            )
        except Exception:  # pragma: no cover – logging helper should never crash
            logger.exception("Failed to serialise offending payload for log")
        raise HTTPException(
            status_code=500, detail="Invalid position stats payload"
        ) from exc
    except Exception as exc:
        logger.exception("Error getting position stats")
        raise HTTPException(
            status_code=500, detail="An internal error occurred"
        ) from exc


@router.get("/stats/first_player")
async def get_first_player_position_stats(
    qs: QueryService = Depends(get_query_service),
):
    """Get the avg, min, and max pick for the first player drafted at each position."""
    try:
        stats = await run_in_threadpool(qs.get_first_player_draft_stats)
        return {"first_player_stats": stats}
    except Exception as exc:
        logger.exception("Error getting first player stats")
        raise HTTPException(
            status_code=500, detail="An internal error occurred"
        ) from exc


@router.get("/stats/{position}/by_round")
async def get_position_draft_counts_by_round(
    request: Request,
    position: Position = Path(...),
    aggregation: AggregationType = AggregationType.MEAN,
    qs: QueryService = Depends(get_query_service),
) -> List[PositionRoundCount]:
    """Get draft counts by round for a specific position."""
    try:
        # Validate query parameters using Pydantic schema
        params = PositionStatsQueryParams(position=position, aggregation=aggregation)

        return await run_in_threadpool(
            qs.get_position_draft_counts_by_round, params.position, params.aggregation
        )
    except Exception as exc:
        logger.exception("Error getting position draft counts")
        raise HTTPException(
            status_code=500, detail="An internal error occurred"
        ) from exc


@router.get("/roster-construction")
async def get_roster_construction(
    qs: QueryService = Depends(get_query_service),
) -> List[RosterConstruction]:
    """Get roster construction statistics."""
    try:
        return await run_in_threadpool(qs.get_roster_construction)
    except Exception as exc:
        logger.exception("Error getting roster construction")
        raise HTTPException(
            status_code=500, detail="An internal error occurred"
        ) from exc


@router.get("/roster-construction/counts")
async def get_roster_construction_counts(
    request: Request,
    required_players: Optional[List[str]] = Query(None),
    qs: QueryService = Depends(get_query_service),
) -> List[Dict[str, int]]:
    """Get aggregated counts of unique roster constructions."""
    try:
        # Validate query parameters using Pydantic schema
        params = RosterConstructionCountsQueryParams(required_players=required_players)

        return await run_in_threadpool(
            qs.get_roster_construction_counts, params.required_players
        )
    except Exception as exc:
        logger.exception("Error getting roster construction counts")
        raise HTTPException(
            status_code=500, detail="An internal error occurred"
        ) from exc
