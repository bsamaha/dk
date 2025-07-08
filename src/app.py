import dash
import dash_bootstrap_components as dbc

from .callbacks import register_callbacks
from .data_manager import get_metadata
from .layout import create_layout

# --- App Initialization ---
app = dash.Dash(
    __name__,
    external_stylesheets=[dbc.themes.CYBORG, dbc.icons.FONT_AWESOME],
    suppress_callback_exceptions=True,
)
server = app.server

# --- Data Loading ---
# Load metadata once and pass to components that need it at startup
metadata = get_metadata()

# --- Layout & Callbacks ---
app.layout = create_layout(
    metadata["all_players"], 
    metadata["total_drafts"], 
    metadata["total_teams"]
)

register_callbacks(app)


# --- Run Server ---
if __name__ == "__main__":
    app.run(debug=True, port=8050)
