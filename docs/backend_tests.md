# Backend Test Suite Documentation

*Date: 2025-01-14*
*Scope: Comprehensive overview of unit and integration tests for the FastAPI backend.*

## Overview

The backend test suite uses pytest for unit and integration testing, ensuring reliability during refactoring. Tests are organized in `backend/tests/` and cover services (unit) and API routers (integration). All 23 tests pass with robust cross-platform compatibility.

Key principles:

- Isolated unit tests with mocks (e.g., `@patch` for Polars/DuckDB).
- Integration tests using FastAPI's `TestClient` for endpoint validation.
- Fixtures for shared setup (sample data, env vars).
- Parametrized tests for edge cases.
- Cross-platform path handling using `pathlib.Path`.

## Running Tests

From `backend/`:

**Windows (PowerShell):**

```powershell
$env:ALLOWED_ORIGINS = $null; $env:PYTHONPATH = "."; python -m pytest -q
```

**Linux/macOS:**

```bash
PYTHONPATH=. python -m pytest -q
```

For verbose output with coverage:

```bash
PYTHONPATH=. python -m pytest tests/ -v --cov=app --cov-report=term-missing
```

### Environment Setup

- Requires dependencies from `requirements.txt` (pytest, httpx, etc.).
- Clear `ALLOWED_ORIGINS` environment variable if set (can cause JSON parsing errors).
- Set `PYTHONPATH=.` to ensure proper module imports when running from `backend/` directory.

## Unit Tests

### DataService (`test_data_service.py`)

- Covers initialization, get_players (filtering/sorting/pagination), get_player_details, position stats, draft counts, combinations, roster construction.
- Uses sample Parquet mock and assertions on shapes/models.
- Edge cases: empty data, invalid filters.

### DuckDBService (`test_duckdb_service.py`)

- Tests init (connection, pragma, view creation) and query execution.
- Mocks duckdb.connect and arrow returns.
- **Recent Fix**: Improved path resolution for cross-platform compatibility.

### AnalyticsService (`test_analytics_service.py`)

- Covers get_players, combinations, draft slot correlation, heat map, fallback logic.
- Mocks DuckDB/DataService queries with side_effects for multiple calls.
- **Recent Fix**: Updated mocks to work with lazy service initialization pattern.

## Integration Tests

### API Endpoints (`test_api_integration.py`)

- Tests /health, /metadata, /players, /details, /positions/stats, /combinations, /analytics/heat-map, etc.
- Uses TestClient with simplified fixtures for cleaner test setup.
- Asserts status codes, response structures, and specific data.
- **Recent Improvements**:
  - Handles multiple frontend scenarios (API-only, frontend, empty frontend_dist).
  - Simplified fixture setup without broad Path.exists() patching.
  - Robust root endpoint testing for different deployment states.

## Recent Improvements (January 2025)

### Path Resolution Fixes

- **Issue**: DuckDB service failed to initialize due to incorrect path calculation on Windows.
- **Fix**: Updated `DuckDBService._get_data_path()` to correctly traverse from `backend/app/services/` to project root using `pathlib.Path`.
- **Impact**: Tests now work consistently across Windows, Linux, and macOS.

### Test Fixture Simplification

- **Issue**: `no_static_mount` fixture was patching `pathlib.Path.exists` globally, interfering with service initialization.
- **Fix**: Removed problematic fixture and simplified app creation to handle real static file mounting.
- **Impact**: Tests run in more realistic conditions without mock interference.

### Enhanced Root Endpoint Testing

- **Issue**: Root endpoint test failed when `frontend_dist` directory exists but is empty.
- **Fix**: Updated test to handle three scenarios: API-only mode, frontend mode, and empty frontend directory.
- **Impact**: Tests are more resilient to different deployment states.

### Mock Pattern Updates

- **Issue**: Analytics service tests failed due to changes in service instantiation pattern.
- **Fix**: Updated mocks to work with lazy service initialization (`get_duckdb_service()` function).
- **Impact**: Tests properly isolate service dependencies.

## Coverage and Current Status

- **Test Count**: 23 tests passing
- **Coverage**: Comprehensive coverage of core functionality
- **Warnings**: Some Polars deprecation warnings (non-breaking)
- **Platform Support**: Windows, Linux, macOS

## Known Warnings

1. **CategoricalRemappingWarning**: Polars merge operations with different categorical encodings (performance impact only).
2. **PydanticDeprecatedSince20**: Class-based config deprecation (non-breaking).
3. **DeprecationWarning**: `is_in` usage in data service (should use `implode` for future compatibility).

## Proposed Improvements

- Add tests for error handling (e.g., HTTPExceptions).
- Increase coverage for API routers edge cases.
- Fix Polars deprecation warnings for future compatibility.
- Add E2E tests with real data loading if needed.
- Use pytest-cov for HTML reports.

This suite provides a solid safety net for refactoring and ensures cross-platform compatibility—expand as new features are added.
