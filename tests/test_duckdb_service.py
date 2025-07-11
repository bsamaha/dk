"""Unit tests for DuckDBService."""

import pytest
import polars as pl

from backend.app.services.duckdb_service import duckdb_service


def test_duckdb_basic_select() -> None:
    """DuckDB should execute a simple query and return a Polars DataFrame."""
    df: pl.DataFrame = duckdb_service.query("SELECT 1 AS one, 2 AS two")
    assert isinstance(df, pl.DataFrame)
    assert df.shape == (1, 2)
    assert df[0, "one"] == 1
    assert df[0, "two"] == 2


@pytest.mark.parametrize("anchor_player", [
    "Christian McCaffrey",
    "Travis Kelce",
])
def test_duckdb_parquet_scan(anchor_player: str) -> None:
    """Ensure the attached parquet view is queryable."""
    sql = (
        "SELECT COUNT(*) AS cnt FROM picks WHERE player = ? LIMIT 1;"
    )
    df = duckdb_service.query(sql, [anchor_player])
    # Result should be one row and one column
    assert df.shape == (1, 1)
    # cnt should be non-negative integer
    cnt_val = df[0, 0]
    assert isinstance(cnt_val, (int,))
    assert cnt_val >= 0
