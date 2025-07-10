# DuckDB Integration – Detailed Task Tracker (v2 Release)
*Created 2025-07-10*

This tracker enumerates all tasks required to integrate DuckDB while retaining Polars for DataFrame ergonomics.

---

## A. Dependency & Environment
- ☑️ **A1. Add DuckDB** – append `duckdb>=0.10` to `backend/requirements.txt`; install locally.
- 🔄 **A2. Verify local build** – `pip install -r backend/requirements.txt` completes without errors in CI.

---

## B. Data Layer
- ☑️ **B1. New Service** – create `backend/app/services/duckdb_service.py` or extend `DataService`:
  - ☑️ Initialise in-memory DuckDB connection at start-up.
  - ☑️ `CREATE VIEW` on `updated_bestball_data.parquet`.
  - ☑️ Expose helper `query(sql: str) -> pl.DataFrame` converting Arrow → Polars.
- ☑️ **B2. Register Polars DataFrame** – `duckdb.register('picks_df', self._df)` for mixed queries.
- ☑️ **B3. Benchmarks** – script `scripts/benchmark_duckdb_vs_polars.py` in place; generates latency comparison.

---

## C. Refactor Existing Endpoints
- ☑️ **C1. Player combinations** – port heavy group-by logic to DuckDB SQL.
- ⬜ **C2. Pending analytics** – design SQL for Heat Map, Stack Finder, Drift endpoints.
- ⬜ **C3. Implement fallback** – use Polars if DuckDB slower (>20 %).

---

## D. Testing
- ☑️ **D1. Unit tests duckdb_service** – basic connection & query tests implemented.
- 🔄 **D2. Integration tests** – endpoints covered: players, search, combinations, metadata, positions. Still verify numeric parity.

---

## E. Documentation & ADR
- ⬜ **E1. ENGINEERING.md** – add DuckDB section under Data Layer.
- ⬜ **E2. ADR-0001** – document rationale for DuckDB + Polars hybrid (simplicity, performance).
- ⬜ **E3. DEV_ARCHITECTURE.md** – update diagrams.

---

### Progress Legend
☑️ Done   🔄 In Progress   ⬜ To Do
