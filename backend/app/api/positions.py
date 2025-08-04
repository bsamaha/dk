import logging
from typing import Dict, List, Optional

from fastapi import APIRouter, HTTPException, Path, Query, Request
from pydantic import ValidationError

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
from ..services.query_service import query_service

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/stats", response_model=PositionStatsResponse)
async def get_position_stats():
    """Get statistics for all positions and log raw payload when validation fails."""
    try:
        stats = query_service.get_position_stats()
        # Enforce non-null total_drafted values before summing
        if any(stat.total_drafted is None for stat in stats):
            raise ValueError("total_drafted must not be None in position stats")
        total_picks = sum(stat.total_drafted for stat in stats)
        # Let Pydantic validate – if any field is wrong this raises ValidationError
        return PositionStatsResponse(position_stats=stats, total_picks=total_picks)
    except ValidationError as exc:  # type: ignore[pylint]
        # Log both the validation error and the redacted payload to make debugging easier
        logger.error("Schema validation failed for /positions/stats -> %s", exc)
        try:
            import dataclasses
            import json

            from pydantic import BaseModel

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

            raw_payload = [
                s.dict()
                if isinstance(s, BaseModel)
                else dataclasses.asdict(s)
                if dataclasses.is_dataclass(s)
                else str(s)
                for s in stats
            ]
            redacted_payload = redact_pii(raw_payload)
            logger.error(
                "Redacted payload for /positions/stats -> %s",
                json.dumps(redacted_payload),
            )
        except Exception:  # pragma: no cover – logging helper should never crash
            logger.exception("Failed to serialise offending payload for log")
        raise HTTPException(status_code=500, detail="Invalid position stats payload")
    except Exception:
        logger.exception("Error getting position stats")
        raise HTTPException(status_code=500, detail="An internal error occurred")


@router.get("/stats/first_player")
async def get_first_player_position_stats():
    """Get the avg, min, and max pick for the first player drafted at each position."""
    try:
        stats = query_service.get_first_player_draft_stats()
        return {"first_player_stats": stats}
    except Exception:
        logger.exception("Error getting first player stats")
        raise HTTPException(status_code=500, detail="An internal error occurred")


@router.get("/stats/{position}/by_round")
async def get_position_draft_counts_by_round(
    request: Request,
    position: Position = Path(...),
    aggregation: AggregationType = AggregationType.MEAN,
) -> List[PositionRoundCount]:
    """Get draft counts by round for a specific position."""
    try:
        # Validate query parameters using Pydantic schema
        params = PositionStatsQueryParams(position=position, aggregation=aggregation)

        return query_service.get_position_draft_counts_by_round(
            position=params.position, aggregation=params.aggregation
        )
    except Exception:
        logger.exception("Error getting position draft counts")
        raise HTTPException(status_code=500, detail="An internal error occurred")


@router.get("/roster-construction")
async def get_roster_construction() -> List[RosterConstruction]:
    """Get roster construction statistics."""
    try:
        return query_service.get_roster_construction()
    except Exception:
        logger.exception("Error getting roster construction")
        raise HTTPException(status_code=500, detail="An internal error occurred")


@router.get("/roster-construction/counts")
async def get_roster_construction_counts(
    request: Request,
    required_players: Optional[List[str]] = Query(None),
) -> List[Dict[str, int]]:
    """Get aggregated counts of unique roster constructions."""
    try:
        # Validate query parameters using Pydantic schema
        params = RosterConstructionCountsQueryParams(required_players=required_players)

        return query_service.get_roster_construction_counts(
            required_players=params.required_players
        )
    except Exception:
        logger.exception("Error getting roster construction counts")
        raise HTTPException(status_code=500, detail="An internal error occurred")
