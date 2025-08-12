## Concurrency Strategy

This document captures our current concurrency model and recommended
improvements for both backend and frontend to avoid race conditions and
intermittent rendering issues.

### Backend (FastAPI + DuckDB)

- **Current architecture**
  - `QueryService` is attached to `app.state` and injected via
    `Depends(get_query_service)`.
  - Blocking DB calls run in worker threads via `run_in_threadpool(...)`.
  - A process-wide mutex guards the DuckDB connection so only one `.execute`
    runs at a time.

- **Why the lock exists**
  - DuckDB connections are not thread-safe for concurrent `.execute` calls.
  - On first page load, multiple parallel requests (metadata, position stats,
    by-round stats) can interleave, producing sporadic empty frames or errors.
  - A global lock guarantees serialized access and stable results.

- **Option A (simple, safe – current)**
  - Keep a single, shared DuckDB connection with a global lock.
  - Pros: minimal complexity, stable, easy to reason about.
  - Cons: serialized queries limit throughput under heavy concurrent load.

- **Option B (higher throughput)**
  - Use a file-backed DuckDB database and open a connection per request/thread.
  - Steps:
    1. Initialize a file DB at startup (e.g., `/tmp/analytics.duckdb`).
    2. Create required schema/view (`picks`) once in the file DB.
    3. Replace the shared connection with a small connection factory that
       returns a new connection for each operation (context-managed).
    4. Continue to run all DB work under `run_in_threadpool(...)`.
  - Pros: removes the global lock, allows true parallel query execution.
  - Cons: slightly more complexity; ensure views/tables exist for new
    connections and keep everything read-only where possible.

- **Additional backend recommendations**
  - Keep using Pydantic validation and explicit error handling.
  - Prefer read-only connections/transactions where supported.
  - Add a small concurrency test to prevent regressions (see below).

### Frontend (React + React Query)

- **Current architecture**
  - React Query handles parallel data fetching on load.
  - One-time re-render guards (refs) stabilize chart mounts after data arrives.

- **Recommended React Query settings**
  - For non-volatile endpoints (`/metadata`, `/positions/stats`):
    - `staleTime: 300_000` (5 minutes)
    - `refetchOnMount: false`
  - Global defaults (via `QueryClient`):
    - `refetchOnWindowFocus: false`
  - Benefits: reduce initial request storms and jitter, especially in dev.

- **UI interaction hardening**
  - Debounce position/aggregation control changes (100–200ms) to avoid bursts
    of requests when toggling quickly.
  - Optional: provide an aggregated endpoint that returns both position stats
    and default by-round counts in one payload to minimize initial parallel
    requests.

### Concurrency test (recommendation)

- Add a test that fires parallel requests and asserts stable, non-empty data:
  - Endpoints: `/metadata/`, `/positions/stats`,
    `/positions/stats/QB/by_round?aggregation=mean`.
  - Spawn ~10 concurrent requests per endpoint; validate basic invariants
    (arrays non-empty, numeric fields present).
  - Run this in CI to catch regressions (e.g., missing lock or bad DI).

### Monitoring and observability

- Log per-endpoint timings and error counts.
- (Optional) Export lightweight metrics (Prometheus/OpenTelemetry) for request
  rate and latency to spot concurrency bottlenecks early.

### Action checklist

- [x] Serialize DuckDB connection access with a lock.
- [x] Use `run_in_threadpool(...)` for all DB-bound work.
- [x] Add one-time re-render guards for charts depending on async data.
- [ ] Increase React Query `staleTime` and disable focus refetch for stable
      endpoints.
- [ ] Add debounce to position/aggregation controls.
- [ ] Add a parallelism/concurrency test to CI.
- [ ] (Optional) Move to file-backed DB with per-request connections for higher
      throughput; remove global lock.
