# Rate Limiting Implementation Plan

## 📋 Overview

This document outlines the implementation plan for adding rate limiting middleware to the Fantasy Draft Analytics API. The goal is to protect against abuse while maintaining good user experience for legitimate traffic.

## 🎯 Objectives

1. **Protect against abuse**: Prevent DDoS attacks and API abuse
2. **Maintain performance**: Ensure rate limiting doesn't impact legitimate users
3. **Simple implementation**: Start with basic functionality, add complexity as needed
4. **Fail-safe design**: Rate limiter failures shouldn't break the application
5. **Observability**: Provide metrics and monitoring capabilities

## 🎯 Architecture

### Current Infrastructure

```mermaid
Client → Nginx (10r/s) → FastAPI → Application Logic
```

### Target Architecture

```mermaid
Client → Nginx (10r/s) → FastAPI Rate Limiter → Application Logic
```

### Rate Limiting Layers

1. **Nginx Level**: Basic IP-based rate limiting (already implemented)
2. **Application Level**: Fine-grained, endpoint-specific rate limiting (to be implemented)

## 🔧 Implementation Plan

### Phase 1: Core Rate Limiting (Week 1)

#### 1.1 Dependencies

```python
# Add to backend/requirements.txt
slowapi>=0.1.9
redis>=5.0.0  # For production, memory for development
```

#### 1.2 Configuration Updates

```python
# backend/app/core/config.py
class Settings(BaseSettings):
    # Rate Limiting Settings
    RATE_LIMIT_ENABLED: bool = True
    RATE_LIMIT_STORAGE_URL: str = "memory://"  # "redis://localhost:6379" for production

    # Rate Limit Tiers (requests per minute)
    RATE_LIMIT_ANALYTICS: int = 5      # Complex queries
    RATE_LIMIT_SEARCH: int = 20        # High-frequency user-driven
    RATE_LIMIT_METADATA: int = 60      # Lightweight, informational
    RATE_LIMIT_COMBINATIONS: int = 10  # Complex calculations
    RATE_LIMIT_GENERAL: int = 30       # Default for other endpoints

    # Burst limits (multiplier of rate limit)
    RATE_LIMIT_BURST_MULTIPLIER: float = 2.0

    # Fail-safe settings
    RATE_LIMIT_FALLBACK_MODE: str = "open"  # fail open vs closed

    # IP Management
    RATE_LIMIT_WHITELIST: List[str] = []  # IPs with no limits
    RATE_LIMIT_BLACKLIST: List[str] = []  # IPs with zero limits
```

#### 1.3 Rate Limiting Service

