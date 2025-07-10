# DuckDB Integration – Detailed Task Tracker (v2 Release)
*Created 2025-07-10*

This tracker enumerates all tasks required to integrate DuckDB while retaining Polars for DataFrame ergonomics.

---

## A. Dependency & Environment
- [ ] **A1. Add DuckDB** – append `duckdb>=0.10` to `backend/requirements.txt`; install locally.
- [ ] **A2. Verify local build** – `pip install -r backend/requirements.txt` completes without errors in CI.

---

## B. Data Layer
- [ ] **B1. New Service** – create `backend/app/services/duckdb_service.py` or extend `DataService`:
  - [ ] Initialise in-memory DuckDB connection at start-up.
  - [ ] `ATTACH 'data/updated_bestball_data.parquet' AS draft_data (AUTO_DETECT TRUE)` or `CREATE VIEW`.
  - [ ] Expose helper `query_duckdb(sql: str) -> pl.DataFrame` converting result to Polars via `df_pl = pl.from_arrow(table)`.
- [ ] **B2. Register Polars DataFrame** (optional) – `duckdb.register('picks_df', self._df)` for mixed queries.
- [ ] **B3. Benchmarks** – script `scripts/benchmark_duckdb_vs_polars.py` to compare typical stats query latency (p95 goal ≤ 100 ms).

---

## C. Refactor Existing Endpoints
- [ ] **C1. Player combinations** – port heavy group-by logic to DuckDB SQL if faster.
- [ ] **C2. Pending analytics** – design SQL for Heat Map, Stack Finder, Drift endpoints.
- [ ] **C3. Implement fallback** – use Polars if DuckDB slower (>20 %).

---

## D. Testing
- [ ] **D1. Unit tests duckdb_service** – connect, simple select, detaches cleanly.
- [ ] **D2. Integration tests** – ensure API endpoints still return identical results pre/post refactor.

---

## E. Documentation & ADR
- [ ] **E1. ENGINEERING.md** – add DuckDB section under Data Layer.
- [ ] **E2. ADR-0001** – document rationale for DuckDB + Polars hybrid (simplicity, performance).
- [ ] **E3. DEV_ARCHITECTURE.md** – update diagrams.

---

### Progress Legend
☑️ Done   🔄 In Progress   ⬜ To Do
