import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, Boolean, UUID
from sqlalchemy.orm import relationship
from app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String(255), unique=True, nullable=True, index=True)
    username = Column(String(100), unique=True, nullable=True, index=True)
    password_hash = Column(String(255), nullable=False)
    generated_passphrase = Column(String(255), nullable=True)
    full_name = Column(String(255), nullable=False)
    role_level = Column(String(50), nullable=False, default="Analyst") # SysAdmin, LeadInvestigator, Analyst, LegalAuditor
    is_approved = Column(Boolean, default=False, nullable=False)
    secret_code = Column(String(50), unique=True, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    cases = relationship("Case", back_populates="lead_investigator")
    audit_logs = relationship("AuditLedger", back_populates="operator")
    refresh_tokens = relationship("UserRefreshToken", back_populates="user", cascade="all, delete-orphan")

class UserRefreshToken(Base):
    __tablename__ = "user_refresh_tokens"

    id = Column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(UUID(as_uuid=False), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    token_hash = Column(String(64), unique=True, nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    revoked = Column(Boolean, default=False, nullable=False)

    # Relationships
    user = relationship("User", back_populates="refresh_tokens")
