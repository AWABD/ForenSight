from datetime import datetime
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, ConfigDict

class OCRComparisonMetrics(BaseModel):
    engine_name: str
    inference_time_seconds: float
    confidence_score: float
    accuracy_rating: str

class OCRExtractedData(BaseModel):
    tables: List[Any] = []
    numbers: List[str] = []
    dates: List[str] = []

class OCRTextOut(BaseModel):
    id: str
    evidence_id: str
    page_number: int
    extracted_text: str
    bounding_boxes: Optional[List[Any]] = None
    confidence_score: Optional[float] = None
    scanned_at: datetime

    model_config = ConfigDict(from_attributes=True)

class OCRResponse(BaseModel):
    record: OCRTextOut
    extracted_data: OCRExtractedData
    comparison: Dict[str, OCRComparisonMetrics]
