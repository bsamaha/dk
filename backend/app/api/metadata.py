import logging

from fastapi import APIRouter, Depends, HTTPException

from ..dependencies import get_query_service
from ..models.schemas import MetadataResponse
from ..services.query_service import QueryService

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/", response_model=MetadataResponse)
async def get_metadata(qs: QueryService = Depends(get_query_service)):
    """Get metadata about the dataset."""
    try:
        metadata = qs.get_metadata()
        return MetadataResponse(**metadata)
    except Exception:
        logger.exception("Error getting metadata")
        raise HTTPException(status_code=500, detail="An internal error occurred")
