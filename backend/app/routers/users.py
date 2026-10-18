from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.schemas.user import (
    UserOut,
    UserProfileUpdate,
    PasswordChange,
    AddressCreate,
    AddressUpdate,
    AddressOut
)
from app.services.user_service import UserService

router = APIRouter(prefix="/users", tags=["Users & Addresses"])


@router.put("/profile", response_model=UserOut, status_code=status.HTTP_200_OK)
def update_profile(
    profile_data: UserProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Updates basic personal profile details (first name, last name, phone number).
    """
    return UserService.update_profile(db, current_user, profile_data)


@router.put("/change-password", status_code=status.HTTP_200_OK)
def change_password(
    pwd_data: PasswordChange,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Validates current password and updates to a new Argon2 hashed password.
    """
    return UserService.change_password(db, current_user, pwd_data)


@router.get("/addresses", response_model=List[AddressOut], status_code=status.HTTP_200_OK)
def get_user_addresses(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Retrieves all shipping addresses associated with the authenticated user.
    """
    return UserService.get_addresses(db, current_user.id)


@router.post("/addresses", response_model=AddressOut, status_code=status.HTTP_201_CREATED)
def create_address(
    address_data: AddressCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Adds a new shipping address to the user's address book.
    """
    return UserService.create_address(db, current_user.id, address_data)


@router.put("/addresses/{address_id}", response_model=AddressOut, status_code=status.HTTP_200_OK)
def update_address(
    address_id: str,
    update_data: AddressUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Updates an existing shipping address.
    """
    return UserService.update_address(db, current_user.id, address_id, update_data)


@router.delete("/addresses/{address_id}", status_code=status.HTTP_200_OK)
def delete_address(
    address_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Deletes an address from the user's address book.
    """
    return UserService.delete_address(db, current_user.id, address_id)


@router.put("/addresses/{address_id}/default", response_model=AddressOut, status_code=status.HTTP_200_OK)
def set_default_address(
    address_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Sets a specific address as the primary default shipping address.
    """
    return UserService.set_default_address(db, current_user.id, address_id)
