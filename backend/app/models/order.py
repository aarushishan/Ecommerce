from sqlalchemy import Column, Integer, String, ForeignKey, Numeric, DateTime, JSON
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.core.database import Base
from app.models.base import TimestampMixin, generate_uuid


class Order(Base, TimestampMixin):
    __tablename__ = "orders"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    order_number = Column(String(32), unique=True, nullable=False, index=True)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    shipping_address_id = Column(String(36), ForeignKey("addresses.id"), nullable=False)
    subtotal = Column(Numeric(10, 2), nullable=False)
    discount_amount = Column(Numeric(10, 2), default=0.00, nullable=False)
    shipping_fee = Column(Numeric(10, 2), default=0.00, nullable=False)
    tax_amount = Column(Numeric(10, 2), default=0.00, nullable=False)
    total_amount = Column(Numeric(10, 2), nullable=False)
    status = Column(String(32), default="PENDING", nullable=False, index=True)
    payment_status = Column(String(32), default="UNPAID", nullable=False)

    user = relationship("User", back_populates="orders")
    shipping_address = relationship("Address")
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")
    payment = relationship("Payment", back_populates="order", uselist=False, cascade="all, delete-orphan")
    shipment = relationship("Shipment", back_populates="order", uselist=False, cascade="all, delete-orphan")


class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    order_id = Column(String(36), ForeignKey("orders.id", ondelete="CASCADE"), nullable=False)
    product_id = Column(String(36), ForeignKey("products.id"), nullable=False)
    variant_id = Column(String(36), ForeignKey("product_variants.id"), nullable=False)
    seller_id = Column(String(36), ForeignKey("seller_profiles.id"), nullable=False)
    product_title = Column(String(255), nullable=False)
    unit_price = Column(Numeric(10, 2), nullable=False)
    quantity = Column(Integer, nullable=False)
    total_price = Column(Numeric(10, 2), nullable=False)

    order = relationship("Order", back_populates="items")
    product = relationship("Product")
    variant = relationship("ProductVariant")
    seller = relationship("SellerProfile")


class Payment(Base):
    __tablename__ = "payments"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    order_id = Column(String(36), ForeignKey("orders.id"), unique=True, nullable=False)
    provider = Column(String(32), nullable=False)  # STRIPE, RAZORPAY, MOCK
    transaction_id = Column(String(128), unique=True, nullable=False, index=True)
    amount = Column(Numeric(10, 2), nullable=False)
    currency = Column(String(3), default="INR", nullable=False)
    status = Column(String(32), nullable=False)  # SUCCESS, PENDING, FAILED
    raw_payload = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    order = relationship("Order", back_populates="payment")


class Shipment(Base):
    __tablename__ = "shipments"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    order_id = Column(String(36), ForeignKey("orders.id"), unique=True, nullable=False)
    carrier = Column(String(64), nullable=False, default="ShopSphere Express")
    tracking_number = Column(String(128), nullable=True, index=True)
    status = Column(String(32), default="PROCESSING", nullable=False)
    current_location = Column(String(128), default="Central Fulfillment Center, Bengaluru", nullable=True)
    estimated_delivery = Column(DateTime, nullable=True)
    timeline = Column(JSON, nullable=True)
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    order = relationship("Order", back_populates="shipment")
