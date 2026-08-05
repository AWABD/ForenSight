from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict

class TimelineEventCreate(BaseModel):
    event_timestamp: datetime
    timestamp_source: str
    event_type: str
    description: str
    severity: str = "INFO" # INFO, WARNING, HIGH, CRITICAL
    evidence_file_id: Optional[str] = None

class TimelineEventOut(BaseModel):
    id: str
    case_id: str
    evidence_file_id: Optional[str] = None
    event_timestamp: datetime
    timestamp_source: str
    event_type: str
    description: str
    severity: str

    model_config = ConfigDict(from_attributes=True)
