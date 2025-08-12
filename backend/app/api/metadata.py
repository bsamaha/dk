import logging

from fastapi import APIRouter, Depends
from starlette.concurrency import run_in_threadpool

from ..dependencies import get_query_service
from ..models.schemas import MetadataResponse
from ..services.query_service import QueryService

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/", response_model=MetadataResponse)
async def get_metadata(qs: QueryService = Depends(get_query_service)):
    """Get metadata about the dataset."""
    metadata = await run_in_threadpool(qs.get_metadata)
    return MetadataResponse(**metadata)
