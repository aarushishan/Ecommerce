from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, status, Query, Request
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.dependencies import get_current_active_admin
from app.models.user import User
from app.schemas.admin import (
    AdminKpiMetrics,
    AdminUserOut,
    UserRoleUpdate,
    SellerApprovalUpdate,
    CategoryCreate,
    CategoryUpdate,
    ReviewModerationUpdate,
    AdminProductVisibilityUpdate,
    AuditLogOut
)
from app.services.admin_service import AdminService

router = APIRouter(prefix="/admin", tags=["Admin Portal"])


@router.get("/kpis", response_model=AdminKpiMetrics)
def get_platform_kpis(
    current_admin: User = Depends(get_current_active_admin),
    db: Session = Depends(get_db)
):
    """
    Supervisory command center KPIs: GMV, order volume, active merchants, and revenue trends.
    """
    return AdminService.get_platform_kpis(db)


@router.get("/users", response_model=List[AdminUserOut])
def get_users_directory(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    search: Optional[str] = None,
    role: Optional[str] = None,
    current_admin: User = Depends(get_current_active_admin),
    db: Session = Depends(get_db)
):
    """
    Searchable user directory with role badges and order counts.
    """
    return AdminService.get_users_directory(
        db,
        skip=skip,
        limit=limit,
        search=search,
        role_filter=role
    )


@router.patch("/users/{user_id}")
def update_user_role_and_status(
    user_id: str,
    data: UserRoleUpdate,
    request: Request,
    current_admin: User = Depends(get_current_active_admin),
    db: Session = Depends(get_db)
):
    """
    Promote/demote user roles or toggle account active status. Records immutable audit log.
    """
    ip_addr = request.client.host if request.client else None
    return AdminService.update_user_role_and_status(
        db,
        admin_user=current_admin,
        target_user_id=user_id,
        data=data,
        ip_address=ip_addr
    )


@router.get("/sellers")
def get_sellers_queue(
    status: Optional[str] = None,
    current_admin: User = Depends(get_current_active_admin),
    db: Session = Depends(get_db)
):
    """
    Seller merchant onboarding and verification queue.
    """
    return AdminService.get_sellers_queue(db, status_filter=status)


@router.patch("/sellers/{seller_id}/approval")
def update_seller_approval(
    seller_id: str,
    data: SellerApprovalUpdate,
    request: Request,
    current_admin: User = Depends(get_current_active_admin),
    db: Session = Depends(get_db)
):
    """
    Approve or suspend a merchant store. Records immutable audit log.
    """
    ip_addr = request.client.host if request.client else None
    return AdminService.update_seller_approval(
        db,
        admin_user=current_admin,
        seller_id=seller_id,
        is_approved=data.is_approved,
        ip_address=ip_addr
    )


@router.post("/categories", status_code=status.HTTP_201_CREATED)
def create_category(
    data: CategoryCreate,
    current_admin: User = Depends(get_current_active_admin),
    db: Session = Depends(get_db)
):
    """
    Create a new product catalog category.
    """
    return AdminService.create_category(db, admin_user=current_admin, data=data)


@router.patch("/categories/{category_id}")
def update_category(
    category_id: int,
    data: CategoryUpdate,
    current_admin: User = Depends(get_current_active_admin),
    db: Session = Depends(get_db)
):
    """
    Update category name, slug, or visibility.
    """
    return AdminService.update_category(db, admin_user=current_admin, cat_id=category_id, data=data)


@router.patch("/products/{product_id}/visibility")
def toggle_product_visibility(
    product_id: str,
    data: AdminProductVisibilityUpdate,
    current_admin: User = Depends(get_current_active_admin),
    db: Session = Depends(get_db)
):
    """
    Unpublish non-compliant products or feature products on homepage.
    """
    return AdminService.toggle_product_visibility(
        db,
        admin_user=current_admin,
        product_id=product_id,
        data=data
    )


@router.get("/reviews")
def get_reviews_moderation_queue(
    approved: Optional[bool] = None,
    current_admin: User = Depends(get_current_active_admin),
    db: Session = Depends(get_db)
):
    """
    Review moderation queue to combat spam and verify ratings.
    """
    return AdminService.get_reviews_moderation_queue(db, approved=approved)


@router.patch("/reviews/{review_id}/moderation")
def update_review_moderation(
    review_id: str,
    data: ReviewModerationUpdate,
    current_admin: User = Depends(get_current_active_admin),
    db: Session = Depends(get_db)
):
    """
    Approve or reject a submitted product review.
    """
    return AdminService.update_review_moderation(
        db,
        admin_user=current_admin,
        review_id=review_id,
        is_approved=data.is_approved
    )


@router.get("/audit-logs", response_model=List[AuditLogOut])
def get_audit_logs(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    action: Optional[str] = None,
    current_admin: User = Depends(get_current_active_admin),
    db: Session = Depends(get_db)
):
    """
    Retrieve immutable audit trail tracking sensitive modifications.
    """
    return AdminService.get_audit_logs(db, skip=skip, limit=limit, action=action)
