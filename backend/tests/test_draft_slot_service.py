"""Unit tests for draft slot correlation service."""

import pytest

from backend.app.services.analytics_service import analytics_service


@pytest.mark.parametrize("metric", ["count", "percent", "ratio"])
def test_get_draft_slot_returns_rows(metric: str):
    """Service should return at least one row for common slot and metric."""
    rows = analytics_service.get_draft_slot_correlation(slot=1, metric=metric, top_n=10)
    assert isinstance(rows, list)
    # At least one row expected (dataset should have many picks)
    assert len(rows) > 0
    sample = rows[0]
    expected_keys = {"player", "slot", "overall", "p_slot", "p_overall", "score"}
    assert expected_keys.issubset(sample.keys())


def test_invalid_metric_raises():
    """Invalid metric value should raise ValueError."""
    with pytest.raises(ValueError):
        analytics_service.get_draft_slot_correlation(slot=1, metric="invalid")
