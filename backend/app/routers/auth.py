from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.schemas.user import UserRegister, UserLogin, TokenResponse, UserOut
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(reg_data: UserRegister, db: Session = Depends(get_db)):
    """
    Registers a new Customer or Seller account with Argon2 password hashing
    and returns a signed JWT access token.
    """
    return AuthService.register_user(db, reg_data)


@router.post("/login", response_model=TokenResponse, status_code=status.HTTP_200_OK)
def login(login_data: UserLogin, db: Session = Depends(get_db)):
    """
    Authenticates user credentials and generates a secure JWT access token.
    """
    return AuthService.authenticate_user(db, login_data)


@router.get("/me", response_model=UserOut, status_code=status.HTTP_200_OK)
def get_current_user_profile(current_user: User = Depends(get_current_user)):
    """
    Fetches the currently authenticated user's account details and role permissions.
    """
    return UserOut.model_validate(current_user)
