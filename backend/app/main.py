import logging
import time
from contextlib import asynccontextmanager
from pathlib import Path

import polars as pl
from fastapi import Depends, FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import ValidationError

from .api import router
from .core.config import settings
from .core.validation import validation_exception_handler
from .dependencies import get_query_service
from .services.query_service import QueryService

# Enable Polars string cache for categorical comparisons
pl.enable_string_cache()

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)

logger = logging.getLogger(__name__)


def create_app():
    # Lifespan to manage app-scoped QueryService
    @asynccontextmanager
    async def lifespan(app: FastAPI):
        try:
            if getattr(app.state, "query_service", None) is None:
                app.state.query_service = QueryService()
                logger.info("QueryService initialized and stored in app.state")
        except Exception:
            logger.exception("Failed to initialize QueryService during startup")
            raise
        try:
            yield
        finally:
            try:
                qs = getattr(app.state, "query_service", None)
                if qs is not None:
                    qs.close()
                    logger.info("QueryService closed on shutdown")
            except Exception:
                logger.exception("Error during QueryService shutdown")

    app = FastAPI(
        title="Fantasy Draft Analytics API",
        description="RESTful API for fantasy football draft analysis and player combinations",
        version="1.0.0",
        docs_url="/docs",
        redoc_url="/redoc",
        lifespan=lifespan,
    )

    # Ensure a usable QueryService for environments that don't trigger lifespan (some tests)
    if getattr(app.state, "query_service", None) is None:
        try:
            app.state.query_service = QueryService()
        except Exception:
            logger.exception("Failed to initialize QueryService during app creation")

    # Security middleware
    app.add_middleware(
        TrustedHostMiddleware,
        allowed_hosts=settings.ALLOWED_HOSTS,
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

    # Register validation exception handler
    app.add_exception_handler(ValidationError, validation_exception_handler)

    # Inject dependency into sub-routers by setting dependency for router include
    app.include_router(router, prefix="/api", dependencies=[Depends(get_query_service)])

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
