from sqlalchemy import create_engine, text
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

def migrate_database(db_engine):
    """
    Checks the users table schema and dynamically appends 'is_approved' and 'secret_code'
    columns to prevent PostgreSQL startup crashes on existing schemas.
    """
    with db_engine.begin() as conn:
        is_postgres = "postgresql" in str(db_engine.url)
        if is_postgres:
            res = conn.execute(text(
                "SELECT column_name FROM information_schema.columns "
                "WHERE table_name='users' AND column_name='is_approved'"
            )).fetchone()
            if not res:
                conn.execute(text("ALTER TABLE users ADD COLUMN is_approved BOOLEAN DEFAULT FALSE NOT NULL"))
                conn.execute(text("ALTER TABLE users ADD COLUMN secret_code VARCHAR(50) UNIQUE"))
                # Approve existing seeded users so they can still log in immediately
                conn.execute(text("UPDATE users SET is_approved = TRUE"))
        else:
            # SQLite fallback
            res = conn.execute(text("PRAGMA table_info(users)")).fetchall()
            columns = [r[1] for r in res]
            if "is_approved" not in columns:
                conn.execute(text("ALTER TABLE users ADD COLUMN is_approved BOOLEAN DEFAULT FALSE NOT NULL"))
                conn.execute(text("ALTER TABLE users ADD COLUMN secret_code VARCHAR(50) UNIQUE"))
                conn.execute(text("UPDATE users SET is_approved = TRUE"))

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