```python
# backend/app/services/rate_limiter.py
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from fastapi import Request
import logging
from typing import Dict, List, Optional
from datetime import datetime

logger = logging.getLogger(__name__)

class RateLimiterService:
    def __init__(self, settings):
        self.limiter = Limiter(key_func=self._get_client_identifier)
        self.settings = settings
        self.metrics = RateLimitMetrics()

    def _get_client_identifier(self, request: Request) -> str:
        """Get reliable client identifier considering proxies."""
        # Check for trusted proxy headers
        if self._is_trusted_proxy(request.client.host):
            return request.headers.get("X-Real-IP") or request.headers.get("X-Forwarded-For", "").split(",")[0]
        return request.client.host

    def _is_trusted_proxy(self, ip: str) -> bool:
        """Check if IP is from trusted proxy range."""
        # Add your trusted proxy IPs here
        trusted_proxies = ["127.0.0.1", "::1"]  # localhost
        return ip in trusted_proxies

    def get_endpoint_limit(self, path: str) -> str:
        """Determine rate limit based on endpoint path."""
        if path.startswith("/api/analytics"):
            return f"{self.settings.RATE_LIMIT_ANALYTICS}/minute"
        elif path.startswith("/api/players/search"):
            return f"{self.settings.RATE_LIMIT_SEARCH}/minute"
        elif path.startswith("/api/metadata") or path == "/health":
            return f"{self.settings.RATE_LIMIT_METADATA}/minute"
        elif path.startswith("/api/combinations"):
            return f"{self.settings.RATE_LIMIT_COMBINATIONS}/minute"
        else:
            return f"{self.settings.RATE_LIMIT_GENERAL}/minute"

    def get_burst_limit(self, base_limit: str) -> str:
        """Calculate burst limit based on base rate."""
        rate = int(base_limit.split('/')[0])
        burst = int(rate * self.settings.RATE_LIMIT_BURST_MULTIPLIER)
        return f"{burst}/minute"

    def is_whitelisted_ip(self, ip: str) -> bool:
        """Check if IP is whitelisted."""
        return ip in self.settings.RATE_LIMIT_WHITELIST

    def is_blacklisted_ip(self, ip: str) -> bool:
        """Check if IP is blacklisted."""
        return ip in self.settings.RATE_LIMIT_BLACKLIST

    async def check_rate_limit(self, request: Request) -> bool:
        """Check rate limit for request."""
        try:
            client_ip = self._get_client_identifier(request)

            # Check whitelist/blacklist
            if self.is_whitelisted_ip(client_ip):
                return True
            if self.is_blacklisted_ip(client_ip):
                return False

            # Get rate limit for this endpoint
            path = request.url.path
            rate_limit = self.get_endpoint_limit(path)
            burst_limit = self.get_burst_limit(rate_limit)

            # Apply rate limiting
            await self.limiter.check_request_limit(
                request,
                rate_limit,
                burst_limit
            )

            # Record metrics
            self.metrics.record_event(RateLimitEvent(
                timestamp=datetime.now(),
                ip_address=client_ip,
                endpoint=path,
                rate_limit=rate_limit,
                exceeded=False,
                user_agent=request.headers.get("User-Agent", "")
            ))

            return True

        except RateLimitExceeded:
            # Record exceeded event
            self.metrics.record_event(RateLimitEvent(
                timestamp=datetime.now(),
                ip_address=client_ip,
                endpoint=path,
                rate_limit=rate_limit,
                exceeded=True,
                user_agent=request.headers.get("User-Agent", "")
            ))

            logger.warning(f"Rate limit exceeded for {client_ip} on {path}")
            return False

        except Exception as e:
            logger.error(f"Rate limiter error: {e}")
            # Fail open by default
            return self.settings.RATE_LIMIT_FALLBACK_MODE == "open"

class RateLimitEvent:
    def __init__(self, timestamp: datetime, ip_address: str, endpoint: str,
                 rate_limit: str, exceeded: bool, user_agent: str):
        self.timestamp = timestamp
        self.ip_address = ip_address
        self.endpoint = endpoint
        self.rate_limit = rate_limit
        self.exceeded = exceeded
        self.user_agent = user_agent

class RateLimitMetrics:
    def __init__(self):
        self.events: List[RateLimitEvent] = []

    def record_event(self, event: RateLimitEvent):
        self.events.append(event)
        # Keep only last 1000 events to prevent memory leaks
        if len(self.events) > 1000:
            self.events = self.events[-1000:]

    def get_exceeded_ips(self, hours: int = 24) -> Dict[str, int]:
        """Get IPs that exceeded rate limits in the last N hours."""
        cutoff = datetime.now() - timedelta(hours=hours)
        exceeded = [e for e in self.events if e.exceeded and e.timestamp > cutoff]

        ip_counts = {}
        for event in exceeded:
            ip_counts[event.ip_address] = ip_counts.get(event.ip_address, 0) + 1

        return ip_counts

    def get_endpoint_usage(self, hours: int = 24) -> Dict[str, int]:
        """Get endpoint usage in the last N hours."""
        cutoff = datetime.now() - timedelta(hours=hours)
        recent_events = [e for e in self.events if e.timestamp > cutoff]

        endpoint_counts = {}
        for event in recent_events:
            endpoint_counts[event.endpoint] = endpoint_counts.get(event.endpoint, 0) + 1

        return endpoint_counts
```

#### 1.4 Middleware Integration

