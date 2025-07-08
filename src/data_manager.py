import os
import logging
import psutil
from functools import lru_cache

import polars as pl

# Configure logging for performance monitoring
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

# --- Path and Configuration ---
# Construct an absolute path to the project root
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_PATH = os.path.join(PROJECT_ROOT, "data", "updated_bestball_data.parquet")


@lru_cache(maxsize=1)
def load_data():
    """Load, pre-process, and cache the draft data.

    Returns:
        tuple: A tuple containing the main DataFrame, a list of all players,
               and the total number of drafts.
    """
    logger.info("Loading draft data from parquet file")
    log_memory_usage("load_data_start")
    
    df = pl.read_parquet(DATA_PATH)
    logger.info(f"Loaded DataFrame with shape: {df.shape}")
    
    all_players = df["player"].unique().sort().to_list()
    total_drafts = df["draft"].max()
    
    log_memory_usage("load_data_end")
    logger.info(f"Data loading complete: {len(all_players)} players, {total_drafts} drafts")
    
    return df, all_players, total_drafts


@lru_cache(maxsize=1)
def get_dataframe():
    """Get only the main DataFrame from cached data.
    
    Returns:
        pl.DataFrame: The main draft DataFrame.
    """
    logger.debug("Retrieving cached DataFrame")
    df, _, _ = load_data()
    return df


@lru_cache(maxsize=1) 
def get_metadata():
    """Get metadata about the dataset.
    
    Returns:
        dict: Dictionary containing dataset metadata.
    """
    logger.debug("Retrieving cached metadata")
    df, all_players, total_drafts = load_data()
    total_teams = df["team_id"].n_unique()
    
    metadata = {
        "all_players": all_players,
        "total_drafts": total_drafts,
        "total_teams": total_teams,
        "total_players": len(all_players)
    }
    
    logger.debug(f"Metadata: {metadata['total_players']} players, {metadata['total_drafts']} drafts, {metadata['total_teams']} teams")
    return metadata
