"""Tests for concurrent access to QueryService singleton."""

import time
from concurrent.futures import ThreadPoolExecutor

import pytest
from app.services.query_service import QueryService


class TestConcurrentAccess:
    """Test suite for concurrent access scenarios."""

    def test_concurrent_singleton_access(self):
        """Test that singleton is thread-safe under concurrent access."""
        instances = []
        errors = []

        def create_instance():
            try:
                # Import inside thread to simulate real-world usage
                from app.services.query_service import query_service

                instances.append(query_service)
                # Test that it's functional
                metadata = query_service.get_metadata()
                assert "total_players" in metadata
                assert metadata["total_players"] > 0
            except Exception as e:
                errors.append(e)

        # Create 10 threads to simulate concurrent access
        with ThreadPoolExecutor(max_workers=10) as executor:
            futures = [executor.submit(create_instance) for _ in range(10)]
            for future in futures:
                future.result()

        # All instances should be the same object
        assert not errors, f"Errors during concurrent access: {errors}"
        assert len(instances) == 10, "Should have 10 instances"
        first_instance = instances[0]
        assert all(instance is first_instance for instance in instances), (
            "All instances should be the same object"
        )

    def test_concurrent_initialization(self):
        """Test that concurrent initialization doesn't cause race conditions."""
        # Reset the singleton state
        QueryService._instance = None
        QueryService._initialized = False
        QueryService._initialization_started = False
        QueryService._initialization_error = None

        instances = []
        errors = []
        initialization_times = []

        def init_and_use():
            try:
                start_time = time.time()
                service = QueryService()
                end_time = time.time()

                instances.append(service)
                initialization_times.append(end_time - start_time)

                # Verify service is functional
                metadata = service.get_metadata()
                assert isinstance(metadata["total_players"], int)
            except Exception as e:
                errors.append(e)

        # Simulate 8 concurrent initializations (more than typical Gunicorn workers)
        with ThreadPoolExecutor(max_workers=8) as executor:
            futures = [executor.submit(init_and_use) for _ in range(8)]
            for future in futures:
                future.result()

        # Verify no errors occurred
        assert not errors, f"Errors during concurrent initialization: {errors}"

        # All instances should be the same
        assert len(instances) == 8
        first_instance = instances[0]
        assert all(instance is first_instance for instance in instances)

        # Only one initialization should have taken significant time
        # Others should be nearly instantaneous
        significant_times = [t for t in initialization_times if t > 1.0]
        assert len(significant_times) <= 1, (
            f"Too many threads did full initialization: {significant_times}"
        )

    def test_singleton_performance(self):
        """Test that singleton doesn't impact performance."""
        start_time = time.time()

        for _ in range(100):
            from app.services.query_service import query_service

            # Quick operation to ensure it's functional
            assert hasattr(query_service, "total_players")

        end_time = time.time()

        # Should complete within reasonable time (very fast for 100 accesses)
        assert end_time - start_time < 1.0, (
            f"Singleton access too slow: {end_time - start_time:.2f}s"
        )

    def test_concurrent_queries(self):
        """Test concurrent query execution."""
        from app.services.query_service import query_service

        results = []
        errors = []

        def run_queries():
            try:
                # Run multiple queries to stress test
                for _ in range(5):
                    result = query_service.query("SELECT COUNT(*) as count FROM picks")
                    assert result is not None
                    assert "count" in result.columns
                    results.append(result["count"][0])
            except Exception as e:
                errors.append(e)

        # Simulate 6 concurrent threads (more than Gunicorn workers)
        with ThreadPoolExecutor(max_workers=6) as executor:
            futures = [executor.submit(run_queries) for _ in range(6)]
            for future in futures:
                future.result()

        # Verify no errors occurred
        assert not errors, f"Errors during concurrent queries: {errors}"

        # Verify all results are consistent
        assert len(results) == 30  # 6 threads * 5 queries each
        first_count = results[0]
        assert all(count == first_count for count in results), (
            "Query results should be consistent across threads"
        )

    def test_singleton_state_consistency(self):
        """Test that singleton state remains consistent across threads."""
        from app.services.query_service import query_service

        # Get initial state
        initial_metadata = query_service.get_metadata()

        metadata_results = []
        errors = []

        def check_metadata():
            try:
                metadata = query_service.get_metadata()
                metadata_results.append(metadata)
            except Exception as e:
                errors.append(e)

        # Check metadata from multiple threads
        with ThreadPoolExecutor(max_workers=8) as executor:
            futures = [executor.submit(check_metadata) for _ in range(8)]
            for future in futures:
                future.result()

        # Verify no errors
        assert not errors, f"Errors checking metadata: {errors}"

        # All metadata should be identical
        assert len(metadata_results) == 8
        for metadata in metadata_results:
            assert metadata == initial_metadata, (
                "Metadata should be consistent across all threads"
            )

    def test_error_handling_during_initialization(self):
        """Test error handling when initialization fails."""
        # Reset singleton state
        QueryService._instance = None
        QueryService._initialized = False
        QueryService._initialization_started = False
        QueryService._initialization_error = None

        # Mock a failure scenario by temporarily breaking the data path
        original_get_data_path = QueryService._get_data_path

        def failing_get_data_path():
            raise FileNotFoundError("Test file not found")

        QueryService._get_data_path = staticmethod(failing_get_data_path)

        try:
            # With lazy loading, object creation succeeds but accessing data should fail
            service = QueryService()
            assert service is not None  # Object creation should succeed

            # But accessing metadata should fail due to file not found
            with pytest.raises(RuntimeError):
                service.get_metadata()

            # Verify service instance exists but is not properly initialized
            assert QueryService._instance is not None
            assert not QueryService._initialized

            # Subsequent attempts should also fail consistently
            with pytest.raises(RuntimeError):
                service.get_metadata()

        finally:
            # Restore original method and reset state
            QueryService._get_data_path = original_get_data_path
            QueryService._instance = None
            QueryService._initialized = False
            QueryService._initialization_started = False
            QueryService._initialization_error = None

    def test_thread_safety_under_load(self):
        """Test thread safety under high concurrent load."""
        from app.services.query_service import query_service

        results = []
        errors = []

        def heavy_workload():
            try:
                # Perform multiple operations
                metadata = query_service.get_metadata()
                assert metadata["total_players"] > 0

                # Run a query
                result = query_service.query(
                    "SELECT Position, COUNT(*) as count FROM picks GROUP BY Position LIMIT 4"
                )
                assert len(result) <= 4
                results.append(len(result))

                # Access attributes
                assert query_service.total_drafts > 0
                assert len(query_service.all_players) > 0

            except Exception as e:
                errors.append(e)

        # High concurrency test with 20 threads
        with ThreadPoolExecutor(max_workers=20) as executor:
            futures = [executor.submit(heavy_workload) for _ in range(20)]
            for future in futures:
                future.result()

        # Verify no errors under load
        assert not errors, f"Errors under high load: {errors}"
        assert len(results) == 20

        # Results should be consistent (all should return same number of positions)
        first_result = results[0]
        assert all(r == first_result for r in results), (
            "Results should be consistent under concurrent load"
        )
