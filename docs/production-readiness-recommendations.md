## Production Readiness Recommendations

This document captures prioritized, actionable recommendations to harden the system for enterprise production use. Items are grouped by priority and category, with concrete examples.

### Priority Key

- P0: Must fix before production
- P1: Next in line; high value/risk reduction
- P2: Important hardening and maintainability

---

## Deployment context (single-host t4g.medium)

- The stack runs on a single AWS Graviton `t4g.medium` (2 vCPU, ~4 GiB RAM) and is the only application on the host (per ADR-0002).
- Implications:
  - CPU cgroup limits are not required right now; keep the full machine available to the app and Nginx. Use Nginx rate limiting (ADR-0003) and app worker count to control load instead of CPU caps.
  - Memory usage is healthy (uvicorn ~260 MiB RES in snapshot). Optional guardrails can be added later (e.g., `pids_limit`, `ulimits.nofile`, or a modest `mem_limit`) but are not mandatory at present.
  - Swap is currently 0. Consider a small swap file or zram (e.g., 1–2 GiB) only if you observe OOM kills under load; otherwise keep as-is for predictability.
  - Prefer `linux/arm64` images for the host. When building from non-arm64 CI/dev, set the platform explicitly.

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
    - Implement `/api/teams/` (with schema + tests), and add to `services/api.ts` with response validation; or
    - Remove the client method and associated schemas immediately until implemented to avoid drift.
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

- Observability: structured logging only
  - Implement structured JSON logs with correlation IDs and rely on Nginx access logs. Defer external services until traffic warrants.

- Container log rotation and Nginx stdout mapping
  - Write all logs to stdout/stderr and let Docker rotate them to avoid in-container logrotate.
  - Add bounded rotation to each service in compose:

```yaml
services:
  app:
    # Ensure logs are rotated and bounded; inspect with `docker logs`
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "3"
  nginx:
    # Rotate Nginx container logs as well
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "5"
    # If logging to stdout, you can drop the nginx log volume mount
    # volumes:
    #   - nginx-logs:/var/log/nginx
```

- Configure Nginx to emit logs to container stdout/stderr:

```nginx
access_log /dev/stdout;
error_log  /dev/stderr warn;
```

- Reasoning: zero-maintenance rotation, bounded disk usage, easy `docker logs` access, consistent with single-host simplicity.

- Python build speed: adopt `uv` for dependency installation
  - Replace `pip install -r` in the container with `uv` for significantly faster, reproducible installs on rebuilds.
  - Two options:
    - Keep `requirements.txt` and install with `uv pip install --system -r requirements.txt`.
    - Or migrate to `pyproject.toml` and use `uv lock` for pinned, hashed installs.
  - Example (Dockerfile):

```dockerfile
# Use uv base image (multi-arch, including arm64) or install uv
FROM ghcr.io/astral-sh/uv:python3.11-bookworm-slim AS runtime
ENV UV_LINK_MODE=copy  # friendlier to Docker overlayfs caching

WORKDIR /app
COPY backend/requirements.txt ./backend/requirements.txt
RUN uv pip install --system --no-cache -r backend/requirements.txt
```

- Align with ADR-0003: Nginx-only rate limiting
  - Keep application-level rate limiting out of scope. Ensure the Nginx config with per-endpoint token-bucket zones is deployed and covered by tests/smoke.

- Arm64 builds on Graviton
  - Ensure the platform is pinned when building from x86_64 CI/dev to avoid mixed-arch images:

```yaml
services:
  app:
    platform: linux/arm64
  nginx:
    platform: linux/arm64
```

---

## P2: Hardening and maintainability

- Pin backend dependencies and scan for vulnerabilities
  - Prefer `uv lock` with `pyproject.toml` for pinned, hashed installs:

```bash
uv lock  # creates uv.lock with fully pinned, hashed deps
```

- If remaining on `requirements.txt`, keep `==` pins and use `uv pip install --system -r requirements.txt`.
- Generate an SBOM (e.g., `syft`) and add Trivy/Snyk scan job in CI to block critical vulnerabilities.

- Generate frontend types and Zod schemas from OpenAPI
  - Use `openapi-typescript` (TS types) and `openapi-zod-client` (Zod schemas) at build time.
  - Replace hand-written `src/types` and `utils/api-validation` over time to prevent drift.

- Caching/materialization for hot endpoints
  - Materialize frequently queried aggregates (e.g., metadata/heat-map) into small DuckDB tables on startup.
  - Add a small TTL/LRU cache for pure reads with stable parameters.
  - Measure and cap maximum execution times per request (graceful 503 with `Retry-After` under overload).

