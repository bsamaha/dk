# Heat Map Feature – Detailed Task Tracker (v2 Release)
*Created 2025-07-10*

This document replaces the placeholder reference to `notebooks/heatmap.ipynb`.  All work items are organised by swim-lane and use GitHub-style checkboxes so you (or CI) can mark progress.

---

## A. Data Exploration / Prototype
- [ ] **A1. Create prototype script** `scripts/heatmap_prototype.py`
  - [ ] Accept CLI args `--anchor-player` (str, required) and `--window` (int, default **3**, bounded 1-12).
  - [ ] Load `data/updated_bestball_data.parquet` with Polars.
  - [ ] For each draft containing the anchor, collect players drafted within `±window` picks.
  - [ ] Aggregate → `count`, `pct_of_anchor_drafts`, `avg_distance`.
  - [ ] Sort by `pct_of_anchor_drafts` desc; limit 500 rows.
  - [ ] Print summary to stdout *and* save to `tmp/heatmap_<anchor>.csv`.
  - [ ] Log execution time & peak RSS (psutil).
- [ ] **A2. Smoke-test prototype** using an example anchor (`"Christian McCaffrey"`, window = 3). Ensure runtime ≤ 0.1 s.
- [ ] **A3. Capture findings** in `docs/notes/heatmap_prototype_results.md` (dataset shape, timings, row count sanity).

---

## B. Backend (API)
- [ ] **B1. Pydantic Models** – add `HeatMapRow` & `HeatMapResponse` to `backend/app/models/schemas.py`.
- [ ] **B2. DataService** – implement `get_heatmap(anchor_player: str, window: int = 3, limit: int = 300)` with `@lru_cache(256)`.
- [ ] **B3. Router** – new module `backend/app/api/analytics.py`
  - [ ] `GET /api/analytics/heatmap` with params `anchor_player`, `window (1-12)`, `limit (≤500)`.
  - [ ] Add to `app/api/__init__.py`.
- [ ] **B4. Unit Tests**
  - [ ] `tests/services/test_data_service_heatmap.py`
  - [ ] `tests/api/test_heatmap.py`

---

## C. Frontend (UI)
- [ ] **C1. TypeScript Interfaces** in `frontend/src/types/api.ts` (or similar).
- [ ] **C2. API Layer** – `getHeatMap` fetch wrapper.
- [ ] **C3. React Query Hook** – `useHeatMap`.
- [ ] **C4. HeatMapTab Component**
  - [ ] UI: PlayerAutocomplete, NumberInput, Table with gradient cells, Pagination.
  - [ ] States: loading / empty / error.
  - [ ] Accessibility: ARIA labels, keyboard nav.
- [ ] **C5. AnalyticsPage and Navigation** – add Analytics page with Tabs (Heat Map | Stacks | Drift) & update header nav.
- [ ] **C6. Component Tests** – `HeatMapTab.spec.tsx`.

---

## D. Documentation
- [ ] **D1. PRD.md** – add F-HMAP user story, flow, acceptance criteria.
- [ ] **D2. ENGINEERING.md** – update endpoint matrix & diagrams.
- [ ] **D3. DEV_ARCHITECTURE.md** – add component tree & data flow for Heat Map.

---

## E. CI / Misc
- [ ] **E1. Extend pytest path** for new tests.
- [ ] **E2. Add `pnpm test` (Vitest) step to FE workflow**.
- [ ] **E3. Bump API version to `1.1.0` in `backend/app/main.py` once merged.**

---

### Progress Legend
- ☑️ Done   🔄 In Progress   ⬜ To Do

Keep this file up-to-date as tasks are completed.
