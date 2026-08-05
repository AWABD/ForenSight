import jwt
from datetime import datetime, timedelta
from typing import Optional, List
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from passlib.context import CryptContext
from sqlalchemy.orm import Session
from app.config import settings
from app.database import get_db
from app.models.user import User
from app.utils.logging_config import logger

# Cryptography context setup for password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# OAuth2 scheme setup for extracting token from header
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies that a plain text password matches its hash."""
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except Exception as e:
        logger.error(f"Password verification error: {e}")
        return False

def get_password_hash(password: str) -> str:
    """Computes a bcrypt hash for a plain text password."""
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Generates a secure HS256-encoded JWT token."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    """
    Dependency to validate JWT token and fetch the current user.
    Raises credentials exception if token is invalid or user is not found.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if not token:
        logger.warning("Authentication token is missing in request headers")
        raise credentials_exception

    try:
        # Decode the access token
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            logger.warning("JWT Token payload is missing 'sub' identifier")
            raise credentials_exception
    except jwt.PyJWTError as e:
        logger.warning(f"Failed to decode JWT Token: {e}")
        raise credentials_exception

    # Query the user from the database
    user = db.query(User).filter(User.email == email).first()
    if user is None:
        logger.warning(f"Authenticated user sub '{email}' not found in database")
        raise credentials_exception
    
    return user

class RoleChecker:
    """
    Dependency checker to validate user has required clearance roles (RBAC).
    Exposes role hierarchies or explicit whitelist checks.
    """
    # Hierarchy map: Level 4 (SysAdmin) down to Level 1 (LegalAuditor)
    ROLE_LEVELS = {
        "SysAdmin": 4,
        "LeadInvestigator": 3,
        "Analyst": 2,
        "LegalAuditor": 1
    }

    def __init__(self, allowed_roles: List[str]):
        self.allowed_roles = allowed_roles

    def __call__(self, current_user: User = Depends(get_current_user)) -> User:
        user_role = current_user.role_level
        if user_role not in self.allowed_roles:
            # Let's see if user has higher clearance in hierarchy (e.g. SysAdmin can do anything Analyst/Lead can do)
            user_clearance = self.ROLE_LEVELS.get(user_role, 0)
            max_allowed_clearance = max([self.ROLE_LEVELS.get(r, 0) for r in self.allowed_roles])
            
            # If user clearance level is lower than the highest allowed role, reject
            if user_clearance < max_allowed_clearance:
                logger.warning(
                    f"RBAC rejection: User '{current_user.email}' with role '{user_role}' "
                    f"attempted to access an endpoint requiring {self.allowed_roles}"
                )
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Insufficent clearance. Required roles: {self.allowed_roles}"
                )
                
        return current_user
