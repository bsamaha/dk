from typing import Optional, List

import polars as pl


def find_unique_player_combinations(
    df: pl.DataFrame,
    n_rounds: int | None = None,
    required_players: Optional[List[str]] = None,
) -> pl.DataFrame:
    """
    Find teams with unique combinations of players in the first N rounds.

    Args:
        df: The draft DataFrame
        n_rounds: Number of rounds to consider (default: 3)
        required_players: Optional list of players that must all base on the team

    Returns:
        DataFrame with team_id and their unique player combinations
    """
    # Determine the slice of the DataFrame that will be analysed.
    # If ``n_rounds`` is ``None`` (the new default), analyse the **entire** draft.
    # Otherwise, limit the data to the first *n_rounds* rounds.
    if n_rounds is None:
        rounds_subset = df.sort(["team_id", "round", "draft_position"])
    else:
        rounds_subset = (
            df.filter(pl.col("round") <= n_rounds)
            .sort(["team_id", "round", "draft_position"])
        )

    # Group by team and collect **all** player names in the selected rounds.
    # ``players`` keeps the original draft order for downstream display
    # while ``players_sorted`` will be used solely for combination de-duplication
    team_combinations = rounds_subset.group_by("team_id").agg(
        [
            pl.col("player").alias("players"),
            pl.col("player").sort().alias("players_sorted"),  # for order-insensitive comparison
            pl.col("draft").first(),
            pl.col("draft_position").first(),
        ]
    )

    # Filter for teams that have all required players if specified
    if required_players:
        for player in required_players:
            team_combinations = team_combinations.filter(
                pl.col("players").list.contains(player)
            )

    # Create a canonical (order-insensitive) string representation that will be
    # used to identify duplicate rosters across different teams.
    team_combinations = team_combinations.with_columns(
        pl.col("players_sorted")
        .map_elements(lambda x: "|".join(x), return_dtype=pl.Utf8)
        .alias("player_combo")
    )

    # Deduplicate to one row per unique roster (order-insensitive).
    # Keep the earliest draft/draft_position instance for display purposes.
    result = (
        team_combinations
        .sort("draft", "draft_position")
        .unique(subset="player_combo", keep="last")
        .select(["team_id", "players", "draft", "draft_position"])
    )

    # Add some debug info
    teams_meeting_criteria = team_combinations.height
    unique_team_count = result.height
    total_teams_in_dataset = df['team_id'].n_unique()
    percentage_of_total = (unique_team_count / total_teams_in_dataset * 100) if total_teams_in_dataset > 0 else 0

    print(f"Teams meeting player list criteria: {teams_meeting_criteria}")
    print(f"Teams with unique combinations: {unique_team_count} of {total_teams_in_dataset} ({percentage_of_total:.2f}%)")

    return result
