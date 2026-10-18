from sqlalchemy.orm import Session, joinedload
from fastapi import HTTPException, status
from app.models.user import User, Role
from app.models.seller import SellerProfile
from app.models.cart import Cart
from app.schemas.user import UserRegister, UserLogin, TokenResponse, UserOut
from app.core.security import get_password_hash, verify_password, create_access_token


class AuthService:
    @staticmethod
    def register_user(db: Session, reg_data: UserRegister) -> TokenResponse:
        # 1. Check if email is already taken
        normalized_email = reg_data.email.lower().strip()
        existing_user = db.query(User).filter(User.email == normalized_email).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="An account with this email address already exists."
            )

        # 2. Determine target role
        target_role_name = reg_data.role.upper().strip()
        if target_role_name not in ["CUSTOMER", "SELLER"]:
            target_role_name = "CUSTOMER"

        role_record = db.query(Role).filter(Role.name == target_role_name).first()
        if not role_record:
            role_record = db.query(Role).filter(Role.name == "CUSTOMER").first()

        role_id = role_record.id if role_record else 1

        # 3. Hash password with Argon2
        hashed_pwd = get_password_hash(reg_data.password)

        # 4. Create User
        user = User(
            email=normalized_email,
            hashed_password=hashed_pwd,
            first_name=reg_data.first_name.strip(),
            last_name=reg_data.last_name.strip(),
            phone_number=reg_data.phone_number.strip() if reg_data.phone_number else None,
            role_id=role_id,
            is_active=True,
            is_verified=False
        )
        db.add(user)
        db.flush()

        # 5. Initialize Empty Shopping Cart
        cart = Cart(user_id=user.id)
        db.add(cart)

        # 6. If Seller, create seller profile skeleton
        if target_role_name == "SELLER":
            store_slug = f"store-{user.id[:8]}"
            store_name = f"{user.first_name}'s Store"
            seller_prof = SellerProfile(
                user_id=user.id,
                store_name=store_name,
                store_slug=store_slug,
                description=f"Seller store for {user.first_name} {user.last_name}",
                is_approved=True
            )
            db.add(seller_prof)

        db.commit()
        db.refresh(user)

        # 7. Generate JWT access token
        access_token = create_access_token(
            subject=user.id,
            role=role_record.name if role_record else "CUSTOMER"
        )

        return TokenResponse(
            access_token=access_token,
            token_type="bearer",
            user=UserOut.model_validate(user)
        )

    @staticmethod
    def authenticate_user(db: Session, login_data: UserLogin) -> TokenResponse:
        normalized_email = login_data.email.lower().strip()
        user = db.query(User).options(
            joinedload(User.role)
        ).filter(User.email == normalized_email).first()

        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password.",
                headers={"WWW-Authenticate": "Bearer"}
            )

        if not verify_password(login_data.password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password.",
                headers={"WWW-Authenticate": "Bearer"}
            )

        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User account is deactivated."
            )

        role_name = user.role.name if user.role else "CUSTOMER"
        access_token = create_access_token(subject=user.id, role=role_name)

        return TokenResponse(
            access_token=access_token,
            token_type="bearer",
            user=UserOut.model_validate(user)
        )
