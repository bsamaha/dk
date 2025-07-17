import logging
import time
from pathlib import Path

import polars as pl
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.staticfiles import StaticFiles

from .api import router
from .core.config import settings

# Enable Polars string cache for categorical comparisons
pl.enable_string_cache()

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)

logger = logging.getLogger(__name__)


def create_app():
    app = FastAPI(
        title="Fantasy Draft Analytics API",
        description="RESTful API for fantasy football draft analysis and player combinations",
        version="1.0.0",
        docs_url="/docs",
        redoc_url="/redoc",
    )

    # Security middleware
    app.add_middleware(
        TrustedHostMiddleware,
        allowed_hosts=["*"],  # Configure with your actual domain in production
    )

    # Rate limiting and security headers middleware
    @app.middleware("http")
    async def security_middleware(request: Request, call_next):
        start_time = time.time()
        response = await call_next(request)
        process_time = time.time() - start_time

        # Add security headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["X-Process-Time"] = str(process_time)

        return response

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.ALLOWED_ORIGINS,
        allow_credentials=True,
        allow_methods=["GET", "POST"],  # Restrict to needed methods
        allow_headers=["*"],
    )

    app.include_router(router, prefix="/api")

    @app.get("/health")
    async def health_check():
        return {"status": "healthy"}

    _frontend_candidates = [
        Path(__file__).resolve().parent / "frontend_dist",
        Path(__file__).resolve().parent.parent / "frontend_dist",
        Path(__file__).resolve().parents[2] / "frontend_dist",
    ]
    for _dist_dir in _frontend_candidates:
        if _dist_dir.exists():
            logger.info("Serving frontend from %s", _dist_dir)
            app.mount(
                "/", StaticFiles(directory=str(_dist_dir), html=True), name="frontend"
            )
            break
    else:
        logger.warning("No built frontend found; API-only mode")

        @app.get("/")
        async def root():
            return {
                "message": "Fantasy Draft Analytics API",
                "version": "1.0.0",
                "docs": "/docs",
                "redoc": "/redoc",
            }

    return app


app = create_app()

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)  # nosec B104