- Frontend maintainability and reuse plan (high leverage abstractions)
  - Goal: reduce duplication across analytics views, centralize brand/theme tokens, and standardize charts/tables and info UI.

  - Branding tokens: single source of truth
    - Create `frontend/src/utils/branding.ts` exporting brand colors, spacing, and typography tokens used across code.
    - Define matching CSS variables in `frontend/src/index.css` so Recharts, Tailwind, and plain CSS share the same values.

```ts
// frontend/src/utils/branding.ts
export const Brand = {
  colors: {
    signalGreen: '#00A86B',
    audibleGold: '#FFC300',
    turfDarkGreen: '#016140',
    graphite: '#1E1E1E',
    accent1: '#89C4AA',
    accent2: '#0891b2',
  },
  radius: {
    card: 8,
  },
} as const;
```

```css
/* frontend/src/index.css */
:root {
  --color-signal-green: #00A86B;
  --color-audible-gold: #FFC300;
  --color-turf-dark: #016140;
  --color-graphite: #1E1E1E;
  --color-accent-1: #89C4AA;
  --color-accent-2: #0891b2;
}
.dark {
  /* optional dark-mode overrides */
}
```

- Update `utils/chartTheme.ts` to import from `Brand.colors` as the canonical source (keeps color names consistent everywhere).

- Chart wrappers for consistency and less boilerplate
  - Add `ThemedBarChart.tsx` and `ThemedPieChart.tsx` under `frontend/src/components/ui/charts/`.
  - Responsibilities: wrap `ResponsiveContainer`, apply dark/light tick colors, grid stroke, margins, tooltip styling, and accept simple props: `data`, `layout`, `xLabel`, `valueFormatter`.

```tsx
// frontend/src/components/ui/charts/ThemedBarChart.tsx
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { getTooltipStyle, getGridStroke } from '../../../utils/chartTheme';
import { useColorScheme } from '../../../contexts/ColorSchemeContext';

export function ThemedBarChart({ data, layout = 'vertical', valueFormatter, xLabel }: {
  data: Array<any>;
  layout?: 'horizontal' | 'vertical';
  valueFormatter?: (v: number) => string;
  xLabel?: string;
}) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const axisTickColor = isDark ? '#E5E7EB' : '#4B5563';
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} layout={layout}>
        <CartesianGrid strokeDasharray="3 3" stroke={getGridStroke(isDark)} />
        <XAxis type={layout === 'vertical' ? 'number' : 'category'}
               tick={{ fill: axisTickColor }}
               label={xLabel ? { value: xLabel, position: 'insideBottom', offset: -10, style: { fill: axisTickColor } } : undefined}
               tickFormatter={valueFormatter}
        />
        <YAxis type={layout === 'vertical' ? 'category' : 'number'} tick={{ fill: axisTickColor }} />
        <Tooltip formatter={(v: number) => valueFormatter ? valueFormatter(v) : v} contentStyle={getTooltipStyle(isDark)} />
        <Bar dataKey="value" fill="#00A86B" radius={[0, 6, 6, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
```

- Refactor `DraftSlotTab.tsx`, `Week17BringBackTab.tsx`, and `OverviewView.tsx` round chart to use `ThemedBarChart` to eliminate repeated axis/tick/tooltip/grid logic.

- Enforce core position domain across UI
  - Align with bestball scope: restrict UI types, charts, and filters to `CorePosition` only: `'QB' | 'RB' | 'WR' | 'TE'`.
  - Update `utils/chartTheme.ts` exports to avoid exposing non-core positions by default. If extended positions are ever needed, isolate them in a separate map, not the core exports.
  - Ensure `types/index.ts` and any components consume `CorePosition` and do not reference `K` or `DST`.

- `InfoPopover` component for help/legends
  - Extract repeated ActionIcon + Tooltip + Popover blocks into `frontend/src/components/ui/InfoPopover.tsx`.
  - Props: `label`, `width`, `children`. Use brand colors and dark/light mode automatically.

- `Card` shell component for layout consistency
  - Create `frontend/src/components/ui/Card.tsx` that standardizes the common container classes (padding, rounded corners, elevation) and accepts `title`, `actions`, `children`.
  - Replace repeated `bg-white dark:bg-surface-dark-elev p-6 rounded-lg card-shadow` blocks.

- `useWindowSize` hook extraction
  - Move local hook from `Week17BringBackTab.tsx` to `frontend/src/hooks/useWindowSize.ts` for reuse.

- Default DataTable wrapper
  - Create `frontend/src/components/ui/DefaultDataTable.tsx` that wraps `mantine-datatable` with brand-consistent density, hover, zebra, pagination, and empty-state messages.
  - Replace direct usages in `CombinationsView.tsx` and future tables.

