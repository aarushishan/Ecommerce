from typing import List, Optional
from fastapi import APIRouter, Depends, status, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.schemas.order import OrderCreate, OrderOut, OrderStatusUpdate, ShipmentOut
from app.services.order_service import OrderService

router = APIRouter(prefix="/orders", tags=["Orders"])


@router.post("", response_model=OrderOut, status_code=status.HTTP_201_CREATED)
def create_order(
    order_data: OrderCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Place a new order from items in the authenticated user's cart.
    Enforces row-level inventory locks, authoritative server-side price calculation,
    and automatic payment/shipment record initialization.
    """
    return OrderService.create_order(
        db,
        user_id=current_user.id,
        order_data=order_data
    )


@router.get("", response_model=List[OrderOut])
def get_user_orders(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Retrieve all past orders placed by the current user with payment and shipment info.
    """
    return OrderService.get_user_orders(db, user_id=current_user.id)


@router.get("/{order_id}", response_model=OrderOut)
def get_order_detail(
    order_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Retrieve full details, items, payment metadata, and shipment tracking for a specific order.
    """
    return OrderService.get_order_detail(db, user_id=current_user.id, order_id=order_id)


@router.get("/{order_id}/track", response_model=ShipmentOut)
def get_order_tracking(
    order_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Retrieve live logistics tracking details and timeline milestones for an order.
    """
    order = OrderService.get_order_detail(db, user_id=current_user.id, order_id=order_id)
    if not order.shipment:
        from fastapi import HTTPException
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Shipment tracking not initialized for this order."
        )
    return order.shipment


@router.patch("/{order_id}/status", response_model=OrderOut)
def update_order_status(
    order_id: str,
    update_data: OrderStatusUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Transition order through the order lifecycle state engine:
    PENDING -> CONFIRMED -> PROCESSING -> SHIPPED -> OUT_FOR_DELIVERY -> DELIVERED.
    Validates state transitions and appends tracking timeline milestones.
    """
    return OrderService.transition_order_status(
        db=db,
        order_id=order_id,
        new_status=update_data.status,
        notes=update_data.notes,
        location=update_data.location
    )


@router.post("/{order_id}/cancel", response_model=OrderOut)
def cancel_order(
    order_id: str,
    reason: Optional[str] = Query(None, description="Optional cancellation reason"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Cancel an order prior to shipment dispatch.
    Restores physical inventory using row-level transactional locking and initiates a refund.
    """
    return OrderService.cancel_order(
        db=db,
        order_id=order_id,
        user_id=current_user.id,
        reason=reason
    )
