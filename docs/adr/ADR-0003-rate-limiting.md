# ADR-0003: Nginx-Only Rate Limiting Architecture

Date: 2025-01-27
Status: Accepted

## Context

The Fantasy Draft Analytics API needed protection against abuse while maintaining good user experience. We evaluated two approaches:

1. **Nginx-level rate limiting** (IP-based, token bucket algorithm)
2. **Application-level rate limiting** (SlowAPI, fixed window algorithm)

The original plan included implementing both layers, but after implementing robust Nginx rate limiting, we reconsidered the need for application-level rate limiting.

## Decision

We chose to implement **Nginx-level rate limiting only**, skipping application-level rate limiting.

### Implemented Solution

```nginx
# Granular rate limiting by endpoint complexity
limit_req_zone $binary_remote_addr zone=analytics:10m rate=2r/s;      # Heavy computations
limit_req_zone $binary_remote_addr zone=combinations:10m rate=3r/s;   # Complex queries
limit_req_zone $binary_remote_addr zone=search:10m rate=5r/s;         # User-driven
limit_req_zone $binary_remote_addr zone=metadata:10m rate=5r/s;       # Lightweight
limit_req_zone $binary_remote_addr zone=general:10m rate=3r/s;        # Health/static
```

## Consequences

* **Positive**:
  * **Immediate Protection**: Rate limiting is active and working
  * **High Performance**: Near-zero overhead on requests (C-based implementation)
  * **Simple Maintenance**: Single configuration to manage
  * **User-Friendly**: Token bucket algorithm provides smooth experience
  * **Resource Efficient**: No additional dependencies or storage
  * **Superior Algorithm**: Token bucket is more user-friendly than fixed windows

* **Negative**:
  * **Limited Granularity**: Can't implement user-based or API key rate limiting
  * **No Advanced Metrics**: Limited to Nginx access logs for monitoring
  * **IP-Only Identification**: Can't rate limit by user session or API key

## Rationale

1. **Sufficient Protection**: Current limits are already quite strict for individual IPs
   * Analytics: 2r/s (120/min) - Very conservative for heavy computations
   * Search: 5r/s (300/min) - Good for user-driven activity
   * General: 3r/s (180/min) - Conservative for health/static

2. **Performance Benefits**: Nginx rate limiting has near-zero overhead
   * C-based implementation vs. Python middleware
   * No additional dependencies (SlowAPI, Redis)
   * No application-level latency

3. **Simplicity**: Single layer is easier to maintain and debug
   * One configuration to manage
   * No risk of conflicting behaviors
   * Clearer monitoring and alerting

## Current Configuration

| Endpoint Type | Rate Limit | Burst | Algorithm | Protection Level |
|---------------|------------|-------|-----------|------------------|
| `/api/analytics/*` | 2r/s | 5 | Token bucket | High (heavy computations) |
| `/api/combinations/*` | 3r/s | 8 | Token bucket | Medium (complex queries) |
| `/api/players/search` | 5r/s | 10 | Token bucket | Medium (user-driven) |
| `/api/metadata/*` | 5r/s | 8 | Token bucket | Low (lightweight) |
| `/api/*` (catch-all) | 5r/s | 10 | Token bucket | Medium (default) |
| `/health`, static files | 3r/s | 5 | Token bucket | High (bot protection) |

## Future Considerations

### When to Reconsider Application-Level Rate Limiting

1. **User Authentication**: If we add user accounts and need per-user limits
2. **API Keys**: If we implement API key authentication
3. **Advanced Analytics**: If we need detailed rate limiting metrics
4. **Geographic Limits**: If we need different limits by region
5. **Dynamic Limits**: If we need to adjust limits based on server load

### Implementation Path (If Needed Later)

```python
# Future application-level rate limiting (if needed)
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

@app.get("/api/analytics/")
@limiter.limit("5/minute")  # More granular than Nginx
async def analytics_endpoint(request: Request):
    # Implementation
```

## Alternatives Considered

* **Application-Level Only**: Would provide more granular control but with higher overhead and complexity
* **Both Layers**: Would provide maximum protection but with redundancy and maintenance overhead
* **No Rate Limiting**: Unacceptable for production use

## References

* `nginx.conf`: Nginx configuration with granular rate limiting zones
* `docs/TODO.md`: Updated to reflect completed rate limiting implementation
