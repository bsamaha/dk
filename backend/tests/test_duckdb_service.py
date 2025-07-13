import pytest
from unittest.mock import patch, MagicMock
import polars as pl
from app.services.duckdb_service import DuckDBService

@pytest.fixture
def mock_duckdb():
    with patch('app.services.duckdb_service.duckdb') as mock_db:
        mock_con = MagicMock()
        mock_db.connect.return_value = mock_con
        yield mock_db

def test_duckdb_service_init(mock_duckdb):
    service = DuckDBService()
    mock_duckdb.connect.assert_called_with(database=":memory:", read_only=False)
    mock_duckdb.connect.return_value.execute.assert_any_call("PRAGMA enable_object_cache;")
    # Add assertions for view creation and other init steps

def test_query(mock_duckdb):
    service = DuckDBService()
    mock_result = MagicMock()
    mock_result.arrow.return_value = pl.DataFrame({"col": [1]}).to_arrow()
    service._con.execute.return_value = mock_result
    result = service.query("SELECT 1")
    assert isinstance(result, pl.DataFrame)
    assert result.shape == (1, 1) 