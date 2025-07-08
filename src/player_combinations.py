from typing import Optional, List
import logging
from functools import lru_cache

import polars as pl

# Configure logging for performance monitoring
logger = logging.getLogger(__name__)


@lru_cache(maxsize=256)
def _create_player_combo_key(players_tuple: tuple) -> str:
    """Create a canonical key for player combinations.
    
    Args:
        players_tuple: Tuple of sorted player names
        
    Returns:
        str: Canonical string representation of the player combination
    """
    return "|".join(sorted(players_tuple))


@lru_cache(maxsize=128)
def _get_required_players_filter(required_players_tuple: tuple) -> bool:
    """Cache the result of required players filtering logic.
    
    Args:
        required_players_tuple: Tuple of required player names
        
    Returns:
        bool: Whether the filtering should be applied
    """
    return len(required_players_tuple) > 0 if required_players_tuple else False


# Note: Full DataFrame caching is removed to avoid memory issues
# Instead, we rely on the existing @lru_cache in data_manager.py
# and optimized operations within this function


def find_unique_player_combinations(
    df: pl.DataFrame,
    n_rounds: int = 20,
    required_players: Optional[List[str]] = None,
) -> pl.DataFrame:
    """
    Find teams with unique combinations of players in the first N rounds.
    
    Optimized version using lazy evaluation and efficient operations.

    Args:
        df: The draft DataFrame
        n_rounds: Number of rounds to consider (default: 20).
        required_players: Optional list of players that must all be on the team

    Returns:
        DataFrame with team_id and their unique player combinations
    """
    logger.info(f"Finding unique combinations for {n_rounds} rounds with {len(required_players) if required_players else 0} required players")
    
    # Create cache key from DataFrame and parameters
    required_players_tuple = tuple(sorted(required_players)) if required_players else ()
    
    # Log cache information for monitoring
    logger.debug(f"Cache key parameters: rounds={n_rounds}, required_players={len(required_players_tuple)}")
    
    # Convert required_players to set for O(1) lookup performance
    required_players_set = set(required_players) if required_players else None
    
    # Use lazy evaluation to chain operations efficiently
    lazy_query = (
        df.lazy()
        .filter(pl.col("round") <= n_rounds)
        .sort(["team_id", "round", "draft_position"])
        .group_by("team_id")
        .agg([
            pl.col("player").alias("players"),
            pl.col("player").sort().alias("players_sorted"),  # for order-insensitive comparison
            pl.col("draft").first(),
            pl.col("draft_position").first(),
        ])
    )
    
    # Add required players filter if specified
    if required_players_set:
        lazy_query = lazy_query.filter(
            pl.all_horizontal(
                pl.col("players").list.contains(p) for p in required_players_set
            )
        )
    
    # Complete the lazy evaluation with final operations
    result = (
        lazy_query
        .with_columns(
            pl.col("players_sorted").list.join("|").alias("player_combo")
        )
        .sort("draft", "draft_position")
        .unique(subset="player_combo", keep="last")
        .select(["team_id", "draft", "draft_position", "players"])
        .collect()  # Execute lazy query
    )

    # Efficient logging with minimal computation
    unique_team_count = result.height
    if unique_team_count > 0:
        logger.info(f"Found {unique_team_count:,} unique team combinations")
    else:
        logger.warning("No teams found matching the specified criteria")

    return result
