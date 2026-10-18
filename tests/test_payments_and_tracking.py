import uuid
import hmac
import hashlib
import json
import pytest
from app.core.config import settings


def register_and_get_auth(client):
    email = f"cust_{uuid.uuid4().hex[:8]}@shopsphere.com"
    res = client.post("/api/v1/auth/register", json={
        "email": email,
        "password": "Password123!",
        "first_name": "Rohan",
        "last_name": "Verma"
    })
    assert res.status_code == 201
    token = res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Add shipping address
    addr_res = client.post("/api/v1/users/addresses", json={
        "full_name": "Rohan Verma",
        "phone_number": "+91 9988776655",
        "address_line1": "Tower 5, EcoSpace Tech Park",
        "city": "Bengaluru",
        "state": "Karnataka",
        "postal_code": "560103",
        "country": "India",
        "is_default": True
    }, headers=headers)
    assert addr_res.status_code == 201
    address_id = addr_res.json()["id"]

    return headers, address_id


def setup_cart_item(client, headers):
    # Fetch a product from listing with available stock
    list_res = client.get("/api/v1/products")
    assert list_res.status_code == 200
    for item in list_res.json()["items"]:
        prod_res = client.get(f"/api/v1/products/{item['slug']}")
        if prod_res.status_code == 200:
            prod = prod_res.json()
            for v in prod.get("variants", []):
                if v.get("stock_quantity", 0) > 0:
                    add_res = client.post("/api/v1/cart/items", json={
                        "product_id": prod["id"],
                        "variant_id": v["id"],
                        "quantity": 1
                    }, headers=headers)
                    if add_res.status_code == 200:
                        return prod, v
    raise RuntimeError("No in-stock product variant found in catalog")


def test_mock_payment_checkout_flow(client):
    headers, address_id = register_and_get_auth(client)
    prod, variant = setup_cart_item(client, headers)

    # Place order with MOCK payment
    order_res = client.post("/api/v1/orders", json={
        "shipping_address_id": address_id,
        "payment_method": "MOCK",
        "delivery_notes": "Handle with care"
    }, headers=headers)
    assert order_res.status_code == 201
    order = order_res.json()

    assert order["status"] == "CONFIRMED"
    assert order["payment_status"] == "PAID"
    assert order["payment"] is not None
    assert order["payment"]["provider"] == "MOCK"
    assert order["payment"]["status"] == "SUCCESS"
    assert order["shipment"] is not None
    assert order["shipment"]["tracking_number"].startswith("SSE-IND-")
    assert len(order["shipment"]["timeline"]) >= 1


def test_stripe_test_mode_payment_flow(client):
    headers, address_id = register_and_get_auth(client)
    prod, variant = setup_cart_item(client, headers)

    # 1. Place order with STRIPE (pending payment)
    order_res = client.post("/api/v1/orders", json={
        "shipping_address_id": address_id,
        "payment_method": "STRIPE"
    }, headers=headers)
    assert order_res.status_code == 201
    order = order_res.json()
    order_id = order["id"]

    assert order["status"] == "PENDING"
    assert order["payment_status"] == "UNPAID"

    # 2. Initiate Stripe payment intent
    init_res = client.post("/api/v1/payments/initiate", json={
        "order_id": order_id,
        "provider": "STRIPE"
    }, headers=headers)
    assert init_res.status_code == 200
    init_data = init_res.json()
    assert init_data["provider"] == "STRIPE"
    assert "pi_test_" in init_data["transaction_id"]
    assert init_data["client_secret"] is not None

    # 3. Test card decline simulation (e.g. card_last4 == "0002")
    fail_verify_res = client.post("/api/v1/payments/verify", json={
        "order_id": order_id,
        "provider": "STRIPE",
        "transaction_id": init_data["transaction_id"],
        "card_last4": "0002"
    }, headers=headers)
    assert fail_verify_res.status_code == 200
    fail_data = fail_verify_res.json()
    assert fail_data["success"] is False
    assert fail_data["payment_status"] == "FAILED"

    # 4. Successful card verification
    success_verify_res = client.post("/api/v1/payments/verify", json={
        "order_id": order_id,
        "provider": "STRIPE",
        "transaction_id": init_data["transaction_id"],
        "card_last4": "4242"
    }, headers=headers)
    assert success_verify_res.status_code == 200
    success_data = success_verify_res.json()
    assert success_data["success"] is True
    assert success_data["status"] == "CONFIRMED"
    assert success_data["payment_status"] == "PAID"

    # Check order detail is now confirmed & paid
    detail_res = client.get(f"/api/v1/orders/{order_id}", headers=headers)
    assert detail_res.status_code == 200
    detail = detail_res.json()
    assert detail["status"] == "CONFIRMED"
    assert detail["payment_status"] == "PAID"
    assert detail["shipment"]["tracking_number"] is not None


