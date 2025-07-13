import pytest
import os

@pytest.fixture(autouse=True)
def set_env(monkeypatch):
    monkeypatch.setenv("ALLOWED_ORIGINS", '["*"]')
    # Add other env vars if needed 