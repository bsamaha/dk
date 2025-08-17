# ADR-0001: Adopt DuckDB + Polars Hybrid Query Layer

Date: 2025-07-10
Status: Accepted

## Context

The original back-end used **Polars** exclusively to query a ~12 MB parquet file that contains 3.6 million draft picks.  Polars is extremely fast for columnar transforms, but SQL-heavy analytics (multi-level group-by, joins, window functions) became verbose and harder to maintain.

Meanwhile, **DuckDB** provides an in-process analytical SQL engine that can directly query Parquet files without an external server.  For several endpoints (heat-map, stack finder, ADP drift and player combinations) the SQL representation is both clearer and—on benchmarks—up to **3× faster**.

## Decision

1. Embed a single in-memory DuckDB connection at start-up.
2. Keep the design simple: use DuckDB SQL for analytics, with lightweight Polars shaping when needed.
3. Consolidate into a single **QueryService** with parameterized SQL and small materialized tables for hot reads.
4. Preserve existing Pydantic response models and router contracts—callers are agnostic to internal query details.

## Consequences

* Developers can write concise analytic SQL instead of complex Polars chains for new endpoints.
* Runtime automatically selects the fastest path per query/workload—"best of both worlds".
* The fallback adds negligible overhead (<0.1 ms) when DuckDB is fast; significant speed-ups when it is not.
* Slightly higher memory footprint (~25 MB) due to holding both Polars DataFrame and DuckDB object cache.
* Future work: consider additional materialized views for other hot endpoints if needed.

## Alternatives Considered

* **DuckDB-only** – simpler but would require rewriting all existing Polars code and gives up the blazing-fast DataFrame API for simple transforms.
* **Polars-only** – maintain status quo; loses clarity & performance for complex aggregations.
* **SQLite + Parquet extension** – less performant and limits SQL functionality compared to DuckDB.

## References

* Benchmark script: `scripts/benchmark_duckdb_vs_polars.py`
* Implementation: `backend/app/services/query_service.py`
