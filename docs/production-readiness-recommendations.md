## Production Readiness Recommendations

This document captures prioritized, actionable recommendations to harden the system for enterprise production use. Items are grouped by priority and category, with concrete examples.

### Priority Key
- P0: Must fix before production
- P1: Next in line; high value/risk reduction
- P2: Important hardening and maintainability

---

## P0: Immediate fixes

- Fix deployment port mapping or deploy app + Nginx together
  - Current runtime exposes uvicorn on 8000, but the deploy script maps host 80 to container 80.
  - Short-term fix (single-container):
```bash
# Map host 80 to container 8000 where uvicorn listens
docker run -d --name dk-app -p 80:8000 -e ENV=prod --restart always "$IMAGE"
```
  - Preferred: deploy with `docker compose` on EC2 (both `app` and `nginx` services) and rely on healthchecks and `depends_on` gating.

- Resolve API contract drift
  - Frontend calls `/teams/` but backend has no such endpoint. Either:
    - Implement `/api/teams/` (with schema + tests), or
    - Remove the client method and associated schemas until implemented.
  - Unify `Position` domain (FE has `K`/`DST`, BE has `QB|RB|WR|TE`). Decide and align both layers.

---

## P1: High-value improvements

- Enforce exception chaining and unify error handling
  - When translating exceptions, preserve the original cause:
```python
try:
    ...
except ValidationError:
    raise
except Exception as exc:
    logger.exception("Context message ...")
    raise HTTPException(status_code=500, detail="An internal error occurred") from exc
```
  - Prefer global unhandled handler for truly unexpected failures, and return a consistent error schema (see Error Model below).

- Add container healthchecks and zero-downtime deployments
  - App healthcheck (Dockerfile):
```dockerfile
HEALTHCHECK --interval=30s --timeout=3s --retries=3 CMD curl -f http://127.0.0.1:8000/health || exit 1
```
  - Compose healthcheck and gating:
```yaml
services:
  app:
    healthcheck:
      test: ["CMD", "curl", "-f", "http://app:8000/health"]
      interval: 30s
      timeout: 3s
      retries: 3
  nginx:
    depends_on:
      app:
        condition: service_healthy
```
  - Adopt blue/green (or rolling) update strategy to avoid downtime; only switch traffic after new app is healthy.

- Structured logging with correlation IDs
  - In Nginx, propagate request ID:
```nginx
# proxy_headers.conf
proxy_set_header X-Request-ID $request_id;
```
  - In FastAPI, middleware to read `X-Request-ID` or generate one if missing, include in JSON logs for every message and return it in error responses.
  - Standardize a JSON log format with fields: `timestamp`, `level`, `request_id`, `path`, `method`, `latency_ms`, `message`.

- Observability: error reporting and metrics
  - Add Sentry (or similar) for error reporting on frontend and backend.
  - Add OpenTelemetry or Prometheus metrics for request counts, latencies, and query timings (e.g., `prometheus-fastapi-instrumentator`).
  - Expose `/metrics` for scraping (secured by network policy or auth constraints).

---

## P2: Hardening and maintainability

- Pin backend dependencies and scan for vulnerabilities
  - Replace `>=` with exact pins using `pip-tools`:
```bash
pip-compile --generate-hashes -o backend/requirements.txt backend/requirements.in
```
  - Generate an SBOM (e.g., `syft`) and add Trivy/Snyk scan job in CI to block critical vulnerabilities.

- Generate frontend types and Zod schemas from OpenAPI
  - Use `openapi-typescript` (TS types) and `openapi-zod-client` (Zod schemas) at build time.
  - Replace hand-written `src/types` and `utils/api-validation` over time to prevent drift.

- Caching/materialization for hot endpoints
  - Materialize frequently queried aggregates (e.g., metadata/heat-map) into small DuckDB tables on startup.
  - Add a small TTL/LRU cache for pure reads with stable parameters.
  - Measure and cap maximum execution times per request (graceful 503 with `Retry-After` under overload).

- Secure-by-default container runtime
  - Run the Python app as non-root (create a user in the image and `USER appuser` before `CMD`).
  - Set memory/CPU limits in compose for both `app` and `nginx`.

- Frontend performance and robustness
  - Route-level code splitting with `React.lazy`/`Suspense` for heavy views (charts/tables).
  - Virtualize long tables (Mantine DataTable configuration or `react-window`).
  - Fix state updates during render (e.g., `OddsCalculatorTab.tsx` uses `setState` in render paths); move to `useEffect`.
  - Tree-shake icons; add a bundle analyzer and set performance budgets in CI.

- Error model unification
  - Define a single `ErrorResponse` (include `request_id`/correlation ID) and return it from all handlers and the global exception handler.
  - Update frontend to validate non-2xx responses via Zod against this shape and surface actionable messages to users.

- Backups and data integrity
  - Store canonical parquet and `week17_matchups.json` in versioned S3.
  - Nightly backups and a restore runbook.
  - On startup, validate dataset integrity (size/hash) and fail fast with clear logs if invalid.

---

## Concrete snippets and examples

- Exception chaining pattern (backend):
```python
try:
    rows = service.query(...)
    return {...}
except ValidationError:
    raise
except Exception as exc:
    logger.exception("Failed to fetch rows")
    raise HTTPException(status_code=500, detail="An internal error occurred") from exc
```

- Healthcheck (Dockerfile):
```dockerfile
HEALTHCHECK --interval=30s --timeout=3s --retries=3 CMD curl -f http://127.0.0.1:8000/health || exit 1
```

- Nginx request ID propagation:
```nginx
proxy_set_header X-Request-ID $request_id;
```

- Deploy (single container) temporary fix:
```bash
docker run -d --name dk-app -p 80:8000 --restart always "$IMAGE"
```

- Compose gating (preferred):
```yaml
services:
  app:
    healthcheck:
      test: ["CMD", "curl", "-f", "http://app:8000/health"]
      interval: 30s
      timeout: 3s
      retries: 3
  nginx:
    depends_on:
      app:
        condition: service_healthy
```

---

## Checklist (trackable)

- [ ] P0: Fix deploy port mapping or deploy via compose (app + nginx) with healthchecks.
- [ ] P0: Resolve `/teams/` endpoint drift and unify `Position` domain across FE/BE.
- [ ] P1: Enforce exception chaining; standardize error schema with `request_id`.
- [ ] P1: Add healthchecks; adopt zero-downtime (blue/green or compose gating).
- [ ] P1: Add structured JSON logging with correlation IDs; propagate `X-Request-ID`.
- [ ] P1: Add Sentry + metrics (OpenTelemetry or Prometheus).
- [ ] P2: Pin backend deps with `pip-tools`; add SBOM + vulnerability scan.
- [ ] P2: Generate frontend TS + Zod from OpenAPI; phase out manual types/schemas.
- [ ] P2: Add caching/materialization for hot endpoints with TTL.
- [ ] P2: Run containers as non-root; set resource limits.
- [ ] P2: Frontend code splitting, virtualization, bundle budgets; remove state-in-render patterns.
- [ ] P2: Document backups, restore runbook, and data integrity checks.