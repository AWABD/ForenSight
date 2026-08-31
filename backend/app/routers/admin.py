import os
from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.database import get_db
from app.config import settings
from app.models.case import Case
from app.models.evidence import EvidenceFile
from app.models.user import User
from app.schemas.user import UserOut
from app.services.auth_service import RoleChecker
from app.services.audit_service import AuditService
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

@router.get("/registrations", response_model=List[UserOut])
def list_pending_registrations(
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["SysAdmin"]))
):
    """
    Lists all operator registration requests that are pending SysAdmin approval.
    """
    pending = db.query(User).filter(User.is_approved == False).all()
    return pending

@router.post("/registrations/{user_id}/approve", response_model=UserOut)
def approve_registration(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["SysAdmin"]))
):
    """
    Approves a pending registration request, allowing the operator to log in.
    """
    user = db.query(User).filter(User.id == user_id, User.is_approved == False).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pending registration request not found."
        )
    
    import secrets
    from app.services.auth_service import get_password_hash
    
    # Generate unique username
    clean_name = "".join(c for c in user.full_name.lower() if c.isalnum())
    username = f"op_{clean_name[:15]}_{secrets.token_hex(2)}"
    
    # Generate plain text passphrase
    passphrase = f"fns-pass-{secrets.token_hex(3)}"
    
    # Save parameters
    user.username = username
    user.generated_passphrase = passphrase
    user.password_hash = get_password_hash(passphrase)
    user.is_approved = True
    
    db.commit()
    db.refresh(user)
    
    # Audit log
    AuditService.append_audit_event(
        db=db,
        action_type=f"REGISTRATION_APPROVED: {user.username} ({user.email or 'N/A'})",
        operator_id=current_user.id,
        associated_item_id=user.id
    )
    
    logger.info(f"SysAdmin approved registration request: {user.username} ({user.email or 'N/A'})")
    return user

@router.post("/registrations/{user_id}/reject")
def reject_registration(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["SysAdmin"]))
):
    """
    Rejects and deletes a pending registration request.
    """
    user = db.query(User).filter(User.id == user_id, User.is_approved == False).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pending registration request not found."
        )
    
    email = user.email
    db.delete(user)
    db.commit()
    
    # Audit log
    AuditService.append_audit_event(
        db=db,
        action_type=f"REGISTRATION_REJECTED: {email}",
        operator_id=current_user.id,
        associated_item_id=user_id
    )
    
    logger.info(f"SysAdmin rejected registration request: {email}")
    return {"detail": f"Registration request for {email} rejected and cleared."}
