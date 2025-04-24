from functools import lru_cache
from typing import List, Optional, Union
from pydantic import (
    BaseSettings,
    EmailStr,
    PostgresDsn,
    RedisDsn,
    SecretStr,
    HttpUrl,
    validator,
    Field
)

class Settings(BaseSettings):
    # Application Settings
    PROJECT_NAME: str = "TY Credits Tracker"
    ENVIRONMENT: str = Field(default="development", env="ENV")
    DEBUG: bool = Field(default=False, env="DEBUG")
    API_V1_STR: str = "/api"
    
    # Security
    SECRET_KEY: SecretStr = Field(..., env="SECRET_KEY")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    # CORS Settings
    CORS_ORIGINS: List[str] = Field(
        default=[
            "http://localhost:3000",
            "http://localhost:8000",
            "http://localhost:8080",
            "http://127.0.0.1:5500",  # VS Code Live Server
            "https://merity.vercel.app",
        ],
        env="CORS_ORIGINS"
    )
    
    # Server Settings
    HOST: str = Field(default="0.0.0.0", env="HOST")
    PORT: int = Field(default=8000, env="PORT")
    WORKERS_COUNT: int = Field(default=1, env="WORKERS_COUNT")
    
    # Database Settings
    SUPABASE_URL: HttpUrl = Field(..., env="SUPABASE_URL")
    SUPABASE_KEY: SecretStr = Field(..., env="SUPABASE_KEY")
    DATABASE_URL: Optional[PostgresDsn] = Field(None, env="DATABASE_URL")
    
    # Redis Settings
    REDIS_URL: RedisDsn = Field(..., env="REDIS_URL")
    REDIS_HOST: str = Field(default="localhost", env="REDIS_HOST")
    REDIS_PORT: int = Field(default=6379, env="REDIS_PORT")
    REDIS_PASSWORD: Optional[SecretStr] = Field(None, env="REDIS_PASSWORD")
    REDIS_DB: int = Field(default=0, env="REDIS_DB")
    
    # Email Settings
    SMTP_TLS: bool = Field(default=True, env="SMTP_TLS")
    SMTP_HOST: str = Field(..., env="SMTP_HOST")
    SMTP_PORT: int = Field(..., env="SMTP_PORT")
    SMTP_USER: str = Field(..., env="SMTP_USER")
    SMTP_PASSWORD: SecretStr = Field(..., env="SMTP_PASSWORD")
    FROM_EMAIL: EmailStr = Field(..., env="FROM_EMAIL")
    FROM_NAME: str = Field(default="MeriTY Credit Tracking System", env="FROM_NAME")
    
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
    
    @validator("REDIS_URL", pre=True)
    def assemble_redis_url(cls, v: Optional[str], values: dict) -> str:
        """Construct Redis URL from components if not provided"""
        if v:
            return v
            
        password = (
            f":{values.get('REDIS_PASSWORD').get_secret_value()}@"
            if values.get("REDIS_PASSWORD")
            else ""
        )
        
        return (
            f"redis://{password}"
            f"{values.get('REDIS_HOST', 'localhost')}:"
            f"{values.get('REDIS_PORT', 6379)}/"
            f"{values.get('REDIS_DB', 0)}"
        )
    
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