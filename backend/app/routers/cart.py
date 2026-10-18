from typing import Optional
from fastapi import APIRouter, Depends, Header
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.dependencies import get_optional_current_user
from app.models.user import User
from app.schemas.cart import CartOut, CartItemCreate, CartItemUpdate
from app.services.cart_service import CartService

router = APIRouter(prefix="/cart", tags=["Cart"])


@router.get("", response_model=CartOut)
def get_cart(
    current_user: Optional[User] = Depends(get_optional_current_user),
    x_session_token: Optional[str] = Header(None, alias="X-Session-Token"),
    db: Session = Depends(get_db)
):
    """
    Retrieve the current shopping cart for an authenticated user or guest session.
    Calculates live totals, discounts, taxes, and shipping eligibility.
    """
    user_id = current_user.id if current_user else None
    return CartService.get_cart_details(db, user_id=user_id, session_token=x_session_token)


@router.post("/items", response_model=CartOut)
def add_item_to_cart(
    item_data: CartItemCreate,
    current_user: Optional[User] = Depends(get_optional_current_user),
    x_session_token: Optional[str] = Header(None, alias="X-Session-Token"),
    db: Session = Depends(get_db)
):
    """
    Add a product variant to the cart with inventory stock validation.
    """
    user_id = current_user.id if current_user else None
    return CartService.add_to_cart(
        db,
        item_data=item_data,
        user_id=user_id,
        session_token=x_session_token
    )


@router.put("/items/{item_id}", response_model=CartOut)
def update_cart_item_quantity(
    item_id: str,
    update_data: CartItemUpdate,
    current_user: Optional[User] = Depends(get_optional_current_user),
    x_session_token: Optional[str] = Header(None, alias="X-Session-Token"),
    db: Session = Depends(get_db)
):
    """
    Update the quantity of a specific line item in the cart.
    """
    user_id = current_user.id if current_user else None
    return CartService.update_quantity(
        db,
        cart_item_id=item_id,
        quantity=update_data.quantity,
        user_id=user_id,
        session_token=x_session_token
    )


@router.delete("/items/{item_id}", response_model=CartOut)
def remove_cart_item(
    item_id: str,
    current_user: Optional[User] = Depends(get_optional_current_user),
    x_session_token: Optional[str] = Header(None, alias="X-Session-Token"),
    db: Session = Depends(get_db)
):
    """
    Remove a single item from the cart.
    """
    user_id = current_user.id if current_user else None
    return CartService.remove_item(
        db,
        cart_item_id=item_id,
        user_id=user_id,
        session_token=x_session_token
    )


@router.delete("")
def clear_cart(
    current_user: Optional[User] = Depends(get_optional_current_user),
    x_session_token: Optional[str] = Header(None, alias="X-Session-Token"),
    db: Session = Depends(get_db)
):
    """
    Completely empty all items in the user's or guest's cart.
    """
    user_id = current_user.id if current_user else None
    return CartService.clear_cart(db, user_id=user_id, session_token=x_session_token)
