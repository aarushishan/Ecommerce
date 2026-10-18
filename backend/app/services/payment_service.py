import uuid
import hmac
import hashlib
import json
from decimal import Decimal
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.core.config import settings
from app.models.order import Order, Payment, Shipment
from app.schemas.payment import (
    PaymentInitiateRequest,
    PaymentInitiateResponse,
    PaymentVerifyRequest,
    PaymentVerifyResponse,
    WebhookSimulationRequest
)


class PaymentService:
    @staticmethod
    def initiate_payment(
        db: Session,
        user_id: str,
        request: PaymentInitiateRequest
    ) -> PaymentInitiateResponse:
        order = db.query(Order).filter(
            Order.id == request.order_id,
            Order.user_id == user_id
        ).first()

        if not order:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Order not found."
            )

        if order.payment_status == "PAID":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This order is already fully paid."
            )

        provider = request.provider.upper()
        unique_seed = uuid.uuid4().hex[:12]

        if provider == "STRIPE":
            tx_id = f"pi_test_{unique_seed}"
            client_secret = f"{tx_id}_secret_{uuid.uuid4().hex[:8]}"
            razorpay_order_id = None
            instructions = "Complete test card authorization using Stripe Test credentials."
        elif provider == "RAZORPAY":
            tx_id = f"pay_test_{unique_seed}"
            client_secret = None
            razorpay_order_id = f"order_rzp_{unique_seed}"
            instructions = "Complete test payment via Razorpay UPI / QR / NetBanking sandbox."
        elif provider == "COD":
            tx_id = f"cod_{unique_seed}"
            client_secret = None
            razorpay_order_id = None
            instructions = "Cash on Delivery selected. Payment will be collected at doorstep."
        else:
            provider = "MOCK"
            tx_id = f"mock_tx_{unique_seed}"
            client_secret = f"mock_sec_{unique_seed}"
            razorpay_order_id = None
            instructions = "Instant Sandbox pre-approved checkout."

        # Upsert Payment Record
        existing_payment = db.query(Payment).filter(Payment.order_id == order.id).first()
        if existing_payment:
            existing_payment.provider = provider
            existing_payment.transaction_id = tx_id
            existing_payment.amount = order.total_amount
            existing_payment.status = "PENDING"
            existing_payment.raw_payload = {"initiated_at": datetime.now(timezone.utc).isoformat()}
            payment = existing_payment
        else:
            payment = Payment(
                order_id=order.id,
                provider=provider,
                transaction_id=tx_id,
                amount=order.total_amount,
                currency="INR",
                status="PENDING",
                raw_payload={"initiated_at": datetime.now(timezone.utc).isoformat()}
            )
            db.add(payment)

        db.commit()
        db.refresh(payment)

        return PaymentInitiateResponse(
            order_id=order.id,
            provider=provider,
            transaction_id=tx_id,
            amount=order.total_amount,
            currency="INR",
            status="PENDING",
            client_secret=client_secret,
            razorpay_order_id=razorpay_order_id,
            instructions=instructions
        )

    @staticmethod
    def verify_payment(
        db: Session,
        user_id: Optional[str],
        request: PaymentVerifyRequest
    ) -> PaymentVerifyResponse:
        query = db.query(Order).filter(Order.id == request.order_id)
        if user_id:
            query = query.filter(Order.user_id == user_id)
        order = query.first()

        if not order:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Order not found."
            )

        # Idempotency check: if already paid, return success immediately
        if order.payment_status == "PAID" and order.status != "CANCELLED":
            existing_payment = db.query(Payment).filter(Payment.order_id == order.id).first()
            return PaymentVerifyResponse(
                success=True,
                order_id=order.id,
                status=order.status,
                payment_status="PAID",
                transaction_id=existing_payment.transaction_id if existing_payment else request.transaction_id,
                message="Payment already verified and order confirmed."
            )

        provider = request.provider.upper()
        is_success = True
        failure_reason = ""

        # Check outcome simulation
        if request.mock_outcome and request.mock_outcome.upper() == "FAILED":
            is_success = False
            failure_reason = "Transaction declined by card issuer / bank sandbox."
        elif provider == "STRIPE" and request.card_last4 == "0002":
            is_success = False
            failure_reason = "Your card has expired or was declined by test Stripe engine."
        elif provider == "RAZORPAY" and request.razorpay_signature:
            # Cryptographic signature validation for Razorpay:
            # Razorpay HMAC signature = HMAC_SHA256(secret, order_id + "|" + razorpay_payment_id)
            rzp_order_id = request.transaction_id
            rzp_pay_id = request.razorpay_payment_id or "pay_test"
            expected_data = f"{rzp_order_id}|{rzp_pay_id}"
            expected_sig = hmac.new(
                settings.RAZORPAY_KEY_SECRET.encode(),
                expected_data.encode(),
                hashlib.sha256
            ).hexdigest()

            # If user provided a signature, check if it matches expected or is mock-accepted
            if request.razorpay_signature not in [expected_sig, "valid_mock_signature"]:
                is_success = False
                failure_reason = "Razorpay cryptographic signature verification failed."

        payment = db.query(Payment).filter(Payment.order_id == order.id).first()
        if not payment:
            payment = Payment(
                order_id=order.id,
                provider=provider,
                transaction_id=request.transaction_id,
                amount=order.total_amount,
                currency="INR",
                status="PENDING"
            )
            db.add(payment)

        if not is_success:
            payment.status = "FAILED"
            payment.raw_payload = {
                "verified_at": datetime.now(timezone.utc).isoformat(),
                "error": failure_reason
            }
            order.payment_status = "FAILED"
            db.commit()
            return PaymentVerifyResponse(
                success=False,
                order_id=order.id,
                status=order.status,
                payment_status="FAILED",
                transaction_id=payment.transaction_id,
                message=failure_reason
            )

        # Payment Successful
        payment.status = "SUCCESS"
        payment.raw_payload = {
            "verified_at": datetime.now(timezone.utc).isoformat(),
            "provider": provider,
            "transaction_id": request.transaction_id
        }
        order.status = "CONFIRMED"
        order.payment_status = "PAID" if provider != "COD" else "CASH_ON_DELIVERY"

        # Initialize or update Shipment record
        shipment = db.query(Shipment).filter(Shipment.order_id == order.id).first()
        now_dt = datetime.now(timezone.utc)
        estimated_date = now_dt + timedelta(days=2)

        initial_timeline = [
            {
                "status": "CONFIRMED",
                "title": "Payment Confirmed & Order Placed",
                "description": f"Payment successfully captured via {provider} ({request.transaction_id}). Order sent to fulfillment.",
                "timestamp": now_dt.isoformat(),
                "location": "Central Fulfillment Center, Bengaluru"
            }
        ]

        if not shipment:
            tracking_number = f"SSE-IND-{uuid.uuid4().hex[:8].upper()}"
            shipment = Shipment(
                order_id=order.id,
                carrier="ShopSphere Express",
                tracking_number=tracking_number,
                status="LABEL_CREATED",
                current_location="Central Fulfillment Center, Bengaluru",
                estimated_delivery=estimated_date,
                timeline=initial_timeline
            )
            db.add(shipment)
        else:
            shipment.status = "LABEL_CREATED"
            if not shipment.timeline:
                shipment.timeline = initial_timeline

        db.commit()
        db.refresh(order)

        return PaymentVerifyResponse(
            success=True,
            order_id=order.id,
            status=order.status,
            payment_status=order.payment_status,
            transaction_id=payment.transaction_id,
            message="Payment verified successfully. Order confirmed."
        )

    @staticmethod
    def process_webhook(
        db: Session,
        provider: str,
        raw_body: bytes,
        signature_header: Optional[str]
    ) -> Dict[str, Any]:
        provider = provider.upper()

        if not signature_header:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Missing cryptographic signature header for {provider} webhook."
            )

        # 1. Cryptographic Signature Verification
        if provider == "STRIPE":
            # Stripe signature format: t=<timestamp>,v1=<signature>
            secret = settings.STRIPE_WEBHOOK_SECRET
            try:
                sig_parts = dict(item.split("=", 1) for item in signature_header.split(","))
                timestamp = sig_parts.get("t")
                v1_sig = sig_parts.get("v1")
                if not timestamp or not v1_sig:
                    raise ValueError("Malformed stripe-signature header")

                signed_payload = f"{timestamp}.".encode() + raw_body
                expected_sig = hmac.new(
                    secret.encode(),
                    signed_payload,
                    hashlib.sha256
                ).hexdigest()

                if not hmac.compare_digest(expected_sig, v1_sig):
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Invalid Stripe cryptographic webhook signature."
                    )
            except Exception as e:
                if isinstance(e, HTTPException):
                    raise e
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Stripe signature verification failed: {str(e)}"
                )

        elif provider == "RAZORPAY":
            # Razorpay signature format: HMAC_SHA256(secret, raw_body)
            secret = settings.RAZORPAY_KEY_SECRET
            expected_sig = hmac.new(
                secret.encode(),
                raw_body,
                hashlib.sha256
            ).hexdigest()

            if not hmac.compare_digest(expected_sig, signature_header):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid Razorpay cryptographic webhook signature."
                )

        elif provider == "MOCK":
            # Mock signature format: HMAC_SHA256(SECRET_KEY, raw_body)
            expected_sig = hmac.new(
                settings.SECRET_KEY.encode(),
                raw_body,
                hashlib.sha256
            ).hexdigest()

            if not hmac.compare_digest(expected_sig, signature_header):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid Mock cryptographic webhook signature."
                )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported payment webhook provider: {provider}"
            )

        # 2. Parse Payload
        try:
            payload = json.loads(raw_body.decode("utf-8"))
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Webhook payload is not valid JSON."
            )

        order_id = payload.get("order_id")
        transaction_id = payload.get("transaction_id") or payload.get("id") or f"wh_{uuid.uuid4().hex[:8]}"

        if not order_id:
            # If payload has metadata.order_id (Stripe standard)
            order_id = payload.get("data", {}).get("object", {}).get("metadata", {}).get("order_id")

        if not order_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Webhook payload does not contain an order_id."
            )

        order = db.query(Order).filter(Order.id == order_id).first()
        if not order:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Order referenced in webhook was not found."
            )

        # 3. Idempotency Check: if already PAID, exit cleanly with 200 without mutating
        if order.payment_status == "PAID":
            return {
                "status": "already_processed",
                "idempotent": True,
                "order_id": order.id,
                "payment_status": "PAID"
            }

        # 4. Mark Order Confirmed & Paid
        order.status = "CONFIRMED"
        order.payment_status = "PAID"

        payment = db.query(Payment).filter(Payment.order_id == order.id).first()
        if not payment:
            payment = Payment(
                order_id=order.id,
                provider=provider,
                transaction_id=transaction_id,
                amount=order.total_amount,
                currency="INR",
                status="SUCCESS",
                raw_payload=payload
            )
            db.add(payment)
        else:
            payment.status = "SUCCESS"
            payment.raw_payload = payload

        # Create or update shipment
        shipment = db.query(Shipment).filter(Shipment.order_id == order.id).first()
        now_dt = datetime.now(timezone.utc)
        initial_timeline = [
            {
                "status": "CONFIRMED",
                "title": "Payment Confirmed via Webhook",
                "description": f"Verified cryptographic signature from {provider}. Order confirmed.",
                "timestamp": now_dt.isoformat(),
                "location": "Central Fulfillment Center, Bengaluru"
            }
        ]

        if not shipment:
            tracking_number = f"SSE-IND-{uuid.uuid4().hex[:8].upper()}"
            shipment = Shipment(
                order_id=order.id,
                carrier="ShopSphere Express",
                tracking_number=tracking_number,
                status="LABEL_CREATED",
                current_location="Central Fulfillment Center, Bengaluru",
                estimated_delivery=now_dt + timedelta(days=2),
                timeline=initial_timeline
            )
            db.add(shipment)
        else:
            if not shipment.timeline:
                shipment.timeline = initial_timeline

        db.commit()

        return {
            "status": "success",
            "idempotent": False,
            "order_id": order.id,
            "payment_status": "PAID",
            "transaction_id": transaction_id
        }

    @staticmethod
    def simulate_signed_webhook(
        db: Session,
        sim_request: WebhookSimulationRequest
    ) -> Dict[str, Any]:
        """
        Creates a valid (or intentionally tampered) cryptographic signature for the given provider
        and executes the webhook handler directly.
        """
        provider = sim_request.provider.upper()
        order = db.query(Order).filter(Order.id == sim_request.order_id).first()
        if not order:
            raise HTTPException(status_code=404, detail="Order not found.")

        payload_dict = {
            "event": sim_request.event_type,
            "order_id": order.id,
            "amount": float(order.total_amount),
            "currency": "INR",
            "transaction_id": f"sim_{provider.lower()}_{uuid.uuid4().hex[:8]}",
            "timestamp": int(datetime.now(timezone.utc).timestamp())
        }
        raw_body = json.dumps(payload_dict, separators=(",", ":")).encode("utf-8")

        # Generate signature
        if provider == "STRIPE":
            t = str(int(datetime.now(timezone.utc).timestamp()))
            signed_payload = f"{t}.".encode() + raw_body
            sig = hmac.new(
                settings.STRIPE_WEBHOOK_SECRET.encode(),
                signed_payload,
                hashlib.sha256
            ).hexdigest()
            if sim_request.tamper_signature:
                sig = sig[:-4] + "dead"
            sig_header = f"t={t},v1={sig}"
        elif provider == "RAZORPAY":
            sig = hmac.new(
                settings.RAZORPAY_KEY_SECRET.encode(),
                raw_body,
                hashlib.sha256
            ).hexdigest()
            if sim_request.tamper_signature:
                sig = sig[:-4] + "dead"
            sig_header = sig
        else:  # MOCK
            sig = hmac.new(
                settings.SECRET_KEY.encode(),
                raw_body,
                hashlib.sha256
            ).hexdigest()
            if sim_request.tamper_signature:
                sig = sig[:-4] + "dead"
            sig_header = sig

        return PaymentService.process_webhook(db, provider, raw_body, sig_header)
