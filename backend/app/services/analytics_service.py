"""Analytics service that leverages DuckDB for heavy SQL queries.

The goal is to off-load complex group-by / filtering operations to DuckDB and
then perform final small aggregations in Polars so the existing Pydantic
schemas remain unchanged.
"""

from __future__ import annotations

import logging
from typing import Any, List, Dict, Optional, Tuple

import polars as pl

from .duckdb_service import duckdb_service
from ..models.schemas import Player, Position, SortableColumn, SortOrder

logger = logging.getLogger(__name__)


class AnalyticsService:  # pylint: disable=too-few-public-methods
    """Wrapper around DuckDB heavy queries."""

    # ------------------------------------------------------------------
    # Players Listing
    # ------------------------------------------------------------------
    @staticmethod
    def get_players(
        positions: Optional[List[Position]] = None,
        search_term: Optional[str] = None,
        limit: int = 100,
        offset: int = 0,
        sort_by: SortableColumn = SortableColumn.AVG_PICK,
        sort_order: SortOrder = SortOrder.ASC,
    ) -> Tuple[List[Player], int]:
        """Return a paginated list of players with aggregated draft statistics.

        This implementation runs the heavy aggregation in DuckDB and returns
        Pydantic `Player` models so the existing API schema remains unchanged.
        """
        # --------------------------------------------------------------
        # Pre-compute total drafts for draft_percentage calculation.
        # --------------------------------------------------------------
        total_drafts_df = duckdb_service.query(
            "SELECT COUNT(DISTINCT draft) AS n FROM picks LIMIT 1;"
        )
        total_drafts: int = int(total_drafts_df.item()) if not total_drafts_df.is_empty() else 1

        # --------------------------------------------------------------
        # Build dynamic WHERE clause based on optional filters.
        # --------------------------------------------------------------
        where_clauses: List[str] = []

        if positions:
            pos_sql = ", ".join([f"'{p.value}'" for p in positions])
            where_clauses.append(f"Position IN ({pos_sql})")

        if search_term:
            sanitized = search_term.lower().replace("'", "''")
            where_clauses.append(f"lower(player) LIKE '%{sanitized}%'")

        where_sql = f"WHERE {' AND '.join(where_clauses)}" if where_clauses else ""

        # --------------------------------------------------------------
        # Base aggregation SQL.
        # --------------------------------------------------------------
        base_sql = f"""
        SELECT
            player,
            Position,
            Team,
            AVG(pick)      AS avg_pick,
            MIN(pick)      AS min_pick,
            MAX(pick)      AS max_pick,
            COUNT(*) * 100.0 / {total_drafts} AS draft_percentage
        FROM picks
        {where_sql}
        GROUP BY player, Position, Team
        """

        # Total count BEFORE pagination
        total_count_df = duckdb_service.query(f"SELECT COUNT(*) AS cnt FROM ({base_sql})")
        total_count: int = int(total_count_df['cnt'][0]) if not total_count_df.is_empty() else 0

        # Apply order, pagination
        order_dir = 'DESC' if sort_order == SortOrder.DESC else 'ASC'
        final_sql = (
            f"{base_sql}\n"
            f"ORDER BY {sort_by.value} {order_dir}\n"
            f"LIMIT {limit} OFFSET {offset}"
        )

        logger.info("Running DuckDB players query: limit=%d offset=%d", limit, offset)
        df: pl.DataFrame = duckdb_service.query(final_sql)
        if df.is_empty():
            return [], total_count

        df = df.rename({"player": "name", "Position": "position", "Team": "team"})
        players = [Player(**row) for row in df.to_dicts()]
        return players, total_count

    # ------------------------------------------------------------------
    # Player Combinations
    # ------------------------------------------------------------------
    @staticmethod
    def get_player_combinations(
        required_players: List[str],
        n_rounds: int = 20,
        limit: int = 100,
    ) -> List[Dict[str, Any]]:
        """Return teams that drafted *all* `required_players` within first `n_rounds`.

        The heavy filtering of candidate teams is done in DuckDB; the final
        reshape to match the existing schema is finished with Polars.
        """
        if not required_players:
            return []

        # Sanitize and build SQL IN list
        players_sql_list = ", ".join(
            [f"'{p.replace("'", "''")}'" for p in required_players]
        )
        num_required = len(required_players)

        sql = f"""
        WITH filtered AS (
            SELECT draft,
                   team_id,
                   player,
                   Position,
                   round,
                   draft_position
            FROM picks
            WHERE round <= {n_rounds}
        ), target_teams AS (
            SELECT team_id
            FROM filtered
            WHERE player IN ({players_sql_list})
            GROUP BY team_id
            HAVING COUNT(DISTINCT player) = {num_required}
        )
        SELECT *
        FROM filtered
        WHERE team_id IN (SELECT team_id FROM target_teams)
        ORDER BY draft, draft_position, team_id, round;
        """

        logger.info(
            "Running DuckDB combination query for %d required players (<= round %d)",
            num_required,
            n_rounds,
        )
        df: pl.DataFrame = duckdb_service.query(sql)
        if df.is_empty():
            return []

        # Aggregate per team using Polars (cheap at this stage)
        result_df = (
            df.lazy()
            .group_by("team_id")
            .agg(
                pl.col("player").alias("players"),
                pl.col("Position").alias("positions"),
                pl.col("draft").first().alias("draft_id"),
                pl.col("draft_position").first(),
            )
            .collect()
            .sort(["draft_id", "draft_position"])  # deterministic order
            .head(limit)
        )

        if result_df.is_empty():
            return []

        # Calculate position counts → string representation "QB:2, RB:5"
        position_counts_df = (
            result_df.lazy()
            .select(["team_id", "positions"])
            .explode("positions")
            .group_by(["team_id", "positions"])
            .agg(pl.len().alias("count"))
            .collect()
            .pivot(index="team_id", columns="positions", values="count")
            .fill_null(0)
        )

        if not position_counts_df.is_empty():
            pos_cols = [c for c in position_counts_df.columns if c != "team_id"]
            position_counts_str_df = (
                position_counts_df.lazy()
                .with_columns(
                    pl.concat_str(
                        [pl.format("{}: {}", pl.lit(c), pl.col(c)) for c in pos_cols],
                        separator=", ",
                    ).alias("position_counts")
                )
                .select(["team_id", "position_counts"])
                .collect()
            )
            final_df = result_df.join(position_counts_str_df, on="team_id", how="left")
        else:
            final_df = result_df.with_columns(pl.lit(None, dtype=pl.String).alias("position_counts"))

        logger.info("DuckDB combination query returned %d teams", final_df.height)
        return final_df.to_dicts()


# Global singleton
analytics_service = AnalyticsService()
