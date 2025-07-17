
# Backend Detailed Documentation

*Date: 2024-07-15*
*Scope: Comprehensive breakdown of the FastAPI backend in the Fantasy Draft Analytics application.*

This document provides an in-depth analysis of each module in the `backend/app/` directory, including their responsibilities, key functions, data flows, and interactions. It is based on a thorough review of the codebase. At the end, we note issues and potential improvements, keeping in mind the lean single-container deployment strategy from [ADR-0002](docs/adr/ADR-0002-lean-stack.md), which emphasizes minimal dependencies, low resource usage, and simplicity.

## Overall Architecture

The backend is a FastAPI application using Polars for data manipulation and DuckDB for complex SQL-based analytics. Data is loaded from a Parquet file (`updated_bestball_data.parquet`) at startup. Services are singletons for efficiency. API routers delegate to services, which handle business logic. The app supports serving a static React frontend from the same container for a lean deployment.

Key principles:

- Stateless, in-memory data handling.
- Hybrid Polars/DuckDB with performance-based fallback.
- Minimal dependencies (see `requirements.txt`).
- Logging and basic error handling via HTTPExceptions.

```mermaid
graph TD
    A[FastAPI App] --> B[API Routers]
    B --> C[Analytics Service]
    B --> D[Data Service]
    C --> E[DuckDB Service]
    C -. Fallback .-> D
    D --> F[Polars In-Memory DF]
    E --> G[DuckDB In-Memory DB]
    F --> H[Parquet File]
    G --> H
    A --> I[Static Frontend]
    subgraph Services
        C
        D
        E
    end
    subgraph Data Layer
        F
        G
        H
    end
```

## Module Breakdown

### `app/__init__.py`

