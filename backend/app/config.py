"""
TaxSathi AI — Application Configuration
All settings loaded from environment variables via Pydantic Settings.
"""

from pydantic_settings import BaseSettings
from pydantic import Field
from typing import Optional
import os


class Settings(BaseSettings):
    """Application settings loaded from .env file."""

    # App
    APP_NAME: str = "TaxSathi AI"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    ENVIRONMENT: str = "development"  # development | staging | production
    SECRET_KEY: str = "taxsathi-dev-secret-key-change-in-production"

    # Database
    DATABASE_URL: str = "sqlite+aiosqlite:///./taxsathi.db"
    DB_ECHO: bool = False

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # JWT
    JWT_SECRET_KEY: str = "jwt-secret-key-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Admin (Single super admin — no registration)
    ADMIN_EMAIL: str = "admin@taxsathi.ai"
    ADMIN_PASSWORD_HASH: str = "$2b$12$LJ3m4ys3Lk0TSwHjWz1eYOQHiGmVNGboJMfDf1Ec9hGMWY/jTvniu"  # admin123

    # LLM — Google Gemini (primary)
    GEMINI_API_KEY: Optional[str] = None

    # LLM — OpenAI (fallback)
    OPENAI_API_KEY: Optional[str] = None

    # Embeddings
    EMBEDDING_MODEL: str = "all-MiniLM-L6-v2"
    EMBEDDING_DIMENSION: int = 384

    # Vector Store
    VECTOR_STORE_TYPE: str = "chromadb"  # chromadb | pinecone
    CHROMADB_PERSIST_DIR: str = "./data/chromadb"
    PINECONE_API_KEY: Optional[str] = None
    PINECONE_INDEX_NAME: str = "taxsathi"
    PINECONE_ENVIRONMENT: str = "us-east-1"

    # Cohere Reranker
    COHERE_API_KEY: Optional[str] = None

    # AWS S3
    AWS_ACCESS_KEY_ID: Optional[str] = None
    AWS_SECRET_ACCESS_KEY: Optional[str] = None
    AWS_S3_BUCKET: str = "taxsathi-documents"
    AWS_REGION: str = "ap-south-1"

    # SendGrid
    SENDGRID_API_KEY: Optional[str] = None
    SENDGRID_FROM_EMAIL: str = "noreply@taxsathi.ai"

    # Firebase (FCM)
    FCM_SERVER_KEY: Optional[str] = None

    # Rate Limiting
    RATE_LIMIT_PER_MINUTE: int = 30

    # File Upload
    MAX_UPLOAD_SIZE_MB: int = 50
    UPLOAD_DIR: str = "./data/uploads"

    # CORS
    CORS_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "https://app.taxsathi.ai",
    ]

    # Maintenance Mode
    MAINTENANCE_MODE: bool = False

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "case_sensitive": True,
    }


settings = Settings()
