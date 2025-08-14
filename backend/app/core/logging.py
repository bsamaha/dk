import json
import logging
from datetime import datetime, timezone
from typing import Any, Dict


class JSONLogFormatter(logging.Formatter):
    """Structured JSON log formatter.

    Emits logs with a consistent schema suitable for ingestion.
    Includes optional request-scoped fields if provided via `extra`.
    """

    def format(self, record: logging.LogRecord) -> str:  # type: ignore[override]
        base: Dict[str, Any] = {
            "timestamp": datetime.now(tz=timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }

        # Optional request-scoped fields
        for field in (
            "request_id",
            "path",
            "method",
            "status_code",
            "latency_ms",
            "client_ip",
            "event",
        ):
            value = getattr(record, field, None)
            if value is not None:
                base[field] = value

        # Include exception info if present
        if record.exc_info:
            base["exc_info"] = self.formatException(record.exc_info)

        return json.dumps(base, ensure_ascii=False)


def configure_logging(level: int = logging.INFO) -> None:
    """Configure root logging to use JSON formatter.

    Idempotent and safe to call multiple times.
    """
    root = logging.getLogger()
    root.setLevel(level)

    # Clear existing handlers to avoid duplicate logs in reloads
    root.handlers = []

    handler = logging.StreamHandler()
    handler.setFormatter(JSONLogFormatter())
    root.addHandler(handler)