from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """App configuration, read from environment / .env."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Supabase
    supabase_url: str = "http://127.0.0.1:54321"
    supabase_service_key: str = ""  # service_role key — backend writes bypass RLS
    supabase_jwt_secret: str = ""  # used to verify user JWTs on protected routes

    # LLM (provider-agnostic; Groq free tier by default — OpenAI-compatible)
    llm_base_url: str = "https://api.groq.com/openai/v1"
    llm_api_key: str = ""
    llm_model: str = "llama-3.3-70b-versatile"

    # External data sources
    odds_api_key: str = ""
    api_football_key: str = ""

    # Misc
    environment: str = "development"


@lru_cache
def get_settings() -> Settings:
    return Settings()
