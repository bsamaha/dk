from fastapi import APIRouter, HTTPException
import logging

from ..models.schemas import MetadataResponse, ErrorResponse
from ..services.data_service import data_service

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/", response_model=MetadataResponse)
async def get_metadata():
    """Get dataset metadata including player count, draft count, and all players."""
    try:
        logger.info("Fetching dataset metadata")
        metadata = data_service.get_metadata()
        
        return MetadataResponse(
            total_players=metadata["total_players"],
            total_drafts=metadata["total_drafts"],
            total_teams=metadata["total_teams"],
            all_players=metadata["all_players"]
        )
    
    except Exception as e:
        logger.error(f"Error fetching metadata: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch metadata: {str(e)}"
        )
