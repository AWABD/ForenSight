from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from app.config import settings

# In order to support running verification/tests out of the box even if local PG is down,
# we can support fallback to SQLite for local development, but default to settings.DATABASE_URL.
db_url = settings.DATABASE_URL

# For SQLite, use connect_args to allow multithreading access
connect_args = {}
if db_url.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_engine(
    db_url,
    connect_args=connect_args,
    pool_pre_ping=True  # Automatically checks if connection is alive before using it
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    """
    Database session dependency yield provider.
    Ensures that database session is closed after request lifetime.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
