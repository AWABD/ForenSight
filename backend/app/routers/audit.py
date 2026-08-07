from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.audit import AuditLedger
from app.models.user import User
from app.schemas.audit import AuditOut, LedgerVerificationReport
from app.services.auth_service import RoleChecker
from app.services.audit_service import AuditService

router = APIRouter(prefix="/cases/{case_id}/audit", tags=["Verifiable Chain of Custody Audit Ledger"])

@router.get("/", response_model=List[AuditOut])
def get_case_audit_trail(
    case_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["SysAdmin", "LeadInvestigator", "Analyst", "LegalAuditor"]))
):
    """
    Returns the complete, chronologically chained verification logs (Chain of Custody).
    Exposes cryptographic block hashes for evidentiary verification checks.
    """
    logs = db.query(AuditLedger).order_by(AuditLedger.record_timestamp.asc()).all()
    return logs

@router.get("/verify", response_model=LedgerVerificationReport)
def verify_case_ledger(
    case_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["SysAdmin", "LeadInvestigator", "Analyst"]))
):
    """
    Sequentially verifies the entire cryptographic ledger chain,
    checking block link integrity and identifying payload alterations.
    """
    report = AuditService.verify_ledger_chain(db)
    return report
