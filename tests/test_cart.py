import uuid
import pytest


@pytest.fixture
def product_fixture(client):
    """Retrieve a seeded product and its primary variant for cart testing."""
    res = client.get("/api/v1/products/aurapro-wireless-noise-cancelling-headphones")
    assert res.status_code == 200
    prod = res.json()
    return {
        "product_id": prod["id"],
        "variant_id": prod["variants"][0]["id"],
        "price": float(prod["discount_price"] or prod["base_price"]),
        "stock": prod["variants"][0]["stock_quantity"]
    }


def test_guest_cart_flow(client, product_fixture):
    session_id = f"guest-{uuid.uuid4().hex}"
    headers = {"X-Session-Token": session_id}

    # 1. Fetch empty cart
    res = client.get("/api/v1/cart", headers=headers)
    assert res.status_code == 200
    cart = res.json()
    assert cart["total_items"] == 0
    assert len(cart["items"]) == 0
    assert float(cart["subtotal"]) == 0.0

    # 2. Add product variant to cart
    add_payload = {
        "product_id": product_fixture["product_id"],
        "variant_id": product_fixture["variant_id"],
        "quantity": 2
    }
    res = client.post("/api/v1/cart/items", json=add_payload, headers=headers)
    assert res.status_code == 200
    cart = res.json()
    assert cart["total_items"] == 2
    assert len(cart["items"]) == 1
    cart_item = cart["items"][0]
    assert cart_item["quantity"] == 2
    assert float(cart_item["unit_price"]) == product_fixture["price"]

    # 3. Update quantity
    update_payload = {"quantity": 3}
    res = client.put(f"/api/v1/cart/items/{cart_item['id']}", json=update_payload, headers=headers)
    assert res.status_code == 200
    cart = res.json()
    assert cart["total_items"] == 3
    assert cart["items"][0]["quantity"] == 3

    # 4. Remove item
    res = client.delete(f"/api/v1/cart/items/{cart_item['id']}", headers=headers)
    assert res.status_code == 200
    cart = res.json()
    assert cart["total_items"] == 0
    assert len(cart["items"]) == 0


def test_cart_exceed_stock_limit(client, product_fixture):
    session_id = f"guest-{uuid.uuid4().hex}"
    headers = {"X-Session-Token": session_id}

    # Attempt to add excessive quantity beyond physical stock
    excessive_qty = product_fixture["stock"] + 100
    add_payload = {
        "product_id": product_fixture["product_id"],
        "variant_id": product_fixture["variant_id"],
        "quantity": excessive_qty
    }
    res = client.post("/api/v1/cart/items", json=add_payload, headers=headers)
    assert res.status_code == 400
    assert "available in stock" in res.json()["detail"].lower()


def test_authenticated_wishlist_flow(client, product_fixture):
    # Register customer
    user_email = f"wishlist_user_{uuid.uuid4().hex[:8]}@shopsphere.com"
    reg_payload = {
        "email": user_email,
        "password": "Password123!",
        "first_name": "Wishlist",
        "last_name": "Tester"
    }
    res = client.post("/api/v1/auth/register", json=reg_payload)
    assert res.status_code == 201
    token = res.json()["access_token"]
    auth_headers = {"Authorization": f"Bearer {token}"}

    # Wishlist is initially empty
    res = client.get("/api/v1/wishlist", headers=auth_headers)
    assert res.status_code == 200
    assert len(res.json()) == 0

    # Toggle to add
    res = client.post(f"/api/v1/wishlist/toggle/{product_fixture['product_id']}", headers=auth_headers)
    assert res.status_code == 200
    assert res.json()["is_wishlisted"] is True

    # Check wishlist contains product
    res = client.get("/api/v1/wishlist", headers=auth_headers)
    assert res.status_code == 200
    items = res.json()
    assert len(items) == 1
    assert items[0]["product_id"] == product_fixture["product_id"]

    # Toggle to remove
    res = client.post(f"/api/v1/wishlist/toggle/{product_fixture['product_id']}", headers=auth_headers)
    assert res.status_code == 200
    assert res.json()["is_wishlisted"] is False

    # Check wishlist is empty again
    res = client.get("/api/v1/wishlist", headers=auth_headers)
    assert res.status_code == 200
    assert len(res.json()) == 0
