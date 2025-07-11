from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from pathlib import Path
from fastapi.middleware.cors import CORSMiddleware
import logging
import polars as pl

from .api import router
from .models.schemas import (
    Position, PlayerFilter, CombinationFilter, SortableColumn, SortOrder, AggregationType
)

# Enable Polars string cache for categorical comparisons
pl.enable_string_cache()
from .core.config import settings

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="Fantasy Draft Analytics API",
    description="RESTful API for fantasy football draft analysis and player combinations",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(router, prefix="/api")

# Try a few possible build locations for the compiled React app.
_frontend_candidates = [
    Path(__file__).resolve().parent / "frontend_dist",              # /app/backend/app/frontend_dist
    Path(__file__).resolve().parent.parent / "frontend_dist",       # /app/backend/frontend_dist
    Path(__file__).resolve().parents[2] / "frontend_dist",          # /app/frontend_dist
]
for _dist_dir in _frontend_candidates:
    if _dist_dir.exists():
        logger.info("Serving frontend from %s", _dist_dir)
        app.mount("/", StaticFiles(directory=str(_dist_dir), html=True), name="frontend")
        break
else:
    logger.warning("No built frontend found; API-only mode")

    @app.get("/")  # type: ignore
    async def root():
        """Root endpoint providing API information (shown only when frontend is absent)."""
        return {
            "message": "Fantasy Draft Analytics API",
            "version": "1.0.0",
            "docs": "/docs",
            "redoc": "/redoc"
        }

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
