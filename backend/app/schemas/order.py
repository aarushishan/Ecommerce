from typing import Optional, List, Any, Dict
from decimal import Decimal
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field
from app.schemas.user import AddressOut


class OrderCreate(BaseModel):
    shipping_address_id: str
    payment_method: Optional[str] = Field(default="MOCK", description="MOCK, STRIPE, RAZORPAY, or COD")
    delivery_notes: Optional[str] = None
    coupon_code: Optional[str] = None


class OrderItemOut(BaseModel):
    id: str
    product_id: str
    variant_id: str
    product_title: str
    unit_price: Decimal
    quantity: int
    total_price: Decimal

    model_config = ConfigDict(from_attributes=True)


class PaymentOut(BaseModel):
    id: str
    order_id: str
    provider: str
    transaction_id: str
    amount: Decimal
    currency: str = "INR"
    status: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TimelineEvent(BaseModel):
    status: str
    title: str
    description: str
    timestamp: str
    location: Optional[str] = None


class ShipmentOut(BaseModel):
    id: str
    order_id: str
    carrier: str
    tracking_number: Optional[str] = None
    status: str
    current_location: Optional[str] = None
    estimated_delivery: Optional[datetime] = None
    timeline: Optional[List[Dict[str, Any]]] = None
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class OrderOut(BaseModel):
    id: str
    order_number: str
    user_id: str
    shipping_address_id: str
    shipping_address: Optional[AddressOut] = None
    items: List[OrderItemOut]
    subtotal: Decimal
    discount_amount: Decimal
    shipping_fee: Decimal
    tax_amount: Decimal
    total_amount: Decimal
    status: str
    payment_status: str
    payment: Optional[PaymentOut] = None
    shipment: Optional[ShipmentOut] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class OrderStatusUpdate(BaseModel):
    status: str = Field(..., description="Target status: CONFIRMED, PROCESSING, SHIPPED, DELIVERED, CANCELLED")
    notes: Optional[str] = None
    location: Optional[str] = None
