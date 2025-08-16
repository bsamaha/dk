"""Validation middleware and error handling for API endpoints."""

import logging
from typing import Optional

from fastapi import HTTPException, Request, status
from fastapi.responses import JSONResponse
from pydantic import ValidationError

logger = logging.getLogger(__name__)


async def http_error_handler(request: Request, exc: Exception) -> JSONResponse:
    """Unified error schema for HTTPException.

    Signature uses ``Exception`` for broad compatibility with FastAPI/Starlette
    type hints on ``add_exception_handler``. We still only register this handler
    for ``HTTPException`` in app setup.
    """
    request_id: Optional[str] = getattr(
        getattr(request, "state", object()), "request_id", None
    )

    # Resolve status code and detail safely regardless of static type
    status_code: int = getattr(
        exc, "status_code", status.HTTP_500_INTERNAL_SERVER_ERROR
    )
    raw_detail = getattr(exc, "detail", str(exc))
    detail: str = raw_detail if isinstance(raw_detail, str) else str(raw_detail)

    content = {
        "error": "HTTPException",
        "detail": detail,
        "code": status_code,
        "request_id": request_id,
    }
    headers = {"X-Request-ID": request_id} if request_id else None
    return JSONResponse(status_code=status_code, content=content, headers=headers)


async def validation_exception_handler(
    request: Request, exc: Exception
) -> JSONResponse:
    """Handle Pydantic validation errors and return consistent error responses."""

    if not isinstance(exc, ValidationError):
        # If it's not a ValidationError, re-raise it
        raise exc

    errors = []
    for error in exc.errors():
        field_path = " -> ".join(str(loc) for loc in error["loc"])
        error_detail = {
            "field": field_path,
            "message": error["msg"],
            "type": error["type"],
            "value": str(error.get("input", ""))
            if error.get("input") is not None
            else None,
        }
        errors.append(error_detail)

    request_id: Optional[str] = getattr(
        getattr(request, "state", object()), "request_id", None
    )

    # Log validation errors for debugging (structured)
    logger.warning(
        "validation_error",
        extra={
            "request_id": request_id,
            "path": request.url.path,
            "method": request.method,
            "validation_errors": errors,
        },
    )

    # Return a structured error response
    error_response = {
        "error": "Validation failed",
        "detail": "One or more fields failed validation",
        "validation_errors": errors,
        "code": status.HTTP_422_UNPROCESSABLE_ENTITY,
        "request_id": request_id,
    }

    headers = {"X-Request-ID": request_id} if request_id else None
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content=error_response,
        headers=headers,
    )


async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Catch-all handler for unexpected exceptions.

    Lets HTTPException and ValidationError propagate to their dedicated handlers.
    Returns a consistent 500 response for other exceptions.
    """
    if isinstance(exc, (HTTPException, ValidationError)):
        # Defer to FastAPI's default or our registered handlers
        raise exc

    request_id: Optional[str] = getattr(
        getattr(request, "state", object()), "request_id", None
    )

    # Structured error log with context
    logger.exception(
        "unhandled_error",
        extra={
            "request_id": request_id,
            "path": request.url.path,
            "method": request.method,
        },
    )

    content = {
        "error": "Internal Server Error",
        "detail": "An internal error occurred",
        "code": status.HTTP_500_INTERNAL_SERVER_ERROR,
        "request_id": request_id,
    }
    headers = {"X-Request-ID": request_id} if request_id else None
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=content,
        headers=headers,
    )
