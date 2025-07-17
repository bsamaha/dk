import os

import pytest


@pytest.fixture(autouse=True)
def set_env():
    os.environ["ALLOWED_ORIGINS"] = '["http://testserver"]'
    # Add other env vars if needed
