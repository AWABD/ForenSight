from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.case import Case
from app.models.evidence import EvidenceFile
from app.models.timeline import TimelineEvent
from app.models.user import User
from app.schemas.evidence import EvidenceOut
from app.services.auth_service import get_current_user, RoleChecker
from app.services.file_service import FileService
from app.services.audit_service import AuditService
from app.utils.logging_config import logger

router = APIRouter(prefix="/cases/{case_id}/evidence", tags=["Evidence Management"])

@router.post("/upload", response_model=EvidenceOut, status_code=status.HTTP_202_ACCEPTED)
def upload_evidence(
    case_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["SysAdmin", "LeadInvestigator"]))
):
    """
    Ingests a raw digital evidence file into the case vault.
    Calculates dual cryptographic hashes (SHA-256 and SHA3-256) concurrently.
    Extracts forensic metadata (e.g., EXIF for images) and stubs anomalies based on tags.
    Creates timeline logs and appends blocks to Chain of Custody ledger.
    """
    # Verify case exists
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        logger.warning(f"Upload error: target case UUID '{case_id}' does not exist")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found")

    try:
        # Save upload to local secure vault and compute dual hashes
        target_path, size_bytes, sha256_hex, sha3_hex = FileService.save_and_hash_file(case_id, file)
    except Exception as e:
        logger.error(f"In-stream upload failure for file '{file.filename}': {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to save and hash uploaded evidence file"
        )

    # Check if this exact file (same SHA256) is already uploaded to this case
    duplicate = db.query(EvidenceFile).filter(
        EvidenceFile.case_id == case_id,
        EvidenceFile.sha256_hash == sha256_hex
    ).first()
    
    if duplicate:
        logger.warning(f"Duplicate upload skipped: file with SHA256 '{sha256_hex}' already exists in case")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Duplicate file error: A file with identical SHA256 hash already exists in this case."
        )

    # Perform metadata and anomaly parsing stubs
    forensic_payload = FileService.extract_forensic_metadata(file.filename, target_path)

    # Create Evidence File Database Record
    new_evidence = EvidenceFile(
        case_id=case_id,
        file_name=file.filename,
        original_path=file.filename, # logical path fallback
        file_size_bytes=size_bytes,
        file_type=file.content_type or "application/octet-stream",
        sha256_hash=sha256_hex,
        sha3_hash=sha3_hex,
        storage_vault_key=target_path,
        anomalies=forensic_payload["anomalies"],
        exif=forensic_payload["exif"]
    )
    
    db.add(new_evidence)
    db.commit()
    db.refresh(new_evidence)

    # Add dynamic Timeline Event representing file ingestion
    new_timeline_event = TimelineEvent(
        case_id=case_id,
        evidence_file_id=new_evidence.id,
        timestamp_source="System Ingestion Engine",
        event_type="FILE_INGEST",
        description=f"Ingested {file.filename} into secure storage vault. Baseline hashes computed successfully.",
        severity="INFO"
    )
    db.add(new_timeline_event)
    db.commit()

    # Append transaction block to cryptographic Chain of Custody ledger
    AuditService.append_audit_event(
        db=db,
        action_type=f"FILE_INGESTED: {file.filename} (SHA256: {sha256_hex[:12]}...)",
        operator_id=current_user.id,
        associated_item_id=new_evidence.id
    )

    logger.info(f"Evidence file '{file.filename}' processed and linked to case '{case.case_number}'")
    return new_evidence

@router.get("/", response_model=List[EvidenceOut])
def list_evidence(
    case_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["SysAdmin", "LeadInvestigator", "Analyst", "LegalAuditor"]))
):
    """Lists all evidence files linked to a specific case."""
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found")
        
    return db.query(EvidenceFile).filter(EvidenceFile.case_id == case_id).all()

@router.get("/{evidence_id}", response_model=EvidenceOut)
def get_evidence(
    case_id: str,
    evidence_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["SysAdmin", "LeadInvestigator", "Analyst", "LegalAuditor"]))
):
    """Fetches details of a specific evidence file by UUID."""
    evidence = db.query(EvidenceFile).filter(
        EvidenceFile.case_id == case_id,
        EvidenceFile.id == evidence_id
    ).first()
    
    if not evidence:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evidence file not found")
        
    return evidence
