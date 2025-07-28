from typing import List

from pydantic import FieldValidationInfo, field_validator
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

    @staticmethod
    def _parse_csv_list(value: str) -> List[str]:
        if value and value.strip():
            return [item.strip() for item in value.split(",") if item.strip()]
        return []

    @field_validator("ALLOWED_ORIGINS", mode="after")
    @classmethod
    def parse_allowed_origins(cls, v: str, info: FieldValidationInfo) -> List[str]:
        # Start with development defaults
        default_origins = [
            "http://localhost:3000",
            "http://localhost:5173",
            "http://localhost:5174",
            "http://127.0.0.1:3000",
            "http://127.0.0.1:5173",
            "http://127.0.0.1:5174",
            "http://localhost:8080",
            "http://127.0.0.1:8080",
        ]

        # If a value is provided via env var, parse and use it instead
        items = cls._parse_csv_list(v)
        if items:
            return items

        # For production, use a strict list
        env = info.data.get("ENVIRONMENT", "development")
        if env == "production":
            return [
                "https://thesignalcallers.com",
                "https://www.thesignalcallers.com",
            ]

        # Otherwise, return the development defaults
        return default_origins

    @field_validator("ALLOWED_HOSTS", mode="after")
    @classmethod
    def parse_allowed_hosts(cls, v: str, info: FieldValidationInfo) -> List[str]:
        # If a value is provided via env var, parse and use it instead
        items = cls._parse_csv_list(v)
        if items:
            return items

        env = info.data.get("ENVIRONMENT", "development")
        if env == "production":
            return [
                "thesignalcallers.com",
                "www.thesignalcallers.com",
            ]
        else:
            return [
                "localhost",
                "127.0.0.1",
                "0.0.0.0",  # nosec B104 - Required for Docker development
            ]

    class Config:
        # Load from env file (will be overridden by environment variables)
        env_file = ".env.production"
        env_file_encoding = "utf-8"
        case_sensitive = False


settings = Settings()
