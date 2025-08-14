from fastapi import APIRouter

from . import analytics, combinations, metadata, players, positions
from . import teams

router = APIRouter()

# Include all route modules
router.include_router(metadata.router, prefix="/metadata", tags=["metadata"])
router.include_router(players.router, prefix="/players", tags=["players"])
router.include_router(positions.router, prefix="/positions", tags=["positions"])
router.include_router(
    combinations.router, prefix="/combinations", tags=["combinations"]
)
router.include_router(analytics.router, prefix="/analytics", tags=["analytics"])
router.include_router(teams.router, prefix="/teams", tags=["teams"])
