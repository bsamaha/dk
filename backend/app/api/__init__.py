from fastapi import APIRouter

from . import metadata, players, positions, combinations, analytics

router = APIRouter()

# Include all route modules
router.include_router(metadata.router, prefix="/metadata", tags=["metadata"])
router.include_router(players.router, prefix="/players", tags=["players"])
router.include_router(positions.router, prefix="/positions", tags=["positions"])
router.include_router(combinations.router, prefix="/combinations", tags=["combinations"])
# analytics router already defines its own prefix
router.include_router(analytics.router)
