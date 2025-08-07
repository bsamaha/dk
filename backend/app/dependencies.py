from fastapi import HTTPException, Request

from .services.query_service import QueryService


def get_query_service(request: Request) -> QueryService:
    """Retrieve the app-scoped QueryService from app.state.

    Raises 503 if unavailable (startup failure or misconfiguration).
    """
    query_service = getattr(request.app.state, "query_service", None)
    if query_service is None:
        raise HTTPException(status_code=503, detail="Query service unavailable")
    return query_service
