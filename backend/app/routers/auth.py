from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.schemas.user import UserCreate, UserLogin, Token, UserOut
from app.services.auth_service import verify_password, get_password_hash, create_access_token
from app.services.audit_service import AuditService
from app.utils.logging_config import logger

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register_user(user_in: UserCreate, db: Session = Depends(get_db)):
    """
    Registers a new examiner or operator on the system.
    Restricted database transaction to set cryptographic password hashes.
    """
    # Check if email is already registered
    existing_user = db.query(User).filter(User.email == user_in.email).first()
    if existing_user:
        logger.warning(f"Registration failure: email '{user_in.email}' is already registered")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Hash password and create record
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
    
    # Write to cryptographic Chain of Custody ledger
    AuditService.append_audit_event(
        db=db,
        action_type=f"USER_REGISTRATION: {new_user.email} ({new_user.role_level})",
        operator_id=new_user.id,
        associated_item_id=new_user.id
    )
    
    logger.info(f"Registered new user: {new_user.email} with role: {new_user.role_level}")
    return new_user

@router.post("/login", response_model=Token)
def login(login_data: UserLogin, db: Session = Depends(get_db)):
    """
    Standard JSON endpoint for user login. Returns JWT access token.
    """
    user = db.query(User).filter(User.email == login_data.email).first()
    if not user or not verify_password(login_data.password, user.password_hash):
        logger.warning(f"Failed login attempt for email: '{login_data.email}'")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Generate token
    access_token = create_access_token(data={"sub": user.email})
    
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
        "token_type": "bearer",
        "user": user
    }

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
