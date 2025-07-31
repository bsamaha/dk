from typing import List

from pydantic import ValidationInfo, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


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
    # Directory containing data files
    DATA_PATH: str = "data"

    @staticmethod
    def _parse_csv_list(value: str) -> List[str]:
        if value and value.strip():
            return [item.strip() for item in value.split(",") if item.strip()]
        return []

    @field_validator("ALLOWED_ORIGINS", mode="after")
    @classmethod
    def parse_allowed_origins(cls, v: str, info: ValidationInfo) -> List[str]:
        # Start with development defaults
        default_origins = [
            "http://localhost:5173",
            "http://localhost:5174",
            "http://127.0.0.1:5173",
            "http://127.0.0.1:5174",
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
    def parse_allowed_hosts(cls, v: str, info: ValidationInfo) -> List[str]:
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
            ]

    model_config = SettingsConfigDict(
        env_file=[".env.development", ".env.production"],
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )


settings = Settings()
