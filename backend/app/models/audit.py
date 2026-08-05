import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class AuditLedger(Base):
    __tablename__ = "audit_ledger"

    block_id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    operator_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    action_type = Column(String(100), nullable=False) # e.g. CASE_CREATED, FILE_INGESTED, LOGIN_SUCCESS
    associated_item_id = Column(String(36), nullable=True) # UUID string of Case, Evidence, User, etc.
    record_timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)
    previous_block_hash = Column(String(64), nullable=False)
    active_block_hash = Column(String(64), unique=True, nullable=False)
    signature_proof = Column(String(128), nullable=True) # Digital signature / validation hash proof

    # Relationships
    operator = relationship("User", back_populates="audit_logs")
