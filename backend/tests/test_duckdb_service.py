"""Unit tests for the DuckDBService wrapper."""

import polars as pl

from backend.app.services.duckdb_service import duckdb_service


def test_simple_select():
    """A trivial select should return a DataFrame with value 1."""
    df: pl.DataFrame = duckdb_service.query("SELECT 1 AS one")
    assert not df.is_empty()
    assert df.shape == (1, 1)
    assert df["one"].to_list() == [1]


def test_picks_view_query():
    """The `picks` view should contain rows and expected columns."""
    df: pl.DataFrame = duckdb_service.query("SELECT COUNT(*) AS cnt FROM picks")
    assert not df.is_empty()
    assert df["cnt"][0] > 0

    # Verify that typical columns exist
    columns_df = duckdb_service.query("PRAGMA table_info('picks')")
    expected_cols = {"player", "Position", "pick", "draft"}
    actual_cols = set(columns_df["name"].to_list())
    assert expected_cols.issubset(actual_cols)
