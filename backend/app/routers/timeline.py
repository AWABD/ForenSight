from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.case import Case
from app.models.timeline import TimelineEvent
from app.models.user import User
from app.schemas.timeline import TimelineEventCreate, TimelineEventOut
from app.services.auth_service import get_current_user, RoleChecker
from app.services.audit_service import AuditService
from app.utils.logging_config import logger

router = APIRouter(prefix="/cases/{case_id}/timeline", tags=["Timeline Analyzer"])

@router.get("/", response_model=List[TimelineEventOut])
def get_case_timeline(
    case_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["SysAdmin", "LeadInvestigator", "Analyst", "LegalAuditor"]))
):
    """
    Returns all chronological timeline events associated with a case.
    Ordered by event timestamp ascending.
    """
    # Verify case exists
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found")

    events = db.query(TimelineEvent).filter(
        TimelineEvent.case_id == case_id
    ).order_by(TimelineEvent.event_timestamp.asc()).all()
    
    return events

@router.post("/event", response_model=TimelineEventOut, status_code=status.HTTP_201_CREATED)
def add_custom_timeline_event(
    case_id: str,
    event_in: TimelineEventCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["SysAdmin", "LeadInvestigator", "Analyst"]))
):
    """
    Adds a custom timeline event annotated manually by an examiner.
    Appends an audit ledger record tracking the annotation modification.
    """
    # Verify case exists
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found")

    new_event = TimelineEvent(
        case_id=case_id,
        evidence_file_id=event_in.evidence_file_id,
        event_timestamp=event_in.event_timestamp,
        timestamp_source=event_in.timestamp_source,
        event_type=event_in.event_type,
        description=event_in.description,
        severity=event_in.severity
    )
    
    db.add(new_event)
    db.commit()
    db.refresh(new_event)
    
    # Audit log block entry
    AuditService.append_audit_event(
        db=db,
        action_type=f"MANUAL_TIMELINE_EVENT_ADDED: type={new_event.event_type}",
        operator_id=current_user.id,
        associated_item_id=new_event.id
    )

    logger.info(
        f"Custom timeline event '{new_event.event_type}' annotated by '{current_user.email}' "
        f"for case '{case.case_number}'"
    )
    return new_event