```python
# backend/app/main.py (updated)
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from .services.rate_limiter import RateLimiterService

def create_app():
    app = FastAPI(...)

    # Initialize rate limiter
    rate_limiter = RateLimiterService(settings)
    app.state.limiter = rate_limiter.limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

    # Rate limiting middleware
    @app.middleware("http")
    async def rate_limit_middleware(request: Request, call_next):
        if not settings.RATE_LIMIT_ENABLED:
            return await call_next(request)

        # Check rate limit
        allowed = await rate_limiter.check_rate_limit(request)
        if not allowed:
            return JSONResponse(
                status_code=429,
                content={
                    "error": "Rate limit exceeded",
                    "retry_after": "60 seconds",
                    "message": "Too many requests. Please try again later."
                },
                headers={"Retry-After": "60"}
            )

        return await call_next(request)
```

### Phase 2: Metrics & Monitoring (Week 2)

#### 2.1 Metrics API Endpoint

```python
# backend/app/api/admin.py
from fastapi import APIRouter, HTTPException
from ..services.rate_limiter import RateLimiterService

router = APIRouter()

@router.get("/rate-limits/status")
async def get_rate_limit_status():
    """Get current rate limiting status and metrics."""
    rate_limiter = RateLimiterService(settings)

    return {
        "enabled": settings.RATE_LIMIT_ENABLED,
        "limits": {
            "analytics": f"{settings.RATE_LIMIT_ANALYTICS}/minute",
            "search": f"{settings.RATE_LIMIT_SEARCH}/minute",
            "metadata": f"{settings.RATE_LIMIT_METADATA}/minute",
            "combinations": f"{settings.RATE_LIMIT_COMBINATIONS}/minute",
            "general": f"{settings.RATE_LIMIT_GENERAL}/minute",
        },
        "whitelist": settings.RATE_LIMIT_WHITELIST,
        "blacklist": settings.RATE_LIMIT_BLACKLIST,
        "fallback_mode": settings.RATE_LIMIT_FALLBACK_MODE,
    }

@router.get("/rate-limits/metrics")
async def get_rate_limit_metrics(hours: int = 24):
    """Get rate limiting metrics for the last N hours."""
    rate_limiter = RateLimiterService(settings)

    return {
        "exceeded_ips": rate_limiter.metrics.get_exceeded_ips(hours),
        "endpoint_usage": rate_limiter.metrics.get_endpoint_usage(hours),
        "total_events": len(rate_limiter.metrics.events),
        "time_range_hours": hours,
    }
```

#### 2.2 Add Admin Router

```python
# backend/app/api/__init__.py (updated)
from . import analytics, combinations, metadata, players, positions, admin

router = APIRouter()

# Include all route modules
router.include_router(metadata.router, prefix="/metadata", tags=["metadata"])
router.include_router(players.router, prefix="/players", tags=["players"])
router.include_router(positions.router, prefix="/positions", tags=["positions"])
router.include_router(combinations.router, prefix="/combinations", tags=["combinations"])
router.include_router(analytics.router, prefix="/analytics", tags=["analytics"])
router.include_router(admin.router, prefix="/admin", tags=["admin"])
```

### Phase 3: Testing & Production Readiness (Week 3)

#### 3.1 Unit Tests

```python
# backend/tests/test_rate_limiter.py
import pytest
from fastapi.testclient import TestClient
from unittest.mock import Mock, patch
from app.services.rate_limiter import RateLimiterService

class TestRateLimiter:
    def test_endpoint_rate_limits(self):
        """Test that different endpoints have different rate limits."""
        rate_limiter = RateLimiterService(settings)

        assert rate_limiter.get_endpoint_limit("/api/analytics/heat-map") == "5/minute"
        assert rate_limiter.get_endpoint_limit("/api/players/search") == "20/minute"
        assert rate_limiter.get_endpoint_limit("/api/metadata/") == "60/minute"

    def test_whitelisted_ips(self):
        """Test that whitelisted IPs bypass rate limiting."""
        settings.RATE_LIMIT_WHITELIST = ["192.168.1.1"]
        rate_limiter = RateLimiterService(settings)

        assert rate_limiter.is_whitelisted_ip("192.168.1.1") == True
        assert rate_limiter.is_whitelisted_ip("192.168.1.2") == False

    @patch('app.services.rate_limiter.Redis')
    def test_fail_open_on_redis_error(self, mock_redis):
        """Test that rate limiter fails open when Redis is unavailable."""
        mock_redis.side_effect = Exception("Redis connection failed")
        settings.RATE_LIMIT_FALLBACK_MODE = "open"

        rate_limiter = RateLimiterService(settings)
        # Should return True (allow request) when Redis fails
        assert await rate_limiter.check_rate_limit(mock_request) == True
```

