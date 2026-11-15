import os
from pathlib import Path
from dotenv import load_dotenv
from pydantic_settings import BaseSettings, SettingsConfigDict

# Automatically locate and load .env from backend or root directory
env_path = Path(__file__).resolve().parent.parent.parent / ".env"
if not env_path.exists():
    env_path = Path(__file__).resolve().parent.parent.parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

class Settings(BaseSettings):
    PROJECT_NAME: str = "Smart Campus Service Management System"
    API_V1_STR: str = "/api"
    SECRET_KEY: str = "super-secret-smart-campus-jwt-key-2026-audit-hardened"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 # 24 hours
    
    # MongoDB Atlas Configuration (Primary Database)
    MONGODB_URI: str = "mongodb://localhost:27017"
    MONGODB_DB_NAME: str = "smartcampus_db"

    # Legacy SQL Database URL (Retained for migration scripts & backup)
    DATABASE_URL: str = "sqlite:///./smart_campus.db"
    
    # CORS Origins Configuration
    CORS_ORIGINS: str = "*"
    
    # SLA Target Hours Configuration (PRD Section 11.2)
    SLA_HOURS_HIGH: int = 24
    SLA_HOURS_MEDIUM: int = 72
    SLA_HOURS_LOW: int = 120

    # Salesforce Service Cloud Configuration (PRD v2.1)
    SALESFORCE_ENABLED: bool = True
    SALESFORCE_MOCK_MODE: bool = True
    SALESFORCE_AUTH_TYPE: str = "client_credentials"
    SALESFORCE_LOGIN_URL: str = "https://login.salesforce.com"
    SALESFORCE_INSTANCE_URL: str = ""
    SALESFORCE_CLIENT_ID: str = ""
    SALESFORCE_CLIENT_SECRET: str = ""
    SALESFORCE_USERNAME: str = ""
    SALESFORCE_PASSWORD: str = ""
    SALESFORCE_SECURITY_TOKEN: str = ""

    model_config = SettingsConfigDict(
        env_file=(".env", "backend/.env", "../.env"),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore"
    )

settings = Settings()
