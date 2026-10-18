from typing import List, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.user import User, Address
from app.schemas.user import UserProfileUpdate, PasswordChange, AddressCreate, AddressUpdate, AddressOut, UserOut
from app.core.security import verify_password, get_password_hash


class UserService:
    @staticmethod
    def update_profile(db: Session, user: User, update_data: UserProfileUpdate) -> UserOut:
        if update_data.first_name is not None:
            user.first_name = update_data.first_name.strip()
        if update_data.last_name is not None:
            user.last_name = update_data.last_name.strip()
        if update_data.phone_number is not None:
            user.phone_number = update_data.phone_number.strip()

        db.commit()
        db.refresh(user)
        return UserOut.model_validate(user)

    @staticmethod
    def change_password(db: Session, user: User, pwd_data: PasswordChange):
        if not verify_password(pwd_data.current_password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Incorrect current password provided."
            )

        user.hashed_password = get_password_hash(pwd_data.new_password)
        db.commit()
        return {"message": "Password updated successfully."}

    @staticmethod
    def get_addresses(db: Session, user_id: str) -> List[AddressOut]:
        addresses = db.query(Address).filter(
            Address.user_id == user_id
        ).order_by(Address.is_default.desc(), Address.created_at.desc()).all()
        return [AddressOut.model_validate(a) for a in addresses]

    @staticmethod
    def create_address(db: Session, user_id: str, address_data: AddressCreate) -> AddressOut:
        # If setting as default, or if this is the user's first address, ensure it's default
        existing_count = db.query(Address).filter(Address.user_id == user_id).count()
        make_default = address_data.is_default or existing_count == 0

        if make_default:
            db.query(Address).filter(Address.user_id == user_id).update({"is_default": False})

        address = Address(
            user_id=user_id,
            full_name=address_data.full_name.strip(),
            phone_number=address_data.phone_number.strip(),
            address_line1=address_data.address_line1.strip(),
            address_line2=address_data.address_line2.strip() if address_data.address_line2 else None,
            city=address_data.city.strip(),
            state=address_data.state.strip(),
            postal_code=address_data.postal_code.strip(),
            country=address_data.country.strip(),
            is_default=make_default
        )
        db.add(address)
        db.commit()
        db.refresh(address)
        return AddressOut.model_validate(address)

    @staticmethod
    def update_address(db: Session, user_id: str, address_id: str, update_data: AddressUpdate) -> AddressOut:
        address = db.query(Address).filter(
            Address.id == address_id,
            Address.user_id == user_id
        ).first()

        if not address:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Address not found."
            )

        if update_data.is_default:
            db.query(Address).filter(Address.user_id == user_id).update({"is_default": False})
            address.is_default = True

        for key, value in update_data.model_dump(exclude_unset=True).items():
            if key != "is_default":
                setattr(address, key, value.strip() if isinstance(value, str) else value)

        db.commit()
        db.refresh(address)
        return AddressOut.model_validate(address)

    @staticmethod
    def delete_address(db: Session, user_id: str, address_id: str):
        address = db.query(Address).filter(
            Address.id == address_id,
            Address.user_id == user_id
        ).first()

        if not address:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Address not found."
            )

        db.delete(address)
        db.commit()
        return {"message": "Address deleted successfully."}

    @staticmethod
    def set_default_address(db: Session, user_id: str, address_id: str) -> AddressOut:
        address = db.query(Address).filter(
            Address.id == address_id,
            Address.user_id == user_id
        ).first()

        if not address:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Address not found."
            )

        db.query(Address).filter(Address.user_id == user_id).update({"is_default": False})
        address.is_default = True
        db.commit()
        db.refresh(address)
        return AddressOut.model_validate(address)
