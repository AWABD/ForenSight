from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import engine, Base, migrate_database
from app.routers import auth, users, cases, evidence, timeline, audit, admin
from app.utils.logging_config import logger

# Initialize database tables on application start
logger.info("Initializing database schemas...")
try:
    Base.metadata.create_all(bind=engine)
    migrate_database(engine)
    logger.info("Database tables and migrations initialized successfully.")
except Exception as e:
    logger.critical(f"Failed to initialize database tables: {e}")

# Instantiate FastAPI application
app = FastAPI(
    title=settings.PROJECT_NAME,
    description="ForenSight AI-Powered Digital Evidence Investigation and Analysis Platform backend.",
    version="1.0.0"
)

# Set up CORS middleware to allow cross-origin requests from the React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, lock down to the React client domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API Routers under standard prefix /api/v1
app.include_router(auth.router, prefix="/api/v1")
app.include_router(users.router, prefix="/api/v1")
app.include_router(cases.router, prefix="/api/v1")
app.include_router(evidence.router, prefix="/api/v1")
app.include_router(timeline.router, prefix="/api/v1")
app.include_router(audit.router, prefix="/api/v1")
app.include_router(admin.router, prefix="/api/v1")

import os
from datetime import datetime
from sqlalchemy import text

@app.get("/")
def read_root():
    return {
        "status": "OPERATIONAL",
        "service": settings.PROJECT_NAME,
        "api_docs_path": "/docs"
    }

@app.get("/health")
@app.get("/api/v1/health")
def health_check():
    """
    Comprehensive health checkup endpoint for uptime monitors and cloud deployment platforms.
    Checks database connection and storage vault directory accessibility.
    """
    db_status = "HEALTHY"
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception as e:
        logger.error(f"Healthcheck DB ping failed: {e}")
        db_status = "UNHEALTHY"

    vault_path = str(settings.STORAGE_VAULT_PATH)
    vault_status = "HEALTHY" if os.path.exists(vault_path) else "MISSING"

    overall_status = "HEALTHY" if db_status == "HEALTHY" else "DEGRADED"

    return {
        "status": overall_status,
        "timestamp": datetime.utcnow().isoformat(),
        "database": db_status,
        "storage_vault": vault_status,
        "keep_alive": True
    }
