# Draft Slot Correlation Feature – Detailed Task Tracker (v2 Release)
*Created 2025-07-10*

This document supersedes the previous Heat Map workstream. All unfinished heat-map tasks have been removed. Use this checklist to track the integration of the approved PoC (`scripts/draft_slot_correlation.py`) into production.

---

## A. PoC & Data Validation
- ☑️ **A1. PoC script** `scripts/draft_slot_correlation.py` (approved)
  - [ ] Smoke-test on sample parquet – slot **1**, metric **percent**, ensure runtime ≤ 0.1 s.
  - [ ] Document findings in `docs/notes/draft_slot_validation.md`.
  - [ ] Validate calculated slot correlation metrics match PoC output.
  - [ ] Metrics: `slot_count`, `slot_percent`, `ratio_vs_overall`.
  - [ ] Sort by selected metric desc; limit 100 rows.
  - [ ] Print summary to stdout *and* save to `tmp/draft_slot_<slot>.csv`.
  - [ ] Log execution time & peak RSS (psutil).



---

## B. Backend (API)
- [ ] **B1. Pydantic Models** – add `DraftSlotRow` & `DraftSlotResponse` to `backend/app/models/schemas.py`.
- [ ] **B2. Service Layer** – implement `get_draft_slot_correlation(slot: int, metric: str = "percent", top_n: int = 25)` with `@lru_cache(256)`.
- [ ] **B3. Router** – new module `backend/app/api/analytics.py`
  - [ ] `GET /api/analytics/draft-slot` with params `slot`, `metric`, `top_n`.
  - [ ] Add to `app/api/__init__.py`.
- [ ] **B4. Unit Tests**
  - [ ] `tests/services/test_data_service_draft_slot.py`
  - [ ] `tests/api/test_draft_slot.py`

---

## C. Frontend (UI)
- [ ] **C1. TypeScript Interfaces** in `frontend/src/types/api.ts` (or similar).
- [ ] **C2. API Layer** – `getDraftSlotCorrelation` fetch wrapper.
- [ ] **C3. React Query Hook** – `useDraftSlotCorrelation`.
- [ ] **C4. DraftSlotTab Component**
  - [ ] Inputs: NumberInput for slot, SegmentedControl for metric, Top-N selector.
  - [ ] Outputs: Bar chart (Recharts) and table; states: loading / empty / error / no-data.
  - [ ] Accessibility: ARIA labels, keyboard nav.
- [ ] **C5. AnalyticsPage and Navigation** – add Analytics page with Tabs (Draft Slot | Stacks | Drift) & update header nav.
- [ ] **C6. Component Tests** – `DraftSlotTab.spec.tsx`.

---

## D. Documentation
- [ ] **D1. PRD.md** – add F-DSC user story, flow, acceptance criteria.
- [ ] **D2. ENGINEERING.md** – update endpoint matrix & diagrams.
- [ ] **D3. DEV_ARCHITECTURE.md** – add component tree & data flow for Draft Slot Correlation.

---

## E. CI / Misc
- [ ] **E1. Extend pytest path** for new tests.
- [ ] **E2. Add `pnpm test` (Vitest) step to FE workflow**.
- [ ] **E3. Bump API version to `1.1.0` in `backend/app/main.py` once merged.**

---

### Progress Legend
- ☑️ Done   🔄 In Progress   ⬜ To Do

Keep this file up-to-date as tasks are completed.
