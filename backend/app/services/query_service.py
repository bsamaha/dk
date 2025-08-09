"""Unified query service for all data operations.

This service consolidates the functionality of DataService, AnalyticsService, and DuckDBService
into a single, coherent interface. It manages the DuckDB connection and provides all
data access methods through SQL queries.
"""

from __future__ import annotations

import json
import logging
from pathlib import Path
import threading
import time
from typing import Any, Dict, List, Optional, Sequence, Tuple

import duckdb  # type: ignore
import polars as pl

from ..core.config import settings
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
    # Singleton state and locks for thread safety
    _instance: Optional["QueryService"] = None
    _lock: threading.Lock = threading.Lock()
    _db_lock: threading.Lock = threading.Lock()
    _initialized: bool = False
    _initialization_started: bool = False
    _initialization_error: Optional[Exception] = None

    def __new__(cls) -> "QueryService":
        """Thread-safe singleton via double-checked locking."""
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
        return cls._instance  # type: ignore[return-value]

    def __init__(self) -> None:
        """Initialize basic state and attempt eager init with nuanced error handling.

        - ValueError from path validation is propagated (for tests expecting it)
        - FileNotFoundError is recorded but not raised to allow lazy recovery
        """
        # Validate/resolve data path on construction to surface ValueError immediately.
        # Do NOT poison an already-initialized singleton instance's state in later constructions.
        is_first_init = not hasattr(self, "_basic_init_done")
        self._precheck_data_path(is_first_init)
        self._init_basic_fields_if_needed()
        # Attempt eager initialization once
        if not self._initialized:
            with self._lock:
                if not self._initialized and not self._initialization_started:
                    self._initialization_started = True
                    try:
                        self._initialize_service_with_retry()
                        self._initialized = True
                    except ValueError as exc:
                        # Path validation errors should surface immediately
                        self._initialization_error = exc
                        raise
                    except FileNotFoundError as exc:
                        # Allow lazy recovery on first real use
                        self._initialization_error = exc
                        self._initialization_started = False
                    except Exception as exc:  # pragma: no cover
                        self._initialization_error = exc
                        self._initialization_started = False

    def _initialize_service(self) -> None:
        """Initialize DuckDB and load data. Not thread-safe; call under _lock."""
        logger.info("Starting QueryService initialization...")
        # Create connection
        self._con = duckdb.connect(database=":memory:", read_only=False)
        # Enable arrow/polars integration
        assert self._con is not None
        self._con.execute("PRAGMA enable_object_cache;")

        # Attach parquet file as a view
        data_path: str = QueryService._get_data_path()
        logger.info("Attaching parquet file to DuckDB: %s", data_path)
        sanitized_path: str = data_path.replace("'", "''")
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

        # Compute metadata without re-entering query() to avoid recursion during init
        td_tbl = self._con.execute(
            "SELECT COUNT(DISTINCT draft) AS count FROM picks"
        ).arrow()
        self.total_drafts = int(pl.from_arrow(td_tbl)["count"][0] or 0)

        tt_tbl = self._con.execute(
            "SELECT COUNT(DISTINCT team_id) AS count FROM picks"
        ).arrow()
        self.total_teams = int(pl.from_arrow(tt_tbl)["count"][0] or 0)

        tp_tbl = self._con.execute(
            "SELECT COUNT(DISTINCT player) AS count FROM picks"
        ).arrow()
        self.total_players = int(pl.from_arrow(tp_tbl)["count"][0] or 0)

        ap_tbl = self._con.execute(
            "SELECT DISTINCT player FROM picks ORDER BY player"
        ).arrow()
        self.all_players = pl.from_arrow(ap_tbl)["player"].to_list()

        logger.info("QueryService initialization completed successfully.")

    def _initialize_service_with_retry(
        self, max_retries: int = 3, max_backoff_seconds: float = 4.0
    ) -> None:
        """Initialize service with retries and capped exponential backoff."""
        start_time = time.time()
        for attempt in range(1, max_retries + 1):
            try:
                logger.info("Initialization attempt %d/%d", attempt, max_retries)
                self._initialize_service()
                elapsed = time.time() - start_time
                logger.info("QueryService initialized in %.2fs", elapsed)
                return
            except Exception as exc:  # pragma: no cover
                logger.exception("Initialization attempt %d failed", attempt)
                self._initialization_error = exc
                if attempt >= max_retries:
                    logger.error(
                        "All initialization attempts failed after %.2fs",
                        time.time() - start_time,
                    )
                    raise
                wait_s = min(2 ** attempt, max_backoff_seconds)
                time.sleep(wait_s)

    def _precheck_data_path(self, is_first_init: bool) -> None:
        """Validate/resolve data path early to surface config errors.

        Raises ValueError immediately. Records FileNotFoundError on first
        initialization but defers raising to lazy init.
        """
        try:
            _ = QueryService._get_data_path()
        except ValueError as exc:
            if is_first_init:
                self._initialization_error = exc
            raise
        except Exception as exc:  # includes FileNotFoundError
            if is_first_init:
                self._initialization_error = exc

    def _init_basic_fields_if_needed(self) -> None:
        """Initialize basic instance fields once, under lock."""
        with self._lock:
            if not getattr(self, "_basic_init_done", False):
                logger.info("QueryService basic initialization")
                self._con: Optional[duckdb.DuckDBPyConnection] = None
                self._closed: bool = False
                # Metadata placeholders until initialized
                self.total_drafts: int = 0
                self.total_teams: int = 0
                self.total_players: int = 0
                self.all_players: List[str] = []
                self._basic_init_done = True

    @staticmethod
    def _resolve_data_dir() -> Path:
        """Resolve the data directory path consistently for all lookups."""
        data_dir: Path = Path(settings.DATA_PATH).expanduser()
        container_data = Path("/app/data")
        if container_data.exists():
            data_dir = container_data
        if not data_dir.exists():
            project_root = Path(__file__).resolve().parents[3]
            candidate = project_root / "data"
            if candidate.exists():
                data_dir = candidate
        if str(data_dir) == "/app/data" and not data_dir.exists():
            project_root = Path(__file__).resolve().parents[3]
            data_dir = project_root / "data"
        return data_dir

    @staticmethod
    def _get_data_path() -> str:
        """Return absolute path to the parquet data file with validation."""
        data_dir: Path = QueryService._resolve_data_dir()
        data_path: Path = data_dir / "updated_bestball_data.parquet"
        validated_path = QueryService._validate_and_sanitize_path(data_path, data_dir)
        return str(validated_path)

    def _ensure_initialized(self) -> None:
        """Ensure the singleton is fully initialized before use."""
        if self._initialized and not self._closed and self._con is not None:
            return
        with self._lock:
            if not self._initialized or self._closed or self._con is None:
                if self._initialization_error:
                    # Reset flags to allow retry on next call
                    err = self._initialization_error
                    self._initialization_error = None
                    self._initialization_started = False
                    # Propagate as runtime error to callers
                    raise RuntimeError("Service initialization failed") from err
                if not self._initialization_started:
                    self._initialization_started = True
                    try:
                        self._initialize_service_with_retry()
                        self._initialized = True
                        self._closed = False
                    except Exception as exc:
                        self._initialization_error = exc
                        raise RuntimeError("Service initialization failed") from exc

    def close(self) -> None:
        """Close DuckDB connection and mark service closed.

        This method is idempotent and safe to call multiple times.
        """
        if self._closed:
            return
        with self._db_lock:
            try:
                if self._con is not None:
                    self._con.close()
            except Exception:  # pragma: no cover - defensive
                logger.exception("Error while closing DuckDB connection")
            finally:
                self._closed = True
                self._con = None
                # Allow future re-initialization on next use
                self._initialized = False
                self._initialization_started = False

    @staticmethod
    def _validate_and_sanitize_path(file_path: Path, allowed_dir: Path) -> Path:
        """Validate and sanitize file path to prevent path traversal attacks.

        Args:
            file_path: The file path to validate
            allowed_dir: The allowed directory that the file must be within

        Returns:
            Resolved and validated Path object

        Raises:
            ValueError: If path is invalid, unsafe, or outside allowed directory
        """
        try:
            # Check for suspicious path components BEFORE resolving
            path_str = str(file_path)
            suspicious_patterns = [
                "..",  # Directory traversal
                "~",  # Home directory expansion
                "//",  # Multiple slashes
                "\\",  # Windows path separators (potential injection)
            ]

            for pattern in suspicious_patterns:
                if pattern in path_str:
                    raise ValueError(
                        f"Path contains suspicious pattern '{pattern}': {file_path}"
                    )

            # Resolve the path to handle any symlinks or relative components
            resolved_path = file_path.resolve()
            allowed_dir_resolved = allowed_dir.resolve()

            # Check if the resolved path is within the allowed directory
            try:
                resolved_path.relative_to(allowed_dir_resolved)
            except ValueError:
                raise ValueError(
                    f"Path {resolved_path} is outside allowed directory {allowed_dir_resolved}"
                )

            # Additional security checks
            if not resolved_path.exists():
                raise ValueError(f"Path does not exist: {resolved_path}")

            if not resolved_path.is_file():
                raise ValueError(f"Path is not a file: {resolved_path}")

            return resolved_path

        except (OSError, FileNotFoundError) as e:
            raise ValueError(f"Invalid path: {file_path}") from e
        except Exception:
            # Log unexpected exceptions to aid debugging
            logger.exception(f"Unexpected error while validating path: {file_path}")
            raise

    @staticmethod
    def _get_data_path() -> str:
        """Return absolute path to the parquet data file defined by settings.DATA_PATH.

        Falls back to the repository root `data/` directory when running tests locally.
        """
        data_dir: Path = Path(settings.DATA_PATH).expanduser()

        # If container mount exists, prefer it
        container_data = Path("/app/data")
        if container_data.exists():
            data_dir = container_data

        # Common local/dev fallbacks
        if not data_dir.exists():
            # If running under backend/ working directory, jump to repo root
            project_root = Path(__file__).resolve().parents[3]
            candidate = project_root / "data"
            if candidate.exists():
                data_dir = candidate

        # Container path fallback
        if str(data_dir) == "/app/data" and not data_dir.exists():
            project_root = Path(__file__).resolve().parents[3]
            data_dir = project_root / "data"

        data_path: Path = data_dir / "updated_bestball_data.parquet"
        validated_path = QueryService._validate_and_sanitize_path(data_path, data_dir)
        return str(validated_path)

    def _load_week17_matchups(self) -> None:
        """Load Week 17 matchups data into DuckDB."""
        # Get path to Week 17 matchups file
        data_dir: Path = QueryService._resolve_data_dir()

        matchups_path: Path = data_dir / "week17_matchups.json"

        try:
            # Validate the path is safe
            validated_path = self._validate_and_sanitize_path(matchups_path, data_dir)
        except ValueError as e:
            logger.warning("Week 17 matchups file validation failed: %s", e)
            return

        # Load JSON data
        with open(validated_path, "r") as f:
            matchups_data: Dict[str, str] = json.load(f)

        # Validate structure of matchups_data
        if not isinstance(matchups_data, dict):
            logger.error(
                "Week 17 matchups JSON is not a dictionary: %s", validated_path
            )
            return

        for team, opponent in matchups_data.items():
            if not isinstance(team, str) or not isinstance(opponent, str):
                logger.error(
                    "Invalid matchup entry in %s: team=%r, opponent=%r (both must be strings)",
                    validated_path,
                    team,
                    opponent,
                )
                return

        # Create list of tuples for DuckDB
        matchups_rows: List[Tuple[str, str]] = [
            (team, opponent) for team, opponent in matchups_data.items()
        ]

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

    def query(self, sql: str, params: Optional[Sequence[Any]] = None) -> pl.DataFrame:
        """Execute SQL query and return Polars DataFrame.

        Parameters
        ----------
        sql
            SQL statement. Should be read-only. Placeholders `?` can be
            used for params.
        params
            Optional sequence of binding parameters.
        """
        self._ensure_initialized()
        logger.debug("DuckDB query: %s — params=%s", sql, params)
        with self._db_lock:
            assert self._con is not None
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
        self._ensure_initialized()
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
        """Get players with their average draft position and other stats."""
        # Validate inputs
        if not isinstance(limit, int) or limit < 1 or limit > 1000:
            raise ValueError("limit must be between 1 and 1000")
        if not isinstance(offset, int) or offset < 0:
            raise ValueError("offset must be non-negative")
        if not isinstance(sort_by, SortableColumn):
            raise ValueError("sort_by must be a valid SortableColumn")
        if not isinstance(sort_order, SortOrder):
            raise ValueError("sort_order must be a valid SortOrder")

        # Get total drafts for percentage calculation
        total_drafts_df: pl.DataFrame = self.query(
            "SELECT COUNT(DISTINCT draft) AS cnt FROM picks"
        )
        total_drafts: int = (
            int(total_drafts_df["cnt"][0]) if not total_drafts_df.is_empty() else 1
        )

        # Build WHERE clause with parameterized queries
        where_clauses: List[str] = []
        params: List[Any] = []

        if positions:
            # Use parameterized query for positions
            placeholders: str = ", ".join(["?" for _ in positions])
            where_clauses.append(f"Position IN ({placeholders})")
            params.extend([p.value for p in positions])

        if search_term:
            # Use parameterized query for search term
            where_clauses.append("lower(player) LIKE ?")
            params.append(f"%{search_term.lower()}%")

        where_sql: str = f"WHERE {' AND '.join(where_clauses)}" if where_clauses else ""

        # Base aggregation SQL - safe as it uses parameterized queries
        # nosec B608
        base_sql: str = f"""
        SELECT
            player,
            Position,
            Team,
            AVG(pick)      AS avg_pick,
            MIN(pick)      AS min_pick,
            MAX(pick)      AS max_pick,
            COUNT(*) * 100.0 / ? AS draft_percentage
        FROM picks
        {where_sql}
        GROUP BY player, Position, Team
        """

        # Add total_drafts to params for the base query
        base_params: List[Any] = [total_drafts] + params

        # Total count BEFORE pagination
        # nosec B608
        total_count_df: pl.DataFrame = self.query(
            "SELECT COUNT(*) AS cnt FROM (" + base_sql + ")",
            base_params,
        )
        total_count: int = (
            int(total_count_df["cnt"][0]) if not total_count_df.is_empty() else 0
        )

        # Validate sort_by against allowed columns
        allowed_columns: Dict[SortableColumn, str] = {
            SortableColumn.AVG_PICK: "avg_pick",
            SortableColumn.NAME: "player",
            SortableColumn.POSITION: "position",
            SortableColumn.TEAM: "team",
            SortableColumn.DRAFT_PERCENTAGE: "draft_percentage",
        }

        if sort_by not in allowed_columns:
            raise ValueError(f"Invalid sort_by: {sort_by}")

        order_column: str = allowed_columns[sort_by]
        order_dir: str = "DESC" if sort_order == SortOrder.DESC else "ASC"

        # Final query with safe ORDER BY, LIMIT, and OFFSET using parameters
        # nosec B608
        final_sql: str = f"""
        SELECT *
        FROM (
            SELECT
                player,
                Position,
                Team,
                AVG(pick)      AS avg_pick,
                MIN(pick)      AS min_pick,
                MAX(pick)      AS max_pick,
                COUNT(*) * 100.0 / ? AS draft_percentage
            FROM picks
            {where_sql}
            GROUP BY player, Position, Team
        ) subquery
        ORDER BY {order_column} {order_dir}
        LIMIT ? OFFSET ?
        """

        # Build final params: [total_drafts, *where_params, limit, offset]
        final_params: List[Any] = [total_drafts] + params + [limit, offset]

        logger.info("Running players query: limit=%d offset=%d", limit, offset)
        df: pl.DataFrame = self.query(final_sql, final_params)

        if df.is_empty():
            return [], total_count

        # Convert to Player models
        df = df.rename({"player": "name", "Position": "position", "Team": "team"})
        players: List[Player] = [Player(**row) for row in df.to_dicts()]
        return players, total_count

    def get_player_details(
        self, player_name: str, position: str, team: str
    ) -> Dict[str, Any]:
        """Get detailed draft data for a single player."""
        sql: str = """
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

        df: pl.DataFrame = self.query(sql, [player_name, position, team])

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

        result: Dict[str, Any] = df.to_dicts()[0]
        result["player_name"] = player_name
        result["position"] = position
        result["team"] = team
        return result

    def get_position_stats(self) -> List[PositionStats]:
        """Get statistics by position."""
        # Calculate median players per position per draft
        median_sql: str = """
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
        stats_sql: str = """
        SELECT
            Position,
            COUNT(*) as total_drafted,
            COUNT(DISTINCT player) as unique_players
        FROM picks
        GROUP BY Position
        """

        median_df: pl.DataFrame = self.query(median_sql)
        stats_df: pl.DataFrame = self.query(stats_sql)

        # Join the results
        combined_df: pl.DataFrame = stats_df.join(median_df, on="Position", how="left")

        # Convert to PositionStats objects and sort
        position_stats_list: List[PositionStats] = [
            PositionStats(
                position=row["Position"],
                total_drafted=row["total_drafted"],
                unique_players=row["unique_players"],
                median_draft_count=row["median_draft_count"],
            )
            for row in combined_df.iter_rows(named=True)
        ]

        # Sort by position order
        position_order: List[str] = ["QB", "RB", "WR", "TE"]
        position_stats_list.sort(key=lambda p: position_order.index(p.position))

        return position_stats_list

    def get_first_player_draft_stats(self) -> List[Dict[str, Any]]:
        """Get the avg, min, and max pick for the first player drafted at each position."""
        sql: str = """
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
        agg_func: str = "AVG" if aggregation == AggregationType.MEAN else "MEDIAN"

        sql: str = f"""
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

        df: pl.DataFrame = self.query(sql, [position.value])

        return [
            PositionRoundCount(round=row["round"], count=row["count"])
            for row in df.iter_rows(named=True)
        ]

    def _validate_required_players(self, required_players: List[str]) -> List[str]:
        """Validate and clean required_players list.

        Enforces a maximum of 50 players.

        Args:
            required_players: List of player names to validate

        Returns:
            Cleaned list of non-empty player names

        Raises:
            ValueError: If validation fails or if more than 50 players are provided
        """
        if not isinstance(required_players, list):
            raise ValueError("required_players must be a list")

        if len(required_players) > 50:
            raise ValueError("A maximum of 50 required players can be specified.")

        # Allow empty lists (handled by calling methods)
        if not required_players:
            return []

        # Clean and validate each player name
        cleaned_players = []
        for i, player in enumerate(required_players):
            if not isinstance(player, str):
                raise ValueError(
                    f"Player at index {i} must be a string, got {type(player)}"
                )

            cleaned_player = player.strip()
            if not cleaned_player:
                raise ValueError(
                    f"Player at index {i} cannot be empty or whitespace-only"
                )

            cleaned_players.append(cleaned_player)

        return cleaned_players

    def get_player_combinations(
        self,
        required_players: List[str],
        n_rounds: int = 20,
        limit: int = 100,
    ) -> List[Dict[str, Any]]:
        """Return teams that drafted all required players within first n_rounds."""
        # Validate inputs
        if not isinstance(n_rounds, int) or n_rounds < 1 or n_rounds > 50:
            raise ValueError("n_rounds must be between 1 and 50")
        if not isinstance(limit, int) or limit < 1 or limit > 1000:
            raise ValueError("limit must be between 1 and 1000")

        # Validate and clean required_players
        required_players = self._validate_required_players(required_players)

        # Return empty list if no players provided
        if not required_players:
            return []

        # Use parameterized query for player names
        placeholders: str = ", ".join(["?" for _ in required_players])
        num_required: int = len(required_players)

        # nosec B608
        sql: str = f"""
        WITH filtered AS (
            SELECT draft,
                   draft_position,
                   player,
                   Position,
                   round
            FROM picks
            WHERE round <= ?
        ), target_teams AS (
            SELECT draft, draft_position
            FROM filtered
            WHERE player IN ({placeholders})
            GROUP BY draft, draft_position
            HAVING COUNT(DISTINCT player) = ?
        )
        SELECT f.*
        FROM filtered f
        INNER JOIN target_teams tt ON f.draft = tt.draft AND f.draft_position = tt.draft_position
        ORDER BY f.draft, f.draft_position, f.round;
        """

        # Build parameters list: [n_rounds, *required_players, num_required]
        params: List[Any] = [n_rounds] + required_players + [num_required]

        logger.info(
            "Running combination query for %d required players (<= round %d)",
            num_required,
            n_rounds,
        )
        df: pl.DataFrame = self.query(sql, params)

        if df.is_empty():
            return []

        # Aggregate per team using Polars
        result_df: pl.DataFrame = (
            df.lazy()
            .group_by(["draft", "draft_position"])
            .agg(
                pl.col("player").alias("players"),
                pl.col("Position").alias("positions"),
                pl.col("draft").first().alias("draft_id"),
            )
            .collect()
            .sort(["draft_id", "draft_position"])
            .head(limit)
        )

        if result_df.is_empty():
            return []

        # Calculate position counts
        position_counts_df: pl.DataFrame = (
            result_df.lazy()
            .select(["draft", "draft_position", "positions"])
            .explode("positions")
            .group_by(["draft", "draft_position", "positions"])
            .agg(pl.len().alias("count"))
            .collect()
            .pivot(index=["draft", "draft_position"], on="positions", values="count")
            .fill_null(0)
        )

        # Add position counts to result
        final_result_df: pl.DataFrame
        if not position_counts_df.is_empty():
            pos_cols: List[str] = [
                c
                for c in position_counts_df.columns
                if c not in ["draft", "draft_position"]
            ]
            position_counts_str_df: pl.DataFrame = (
                position_counts_df.lazy()
                .with_columns(
                    pl.concat_str(
                        [pl.format("{}: {}", pl.lit(c), pl.col(c)) for c in pos_cols],
                        separator=", ",
                    ).alias("position_counts")
                )
                .select(["draft", "draft_position", "position_counts"])
                .collect()
            )
            final_result_df = result_df.join(
                position_counts_str_df, on=["draft", "draft_position"], how="left"
            )
        else:
            final_result_df = result_df.with_columns(
                pl.lit(None, dtype=pl.String).alias("position_counts")
            )

        logger.info("Combination query returned %d teams", final_result_df.height)
        return final_result_df.to_dicts()

    def get_stacks(self, n_rounds: int = 10, limit: int = 100) -> List[Dict[str, Any]]:
        """Find QB/receiver stacks drafted within first n_rounds."""
        # Validate inputs
        if not isinstance(n_rounds, int) or n_rounds < 1 or n_rounds > 50:
            raise ValueError("n_rounds must be between 1 and 50")
        if not isinstance(limit, int) or limit < 1 or limit > 1000:
            raise ValueError("limit must be between 1 and 1000")

        sql: str = """
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
        return self.query(sql, params=[n_rounds, limit]).to_dicts()

    def get_heat_map(self) -> List[Dict[str, Any]]:
        """Return pick counts grouped by round & position for heat-map visual."""
        sql: str = """
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
        # Validate inputs
        if not isinstance(slot, int) or slot < 1 or slot > 20:
            raise ValueError("slot must be between 1 and 20")
        if metric not in {"count", "percent", "ratio"}:
            raise ValueError("metric must be 'count', 'percent', or 'ratio'")
        if not isinstance(top_n, int) or top_n < 1 or top_n > 100:
            raise ValueError("top_n must be between 1 and 100")
        if not isinstance(min_teams, int) or min_teams < 1 or min_teams > 1000:
            raise ValueError("min_teams must be between 1 and 1000")

        # Pre-compute totals
        totals_sql: str = """
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
        total_overall: int = int(totals_df["total_overall"][0])
        total_slot: int = int(totals_df["total_slot"][0]) or 1

        # Compute counts per player
        query_sql: str = """
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
        params: List[Any] = [
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
        midpoint_df: pl.DataFrame = self.query("SELECT median(draft) AS mid FROM picks")
        mid: int = int(midpoint_df["mid"][0])

        early_sql: str = """
        SELECT player, Position, AVG(pick) AS avg_pick_early
        FROM picks
        WHERE draft <= ?
        GROUP BY player, Position
        """

        late_sql: str = """
        SELECT player, Position, AVG(pick) AS avg_pick_late
        FROM picks
        WHERE draft > ?
        GROUP BY player, Position
        """

        early_df: pl.DataFrame = self.query(early_sql, [mid])
        late_df: pl.DataFrame = self.query(late_sql, [mid])

        # Join and calculate drift
        merged: pl.DataFrame = (
            early_df.join(other=late_df, on=["player", "Position"], how="inner")
            .with_columns(
                (pl.col(name="avg_pick_late") - pl.col(name="avg_pick_early")).alias(
                    name="drift"
                )
            )
            .sort("drift", descending=True)
        )
        return merged.to_dicts()

    def get_roster_construction(self) -> List[RosterConstruction]:
        """Get roster construction for each team across all drafts."""
        sql: str = """
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

        df: pl.DataFrame = self.query(sql)

        if df.is_empty():
            return []

        # Pivot to get positions as columns
        roster_df: pl.DataFrame = (
            df.pivot(index=["draft", "team_id"], on="Position", values="count")
            .fill_null(0)
            .rename({"draft": "draft_id"})
        )

        # Get all possible position names from the enum
        position_columns: List[str] = [p.value for p in Position]

        # Ensure all position columns exist, filling missing with 0
        for col in position_columns:
            if col not in roster_df.columns:
                roster_df = roster_df.with_columns(
                    pl.lit(value=0).cast(dtype=pl.Int64).alias(name=col)
                )

        # Group by position counts to find frequency
        roster_counts: pl.DataFrame = (
            roster_df.group_by(position_columns)
            .agg(pl.len().alias(name="count"))
            .sort(by="count", descending=True)
        )

        return [
            RosterConstruction(
                draft_id=0,  # Dummy as it's aggregated
                draft_position=0,  # Dummy
                position_counts={pos: row.get(pos, 0) for pos in position_columns},
            )
            for row in roster_counts.to_dicts()
        ]

    def get_roster_construction_counts(
        self, required_players: Optional[List[str]] = None
    ) -> List[Dict[str, Any]]:
        """Get aggregated counts of unique roster constructions, focusing on QB, RB, WR, TE."""
        where_clause: str = ""
        params: List[Any] = []

        if required_players:
            # Validate and clean required_players
            required_players = self._validate_required_players(required_players)

            logger.info(
                "Filtering roster constructions for teams with required players: %s",
                required_players,
            )
            # Get teams that have all required players
            placeholders: str = ", ".join(["?" for _ in required_players])
            # nosec B608
            where_clause = f"""
            AND team_id IN (
                SELECT team_id
                FROM picks
                WHERE player IN ({placeholders})
                GROUP BY team_id
                HAVING COUNT(DISTINCT player) = ?
            )
            """
            params = required_players + [len(required_players)]

        # nosec B608
        sql: str = f"""
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
        """

        result: pl.DataFrame = self.query(sql, params)
        return result.to_dicts()

    def get_week17_opponent(self, team: str) -> Optional[str]:
        """Get the Week 17 opponent for a given team."""
        try:
            result: pl.DataFrame = self.query(
                sql="SELECT opponent FROM week17_matchups WHERE team = ?", params=[team]
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
        opponent: Optional[str] = self.get_week17_opponent(team)
        if not opponent:
            logger.warning("No Week 17 opponent found for team: %s", team)
            return []

        sql: str = """
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

        result: pl.DataFrame = self.query(
            sql, params=[self.total_drafts, opponent, limit]
        )
        return result.to_dicts()

    def get_week17_bringback_player_view(
        self, player: str, limit: int = 10
    ) -> List[Dict[str, Any]]:
        """Get Week 17 bring back data for player view (conditional co-draft percentages)."""
        # First, get the player's team
        player_team_result: pl.DataFrame = self.query(
            sql="SELECT DISTINCT Team FROM picks WHERE player = ?", params=[player]
        )

        if len(player_team_result) == 0:
            logger.warning("Player not found: %s", player)
            return []

        # Handle case where player appears on multiple teams
        if len(player_team_result["Team"]) > 1:
            teams: List[str] = list(player_team_result["Team"])
            logger.warning(
                "Player %s found on multiple teams: %s. Using first team: %s",
                player,
                teams,
                teams[0],
            )

        player_team: str = player_team_result["Team"][0]
        opponent: Optional[str] = self.get_week17_opponent(player_team)

        if not opponent:
            logger.warning(
                "No Week 17 opponent found for player %s's team: %s",
                player,
                player_team,
            )
            return []

        # Get total rosters with the selected player
        player_roster_count_result: pl.DataFrame = self.query(
            sql="SELECT COUNT(DISTINCT team_id || '-' || draft) as count FROM picks WHERE player = ?",
            params=[player],
        )
        player_roster_count: int = player_roster_count_result["count"][0]

        if player_roster_count == 0:
            return []

        sql: str = """
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

        result: pl.DataFrame = self.query(
            sql, params=[player, opponent, player_roster_count, limit]
        )
        return result.to_dicts()

    # Export a simple, thread-safe singleton for non-FastAPI contexts (e.g., tests)
    # This preserves compatibility with tests that import `query_service`.


def _create_singleton() -> QueryService:
    """Create a single QueryService instance for module-level reuse.

    Using a factory avoids initialization at import-time in case settings/env
    are not ready. Tests import this symbol to exercise concurrency behavior.
    """
    # Lazily create and cache on the function object to avoid globals.
    if not hasattr(_create_singleton, "_instance"):
        setattr(_create_singleton, "_instance", QueryService())
    return getattr(_create_singleton, "_instance")


# Backwards-compatible singleton symbol used by tests
query_service: QueryService = _create_singleton()
