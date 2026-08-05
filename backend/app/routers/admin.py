import os
from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.database import get_db
from app.config import settings
from app.models.case import Case
from app.models.evidence import EvidenceFile
from app.models.user import User
from app.services.auth_service import RoleChecker
from app.utils.logging_config import logger

router = APIRouter(prefix="/admin", tags=["System Administration"])

def get_dir_size(path: str) -> int:
    """Calculates disk usage of local storage vault directory."""
    total = 0
    if not os.path.exists(path):
        return 0
    try:
        for entry in os.scandir(path):
            if entry.is_file():
                total += entry.stat().st_size
            elif entry.is_dir():
                total += get_dir_size(entry.path)
    except Exception as e:
        logger.error(f"Error calculating storage vault size: {e}")
    return total

@router.get("/metrics")
def get_system_metrics(
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["SysAdmin"]))
):
    """
    Returns high-level system hardware, database, and vault state parameters.
    Restricted exclusively to Level 4 (SysAdmin) operators.
    """
    # Count database items
    total_cases = db.query(Case).count()
    total_evidence = db.query(EvidenceFile).count()
    
    # Calculate storage vault size
    vault_path = str(settings.STORAGE_VAULT_PATH)
    vault_size_bytes = get_dir_size(vault_path)
    
    # Check db ping response
    db_status = "HEALTHY"
    try:
        db.execute(text("SELECT 1"))
    except Exception as e:
        logger.error(f"Database healthcheck ping failure: {e}")
        db_status = "DEGRADED"

    return {
        "status": "OPERATIONAL",
        "database": db_status,
        "total_cases_count": total_cases,
        "total_evidence_files_count": total_evidence,
        "storage_vault_size_bytes": vault_size_bytes,
        "storage_vault_path": vault_path,
        "hardware_acceleration": "DISABLED (AI Offline)",
        "active_background_threads": 2,
        "cpu_count": os.cpu_count() or 4
    }
