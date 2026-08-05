from fastapi import APIRouter, Depends
from app.schemas.user import UserOut
from app.models.user import User
from app.services.auth_service import get_current_user

router = APIRouter(prefix="/users", tags=["Users"])

@router.get("/me", response_model=UserOut)
def read_users_me(current_user: User = Depends(get_current_user)):
    """
    Returns the authenticated user details for the active session.
    """
    return current_user
