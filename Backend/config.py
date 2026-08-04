import os
from functools import lru_cache
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    azure_openai_api_key: str
    azure_openai_endpoint: str
    azure_openai_api_version: str
    azure_chat_deployment: str
    jwt_secret: str
    jwt_algorithm: str = "HS256"
    jwt_expiry_minutes: int = 60
    chroma_persist_dir: str = "./chroma_db"
    upload_dir: str = "./uploads"
    sqlite_db: str = "./app.db"
    admin_username: str = "admin"
    admin_password_hash: str  # bcrypt hash
    cors_origins: str = "http://localhost:3000"
    chunk_size: int = 800
    chunk_overlap: int = 100
    top_k_results: int = 4
    embedding_model: str = "text-embedding-3-small"  # confirmed working deployment

    class Config:
        env_file = ".env"


@lru_cache()
def get_settings() -> Settings:
    return Settings()