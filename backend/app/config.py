import os
from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    PROJECT_NAME: str = "WindScope — Day-Ahead Intelligence"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"
    HOST: str = "0.0.0.0"
    PORT: int = int(os.getenv("PORT", "8000"))
    
    # Elexon BMRS API
    ELEXON_API_BASE_URL: str = os.getenv("ELEXON_API_BASE_URL", "https://data.elexon.co.uk/bmrs/api/v1")
    HTTP_TIMEOUT_SECONDS: float = 30.0
    MAX_RETRIES: int = 3
    RETRY_BACKOFF_FACTOR: float = 1.5
    
    # Data Caching
    CACHE_DIR: str = os.getenv("CACHE_DIR", os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data_cache"))
    CACHE_TTL_SECONDS: int = int(os.getenv("CACHE_TTL_SECONDS", "86400"))  # 24 hours
    
    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
        "*"
    ]
    
    # Analytical Parameters
    MIN_MAPE_DENOMINATOR_MW: float = 100.0  # MW threshold to avoid division by zero or extreme MAPE distortion
    TARGET_YEAR: int = 2026
    TARGET_MONTH: int = 1
    
    model_config = {
        "case_sensitive": True,
        "env_file": ".env",
        "extra": "ignore"
    }

settings = Settings()
