from enum import Enum
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Provider(str, Enum):
    OLLAMA = "ollama"
    CLAUDE = "claude"


class Settings(BaseSettings):
    provider: Provider = Field(default=Provider.OLLAMA)
    ollama_model: str = "llama3.2:3b"
    ollama_base_url: str = "http://localhost:11434"
    anthropic_api_key: str | None = None
    anthropic_model: str = "claude-sonnet-4-6-20250514"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_ignore_empty=True,
        extra="ignore",
    )


settings = Settings()
