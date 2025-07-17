import pytest


@pytest.fixture(autouse=True)
def set_env(monkeypatch):
    monkeypatch.setenv("ALLOWED_ORIGINS", '["http://testserver"]')
    # Add other env vars if needed
