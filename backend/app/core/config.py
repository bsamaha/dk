from typing import List

from pydantic import field_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings."""

    # API Settings
    API_V1_STR: str = "/api"
    PROJECT_NAME: str = "Fantasy Draft Analytics API"
    ENVIRONMENT: str = "development"

    # CORS Settings - store as string from env, convert to list
    ALLOWED_ORIGINS: str = ""

    # Host Settings - store as string from env, convert to list
    ALLOWED_HOSTS: str = ""

    # Data Settings
    DATA_PATH: str = "/app/data/bestball.parquet"

    @field_validator("ALLOWED_ORIGINS", mode="after")
    @classmethod
    def parse_allowed_origins(cls, v: str) -> List[str]:
        """Parse ALLOWED_ORIGINS from string to list."""
        if v and v.strip():
            return [origin.strip() for origin in v.split(",") if origin.strip()]

        # Return defaults based on environment
        import os

        env = os.getenv("ENVIRONMENT", "development")

        if env == "production":
            return [
                "https://thesignalcallers.com",
                "https://www.thesignalcallers.com",
            ]
        else:
            # Default development origins
            return [
                "http://localhost:3000",  # React dev server
                "http://localhost:5173",  # Vite dev server
                "http://localhost:5174",  # Vite dev server (alt port)
                "http://127.0.0.1:3000",
                "http://127.0.0.1:5173",
                "http://127.0.0.1:5174",
                "http://localhost:8080",  # Docker-hosted UI
                "http://127.0.0.1:8080",
            ]

    @field_validator("ALLOWED_HOSTS", mode="after")
    @classmethod
    def parse_allowed_hosts(cls, v: str) -> List[str]:
        """Parse ALLOWED_HOSTS from string to list."""
        if v and v.strip():
            return [host.strip() for host in v.split(",") if host.strip()]

        # Return defaults based on environment
        import os

        env = os.getenv("ENVIRONMENT", "development")

        if env == "production":
            return [
                "thesignalcallers.com",
                "www.thesignalcallers.com",
            ]
        else:
            # Default development hosts
            return [
                "localhost",
                "127.0.0.1",
                "0.0.0.0",  # nosec B104 - Required for Docker development
            ]

    class Config:
        # Load from env file (will be overridden by environment variables)
        env_file = "env"
        env_file_encoding = "utf-8"
        case_sensitive = False


settings = Settings()
