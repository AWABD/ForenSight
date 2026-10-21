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
from app.services.rate_limiter import RateLimiterDependency
from app.utils.logging_config import logger
from app.models.ocr import OCRText
from app.schemas.ocr import OCRResponse, OCRTextOut
from app.services.ocr_service import OCRService
from app.services.case_service import CaseService

router = APIRouter(prefix="/cases/{case_id}/evidence", tags=["Evidence Management"])

# Rate limit for evidence upload
upload_rate_limiter = RateLimiterDependency(limit=10, window_seconds=60, route_name="upload_evidence")

@router.post("/upload", response_model=EvidenceOut, status_code=status.HTTP_202_ACCEPTED, dependencies=[Depends(upload_rate_limiter)])
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
    # Enforce file size limit of 100MB
    MAX_FILE_SIZE = 100 * 1024 * 1024
    if file.size and file.size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File exceeds maximum size limit of 100MB."
        )

    # Verify and resolve case (supports UUID, display alias 'c1', or case_number)
    case = CaseService.resolve_case(db, case_id)
    resolved_case_id = case.id

    try:
        # Save upload to local secure vault and compute dual hashes
        target_path, size_bytes, sha256_hex, sha3_hex = FileService.save_and_hash_file(resolved_case_id, file)
    except ValueError as val_err:
        logger.warning(f"File validation rejected for upload in case '{resolved_case_id}': {val_err}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(val_err)
        )
    except Exception as e:
        logger.error(f"In-stream upload failure for file '{file.filename}': {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to save and hash uploaded evidence file"
        )

    # Check if this exact file (same SHA256) is already uploaded to this case
    duplicate = db.query(EvidenceFile).filter(
        EvidenceFile.case_id == resolved_case_id,
        EvidenceFile.sha256_hash == sha256_hex
    ).first()
    
    if duplicate:
        logger.warning(f"Duplicate upload skipped: file with SHA256 '{sha256_hex}' already exists in case '{resolved_case_id}'")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Duplicate file error: A file with identical SHA256 hash already exists in this case."
        )

    # Secure filename extraction and lookup properties
    sanitized_filename = FileService.sanitize_filename(file.filename)

    # Perform metadata and anomaly parsing stubs
    forensic_payload = FileService.extract_forensic_metadata(sanitized_filename, target_path)

    # Create Evidence File Database Record
    new_evidence = EvidenceFile(
        case_id=resolved_case_id,
        file_name=sanitized_filename,
        original_path=file.filename, # Track unsanitized name as logical original path mapping
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

    # Automatically run initial OCR / Content Parsing pipeline upon ingest
    try:
        ocr_result = OCRService.run_ocr_pipeline(target_path, sanitized_filename)
        db_ocr = OCRText(
            evidence_id=new_evidence.id,
            page_number=1,
            extracted_text=ocr_result["extracted_text"],
            bounding_boxes=ocr_result["bounding_boxes"],
            extracted_data=ocr_result["extracted_data"],
            confidence_score=ocr_result["confidence_score"]
        )
        db.add(db_ocr)

        # Synchronize any threats identified in extracted text with evidence anomalies
        threat_data = ocr_result.get("extracted_data", {}).get("threat_intelligence", {})
        threat_anomalies = threat_data.get("anomalies", [])
        if threat_anomalies:
            current_anomalies = list(new_evidence.anomalies or [])
            existing_types = {a["type"] for a in current_anomalies}
            updated = False
            for tanom in threat_anomalies:
                if tanom["type"] not in existing_types:
                    current_anomalies.append(tanom)
                    existing_types.add(tanom["type"])
                    updated = True
            if updated:
                new_evidence.anomalies = current_anomalies
                db.commit()
                db.refresh(new_evidence)
    except Exception as ocr_err:
        logger.warning(f"Auto-OCR background extraction deferred for '{sanitized_filename}': {ocr_err}")

    # Add dynamic Timeline Event representing file ingestion
    new_timeline_event = TimelineEvent(
        case_id=resolved_case_id,
        evidence_file_id=new_evidence.id,
        timestamp_source="System Ingestion Engine",
        event_type="FILE_INGEST",
        description=f"Ingested {sanitized_filename} into secure storage vault. Baseline hashes & OCR text parsed.",
        severity="INFO"
    )
    db.add(new_timeline_event)

    # If critical/violent threat detected, record high-priority Timeline alert
    has_critical_threat = any(a.get("severity") == "CRITICAL" for a in (new_evidence.anomalies or []))
    if has_critical_threat:
        crit_msg = next((a["message"] for a in new_evidence.anomalies if a.get("severity") == "CRITICAL"), "Violent threat detected")
        threat_timeline_event = TimelineEvent(
            case_id=resolved_case_id,
            evidence_file_id=new_evidence.id,
            timestamp_source="Forensic Threat Analyzer",
            event_type="THREAT_ALERT",
            description=f"CRITICAL Threat Flagged in {sanitized_filename}: {crit_msg}",
            severity="CRITICAL"
        )
        db.add(threat_timeline_event)

    db.commit()

    # Append transaction block to cryptographic Chain of Custody ledger
    AuditService.append_audit_event(
        db=db,
        action_type=f"FILE_INGESTED: {sanitized_filename} (SHA256: {sha256_hex[:12]}...)",
        operator_id=current_user.id,
        associated_item_id=new_evidence.id
    )

    logger.info(f"Evidence file '{sanitized_filename}' processed and linked to case '{case.case_number}'")
    return new_evidence

@router.get("/", response_model=List[EvidenceOut])
def list_evidence(
    case_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["SysAdmin", "LeadInvestigator", "Analyst", "LegalAuditor"]))
):
    """Lists all evidence files linked to a specific case."""
    case = CaseService.resolve_case(db, case_id)
    return db.query(EvidenceFile).filter(EvidenceFile.case_id == case.id).all()

