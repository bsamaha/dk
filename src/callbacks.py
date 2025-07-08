from datetime import datetime
import polars as pl
from dash import Input, Output, State

from .data_manager import get_dataframe, get_metadata
from .player_combinations import find_unique_player_combinations


DATA_LAST_DOWNLOAD_DATE = 'June 27, 2025'
def register_callbacks(app):
    """Register all callbacks for the Dash app.

    Args:
        app (dash.Dash): The Dash application instance.
    """

    @app.callback(
        Output("last-updated", "children"),
        Input("page-load-trigger", "data"),
    )
    def update_last_updated_date(_):
        """Fetch and display the last updated date on page load."""
        metadata = get_metadata()
        last_updated_str = metadata.get("last_updated")

        if last_updated_str:
            try:
                # Attempt to parse the date if it's in the expected format
                date_obj = datetime.strptime(last_updated_str, "%Y-%m-%d")
                return date_obj.strftime("%B %d, %Y")
            except ValueError:
                # If parsing fails, it might be in a different format or just a string
                return last_updated_str
        
        # Fallback to the default date if no date is found in metadata
        return DATA_LAST_DOWNLOAD_DATE

    @app.callback(
        Output("player-dropdown", "value"),
        Output("num-rounds-input", "value"),
        Input("clear-filters-btn", "n_clicks"),
        prevent_initial_call=True,
    )
    def clear_filters(_n_clicks):
        """Clear the dropdown filters when the clear button is clicked."""
        return [], 20

    @app.callback(
        Output("results-table", "data"),
        Output("results-table", "columns"),
        Output("results-summary", "children"),
        Output("results-placeholder", "style"),
        Input("find-combinations-btn", "n_clicks"),
        State("num-rounds-input", "value"),
        State("player-dropdown", "value"),
        prevent_initial_call=True,
    )
    def update_dashboard(_n_clicks, n_rounds, required_players):
        # Use more efficient data access pattern
        df = get_dataframe()
        metadata = get_metadata()

        result_df = find_unique_player_combinations(df, n_rounds, required_players)

        if result_df.is_empty():
            return [], [], "No teams found with the selected criteria.", {'display': 'block'}

        # --- Optimized Data Preparation for Display ---
        if not required_players:
            # No players to highlight, just join the list
            result_df_display = result_df.with_columns(
                pl.col("players").list.join(", ").alias("Roster")
            )
            summary_text = f"Found {result_df.height:,} unique rosters in the first {n_rounds or 'all'} rounds."
        else:
            # Optimize string operations for highlighting
            required_players_set = set(required_players)  # Convert to set for O(1) lookup
            
            # More efficient highlighting using format strings
            highlighter_expr = (
                pl.col("players")
                .list.eval(
                    pl.when(pl.element().is_in(required_players_set))
                    .then(pl.format('<mark style="background-color: #a0a0a0; color: white;">{}</mark>', pl.element()))
                    .otherwise(pl.element())
                )
                .list.join(", ")
            )
            result_df_display = result_df.with_columns(Roster=highlighter_expr)

            # Use cached metadata instead of recomputing
            total_teams_in_dataset = metadata["total_teams"]
            unique_team_count = result_df.height
            percentage_of_total = (
                (unique_team_count / total_teams_in_dataset * 100)
                if total_teams_in_dataset > 0
                else 0
            )
            summary_text = f"Found {unique_team_count:,} unique rosters ({percentage_of_total:.2f}%) containing {', '.join(required_players)} within the first {n_rounds} rounds."

        # --- Optimized Final Formatting for DataTable ---
        # Chain operations to reduce intermediate DataFrame copies
        result_df_display = (
            result_df_display
            .drop("players", "team_id")
            .rename({"draft": "Room #", "draft_position": "Draft Pos."})
            .sort("Room #", "Draft Pos.")  # Apply default sorting from user memory
        )

        # Pre-compute column definitions for better performance
        columns = [
            {"name": col, "id": col}
            for col in result_df_display.columns
            if col != "Roster"
        ] + [
            {
                "name": "Roster",
                "id": "Roster",
                "presentation": "markdown",
            }
        ]

        data = result_df_display.to_dicts()

        return data, columns, summary_text, {'display': 'none'}
