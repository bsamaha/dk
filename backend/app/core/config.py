import os
from typing import List

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings."""

    # API Settings
    API_V1_STR: str = "/api"
    PROJECT_NAME: str = "Fantasy Draft Analytics API"

    # CORS Settings - Default to development origins
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:3000",  # React dev server
        "http://localhost:5173",  # Vite dev server
        "http://localhost:5174",  # Vite dev server (alt port)
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://localhost:8080",  # Docker-hosted UI
        "http://127.0.0.1:8080",
    ]

    # Data Settings
    DATA_PATH: str = "/app/data/bestball.parquet"

    class Config:
        # Load from .env file (will be overridden by environment variables)
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False

    def __init__(self, **kwargs):
        super().__init__(**kwargs)

        # Add production domains if in production environment
        if os.getenv("ENVIRONMENT") == "production":
            production_domains = [
                "https://thesignalcallers.com",
                "http://thesignalcallers.com",
                "https://www.thesignalcallers.com",
                "http://www.thesignalcallers.com",
            ]
            # Add production domains to existing origins
            self.ALLOWED_ORIGINS.extend(production_domains)


settings = Settings()
