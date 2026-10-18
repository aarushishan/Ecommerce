from typing import Optional, List, Dict, Any
from decimal import Decimal
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class SellerProfileCreate(BaseModel):
    store_name: str = Field(..., min_length=2, max_length=128)
    description: Optional[str] = None
    tax_id: Optional[str] = None


class SellerProfileUpdate(BaseModel):
    store_name: Optional[str] = None
    description: Optional[str] = None
    tax_id: Optional[str] = None


class SellerProfileOut(BaseModel):
    id: str
    user_id: str
    store_name: str
    store_slug: str
    description: Optional[str] = None
    tax_id: Optional[str] = None
    is_approved: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SellerMetricsOut(BaseModel):
    total_revenue: Decimal
    total_orders: int
    total_products: int
    total_units_sold: int
    low_stock_count: int


class SellerProductCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=255)
    category_id: int
    brand: str
    description: str
    base_price: Decimal
    discount_price: Optional[Decimal] = None
    image_url: Optional[str] = "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&q=80"
    initial_stock: int = Field(default=10, ge=0)
    sku: Optional[str] = None


class SellerProductUpdate(BaseModel):
    title: Optional[str] = None
    category_id: Optional[int] = None
    brand: Optional[str] = None
    description: Optional[str] = None
    base_price: Optional[Decimal] = None
    discount_price: Optional[Decimal] = None
    is_active: Optional[bool] = None
    is_featured: Optional[bool] = None


class SellerStockUpdate(BaseModel):
    variant_id: str
    quantity: int = Field(..., ge=0)
    low_stock_threshold: Optional[int] = 5


class SellerOrderItemOut(BaseModel):
    id: str
    order_id: str
    order_number: str
    order_status: str
    product_id: str
    variant_id: str
    product_title: str
    unit_price: Decimal
    quantity: int
    total_price: Decimal
    shipping_name: Optional[str] = None
    shipping_city: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SellerFulfillmentUpdate(BaseModel):
    status: str = Field(..., description="PROCESSING, SHIPPED, etc.")
    notes: Optional[str] = None
