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

    # Host Settings - will be populated by the validator below
    ALLOWED_HOSTS: List[str] = []

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
            # Handle case where ALLOWED_ORIGINS is a string (from env var)
            if isinstance(self.ALLOWED_ORIGINS, str):
                self.ALLOWED_ORIGINS = [
                    origin.strip()
                    for origin in self.ALLOWED_ORIGINS.split(",")
                    if origin.strip()
                ]
            return self

        if self.ENVIRONMENT == "production":
            self.ALLOWED_ORIGINS = [
                "https://thesignalcallers.com",
                "https://www.thesignalcallers.com",
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

    @model_validator(mode="after")
    def set_allowed_hosts(self) -> "Settings":
        """
        Sets the ALLOWED_HOSTS list based on the environment,
        but only if it hasn't been set explicitly.
        """
        # If ALLOWED_HOSTS is already populated (e.g., from an env var), do nothing.
        if self.ALLOWED_HOSTS:
            # Handle case where ALLOWED_HOSTS is a string (from env var)
            if isinstance(self.ALLOWED_HOSTS, str):
                self.ALLOWED_HOSTS = [
                    host.strip()
                    for host in self.ALLOWED_HOSTS.split(",")
                    if host.strip()
                ]
            return self

        if self.ENVIRONMENT == "production":
            self.ALLOWED_HOSTS = [
                "thesignalcallers.com",
                "www.thesignalcallers.com",
            ]
        else:
            # Default development hosts
            self.ALLOWED_HOSTS = [
                "localhost",
                "127.0.0.1",
                "0.0.0.0",  # nosec B104 - Required for Docker development
            ]
        return self

    class Config:
        # Load from env file (will be overridden by environment variables)
        env_file = "env"
        env_file_encoding = "utf-8"
        case_sensitive = False


settings = Settings()
