"""Analytics service that leverages DuckDB for heavy SQL queries.

The goal is to off-load complex group-by / filtering operations to DuckDB and
then perform final small aggregations in Polars so the existing Pydantic
schemas remain unchanged.
"""

from __future__ import annotations

import logging
import time
from typing import Any, List, Dict, Optional, Tuple

import polars as pl

from .duckdb_service import duckdb_service
from .data_service import data_service  # Polars fallback
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
        t0 = time.perf_counter()
        df: pl.DataFrame = duckdb_service.query(final_sql)
        dur_duck = time.perf_counter() - t0

        if df.is_empty():
            return [], total_count

        # Optionally benchmark Polars path if DuckDB slower than 50 ms
        players: List[Player]
        if dur_duck > 0.05:  # 50 ms threshold to consider fallback check
            t1 = time.perf_counter()
            pol_players, pol_total = data_service.get_players(
                positions=positions,
                search_term=search_term,
                limit=limit,
                offset=offset,
                sort_by=sort_by,
                sort_order=sort_order,
            )
            dur_pol = time.perf_counter() - t1
            if dur_pol < dur_duck * 0.8:  # >20 % faster
                logger.info(
                    "Polars faster (%.2f ms) than DuckDB (%.2f ms); using fallback", dur_pol * 1e3, dur_duck * 1e3
                )
                return pol_players, pol_total

        # Default: use DuckDB result
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
        # Escape single quotes by doubling them (SQL standard)
        sanitized_players = [p.replace("'", "''") for p in required_players]
        players_sql_list = ", ".join([f"'{p}'" for p in sanitized_players])
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
        t0 = time.perf_counter()
        df: pl.DataFrame = duckdb_service.query(sql)
        dur_duck = time.perf_counter() - t0

        if df.is_empty():
            return []

        # Optionally benchmark Polars path if DuckDB slower than 50 ms
        result: List[Dict[str, Any]]
        if dur_duck > 0.05:  # 50 ms threshold to consider fallback check
            t1 = time.perf_counter()
            pol_result = data_service.get_player_combinations(
                required_players=required_players,
                n_rounds=n_rounds,
                limit=limit,
            )
            dur_pol = time.perf_counter() - t1
            if dur_pol < dur_duck * 0.8:  # >20 % faster
                logger.info(
                    "Polars faster (%.2f ms) than DuckDB (%.2f ms); using fallback", dur_pol * 1e3, dur_duck * 1e3
                )
                return pol_result

        # Default: use DuckDB result
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


    # ------------------------------------------------------------------
    # Heat Map (draft round x position counts)
    # ------------------------------------------------------------------
    @staticmethod
    def get_heat_map() -> List[Dict[str, Any]]:
        """Return pick counts grouped by round & position for heat-map visual.
        """
        sql = """
        SELECT round, Position, COUNT(*) AS count
        FROM picks
        GROUP BY round, Position
        ORDER BY round, Position;
        """
        df = duckdb_service.query(sql)
        return df.to_dicts()

    # ------------------------------------------------------------------
    # Stack Finder (QB + WR/TE same NFL team drafted by same fantasy team)
    # ------------------------------------------------------------------
    @staticmethod
    def get_stacks(n_rounds: int = 10, limit: int = 100) -> List[Dict[str, Any]]:
        """Find basic QB/receiver stacks drafted within first `n_rounds`."""
        sql = f"""
        WITH early AS (
            SELECT draft, team_id, player, Position, Team AS nfl_team, round
            FROM picks
            WHERE round <= {n_rounds}
        ),
        qbs AS (
            SELECT draft, team_id, player AS qb, nfl_team, round AS round_qb
            FROM early
            WHERE Position = 'QB'
        ),
        wrte AS (
            SELECT draft, team_id, player AS receiver, nfl_team, round AS round_receiver
            FROM early
            WHERE Position IN ('WR', 'TE')
        ),
        combos AS (
            SELECT q.draft, q.team_id, q.nfl_team, q.qb, w.receiver, q.round_qb, w.round_receiver
            FROM qbs q
            JOIN wrte w
              ON q.draft = w.draft AND q.team_id = w.team_id AND q.nfl_team = w.nfl_team
        )
        SELECT *
        FROM combos
        ORDER BY draft, team_id
        LIMIT {limit};
        """
        return duckdb_service.query(sql).to_dicts()

    # ------------------------------------------------------------------
    # ADP Drift (compare first half vs second half drafts)
    # ------------------------------------------------------------------
    @staticmethod
    def get_adp_drift() -> List[Dict[str, Any]]:
        """Calculate average pick drift between early vs late halves of drafts."""
        # Determine midpoint draft id
        midpoint_df = duckdb_service.query("""SELECT median(draft) AS mid FROM picks""")
        mid = int(midpoint_df["mid"][0])

        sql_template = """
        SELECT player, Position, AVG(pick) AS avg_pick
        FROM picks
        WHERE draft {cond}
        GROUP BY player, Position
        """
        early_df = duckdb_service.query(sql_template.format(cond=f"<= {mid}") )
        late_df = duckdb_service.query(sql_template.format(cond=f"> {mid}") )

        # Join on player/position
        merged = (
            early_df.rename({"avg_pick": "avg_pick_early"})
            .join(late_df.rename({"avg_pick": "avg_pick_late"}), on=["player", "Position"], how="inner")
            .with_columns((pl.col("avg_pick_late") - pl.col("avg_pick_early")).alias("drift"))
            .sort("drift", descending=True)
        )
        return merged.to_dicts()

# Global singleton
analytics_service = AnalyticsService()
