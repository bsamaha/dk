## Improvements Roadmap

This document captures proposed improvements across the frontend, backend, and infra, followed by data contract/schema recommendations.

### Frontend (React + Vite)

- **Architecture**
  - Introduce React Router for deep links and shareable state (players, positions, analytics). Use route-level `React.lazy`/`Suspense` for code splitting per view.
  - Generate TypeScript types from FastAPI OpenAPI at build-time (e.g., `openapi-typescript` or `datamodel-codegen`) to prevent drift with backend models; replace manual interfaces in `src/types/`.
  - Centralize React Query hooks per endpoint (e.g., `usePlayers`, `usePlayerDetails`, …) with stable `queryKey`s and defaults co-located.
  - Split Zustand into feature slices to keep global state small and maintainable.

- **Performance**
  - Enable route-level bundle splitting and dynamic imports for heavy components (Recharts/Mantine charts).
  - Virtualize long lists/tables (Mantine DataTable or `react-window`) to improve render performance for player sets.
  - Tree-shake icons (use named imports/dynamic icon imports) and add a bundle analyzer to CI for regression checks.
  - Debounce network calls for live search in addition to analytics events; cache recent search results with TTL.
  - Tighten Tailwind purge to remove unused CSS in production.

- **Maintainability**
  - Consolidate Google Analytics to a single approach. Prefer env-driven, production-only enablement (disable in dev and when ID missing). Avoid duplicating `vite-plugin-radar` and `ga-init.ts`.
  - Gate Axios interceptor logs behind `import.meta.env.DEV` to avoid production console noise.
  - Simplify API base URL: prefer `VITE_API_BASE_URL`, else default to same-origin `/api`; avoid window.port heuristics.
  - Increase TS strictness (`strict`, `noUncheckedIndexedAccess`) and remove `any` casts in Mantine style overrides via proper typing.

- **Security**
  - Keep centralized CSP. Ensure analytics scripts are only injected in production when a valid tracking ID is present. Add unit tests to assert dev mode does not load GA.
  - Maintain Zod validation and input sanitization for all endpoints and inputs; generate Zod from OpenAPI where possible to reduce manual drift.

- **Developer workflow**
  - Standardize on pnpm inside `frontend/`. Remove root `node_modules/` and `package-lock.json` to avoid dual managers.
  - Pin Node/pnpm via Corepack or Volta. Add lockfile checks in CI.
  - Add `pnpm run analyze` (rollup-plugin-visualizer) and publish report on PRs.

- **Testing**
  - Add Playwright E2E covering core flows and verifying security headers via `vite preview`.
  - Extend Axios response-validator tests for failure paths.

### Backend (FastAPI + DuckDB + Polars)

- **Architecture**
  - Replace global `query_service` singleton with a FastAPI lifespan-managed instance (`app.state.query_service`), and implement `close()` for DuckDB. Inject into routers via `Depends` for testability.
  - If `QueryService` keeps growing, split by domain (players, analytics, roster) to preserve single responsibility.

- **Performance**
  - Precompute static aggregates at startup (distinct drafts/teams/players) and reuse them.
  - Consider materializing hot DuckDB aggregates (staging tables) for frequently queried analytics; keep Parquet view for raw reads.
  - Batch related queries to reduce Python↔DuckDB roundtrips; add small LRU caches for hot endpoints (metadata, heat map).

- **Maintainability**
  - Pin exact versions in `backend/requirements.txt` (manage with pip-tools) to avoid CI/runtime drift.
  - Standardize that service methods return Pydantic models (not dicts) to enforce contracts; keep router responses typed.
  - Add mypy with strict settings and fail CI on type errors.

- **Security**
  - Remove legacy `X-XSS-Protection` header from backend middleware; rely on CSP and modern browser behavior. Keep parameterized queries and justified `# nosec B608` comments only where structure is static.

- **API/UX**
  - Standardize pagination across list endpoints (uniform envelope with `items[]` + `page_info`).
  - Introduce a consistent error model with correlation IDs; ensure exception handler returns this schema.

- **Observability**
  - Adopt structured JSON logging with request timings and sampled query timings. Include a correlation ID across logs.

- **Testing**
  - Add performance benchmarks for analytic endpoints with a sample dataset.
  - Expand negative-path tests (validation failures) and assert error schemas.

### Infra: Docker, Nginx, Compose, CI

- **Docker**
  - Align Python version (prefer 3.12 across CI and runtime). Drop `build-essential` if not needed at runtime.
  - Add healthcheck for `app`.

- **Nginx**
  - Fix TLS comments vs. `ssl_protocols`; add `server_tokens off;` and align `Permissions-Policy` with frontend dev/preview.
  - Keep CSP block machine-generated only (between `# BEGIN_CSP_HEADER` and `# END_CSP_HEADER`). Consider Brotli where supported; expand `gzip_types` to fonts.

