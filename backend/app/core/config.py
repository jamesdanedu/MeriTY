import os
from functools import lru_cache
from typing import List, Optional, Union
from pydantic import EmailStr, PostgresDsn, SecretStr, HttpUrl, validator
from pydantic_settings import BaseSettings
from pydantic.fields import Field

class Settings(BaseSettings):
    # Application Settings
    PROJECT_NAME: str = "TY Credits Tracker"
    ENVIRONMENT: str = Field(default="development", env="ENV")
    DEBUG: bool = Field(default=False, env="DEBUG")
    API_V1_STR: str = "/api"
    
    # Security
    SECRET_KEY: SecretStr = os.getenv("SECRET_KEY", "")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
   
    # CORS Settings
    CORS_ORIGINS: str = os.getenv("CORS_ORIGINS", "")
    
   # List[str] = Field(
   #     default=[
   #         "http://localhost:3000",
   #         "http://localhost:8000",
   #         "http://localhost:8080",
   #         "http://127.0.0.1:5500",  # VS Code Live Server
   #         "https://merity.vercel.app",
   #     ],
   #     env="CORS_ORIGINS"
   # )
    
    # Server Settings
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = os.getenv("PORT", 8000)
    WORKERS_COUNT: int = os.getenv("WORKERS_COUNT", 1)
    
    # Database Settings
     # ... other settings remain the same

    # More robust Supabase configuration
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_KEY: str = os.getenv("SUPABASE_KEY", "")

    # Validate Supabase settings
    def __init__(self, **data):
        super().__init__(**data)
        if not self.SUPABASE_URL or not self.SUPABASE_KEY:
            print("WARNING: Supabase URL or Key is not configured!")

    class Config:
        case_sensitive = True
        env_file = ".env"
        env_file_encoding = "utf-8"


    DATABASE_URL: Optional[PostgresDsn] = Field(None, env="DATABASE_URL")
    
    
    # Email Settings
    SMTP_TLS: bool = os.getenv("SMTP_TLS", True)
    SMTP_HOST: str = os.getenv("SMTP_HOST", "")
    SMTP_PORT: int = os.getenv("SMTP_PORT", 587)
    SMTP_USER: str = os.getenv("SMTP_USER", "")
    SMTP_PASSWORD: SecretStr = os.getenv("SMTP_PASSWORD", "")
    FROM_EMAIL: EmailStr = os.getenv("FROM_EMAIL", "noreply@mail.com")
    FROM_NAME: str = os.getenv("FROM_NAME","MeriTY")
    
    # Monitoring and Logging
    SENTRY_DSN: Optional[HttpUrl] = Field(None, env="SENTRY_DSN")
    LOG_LEVEL: str = Field(default="INFO", env="LOG_LEVEL")
    LOG_FORMAT: str = Field(default="json", env="LOG_FORMAT")
    
    # Rate Limiting
    RATE_LIMIT_PER_SECOND: int = Field(default=10, env="RATE_LIMIT_PER_SECOND")
    
    # File Upload Settings
    MAX_UPLOAD_SIZE: int = Field(default=5_242_880, env="MAX_UPLOAD_SIZE")  # 5MB
    ALLOWED_UPLOAD_EXTENSIONS: List[str] = Field(
        default=[".csv", ".xlsx", ".xls"],
        env="ALLOWED_UPLOAD_EXTENSIONS"
    )
    
    # Cache Settings
    CACHE_TTL: int = Field(default=3600, env="CACHE_TTL")  # 1 hour
    
    # System Settings
    ACADEMIC_YEAR_START_MONTH: int = Field(default=9, env="ACADEMIC_YEAR_START_MONTH")  # September
    ACADEMIC_YEAR_END_MONTH: int = Field(default=6, env="ACADEMIC_YEAR_END_MONTH")  # June
    

    @validator("CORS_ORIGINS", pre=True)
    def parse_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        """Parse CORS origins from string or list"""
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",")]
        return v
    
    @validator("LOG_LEVEL")
    def validate_log_level(cls, v: str) -> str:
        """Validate log level"""
        allowed_levels = ["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]
        if v.upper() not in allowed_levels:
            raise ValueError(f"Log level must be one of {allowed_levels}")
        return v.upper()
    
    @validator("LOG_FORMAT")
    def validate_log_format(cls, v: str) -> str:
        """Validate log format"""
        allowed_formats = ["json", "text"]
        if v.lower() not in allowed_formats:
            raise ValueError(f"Log format must be one of {allowed_formats}")
        return v.lower()
    
    @validator("WORKERS_COUNT")
    def validate_workers_count(cls, v: int) -> int:
        """Validate workers count"""
        if v < 1:
            raise ValueError("Workers count must be at least 1")
        return v
    
    @validator("MAX_UPLOAD_SIZE")
    def validate_max_upload_size(cls, v: int) -> int:
        """Validate maximum upload size"""
        if v < 1:
            raise ValueError("Maximum upload size must be positive")
        if v > 20_971_520:  # 20MB
            raise ValueError("Maximum upload size cannot exceed 20MB")
        return v
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True

@lru_cache()
def get_settings() -> Settings:
    """
    Get application settings with caching
    
    The lru_cache decorator ensures we don't load the settings more than once
    during the application lifecycle.
    """
    return Settings()
