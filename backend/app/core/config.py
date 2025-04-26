# app/core/config.py
import secrets
from typing import Any, Dict, List, Optional, Union

from pydantic import AnyHttpUrl, validator
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = secrets.token_urlsafe(32)
    # 60 minutes * 24 hours * 8 days = 8 days
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 8
    
    # CORS allowed origins as a string
    BACKEND_CORS_ORIGINS: str = ""
    
    # Supabase settings
    SUPABASE_URL: str
    SUPABASE_KEY: str
    
    # Project settings
    PROJECT_NAME: str = "MeriTY Credits Tracker"

    # Method to get CORS origins as a list
    def get_cors_origins(self) -> List[str]:
        if not self.BACKEND_CORS_ORIGINS:
            return []
        
        try:
            # Remove any quotes and split by comma
            origins_str = self.BACKEND_CORS_ORIGINS.replace('"', '').replace("'", '')
            return [origin.strip() for origin in origins_str.split(",") if origin.strip()]
        except Exception as e:
            print(f"Error parsing CORS origins: {e}")
            return []

    class Config:
        case_sensitive = True
        env_file = ".env" if not os.getenv("VERCEL_ENV") else None

settings = Settings()
