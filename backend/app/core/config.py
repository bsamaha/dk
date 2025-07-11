from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    """Application settings."""
    
    # API Settings
    API_V1_STR: str = "/api"
    PROJECT_NAME: str = "Fantasy Draft Analytics API"
    
    # CORS Settings
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
        env_file = ".env"


settings = Settings()
