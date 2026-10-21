"""
TaxSathi AI — Application Configuration
All settings loaded from environment variables via Pydantic Settings.

SECURITY:
  In production (ENVIRONMENT=production) the app refuses to start if:
    - SECRET_KEY / JWT_SECRET_KEY are missing or match a known insecure default.
    - ADMIN_PASSWORD is unset (the hash is computed at startup, never stored as a default).
"""

import sys
from pydantic_settings import BaseSettings
from pydantic import Field, model_validator
from typing import Optional


# ── Known-insecure defaults that MUST be rejected in production ──────────
_INSECURE_SECRETS = frozenset({
    "",
    "taxsathi-dev-secret-key-change-in-production",
    "jwt-secret-key-change-in-production",
    "change-me-to-a-very-long-random-secret-string-32-chars",
})


class Settings(BaseSettings):
    """Application settings loaded from .env file."""

    # App
    APP_NAME: str = "TaxSathi AI"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    ENVIRONMENT: str = "development"  # development | staging | production
    SECRET_KEY: str = ""  # REQUIRED in production

    # Database
    DATABASE_URL: str = "sqlite+aiosqlite:///./taxsathi.db"
    DB_ECHO: bool = False

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # JWT
    JWT_SECRET_KEY: str = ""  # REQUIRED in production
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Admin — plaintext password from env, hashed at runtime.
    # The old hardcoded bcrypt hash has been removed.
    ADMIN_EMAIL: str = "admin@taxsathi.ai"
    ADMIN_PASSWORD: str = ""  # REQUIRED in production; hashed at startup

    # LLM — Google Gemini (primary)
    GEMINI_API_KEY: Optional[str] = None
    GEMINI_MODEL: str = "gemini-2.0-flash"

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
    RAG_REFUSAL_THRESHOLD: float = 0.25
    RAG_RETRIEVE_TOP_K: int = 20
    RAG_RERANK_TOP_K: int = 5
    BM25_INDEX_PATH: str = "./data/bm25_index.json"

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

    # ── Computed at startup ──────────────────────────────────────────
    _admin_password_hash: str = ""

    @property
    def ADMIN_PASSWORD_HASH(self) -> str:
        """Return the bcrypt hash of ADMIN_PASSWORD (computed once)."""
        return self._admin_password_hash

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "case_sensitive": True,
        "extra": "ignore",
    }

    @model_validator(mode="after")
    def _validate_security(self) -> "Settings":
        """Block startup if critical secrets use insecure defaults in production."""
        is_prod = self.ENVIRONMENT in ("production", "staging")

        errors: list[str] = []

        if is_prod:
            if self.SECRET_KEY in _INSECURE_SECRETS:
                errors.append(
                    "SECRET_KEY is missing or matches a known insecure default. "
                    "Generate one: python -c \"import secrets; print(secrets.token_urlsafe(64))\""
                )
            if self.JWT_SECRET_KEY in _INSECURE_SECRETS:
                errors.append(
                    "JWT_SECRET_KEY is missing or matches a known insecure default. "
                    "Generate one: python -c \"import secrets; print(secrets.token_urlsafe(64))\""
                )
            if not self.ADMIN_PASSWORD:
                errors.append(
                    "ADMIN_PASSWORD must be set in the environment for production."
                )

        if errors:
            msg = (
                "\n\n⛔  SECURITY: Refusing to start in "
                f"{self.ENVIRONMENT} mode:\n  • "
                + "\n  • ".join(errors)
                + "\n"
            )
            print(msg, file=sys.stderr)
            raise SystemExit(1)

        # ── Dev-mode fallbacks so local development still works ──────
        if not is_prod:
            if self.SECRET_KEY in _INSECURE_SECRETS:
                # Use a reproducible-but-not-production key for dev only
                object.__setattr__(
                    self, "SECRET_KEY",
                    "dev-only-secret-do-not-use-in-production"
                )
            if self.JWT_SECRET_KEY in _INSECURE_SECRETS:
                object.__setattr__(
                    self, "JWT_SECRET_KEY",
                    "dev-only-jwt-secret-do-not-use-in-production"
                )

        # ── Hash ADMIN_PASSWORD at startup ──────────────────────────
        if self.ADMIN_PASSWORD:
            import bcrypt
            hashed = bcrypt.hashpw(
                self.ADMIN_PASSWORD.encode("utf-8"),
                bcrypt.gensalt(),
            ).decode("utf-8")
            object.__setattr__(self, "_admin_password_hash", hashed)

        return self


settings = Settings()