- **Purpose**: Package initializer (empty, as it's a standard Python package file).
- **Key Features**: None; implicitly organizes the app as a module.
- **Flow**: Not directly involved in runtime; used for imports.

### `app/main.py`

- **Purpose**: Entry point for the FastAPI application. Initializes the app, configures logging, sets up CORS, includes API routers, and optionally serves static frontend files.
- **Key Components**:
  - Logging setup with INFO level and timestamped format.
  - FastAPI app creation with title, description, version, and docs endpoints.
  - CORS middleware using settings from `core/config.py`.
  - Includes the aggregated API router from `api/__init__.py`.
  - Attempts to mount static files from possible frontend build directories (e.g., `frontend_dist`); falls back to API-only mode if not found.
  - Health check endpoint `/health`.
  - Uvicorn runner for local development.
- **Flow Control**:
  - On startup: Load Polars string cache, configure logging, create app, add middleware, include routers, mount static files if available.
  - Request handling: FastAPI routes requests to included routers or static files.
  - Example: GET `/` serves frontend index.html if available, else a JSON message.
- **Dependencies**: FastAPI, logging, pathlib, polars, uvicorn (for dev).

### `app/core/__init__.py`

- **Purpose**: Package initializer (empty).

### `app/core/config.py`

- **Purpose**: Defines application settings using Pydantic for type-safe configuration.
- **Key Components**:
  - `Settings` class inheriting from `BaseSettings`.
  - Fields: API prefix, project name, allowed CORS origins (list of localhost variants), data path.
  - Loads from `.env` file if present.
  - Instantiates a global `settings` object.
- **Flow**: Accessed globally (e.g., in `main.py` for CORS). No dynamic logic.
- **Dependencies**: pydantic-settings.

### `app/models/__init__.py`

- **Purpose**: Package initializer (empty).

### `app/models/schemas.py`

- **Purpose**: Defines Pydantic models, enums, and response schemas for API contracts.
- **Key Components**:
  - Enums: `Position` (QB, RB, etc.), `SortableColumn`, `SortOrder`, `AggregationType`.
  - Models: `MetadataResponse`, `Player`, `PlayersResponse`, `PositionStats`, `PositionStatsResponse`, `TeamCombination`, `CombinationsResponse`, and many more for various endpoints (e.g., `DraftSlotRow`, `HeatMapCell`).
  - Used for request validation, response serialization, and type safety.
- **Flow**: Models are used in API routers for response types and in services for data shaping.
- **Dependencies**: pydantic, typing, enum.

### `app/services/__init__.py`

- **Purpose**: Package initializer (empty).

### `app/services/data_service.py`

- **Purpose**: Core singleton service for Polars-based data operations. Loads and pre-processes the Parquet data, provides methods for querying players, stats, combinations, etc.
- **Key Components**:
  - `DataService` class (singleton via global `data_service`).
  - Initialization: Loads Parquet, corrects pick values (handles signed/unsigned overflow), computes metadata (unique players, drafts, teams).
  - Methods: `get_players` (filter, sort, paginate with draft percentage), `get_player_details` (stats and raw picks), `get_position_stats`, `get_first_player_draft_stats`, `get_position_draft_counts_by_round`, `get_player_combinations` (teams with required players in N rounds), `get_roster_construction` (position counts per team).
  - Utility: `log_memory_usage` for monitoring.
- **Flow Control**:
  - Startup: Load data into Polars LazyFrame, collect, cache metadata.
  - Query: Use Polars expressions for grouping, filtering, aggregation. Example: `get_players` builds a lazy query, applies filters/sorts, collects, converts to Pydantic models.
  - Memory-aware: Logs usage before/after init.
- **Dependencies**: polars, psutil, logging, os.

### `app/services/duckdb_service.py`

- **Purpose**: Singleton for DuckDB integration, providing SQL query execution over the Parquet data, returning Polars DataFrames.
- **Key Components**:
  - `DuckDBService` class (singleton via `duckdb_service`).
  - Initialization: Creates in-memory connection, enables object cache, creates a view on Parquet with pick correction, registers Polars DF for hybrid queries.
  - Method: `query(sql, params)` – Executes SQL, returns Polars DF via Arrow.
- **Flow**: Services like `analytics_service` use it for complex queries. Ensures read-only, lazy loading.
- **Dependencies**: duckdb, polars, logging, os.

### `app/services/analytics_service.py`

- **Purpose**: Higher-level service using DuckDB for analytics, with performance fallback to `data_service` (Polars) if faster.
- **Key Components**:
  - `AnalyticsService` class (singleton).
  - Methods: Optimized versions of `get_players`, `get_player_combinations`; new analytics like `get_draft_slot_correlation` (player correlation by slot), `get_heat_map` (round x position counts), `get_stacks` (QB/receiver stacks), `get_adp_drift` (ADP changes over time).
  - Fallback logic: Times DuckDB query; if >50ms and Polars 20% faster, uses Polars.
- **Flow Control**:
  - For each method: Build SQL, query DuckDB, time it; optionally benchmark Polars and switch if better; shape results to dicts/models.
  - Example: `get_players` dynamically builds SQL with filters, computes totals, paginates.
- **Dependencies**: polars, time, logging; imports schemas and other services.

```mermaid
flowchart TD
    A[Start: Analytics Method Called]
    A --> B{Is Query Complex?}
    B -- Yes --> C[Build SQL]
    C --> D[Time DuckDB Query]
    D --> E{DuckDB Time >50ms?}
    E -- No --> F[Use DuckDB Result]
    E -- Yes --> G[Benchmark Polars Equivalent]
    G --> H{Polars >20% Faster?}
    H -- Yes --> I[Use Polars Result]
    H -- No --> F
    B -- No --> J[Use DataService (Polars)]
    F --> K[Shape to Models/Dicts]
    I --> K
    J --> K
    K --> L[Return to Router]
```

### `app/api/__init__.py`

- **Purpose**: Aggregates all API routers into a single router.
- **Key Components**: Creates `router`, includes sub-routers from other api modules with prefixes/tags.
- **Flow**: Included in `main.py`; centralizes route registration.
- **Dependencies**: fastapi.APIRouter.

### `app/api/analytics.py`

- **Purpose**: Router for analytics endpoints (e.g., /analytics/heat-map, /stacks, /draft-slot, /drift).
- **Key Components**: APIRouter with prefix/tags; endpoints delegate to `analytics_service`, handle exceptions.
- **Flow**: Request -> validate queries -> call service -> return response model.
- **Dependencies**: fastapi, logging, schemas, analytics_service.

### `app/api/combinations.py`

- **Purpose**: Router for player combinations and roster construction.
- **Key Components**: Endpoints for /combinations/ (teams with required players) and /roster-construction/.
- **Flow**: Similar to above; uses `analytics_service` for combinations, `data_service` for rosters.
- **Dependencies**: fastapi, typing, logging, schemas, services.

### `app/api/metadata.py`

- **Purpose**: Router for /metadata/ endpoint.
- **Key Components**: Single GET returning dataset metadata.
- **Flow**: Calls `data_service.get_metadata()`, shapes to model.
- **Dependencies**: fastapi, logging, schemas, data_service.

### `app/api/players.py`

- **Purpose**: Router for player-related endpoints (/players/, /search, /details).
- **Key Components**: Filtering/pagination for lists, search, details with stats.
- **Flow**: Uses `analytics_service` for lists/search, `data_service` for details; computes pagination info.
- **Dependencies**: fastapi, typing, logging, schemas, services.

### `app/api/positions.py`

- **Purpose**: Router for position stats (/positions/stats, /first_player, /by_round, /roster-construction).
- **Key Components**: Aggregations by position, round counts, roster constructions.
- **Flow**: Delegates to `data_service`; shapes responses.
- **Dependencies**: fastapi, typing, logging, schemas, data_service.

### `backend/requirements.txt`

- **Purpose**: Lists dependencies with versions (e.g., fastapi>=0.108.0, polars>=0.20.3, duckdb>=0.10.0).
- **Notes**: Lean set; no heavy extras. Consider pinning exact versions for reproducibility.

## Flow Control Overview

1. **Startup**: `main.py` initializes app, loads services (which load data into memory via Polars/DuckDB).
2. **Request Handling**: FastAPI routes to appropriate api router -> validates params -> calls service method.
3. **Service Layer**: `analytics_service` prefers DuckDB for complex queries, falls back to Polars if slower; `data_service` uses Polars directly.
4. **Data Access**: Queries hit in-memory Parquet views/tables; results shaped to Pydantic models.
5. **Response**: JSON via FastAPI, with error handling.
6. **Error Flow**: Exceptions logged and raised as HTTP 500 with details.

```mermaid
sequenceDiagram
    participant Client
    participant FastAPI
    participant Router
    participant AnalyticsService
    participant DuckDBService
    participant DataService
    Client->>FastAPI: HTTP Request (e.g., GET /api/players)
    FastAPI->>Router: Route to handler
    Router->>AnalyticsService: Call method (e.g., get_players)
    alt Complex Analytics
        AnalyticsService->>DuckDBService: Execute SQL Query
        DuckDBService-->>AnalyticsService: Return Polars DF
    else Fallback or Simple Query
        AnalyticsService->>DataService: Execute Polars Operations
        DataService-->>AnalyticsService: Return Data
    end
    Note over AnalyticsService: Benchmark and fallback if needed
    AnalyticsService-->>Router: Shaped Response Data
    Router-->>FastAPI: Response Model
    FastAPI-->>Client: JSON Response
```

## HTTPS, Nginx, and Security Architecture (2025-07)

**New in July 2025:**

- The backend is now deployed behind an **Nginx reverse proxy** on the same EC2 instance.
- **Let's Encrypt** (via Certbot) provides free SSL certificates, automatically renewed.
- Nginx terminates HTTPS (443) and proxies all traffic to the FastAPI app running on localhost:8000 (HTTP only).
- All HTTP (port 80) traffic is redirected to HTTPS.
- Security headers and rate limiting are enforced at the Nginx layer.
- The FastAPI app is **never exposed directly to the public internet**; only Nginx is.
- See `docs/HTTPS_SETUP.md` for full setup and maintenance instructions.

**Benefits:**

- No need for AWS CloudFront or ACM (Amazon Certificate Manager)
- No extra AWS costs for HTTPS
- Fully automated, secure, and maintainable
- Certificates auto-renew via cron

**Key files:**

- `nginx.conf` (Nginx config)
- `docker-compose.prod.yml` (production stack)
- `scripts/setup-https.sh` (initial setup)
- `docs/HTTPS_SETUP.md` (full guide)

---

### Updated Issues and Improvements

- **SQL Injection Risk**: (Resolved July 2025) All DuckDB queries in `analytics_service` now use parameterized queries. Bandit suppressions are documented and safe. No user input is ever interpolated directly into SQL.
- **HTTPS/SSL**: Now handled by Nginx + Let's Encrypt, not CloudFront/ACM. No AWS-managed certificate required.
- **Security**: Nginx enforces security headers, rate limiting, and HTTP→HTTPS redirect. FastAPI CORS is still enforced at the app layer.
- **Deployment**: Remains a single-container (app) plus Nginx/Certbot sidecars, all orchestrated via Docker Compose.

---
