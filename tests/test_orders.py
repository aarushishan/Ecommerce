import uuid
import pytest


def test_order_placement_and_inventory_decrement(client):
    # 1. Register a dedicated test customer
    email = f"order_test_{uuid.uuid4().hex[:8]}@shopsphere.com"
    reg_res = client.post("/api/v1/auth/register", json={
        "email": email,
        "password": "Password123!",
        "first_name": "Arjun",
        "last_name": "Sharma"
    })
    assert reg_res.status_code == 201
    token = reg_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Add an address
    addr_res = client.post("/api/v1/users/addresses", json={
        "full_name": "Arjun Sharma",
        "phone_number": "+91 9876543210",
        "address_line1": "Flat 402, Lotus Heights, Indiranagar",
        "city": "Bengaluru",
        "state": "Karnataka",
        "postal_code": "560038",
        "country": "India",
        "is_default": True
    }, headers=headers)
    assert addr_res.status_code == 201
    address_id = addr_res.json()["id"]

    # 3. Check order creation with empty cart fails with 400
    empty_order_res = client.post("/api/v1/orders", json={
        "shipping_address_id": address_id
    }, headers=headers)
    assert empty_order_res.status_code == 400
    assert "empty" in empty_order_res.json()["detail"].lower()

    # 4. Get product variant details and current stock
    prod_res = client.get("/api/v1/products/aurapro-wireless-noise-cancelling-headphones")
    assert prod_res.status_code == 200
    prod = prod_res.json()
    product_id = prod["id"]
    variant = prod["variants"][0]
    variant_id = variant["id"]
    initial_stock = variant["stock_quantity"]
    unit_price = float(prod["discount_price"] or prod["base_price"])

    # 5. Add 2 units to authenticated user's cart
    qty_to_order = 2
    cart_add_res = client.post("/api/v1/cart/items", json={
        "product_id": product_id,
        "variant_id": variant_id,
        "quantity": qty_to_order
    }, headers=headers)
    assert cart_add_res.status_code == 200
    cart_data = cart_add_res.json()
    assert cart_data["total_items"] == qty_to_order

    # 6. Place Order
    order_res = client.post("/api/v1/orders", json={
        "shipping_address_id": address_id,
        "delivery_notes": "Leave at front desk"
    }, headers=headers)
    assert order_res.status_code == 201
    order = order_res.json()

    assert order["order_number"].startswith("SS-2026-")
    assert order["status"] == "CONFIRMED"
    assert order["payment_status"] == "PAID"
    assert len(order["items"]) == 1
    assert order["items"][0]["quantity"] == qty_to_order
    assert float(order["items"][0]["unit_price"]) == unit_price

    # Verify calculation: Subtotal = 2 * unit_price
    expected_subtotal = round(qty_to_order * unit_price, 2)
    assert float(order["subtotal"]) == pytest.approx(expected_subtotal, 0.01)
    # Free shipping on orders >= 499
    expected_shipping = 0.0 if expected_subtotal >= 499.0 else 50.0
    assert float(order["shipping_fee"]) == expected_shipping
    # 5% tax
    expected_tax = round(expected_subtotal * 0.05, 2)
    assert float(order["tax_amount"]) == pytest.approx(expected_tax, 0.01)
    expected_total = round(expected_subtotal + expected_shipping + expected_tax, 2)
    assert float(order["total_amount"]) == pytest.approx(expected_total, 0.01)

    # 7. Verify user's cart is now empty
    cart_after_res = client.get("/api/v1/cart", headers=headers)
    assert cart_after_res.status_code == 200
    assert cart_after_res.json()["total_items"] == 0
    assert len(cart_after_res.json()["items"]) == 0

    # 8. Verify physical stock was decremented
    updated_prod_res = client.get("/api/v1/products/aurapro-wireless-noise-cancelling-headphones")
    updated_prod = updated_prod_res.json()
    updated_variant = next(v for v in updated_prod["variants"] if v["id"] == variant_id)
    assert updated_variant["stock_quantity"] == initial_stock - qty_to_order

    # 9. Verify order listing
    orders_list_res = client.get("/api/v1/orders", headers=headers)
    assert orders_list_res.status_code == 200
    orders_list = orders_list_res.json()
    assert len(orders_list) >= 1
    assert orders_list[0]["id"] == order["id"]

    # 10. Verify order detail by ID
    order_detail_res = client.get(f"/api/v1/orders/{order['id']}", headers=headers)
    assert order_detail_res.status_code == 200
    assert order_detail_res.json()["order_number"] == order["order_number"]
    assert order_detail_res.json()["shipping_address"]["city"] == "Bengaluru"
