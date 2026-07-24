from __future__ import annotations
from functools import lru_cache
import os
import secrets
from pathlib import Path

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_env: str = "local"
    api_cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"
    google_api_key: str | None = None
    google_cloud_project: str | None = None
    use_firestore: bool = False
    firestore_collection: str = "complaints"
    bigquery_dataset: str = "civicpulse"
    bigquery_table: str = "complaints"
    local_data_path: str = "./data/complaints.json"
    local_users_path: str = "./data/users.json"
    auth_secret: str = "change-this-before-demo"
    vertex_ai_search_project_id: str | None = None
    vertex_ai_search_location: str = "global"
    vertex_ai_search_datastore_id: str | None = None
    telegram_bot_token: str | None = None
    frontend_url: str = "http://localhost:5173"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    @model_validator(mode="after")
    def generate_or_load_secret(self) -> Settings:
        # Avoid generating persistent secret files during test suite execution
        if self.app_env == "test":
            self.auth_secret = "test-suite-secret-key-12345"
            return self

        if self.auth_secret == "change-this-before-demo":
            secret_file = Path("./data/.jwt_secret")
            if secret_file.exists():
                try:
                    self.auth_secret = secret_file.read_text(encoding="utf-8").strip()
                except Exception:
                    pass
            
            # If not loaded or empty, generate a new one
            if self.auth_secret == "change-this-before-demo" or not self.auth_secret:
                new_secret = secrets.token_hex(32)
                try:
                    secret_file.parent.mkdir(parents=True, exist_ok=True)
                    secret_file.write_text(new_secret, encoding="utf-8")
                    self.auth_secret = new_secret
                except Exception:
                    # Fallback to random in-memory secret if writing fails
                    self.auth_secret = new_secret
        return self

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.api_cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
