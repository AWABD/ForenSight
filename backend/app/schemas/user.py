from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field, ConfigDict

class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    role_level: str = Field(..., description="SysAdmin, LeadInvestigator, Analyst, LegalAuditor")

class UserCreate(UserBase):
    password: str = Field(..., min_length=6)

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str
    user: "UserOut"

class TokenRefreshRequest(BaseModel):
    refresh_token: str

class UserOut(UserBase):
    id: str
    is_approved: bool
    secret_code: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class UserRegistrationStatus(BaseModel):
    full_name: str
    email: str
    role_level: str
    is_approved: bool
    secret_code: str
    user_id: Optional[str] = None

# Handle circular imports for Token
Token.model_rebuild()