def test_razorpay_payment_flow(client):
    headers, address_id = register_and_get_auth(client)
    prod, variant = setup_cart_item(client, headers)

    order_res = client.post("/api/v1/orders", json={
        "shipping_address_id": address_id,
        "payment_method": "RAZORPAY"
    }, headers=headers)
    assert order_res.status_code == 201
    order_id = order_res.json()["id"]

    init_res = client.post("/api/v1/payments/initiate", json={
        "order_id": order_id,
        "provider": "RAZORPAY"
    }, headers=headers)
    assert init_res.status_code == 200
    init_data = init_res.json()
    assert "pay_test_" in init_data["transaction_id"]
    assert init_data["razorpay_order_id"] is not None

    # Verify payment
    verify_res = client.post("/api/v1/payments/verify", json={
        "order_id": order_id,
        "provider": "RAZORPAY",
        "transaction_id": init_data["transaction_id"],
        "razorpay_payment_id": "pay_test_verified",
        "razorpay_signature": "valid_mock_signature"
    }, headers=headers)
    assert verify_res.status_code == 200
    assert verify_res.json()["success"] is True


def test_order_lifecycle_state_engine(client):
    headers, address_id = register_and_get_auth(client)
    prod, variant = setup_cart_item(client, headers)

    order_res = client.post("/api/v1/orders", json={
        "shipping_address_id": address_id,
        "payment_method": "MOCK"
    }, headers=headers)
    order_id = order_res.json()["id"]
    assert order_res.json()["status"] == "CONFIRMED"

    # 1. Transition: CONFIRMED -> PROCESSING
    p1 = client.patch(f"/api/v1/orders/{order_id}/status", json={
        "status": "PROCESSING",
        "notes": "Items scanned and packed into shipping box."
    }, headers=headers)
    assert p1.status_code == 200
    assert p1.json()["status"] == "PROCESSING"
    assert p1.json()["shipment"]["status"] == "PICKED_UP"

    # 2. Transition: PROCESSING -> SHIPPED
    p2 = client.patch(f"/api/v1/orders/{order_id}/status", json={
        "status": "SHIPPED",
        "notes": "Dispatched with line-haul courier."
    }, headers=headers)
    assert p2.status_code == 200
    assert p2.json()["status"] == "SHIPPED"
    assert p2.json()["shipment"]["status"] == "IN_TRANSIT"

    # 3. Transition: SHIPPED -> OUT_FOR_DELIVERY
    p3 = client.patch(f"/api/v1/orders/{order_id}/status", json={
        "status": "OUT_FOR_DELIVERY",
        "notes": "Executive out for delivery."
    }, headers=headers)
    assert p3.status_code == 200
    assert p3.json()["status"] == "OUT_FOR_DELIVERY"

    # 4. Transition: OUT_FOR_DELIVERY -> DELIVERED
    p4 = client.patch(f"/api/v1/orders/{order_id}/status", json={
        "status": "DELIVERED",
        "notes": "Delivered to customer."
    }, headers=headers)
    assert p4.status_code == 200
    assert p4.json()["status"] == "DELIVERED"
    assert p4.json()["shipment"]["status"] == "DELIVERED"
    assert len(p4.json()["shipment"]["timeline"]) >= 5

    # 5. Invalid transition: cannot transition from DELIVERED to CONFIRMED
    p_invalid = client.patch(f"/api/v1/orders/{order_id}/status", json={
        "status": "CONFIRMED"
    }, headers=headers)
    assert p_invalid.status_code == 400
    assert "illegal" in p_invalid.json()["detail"].lower()


