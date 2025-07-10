import os
import logging
from functools import lru_cache
from typing import List, Dict, Any, Optional, Tuple
import psutil

import polars as pl

from ..models.schemas import (
    Position,
    PositionRoundCount,
    Player, 
    PositionStats, 
    SortableColumn, 
    SortOrder,
    AggregationType,
    RosterConstruction
)
from ..core.config import settings

logger = logging.getLogger(__name__)


def log_memory_usage(func_name: str) -> None:
    """Log current memory usage for performance monitoring.
    
    Args:
        func_name: Name of the function being monitored
    """
    try:
        process = psutil.Process()
        memory_info = process.memory_info()
        memory_mb = memory_info.rss / 1024 / 1024
        logger.info(f"{func_name}: Memory usage: {memory_mb:.2f} MB")
    except Exception as e:
        logger.debug(f"Could not get memory usage for {func_name}: {e}")


with pl.StringCache():
    class DataService:
        """Service class for handling all data operations."""

        def __init__(self):
            self._df: pl.DataFrame
            self._metadata: Dict[str, Any]
            self._initialize_data()

        def _get_data_path(self) -> str:
            """Get the absolute path to the data file."""
            backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
            data_path = os.path.join(backend_dir, "..", "data", "updated_bestball_data.parquet")
            return os.path.abspath(data_path)

        def _initialize_data(self) -> None:
            """Load, pre-process, and cache the draft data on initialization."""
            logger.info("Initializing and loading draft data...")
            log_memory_usage("initialize_data_start")

            data_path = self._get_data_path()
            if not os.path.exists(data_path):
                raise FileNotFoundError(f"Data file not found at: {data_path}")

            df = (
                pl.scan_parquet(data_path)
                .with_columns([
                    pl.when(pl.col('pick') < 0)
                    .then(pl.col('pick') + 256)
                    .otherwise(pl.col('pick'))
                    .cast(pl.UInt8, strict=False)
                    .alias('pick'),
                    pl.col('player').cast(pl.String),
                    pl.col('Position').cast(pl.String),
                    pl.col('Team').cast(pl.String),
                ])
                .collect()
            )

            logger.info(f"Loaded DataFrame with shape: {df.shape}")
            self._df = df

            all_players = self._df["player"].unique().sort().to_list()
            total_drafts = self._df.select(pl.col("draft").n_unique()).item()
            total_teams = self._df.select(pl.col("team_id").n_unique()).item()

            self._metadata = {
                "all_players": all_players,
                "total_drafts": total_drafts,
                "total_teams": total_teams,
                "total_players": len(all_players)
            }

            log_memory_usage("initialize_data_end")
            logger.info(f"Data initialization complete: {len(all_players)} players, {total_drafts} drafts, {total_teams} teams")

        def get_dataframe(self) -> pl.DataFrame:
            """Get the main DataFrame."""
            return self._df

        def get_metadata(self) -> Dict[str, Any]:
            """Get metadata about the dataset."""
            return self._metadata

        def get_players(
            self, 
            positions: Optional[List[Position]] = None,
            search_term: Optional[str] = None,
            limit: int = 100,
            offset: int = 0,
            sort_by: SortableColumn = SortableColumn.AVG_PICK,
            sort_order: SortOrder = SortOrder.ASC
        ) -> Tuple[List[Player], int]:
            """Get players with optional filtering, sorting, and draft percentage."""
            df = self.get_dataframe()
            metadata = self.get_metadata()
            total_drafts = metadata.get("total_drafts", 1)

            # Base query for player stats
            player_stats_query = df.lazy().group_by(["player", "Position", "Team"]).agg([
                pl.mean("pick").alias("avg_pick"),
                pl.min("pick").alias("min_pick"),
                pl.max("pick").alias("max_pick"),
                (pl.count() / total_drafts * 100).alias("draft_percentage")
            ])

            # Apply filters
            if positions:
                position_values = [p.value for p in positions]
                player_stats_query = player_stats_query.filter(pl.col("Position").is_in(position_values))

            if search_term:
                normalized_search_term = search_term.lower().replace('.', '')
                player_stats_query = player_stats_query.filter(
                    pl.col("player").str.to_lowercase().str.replace_all(r"[\.\']", "").str.contains(normalized_search_term)
                )

            # Get total count after filtering, before pagination
            total_count = player_stats_query.collect().height

            # Apply sorting and pagination
            final_query = (
                player_stats_query
                .sort(sort_by.value, descending=(sort_order == SortOrder.DESC))
                .slice(offset, limit)
            )

            result_df = final_query.collect()

            # Rename columns to match the Player model
            paginated_df = result_df.rename({
                "player": "name",
                "Position": "position",
                "Team": "team"
            })

            players = [Player(**p) for p in paginated_df.to_dicts()]

            return players, total_count

        def get_player_details(self, player_name: str, position: str, team: str) -> Dict[str, Any]:
            """Get detailed draft data for a single player."""
            df = self.get_dataframe()
            player_df = df.filter(
                (pl.col("player") == player_name) & 
                (pl.col("Position") == position) & 
                (pl.col("Team") == team)
            )

            if player_df.is_empty():
                return {}

            stats = player_df.select([
                pl.col("pick").mean().alias("avg_pick"),
                pl.col("round").mean().alias("avg_round"),
                pl.col("pick").min().alias("min_pick"),
                pl.col("pick").max().alias("max_pick"),
                pl.col("pick").std().alias("std_dev_pick"),
                pl.col("team_id").n_unique().alias("total_drafts"),
            ]).to_dicts()[0]

            # Add player identifiers and raw data
            stats['player_name'] = player_name
            stats['position'] = position
            stats['team'] = team
            stats['picks'] = player_df.get_column('pick').to_list()
            stats['rounds'] = player_df.get_column('round').to_list()

            return stats

        def get_position_stats(self) -> List[Dict[str, Any]]:
            """Get statistics by position."""
            df = self.get_dataframe()

            # Calculate the number of players per position for each draft
            players_per_draft = df.group_by(["draft", "Position"]).agg(
                pl.len().alias("position_count")
            )

            # Calculate the median number of players drafted per position across all drafts
            median_stats = players_per_draft.group_by("Position").agg(
                pl.col("position_count").median().alias("median_draft_count")
            )

            # Calculate total drafted and unique players for each position
            other_stats = df.group_by("Position").agg([
                pl.count().alias("total_drafted"),
                pl.col("player").n_unique().alias("unique_players"),
            ])

            # Join the stats together
            stats_df = other_stats.join(median_stats, on="Position")

            # Convert to PositionStats objects before sorting by enum
            position_stats_list = [
                PositionStats(
                    position=row["Position"],
                    total_drafted=row["total_drafted"],
                    unique_players=row["unique_players"],
                    median_draft_count=row["median_draft_count"],
                )
                for row in stats_df.iter_rows(named=True)
            ]

            # Sort the list of objects
            position_order = ["QB", "RB", "WR", "TE"]
            position_stats_list.sort(key=lambda p: position_order.index(p.position))

            return position_stats_list

        def get_first_player_draft_stats(self) -> List[Dict[str, Any]]:
            """Get the avg, min, and max pick for the first player drafted at each position."""
            df = self.get_dataframe()

            first_picks = (
                df.sort(["draft", "Position", "pick"])
                .group_by(["draft", "Position"])
                .first()
            )

            stats = (
                first_picks.group_by("Position")
                .agg([
                    pl.col("pick").mean().alias("avg_first_pick"),
                    pl.col("pick").min().alias("min_first_pick"),
                    pl.col("pick").max().alias("max_first_pick"),
                ])
                .sort("Position")
            )

            return stats.to_dicts()

        def get_position_draft_counts_by_round(
            self, position: Position, aggregation: AggregationType = AggregationType.MEAN
        ) -> List[PositionRoundCount]:
            df = self.get_dataframe()

            total_drafts = df.select(pl.col("team_id").n_unique()).item()

            if total_drafts == 0:
                return []

            position_df = df.filter(pl.col("Position") == position.value)

            # This logic correctly calculates the average number of players of a given
            # position drafted in each round, across all drafts.

            # 1. Count players per position for each specific round within each specific draft.
            counts_per_draft = (
                position_df
                .group_by(["round", "draft"])
                .agg(pl.len().alias("count"))
            )

            # 2. Create a complete grid of all rounds and all drafts.
            #    This is crucial to account for drafts where zero players of a certain
            #    position were taken in a given round.
            all_rounds = df.select(pl.col("round").unique()).sort("round")
            all_drafts = df.select(pl.col("draft").unique())
            grid = all_rounds.join(all_drafts, how="cross")

            # 3. Join the actual counts onto the complete grid. For any round in a draft
            #    that had no players of the position, the count will be null.
            #    Fill these nulls with 0.
            # 4. Group by round and calculate the mean. This gives the average count
            #    for that round across all drafts.
            round_counts = (
                grid.join(counts_per_draft, on=["round", "draft"], how="left")
                .with_columns(pl.col("count").fill_null(0))
                .group_by("round")
                .agg(
                    pl.col("count").mean() if aggregation == AggregationType.MEAN 
                    else pl.col("count").median()
                )
                .sort("round")
            )

            return [
                PositionRoundCount(round=row['round'], count=row['count'])
                for row in round_counts.iter_rows(named=True)
            ]

        def get_player_combinations(
            self,
            required_players: Optional[List[str]] = None,
            n_rounds: int = 20,
            limit: int = 100
        ) -> List[Dict[str, Any]]:
            """Find teams with unique combinations of players in the first N rounds."""
            df = self.get_dataframe().rename({"draft": "draft_id"})
            if not required_players:
                return []

            logger.info(f"Finding unique combinations for {n_rounds} rounds with {len(required_players)} required players")
            required_players_set = set(required_players)

            # Filter for relevant drafts first
            relevant_teams_df = (
                df.lazy()
                .filter(pl.col('player').is_in(required_players))
                .group_by('team_id')
                .agg(pl.col('player').n_unique().alias('unique_players'))
                .filter(pl.col('unique_players') == len(required_players_set))
                .select('team_id')
                .collect()
            )
            relevant_team_ids = relevant_teams_df['team_id']

            if relevant_team_ids.is_empty():
                return []

            # Step 2: Filter the original dataframe to only include these teams and rounds
            result_df = (
                df.lazy()
                .filter(pl.col('team_id').is_in(relevant_team_ids) & (pl.col('round') <= n_rounds))
                .sort("team_id", "round")
                .group_by("team_id")
                .agg([
                    pl.col("player").alias("players"),
                    pl.col("Position").alias("positions"),
                    pl.col("draft_id").first(),
                    pl.col("draft_position").first(),
                ])
                .collect()
                .sort(["draft_id", "draft_position"])
                .head(limit)
            )

            if result_df.is_empty():
                return []

            # Step 3: Calculate position counts
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

            # Step 4: Format position counts into a string
            position_counts_collected_df = position_counts_df
            if not position_counts_collected_df.is_empty():
                pos_cols = sorted([col for col in position_counts_collected_df.columns if col != 'team_id'])
                format_exprs = [pl.format("{}: {}", pl.lit(col), pl.col(col)) for col in pos_cols]
            
                position_counts_str_df = (
                    position_counts_collected_df.lazy()
                    .with_columns(
                        pl.concat_str(format_exprs, separator=", ").alias("position_counts")
                    )
                    .select(["team_id", "position_counts"])
                    .collect()
                )

                # Step 5: Join back to get final result
                final_df = result_df.join(position_counts_str_df, on="team_id", how="left")
            else:
                final_df = result_df.with_columns(pl.lit(None, dtype=pl.String).alias("position_counts"))

            logger.info(f"Found {final_df.height} unique team combinations")
            return final_df.to_dicts()

        def get_roster_construction(self) -> List[RosterConstruction]:
            """Get roster construction for each team across all drafts."""
            df = self.get_dataframe()

            # Count players per position for each team
            position_counts = df.group_by(["draft", "team_id", "Position"]).agg(
                pl.len().alias("count")
            )

            # Pivot to get positions as columns
            roster_df = position_counts.pivot(
                index=["draft", "team_id"],
                columns="Position",
                values="count"
            ).fill_null(0).rename({"draft": "draft_id"})

            # Get all possible position names from the enum
            position_columns = [p.value for p in Position]

            # Ensure all position columns exist, filling missing with 0
            for col in position_columns:
                if col not in roster_df.columns:
                    roster_df = roster_df.with_columns(pl.lit(0).cast(pl.Int64).alias(col))

            # Add a column for total players drafted
            roster_df = roster_df.with_columns(
                pl.sum_horizontal(position_columns).alias('total_players')
            )

            # Group by position counts to find frequency
            roster_counts = (
                roster_df.group_by(position_columns)
                .agg([
                    pl.len().alias('count'),
                    (pl.len() / pl.count() * 100).alias('frequency')
                ])
                .sort('count', descending=True)
            )

            return [
                RosterConstruction(**row)
                for row in roster_counts.to_dicts()
            ]

        def get_roster_construction_counts(self) -> List[Dict[str, Any]]:
            """Get aggregated counts of unique roster constructions, focusing on QB, RB, WR, TE."""
            df = self.get_dataframe()

            # Pivot to get positions as columns for each team
            roster_df = (
                df.group_by(["draft", "team_id", "Position"])
                .len()
                .pivot(index=["draft", "team_id"], columns="Position", values="len")
                .fill_null(0)
            )

            # Define the core positions we care about
            core_positions = ["QB", "RB", "WR", "TE"]

            # Ensure all core position columns exist
            for pos in core_positions:
                if pos not in roster_df.columns:
                    roster_df = roster_df.with_columns(pl.lit(0).alias(pos))

            # Select only core positions, group by them, and count occurrences
            aggregated_df = (
                roster_df.select(core_positions)
                .group_by(core_positions)
                .agg(pl.len().alias("count"))
                .sort("count", descending=True)
            )

            return aggregated_df.to_dicts()


# Global instance
data_service = DataService()
