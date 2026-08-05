import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Text, Float, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.database import Base

class OCRText(Base):
    __tablename__ = "ocr_text"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    evidence_id = Column(String(36), ForeignKey("evidence_files.id", ondelete="CASCADE"), nullable=False)
    page_number = Column(Integer, default=1, nullable=False)
    extracted_text = Column(Text, nullable=False)
    bounding_boxes = Column(JSON, nullable=True)
    confidence_score = Column(Float, nullable=True)
    scanned_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    evidence_file = relationship("EvidenceFile", back_populates="ocr_records")