def test_order_cancellation_and_inventory_restoration(client):
    headers, address_id = register_and_get_auth(client)
    prod, variant = setup_cart_item(client, headers)
    variant_id = variant["id"]

    # Check initial stock
    p_check = client.get(f"/api/v1/products/{prod['slug']}")
    var_check = next(v for v in p_check.json()["variants"] if v["id"] == variant_id)
    stock_before_order = var_check["stock_quantity"]

    # Place order
    order_res = client.post("/api/v1/orders", json={
        "shipping_address_id": address_id,
        "payment_method": "MOCK"
    }, headers=headers)
    order_id = order_res.json()["id"]

    # Check stock was decremented by 1
    p_check2 = client.get(f"/api/v1/products/{prod['slug']}")
    var_check2 = next(v for v in p_check2.json()["variants"] if v["id"] == variant_id)
    assert var_check2["stock_quantity"] == stock_before_order - 1

    # Cancel order
    cancel_res = client.post(f"/api/v1/orders/{order_id}/cancel?reason=Changed%20mind", headers=headers)
    assert cancel_res.status_code == 200
    assert cancel_res.json()["status"] == "CANCELLED"
    assert cancel_res.json()["payment_status"] == "REFUNDED"

    # Check stock was restored
    p_check3 = client.get(f"/api/v1/products/{prod['slug']}")
    var_check3 = next(v for v in p_check3.json()["variants"] if v["id"] == variant_id)
    assert var_check3["stock_quantity"] == stock_before_order


def test_cryptographic_webhook_and_idempotency(client):
    headers, address_id = register_and_get_auth(client)
    prod, variant = setup_cart_item(client, headers)

    order_res = client.post("/api/v1/orders", json={
        "shipping_address_id": address_id,
        "payment_method": "STRIPE"
    }, headers=headers)
    order_id = order_res.json()["id"]

    # 1. Test simulation with authentic cryptographic signature
    sim_valid = client.post("/api/v1/payments/simulate-webhook", json={
        "provider": "STRIPE",
        "order_id": order_id,
        "event_type": "payment_intent.succeeded",
        "tamper_signature": False
    })
    assert sim_valid.status_code == 200
    valid_data = sim_valid.json()
    assert valid_data["status"] == "success"
    assert valid_data["payment_status"] == "PAID"

    # 2. Test idempotency: sending the webhook again for the same order
    sim_idempotent = client.post("/api/v1/payments/simulate-webhook", json={
        "provider": "STRIPE",
        "order_id": order_id,
        "event_type": "payment_intent.succeeded",
        "tamper_signature": False
    })
    assert sim_idempotent.status_code == 200
    idemp_data = sim_idempotent.json()
    assert idemp_data["idempotent"] is True
    assert idemp_data["status"] == "already_processed"

    # 3. Test tampered signature is strictly rejected with 400
    headers2, address_id2 = register_and_get_auth(client)
    setup_cart_item(client, headers2)
    order_res2 = client.post("/api/v1/orders", json={
        "shipping_address_id": address_id2,
        "payment_method": "STRIPE"
    }, headers=headers2)
    order_id2 = order_res2.json()["id"]

    sim_tampered = client.post("/api/v1/payments/simulate-webhook", json={
        "provider": "STRIPE",
        "order_id": order_id2,
        "event_type": "payment_intent.succeeded",
        "tamper_signature": True
    })
    assert sim_tampered.status_code == 400
    assert "signature" in sim_tampered.json()["detail"].lower()