#### 3.2 Integration Tests

```python
# backend/tests/test_rate_limiter_integration.py
def test_rate_limiting_integration(client: TestClient):
    """Test rate limiting with actual HTTP requests."""
    # Make requests until rate limit is hit
    responses = []
    for i in range(25):  # Should hit limit at 20 for search
        response = client.get("/api/players/search?q=test")
        responses.append(response.status_code)

    # Should have some 429 responses
    assert 429 in responses

    # Check response format
    rate_limit_response = client.get("/api/players/search?q=test")
    assert rate_limit_response.status_code == 429
    assert "Rate limit exceeded" in rate_limit_response.json()["error"]
```

## 🔒 Security Considerations

### 1. IP Spoofing Protection

- Use X-Real-IP and X-Forwarded-For headers properly
- Validate proxy headers against trusted proxy list
- Fail open when proxy headers are suspicious

### 2. Fail-Safe Design

- Rate limiter failures should not break the application
- Configurable fallback mode (open/closed)
- Comprehensive error handling and logging

### 3. Memory Management

- Limit stored events to prevent memory leaks
- Periodic cleanup of old rate limit data
- Configurable storage backends (memory/Redis)

## 📋 Monitoring & Alerting

### 1. Key Metrics to Monitor

- Rate limit exceeded events per hour
- Top offending IP addresses
- Endpoint usage patterns
- Rate limiter service availability

### 2. Alerting Thresholds

- More than 100 rate limit exceeded events per hour
- Single IP exceeding limits more than 50 times per hour
- Rate limiter service down for more than 5 minutes

### 3. Logging

```python
# Structured logging for rate limiting events
logger.info("Rate limit applied", extra={
    "ip_address": client_ip,
    "endpoint": path,
    "rate_limit": rate_limit,
    "exceeded": False
})

logger.warning("Rate limit exceeded", extra={
    "ip_address": client_ip,
    "endpoint": path,
    "rate_limit": rate_limit,
    "user_agent": user_agent
})
```

## 🚀 Deployment Strategy

### 1. Development Environment

- Use in-memory storage
- Enable detailed logging
- Test with various traffic patterns

### 2. Staging Environment

- Use Redis for storage
- Test with production-like traffic
- Validate metrics collection

### 3. Production Environment

- Use Redis for distributed rate limiting
- Monitor closely for first 48 hours
- Have rollback plan ready

## 📋 Implementation Checklist

### Week 1: Core Implementation

- [ ] Add SlowAPI dependency
- [ ] Create RateLimiterService
- [ ] Implement basic IP-based rate limiting
- [ ] Add configuration settings
- [ ] Integrate with existing middleware
- [ ] Add basic unit tests

### Week 2: Metrics & Monitoring

- [ ] Add metrics collection
- [ ] Create admin API endpoints
- [ ] Add comprehensive logging
- [ ] Create integration tests

### Week 3: Production Readiness

- [ ] Performance testing under load
- [ ] Security testing
- [ ] Documentation updates
- [ ] Deployment to staging
- [ ] Production deployment

## 🎯 Success Criteria

1. **Functionality**: Rate limiting works correctly for all endpoints
2. **Performance**: <1ms overhead per request
3. **Reliability**: No application crashes due to rate limiting
4. **Observability**: Metrics endpoint provides useful data
5. **Security**: Protects against basic abuse patterns

## 🔄 Future Enhancements

1. **User-based rate limiting**: Different limits for different user tiers
2. **Geographic rate limiting**: Different limits by region
3. **Dynamic rate limiting**: Adjust limits based on server load
4. **API key support**: Rate limiting per API key
5. **Advanced analytics**: ML-based abuse detection

---

**Last Updated**: $(date)
**Status**: Planning Phase
**Next Review**: After Week 1 implementation
