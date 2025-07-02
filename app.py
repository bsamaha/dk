import dash
import dash_bootstrap_components as dbc
import polars as pl
from dash import dcc, html, Input, Output, State, dash_table

from player_combinations import find_unique_player_combinations

# --- Data Loading & Pre-calculation ---
df = pl.read_parquet("data/updated_bestball_data.parquet")
all_players = df["player"].unique().sort().to_list()

# --- Pre-calculate Stats for Display ---
total_drafts = df['draft'].max()
total_teams_drafted = total_drafts * 12 if total_drafts else 0



# --- App Initialization ---
app = dash.Dash(__name__, external_stylesheets=[dbc.themes.CYBORG])
server = app.server

# --- Layout ---
app.layout = dbc.Container(
    [
        dbc.Row(
            dbc.Col(
                html.H1("Player Combinations Dashboard", className="text-center my-4"),
                width=12,
            )
        ),
        dbc.Row(
            [
                # Stat box column
                dbc.Col(
                    dbc.Card(
                        [
                            dbc.CardHeader("Dataset Overview"),
                            dbc.CardBody([
                                html.P(f"Total Drafts Analyzed: {total_drafts}"),
                                html.P("Dataset Curation Date: 6/27/2025"),
                            ]),
                        ],
                        className="h-100"
                    ),
                    md=4,
                ),
                # Controls column
                dbc.Col(
                    dbc.Card(
                        [
                            dbc.CardHeader("Controls"),
                            dbc.CardBody(
                                [
                                    dbc.Row(
                                        [
                                            dbc.Col(
                                                [
                                                    dbc.Label("Number of Rounds (N)"),
                                                    dcc.Dropdown(
                                                        id="n-rounds-dropdown",
                                                        options=[
                                                            {'label': str(i), 'value': i} for i in range(2, 21)
                                                        ],
                                                        value=20,
                                                    ),
                                                ],
                                                md=6,
                                            ),
                                            dbc.Col(
                                                [
                                                    dbc.Label("Required Players"),
                                                    dcc.Dropdown(
                                                        id="required-players-dropdown",
                                                        options=all_players,
                                                        multi=True,
                                                        placeholder="Select players...",
                                                    ),
                                                ],
                                                md=6,
                                            ),
                                        ],
                                        className="mb-3",
                                    ),
                                    dbc.Button(
                                        "Find Combinations",
                                        id="submit-button",
                                        n_clicks=0,
                                        color="primary",
                                        className="w-100",
                                    ),
                                ]
                            ),
                        ]
                    ),
                    md=8,
                ),
            ],
            align="stretch",
            className="mb-4",
        ),
        dbc.Row(
            [
                dbc.Col(
                    dbc.Card(
                        [
                            dbc.CardHeader("Results"),
                            dbc.CardBody(
                                [
                                    html.Div(id="summary-output", className="mb-3"),
                                    dash_table.DataTable(
                                        id="results-table",
                                        style_table={'overflowX': 'auto'},
                                        style_cell={
                                            'backgroundColor': 'rgb(50, 50, 50)',
                                            'color': 'white',
                                            'border': '1px solid grey',
                                            'textAlign': 'left',
                                            'padding': '5px'
                                        },
                                        style_header={
                                            'backgroundColor': 'rgb(30, 30, 30)',
                                            'fontWeight': 'bold'
                                        },
                                    ),
                                ]
                            ),
                        ]
                    ),
                    width=12,
                )
            ]
        ),
    ],
    fluid=True,
)

# --- Callbacks ---
@app.callback(
    [
        Output("results-table", "data"),
        Output("results-table", "columns"),
        Output("summary-output", "children"),
    ],
    [Input("submit-button", "n_clicks")],
    [
        State("n-rounds-dropdown", "value"),
        State("required-players-dropdown", "value"),
    ],
)
def update_dashboard(n_clicks, n_rounds, required_players):
    if n_clicks == 0:
        return [], [], "Click the button to see results."

    result_df = find_unique_player_combinations(df, n_rounds, required_players)

    # Handle case where we just get a list of unique rosters
    if not required_players:
        summary_text = f"Found {result_df.height} unique rosters in the first {n_rounds if n_rounds else 'all'} rounds."

        # Prepare DataFrame for display – keep Draft, Draft Position, and roster
        result_df_display = (
            result_df.with_columns(
                pl.col("players").list.join(", ").alias("Roster")
            )
            .drop("players", "team_id")  # Remove internal columns
            .rename({"draft": "Draft", "draft_position": "Draft Position"})
            .sort(["Draft", "Draft Position"])  # Sort for clearer display
        )

        # Define columns explicitly to maintain desired order
        columns = [
            {"name": col, "id": col} for col in ["Draft", "Draft Position", "Roster"]
        ]
        data = result_df_display.select(["Draft", "Draft Position", "Roster"]).to_dicts()
        return data, columns, summary_text
    
    # Handle case where players are specified
    else:
        # We need to calculate the count of teams meeting the criteria
        first_n_rounds = df.filter(pl.col("round") <= n_rounds)
        team_combinations = first_n_rounds.group_by("team_id").agg(pl.col("player").alias("players"))
        for player in required_players:
            team_combinations = team_combinations.filter(pl.col("players").list.contains(player))
        teams_meeting_criteria_count = team_combinations.height

        if teams_meeting_criteria_count == 0:
            return [], [], "No teams found with the selected criteria."

        unique_team_count = result_df.height
        total_teams_in_dataset = df['team_id'].n_unique()
        percentage_of_total = (unique_team_count / total_teams_in_dataset * 100) if total_teams_in_dataset > 0 else 0

        summary_text = (
            f"Teams meeting player list criteria: {teams_meeting_criteria_count} | "
            f"Teams with unique combinations: {unique_team_count} of {total_teams_in_dataset} ({percentage_of_total:.2f}%)"
        )

        # Prepare DataFrame for display
        result_df_display = (
            result_df.with_columns(
                pl.col("players").list.join(", ").alias("Roster")
            )
            .drop("players", "team_id")
            .sort(["draft", "draft_position"])  # Consistent ordering
        )

        # Create columns for Dash DataTable with human-readable names
        columns = [
            {"name": col.replace('_', ' ').title(), "id": col}
            for col in result_df_display.columns
        ]
        data = result_df_display.to_dicts()

        return data, columns, summary_text


# --- Run Server ---
if __name__ == "__main__":
    app.run(debug=True)
