import logging
import time
import uuid
from contextlib import asynccontextmanager
from pathlib import Path

import polars as pl
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import ValidationError
from starlette.concurrency import run_in_threadpool

from .api import router
from .core.config import settings
from .core.logging import configure_logging
from .core.validation import (
    http_error_handler,
    unhandled_exception_handler,
    validation_exception_handler,
)
from .services.query_service import QueryService

# Enable Polars string cache for categorical comparisons
pl.enable_string_cache()

# Configure structured logging
configure_logging()

logger = logging.getLogger(__name__)


def _init_query_service(app: FastAPI) -> None:
    """Initialize and attach QueryService to app.state if missing."""
    if getattr(app.state, "query_service", None) is None:
        app.state.query_service = QueryService()
        logger.info("QueryService initialized and stored in app.state")


async def _close_query_service(app: FastAPI) -> None:
    """Close QueryService if present on app.state without blocking event loop."""
    qs = getattr(app.state, "query_service", None)
    if qs is not None:
        await run_in_threadpool(qs.close)
        logger.info("QueryService closed on shutdown")


def create_app():
    # Lifespan to manage app-scoped QueryService
    @asynccontextmanager
    async def lifespan(app: FastAPI):
        try:
            _init_query_service(app)
        except Exception:
            logger.exception("Failed to initialize QueryService during startup")
            raise
        try:
            yield
        finally:
            try:
                await _close_query_service(app)
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

    # Security middleware
    app.add_middleware(
        TrustedHostMiddleware,
        allowed_hosts=settings.ALLOWED_HOSTS,
    )

    # Request ID + timing middleware
    @app.middleware("http")
    async def request_id_middleware(request: Request, call_next):
        request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
        # Stash request_id early so downstream can use it
        if hasattr(request, "state"):
            setattr(request.state, "request_id", request_id)
        start = time.perf_counter()
        response = await call_next(request)
        elapsed_ms = int((time.perf_counter() - start) * 1000)
        if hasattr(request, "state"):
            setattr(request.state, "latency_ms", elapsed_ms)
        return response

    # Security headers + access log middleware
    @app.middleware("http")
    async def security_middleware(request: Request, call_next):
        response = await call_next(request)

        # Add security headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

        # Propagate request id to client
        request_id = getattr(request.state, "request_id", None)
        if request_id:
            response.headers["X-Request-ID"] = request_id

        # Structured access log
        latency_ms = getattr(request.state, "latency_ms", None)
        try:
            client_ip = request.client.host if request.client else None
        except Exception:
            client_ip = None
        logger.info(
            "request",
            extra={
                "request_id": request_id,
                "path": request.url.path,
                "method": request.method,
                "status_code": getattr(response, "status_code", None),
                "latency_ms": latency_ms,
                "client_ip": client_ip,
            },
        )

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
    # Register HTTPException to unify schema
    app.add_exception_handler(Exception, unhandled_exception_handler)
    app.add_exception_handler(HTTPException, http_error_handler)

    # Include API routers; individual endpoints use Depends(get_query_service)
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
