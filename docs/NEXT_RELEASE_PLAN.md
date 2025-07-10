# Next Release – Requirements & Project Plan (v2)
*Compiled 2025-07-10*

> This single document supersedes `TECH_STRATEGY_LEAN.md`, `DEV_RECOMMENDATIONS.md`, and `ANALYTICS_PROPOSAL_V2.md`.

---

## 1. Vision & Guiding Principles
1. **Lean & Performant** – Run on a single Spot EC2 `t3a.small` (2 vCPU, 2 GiB) with sub-second UX.
2. **Actionable Insights** – Deliver three new analytics that help drafters make smarter decisions.
3. **Sustainable Quality** – Maintain strict typing, CI linting, and minimal infra.

---

## 2. Feature Scope
| ID | Feature | User Value | API | UI Component |
|----|---------|------------|-----|--------------|
| F-HMAP | Player-Centric Heat Map | See which players are commonly drafted near an anchor pick | `GET /api/analytics/heatmap` | Heat-map table w/ gradient |
| F-STACK | Cross-Team Stack Finder | Find high-upside player pairs drafted together across teams | `GET /api/analytics/stacks` | Sortable DataGrid |
| F-DRIFT | Roster Construction Drift | Track season-long shifts in positional allocation | `GET /api/analytics/drift` | Area stack chart |

*Out-of-scope for v2*: ADP Momentum, Positional Run Probability, authentication, real-time assistant.

---

## 3. Technical Strategy (recap)
| Layer | Approach |
|-------|----------|
| Data | DuckDB over Parquet (~12 MB) with lazy queries |
| Caching | `functools.lru_cache(256)` on heavy endpoints |
| Hosting | Single Docker container on Spot EC2; `docker --restart=always`; ASG desired=1 |
| CI/CD | One GitHub Action (lint → test → build → push); `deploy.sh` via SSH |
| Quality | Ruff, mypy, ESLint, Storybook-lite, integration tests with tmp DuckDB file |
| Security | CORS allowlist, SlowAPI 60 req/min, weekly Dependabot |

---

## 4. Implementation Checklist (Single Engineer)
Complete these steps in order, checking off each when done. Update `ENGINEERING.md` and `PRD.md` as noted.

1. **DuckDB Integration**
   - Add `duckdb>=0.10` to `backend/requirements.txt` and install locally.
   - Extend `DataService` (or new `duckdb_service.py`) to initialise an **in-memory DuckDB connection**, `ATTACH` the Parquet file, and expose `query_duckdb(sql: str) -> pl.DataFrame` helper.
   - Keep Polars for fast DataFrame ops; use DuckDB for complex SQL-style analytics (hybrid approach).
   - Refactor existing endpoints incrementally to call DuckDB where beneficial; benchmark vs Polars (target p95 ≤ 100 ms).
   - Document architecture change in ENGINEERING.md and ADR-0001.

2. **Heat Map**
   - Add `/api/analytics/heatmap` endpoint & Pydantic models.
   - Build paginated colour-gradient table in React (`HeatMapTab.tsx`).
   - Update docs: endpoint matrix + PRD Feature F-HMAP.

3. **Cross-Team Stack Finder**
   - Implement lift/support **DuckDB** query.
   - Add `/api/analytics/stacks` endpoint.
   - Create sortable DataGrid UI (`StacksTab.tsx`).
   - Update docs: ENGINEERING & PRD (F-STACK).

4. **Roster Construction Drift**
   - Drift query & `/api/analytics/drift` endpoint.
   - Build area stack chart UI (`DriftTab.tsx`).
   - Ensure mobile layout works.
   - Update docs: ENGINEERING & PRD (F-DRIFT).

5. **Hardening & Release Prep**
   - Accessibility & Lighthouse checks.
   - Add ADR-0001 (Lean Stack) and refresh `DEV_ARCHITECTURE.md`.
   - Tag `v2.0.0` and deploy with `deploy.sh`.



### 4.1 Progress Snapshot (2025-07-10)
| Task | Status |
|------|--------|
| 1. DuckDB Integration | ☑️ Completed |
| 2. Heat Map | ☑️ Completed |
| 3. Cross-Team Stack Finder | ☑️ Completed |
| 4. Roster Construction Drift | ☑️ Completed |
| 5. Hardening & Release Prep | ⬜ In progress |

---

## 5. Deliverables Summary
1. 3 new REST endpoints under `/api/analytics/*`.
2. *Analytics* page (`/analytics`) with tabs: Heat Map | Stacks | Drift.
3. Updated documentation (PRD, ENGINEERING, DEV_ARCHITECTURE, ADR-0001).
4. CI enhancements: cache pip & pnpm, Spot-instance resilience alarms.

---

## 6. Risks & Mitigations
| Risk | Impact | Likelihood | Mitigation |
|------|--------|-----------|------------|
| Query latency on 1-GB VM | Slow UX | Med | Pre-compute JSON on startup; cache; optimise DuckDB indices |
| Spot instance pre-emption | Downtime | Low | `docker restart=always`; ASG auto-replace |
| Chart/Table clutter | Poor usability | Med | Pagination, filters, sensible defaults |
| Staff bandwidth | Slippage | Low | Sequential phases keep WIP small |

---

## 7. Acceptance Criteria
* All new endpoints return within **200 ms** p95.
* Mobile layout ≥ 375 px without horizontal scroll.
* No Lighthouse a11y violations > minor.
* Documentation updated per milestone before phase sign-off.

---

*End of Plan – Approved artifacts below replace previous standalone docs.*