- `useApiQuery` helper
  - Add `frontend/src/hooks/useApiQuery.ts` to wrap `useQuery` defaults: retries, stale times, refetch behavior, and standard error logging.
  - Optional small UI helpers: `LoadingState`, `ErrorState` to render consistent spinners and alerts.

- Migration order (low-risk sequence)
    1) Add `branding.ts` + CSS variables and update `chartTheme.ts` to import from it.
    2) Add `ThemedBarChart` and refactor `DraftSlotTab.tsx` first (vertical layout), then `Week17BringBackTab.tsx`, then the rounds chart in `OverviewView.tsx`.
    3) Add `InfoPopover` and `Card` and replace inline occurrences in those three screens.
    4) Extract `useWindowSize` to `hooks` and update call sites.
    5) Introduce `DefaultDataTable` and migrate `CombinationsView.tsx`.
    6) Add `useApiQuery` and incrementally adopt in screens as you touch them.

- Expected impact
  - Less duplication in charts and info UI, consistent branding, faster feature work, lower maintenance.
  - Minimal risk: wrappers encapsulate existing behavior; refactors can be done incrementally with component-by-component PRs.

- Minimal tests for new abstractions
  - Add smoke tests for `ThemedBarChart`, `InfoPopover`, and `Card` (render without crashing, honors dark mode, basic prop passthrough). Ensures refactors maintain behavior and improves confidence for future changes.

- Secure-by-default container runtime
  - Run the Python app as non-root (create a user in the image and `USER appuser` before `CMD`).
  - On a dedicated t4g.medium host, skip CPU cgroup limits for now. Instead, consider light-weight guardrails:
    - Set `pids_limit` and a sensible `ulimits.nofile` to prevent runaway resource use.
    - Optionally set a conservative `mem_limit` (e.g., `1g`) only if you observe memory regressions; keep swap disabled unless you see OOM kills.
  - Example (compose):

```yaml
services:
  app:
    # Optional guardrails; safe to omit initially
    pids_limit: 256
    ulimits:
      nofile: 4096
    # mem_limit: 1g        # enable only if needed
    # memswap_limit: 1g    # keep equal to mem_limit to avoid swap thrash
```

- Frontend performance and robustness
  - Route-level code splitting with `React.lazy`/`Suspense` for heavy views (charts/tables).
  - Virtualize long tables (Mantine DataTable configuration or `react-window`).
  - Fix state updates during render (e.g., `OddsCalculatorTab.tsx` uses `setState` in render paths); move to `useEffect`.
  - Tree-shake icons; add a bundle analyzer and set performance budgets in CI.

- Error model unification
  - Define a single `ErrorResponse` (include `request_id`/correlation ID) and return it from all handlers and the global exception handler.
  - Update frontend to validate non-2xx responses via Zod against this shape and surface actionable messages to users.

- Backups and data integrity
  - Store canonical parquet and `week17_matchups.json` locally on the host.
  - Nightly local backups (e.g., timestamped copies under `data/backups/`) and a simple restore runbook.
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

- Python dependencies with `uv` (faster builds):

```dockerfile
FROM ghcr.io/astral-sh/uv:python3.11-bookworm-slim AS runtime
ENV UV_LINK_MODE=copy
WORKDIR /app
COPY backend/requirements.txt ./backend/requirements.txt
RUN uv pip install --system --no-cache -r backend/requirements.txt
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

- [x] P0: Fix deploy port mapping or deploy via compose (app + nginx) with healthchecks.
- [x] P0: Resolve `/teams/` endpoint drift and unify `Position` domain across FE/BE.
- [x] P1: Enforce exception chaining; standardize error schema with `request_id`.
- [x] P1: Add healthchecks; adopt zero-downtime (blue/green or compose gating).
- [x] P1: Add structured JSON logging with correlation IDs; propagate `X-Request-ID`.
- [ ] P1: (Defer) External error reporting/metrics.
- [x] P1: Adopt `uv` for Python installs in Docker; consider `pyproject.toml` + `uv lock` for pins.
- [x] P1: Ensure Nginx-only rate limiting (ADR-0003) is applied; drop app-level limiting.
- [x] P1: Ensure arm64 builds when building from x86_64 CI/dev (pin `platform: linux/arm64`).
- [ ] P2: Pin backend deps with `uv lock` (or `requirements.txt` pins); add SBOM + vulnerability scan.
- [ ] P2: Generate frontend TS + Zod from OpenAPI; phase out manual types/schemas.
- [ ] P2: Add caching/materialization for hot endpoints with TTL.
- [ ] P2: Run containers as non-root; add light guardrails (`pids_limit`, `ulimits.nofile`); skip CPU caps on single-host.
- [ ] P2: Frontend code splitting, virtualization, bundle budgets; remove state-in-render patterns.
- [ ] P2: Document backups, restore runbook, and data integrity checks.
