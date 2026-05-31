from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Naptech Factory OS API"
    environment: str = "development"
    database_url: str = "sqlite:///./naptech_factory_os.db"
    supabase_database_url: str = ""
    jwt_secret_key: str = "change-this-secret-before-production"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 1440
    backend_cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000,http://localhost:3001,http://127.0.0.1:3001"
    inventory_low_threshold: int = 1000
    google_client_id: str = ""
    allowed_login_domain: str = "naptech.in"
    allowed_login_emails: str = ""

    model_config = SettingsConfigDict(
        env_file=str(Path(__file__).resolve().parents[2] / ".env"),
        env_file_encoding="utf-8",
    )

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.backend_cors_origins.split(",") if origin.strip()]

    @property
    def login_allowlist_emails(self) -> set[str]:
        return {email.strip().lower() for email in self.allowed_login_emails.split(",") if email.strip()}


settings = Settings()
