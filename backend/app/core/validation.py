"""Validation middleware and error handling for API endpoints."""

import logging
from typing import Any, Dict, List, Optional

from fastapi import HTTPException, Request, status
from fastapi.responses import JSONResponse
from pydantic import ValidationError

logger = logging.getLogger(__name__)


async def http_error_handler(request: Request, exc: HTTPException) -> JSONResponse:
    """Standard HTTPException handler that returns unified error schema with request_id."""
    request_id: Optional[str] = getattr(getattr(request, "state", object()), "request_id", None)

    # Map to unified error content
    detail = exc.detail if isinstance(exc.detail, str) else str(exc.detail)
    content = {
        "error": "HTTPException",
        "detail": detail,
        "code": exc.status_code,
        "request_id": request_id,
    }
    headers = {"X-Request-ID": request_id} if request_id else None
    return JSONResponse(status_code=exc.status_code, content=content, headers=headers)


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

    request_id: Optional[str] = getattr(getattr(request, "state", object()), "request_id", None)

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
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, content=error_response, headers=headers
    )


def validate_query_params(params: Dict[str, Any], validation_schema: Any) -> Any:
    """Validate query parameters using a Pydantic schema.

    Args:
        params: Dictionary of query parameters
        validation_schema: Pydantic model class for validation

    Returns:
        Validated parameters as Pydantic model instance

    Raises:
        HTTPException: If validation fails
    """
    try:
        # Convert empty strings to None for optional fields
        cleaned_params = {}
        for key, value in params.items():
            if value == "":
                cleaned_params[key] = None
            else:
                cleaned_params[key] = value

        validated_params = validation_schema(**cleaned_params)
        return validated_params
    except ValidationError as e:
        # Convert validation error to HTTP exception (preserve cause)
        errors = []
        for error in e.errors():
            field_path = " -> ".join(str(loc) for loc in error["loc"])
            errors.append(f"{field_path}: {error['msg']}")

        error_message = "; ".join(errors)
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid query parameters: {error_message}",
        ) from e


def sanitize_string_input(value: str, max_length: int = 100) -> str:
    """Sanitize string input by removing extra whitespace and limiting length.

    Args:
        value: Input string to sanitize
        max_length: Maximum allowed length

    Returns:
        Sanitized string

    Raises:
        HTTPException: If input is invalid
    """
    if not isinstance(value, str):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Input must be a string"
        )

    # Remove extra whitespace
    sanitized = " ".join(value.split())

    if not sanitized.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Input cannot be empty or only whitespace",
        )

    if len(sanitized) > max_length:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Input too long. Maximum length is {max_length} characters",
        )

    return sanitized


def validate_list_input(values: List[str], max_items: int = 100) -> List[str]:
    """Validate and sanitize list input.

    Args:
        values: List of values to validate
        max_items: Maximum number of items allowed

    Returns:
        Sanitized list of unique values

    Raises:
        HTTPException: If input is invalid
    """
    if not isinstance(values, list):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Input must be a list"
        )

    if len(values) > max_items:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Too many items. Maximum allowed is {max_items}",
        )

    # Remove duplicates while preserving order
    seen = set()
    unique_values = []
    for value in values:
        if isinstance(value, str):
            sanitized = sanitize_string_input(value)
            if sanitized not in seen:
                seen.add(sanitized)
                unique_values.append(sanitized)
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="All items must be strings",
            )

    return unique_values


def validate_integer_range(
    value: int, min_value: int, max_value: int, field_name: str
) -> int:
    """Validate integer input within a specified range.

    Args:
        value: Integer value to validate
        min_value: Minimum allowed value
        max_value: Maximum allowed value
        field_name: Name of the field for error messages

    Returns:
        Validated integer

    Raises:
        HTTPException: If input is invalid
    """
    if not isinstance(value, int):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"{field_name} must be an integer",
        )

    if value < min_value or value > max_value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"{field_name} must be between {min_value} and {max_value}",
        )

    return value


def validate_enum_value(value: str, valid_values: List[str], field_name: str) -> str:
    """Validate that a string value is one of the allowed enum values.

    Args:
        value: String value to validate
        valid_values: List of valid values
        field_name: Name of the field for error messages

    Returns:
        Validated string

    Raises:
        HTTPException: If input is invalid
    """
    if not isinstance(value, str):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"{field_name} must be a string",
        )

    sanitized = sanitize_string_input(value)

    if sanitized not in valid_values:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"{field_name} must be one of: {', '.join(valid_values)}",
        )

    return sanitized


async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Catch-all handler for unexpected exceptions.

    Lets HTTPException and ValidationError propagate to their dedicated handlers.
    Returns a consistent 500 response for other exceptions.
    """
    if isinstance(exc, (HTTPException, ValidationError)):
        # Defer to FastAPI's default or our registered handlers
        raise exc

    request_id: Optional[str] = getattr(getattr(request, "state", object()), "request_id", None)

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
