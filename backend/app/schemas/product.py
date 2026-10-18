from typing import Optional, List, Dict, Any
from decimal import Decimal
from datetime import datetime
from pydantic import BaseModel, ConfigDict


class ProductImageOut(BaseModel):
    id: str
    image_url: str
    alt_text: Optional[str] = None
    sort_order: int

    model_config = ConfigDict(from_attributes=True)


class ProductVariantOut(BaseModel):
    id: str
    sku: str
    title: str
    price_override: Optional[Decimal] = None
    attributes: Dict[str, Any]
    stock_quantity: int = 0
    in_stock: bool = True

    model_config = ConfigDict(from_attributes=True)


class ProductReviewOut(BaseModel):
    id: str
    user_name: str
    rating: int
    title: Optional[str] = None
    comment: str
    is_verified: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ProductSummaryOut(BaseModel):
    id: str
    title: str
    slug: str
    brand: str
    base_price: Decimal
    discount_price: Optional[Decimal] = None
    rating_avg: Decimal
    rating_count: int
    primary_image: Optional[str] = None
    category_id: int
    category_name: Optional[str] = None
    category_slug: Optional[str] = None
    is_featured: bool
    in_stock: bool
    discount_percentage: Optional[int] = 0

    model_config = ConfigDict(from_attributes=True)


class ProductDetailOut(BaseModel):
    id: str
    title: str
    slug: str
    brand: str
    description: str
    base_price: Decimal
    discount_price: Optional[Decimal] = None
    discount_percentage: Optional[int] = 0
    rating_avg: Decimal
    rating_count: int
    category_id: int
    category_name: str
    category_slug: str
    seller_name: str
    seller_slug: str
    is_featured: bool
    in_stock: bool
    total_stock: int
    images: List[ProductImageOut]
    variants: List[ProductVariantOut]
    reviews: List[ProductReviewOut]

    model_config = ConfigDict(from_attributes=True)


class PaginatedProductsOut(BaseModel):
    items: List[ProductSummaryOut]
    total: int
    page: int
    limit: int
    total_pages: int
    available_brands: List[str]
    min_price_found: Decimal
    max_price_found: Decimal
