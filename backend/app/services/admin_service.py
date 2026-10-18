import re
import uuid
from decimal import Decimal
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, distinct, desc
from fastapi import HTTPException, status
from app.models.user import User, Role
from app.models.seller import SellerProfile
from app.models.product import Product, Category, Inventory, ProductVariant
from app.models.order import Order
from app.models.review import Review
from app.models.audit import AuditLog
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


def record_audit_log(
    db: Session,
    user_id: Optional[str],
    action: str,
    target_entity: str,
    target_id: str,
    old_value: Optional[Dict[str, Any]] = None,
    new_value: Optional[Dict[str, Any]] = None,
    ip_address: Optional[str] = None
):
    log = AuditLog(
        user_id=user_id,
        action=action,
        target_entity=target_entity,
        target_id=target_id,
        old_value=old_value,
        new_value=new_value,
        ip_address=ip_address
    )
    db.add(log)


class AdminService:
    @staticmethod
    def get_platform_kpis(db: Session) -> AdminKpiMetrics:
        # GMV (Total Revenue)
        gmv_raw = db.query(func.coalesce(func.sum(Order.total_amount), 0)).filter(
            Order.payment_status.in_(["PAID", "CASH_ON_DELIVERY"])
        ).scalar()
        gmv = Decimal(str(gmv_raw or "0.00")).quantize(Decimal("0.01"))

        total_orders = db.query(Order).count()
        total_users = db.query(User).count()
        active_sellers = db.query(SellerProfile).filter(SellerProfile.is_approved == True).count()
        pending_sellers = db.query(SellerProfile).filter(SellerProfile.is_approved == False).count()
        total_products = db.query(Product).count()

        low_stock = db.query(Inventory).filter(
            Inventory.quantity <= Inventory.low_stock_threshold
        ).count()

        pending_reviews = db.query(Review).filter(Review.is_approved == False).count()

        # Last 7 days sales trend
        trend = []
        now = datetime.now(timezone.utc)
        for i in range(6, -1, -1):
            day_start = (now - timedelta(days=i)).replace(hour=0, minute=0, second=0, microsecond=0)
            day_end = day_start + timedelta(days=1)
            day_label = day_start.strftime("%b %d")

            day_stats = db.query(
                func.coalesce(func.sum(Order.total_amount), 0),
                func.count(Order.id)
            ).filter(
                Order.created_at >= day_start,
                Order.created_at < day_end,
                Order.payment_status.in_(["PAID", "CASH_ON_DELIVERY"])
            ).first()

            trend.append({
                "date": day_label,
                "amount": float(Decimal(str(day_stats[0] or "0.00")).quantize(Decimal("0.01"))),
                "count": int(day_stats[1] or 0)
            })

        return AdminKpiMetrics(
            gmv=gmv,
            total_orders=total_orders,
            total_users=total_users,
            active_sellers=active_sellers,
            pending_seller_approvals=pending_sellers,
            total_products=total_products,
            low_stock_alerts=low_stock,
            pending_reviews_moderation=pending_reviews,
            recent_sales_trend=trend
        )

    @staticmethod
    def get_users_directory(
        db: Session,
        skip: int = 0,
        limit: int = 50,
        search: Optional[str] = None,
        role_filter: Optional[str] = None
    ) -> List[AdminUserOut]:
        query = db.query(User).options(joinedload(User.role))

        if search:
            query = query.filter(
                (User.email.ilike(f"%{search}%")) |
                (User.first_name.ilike(f"%{search}%")) |
                (User.last_name.ilike(f"%{search}%"))
            )

        if role_filter:
            query = query.join(Role).filter(Role.name == role_filter.upper())

        users = query.order_by(User.created_at.desc()).offset(skip).limit(limit).all()

        results = []
        for u in users:
            orders_cnt = db.query(Order).filter(Order.user_id == u.id).count()
            results.append(
                AdminUserOut(
                    id=u.id,
                    email=u.email,
                    first_name=u.first_name,
                    last_name=u.last_name,
                    phone_number=u.phone_number,
                    role_id=u.role_id,
                    role_name=u.role.name if u.role else "CUSTOMER",
                    is_active=u.is_active,
                    is_verified=u.is_verified,
                    orders_count=orders_cnt,
                    created_at=u.created_at
                )
            )

        return results

    @staticmethod
    def update_user_role_and_status(
        db: Session,
        admin_user: User,
        target_user_id: str,
        data: UserRoleUpdate,
        ip_address: Optional[str] = None
    ) -> Dict[str, Any]:
        target = db.query(User).options(joinedload(User.role)).filter(User.id == target_user_id).first()
        if not target:
            raise HTTPException(status_code=404, detail="Target user not found.")

        old_state = {
            "role": target.role.name if target.role else "CUSTOMER",
            "is_active": target.is_active
        }

        if data.role_name:
            role = db.query(Role).filter(Role.name == data.role_name.upper()).first()
            if not role:
                raise HTTPException(status_code=400, detail=f"Role '{data.role_name}' does not exist.")
            target.role_id = role.id

        if data.is_active is not None:
            target.is_active = data.is_active

        new_state = {
            "role": data.role_name.upper() if data.role_name else old_state["role"],
            "is_active": target.is_active
        }

        record_audit_log(
            db,
            user_id=admin_user.id,
            action="UPDATE_USER_ROLE_OR_STATUS",
            target_entity="USER",
            target_id=target.id,
            old_value=old_state,
            new_value=new_state,
            ip_address=ip_address
        )

        db.commit()
        db.refresh(target)

        return {
            "id": target.id,
            "email": target.email,
            "role_name": target.role.name if target.role else "CUSTOMER",
            "is_active": target.is_active,
            "message": "User updated successfully."
        }

    @staticmethod
    def get_sellers_queue(db: Session, status_filter: Optional[str] = None) -> List[Dict[str, Any]]:
        query = db.query(SellerProfile).options(joinedload(SellerProfile.user))

        if status_filter == "pending":
            query = query.filter(SellerProfile.is_approved == False)
        elif status_filter == "approved":
            query = query.filter(SellerProfile.is_approved == True)

        sellers = query.order_by(SellerProfile.created_at.desc()).all()
        results = []
        for s in sellers:
            prod_count = db.query(Product).filter(Product.seller_id == s.id).count()
            results.append({
                "id": s.id,
                "user_id": s.user_id,
                "user_email": s.user.email if s.user else "N/A",
                "owner_name": f"{s.user.first_name} {s.user.last_name}" if s.user else "Merchant",
                "store_name": s.store_name,
                "store_slug": s.store_slug,
                "description": s.description,
                "tax_id": s.tax_id,
                "is_approved": s.is_approved,
                "products_count": prod_count,
                "created_at": s.created_at.isoformat()
            })
        return results

    @staticmethod
    def update_seller_approval(
        db: Session,
        admin_user: User,
        seller_id: str,
        is_approved: bool,
        ip_address: Optional[str] = None
    ) -> Dict[str, Any]:
        seller = db.query(SellerProfile).filter(SellerProfile.id == seller_id).first()
        if not seller:
            raise HTTPException(status_code=404, detail="Seller profile not found.")

        old_val = {"is_approved": seller.is_approved}
        seller.is_approved = is_approved
        new_val = {"is_approved": is_approved}

        record_audit_log(
            db,
            user_id=admin_user.id,
            action="UPDATE_SELLER_APPROVAL",
            target_entity="SELLER_PROFILE",
            target_id=seller.id,
            old_value=old_val,
            new_value=new_val,
            ip_address=ip_address
        )

        db.commit()
        return {
            "id": seller.id,
            "store_name": seller.store_name,
            "is_approved": seller.is_approved,
            "message": f"Seller approval status updated to {is_approved}."
        }

    @staticmethod
    def create_category(db: Session, admin_user: User, data: CategoryCreate) -> Dict[str, Any]:
        slug = data.slug or re.sub(r'[\s-]+', '-', re.sub(r'[^a-zA-Z0-9\s-]', '', data.name).strip().lower())
        cat = Category(
            name=data.name,
            slug=slug,
            parent_id=data.parent_id,
            image_url=data.image_url,
            is_active=data.is_active
        )
        db.add(cat)
        db.flush()

        record_audit_log(
            db,
            user_id=admin_user.id,
            action="CREATE_CATEGORY",
            target_entity="CATEGORY",
            target_id=str(cat.id),
            new_value={"name": cat.name, "slug": cat.slug}
        )

        db.commit()
        db.refresh(cat)
        return {"id": cat.id, "name": cat.name, "slug": cat.slug, "message": "Category created."}

    @staticmethod
    def update_category(db: Session, admin_user: User, cat_id: int, data: CategoryUpdate) -> Dict[str, Any]:
        cat = db.query(Category).filter(Category.id == cat_id).first()
        if not cat:
            raise HTTPException(status_code=404, detail="Category not found.")

        old_val = {"name": cat.name, "slug": cat.slug, "is_active": cat.is_active}
        if data.name is not None:
            cat.name = data.name
        if data.slug is not None:
            cat.slug = data.slug
        if data.parent_id is not None:
            cat.parent_id = data.parent_id
        if data.image_url is not None:
            cat.image_url = data.image_url
        if data.is_active is not None:
            cat.is_active = data.is_active

        new_val = {"name": cat.name, "slug": cat.slug, "is_active": cat.is_active}
        record_audit_log(
            db,
            user_id=admin_user.id,
            action="UPDATE_CATEGORY",
            target_entity="CATEGORY",
            target_id=str(cat.id),
            old_value=old_val,
            new_value=new_val
        )

        db.commit()
        return {"id": cat.id, "name": cat.name, "is_active": cat.is_active, "message": "Category updated."}

    @staticmethod
    def toggle_product_visibility(
        db: Session,
        admin_user: User,
        product_id: str,
        data: AdminProductVisibilityUpdate
    ) -> Dict[str, Any]:
        product = db.query(Product).filter(Product.id == product_id).first()
        if not product:
            raise HTTPException(status_code=404, detail="Product not found.")

        old_val = {"is_active": product.is_active, "is_featured": product.is_featured}
        if data.is_active is not None:
            product.is_active = data.is_active
        if data.is_featured is not None:
            product.is_featured = data.is_featured

        new_val = {"is_active": product.is_active, "is_featured": product.is_featured}

        record_audit_log(
            db,
            user_id=admin_user.id,
            action="TOGGLE_PRODUCT_VISIBILITY",
            target_entity="PRODUCT",
            target_id=product.id,
            old_value=old_val,
            new_value=new_val
        )

        db.commit()
        return {"id": product.id, "title": product.title, "is_active": product.is_active, "is_featured": product.is_featured}

    @staticmethod
    def get_reviews_moderation_queue(db: Session, approved: Optional[bool] = None) -> List[Dict[str, Any]]:
        query = db.query(Review).options(
            joinedload(Review.user),
            joinedload(Review.product)
        )
        if approved is not None:
            query = query.filter(Review.is_approved == approved)

        reviews = query.order_by(Review.created_at.desc()).all()
        results = []
        for r in reviews:
            results.append({
                "id": r.id,
                "product_id": r.product_id,
                "product_title": r.product.title if r.product else "N/A",
                "user_name": f"{r.user.first_name} {r.user.last_name}" if r.user else "Anonymous",
                "user_email": r.user.email if r.user else "N/A",
                "rating": r.rating,
                "title": r.title,
                "comment": r.comment,
                "is_verified": r.is_verified,
                "is_approved": r.is_approved,
                "created_at": r.created_at.isoformat()
            })
        return results

    @staticmethod
    def update_review_moderation(
        db: Session,
        admin_user: User,
        review_id: str,
        is_approved: bool
    ) -> Dict[str, Any]:
        review = db.query(Review).filter(Review.id == review_id).first()
        if not review:
            raise HTTPException(status_code=404, detail="Review not found.")

        old_val = {"is_approved": review.is_approved}
        review.is_approved = is_approved
        new_val = {"is_approved": is_approved}

        record_audit_log(
            db,
            user_id=admin_user.id,
            action="MODERATE_REVIEW",
            target_entity="REVIEW",
            target_id=review.id,
            old_value=old_val,
            new_value=new_val
        )

        db.commit()
        return {"id": review.id, "is_approved": review.is_approved, "message": "Review moderation updated."}

    @staticmethod
    def get_audit_logs(
        db: Session,
        skip: int = 0,
        limit: int = 50,
        action: Optional[str] = None
    ) -> List[AuditLogOut]:
        query = db.query(AuditLog).options(joinedload(AuditLog.user))
        if action:
            query = query.filter(AuditLog.action == action)

        logs = query.order_by(AuditLog.created_at.desc()).offset(skip).limit(limit).all()

        results = []
        for l in logs:
            results.append(
                AuditLogOut(
                    id=l.id,
                    user_id=l.user_id,
                    user_email=l.user.email if l.user else None,
                    action=l.action,
                    target_entity=l.target_entity,
                    target_id=l.target_id,
                    old_value=l.old_value,
                    new_value=l.new_value,
                    ip_address=l.ip_address,
                    created_at=l.created_at
                )
            )

        return results
