# Fantasy Football Draft Analytics Dashboard – Engineering & Architecture Doc (v1)

## 1. High-Level Architecture
```
┌────────┐ React + Vite (5173)   ┌────────────┐
│ Client │ — REST/JSON ————▶ │ FastAPI     │
└────────┘ ◀───────────────  │ data_service│
           TanStack Query     └────────────┘
                ▲                    ▲
                │                    │ Polars in-mem df
                └──────────── parquet────────────┘
                                data/bestball.parquet
```

## 2. Tech Stack
Layer | Tech | Notes
---|---|---
Front-End | React 18 + TS, Vite, Tailwind v3, Mantine 7, Recharts 2 | Theme: navy `#002D72`, orange `#FF7F0E`
State | TanStack Query 5, Zustand | Query key = endpoint+params
Back-End | Python 3.12, FastAPI 0.116, Polars 0.20 | Uvicorn dev server
Data | 12 MB Parquet of 3.6 M picks | Loaded once at startup
Infra | Local: bare; Prod: TBD (Fly.io/Fargate) | CORS enabled
Tooling | Ruff, Black; ESLint + Prettier | GitHub Actions CI

## 3. Backend Layout & Endpoints
| Path | Responsibility |
|------|----------------|
| `app/main.py` | Instantiate FastAPI, include routers, CORS, health |
| `app/api/metadata.py` | `GET /metadata/` |
| `app/api/players.py` | Players list `/players/`, search, details |
| `app/api/positions.py` | Pos stats, first-player stats, counts |
| `app/api/combinations.py` | Combos + roster construction |
| `app/services/data_service.py` | Polars queries (singleton) |
| `app/models/schemas.py` | Pydantic models (Player, Responses) |

### 3.1 Endpoint Matrix (excerpt)
Method | Route | Handler | Params
---|---|---|---
GET | `/` | `root` | –
GET | `/health` | `health_check` | –
GET | `/api/metadata/` | `get_metadata` | –
GET | `/api/players/` | `get_players` | positions, search_term, limit, offset, sort_by, sort_order
GET | `/api/players/search` | `search_players` | q, limit
GET | `/api/players/details` | `get_player_details` | player_name, position, team
GET | `/api/positions/stats` | `get_position_stats` | –
GET | `/api/positions/stats/first_player` | `get_first_player_position_stats` | –
GET | `/api/positions/stats/{position}/by_round` | `get_position_draft_counts_by_round` | aggregation
GET | `/api/combinations/` | `get_player_combinations` | required_players[], n_rounds, limit
GET | `/api/combinations/roster-construction/` | `get_roster_construction` | –
GET | `/api/analytics/draft-slot` | `get_draft_slot_correlation` | slot, metric, top_n

### 3.2 DataService Highlights
Function | Description (Polars)
---|---
`get_players` | Filter + sort df, slice for pagination
`get_player_details` | Aggregate stats + generate histogram bins (dynamic)
`get_player_combinations` | Group by team → check required players drafted within N rounds
`get_roster_construction` | Group by team then pivot(position,count)
Note: LRU(128) memoisation to cache recent query results.

### 3.3 DuckDB & AnalyticsService
DuckDB is embedded via `duckdb_service` and leveraged for SQL-heavy aggregations (heat-map, stack finder, ADP drift, player listing, roster combinations). Each query path is wrapped by **AnalyticsService**, which benchmarks execution time and falls back to the original Polars implementation when DuckDB is more than 20 % slower (and >50 ms absolute latency).

Key points:
* Single in-memory DuckDB connection, `PRAGMA enable_object_cache`, view on Parquet file.
* Polars dataframe also registered as `picks_df` for hybrid queries.
* Fallback guard pattern:
  ```python
  t0 = time.perf_counter()
  duck_df = duckdb_service.query(sql)
  dur_duck = time.perf_counter() - t0
  if dur_duck > 0.05 and dur_pol < dur_duck * 0.8:
      return pol_result
  ```
* Ensures the fastest path is served without changing public API contracts.

See `docs/adr/ADR-0001-duckdb-polars-hybrid.md` for full rationale.

## 4. Frontend Layout
Dir | Key Components
---|---
`src/components/layout/` | `Header`, `Sidebar`, `MainContent`
`src/components/views/` | `OverviewView`, `PlayersView`, `PositionsView`, `CombinationsView`
`src/components/ui/` | `PlayerTable`, `PlayerAutocomplete`, `HistogramChart`, etc.
`src/api/` | `api.ts` wrapper over fetch + TanStack Query
`src/types/` | Shared TS mirrors of backend schemas

### 4.1 Player Click Data Flow
1. `PlayerTable` row `<a>` triggers `handlePlayerClick` in `PlayersView`.
2. Zustand `selectedPlayer` state updated.
3. React-Query fetches `GET /players/details`.
4. Collapse expands → shows stats grid + Recharts histogram.

## 5. Dev Scripts
| Step | Command |
|------|---------|
| Install backend deps | `pip install -r backend/requirements.txt` |
| Run backend | `uvicorn app.main:app --reload --port 8000` |
| Install FE deps | `cd frontend && pnpm i` |
| Run FE dev | `pnpm dev` (opens http://localhost:5173) |

## 6. Testing Status
Layer | Framework | Coverage
---|---|---
Backend | Pytest | ~20 % (data_service unit tests)
Frontend | Vitest + RTL | ~15 % (`DraftSlotTab` covered)
E2E | Playwright | backlog

## 7. Observed Pain Points / Tech Debt
* No deep-link routing to specific player or position
* Combination endpoint heavy payload; consider server pagination
* DataService caches lost on deploy; explore Redis
* Tailwind 4 upgrade blocked by PostCSS plugin

---
*Generated 2025-07-10 15:24 CT via Cascade reverse-engineering.*
