from datetime import datetime
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, ConfigDict

class OCRComparisonMetrics(BaseModel):
    engine_name: str
    status: str = "SUCCESS"  # SUCCESS | FAILED | NOT_AVAILABLE
    inference_time_seconds: float = 0.0
    confidence_score: float = 0.0  # Real mean confidence (0.0 - 100.0)
    detected_blocks_count: int = 0
    error_message: Optional[str] = None

class OCRExtractedData(BaseModel):
    dates: List[str] = []
    times: List[str] = []
    amounts: List[str] = []
    people: List[str] = []
    ids: List[str] = []
    upi_ids: List[str] = []
    emails: List[str] = []
    urls: List[str] = []
    banking_details: List[str] = []
    status_signals: List[str] = []
    numbers: List[str] = []
    tables: List[Any] = []
    uncertain_extractions: List[Dict[str, Any]] = []
    file_sha256: Optional[str] = None

class OCRTextOut(BaseModel):
    id: str
    evidence_id: str
    page_number: int
    extracted_text: str
    bounding_boxes: Optional[List[Any]] = None
    extracted_data: Optional[Dict[str, Any]] = None
    confidence_score: Optional[float] = None
    scanned_at: datetime

    model_config = ConfigDict(from_attributes=True)

class OCRResponse(BaseModel):
    record: OCRTextOut
    extracted_data: OCRExtractedData
    comparison: Dict[str, OCRComparisonMetrics]
    cross_engine_agreement: Optional[float] = None
    file_sha256: Optional[str] = None
    raw_paddle_text: Optional[str] = None
    raw_easy_text: Optional[str] = None
