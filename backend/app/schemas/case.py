from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict

class CaseBase(BaseModel):
    title: str
    description: Optional[str] = None
    status: str = "ACTIVE" # ACTIVE, UNDER_REVIEW, ARCHIVED
    reference_number: str

class CaseCreate(BaseModel):
    title: str
    description: Optional[str] = None
    reference_number: Optional[str] = None # Generate if not provided
    assigned_to_id: Optional[str] = None

class CaseUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    reference_number: Optional[str] = None
    assigned_to_id: Optional[str] = None

class CaseOut(CaseBase):
    id: str
    case_number: str
    assigned_to_id: Optional[str] = None
    created_at: datetime
    evidence_count: int = 0
    anomaly_rate: str = "0%"

    model_config = ConfigDict(from_attributes=True)
