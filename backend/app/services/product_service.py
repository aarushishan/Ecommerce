import math
from typing import Optional, List, Dict, Any
from decimal import Decimal
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, and_, desc, asc, func
from app.models.product import Category, Product, ProductImage, ProductVariant, Inventory
from app.models.review import Review
from app.schemas.product import (
    ProductSummaryOut,
    ProductDetailOut,
    ProductImageOut,
    ProductVariantOut,
    ProductReviewOut,
    PaginatedProductsOut
)
from app.schemas.category import CategoryOut


def calculate_discount_percentage(base_price: Decimal, discount_price: Optional[Decimal]) -> int:
    if not discount_price or discount_price >= base_price:
        return 0
    ratio = (base_price - discount_price) / base_price
    return int(round(ratio * 100))


def transform_product_summary(product: Product) -> ProductSummaryOut:
    primary_img = None
    if product.images:
        sorted_images = sorted(product.images, key=lambda x: x.sort_order)
        primary_img = sorted_images[0].image_url

    # Check total available inventory across variants
    total_qty = 0
    for v in product.variants:
        if v.inventory:
            total_qty += max(0, v.inventory.quantity - v.inventory.reserved_qty)

    discount_pct = calculate_discount_percentage(product.base_price, product.discount_price)

    return ProductSummaryOut(
        id=product.id,
        title=product.title,
        slug=product.slug,
        brand=product.brand,
        base_price=product.base_price,
        discount_price=product.discount_price,
        rating_avg=product.rating_avg,
        rating_count=product.rating_count,
        primary_image=primary_img,
        category_id=product.category_id,
        category_name=product.category.name if product.category else "General",
        category_slug=product.category.slug if product.category else "general",
        is_featured=product.is_featured,
        in_stock=total_qty > 0,
        discount_percentage=discount_pct
    )


