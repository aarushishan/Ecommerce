from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.schemas.cart import WishlistItemOut
from app.services.cart_service import CartService

router = APIRouter(prefix="/wishlist", tags=["Wishlist"])


@router.get("", response_model=List[WishlistItemOut])
def get_wishlist(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Retrieve all products saved in the authenticated user's wishlist.
    """
    return CartService.get_wishlist(db, user_id=current_user.id)


@router.post("/toggle/{product_id}")
def toggle_wishlist_item(
    product_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Add or remove a product from the user's wishlist.
    """
    return CartService.toggle_wishlist(db, user_id=current_user.id, product_id=product_id)
