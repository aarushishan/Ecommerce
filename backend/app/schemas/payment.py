from typing import Optional, Any, Dict
from decimal import Decimal
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class PaymentInitiateRequest(BaseModel):
    order_id: str
    provider: str = Field(default="MOCK", description="MOCK, STRIPE, RAZORPAY, or COD")
    payment_method_id: Optional[str] = None
    return_url: Optional[str] = None


class PaymentInitiateResponse(BaseModel):
    order_id: str
    provider: str
    transaction_id: str
    amount: Decimal
    currency: str = "INR"
    status: str
    client_secret: Optional[str] = None
    razorpay_order_id: Optional[str] = None
    instructions: Optional[str] = None


class PaymentVerifyRequest(BaseModel):
    order_id: str
    provider: str
    transaction_id: str
    payment_intent_id: Optional[str] = None
    razorpay_payment_id: Optional[str] = None
    razorpay_signature: Optional[str] = None
    mock_outcome: Optional[str] = "SUCCESS"  # SUCCESS or FAILED
    card_last4: Optional[str] = None


class PaymentVerifyResponse(BaseModel):
    success: bool
    order_id: str
    status: str
    payment_status: str
    transaction_id: str
    message: str


class WebhookSimulationRequest(BaseModel):
    provider: str = "STRIPE"  # STRIPE, RAZORPAY, MOCK
    order_id: str
    event_type: str = "payment_intent.succeeded"  # or payment.captured
    tamper_signature: bool = False
