from pathlib import Path
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = "sqlite:///./data/grocery.db"
    timezone: str = "Asia/Kolkata"
    frontend_url: str = "http://localhost:3000"
    secure_cookies: bool = False
    gemini_api_key: str = ""
    gemini_model: str = "gemini-3.5-flash-lite"
    usda_api_key: str = ""
    ai_daily_limit: int = 20

    @field_validator("database_url")
    @classmethod
    def local_database_only(cls, value):
        if not value.startswith("sqlite:///"):
            raise ValueError("This app stores data locally. Use a SQLite file URL.")
        return value

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
if settings.database_url.startswith("sqlite:///"):
    Path(settings.database_url.removeprefix("sqlite:///")).parent.mkdir(
        parents=True, exist_ok=True
    )
