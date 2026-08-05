import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime
from sqlalchemy.orm import relationship
from app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    role_level = Column(String(50), nullable=False, default="Analyst") # SysAdmin, LeadInvestigator, Analyst, LegalAuditor
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    cases = relationship("Case", back_populates="lead_investigator")
    audit_logs = relationship("AuditLedger", back_populates="operator")
