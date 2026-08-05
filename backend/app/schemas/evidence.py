from datetime import datetime
from typing import Optional, List, Any, Dict
from pydantic import BaseModel, ConfigDict

class AnomalySchema(BaseModel):
    type: str
    severity: str # INFO, WARNING, HIGH, CRITICAL
    message: str

class ExifSchema(BaseModel):
    camera: str
    gps: str
    timestamp: str

class EvidenceOut(BaseModel):
    id: str
    case_id: str
    file_name: str
    original_path: Optional[str] = None
    file_size_bytes: int
    file_type: str
    sha256_hash: str
    sha3_hash: str
    storage_vault_key: str
    ingested_at: datetime
    anomalies: List[AnomalySchema] = []
    exif: Optional[ExifSchema] = None

    model_config = ConfigDict(from_attributes=True)