- **Compose**
  - Add healthchecks and `depends_on: condition: service_healthy` for nginx. Keep certbot profile-only; add a small bootstrap script to avoid manual errors.

- **CI/CD**
  - Pin Python deps (pip-compile); keep `pnpm i --frozen-lockfile`.
  - Add a “Generate CSP Header” step in release before Docker build and fail on drift (git diff).

---

## Data Contracts & Schemas

### Current observations

- Backend Pydantic models are comprehensive, but a few fields are optional where responses are always populated (e.g., `Player.name`, `Player.position`, `Player.team`).
- Inconsistencies in field naming: `FirstPlayerDraftStats.Position` uses a capitalized field, while most models use lower-case keys (snake_case).
- The frontend `Position` type includes `K` and `DST`; backend `Position` enum includes only `QB|RB|WR|TE`. Frontend also treats some fields as required that are optional on backend.
- `TeamCombination.position_counts` is a string (e.g., "QB: 2, RB: 5"); elsewhere (`RosterConstruction`) position counts are structured as a map.
- `PositionRoundCountsResponse` exists in backend models but the endpoint returns a raw `List[PositionRoundCount]` (wrapper appears unused).
- Errors are raised via `HTTPException` with default FastAPI schema; an `ErrorResponse` model exists but is not consistently emitted.

### Improvements

- **Unify enums and fields**
  - Make `Player.name|position|team|draft_percentage` non-optional in the response model if they are always present.
  - Normalize `FirstPlayerDraftStats` to use `position` (lowercase key) for consistency; update frontend accordingly.
  - Align the `Position` domain: either add `K` and `DST` to backend (if supported) or remove from frontend to match current data. Prefer a single source of truth.

- **Consistent shapes**
  - Replace `TeamCombination.position_counts: str` with a structured map `Dict[str, int]` to match `RosterConstruction` and simplify client code.
  - Standardize list responses: envelope with `items[]` and `page_info` (or continue current `players + page_info` pattern) for all endpoints that paginate.

- **Typed metrics**
  - Model `DraftSlot.metric` as an `Enum` instead of free `str` and reuse in frontend types.
  - Use `Position` enum types consistently in all response models (`PlayerDetailsResponse.position` currently `str`).

- **Error contracts**
  - Implement a global exception handler that returns `ErrorResponse` (with correlation ID) and document it in OpenAPI. Update frontend Zod to validate error shapes for non-2xx.

- **Code generation**
  - Generate frontend TypeScript types and Zod schemas from the FastAPI OpenAPI spec during CI/build. Recommended:
    - `openapi-typescript` (TS types) + `zod-openapi` or `openapi-zod-client` (Zod schemas)
    - Wire generation into CI and fail when drift is detected.

- **Validation tightening**
  - Add explicit `regex` and `max_length` to string fields where appropriate (e.g., names, teams) in Pydantic models.
  - Ensure query params across routers reuse shared Pydantic models to avoid divergence.

### Actionable steps

1. Normalize `FirstPlayerDraftStats.Position` → `position`; update frontend types and tests.
2. Change `TeamCombination.position_counts` to `Dict[str, int>`; update service and FE schemas.
3. Make core `Player` fields required in backend; align Zod and FE types.
4. Introduce `DraftSlotMetric` enum in backend; align FE type.
5. Decide on `Position` domain (add `K/DST` or remove from FE). Document in both layers.
6. Add global error handler returning `ErrorResponse` and include a correlation ID; validate on FE.
7. Add OpenAPI → TS/Zod generation step in CI; replace manual types/schemas over time.

---

## Quick wins

- Remove `X-XSS-Protection` header in backend; fix nginx TLS comment mismatch; gate Axios logs in prod.
- Consolidate GA injection and read ID from env; disable in dev.
- Move `QueryService` to lifespan-managed DI; implement `close()`.
- Pin backend deps; enable mypy as CI error; enable TS `strict` in frontend.
- Add route-level code splitting and virtualized tables to reduce FE bundle and improve UX.

### Progress (branch: `chore/quick-wins`)

- Backend header cleanup: removed `X-XSS-Protection` in `backend/app/main.py`.
- Frontend axios logs: gated request/response logs behind `import.meta.env.DEV` in `src/services/api.ts`.
- GA via Vite Radar: now prod-only and env-driven (`VITE_GA_TRACKING_ID`) in `frontend/vite.config.ts`; removed hard-coded ID.
- Nginx: corrected TLS comment, added `server_tokens off;` and `Permissions-Policy` header.
- Tooling: removed root `package-lock.json` to avoid npm/pnpm conflicts.
## Medium

- Add React Router with Suspense/lazy and deep-link state.
- Materialize hot DuckDB aggregates and add LRU caches.
- Add Playwright E2E and bundle analyzer in CI.

## Long-term

- Split `QueryService` by domain and adopt DI fully.
- Add structured logs with correlation IDs and basic metrics endpoint (optional).
- Persisted cache across deploys if dataset grows.
