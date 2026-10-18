import uuid
from typing import List, Optional, Dict, Any
from decimal import Decimal
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session, joinedload
from fastapi import HTTPException, status
from app.models.cart import Cart, CartItem
from app.models.order import Order, OrderItem, Payment, Shipment
from app.models.product import Product, ProductVariant, Inventory
from app.models.user import Address, User
from app.schemas.order import (
    OrderCreate,
    OrderOut,
    OrderItemOut,
    PaymentOut,
    ShipmentOut
)
from app.schemas.user import AddressOut


def generate_order_number() -> str:
    return f"SS-2026-{uuid.uuid4().hex[:8].upper()}"


# Allowed state transitions for Order Lifecycle State Engine
VALID_TRANSITIONS = {
    "PENDING": ["CONFIRMED", "CANCELLED"],
    "CONFIRMED": ["PROCESSING", "CANCELLED"],
    "PROCESSING": ["SHIPPED", "CANCELLED"],
    "SHIPPED": ["OUT_FOR_DELIVERY", "DELIVERED"],
    "OUT_FOR_DELIVERY": ["DELIVERED"],
    "DELIVERED": [],  # Terminal state
    "CANCELLED": []   # Terminal state
}


class OrderService:
    @staticmethod
    def _serialize_order(order: Order) -> OrderOut:
        items_out = [
            OrderItemOut(
                id=item.id,
                product_id=item.product_id,
                variant_id=item.variant_id,
                product_title=item.product_title,
                unit_price=item.unit_price,
                quantity=item.quantity,
                total_price=item.total_price
            )
            for item in order.items
        ]

        addr_out = AddressOut.model_validate(order.shipping_address) if order.shipping_address else None

        payment_out = None
        if order.payment:
            payment_out = PaymentOut(
                id=order.payment.id,
                order_id=order.payment.order_id,
                provider=order.payment.provider,
                transaction_id=order.payment.transaction_id,
                amount=order.payment.amount,
                currency=order.payment.currency,
                status=order.payment.status,
                created_at=order.payment.created_at
            )

        shipment_out = None
        if order.shipment:
            shipment_out = ShipmentOut(
                id=order.shipment.id,
                order_id=order.shipment.order_id,
                carrier=order.shipment.carrier,
                tracking_number=order.shipment.tracking_number,
                status=order.shipment.status,
                current_location=order.shipment.current_location,
                estimated_delivery=order.shipment.estimated_delivery,
                timeline=order.shipment.timeline or [],
                updated_at=order.shipment.updated_at
            )

        return OrderOut(
            id=order.id,
            order_number=order.order_number,
            user_id=order.user_id,
            shipping_address_id=order.shipping_address_id,
            shipping_address=addr_out,
            items=items_out,
            subtotal=order.subtotal,
            discount_amount=order.discount_amount,
            shipping_fee=order.shipping_fee,
            tax_amount=order.tax_amount,
            total_amount=order.total_amount,
            status=order.status,
            payment_status=order.payment_status,
            payment=payment_out,
            shipment=shipment_out,
            created_at=order.created_at
        )

    @staticmethod
    def create_order(db: Session, user_id: str, order_data: OrderCreate) -> OrderOut:
        # 1. Validate shipping address
        address = db.query(Address).filter(
            Address.id == order_data.shipping_address_id,
            Address.user_id == user_id
        ).first()
        if not address:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Selected shipping address is invalid."
            )

        # 2. Query user's cart
        cart = db.query(Cart).filter(Cart.user_id == user_id).first()
        if not cart:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Shopping cart not found."
            )

        cart_items = db.query(CartItem).options(
            joinedload(CartItem.product),
            joinedload(CartItem.variant)
        ).filter(CartItem.cart_id == cart.id).all()

        if not cart_items:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Your shopping cart is empty."
            )

        # 3. Transactional Inventory Row Locking & Price Verification
        order_items_to_create = []
        raw_subtotal = Decimal("0.00")
        total_discount = Decimal("0.00")

        for cart_item in cart_items:
            product = cart_item.product
            variant = cart_item.variant

            # ROW-LEVEL TRANSACTIONAL LOCK: with_for_update() prevents race condition overselling!
            inventory = db.query(Inventory).filter(
                Inventory.variant_id == variant.id
            ).with_for_update().first()

            if not inventory:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Inventory tracking missing for {product.title}."
                )

            available_qty = inventory.quantity - inventory.reserved_qty
            if available_qty < cart_item.quantity:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Insufficient stock for '{product.title}' ({variant.title}). Only {max(0, available_qty)} units available."
                )

            # Decrement physical stock
            inventory.quantity -= cart_item.quantity

            # Authoritative pricing calculation strictly from DB
            effective_price = (
                variant.price_override
                if variant.price_override is not None
                else (product.discount_price if product.discount_price is not None else product.base_price)
            )

            base_price = (
                variant.price_override
                if variant.price_override is not None
                else product.base_price
            )

            line_total = effective_price * Decimal(cart_item.quantity)
            raw_subtotal += line_total
            if base_price > effective_price:
                total_discount += (base_price - effective_price) * Decimal(cart_item.quantity)

            order_item = OrderItem(
                product_id=product.id,
                variant_id=variant.id,
                seller_id=product.seller_id,
                product_title=f"{product.title} ({variant.title})",
                unit_price=effective_price,
                quantity=cart_item.quantity,
                total_price=line_total
            )
            order_items_to_create.append(order_item)

        # 4. Final Calculations
        free_shipping_threshold = Decimal("499.00")
        shipping_fee = Decimal("0.00") if raw_subtotal >= free_shipping_threshold else Decimal("50.00")
        tax_amount = (raw_subtotal * Decimal("0.05")).quantize(Decimal("0.01"))
        total_amount = (raw_subtotal + shipping_fee + tax_amount).quantize(Decimal("0.01"))

        # Determine Payment Status & Method
        payment_method = (order_data.payment_method or "MOCK").upper()
        now_dt = datetime.now(timezone.utc)
        order_status = "CONFIRMED"
        payment_status = "PAID"

        if payment_method in ["STRIPE", "RAZORPAY"]:
            order_status = "PENDING"
            payment_status = "UNPAID"
        elif payment_method == "COD":
            order_status = "CONFIRMED"
            payment_status = "CASH_ON_DELIVERY"
        else:  # MOCK
            order_status = "CONFIRMED"
            payment_status = "PAID"

        # 5. Create Order
        order = Order(
            order_number=generate_order_number(),
            user_id=user_id,
            shipping_address_id=address.id,
            subtotal=raw_subtotal.quantize(Decimal("0.01")),
            discount_amount=total_discount.quantize(Decimal("0.01")),
            shipping_fee=shipping_fee,
            tax_amount=tax_amount,
            total_amount=total_amount,
            status=order_status,
            payment_status=payment_status
        )
        db.add(order)
        db.flush()

        # Link order items to order
        for item in order_items_to_create:
            item.order_id = order.id
            db.add(item)

        # 6. Initialize Payment Record
        tx_id = f"{payment_method.lower()}_tx_{uuid.uuid4().hex[:10]}"
        payment = Payment(
            order_id=order.id,
            provider=payment_method,
            transaction_id=tx_id,
            amount=total_amount,
            currency="INR",
            status="SUCCESS" if payment_status == "PAID" else "PENDING",
            raw_payload={"initial_checkout": True, "created_at": now_dt.isoformat()}
        )
        db.add(payment)

        # 7. Initialize Shipment Record with initial timeline event
        tracking_number = f"SSE-IND-{uuid.uuid4().hex[:8].upper()}"
        initial_event = {
            "status": order_status,
            "title": "Order Placed & Confirmed" if order_status == "CONFIRMED" else "Order Initiated",
            "description": f"Order #{order.order_number} initiated via {payment_method}.",
            "timestamp": now_dt.isoformat(),
            "location": "Central Fulfillment Center, Bengaluru"
        }

        shipment = Shipment(
            order_id=order.id,
            carrier="ShopSphere Express",
            tracking_number=tracking_number,
            status="LABEL_CREATED" if order_status == "CONFIRMED" else "PENDING_PAYMENT",
            current_location="Central Fulfillment Center, Bengaluru",
            estimated_delivery=now_dt + timedelta(days=2),
            timeline=[initial_event]
        )
        db.add(shipment)

        # 8. Clear Cart
        db.query(CartItem).filter(CartItem.cart_id == cart.id).delete()

        # Commit Transaction Atomically
        db.commit()
        db.refresh(order)

        return OrderService.get_order_detail(db, user_id, order.id)

    @staticmethod
    def get_order_detail(db: Session, user_id: Optional[str], order_id: str) -> OrderOut:
        query = db.query(Order).options(
            joinedload(Order.items),
            joinedload(Order.shipping_address),
            joinedload(Order.payment),
            joinedload(Order.shipment)
        ).filter(Order.id == order_id)

        if user_id:
            query = query.filter(Order.user_id == user_id)

        order = query.first()
        if not order:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Order not found."
            )

        return OrderService._serialize_order(order)

    @staticmethod
    def get_user_orders(db: Session, user_id: str) -> List[OrderOut]:
        orders = db.query(Order).options(
            joinedload(Order.items),
            joinedload(Order.shipping_address),
            joinedload(Order.payment),
            joinedload(Order.shipment)
        ).filter(
            Order.user_id == user_id
        ).order_by(Order.created_at.desc()).all()

        return [OrderService._serialize_order(o) for o in orders]

    @staticmethod
    def transition_order_status(
        db: Session,
        order_id: str,
        new_status: str,
        notes: Optional[str] = None,
        location: Optional[str] = None
    ) -> OrderOut:
        order = db.query(Order).options(
            joinedload(Order.items),
            joinedload(Order.shipping_address),
            joinedload(Order.payment),
            joinedload(Order.shipment)
        ).filter(Order.id == order_id).first()

        if not order:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Order not found."
            )

        new_status = new_status.upper()
        current_status = order.status.upper()

        if new_status == current_status:
            return OrderService._serialize_order(order)

        # Validate state transition
        allowed_next = VALID_TRANSITIONS.get(current_status, [])
        if new_status not in allowed_next:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Illegal order transition from '{current_status}' to '{new_status}'. Allowed transitions: {allowed_next}"
            )

        now_dt = datetime.now(timezone.utc)
        current_loc = location or "Central Fulfillment Center, Bengaluru"

        # Update order status
        order.status = new_status

        # Synchronize shipment status and timeline event
        shipment = order.shipment
        if not shipment:
            shipment = Shipment(
                order_id=order.id,
                carrier="ShopSphere Express",
                tracking_number=f"SSE-IND-{uuid.uuid4().hex[:8].upper()}",
                status="LABEL_CREATED",
                current_location=current_loc,
                estimated_delivery=now_dt + timedelta(days=2),
                timeline=[]
            )
            db.add(shipment)

        timeline_list = list(shipment.timeline or [])

        if new_status == "PROCESSING":
            shipment.status = "PICKED_UP"
            event_title = "Packed & Ready for Dispatch"
            event_desc = notes or "Order items picked, packed, and assigned to carrier dispatch queue."
            current_loc = location or "Central Fulfillment Center, Bengaluru"
        elif new_status == "SHIPPED":
            shipment.status = "IN_TRANSIT"
            event_title = "In Transit with Carrier"
            event_desc = notes or f"Package departed fulfillment center via {shipment.carrier}."
            current_loc = location or "Transit Logistics Hub, Bengaluru"
        elif new_status == "OUT_FOR_DELIVERY":
            shipment.status = "OUT_FOR_DELIVERY"
            event_title = "Out for Delivery"
            event_desc = notes or "Delivery executive is en route with your package today."
            current_loc = location or "Local Delivery Hub, Destination City"
        elif new_status == "DELIVERED":
            shipment.status = "DELIVERED"
            event_title = "Package Delivered"
            event_desc = notes or "Package successfully delivered to recipient at doorstep."
            current_loc = location or "Destination Address"
        elif new_status == "CANCELLED":
            shipment.status = "CANCELLED"
            event_title = "Order Cancelled"
            event_desc = notes or "Order was cancelled."
        else:
            event_title = f"Status updated to {new_status}"
            event_desc = notes or f"Order advanced to {new_status}."

        shipment.current_location = current_loc
        timeline_list.append({
            "status": new_status,
            "title": event_title,
            "description": event_desc,
            "timestamp": now_dt.isoformat(),
            "location": current_loc
        })
        shipment.timeline = timeline_list

        db.commit()
        db.refresh(order)

        return OrderService._serialize_order(order)

    @staticmethod
    def cancel_order(db: Session, order_id: str, user_id: str, reason: Optional[str] = None) -> OrderOut:
        order = db.query(Order).options(
            joinedload(Order.items),
            joinedload(Order.shipping_address),
            joinedload(Order.payment),
            joinedload(Order.shipment)
        ).filter(
            Order.id == order_id,
            Order.user_id == user_id
        ).first()

        if not order:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Order not found."
            )

        if order.status in ["SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Order cannot be cancelled because it is already {order.status.lower()}."
            )

        if order.status == "CANCELLED":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Order is already cancelled."
            )

        # 1. Reverse Inventory stock using row locks
        for item in order.items:
            inv = db.query(Inventory).filter(
                Inventory.variant_id == item.variant_id
            ).with_for_update().first()
            if inv:
                inv.quantity += item.quantity

        # 2. Refund Payment if paid
        if order.payment_status == "PAID":
            order.payment_status = "REFUNDED"
            if order.payment:
                order.payment.status = "REFUNDED"
                order.payment.raw_payload = {
                    "refunded_at": datetime.now(timezone.utc).isoformat(),
                    "reason": reason or "Customer initiated cancellation."
                }

        order.status = "CANCELLED"

        # 3. Add timeline entry
        if order.shipment:
            timeline_list = list(order.shipment.timeline or [])
            timeline_list.append({
                "status": "CANCELLED",
                "title": "Order Cancelled & Restocked",
                "description": reason or "Customer requested cancellation. Stock restored to inventory and refund initiated.",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "location": order.shipment.current_location or "Central Fulfillment Center, Bengaluru"
            })
            order.shipment.timeline = timeline_list
            order.shipment.status = "CANCELLED"

        db.commit()
        db.refresh(order)

        return OrderService._serialize_order(order)
