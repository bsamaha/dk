import logging

from fastapi import APIRouter, HTTPException

from ..models.schemas import MetadataResponse
from ..services.query_service import query_service

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/", response_model=MetadataResponse)
async def get_metadata():
    """Get metadata about the dataset."""
    try:
        metadata = query_service.get_metadata()
        return MetadataResponse(**metadata)
    except Exception as e:
        logger.error(f"Error getting metadata: {e}")
        raise HTTPException(status_code=500, detail=str(e))
