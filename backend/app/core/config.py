from typing import List

from pydantic import model_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings."""

    # API Settings
    API_V1_STR: str = "/api"
    PROJECT_NAME: str = "Fantasy Draft Analytics API"
    ENVIRONMENT: str = "development"

    # CORS Settings - will be populated by the validator below
    ALLOWED_ORIGINS: List[str] = []

    # Data Settings
    DATA_PATH: str = "/app/data/bestball.parquet"

    @model_validator(mode="after")
    def set_allowed_origins(self) -> "Settings":
        """
        Sets the ALLOWED_ORIGINS list based on the environment,
        but only if it hasn't been set explicitly.
        """
        # If ALLOWED_ORIGINS is already populated (e.g., from an env var), do nothing.
        if self.ALLOWED_ORIGINS:
            return self

        if self.ENVIRONMENT == "production":
            self.ALLOWED_ORIGINS = [
                "https://thesignalcallers.com",
                "http://thesignalcallers.com",
                "https://www.thesignalcallers.com",
                "http://www.thesignalcallers.com",
            ]
        else:
            # Default development origins
            self.ALLOWED_ORIGINS = [
                "http://localhost:3000",  # React dev server
                "http://localhost:5173",  # Vite dev server
                "http://localhost:5174",  # Vite dev server (alt port)
                "http://127.0.0.1:3000",
                "http://127.0.0.1:5173",
                "http://127.0.0.1:5174",
                "http://localhost:8080",  # Docker-hosted UI
                "http://127.0.0.1:8080",
            ]
        return self

    class Config:
        # Load from .env file (will be overridden by environment variables)
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False


settings = Settings()
