from sqlalchemy import Column, String, Boolean, ForeignKey, Text, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.core.database import Base
from app.models.base import generate_uuid


class SellerProfile(Base):
    __tablename__ = "seller_profiles"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    store_name = Column(String(128), unique=True, nullable=False)
    store_slug = Column(String(128), unique=True, nullable=False, index=True)
    description = Column(Text, nullable=True)
    tax_id = Column(String(64), nullable=True)
    is_approved = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    user = relationship("User", back_populates="seller_profile")
    products = relationship("Product", back_populates="seller", cascade="all, delete-orphan")
