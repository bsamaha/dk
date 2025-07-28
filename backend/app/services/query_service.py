"""Unified query service for all data operations.

This service consolidates the functionality of DataService, AnalyticsService, and DuckDBService
into a single, coherent interface. It manages the DuckDB connection and provides all
data access methods through SQL queries.
"""

from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional, Sequence, Tuple

import duckdb  # type: ignore
import polars as pl

from ..models.schemas import (
    AggregationType,
    Player,
    Position,
    PositionRoundCount,
    PositionStats,
    RosterConstruction,
    SortableColumn,
    SortOrder,
)

logger = logging.getLogger(__name__)


class QueryService:
    """Unified service for all data operations using DuckDB."""

    def __init__(self) -> None:
        logger.info("Initializing QueryService with DuckDB...")
        self._con = duckdb.connect(database=":memory:", read_only=False)

        # Enable arrow/polars integration
        self._con.execute("PRAGMA enable_object_cache;")

        # Attach parquet file as a view
        data_path = self._get_data_path()
        logger.info("Attaching parquet file to DuckDB: %s", data_path)

        # Validate path safety
        if not Path(data_path).exists():
            raise ValueError(f"Invalid or unsafe path: {data_path}")

        # Escape single quotes for SQL literal
        sanitized_path = data_path.replace("'", "''")

        # Create view with data corrections
        self._con.execute(
            f"""
            CREATE OR REPLACE VIEW picks AS
            SELECT
                player,
                Position,
                Team,
                -- Correct overflow: if value negative add 256 then cast to SMALLINT
                CAST(CASE WHEN pick < 0 THEN pick + 256 ELSE pick END AS SMALLINT) AS pick,
                round,
                draft_position,
                draft,
                team_id
            FROM parquet_scan('{sanitized_path}');
            """  # nosec B608  # Safe due to prior path validation
        )

        # Load Week 17 matchups
        self._load_week17_matchups()

        logger.info("QueryService initialized successfully.")

        self.total_drafts = int(
            self.query("SELECT COUNT(DISTINCT draft) AS count FROM picks")["count"][0]
            or 0
        )
        self.total_teams = int(
            self.query("SELECT COUNT(DISTINCT team_id) AS count FROM picks")["count"][0]
            or 0
        )
        self.total_players = int(
            self.query("SELECT COUNT(DISTINCT player) AS count FROM picks")["count"][0]
            or 0
        )
        self.all_players = self.query(
            "SELECT DISTINCT player FROM picks ORDER BY player"
        )["player"].to_list()

    @staticmethod
    def _get_data_path() -> str:
        """Return absolute path to the parquet data file."""
        # From backend/app/services/query_service.py, go up to project root
        project_root = Path(__file__).parent.parent.parent.parent
        data_path = project_root / "data" / "updated_bestball_data.parquet"
        return str(data_path.resolve())

    def _load_week17_matchups(self) -> None:
        """Load Week 17 matchups data into DuckDB."""
        # Get path to Week 17 matchups file
        project_root = Path(__file__).parent.parent.parent.parent
        matchups_path = project_root / "data" / "week17_matchups.json"

        if not matchups_path.exists():
            logger.warning("Week 17 matchups file not found: %s", matchups_path)
            return

        # Load JSON data
        with open(matchups_path, "r") as f:
            matchups_data = json.load(f)

        # Validate structure of matchups_data
        if not isinstance(matchups_data, dict):
            logger.error("Week 17 matchups JSON is not a dictionary: %s", matchups_path)
            return

        for team, opponent in matchups_data.items():
            if not isinstance(team, str) or not isinstance(opponent, str):
                logger.error(
                    "Invalid matchup entry in %s: team=%r, opponent=%r (both must be strings)",
                    matchups_path,
                    team,
                    opponent,
                )
                return

        # Create list of tuples for DuckDB
        matchups_rows = [(team, opponent) for team, opponent in matchups_data.items()]

        # Create DuckDB table from the data
        self._con.execute("DROP TABLE IF EXISTS week17_matchups")
        self._con.execute("""
            CREATE TABLE week17_matchups (
                team VARCHAR,
                opponent VARCHAR
            )
        """)

        # Insert data
        self._con.executemany(
            "INSERT INTO week17_matchups (team, opponent) VALUES (?, ?)", matchups_rows
        )

        logger.info("Loaded %d Week 17 matchups into DuckDB", len(matchups_rows))

    def query(
        self, sql: str, params: Optional[Sequence[Any]] | None = None
    ) -> pl.DataFrame:
        """Execute SQL query and return Polars DataFrame.

        Parameters
        ----------
        sql
            SQL statement. Should be read-only. Placeholders `?` can be
            used for params.
        params
            Optional sequence of binding parameters.
        """
        logger.debug("DuckDB query: %s — params=%s", sql, params)
        if params is None:
            result = self._con.execute(sql)
        else:
            result = self._con.execute(sql, params)
        # Use Arrow buffer → Polars for zero-copy where possible
        arrow_result = result.arrow()
        polars_result = pl.from_arrow(arrow_result)

        # Ensure we always return a DataFrame, not a Series
        if isinstance(polars_result, pl.Series):
            return polars_result.to_frame()
        return polars_result

    def get_metadata(self) -> Dict[str, Any]:
        """Get metadata about the dataset."""
        return {
            "all_players": self.all_players,
            "total_drafts": self.total_drafts,
            "total_teams": self.total_teams,
            "total_players": self.total_players,
        }

    def get_players(
        self,
        positions: Optional[List[Position]] = None,
        search_term: Optional[str] = None,
        limit: int = 100,
        offset: int = 0,
        sort_by: SortableColumn = SortableColumn.AVG_PICK,
        sort_order: SortOrder = SortOrder.ASC,
    ) -> Tuple[List[Player], int]:
        """Return a paginated list of players with aggregated draft statistics."""
        total_drafts = self.total_drafts if self.total_drafts > 0 else 1

        # Build dynamic WHERE clause based on optional filters
        where_clauses: List[str] = []
        params: List[Any] = []

        if positions:
            # Use parameterized query for positions
            placeholders = ", ".join(["?" for _ in positions])
            where_clauses.append(f"Position IN ({placeholders})")
            params.extend([p.value for p in positions])

        if search_term:
            # Use parameterized query for search term
            where_clauses.append("lower(player) LIKE ?")
            params.append(f"%{search_term.lower()}%")

        where_sql = f"WHERE {' AND '.join(where_clauses)}" if where_clauses else ""

        # Base aggregation SQL
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
        """  # nosec B608  # Safe: total_drafts is computed from database, where_sql uses parameterized queries

        # Total count BEFORE pagination
        total_count_df = self.query(
            f"SELECT COUNT(*) AS cnt FROM ({base_sql})",  # nosec B608  # Safe: base_sql uses parameterized queries
            params,
        )
        total_count: int = (
            int(total_count_df["cnt"][0]) if not total_count_df.is_empty() else 0
        )

        # Apply order, pagination
        order_dir = "DESC" if sort_order == SortOrder.DESC else "ASC"
        final_sql = (
            f"{base_sql}\n"
            f"ORDER BY {sort_by.value} {order_dir}\n"
            f"LIMIT {limit} OFFSET {offset}"
        )

        logger.info("Running players query: limit=%d offset=%d", limit, offset)
        df: pl.DataFrame = self.query(final_sql, params)

        if df.is_empty():
            return [], total_count

        # Convert to Player models
        df = df.rename({"player": "name", "Position": "position", "Team": "team"})
        players = [Player(**row) for row in df.to_dicts()]
        return players, total_count

    def get_player_details(
        self, player_name: str, position: str, team: str
    ) -> Dict[str, Any]:
        """Get detailed draft data for a single player."""
        sql = """
        SELECT
            AVG(pick) AS avg_pick,
            AVG(round) AS avg_round,
            MIN(pick) AS min_pick,
            MAX(pick) AS max_pick,
            STDDEV(pick) AS std_dev_pick,
            COUNT(DISTINCT team_id) AS total_drafts,
            COALESCE(ARRAY_AGG(pick), []) AS picks,
            COALESCE(ARRAY_AGG(round), []) AS rounds
        FROM picks
        WHERE player = ? AND Position = ? AND Team = ?
        """

        df = self.query(sql, [player_name, position, team])

        if df.is_empty() or int(df["total_drafts"][0] or 0) == 0:
            # Return dictionary with player identifiers and null statistical values
            return {
                "player_name": player_name,
                "position": position,
                "team": team,
                "avg_pick": None,
                "avg_round": None,
                "min_pick": None,
                "max_pick": None,
                "std_dev_pick": None,
                "total_drafts": 0,
                "picks": [],
                "rounds": [],
            }

        result = df.to_dicts()[0]
        result["player_name"] = player_name
        result["position"] = position
        result["team"] = team
        return result

    def get_position_stats(self) -> List[PositionStats]:
        """Get statistics by position."""
        # Calculate median players per position per draft
        median_sql = """
        WITH position_counts AS (
            SELECT draft, Position, COUNT(*) as position_count
            FROM picks
            GROUP BY draft, Position
        )
        SELECT
            Position,
            MEDIAN(position_count) as median_draft_count
        FROM position_counts
        GROUP BY Position
        """

        # Calculate total and unique counts
        stats_sql = """
        SELECT
            Position,
            COUNT(*) as total_drafted,
            COUNT(DISTINCT player) as unique_players
        FROM picks
        GROUP BY Position
        """

        median_df = self.query(median_sql)
        stats_df = self.query(stats_sql)

        # Join the results
        combined_df = stats_df.join(median_df, on="Position", how="left")

        # Convert to PositionStats objects and sort
        position_stats_list = [
            PositionStats(
                position=row["Position"],
                total_drafted=row["total_drafted"],
                unique_players=row["unique_players"],
                median_draft_count=row["median_draft_count"],
            )
            for row in combined_df.iter_rows(named=True)
        ]

        # Sort by position order
        position_order = ["QB", "RB", "WR", "TE"]
        position_stats_list.sort(key=lambda p: position_order.index(p.position))

        return position_stats_list

    def get_first_player_draft_stats(self) -> List[Dict[str, Any]]:
        """Get the avg, min, and max pick for the first player drafted at each position."""
        sql = """
        WITH first_picks AS (
            SELECT
                draft,
                Position,
                MIN(pick) as first_pick
            FROM picks
            GROUP BY draft, Position
        )
        SELECT
            Position,
            AVG(first_pick) as avg_first_pick,
            MIN(first_pick) as min_first_pick,
            MAX(first_pick) as max_first_pick
        FROM first_picks
        GROUP BY Position
        ORDER BY Position
        """

        return self.query(sql).to_dicts()

    def get_position_draft_counts_by_round(
        self,
        position: Position,
        aggregation: AggregationType = AggregationType.MEAN,
    ) -> List[PositionRoundCount]:
        """Get position draft counts by round."""
        agg_func = "AVG" if aggregation == AggregationType.MEAN else "MEDIAN"

        sql = f"""
            WITH all_rounds AS (
                SELECT DISTINCT round FROM picks
            ),
            all_drafts AS (
                SELECT DISTINCT draft FROM picks
            ),
            round_draft_grid AS (
                SELECT round, draft FROM all_rounds CROSS JOIN all_drafts
            ),
            position_counts AS (
                SELECT round, draft, COUNT(*) as count
                FROM picks
                WHERE Position = ?
                GROUP BY round, draft
            ),
            complete_counts AS (
                SELECT
                    g.round,
                    g.draft,
                    COALESCE(p.count, 0) as count
                FROM round_draft_grid g
                LEFT JOIN position_counts p ON g.round = p.round AND g.draft = p.draft
            )
            SELECT
                round,
                {agg_func}(count) as count
            FROM complete_counts
            GROUP BY round
            ORDER BY round
            """  # nosec B608

        df = self.query(sql, [position.value])

        return [
            PositionRoundCount(round=row["round"], count=row["count"])
            for row in df.iter_rows(named=True)
        ]

    def get_player_combinations(
        self,
        required_players: List[str],
        n_rounds: int = 20,
        limit: int = 100,
    ) -> List[Dict[str, Any]]:
        """Return teams that drafted all required players within first n_rounds."""
        if not required_players:
            return []

        # Use parameterized query for player names
        placeholders = ", ".join(["?" for _ in required_players])
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
            WHERE round <= ?
        ), target_teams AS (
            SELECT team_id
            FROM filtered
            WHERE player IN ({placeholders})
            GROUP BY team_id
            HAVING COUNT(DISTINCT player) = ?
        )
        SELECT *
        FROM filtered
        WHERE team_id IN (SELECT team_id FROM target_teams)
        ORDER BY draft, draft_position, team_id, round;
        """  # nosec B608  # Safe: placeholders is generated from parameterized query

        # Build parameters list: [n_rounds, *required_players, num_required]
        params = [n_rounds] + required_players + [num_required]

        logger.info(
            "Running combination query for %d required players (<= round %d)",
            num_required,
            n_rounds,
        )
        df: pl.DataFrame = self.query(sql, params)

        if df.is_empty():
            return []

        # Aggregate per team using Polars
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
            .sort(["draft_id", "draft_position"])
            .head(limit)
        )

        if result_df.is_empty():
            return []

        # Calculate position counts
        position_counts_df = (
            result_df.lazy()
            .select(["team_id", "positions"])
            .explode("positions")
            .group_by(["team_id", "positions"])
            .agg(pl.len().alias("count"))
            .collect()
            .pivot(index="team_id", on="positions", values="count")
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
            final_df = result_df.with_columns(
                pl.lit(None, dtype=pl.String).alias("position_counts")
            )

        logger.info("Combination query returned %d teams", final_df.height)
        return final_df.to_dicts()

    def get_stacks(self, n_rounds: int = 10, limit: int = 100) -> List[Dict[str, Any]]:
        """Find QB/receiver stacks drafted within first n_rounds."""
        sql = """
        WITH early AS (
            SELECT draft, team_id, player, Position, Team AS nfl_team, round
            FROM picks
            WHERE round <= ?
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
        LIMIT ?;
        """
        return self.query(sql, [n_rounds, limit]).to_dicts()

    def get_heat_map(self) -> List[Dict[str, Any]]:
        """Return pick counts grouped by round & position for heat-map visual."""
        sql = """
        SELECT round, Position as position, COUNT(*) AS count
        FROM picks
        GROUP BY round, Position
        ORDER BY round, Position;
        """
        return self.query(sql).to_dicts()

    def get_draft_slot_correlation(
        self,
        slot: int,
        metric: str = "percent",
        top_n: int = 25,
        min_teams: int = 10,
    ) -> List[Dict[str, Any]]:
        """Return players most correlated with a given draft slot."""
        if metric not in {"count", "percent", "ratio"}:
            raise ValueError("metric must be 'count', 'percent', or 'ratio'")

        # Pre-compute totals
        totals_sql = """
        WITH uniq AS (
            SELECT DISTINCT draft, team_id, draft_position
            FROM picks
        )
        SELECT
            COUNT(*)                            AS total_overall,
            SUM(CASE WHEN draft_position = ? THEN 1 ELSE 0 END) AS total_slot
        FROM uniq;
        """
        totals_df: pl.DataFrame = self.query(totals_sql, [slot])
        if totals_df.is_empty():
            return []
        total_overall = int(totals_df["total_overall"][0])
        total_slot = int(totals_df["total_slot"][0]) or 1

        # Compute counts per player
        query_sql = """
        WITH uniq AS (
            SELECT DISTINCT draft, team_id, draft_position, player
            FROM picks
        ),
        counts AS (
            SELECT
                player,
                COUNT(*)                         AS overall,
                SUM(CASE WHEN draft_position = ? THEN 1 ELSE 0 END) AS slot
            FROM uniq
            GROUP BY player
            HAVING SUM(CASE WHEN draft_position = ? THEN 1 ELSE 0 END) >= ?
        )
        SELECT
            player,
            slot,
            overall,
            CAST(slot AS DOUBLE) / ?  AS p_slot,
            CAST(overall AS DOUBLE) / ? AS p_overall,
            CASE
                WHEN ? = 'count'   THEN slot
                WHEN ? = 'percent' THEN CAST(slot AS DOUBLE) / ?
                ELSE (CAST(slot AS DOUBLE) / ?) / (CAST(overall AS DOUBLE) / ?)
            END                           AS score
        FROM counts
        ORDER BY score DESC
        LIMIT ?;
        """
        params = [
            slot,
            slot,
            min_teams,
            total_slot,
            total_overall,
            metric,
            metric,
            total_slot,
            total_slot,
            total_overall,
            top_n,
        ]
        result_df: pl.DataFrame = self.query(query_sql, params)
        return result_df.to_dicts()

    def get_adp_drift(self) -> List[Dict[str, Any]]:
        """Calculate average pick drift between early vs late halves of drafts."""
        # Determine midpoint draft id
        midpoint_df = self.query("SELECT median(draft) AS mid FROM picks")
        mid = int(midpoint_df["mid"][0])

        early_sql = """
        SELECT player, Position, AVG(pick) AS avg_pick_early
        FROM picks
        WHERE draft <= ?
        GROUP BY player, Position
        """

        late_sql = """
        SELECT player, Position, AVG(pick) AS avg_pick_late
        FROM picks
        WHERE draft > ?
        GROUP BY player, Position
        """

        early_df = self.query(early_sql, [mid])
        late_df = self.query(late_sql, [mid])

        # Join and calculate drift
        merged = (
            early_df.join(late_df, on=["player", "Position"], how="inner")
            .with_columns(
                (pl.col("avg_pick_late") - pl.col("avg_pick_early")).alias("drift")
            )
            .sort("drift", descending=True)
        )
        return merged.to_dicts()

    def get_roster_construction(self) -> List[RosterConstruction]:
        """Get roster construction for each team across all drafts."""
        sql = """
        WITH position_counts AS (
            SELECT draft, team_id, Position, COUNT(*) as count
            FROM picks
            GROUP BY draft, team_id, Position
        )
        SELECT
            draft,
            team_id,
            Position,
            count
        FROM position_counts
        ORDER BY draft, team_id, Position
        """

        df = self.query(sql)

        if df.is_empty():
            return []

        # Pivot to get positions as columns
        roster_df = (
            df.pivot(index=["draft", "team_id"], on="Position", values="count")
            .fill_null(0)
            .rename({"draft": "draft_id"})
        )

        # Get all possible position names from the enum
        position_columns = [p.value for p in Position]

        # Ensure all position columns exist, filling missing with 0
        for col in position_columns:
            if col not in roster_df.columns:
                roster_df = roster_df.with_columns(pl.lit(0).cast(pl.Int64).alias(col))

        # Group by position counts to find frequency
        roster_counts = (
            roster_df.group_by(position_columns)
            .agg(pl.len().alias("count"))
            .sort("count", descending=True)
        )

        return [
            RosterConstruction(
                draft_id=0,  # Dummy as it's aggregated
                team_id=0,  # Dummy
                position_counts={pos: row.get(pos, 0) for pos in position_columns},
            )
            for row in roster_counts.to_dicts()
        ]

    def get_roster_construction_counts(
        self, required_players: Optional[List[str]] = None
    ) -> List[Dict[str, Any]]:
        """Get aggregated counts of unique roster constructions, focusing on QB, RB, WR, TE."""
        where_clause = ""
        params = []

        if required_players:
            logger.info(
                f"Filtering roster constructions for teams with required players: {required_players}"
            )
            # Get teams that have all required players
            placeholders = ", ".join(["?" for _ in required_players])
            where_clause = f"""
            AND team_id IN (
                SELECT team_id
                FROM picks
                WHERE player IN ({placeholders})
                GROUP BY team_id
                HAVING COUNT(DISTINCT player) = ?
            )
            """  # nosec B608
            params = required_players + [len(required_players)]

        sql = f"""
        WITH position_counts AS (
            SELECT draft, team_id, Position, COUNT(*) as count
            FROM picks
            WHERE 1=1 {where_clause}
            GROUP BY draft, team_id, Position
        )
        SELECT
            QB, RB, WR, TE,
            COUNT(*) as count
        FROM (
            SELECT
                draft,
                team_id,
                SUM(CASE WHEN Position = 'QB' THEN count ELSE 0 END) as QB,
                SUM(CASE WHEN Position = 'RB' THEN count ELSE 0 END) as RB,
                SUM(CASE WHEN Position = 'WR' THEN count ELSE 0 END) as WR,
                SUM(CASE WHEN Position = 'TE' THEN count ELSE 0 END) as TE
            FROM position_counts
            GROUP BY draft, team_id
        )
        GROUP BY QB, RB, WR, TE
        ORDER BY count DESC
        """  # nosec B608

        result = self.query(sql, params)
        return result.to_dicts()

    def get_week17_opponent(self, team: str) -> Optional[str]:
        """Get the Week 17 opponent for a given team."""
        try:
            result = self.query(
                "SELECT opponent FROM week17_matchups WHERE team = ?", [team]
            )
            if len(result) > 0:
                return result["opponent"][0]
            return None
        except Exception as e:
            logger.error("Error getting Week 17 opponent for %s: %s", team, e)
            return None

    def get_week17_bringback_team_view(
        self, team: str, limit: int = 10
    ) -> List[Dict[str, Any]]:
        """Get Week 17 bring back data for team view (aggregate draft percentages)."""
        opponent = self.get_week17_opponent(team)
        if not opponent:
            logger.warning("No Week 17 opponent found for team: %s", team)
            return []

        sql = """
        SELECT
            p.player,
            p.Position as position,
            COUNT(*) as draft_count,
            CAST(COUNT(*) AS FLOAT) / ? * 100 as percentage
        FROM picks p
        WHERE p.Team = ?
        GROUP BY p.player, p.Position
        ORDER BY percentage DESC
        LIMIT ?
        """

        result = self.query(sql, [self.total_drafts, opponent, limit])
        return result.to_dicts()

    def get_week17_bringback_player_view(
        self, player: str, limit: int = 10
    ) -> List[Dict[str, Any]]:
        """Get Week 17 bring back data for player view (conditional co-draft percentages)."""
        # First, get the player's team
        player_team_result = self.query(
            "SELECT DISTINCT Team FROM picks WHERE player = ?", [player]
        )

        if len(player_team_result) == 0:
            logger.warning("Player not found: %s", player)
            return []

        # Handle case where player appears on multiple teams
        if len(player_team_result["Team"]) > 1:
            teams = list(player_team_result["Team"])
            logger.warning(
                "Player %s found on multiple teams: %s. Using first team: %s",
                player,
                teams,
                teams[0],
            )

        player_team = player_team_result["Team"][0]
        opponent = self.get_week17_opponent(player_team)

        if not opponent:
            logger.warning(
                "No Week 17 opponent found for player %s's team: %s",
                player,
                player_team,
            )
            return []

        # Get total rosters with the selected player
        player_roster_count_result = self.query(
            "SELECT COUNT(DISTINCT team_id || '-' || draft) as count FROM picks WHERE player = ?",
            [player],
        )
        player_roster_count = player_roster_count_result["count"][0]

        if player_roster_count == 0:
            return []

        sql = """
        WITH player_rosters AS (
            SELECT DISTINCT team_id, draft
            FROM picks
            WHERE player = ?
        ),
        opponent_players AS (
            SELECT p.player, p.Position as position, pr.team_id, pr.draft
            FROM picks p
            INNER JOIN player_rosters pr ON p.team_id = pr.team_id AND p.draft = pr.draft
            WHERE p.Team = ?
        )
        SELECT
            op.player,
            op.position,
            COUNT(DISTINCT op.team_id || '-' || op.draft) as co_occurrence_count,
            CAST(COUNT(DISTINCT op.team_id || '-' || op.draft) AS FLOAT) / ? * 100 as percentage
        FROM opponent_players op
        GROUP BY op.player, op.position
        ORDER BY percentage DESC
        LIMIT ?
        """

        result = self.query(sql, [player, opponent, player_roster_count, limit])
        return result.to_dicts()


# Global singleton instance
query_service = QueryService()