class ProductService:
    @staticmethod
    def get_categories(db: Session) -> List[CategoryOut]:
        categories = db.query(Category).filter(Category.is_active == True).all()
        result = []
        for cat in categories:
            count = db.query(func.count(Product.id)).filter(
                Product.category_id == cat.id,
                Product.is_active == True
            ).scalar() or 0
            result.append(CategoryOut(
                id=cat.id,
                name=cat.name,
                slug=cat.slug,
                image_url=cat.image_url,
                parent_id=cat.parent_id,
                is_active=cat.is_active,
                product_count=count
            ))
        return result

    @staticmethod
    def list_products(
        db: Session,
        page: int = 1,
        limit: int = 12,
        search: Optional[str] = None,
        category: Optional[str] = None,
        brand: Optional[str] = None,
        min_price: Optional[Decimal] = None,
        max_price: Optional[Decimal] = None,
        min_rating: Optional[Decimal] = None,
        in_stock_only: bool = False,
        sort: str = "featured"
    ) -> PaginatedProductsOut:
        query = db.query(Product).options(
            joinedload(Product.images),
            joinedload(Product.variants).joinedload(ProductVariant.inventory),
            joinedload(Product.category)
        ).filter(Product.is_active == True)

        # 1. Search Query across title, brand, description
        if search:
            search_clean = search.strip()
            search_pattern = f"%{search_clean}%"
            query = query.filter(
                or_(
                    Product.title.ilike(search_pattern),
                    Product.brand.ilike(search_pattern),
                    Product.description.ilike(search_pattern)
                )
            )

        # 2. Category Filter (slug or numeric id)
        if category and category != "all":
            if category.isdigit():
                query = query.filter(Product.category_id == int(category))
            else:
                query = query.join(Product.category).filter(Category.slug == category)

        # 3. Brand Filter (supports comma-separated list)
        if brand:
            brand_list = [b.strip() for b in brand.split(",") if b.strip()]
            if brand_list:
                query = query.filter(Product.brand.in_(brand_list))

        # 4. Price Range Filters
        if min_price is not None:
            effective_price = func.coalesce(Product.discount_price, Product.base_price)
            query = query.filter(effective_price >= min_price)
        if max_price is not None:
            effective_price = func.coalesce(Product.discount_price, Product.base_price)
            query = query.filter(effective_price <= max_price)

        # 5. Rating Filter (e.g. >= 4.0)
        if min_rating is not None:
            query = query.filter(Product.rating_avg >= min_rating)

        # 6. Sorting
        effective_price = func.coalesce(Product.discount_price, Product.base_price)
        if sort == "price_asc":
            query = query.order_by(asc(effective_price))
        elif sort == "price_desc":
            query = query.order_by(desc(effective_price))
        elif sort == "rating_desc":
            query = query.order_by(desc(Product.rating_avg), desc(Product.rating_count))
        elif sort == "popular":
            query = query.order_by(desc(Product.rating_count), desc(Product.rating_avg))
        elif sort == "newest":
            query = query.order_by(desc(Product.created_at))
        else:  # featured / default
            query = query.order_by(desc(Product.is_featured), desc(Product.created_at))

        # Distinct brands and price bounds from matching set
        all_matches = query.all()

        available_brands = sorted(list(set(p.brand for p in all_matches if p.brand)))
        prices = [float(p.discount_price or p.base_price) for p in all_matches]
        min_price_found = Decimal(str(min(prices))) if prices else Decimal("0.00")
        max_price_found = Decimal(str(max(prices))) if prices else Decimal("0.00")

        # In-stock filtering if requested
        if in_stock_only:
            filtered_matches = []
            for p in all_matches:
                qty = sum(max(0, v.inventory.quantity - v.inventory.reserved_qty) for v in p.variants if v.inventory)
                if qty > 0:
                    filtered_matches.append(p)
            all_matches = filtered_matches

        total = len(all_matches)
        total_pages = max(1, math.ceil(total / limit)) if limit > 0 else 1
        start_idx = (page - 1) * limit
        end_idx = start_idx + limit
        paginated_items = all_matches[start_idx:end_idx]

        items_out = [transform_product_summary(p) for p in paginated_items]

        return PaginatedProductsOut(
            items=items_out,
            total=total,
            page=page,
            limit=limit,
            total_pages=total_pages,
            available_brands=available_brands,
            min_price_found=min_price_found,
            max_price_found=max_price_found
        )

    @staticmethod
    def get_product_detail(db: Session, slug_or_id: str) -> Optional[ProductDetailOut]:
        query = db.query(Product).options(
            joinedload(Product.images),
            joinedload(Product.variants).joinedload(ProductVariant.inventory),
            joinedload(Product.category),
            joinedload(Product.seller),
            joinedload(Product.reviews).joinedload(Review.user)
        ).filter(Product.is_active == True)

        product = query.filter(
            or_(Product.slug == slug_or_id, Product.id == slug_or_id)
        ).first()

        if not product:
            return None

        # Sort images by sort_order
        images_out = [
            ProductImageOut(
                id=img.id,
                image_url=img.image_url,
                alt_text=img.alt_text,
                sort_order=img.sort_order
            )
            for img in sorted(product.images, key=lambda x: x.sort_order)
        ]

        # Process variants with stock quantities
        variants_out = []
        total_stock = 0
        for v in product.variants:
            available_qty = max(0, v.inventory.quantity - v.inventory.reserved_qty) if v.inventory else 0
            total_stock += available_qty
            variants_out.append(
                ProductVariantOut(
                    id=v.id,
                    sku=v.sku,
                    title=v.title,
                    price_override=v.price_override,
                    attributes=v.attributes or {},
                    stock_quantity=available_qty,
                    in_stock=available_qty > 0
                )
            )

        # Process approved reviews
        reviews_out = []
        for r in product.reviews:
            if r.is_approved:
                user_display = f"{r.user.first_name} {r.user.last_name[0]}." if r.user and r.user.last_name else "Verified Buyer"
                reviews_out.append(
                    ProductReviewOut(
                        id=r.id,
                        user_name=user_display,
                        rating=r.rating,
                        title=r.title,
                        comment=r.comment,
                        is_verified=r.is_verified,
                        created_at=r.created_at
                    )
                )

        discount_pct = calculate_discount_percentage(product.base_price, product.discount_price)

        return ProductDetailOut(
            id=product.id,
            title=product.title,
            slug=product.slug,
            brand=product.brand,
            description=product.description,
            base_price=product.base_price,
            discount_price=product.discount_price,
            discount_percentage=discount_pct,
            rating_avg=product.rating_avg,
            rating_count=product.rating_count,
            category_id=product.category_id,
            category_name=product.category.name if product.category else "General",
            category_slug=product.category.slug if product.category else "general",
            seller_name=product.seller.store_name if product.seller else "ShopSphere Retail",
            seller_slug=product.seller.store_slug if product.seller else "shopsphere-retail",
            is_featured=product.is_featured,
            in_stock=total_stock > 0,
            total_stock=total_stock,
            images=images_out,
            variants=variants_out,
            reviews=reviews_out
        )

    @staticmethod
    def get_related_products(db: Session, product_id: str, limit: int = 4) -> List[ProductSummaryOut]:
        target = db.query(Product).filter(Product.id == product_id).first()
        if not target:
            return []

        related = db.query(Product).options(
            joinedload(Product.images),
            joinedload(Product.variants).joinedload(ProductVariant.inventory),
            joinedload(Product.category)
        ).filter(
            Product.id != product_id,
            Product.is_active == True,
            or_(
                Product.category_id == target.category_id,
                Product.brand == target.brand
            )
        ).limit(limit).all()

        return [transform_product_summary(p) for p in related]
