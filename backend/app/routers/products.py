from typing import Optional, List
from decimal import Decimal
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.schemas.product import (
    PaginatedProductsOut,
    ProductDetailOut,
    ProductSummaryOut
)
from app.services.product_service import ProductService

router = APIRouter(prefix="/products", tags=["Products"])


@router.get("", response_model=PaginatedProductsOut, status_code=status.HTTP_200_OK)
def list_products(
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(12, ge=1, le=100, description="Items per page"),
    search: Optional[str] = Query(None, description="Keyword search in title, brand, description"),
    category: Optional[str] = Query(None, description="Category slug or ID"),
    brand: Optional[str] = Query(None, description="Comma-separated brand filter"),
    min_price: Optional[Decimal] = Query(None, ge=0, description="Minimum price filter"),
    max_price: Optional[Decimal] = Query(None, ge=0, description="Maximum price filter"),
    min_rating: Optional[Decimal] = Query(None, ge=0, le=5, description="Minimum customer star rating"),
    in_stock: bool = Query(False, description="Filter only items currently in stock"),
    sort: str = Query("featured", description="Sorting criteria (featured, price_asc, price_desc, rating_desc, newest, popular)"),
    db: Session = Depends(get_db)
):
    """
    Paginated and multi-faceted product catalog query endpoint.
    Supports instant full-text search, multi-brand selection, price range sliders,
    star rating thresholds, stock availability, and multiple sort orders.
    """
    return ProductService.list_products(
        db=db,
        page=page,
        limit=limit,
        search=search,
        category=category,
        brand=brand,
        min_price=min_price,
        max_price=max_price,
        min_rating=min_rating,
        in_stock_only=in_stock,
        sort=sort
    )


@router.get("/featured", response_model=List[ProductSummaryOut], status_code=status.HTTP_200_OK)
def get_featured_products(
    limit: int = Query(8, ge=1, le=20),
    db: Session = Depends(get_db)
):
    """
    Returns top curated featured items for homepage highlights.
    """
    result = ProductService.list_products(db=db, page=1, limit=limit, sort="featured")
    return result.items


@router.get("/trending", response_model=List[ProductSummaryOut], status_code=status.HTTP_200_OK)
def get_trending_products(
    limit: int = Query(8, ge=1, le=20),
    db: Session = Depends(get_db)
):
    """
    Returns most popular trending items based on ratings and views.
    """
    result = ProductService.list_products(db=db, page=1, limit=limit, sort="popular")
    return result.items


@router.get("/{slug_or_id}", response_model=ProductDetailOut, status_code=status.HTTP_200_OK)
def get_product_detail(slug_or_id: str, db: Session = Depends(get_db)):
    """
    Returns comprehensive product details, multi-angle images, variants with live stock,
    and verified customer reviews.
    """
    product = ProductService.get_product_detail(db, slug_or_id)
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Product '{slug_or_id}' was not found or is currently inactive."
        )
    return product


@router.get("/{product_id}/related", response_model=List[ProductSummaryOut], status_code=status.HTTP_200_OK)
def get_related_products(
    product_id: str,
    limit: int = Query(4, ge=1, le=12),
    db: Session = Depends(get_db)
):
    """
    Returns related products within the same category or brand.
    """
    return ProductService.get_related_products(db, product_id, limit)
