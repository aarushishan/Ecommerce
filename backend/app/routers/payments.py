from typing import Dict, Any, Optional
from fastapi import APIRouter, Depends, Request, Header, status, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.dependencies import get_current_user, get_optional_user
from app.models.user import User
from app.schemas.payment import (
    PaymentInitiateRequest,
    PaymentInitiateResponse,
    PaymentVerifyRequest,
    PaymentVerifyResponse,
    WebhookSimulationRequest
)
from app.services.payment_service import PaymentService

router = APIRouter(prefix="/payments", tags=["Payments"])


@router.post("/initiate", response_model=PaymentInitiateResponse)
def initiate_payment(
    request_data: PaymentInitiateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Initiate payment transaction for an existing order across Stripe, Razorpay, Mock, or COD.
    """
    return PaymentService.initiate_payment(
        db,
        user_id=current_user.id,
        request=request_data
    )


@router.post("/verify", response_model=PaymentVerifyResponse)
def verify_payment(
    request_data: PaymentVerifyRequest,
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db)
):
    """
    Verify payment authorization, finalize order status to CONFIRMED / PAID, and initialize shipping tracking.
    """
    user_id = current_user.id if current_user else None
    return PaymentService.verify_payment(
        db,
        user_id=user_id,
        request=request_data
    )


@router.post("/webhook/{provider}")
async def handle_payment_webhook(
    provider: str,
    request: Request,
    stripe_signature: Optional[str] = Header(None, alias="stripe-signature"),
    x_razorpay_signature: Optional[str] = Header(None, alias="X-Razorpay-Signature"),
    x_mock_signature: Optional[str] = Header(None, alias="X-Mock-Signature"),
    db: Session = Depends(get_db)
):
    """
    Cryptographic webhook listener with HMAC SHA-256 verification and idempotent execution.
    Rejects tampered payloads with 400 Bad Request.
    """
    raw_body = await request.body()
    prov_upper = provider.upper()

    if prov_upper == "STRIPE":
        signature = stripe_signature
    elif prov_upper == "RAZORPAY":
        signature = x_razorpay_signature
    else:
        signature = x_mock_signature or stripe_signature or x_razorpay_signature

    return PaymentService.process_webhook(
        db=db,
        provider=provider,
        raw_body=raw_body,
        signature_header=signature
    )


@router.post("/simulate-webhook")
def simulate_webhook(
    sim_data: WebhookSimulationRequest,
    db: Session = Depends(get_db)
):
    """
    Developer & test simulation endpoint to generate authentic or tampered HMAC-SHA256 signatures
    and test webhook processing and idempotency in real time.
    """
    return PaymentService.simulate_signed_webhook(db, sim_data)
