from typing import List, Union
from pydantic import AnyHttpUrl, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # App Information
    APP_NAME: str = "ShopSphere"
    APP_VERSION: str = "1.0.0"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    API_V1_PREFIX: str = "/api/v1"

    # Server Ports
    BACKEND_PORT: int = 8000
    FRONTEND_PORT: int = 5173

    # Security & Tokens
    SECRET_KEY: str = "shopsphere_super_secure_development_secret_key_2026_change_in_prod"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Database
    DATABASE_URL: str = "sqlite:///./shopsphere.db"
    POSTGRES_USER: str = "shopsphere_user"
    POSTGRES_PASSWORD: str = "shopsphere_password"
    POSTGRES_DB: str = "shopsphere_db"
    POSTGRES_HOST: str = "localhost"
    POSTGRES_PORT: int = 5432

    # CORS
    CORS_ORIGINS: Union[List[str], str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
    ]

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, list):
            return v
        return ["http://localhost:5173", "http://127.0.0.1:5173"]

    # Payment Gateway
    PAYMENT_PROVIDER: str = "MOCK"
    STRIPE_PUBLIC_KEY: str = "pk_test_sample"
    STRIPE_SECRET_KEY: str = "sk_test_sample"
    STRIPE_WEBHOOK_SECRET: str = "whsec_sample"
    RAZORPAY_KEY_ID: str = "rzp_test_sample"
    RAZORPAY_KEY_SECRET: str = "sample_secret"

    # Media Storage
    STORAGE_PROVIDER: str = "local"
    CLOUDINARY_CLOUD_NAME: str = ""
    CLOUDINARY_API_KEY: str = ""
    CLOUDINARY_API_SECRET: str = ""

    # AI Service Settings
    AI_MODEL_PROVIDER: str = "heuristic"
    OPENAI_API_KEY: str = ""
    GEMINI_API_KEY: str = ""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )


settings = Settings()
