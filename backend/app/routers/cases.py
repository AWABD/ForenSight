import random
from typing import List
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.case import Case
from app.models.user import User
from app.schemas.case import CaseCreate, CaseOut, CaseUpdate
from app.services.auth_service import get_current_user, RoleChecker
from app.services.audit_service import AuditService
from app.utils.logging_config import logger

router = APIRouter(prefix="/cases", tags=["Case Management"])

def calculate_case_stats(case: Case) -> dict:
    """Helper to compute evidence count and anomaly rate dynamically."""
    evidence_count = len(case.evidence_files)
    if evidence_count == 0:
        anomaly_rate = "0%"
    else:
        files_with_anomalies = sum(1 for file in case.evidence_files if file.anomalies and len(file.anomalies) > 0)
        # Mock some anomaly variance if there are anomalies
        total_anomalies = sum(len(file.anomalies) for file in case.evidence_files if file.anomalies)
        if total_anomalies > 0:
            anomaly_rate = f"{min(100, int((files_with_anomalies / evidence_count) * 100))}%"
        else:
            anomaly_rate = "0%"
            
    return {
        "evidence_count": evidence_count,
        "anomaly_rate": anomaly_rate
    }

@router.get("/", response_model=List[CaseOut])
def list_cases(
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["SysAdmin", "LeadInvestigator", "Analyst", "LegalAuditor"]))
):
    """
    Lists all forensic cases currently active or archived in the platform database.
    Calculates evidence counts and anomaly scores dynamically.
    """
    cases = db.query(Case).all()
    results = []
    for c in cases:
        stats = calculate_case_stats(c)
        # Create CaseOut representation mapping DB model properties
        case_out = CaseOut(
            id=c.id,
            case_number=c.case_number,
            title=c.title,
            description=c.description,
            status=c.status,
            reference_number=c.reference_number,
            assigned_to_id=c.assigned_to_id,
            created_at=c.created_at,
            evidence_count=stats["evidence_count"],
            anomaly_rate=stats["anomaly_rate"]
        )
        results.append(case_out)
    return results

@router.post("/", response_model=CaseOut, status_code=status.HTTP_201_CREATED)
def create_case(
    case_in: CaseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["SysAdmin", "LeadInvestigator"]))
):
    """
    Creates a new digital forensic case (Requires LeadInvestigator or SysAdmin roles).
    Generates case numbers and writes initial block to Chain of Custody ledger.
    """
    # Auto generate case number: e.g. FS-2026-904
    random_num = random.randint(100, 999)
    case_number = f"FS-2026-{random_num}"
    
    # Verify uniqueness
    while db.query(Case).filter(Case.case_number == case_number).first() is not None:
        random_num = random.randint(100, 999)
        case_number = f"FS-2026-{random_num}"
        
    # Auto generate reference number if missing: e.g. REF-83893-IND
    ref_num = case_in.reference_number
    if not ref_num:
        random_ref = random.randint(10000, 99999)
        ref_num = f"REF-{random_ref}-IND"
        
    assigned_id = case_in.assigned_to_id or current_user.id
    
    new_case = Case(
        case_number=case_number,
        title=case_in.title,
        description=case_in.description,
        status="ACTIVE",
        reference_number=ref_num,
        assigned_to_id=assigned_id
    )
    
    db.add(new_case)
    db.commit()
    db.refresh(new_case)
    
    # Audit log block generation
    AuditService.append_audit_event(
        db=db,
        action_type=f"CASE_CREATED: {case_number}",
        operator_id=current_user.id,
        associated_item_id=new_case.id
    )
    
    logger.info(f"Forensic case created successfully. Case Number: {case_number}, Assigned To User ID: {assigned_id}")
    return CaseOut(
        id=new_case.id,
        case_number=new_case.case_number,
        title=new_case.title,
        description=new_case.description,
        status=new_case.status,
        reference_number=new_case.reference_number,
        assigned_to_id=new_case.assigned_to_id,
        created_at=new_case.created_at,
        evidence_count=0,
        anomaly_rate="0%"
    )

@router.get("/{case_id}", response_model=CaseOut)
def get_case(
    case_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieves specific case by UUID."""
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found")
        
    stats = calculate_case_stats(case)
    return CaseOut(
        id=case.id,
        case_number=case.case_number,
        title=case.title,
        description=case.description,
        status=case.status,
        reference_number=case.reference_number,
        assigned_to_id=case.assigned_to_id,
        created_at=case.created_at,
        evidence_count=stats["evidence_count"],
        anomaly_rate=stats["anomaly_rate"]
    )

@router.put("/{case_id}", response_model=CaseOut)
def update_case(
    case_id: str,
    case_in: CaseUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["SysAdmin", "LeadInvestigator"]))
):
    """Updates case properties (Requires level >= 3)."""
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found")
        
    # Apply updates
    if case_in.title is not None:
        case.title = case_in.title
    if case_in.description is not None:
        case.description = case_in.description
    if case_in.status is not None:
        case.status = case_in.status
    if case_in.reference_number is not None:
        case.reference_number = case_in.reference_number
    if case_in.assigned_to_id is not None:
        case.assigned_to_id = case_in.assigned_to_id
        
    db.commit()
    db.refresh(case)
    
    # Audit log block entry
    AuditService.append_audit_event(
        db=db,
        action_type=f"CASE_UPDATED: {case.case_number} (status={case.status})",
        operator_id=current_user.id,
        associated_item_id=case.id
    )
    
    logger.info(f"Forensic case updated. Case Number: {case.case_number}, Updated By: {current_user.email}")
    stats = calculate_case_stats(case)
    return CaseOut(
        id=case.id,
        case_number=case.case_number,
        title=case.title,
        description=case.description,
        status=case.status,
        reference_number=case.reference_number,
        assigned_to_id=case.assigned_to_id,
        created_at=case.created_at,
        evidence_count=stats["evidence_count"],
        anomaly_rate=stats["anomaly_rate"]
    )
