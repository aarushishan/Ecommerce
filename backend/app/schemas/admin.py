from typing import Optional, List, Dict, Any
from decimal import Decimal
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class AdminKpiMetrics(BaseModel):
    gmv: Decimal
    total_orders: int
    total_users: int
    active_sellers: int
    pending_seller_approvals: int
    total_products: int
    low_stock_alerts: int
    pending_reviews_moderation: int
    recent_sales_trend: List[Dict[str, Any]] = []


class AdminUserOut(BaseModel):
    id: str
    email: str
    first_name: str
    last_name: str
    phone_number: Optional[str] = None
    role_id: int
    role_name: str
    is_active: bool
    is_verified: bool
    orders_count: int = 0
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UserRoleUpdate(BaseModel):
    role_name: Optional[str] = Field(None, description="CUSTOMER, SELLER, or ADMIN")
    is_active: Optional[bool] = None


class SellerApprovalUpdate(BaseModel):
    is_approved: bool


class CategoryCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=64)
    slug: Optional[str] = None
    parent_id: Optional[int] = None
    image_url: Optional[str] = None
    is_active: bool = True


class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    slug: Optional[str] = None
    parent_id: Optional[int] = None
    image_url: Optional[str] = None
    is_active: Optional[bool] = None


class ReviewModerationUpdate(BaseModel):
    is_approved: bool


class AdminProductVisibilityUpdate(BaseModel):
    is_active: Optional[bool] = None
    is_featured: Optional[bool] = None


class AuditLogOut(BaseModel):
    id: str
    user_id: Optional[str] = None
    user_email: Optional[str] = None
    action: str
    target_entity: str
    target_id: str
    old_value: Optional[Dict[str, Any]] = None
    new_value: Optional[Dict[str, Any]] = None
    ip_address: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
