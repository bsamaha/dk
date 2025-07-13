# Backend Test Suite Documentation

*Date: 2024-07-16*
*Scope: Comprehensive overview of unit and integration tests for the FastAPI backend.*

## Overview
The backend test suite uses pytest for unit and integration testing, ensuring reliability during refactoring. Tests are organized in `backend/tests/` and cover services (unit) and API routers (integration). All 23 tests pass with 78% code coverage (as per latest run).

Key principles:
- Isolated unit tests with mocks (e.g., `@patch` for Polars/DuckDB).
- Integration tests using FastAPI's `TestClient` for endpoint validation.
- Fixtures for shared setup (sample data, env vars, no-static-mount).
- Parametrized tests for edge cases.

## Running Tests
From `backend/`:
```bash
python -m pytest tests/ -v --cov=app --cov-report=term-missing
```
Requires dependencies from `requirements.txt` (pytest, httpx, etc.). Set `ALLOWED_ORIGINS='["*"]'` if needed for env parsing.

## Unit Tests
### DataService (`test_data_service.py`)
- Covers initialization, get_players (filtering/sorting/pagination), get_player_details, position stats, draft counts, combinations, roster construction.
- Uses sample Parquet mock and assertions on shapes/models.
- Edge cases: empty data, invalid filters.

### DuckDBService (`test_duckdb_service.py`)
- Tests init (connection, pragma, view creation) and query execution.
- Mocks duckdb.connect and arrow returns.

### AnalyticsService (`test_analytics_service.py`)
- Covers get_players, combinations, draft slot correlation, heat map, fallback logic.
- Mocks DuckDB/DataService queries with side_effects for multiple calls.

## Integration Tests
### API Endpoints (`test_api_integration.py`)
- Tests /health, /metadata, /players, /details, /positions/stats, /combinations, /analytics/heat-map, etc.
- Uses TestClient with mocks for services and no-static-mount to avoid frontend interference.
- Asserts status codes, response structures, and specific data.

## Coverage and Improvements
Latest coverage: 78% overall, high in services (89-91%), lower in analytics (59%) due to untested fallbacks/errors.

Proposed:
- Add tests for error handling (e.g., HTTPExceptions).
- Increase coverage for API routers (currently 42-80%).
- E2E tests with real data loading if needed.
- Use pytest-cov for HTML reports.

This suite provides a solid safety net for refactoring—expand as new features are added. 