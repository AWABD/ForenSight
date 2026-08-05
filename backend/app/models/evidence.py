import uuid
from datetime import datetime
from sqlalchemy import Column, String, BigInteger, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.database import Base

class EvidenceFile(Base):
    __tablename__ = "evidence_files"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    case_id = Column(String(36), ForeignKey("cases.id", ondelete="CASCADE"), nullable=False)
    file_name = Column(String(255), nullable=False)
    original_path = Column(String(1024), nullable=True)
    file_size_bytes = Column(BigInteger, nullable=False)
    file_type = Column(String(100), nullable=False)
    sha256_hash = Column(String(64), unique=True, nullable=False)
    sha3_hash = Column(String(64), unique=True, nullable=False)
    storage_vault_key = Column(String(1024), nullable=False)
    ingested_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Store dynamic metadata extracted by parsers / AI anomalies (stubbed)
    anomalies = Column(JSON, nullable=True, default=list) # List of dict: {type: str, severity: str, message: str}
    exif = Column(JSON, nullable=True) # Dict: {camera: str, gps: str, timestamp: str}

    # Relationships
    case = relationship("Case", back_populates="evidence_files")
    timeline_events = relationship("TimelineEvent", back_populates="evidence_file", cascade="all, delete-orphan")
