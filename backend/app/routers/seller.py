from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, status, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.dependencies import get_current_user, get_current_active_seller
from app.models.user import User
from app.schemas.seller import (
    SellerProfileCreate,
    SellerProfileOut,
    SellerMetricsOut,
    SellerProductCreate,
    SellerProductUpdate,
    SellerStockUpdate,
    SellerOrderItemOut
)
from app.services.seller_service import SellerService

router = APIRouter(prefix="/seller", tags=["Seller Portal"])


@router.post("/onboard", response_model=SellerProfileOut, status_code=status.HTTP_201_CREATED)
def onboard_seller(
    data: Optional[SellerProfileCreate] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Onboard authenticated user to merchant storefront status (promotes role to SELLER).
    """
    return SellerService.get_or_create_seller_profile(db, user=current_user, data=data)


@router.get("/profile", response_model=SellerProfileOut)
def get_store_profile(
    current_user: User = Depends(get_current_active_seller),
    db: Session = Depends(get_db)
):
    """
    Get current seller's store profile.
    """
    return SellerService.get_seller_profile(db, user_id=current_user.id)


@router.get("/metrics", response_model=SellerMetricsOut)
def get_store_metrics(
    current_user: User = Depends(get_current_active_seller),
    db: Session = Depends(get_db)
):
    """
    Calculate live performance KPIs for the seller:
    Total revenue, units sold, orders fulfilled, catalog size, and low stock count.
    """
    profile = SellerService.get_seller_profile(db, user_id=current_user.id)
    return SellerService.get_seller_metrics(db, seller_id=profile.id)


@router.get("/products")
def get_seller_products(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    search: Optional[str] = None,
    current_user: User = Depends(get_current_active_seller),
    db: Session = Depends(get_db)
):
    """
    List products owned by the authenticated seller's store.
    """
    profile = SellerService.get_seller_profile(db, user_id=current_user.id)
    return SellerService.get_seller_products(
        db,
        seller_id=profile.id,
        skip=skip,
        limit=limit,
        search=search
    )


@router.post("/products", status_code=status.HTTP_201_CREATED)
def create_seller_product(
    data: SellerProductCreate,
    current_user: User = Depends(get_current_active_seller),
    db: Session = Depends(get_db)
):
    """
    Create a new product with default variant and initial inventory stock.
    """
    profile = SellerService.get_seller_profile(db, user_id=current_user.id)
    return SellerService.create_product(db, seller_id=profile.id, data=data)


@router.patch("/products/{product_id}")
def update_seller_product(
    product_id: str,
    data: SellerProductUpdate,
    current_user: User = Depends(get_current_active_seller),
    db: Session = Depends(get_db)
):
    """
    Update catalog details of a product owned by the seller.
    """
    profile = SellerService.get_seller_profile(db, user_id=current_user.id)
    return SellerService.update_product(
        db,
        seller_id=profile.id,
        product_id=product_id,
        data=data
    )


@router.patch("/inventory/{variant_id}")
def update_variant_stock(
    variant_id: str,
    stock_data: SellerStockUpdate,
    current_user: User = Depends(get_current_active_seller),
    db: Session = Depends(get_db)
):
    """
    Directly adjust inventory quantity and threshold with row-level locking.
    """
    profile = SellerService.get_seller_profile(db, user_id=current_user.id)
    return SellerService.update_variant_stock(
        db,
        seller_id=profile.id,
        variant_id=variant_id,
        stock_data=stock_data
    )


@router.get("/orders", response_model=List[SellerOrderItemOut])
def get_seller_orders(
    current_user: User = Depends(get_current_active_seller),
    db: Session = Depends(get_db)
):
    """
    Retrieve live stream of customer order line items assigned to this seller.
    """
    profile = SellerService.get_seller_profile(db, user_id=current_user.id)
    return SellerService.get_seller_order_items(db, seller_id=profile.id)
