from typing import Optional, List
from decimal import Decimal
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class CartItemCreate(BaseModel):
    product_id: str
    variant_id: str
    quantity: int = Field(1, ge=1, description="Quantity to add (minimum 1)")


class CartItemUpdate(BaseModel):
    quantity: int = Field(..., ge=1, description="Updated quantity")


class CartItemOut(BaseModel):
    id: str
    product_id: str
    variant_id: str
    product_title: str
    product_slug: str
    variant_title: str
    brand: str
    image_url: Optional[str] = None
    unit_price: Decimal
    base_price: Decimal
    quantity: int
    total_price: Decimal
    in_stock: bool
    max_stock: int

    model_config = ConfigDict(from_attributes=True)


class CartOut(BaseModel):
    id: str
    items: List[CartItemOut]
    total_items: int
    subtotal: Decimal
    discount_amount: Decimal
    shipping_fee: Decimal
    tax_amount: Decimal
    total_amount: Decimal
    free_shipping_threshold: Decimal = Decimal("499.00")
    eligible_for_free_shipping: bool

    model_config = ConfigDict(from_attributes=True)


class WishlistItemOut(BaseModel):
    id: str
    product_id: str
    product_title: str
    product_slug: str
    brand: str
    image_url: Optional[str] = None
    base_price: Decimal
    discount_price: Optional[Decimal] = None
    in_stock: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
