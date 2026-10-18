from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session, joinedload
from app.core.database import get_db
from app.core.security import decode_access_token
from app.models.user import User

# OAuth2 scheme extracting Bearer tokens from the Authorization header
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")
oauth2_scheme_optional = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)


def get_optional_current_user(
    token: Optional[str] = Depends(oauth2_scheme_optional),
    db: Session = Depends(get_db)
) -> Optional[User]:
    """
    Returns the authenticated User if a valid Bearer token is provided; otherwise returns None.
    Allows public/guest access to endpoints like Cart while seamlessly linking to accounts.
    """
    if not token:
        return None
    payload = decode_access_token(token)
    if not payload:
        return None
    user_id: Optional[str] = payload.get("sub")
    if not user_id:
        return None
    user = db.query(User).options(joinedload(User.role)).filter(User.id == user_id).first()
    if not user or not user.is_active:
        return None
    return user


get_optional_user = get_optional_current_user


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> User:
    """
    Validates JWT access token, checks expiry, and returns the authenticated User instance.
    Raises 401 Unauthorized on invalid or expired credentials.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials or token expired.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    payload = decode_access_token(token)
    if payload is None:
        raise credentials_exception

    user_id: str = payload.get("sub")
    if user_id is None:
        raise credentials_exception

    user = db.query(User).options(
        joinedload(User.role)
    ).filter(User.id == user_id).first()

    if user is None:
        raise credentials_exception

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated. Please contact support."
        )

    return user


def get_current_active_seller(
    current_user: User = Depends(get_current_user)
) -> User:
    """
    Enforces Role-Based Access Control: restricts endpoint to authorized Sellers and Admins.
    """
    user_role = current_user.role.name if current_user.role else ""
    if user_role not in ["SELLER", "ADMIN"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Seller privileges required to access this resource."
        )
    return current_user


def get_current_active_admin(
    current_user: User = Depends(get_current_user)
) -> User:
    """
    Enforces Role-Based Access Control: restricts endpoint strictly to Platform Administrators.
    """
    user_role = current_user.role.name if current_user.role else ""
    if user_role != "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrator privileges required to access this resource."
        )
    return current_user
