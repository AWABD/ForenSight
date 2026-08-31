from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field, ConfigDict

class UserBase(BaseModel):
    email: Optional[EmailStr] = None
    username: Optional[str] = None
    full_name: str
    role_level: str = Field(..., description="SysAdmin, LeadInvestigator, Analyst, LegalAuditor")

class UserCreate(UserBase):
    password: Optional[str] = Field(None, min_length=6)

class UserLogin(BaseModel):
    username: str
    password: str
    selected_role: str

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
    email: Optional[str] = None
    role_level: str
    is_approved: bool
    secret_code: str
    user_id: Optional[str] = None
    username: Optional[str] = None
    generated_passphrase: Optional[str] = None

# Handle circular imports for Token
Token.model_rebuild()
