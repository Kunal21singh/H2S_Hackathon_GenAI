from functools import lru_cache

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

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.api_cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
