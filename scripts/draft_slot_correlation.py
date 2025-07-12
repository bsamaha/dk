import argparse
import sys
from pathlib import Path
from typing import Optional, Sequence

import polars as pl

try:
    import matplotlib.pyplot as plt  # type: ignore
except ModuleNotFoundError:  # pragma: no cover
    plt = None  # type: ignore


DEFAULT_TOP_N = 25


def parse_args(argv: Optional[Sequence[str]] = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Find players most associated with a particular draft slot (position).",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    parser.add_argument("filepath", type=Path, help="Path to CSV or Parquet data file")
    parser.add_argument("draft_slot", type=int, help="Draft position (1-12)")
    parser.add_argument("--top-n", type=int, default=DEFAULT_TOP_N, help="Number of players to show")
    parser.add_argument(
        "--metric",
        choices=["count", "percent", "ratio"],
        default="percent",
        help="Metric to display: count (#teams with slot drafting player), percent (share of slot teams), ratio (percent / overall percent)",
    )
    parser.add_argument(
        "--min-teams",
        type=int,
        default=10,
        help="Minimum number of teams in slot that drafted the player to be considered (avoid small-sample noise).",
    )
    parser.add_argument("--save-png", type=Path, default=None, help="Save bar plot to PNG instead of showing")
    return parser.parse_args(argv)


def load_df(path: Path) -> pl.DataFrame:
    if path.suffix.lower() == ".csv":
        return pl.read_csv(path)
    if path.suffix.lower() == ".parquet":
        return pl.read_parquet(path)
    raise ValueError("Unsupported extension. Use .csv or .parquet")


def compute_correlation(df: pl.DataFrame, slot: int, metric: str, min_teams: int, top_n: int) -> pl.DataFrame:
    # Unique teams with slot and player
    unique_df = df.select(["draft", "team_id", "draft_position", "player"]).unique()

    # total teams overall per player
    overall = (
        unique_df.group_by("player").agg(pl.len().alias("team_cnt_overall")).rename({"team_cnt_overall": "overall"})
    )

    # teams in slot per player
    slot_df = (
        unique_df.filter(pl.col("draft_position") == slot)
        .group_by("player")
        .agg(pl.len().alias("team_cnt_slot"))
        .rename({"team_cnt_slot": "slot"})
    )

    # total number of teams overall and in slot
    total_overall = unique_df.select(pl.len()).item()
    total_slot = unique_df.filter(pl.col("draft_position") == slot).select(pl.len()).item()

    # merge
    merged = overall.join(slot_df, on="player", how="inner")
    # filter by min_teams
    merged = merged.filter(pl.col("slot") >= min_teams)

    merged = merged.with_columns(
        (
            pl.col("slot") / total_slot
        ).alias("p_slot"),
        (
            pl.col("overall") / total_overall
        ).alias("p_overall"),
    )

    if metric == "count":
        merged = merged.with_columns(pl.col("slot").alias("score")).sort("score", descending=True)
    elif metric == "percent":
        merged = merged.with_columns(pl.col("p_slot").alias("score")).sort("score", descending=True)
    else:  # ratio
        merged = merged.with_columns((pl.col("p_slot") / pl.col("p_overall")).alias("score")).sort("score", descending=True)

    return merged.select(["player", "slot", "overall", "p_slot", "p_overall", "score"]).head(top_n)


def plot_bar(df: pl.DataFrame, metric: str, slot: int, save_png: Optional[Path]):
    if plt is None:
        raise ImportError("matplotlib required for plotting. Install via `pip install matplotlib`. ")

    pdf = df.to_pandas()
    n = len(pdf)
    height = max(4, 0.45 * n)  # ~0.45 inch per bar

    fig, ax = plt.subplots(figsize=(10, height))
    ax.barh(pdf["player"], pdf["score"], color="#5DA5DA")
    ax.invert_yaxis()  # highest score on top

    if metric == "count":
        xlabel = "Teams with slot"
    elif metric == "percent":
        xlabel = "% of slot teams"
    else:
        xlabel = "Slot % / Overall %"
    ax.set_xlabel(xlabel)
    ax.set_ylabel("Player")
    ax.set_title(f"Top {n} players correlated with draft slot {slot}")

    # Annotate values at end of bars
    for idx, value in enumerate(pdf["score" ]):
        ax.text(value, idx, f" {value:.2f}", va="center", fontsize=8)

    fig.tight_layout()

    if save_png:
        fig.savefig(save_png, dpi=150)
        print(f"[INFO] Plot saved to {save_png}")
    else:
        plt.show()


def main(argv: Optional[Sequence[str]] = None):
    args = parse_args(argv)
    df = load_df(args.filepath)
    if df.is_empty():
        print("[ERROR] Empty dataframe", file=sys.stderr)
        sys.exit(1)

    result = compute_correlation(df, args.draft_slot, args.metric, args.min_teams, args.top_n)

    if result.is_empty():
        print("No players meet criteria.")
        sys.exit(0)

    try:
        plot_bar(result, args.metric, args.draft_slot, args.save_png)
    except ImportError as exc:
        print(exc, file=sys.stderr)
        print(result)


if __name__ == "__main__":
    main()
