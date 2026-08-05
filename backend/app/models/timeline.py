import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class TimelineEvent(Base):
    __tablename__ = "timeline_events"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    case_id = Column(String(36), ForeignKey("cases.id", ondelete="CASCADE"), nullable=False)
    evidence_file_id = Column(String(36), ForeignKey("evidence_files.id", ondelete="SET NULL"), nullable=True)
    event_timestamp = Column(DateTime, nullable=False, default=datetime.utcnow)
    timestamp_source = Column(String(100), nullable=False) # EXIF, Syslog, SQLite, etc.
    event_type = Column(String(100), nullable=False)       # SYS_LOGIN, FILE_CREATE, DB_DELETE, etc.
    description = Column(Text, nullable=False)
    severity = Column(String(50), nullable=False, default="INFO") # INFO, WARNING, HIGH, CRITICAL

    # Relationships
    case = relationship("Case", back_populates="timeline_events")
    evidence_file = relationship("EvidenceFile", back_populates="timeline_events")
