"""DuckDB service for executing SQL queries over draft data.

This service initialises an in-memory DuckDB connection, exposes a helper
`query_duckdb` that always returns a Polars ``DataFrame`` so the rest of the
codebase can remain Polars-centric.
"""

from __future__ import annotations

import logging
import os
from typing import Any, Optional, Sequence

import duckdb  # type: ignore
import polars as pl

# Local import to re-use existing helper for data path.
from .data_service import DataService  # pylint: disable=cyclic-import

logger = logging.getLogger(__name__)


class DuckDBService:  # pylint: disable=too-few-public-methods
    """Singleton wrapper around a DuckDB connection.

    The connection is kept in-memory for speed.  We expose only *read* query
    capability.  Any heavy analytics that can benefit from SQL can leverage
    this layer while lighter transforms can still use Polars directly.
    """

    def __init__(self) -> None:
        logger.info("Initialising DuckDB…")
        self._con = duckdb.connect(database=":memory:", read_only=False)

        # Ensure arrow / polars integration is enabled.
        self._con.execute("PRAGMA enable_object_cache;")

        # Attach parquet file as a view so SQL can read it lazily.
        data_path = self._get_data_path()
        logger.info("Attaching parquet file to DuckDB: %s", data_path)
        self._con.execute(
            f"CREATE OR REPLACE VIEW picks AS SELECT * FROM parquet_scan('{data_path.replace("'", "''")}');"
        )

        # Register Polars DataFrame for mixed queries (optional, may be used by
        # future analytics).  This keeps a *shared* arrow table; memory copy is
        # negligible given ~12 MB file.
        try:
            df = DataService().get_dataframe()  # type: ignore  # singleton
            self._con.register("picks_df", df.to_arrow())
        except Exception as exc:  # pylint: disable=broad-except
            logger.warning("Could not register Polars DataFrame with DuckDB: %s", exc)

        logger.info("DuckDB initialised successfully.")

    # ---------------------------------------------------------------------
    # Helpers
    # ---------------------------------------------------------------------
    @staticmethod
    def _get_data_path() -> str:
        """Return absolute path to the parquet data file (shared with DataService)."""
        backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        return os.path.abspath(os.path.join(backend_dir, "..", "data", "updated_bestball_data.parquet"))

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------
    def query(self, sql: str, params: Optional[Sequence[Any]] | None = None) -> pl.DataFrame:  # noqa: D401
        """Run *read-only* SQL against DuckDB and return a Polars ``DataFrame``.

        Parameters
        ----------
        sql
            SQL statement.  Should be read-only.  Placeholders ``?`` can be
            used for params.
        params
            Optional sequence of binding parameters.
        """
        logger.debug("DuckDB query: %s — params=%s", sql, params)
        if params is None:
            result = self._con.execute(sql)
        else:
            result = self._con.execute(sql, params)
        # Use Arrow buffer → Polars for zero-copy where possible.
        return pl.from_arrow(result.arrow())


# Global singleton instance so it can be imported anywhere.
duckdb_service = DuckDBService()
