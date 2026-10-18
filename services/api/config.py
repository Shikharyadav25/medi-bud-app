import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List, Optional


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )
    APP_NAME: str = "Medi Bud AI Health Companion API"
    ENVIRONMENT: str = "development"
    PORT: int = 8000

    # Supabase credentials (server-side only)
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "https://demo.supabase.co")
    SUPABASE_ANON_KEY: str = os.getenv("SUPABASE_ANON_KEY", "demo_anon_key")
    SUPABASE_SERVICE_ROLE_KEY: str = ""
    SUPABASE_JWT_SECRET: str = ""
    SUPABASE_JWT_AUDIENCE: str = os.getenv("SUPABASE_JWT_AUDIENCE", "authenticated")

    # Optional Gemini Provider (Graceful degradation when None)
    GEMINI_API_KEY: Optional[str] = os.getenv("GEMINI_API_KEY", None)
    GEMINI_MODEL: str = "gemini-2.5-flash"
    ENABLE_DEMO_AUTH: bool = False
    DATABASE_URL: str = "sqlite:///./medibud.sqlite3"
    DATA_ENCRYPTION_KEY: str = ""
    RATE_LIMIT_PER_MINUTE: int = 60
    AI_RATE_LIMIT_PER_MINUTE: int = 10
    MAX_REPORTS_PER_USER: int = 100
    ENABLE_LOCAL_EMBEDDINGS: bool = False

    # CORS & Limits
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:8081",
        "http://localhost:19006",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        "http://127.0.0.1:8081",
    ]
    MAX_UPLOAD_SIZE_BYTES: int = 10 * 1024 * 1024  # 10 MB limit
    MAX_PDF_PAGES: int = 20

    # Embedding & AI
    EMBEDDING_MODEL_NAME: str = "sentence-transformers/all-MiniLM-L6-v2"
    CLARIFICATION_THRESHOLD: float = 0.35


settings = Settings()
