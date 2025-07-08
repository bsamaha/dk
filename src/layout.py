import dash_bootstrap_components as dbc
from dash import dcc, html, dash_table


def create_layout(all_players, total_drafts, total_teams):
    """Create the Dash app layout.

    Args:
        all_players (list): A list of all unique player names.
        total_drafts (int): The total number of drafts in the dataset.
        total_teams (int): The total number of teams in the dataset.

    Returns:
        dbc.Container: The main layout component for the app.
    """
    return dbc.Container(
        [
            dcc.Store(id='page-load-trigger', data=0),
            # Header
            html.Div(
                [
                    html.H1("🏆 Player Combinations Dashboard 🏆", className="text-center"),
                    html.P(
                        "Uncover winning player synergies from thousands of fantasy drafts.",
                        className="text-center text-muted",
                    ),
                ],
                className="my-4 border-bottom pb-4",
            ),
            # Main content row
            dbc.Row(
                [
                    # Left column for stats and controls (Sidebar)
                    dbc.Col(
                        [
                            html.H4("📊 Key Metrics", className="mb-3"),
                            dbc.Card(
                                dbc.CardBody(
                                    [
                                        dbc.Row(
                                            [
                                                dbc.Col(html.I(className="fas fa-chart-bar fa-2x text-primary"), width="auto"),
                                                dbc.Col([
                                                    html.H4(f"{total_drafts:,}", className="mb-0"),
                                                    html.P("Total Drafts", className="text-muted mb-0"),
                                                ]),
                                            ],
                                            align="center",
                                            className="mb-3",
                                        ),
                                        dbc.Row(
                                            [
                                                dbc.Col(html.I(className="fas fa-users fa-2x text-info"), width="auto"),
                                                dbc.Col([
                                                    html.H4(f"{total_teams:,}", className="mb-0"),
                                                    html.P("Total Teams", className="text-muted mb-0"),
                                                ]),
                                            ],
                                            align="center",
                                            className="mb-3",
                                        ),
                                        dbc.Row(
                                            [
                                                dbc.Col(html.I(className="fas fa-calendar-alt fa-2x text-success"), width="auto"),
                                                dbc.Col([
                                                    html.H4(id="last-updated", className="mb-0"),
                                                    html.P("Data Updated", className="text-muted mb-0"),
                                                ]),
                                            ],
                                            align="center",
                                        ),
                                    ]
                                ),
                                className="mb-4",
                            ),
                            html.H4("🕹️ Controls", className="mb-3 mt-4"),
                            dbc.Card(
                                dbc.CardBody(
                                    [
                                        dbc.Form(
                                            [
                                                dbc.Label("Number of Rounds (N)", html_for="num-rounds-input"),
                                                dbc.Input(id="num-rounds-input", type="number", min=1, max=20, step=1, value=20, className="mb-3"),
                                            ]
                                        ),
                                        dbc.Form(
                                            [
                                                dbc.Label("Required Players", html_for="player-dropdown"),
                                                dcc.Dropdown(
                                                    id="player-dropdown",
                                                    options=[{"label": player, "value": player} for player in all_players],
                                                    multi=True,
                                                    placeholder="Select players...",
                                                    className="mb-3",
                                                ),
                                            ]
                                        ),
                                        dbc.Row(
                                            [
                                                dbc.Col(dbc.Button("Find Combinations", id="find-combinations-btn", color="primary", className="w-100"), width=6),
                                                dbc.Col(dbc.Button("Clear Filters", id="clear-filters-btn", color="secondary", outline=True, className="w-100"), width=6),
                                            ]
                                        ),
                                    ]
                                )
                            ),
                        ],
                        md=3,
                    ),
                    # Right column for results
                    dbc.Col(
                        [
                            dbc.Card(
                                [
                                    dbc.CardHeader(
                                        html.Div(
                                            [
                                                html.H4("📈 Results", className="d-inline-block"),
                                                dbc.Button("Export CSV", id="export-csv-btn", color="secondary", size="sm", className="float-end"),
                                            ],
                                            className="d-flex justify-content-between align-items-center"
                                        )
                                    ),
                                    dbc.CardBody(
                                        [
                                            html.Div(id="results-summary", className="mb-3"),
                                            dcc.Loading(
                                                id="loading-results",
                                                type="default",
                                                children=[
                                                    html.Div(
                                                        id="results-placeholder",
                                                        children=[
                                                            html.Div(html.I(className="fas fa-search fa-3x"), className="text-center mb-3"),
                                                            html.P("Set your parameters and click 'Find Combinations' to begin!", className="mt-2"),
                                                        ],
                                                        className="text-center text-muted p-4",
                                                    )
                                                ],
                                            ),
                                            dash_table.DataTable(
                                                id="results-table",
                                                columns=[],
                                                data=[],
                                                page_action="native",
                                                page_size=25,
                                                sort_action="native",
                                                filter_action="none",  # Removed filter input row
                                                fixed_rows={"headers": True},
                                                virtualization=True,
                                                style_table={
                                                    "height": "calc(100vh - 350px)",  # Adjusted height for new layout
                                                    "overflowY": "auto",
                                                    "overflowX": "auto",
                                                    "minWidth": "100%",
                                                },
                                                style_cell={
                                                    'overflow': 'hidden',
                                                    'textOverflow': 'ellipsis',
                                                    'textAlign': 'left',
                                                    'padding': '10px',
                                                    'fontSize': '14px',
                                                    'border': '1px solid rgb(80, 80, 80)',
                                                },
                                                style_cell_conditional=[
                                                    {'if': {'column_id': 'Room #'}, 'width': '8%', 'minWidth': '80px'},
                                                    {'if': {'column_id': 'Draft Pos.'}, 'width': '10%', 'minWidth': '100px'},
                                                    {'if': {'column_id': 'Roster'}, 'width': '82%'},
                                                ],
                                                style_header={
                                                    "fontWeight": "bold",
                                                    "backgroundColor": "rgb(30, 30, 30)",
                                                    "color": "white",
                                                    "textAlign": "center",
                                                    'whiteSpace': 'normal',
                                                    'height': 'auto',
                                                },
                                                style_data={
                                                    "backgroundColor": "rgb(50, 50, 50)",
                                                    "color": "white",
                                                },
                                                style_data_conditional=[
                                                    {"if": {"row_index": "odd"}, "backgroundColor": "rgb(45, 45, 45)"}
                                                ],
                                                markdown_options={"html": True},
                                                export_format="csv",
                                                export_headers="display",
                                            ),
                                        ]
                                    ),
                                ],
                                className="h-100",
                            ),
                        ],
                        md=9,
                    ),
                ],
                align="stretch",
            ),
        ],
        fluid=True,  # Use a fluid container for full-width layout
    )
