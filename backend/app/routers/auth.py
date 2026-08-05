import secrets
import hashlib
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User, UserRefreshToken
from app.schemas.user import UserCreate, UserLogin, Token, UserOut, TokenRefreshRequest
from app.services.auth_service import verify_password, get_password_hash, create_access_token, get_current_user
from app.services.audit_service import AuditService
from app.services.rate_limiter import RateLimiterDependency
from app.utils.logging_config import logger

router = APIRouter(prefix="/auth", tags=["Authentication"])

# Rate limiters for auth endpoints
login_rate_limiter = RateLimiterDependency(limit=5, window_seconds=60, route_name="auth_login")
register_rate_limiter = RateLimiterDependency(limit=5, window_seconds=60, route_name="auth_register")
refresh_rate_limiter = RateLimiterDependency(limit=10, window_seconds=60, route_name="auth_refresh")

def hash_refresh_token(token: str) -> str:
    """Computes SHA-256 hash of plain text refresh token for secure database storage."""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()

@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED, dependencies=[Depends(register_rate_limiter)])
def register_user(user_in: UserCreate, db: Session = Depends(get_db)):
    """
    Registers a new examiner or operator on the system.
    Enforces a strict 5 requests/minute rate limit.
    """
    existing_user = db.query(User).filter(User.email == user_in.email).first()
    if existing_user:
        logger.warning(f"Registration failure: email '{user_in.email}' is already registered")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    hashed_password = get_password_hash(user_in.password)
    new_user = User(
        email=user_in.email,
        password_hash=hashed_password,
        full_name=user_in.full_name,
        role_level=user_in.role_level
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    AuditService.append_audit_event(
        db=db,
        action_type=f"USER_REGISTRATION: {new_user.email} ({new_user.role_level})",
        operator_id=new_user.id,
        associated_item_id=new_user.id
    )
    
    logger.info(f"Registered new user: {new_user.email} with role: {new_user.role_level}")
    return new_user

@router.post("/login", response_model=Token, dependencies=[Depends(login_rate_limiter)])
def login(login_data: UserLogin, db: Session = Depends(get_db)):
    """
    User login endpoint issuing short-lived access tokens and long-lived refresh tokens.
    Enforces rate limits to defend against brute-force attacks.
    """
    user = db.query(User).filter(User.email == login_data.email).first()
    if not user or not verify_password(login_data.password, user.password_hash):
        logger.warning(f"Failed login attempt for email: '{login_data.email}'")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # 1. Generate Access Token (short-lived, e.g. 15-30 minutes, using settings default)
    access_token = create_access_token(data={"sub": user.email})
    
    # 2. Generate Refresh Token (long-lived, cryptographically random string)
    plain_refresh_token = secrets.token_hex(32)
    refresh_token_hash = hash_refresh_token(plain_refresh_token)
    
    # Expiry set to 7 days
    expires_at = datetime.utcnow() + timedelta(days=7)
    
    # Store refresh token record in DB
    db_refresh_token = UserRefreshToken(
        user_id=user.id,
        token_hash=refresh_token_hash,
        expires_at=expires_at
    )
    db.add(db_refresh_token)
    db.commit()
    
    # Audit log entry
    AuditService.append_audit_event(
        db=db,
        action_type="LOGIN_SUCCESS",
        operator_id=user.id,
        associated_item_id=user.id
    )
    
    logger.info(f"User login successful: {user.email}")
    return {
        "access_token": access_token,
        "refresh_token": plain_refresh_token,
        "token_type": "bearer",
        "user": user
    }

@router.post("/refresh", response_model=Token, dependencies=[Depends(refresh_rate_limiter)])
def refresh_access_token(refresh_data: TokenRefreshRequest, db: Session = Depends(get_db)):
    """
    Renews a short-lived access token using a valid, active refresh token.
    Enforces database verification and checks for revocation.
    """
    token_hash = hash_refresh_token(refresh_data.refresh_token)
    
    # Look up token in database
    db_token = db.query(UserRefreshToken).filter(
        UserRefreshToken.token_hash == token_hash,
        UserRefreshToken.revoked == False
    ).first()
    
    if not db_token:
        logger.warning("Refresh token rotation attempt: Invalid or revoked refresh token presented")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or revoked refresh token"
        )
        
    # Check expiration
    if db_token.expires_at < datetime.utcnow():
        logger.warning("Refresh token rotation attempt: Expired refresh token presented")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Expired refresh token"
        )
        
    # Fetch user
    user = db.query(User).filter(User.id == db_token.user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )
        
    # Generate new access token and rotate refresh token
    new_access_token = create_access_token(data={"sub": user.email})
    new_plain_refresh_token = secrets.token_hex(32)
    new_refresh_token_hash = hash_refresh_token(new_plain_refresh_token)
    
    # Revoke old token and write new token in a transaction
    db_token.revoked = True
    new_db_token = UserRefreshToken(
        user_id=user.id,
        token_hash=new_refresh_token_hash,
        expires_at=datetime.utcnow() + timedelta(days=7)
    )
    db.add(new_db_token)
    db.commit()
    
    logger.info(f"Successfully rotated access and refresh tokens for: {user.email}")
    return {
        "access_token": new_access_token,
        "refresh_token": new_plain_refresh_token,
        "token_type": "bearer",
        "user": user
    }

@router.post("/logout", status_code=status.HTTP_200_OK)
def logout(logout_data: TokenRefreshRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Revokes the active refresh token to end user session securely.
    """
    token_hash = hash_refresh_token(logout_data.refresh_token)
    db_token = db.query(UserRefreshToken).filter(
        UserRefreshToken.token_hash == token_hash,
        UserRefreshToken.user_id == current_user.id
    ).first()
    
    if db_token:
        db_token.revoked = True
        db.commit()
        
    # Append event to ledger
    AuditService.append_audit_event(
        db=db,
        action_type="LOGOUT_SUCCESS",
        operator_id=current_user.id,
        associated_item_id=current_user.id
    )
    
    logger.info(f"User logged out and session revoked: {current_user.email}")
    return {"detail": "Logged out successfully. Session tokens revoked."}

# Also support OAuth2 form login for Swagger docs UI testing convenience
@router.post("/token", include_in_schema=False)
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer"}
