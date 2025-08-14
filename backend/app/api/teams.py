from fastapi import APIRouter, Depends, Query, Request
from starlette.concurrency import run_in_threadpool

from ..dependencies import get_query_service
from ..models.schemas import TeamsResponse
from ..services.query_service import QueryService

router = APIRouter()


@router.get("/", response_model=TeamsResponse)
async def get_teams(
    request: Request,
    limit: int = Query(100, ge=1, le=2000),
    qs: QueryService = Depends(get_query_service),
) -> TeamsResponse:
    """Return a paginated list of unique team names and total count."""

    def _query() -> TeamsResponse:
        # Unique teams and total count
        df = qs.query("SELECT DISTINCT Team AS team FROM picks ORDER BY team LIMIT ?", [limit])
        count_df = qs.query("SELECT COUNT(DISTINCT Team) AS cnt FROM picks")
        teams = df["team"].to_list() if not df.is_empty() else []
        total_count = int(count_df["cnt"][0]) if not count_df.is_empty() else 0
        return TeamsResponse(teams=teams, total_count=total_count)

    return await run_in_threadpool(_query)