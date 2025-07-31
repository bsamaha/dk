"""Tests for path validation security functionality."""

from pathlib import Path
from unittest.mock import patch

import pytest

from backend.app.services.query_service import QueryService


class TestPathValidation:
    """Test path validation and sanitization functionality."""

    def test_validate_and_sanitize_path_valid_path(self, tmp_path):
        """Test that valid paths are accepted."""
        # Create a test file
        test_file = tmp_path / "test.txt"
        test_file.write_text("test content")

        # Test validation
        result = QueryService._validate_and_sanitize_path(test_file, tmp_path)
        assert result == test_file.resolve()

    def test_validate_and_sanitize_path_outside_allowed_directory(self, tmp_path):
        """Test that paths outside allowed directory are rejected."""
        # Create a test file outside the allowed directory
        outside_dir = tmp_path / "outside"
        outside_dir.mkdir()
        test_file = outside_dir / "test.txt"
        test_file.write_text("test content")

        allowed_dir = tmp_path / "allowed"
        allowed_dir.mkdir()

        # Test validation should fail
        with pytest.raises(ValueError, match="outside allowed directory"):
            QueryService._validate_and_sanitize_path(test_file, allowed_dir)

    def test_validate_and_sanitize_path_nonexistent_file(self, tmp_path):
        """Test that nonexistent files are rejected."""
        nonexistent_file = tmp_path / "nonexistent.txt"

        with pytest.raises(ValueError, match="Path does not exist"):
            QueryService._validate_and_sanitize_path(nonexistent_file, tmp_path)

    def test_validate_and_sanitize_path_directory_not_file(self, tmp_path):
        """Test that directories are rejected when expecting files."""
        test_dir = tmp_path / "testdir"
        test_dir.mkdir()

        with pytest.raises(ValueError, match="Path is not a file"):
            QueryService._validate_and_sanitize_path(test_dir, tmp_path)

    def test_validate_and_sanitize_path_directory_traversal(self, tmp_path):
        """Test that directory traversal attempts are rejected."""
        # Create a test file
        test_file = tmp_path / "test.txt"
        test_file.write_text("test content")

        # Try to access it with directory traversal
        malicious_path = tmp_path / "test.txt" / ".." / "test.txt"

        with pytest.raises(ValueError, match="suspicious pattern"):
            QueryService._validate_and_sanitize_path(malicious_path, tmp_path)

    def test_validate_and_sanitize_path_home_expansion(self, tmp_path):
        """Test that home directory expansion is rejected."""
        # Create a test file
        test_file = tmp_path / "test.txt"
        test_file.write_text("test content")

        # Try to access it with home expansion
        malicious_path = Path("~/test.txt")

        with pytest.raises(ValueError, match="suspicious pattern"):
            QueryService._validate_and_sanitize_path(malicious_path, tmp_path)

    def test_validate_and_sanitize_path_multiple_slashes(self, tmp_path):
        """Test that multiple slashes are rejected."""
        # Create a test file
        test_file = tmp_path / "test.txt"
        test_file.write_text("test content")

        # Try to access it with multiple slashes
        malicious_path = Path(str(test_file).replace("/", "//"))

        with pytest.raises(ValueError, match="suspicious pattern"):
            QueryService._validate_and_sanitize_path(malicious_path, tmp_path)

    def test_validate_and_sanitize_path_windows_separators(self, tmp_path):
        """Test that Windows path separators are rejected."""
        # Create a test file
        test_file = tmp_path / "test.txt"
        test_file.write_text("test content")

        # Try to access it with Windows separators
        malicious_path = Path(str(test_file).replace("/", "\\"))

        with pytest.raises(ValueError, match="suspicious pattern"):
            QueryService._validate_and_sanitize_path(malicious_path, tmp_path)

    def test_get_data_path_uses_validation(self):
        """Test that _get_data_path uses the validation method."""
        with patch.object(QueryService, "_validate_and_sanitize_path") as mock_validate:
            mock_validate.return_value = Path("/fake/validated/path")

            result = QueryService._get_data_path()

            # Check that validation was called
            mock_validate.assert_called_once()
            assert result == "/fake/validated/path"

    def test_load_week17_matchups_uses_validation(self):
        """Test that _load_week17_matchups uses the validation method."""
        service = QueryService()

        with patch.object(service, "_validate_and_sanitize_path") as mock_validate:
            mock_validate.return_value = Path("/fake/validated/matchups.json")

            with patch("builtins.open", create=True) as mock_open:
                mock_open.return_value.__enter__.return_value.read.return_value = (
                    '{"team": "opponent"}'
                )

                service._load_week17_matchups()

                # Check that validation was called
                mock_validate.assert_called_once()

    def test_load_week17_matchups_validation_failure(self):
        """Test that _load_week17_matchups handles validation failure gracefully."""
        service = QueryService()

        with patch.object(service, "_validate_and_sanitize_path") as mock_validate:
            mock_validate.side_effect = ValueError("Path validation failed")

            # Should not raise an exception, just log a warning
            service._load_week17_matchups()

            # Check that validation was called
            mock_validate.assert_called_once()

    def test_symlink_handling(self, tmp_path):
        """Test that symlinks are properly resolved."""
        # Create a test file
        original_file = tmp_path / "original.txt"
        original_file.write_text("test content")

        # Create a symlink to the file
        symlink_file = tmp_path / "symlink.txt"
        symlink_file.symlink_to(original_file)

        # Test validation should resolve the symlink
        result = QueryService._validate_and_sanitize_path(symlink_file, tmp_path)
        assert result == original_file.resolve()

    def test_relative_path_handling(self, tmp_path):
        """Test that relative paths are properly resolved."""
        # Create a test file
        test_file = tmp_path / "test.txt"
        test_file.write_text("test content")

        # Create a relative path to the file from within the allowed directory
        relative_path = tmp_path / "test.txt"

        # Test validation
        result = QueryService._validate_and_sanitize_path(relative_path, tmp_path)
        assert result == test_file.resolve()
