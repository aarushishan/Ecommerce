from typing import Optional, List
from decimal import Decimal
from sqlalchemy.orm import Session, joinedload
from fastapi import HTTPException, status
from app.models.cart import Cart, CartItem, Wishlist
from app.models.product import Product, ProductVariant, Inventory, ProductImage
from app.schemas.cart import CartOut, CartItemOut, WishlistItemOut, CartItemCreate


def get_or_create_cart(db: Session, user_id: Optional[str] = None, session_token: Optional[str] = None) -> Cart:
    cart = None
    if user_id:
        cart = db.query(Cart).filter(Cart.user_id == user_id).first()
        if not cart:
            cart = Cart(user_id=user_id)
            db.add(cart)
            db.commit()
            db.refresh(cart)
    elif session_token:
        cart = db.query(Cart).filter(Cart.session_token == session_token).first()
        if not cart:
            cart = Cart(session_token=session_token)
            db.add(cart)
            db.commit()
            db.refresh(cart)
    else:
        cart = Cart()
        db.add(cart)
        db.commit()
        db.refresh(cart)

    return cart


class CartService:
    @staticmethod
    def get_cart_details(db: Session, user_id: Optional[str] = None, session_token: Optional[str] = None) -> CartOut:
        cart = get_or_create_cart(db, user_id, session_token)

        # Query all cart items with joined product, variant, and inventory
        items = db.query(CartItem).options(
            joinedload(CartItem.product).joinedload(Product.images),
            joinedload(CartItem.variant).joinedload(ProductVariant.inventory)
        ).filter(CartItem.cart_id == cart.id).all()

        cart_items_out: List[CartItemOut] = []
        raw_subtotal = Decimal("0.00")
        total_discount = Decimal("0.00")
        total_item_count = 0

        for item in items:
            product = item.product
            variant = item.variant
            inventory = variant.inventory if variant else None

            available_stock = max(0, inventory.quantity - inventory.reserved_qty) if inventory else 0
            is_in_stock = available_stock > 0

            # Authoritative DB price
            effective_unit_price = (
                variant.price_override
                if variant and variant.price_override is not None
                else (product.discount_price if product.discount_price is not None else product.base_price)
            )

            base_unit_price = (
                variant.price_override
                if variant and variant.price_override is not None
                else product.base_price
            )

            line_total = effective_unit_price * Decimal(item.quantity)
            line_base_total = base_unit_price * Decimal(item.quantity)
            raw_subtotal += line_total
            if line_base_total > line_total:
                total_discount += (line_base_total - line_total)

            total_item_count += item.quantity

            # Primary image
            primary_img = None
            if product.images:
                sorted_imgs = sorted(product.images, key=lambda x: x.sort_order)
                primary_img = sorted_imgs[0].image_url

            cart_items_out.append(
                CartItemOut(
                    id=item.id,
                    product_id=product.id,
                    variant_id=variant.id,
                    product_title=product.title,
                    product_slug=product.slug,
                    variant_title=variant.title,
                    brand=product.brand,
                    image_url=primary_img,
                    unit_price=effective_unit_price,
                    base_price=base_unit_price,
                    quantity=item.quantity,
                    total_price=line_total,
                    in_stock=is_in_stock,
                    max_stock=available_stock
                )
            )

        # Free shipping threshold is ₹499
        free_shipping_threshold = Decimal("499.00")
        is_free_shipping = raw_subtotal >= free_shipping_threshold or raw_subtotal == Decimal("0.00")
        shipping_fee = Decimal("0.00") if is_free_shipping else Decimal("50.00")

        # 5% Estimated GST
        tax_amount = (raw_subtotal * Decimal("0.05")).quantize(Decimal("0.01"))
        total_amount = (raw_subtotal + shipping_fee + tax_amount).quantize(Decimal("0.01"))

        return CartOut(
            id=cart.id,
            items=cart_items_out,
            total_items=total_item_count,
            subtotal=raw_subtotal.quantize(Decimal("0.01")),
            discount_amount=total_discount.quantize(Decimal("0.01")),
            shipping_fee=shipping_fee,
            tax_amount=tax_amount,
            total_amount=total_amount,
            free_shipping_threshold=free_shipping_threshold,
            eligible_for_free_shipping=is_free_shipping
        )

    @staticmethod
    def add_to_cart(
        db: Session,
        item_data: CartItemCreate,
        user_id: Optional[str] = None,
        session_token: Optional[str] = None
    ) -> CartOut:
        cart = get_or_create_cart(db, user_id, session_token)

        # Verify product and variant
        product = db.query(Product).filter(Product.id == item_data.product_id, Product.is_active == True).first()
        if not product:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found or inactive.")

        variant = db.query(ProductVariant).filter(
            ProductVariant.id == item_data.variant_id,
            ProductVariant.product_id == product.id
        ).first()
        if not variant:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product variant not found.")

        # Check stock availability
        inventory = db.query(Inventory).filter(Inventory.variant_id == variant.id).first()
        available_stock = max(0, inventory.quantity - inventory.reserved_qty) if inventory else 0

        if available_stock <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Item '{product.title}' ({variant.title}) is currently out of stock."
            )

        # Check if item is already in the cart
        existing_item = db.query(CartItem).filter(
            CartItem.cart_id == cart.id,
            CartItem.product_id == product.id,
            CartItem.variant_id == variant.id
        ).first()

        if existing_item:
            new_qty = existing_item.quantity + item_data.quantity
            if new_qty > available_stock:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Cannot add {item_data.quantity} more. Only {available_stock} available in stock."
                )
            existing_item.quantity = new_qty
        else:
            if item_data.quantity > available_stock:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Only {available_stock} units available in stock."
                )
            new_item = CartItem(
                cart_id=cart.id,
                product_id=product.id,
                variant_id=variant.id,
                quantity=item_data.quantity
            )
            db.add(new_item)

        db.commit()
        return CartService.get_cart_details(db, user_id, session_token)

    @staticmethod
    def update_quantity(
        db: Session,
        cart_item_id: str,
        quantity: int,
        user_id: Optional[str] = None,
        session_token: Optional[str] = None
    ) -> CartOut:
        cart = get_or_create_cart(db, user_id, session_token)
        item = db.query(CartItem).filter(CartItem.id == cart_item_id, CartItem.cart_id == cart.id).first()
        if not item:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cart item not found.")

        inventory = db.query(Inventory).filter(Inventory.variant_id == item.variant_id).first()
        available_stock = max(0, inventory.quantity - inventory.reserved_qty) if inventory else 0

        if quantity > available_stock:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Maximum available quantity is {available_stock}."
            )

        item.quantity = quantity
        db.commit()
        return CartService.get_cart_details(db, user_id, session_token)

    @staticmethod
    def remove_item(
        db: Session,
        cart_item_id: str,
        user_id: Optional[str] = None,
        session_token: Optional[str] = None
    ) -> CartOut:
        cart = get_or_create_cart(db, user_id, session_token)
        item = db.query(CartItem).filter(CartItem.id == cart_item_id, CartItem.cart_id == cart.id).first()
        if not item:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cart item not found.")

        db.delete(item)
        db.commit()
        return CartService.get_cart_details(db, user_id, session_token)

    @staticmethod
    def clear_cart(db: Session, user_id: Optional[str] = None, session_token: Optional[str] = None):
        cart = get_or_create_cart(db, user_id, session_token)
        db.query(CartItem).filter(CartItem.cart_id == cart.id).delete()
        db.commit()
        return {"message": "Cart cleared successfully."}

    @staticmethod
    def get_wishlist(db: Session, user_id: str) -> List[WishlistItemOut]:
        items = db.query(Wishlist).options(
            joinedload(Wishlist.product).joinedload(Product.images)
        ).filter(Wishlist.user_id == user_id).order_by(Wishlist.created_at.desc()).all()

        out = []
        for w in items:
            p = w.product
            primary_img = None
            if p.images:
                sorted_imgs = sorted(p.images, key=lambda x: x.sort_order)
                primary_img = sorted_imgs[0].image_url

            out.append(
                WishlistItemOut(
                    id=w.id,
                    product_id=p.id,
                    product_title=p.title,
                    product_slug=p.slug,
                    brand=p.brand,
                    image_url=primary_img,
                    base_price=p.base_price,
                    discount_price=p.discount_price,
                    in_stock=p.is_active,
                    created_at=w.created_at
                )
            )
        return out

    @staticmethod
    def toggle_wishlist(db: Session, user_id: str, product_id: str):
        existing = db.query(Wishlist).filter(
            Wishlist.user_id == user_id,
            Wishlist.product_id == product_id
        ).first()

        if existing:
            db.delete(existing)
            db.commit()
            return {"is_wishlisted": False, "message": "Removed from wishlist"}
        else:
            new_item = Wishlist(user_id=user_id, product_id=product_id)
            db.add(new_item)
            db.commit()
            return {"is_wishlisted": True, "message": "Saved to wishlist"}
