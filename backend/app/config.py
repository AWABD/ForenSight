import os
from pathlib import Path
from dotenv import load_dotenv

# Locate and load the .env file
base_dir = Path(__file__).resolve().parent.parent
env_path = base_dir / ".env"
load_dotenv(dotenv_path=env_path)

class Settings:
    PROJECT_NAME: str = "ForenSight Backend API"
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
    
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/forensight")
    
    # Security
    JWT_SECRET: str = os.getenv("JWT_SECRET", "supersecretjwtkeyforensight2026jwtsecretkeyhere")
    JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "480"))
    
    # File Storage
    STORAGE_VAULT_PATH: Path = Path(os.getenv("STORAGE_VAULT_PATH", "./storage_vault")).resolve()

    # AI & Cloud OCR API Keys
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    ASSEMBLYAI_API_KEY: str = os.getenv("ASSEMBLYAI_API_KEY", "")
    GOOGLE_CLOUD_VISION_API_KEY: str = os.getenv("GOOGLE_CLOUD_VISION_API_KEY", "")

settings = Settings()

# Ensure the storage vault directory exists
settings.STORAGE_VAULT_PATH.mkdir(parents=True, exist_ok=True)