@router.get("/{evidence_id}", response_model=EvidenceOut)
def get_evidence(
    case_id: str,
    evidence_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["SysAdmin", "LeadInvestigator", "Analyst", "LegalAuditor"]))
):
    """Fetches details of a specific evidence file by UUID."""
    case = CaseService.resolve_case(db, case_id)
    if not CaseService.is_valid_uuid(evidence_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evidence file not found")

    evidence = db.query(EvidenceFile).filter(
        EvidenceFile.case_id == case.id,
        EvidenceFile.id == evidence_id
    ).first()
    
    if not evidence:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evidence file not found")
        
    return evidence

@router.post("/{evidence_id}/ocr", response_model=OCRResponse, status_code=status.HTTP_201_CREATED)
def run_ocr_on_evidence(
    case_id: str,
    evidence_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["SysAdmin", "LeadInvestigator", "Analyst"]))
):
    """
    Executes optical character recognition (OCR) comparison parsing on evidence file.
    Runs EasyOCR and PaddleOCR comparison vectors, extracts Text, Tables, Numbers, Dates.
    Saves outputs to the database and appends ledger blocks.
    """
    case = CaseService.resolve_case(db, case_id)
    if not CaseService.is_valid_uuid(evidence_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evidence file not found")

    evidence = db.query(EvidenceFile).filter(
        EvidenceFile.case_id == case.id,
        EvidenceFile.id == evidence_id
    ).first()
    
    if not evidence:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evidence file not found")
        
    # Execute OCR service
    ocr_result = OCRService.run_ocr_pipeline(evidence.storage_vault_key, evidence.file_name)
    
    # Save output to database
    db_ocr = OCRText(
        evidence_id=evidence.id,
        page_number=1,
        extracted_text=ocr_result["extracted_text"],
        bounding_boxes=ocr_result["bounding_boxes"],
        extracted_data=ocr_result["extracted_data"],
        confidence_score=ocr_result["confidence_score"]
    )
    db.add(db_ocr)

    # Synchronize any threats identified in extracted text with evidence anomalies
    threat_data = ocr_result.get("extracted_data", {}).get("threat_intelligence", {})
    threat_anomalies = threat_data.get("anomalies", [])
    if threat_anomalies:
        current_anomalies = list(evidence.anomalies or [])
        existing_types = {a["type"] for a in current_anomalies}
        updated = False
        for tanom in threat_anomalies:
            if tanom["type"] not in existing_types:
                current_anomalies.append(tanom)
                existing_types.add(tanom["type"])
                updated = True
        if updated:
            evidence.anomalies = current_anomalies
    
    # Record timeline action
    new_timeline_event = TimelineEvent(
        case_id=case.id,
        evidence_file_id=evidence.id,
        timestamp_source="AI OCR Engine",
        event_type="AI_INFERENCE",
        description=f"Executed OCR engine scans (EasyOCR & PaddleOCR). Extracted text characters with {ocr_result['confidence_score']:.1f}% confidence.",
        severity="INFO"
    )
    db.add(new_timeline_event)
    
    # Audit CoC ledger block
    AuditService.append_audit_event(
        db=db,
        action_type=f"OCR_EXTRACTION_COMPLETED: {evidence.file_name} (Confidence: {ocr_result['confidence_score']:.1f}%)",
        operator_id=current_user.id,
        associated_item_id=evidence.id
    )
    db.commit()
    db.refresh(db_ocr)
    
    return {
        "record": db_ocr,
        "extracted_data": ocr_result["extracted_data"],
        "comparison": ocr_result["comparison"],
        "cross_engine_agreement": ocr_result.get("cross_engine_agreement"),
        "file_sha256": ocr_result.get("file_sha256") or evidence.sha256_hash,
        "raw_paddle_text": ocr_result.get("raw_paddle_text"),
        "raw_easy_text": ocr_result.get("raw_easy_text")
    }

@router.get("/{evidence_id}/ocr", response_model=List[OCRTextOut])
def get_ocr_records(
    case_id: str,
    evidence_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["SysAdmin", "LeadInvestigator", "Analyst", "LegalAuditor"]))
):
    """Retrieves all saved OCR scanner outputs for specific evidence file."""
    case = CaseService.resolve_case(db, case_id)
    if not CaseService.is_valid_uuid(evidence_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evidence file not found")

    evidence = db.query(EvidenceFile).filter(
        EvidenceFile.case_id == case.id,
        EvidenceFile.id == evidence_id
    ).first()
    
    if not evidence:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evidence file not found")
        
    try:
        return db.query(OCRText).filter(OCRText.evidence_id == evidence_id).all()
    except Exception as e:
        logger.error(f"Failed to query OCR records for evidence '{evidence_id}': {e}")
        return []

@router.delete("/{evidence_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_evidence(
    case_id: str,
    evidence_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["SysAdmin"]))
):
    """
    Deletes an evidence file (Strictly restricted to Level 4 - SysAdmin only).
    """
    case = CaseService.resolve_case(db, case_id)
    if not CaseService.is_valid_uuid(evidence_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evidence file not found")

    evidence = db.query(EvidenceFile).filter(
        EvidenceFile.case_id == case.id,
        EvidenceFile.id == evidence_id
    ).first()
    
    if not evidence:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evidence file not found")
        
    file_name = evidence.file_name
    db.delete(evidence)
    db.commit()
    
    # Audit log block entry
    AuditService.append_audit_event(
        db=db,
        action_type=f"EVIDENCE_DELETED: {file_name}",
        operator_id=current_user.id,
        associated_item_id=evidence_id
    )
    
    logger.info(f"Evidence file deleted. File: {file_name}, Deleted By SysAdmin: {current_user.email}")
    return None
