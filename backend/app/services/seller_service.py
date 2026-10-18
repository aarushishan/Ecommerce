import re
import uuid
from decimal import Decimal
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, distinct
from fastapi import HTTPException, status
from app.models.seller import SellerProfile
from app.models.product import Product, ProductVariant, Inventory, ProductImage, Category
from app.models.order import Order, OrderItem, Shipment
from app.models.user import User, Role
from app.schemas.seller import (
    SellerProfileCreate,
    SellerProfileUpdate,
    SellerProfileOut,
    SellerMetricsOut,
    SellerProductCreate,
    SellerProductUpdate,
    SellerStockUpdate,
    SellerOrderItemOut,
    SellerFulfillmentUpdate
)
from app.services.order_service import OrderService


def slugify(text: str) -> str:
    cleaned = re.sub(r'[^a-zA-Z0-9\s-]', '', text).strip().lower()
    return re.sub(r'[\s-]+', '-', cleaned)


class SellerService:
    @staticmethod
    def get_or_create_seller_profile(
        db: Session,
        user: User,
        data: Optional[SellerProfileCreate] = None
    ) -> SellerProfile:
        profile = db.query(SellerProfile).filter(SellerProfile.user_id == user.id).first()
        if profile:
            return profile

        # Promote user to SELLER role if currently CUSTOMER
        seller_role = db.query(Role).filter(Role.name == "SELLER").first()
        if seller_role and user.role_id != seller_role.id and user.role.name != "ADMIN":
            user.role_id = seller_role.id

        store_name = data.store_name if data else f"{user.first_name}'s Marketplace"
        base_slug = slugify(store_name)
        store_slug = f"{base_slug}-{uuid.uuid4().hex[:6]}"

        profile = SellerProfile(
            user_id=user.id,
            store_name=store_name,
            store_slug=store_slug,
            description=data.description if data else f"Official merchant storefront of {user.first_name} {user.last_name}",
            tax_id=data.tax_id if data else None,
            is_approved=True  # Auto-approved in dev/test sandbox mode
        )
        db.add(profile)
        db.commit()
        db.refresh(profile)
        return profile

    @staticmethod
    def get_seller_profile(db: Session, user_id: str) -> SellerProfile:
        profile = db.query(SellerProfile).filter(SellerProfile.user_id == user_id).first()
        if not profile:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Seller storefront profile not found. Please register as a merchant."
            )
        return profile

    @staticmethod
    def get_seller_metrics(db: Session, seller_id: str) -> SellerMetricsOut:
        # 1. Total revenue & units sold from fulfilled/paid order items
        totals = db.query(
            func.coalesce(func.sum(OrderItem.total_price), 0),
            func.coalesce(func.sum(OrderItem.quantity), 0)
        ).join(Order, OrderItem.order_id == Order.id).filter(
            OrderItem.seller_id == seller_id,
            Order.payment_status.in_(["PAID", "CASH_ON_DELIVERY"])
        ).first()

        total_rev = Decimal(str(totals[0] or "0.00")).quantize(Decimal("0.01"))
        total_units = int(totals[1] or 0)

        # 2. Total distinct orders involving this seller
        distinct_orders = db.query(distinct(OrderItem.order_id)).filter(
            OrderItem.seller_id == seller_id
        ).count()

        # 3. Total active products
        total_prods = db.query(Product).filter(Product.seller_id == seller_id).count()

        # 4. Low stock variants count
        low_stock = db.query(Inventory).join(
            ProductVariant, Inventory.variant_id == ProductVariant.id
        ).join(
            Product, ProductVariant.product_id == Product.id
        ).filter(
            Product.seller_id == seller_id,
            Inventory.quantity <= Inventory.low_stock_threshold
        ).count()

        return SellerMetricsOut(
            total_revenue=total_rev,
            total_orders=distinct_orders,
            total_products=total_prods,
            total_units_sold=total_units,
            low_stock_count=low_stock
        )

    @staticmethod
    def get_seller_products(
        db: Session,
        seller_id: str,
        skip: int = 0,
        limit: int = 50,
        search: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        query = db.query(Product).options(
            joinedload(Product.category),
            joinedload(Product.variants).joinedload(ProductVariant.inventory),
            joinedload(Product.images)
        ).filter(Product.seller_id == seller_id)

        if search:
            query = query.filter(Product.title.ilike(f"%{search}%"))

        products = query.order_by(Product.created_at.desc()).offset(skip).limit(limit).all()

        results = []
        for p in products:
            primary_image = p.images[0].image_url if p.images else "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&q=80"
            variants_data = []
            total_stock = 0
            for v in p.variants:
                qty = v.inventory.quantity if v.inventory else 0
                total_stock += qty
                variants_data.append({
                    "id": v.id,
                    "sku": v.sku,
                    "title": v.title,
                    "price_override": float(v.price_override) if v.price_override is not None else None,
                    "stock_quantity": qty,
                    "low_stock_threshold": v.inventory.low_stock_threshold if v.inventory else 5
                })

            results.append({
                "id": p.id,
                "title": p.title,
                "slug": p.slug,
                "brand": p.brand,
                "category_id": p.category_id,
                "category_name": p.category.name if p.category else "Uncategorized",
                "base_price": float(p.base_price),
                "discount_price": float(p.discount_price) if p.discount_price is not None else None,
                "is_active": p.is_active,
                "is_featured": p.is_featured,
                "total_stock": total_stock,
                "primary_image": primary_image,
                "variants": variants_data,
                "created_at": p.created_at.isoformat()
            })

        return results

    @staticmethod
    def create_product(
        db: Session,
        seller_id: str,
        data: SellerProductCreate
    ) -> Dict[str, Any]:
        # Validate category
        cat = db.query(Category).filter(Category.id == data.category_id).first()
        if not cat:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Selected product category does not exist."
            )

        slug = f"{slugify(data.title)}-{uuid.uuid4().hex[:6]}"
        sku = data.sku or f"SKU-{uuid.uuid4().hex[:8].upper()}"

        product = Product(
            seller_id=seller_id,
            category_id=data.category_id,
            title=data.title,
            slug=slug,
            brand=data.brand,
            description=data.description,
            base_price=data.base_price,
            discount_price=data.discount_price,
            is_active=True,
            is_featured=False
        )
        db.add(product)
        db.flush()

        # Add primary image
        img_url = data.image_url or "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&q=80"
        image = ProductImage(
            product_id=product.id,
            image_url=img_url,
            alt_text=data.title,
            sort_order=0
        )
        db.add(image)

        # Add default variant and inventory
        variant = ProductVariant(
            product_id=product.id,
            sku=sku,
            title="Standard Edition",
            attributes={"edition": "Standard"}
        )
        db.add(variant)
        db.flush()

        inventory = Inventory(
            variant_id=variant.id,
            quantity=data.initial_stock,
            reserved_qty=0,
            low_stock_threshold=5
        )
        db.add(inventory)

        db.commit()
        db.refresh(product)

        return {
            "id": product.id,
            "title": product.title,
            "slug": product.slug,
            "sku": variant.sku,
            "base_price": float(product.base_price),
            "initial_stock": data.initial_stock,
            "message": "Product created successfully."
        }

    @staticmethod
    def update_product(
        db: Session,
        seller_id: str,
        product_id: str,
        data: SellerProductUpdate
    ) -> Dict[str, Any]:
        product = db.query(Product).filter(
            Product.id == product_id,
            Product.seller_id == seller_id
        ).first()

        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Product not found or not owned by your merchant storefront."
            )

        if data.title is not None:
            product.title = data.title
        if data.category_id is not None:
            product.category_id = data.category_id
        if data.brand is not None:
            product.brand = data.brand
        if data.description is not None:
            product.description = data.description
        if data.base_price is not None:
            product.base_price = data.base_price
        if data.discount_price is not None:
            product.discount_price = data.discount_price
        if data.is_active is not None:
            product.is_active = data.is_active
        if data.is_featured is not None:
            product.is_featured = data.is_featured

        db.commit()
        db.refresh(product)

        return {
            "id": product.id,
            "title": product.title,
            "is_active": product.is_active,
            "message": "Product updated successfully."
        }

    @staticmethod
    def update_variant_stock(
        db: Session,
        seller_id: str,
        variant_id: str,
        stock_data: SellerStockUpdate
    ) -> Dict[str, Any]:
        variant = db.query(ProductVariant).options(
            joinedload(ProductVariant.product),
            joinedload(ProductVariant.inventory)
        ).filter(ProductVariant.id == variant_id).first()

        if not variant or variant.product.seller_id != seller_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Variant not found or does not belong to your store catalog."
            )

        # ROW-LEVEL LOCK ON INVENTORY
        inventory = db.query(Inventory).filter(
            Inventory.variant_id == variant.id
        ).with_for_update().first()

        if not inventory:
            inventory = Inventory(
                variant_id=variant.id,
                quantity=stock_data.quantity,
                low_stock_threshold=stock_data.low_stock_threshold or 5
            )
            db.add(inventory)
        else:
            inventory.quantity = stock_data.quantity
            if stock_data.low_stock_threshold is not None:
                inventory.low_stock_threshold = stock_data.low_stock_threshold

        db.commit()
        db.refresh(inventory)

        return {
            "variant_id": variant.id,
            "sku": variant.sku,
            "quantity": inventory.quantity,
            "low_stock_threshold": inventory.low_stock_threshold,
            "message": "Inventory stock updated successfully."
        }

    @staticmethod
    def get_seller_order_items(db: Session, seller_id: str) -> List[SellerOrderItemOut]:
        items = db.query(OrderItem).options(
            joinedload(OrderItem.order).joinedload(Order.shipping_address)
        ).filter(
            OrderItem.seller_id == seller_id
        ).all()

        results = []
        for it in items:
            order = it.order
            shipping_addr = order.shipping_address if order else None
            results.append(
                SellerOrderItemOut(
                    id=it.id,
                    order_id=it.order_id,
                    order_number=order.order_number if order else "N/A",
                    order_status=order.status if order else "UNKNOWN",
                    product_id=it.product_id,
                    variant_id=it.variant_id,
                    product_title=it.product_title,
                    unit_price=it.unit_price,
                    quantity=it.quantity,
                    total_price=it.total_price,
                    shipping_name=shipping_addr.full_name if shipping_addr else "Customer",
                    shipping_city=shipping_addr.city if shipping_addr else "Standard City",
                    created_at=order.created_at if order else it.order.created_at
                )
            )

        return sorted(results, key=lambda x: x.created_at, reverse=True)
