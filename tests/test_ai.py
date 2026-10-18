import pytest
from fastapi.testclient import TestClient


def test_spherebot_chat_greeting(client: TestClient):
    """Test AI Shopping Assistant greeting intent."""
    response = client.post("/api/v1/ai/chat", json={"query": "Hello SphereBot!"})
    assert response.status_code == 200
    data = response.json()
    assert "SphereBot" in data["message"]
    assert data["intent"] == "GENERAL"
    assert len(data["quick_replies"]) > 0


def test_spherebot_chat_product_search(client: TestClient):
    """Test AI assistant grounded product search with live catalog items."""
    response = client.post("/api/v1/ai/chat", json={"query": "Show me wireless headphones"})
    assert response.status_code == 200
    data = response.json()
    assert data["intent"] == "PRODUCT_SEARCH"
    assert len(data["suggested_products"]) > 0
    first_prod = data["suggested_products"][0]
    assert "title" in first_prod
    assert "base_price" in first_prod
    assert "in_stock" in first_prod


def test_spherebot_chat_policy_faq(client: TestClient):
    """Test AI assistant policy lookup for returns and refunds."""
    response = client.post("/api/v1/ai/chat", json={"query": "What is your return and refund policy?"})
    assert response.status_code == 200
    data = response.json()
    assert data["intent"] == "POLICY_FAQ"
    assert "Return" in data["message"]
    assert "7-Day" in data["message"]


def test_spherebot_chat_order_tracking_unauthenticated(client: TestClient):
    """Test AI assistant order status query when unauthenticated prompts to sign in."""
    response = client.post("/api/v1/ai/chat", json={"query": "Where is my order?"})
    assert response.status_code == 200
    data = response.json()
    assert data["intent"] == "ORDER_TRACKING"
    assert "Sign In" in data["message"]


def test_get_similar_products_recommendations(client: TestClient):
    """Test content-based similar items recommendation."""
    # First get a valid product
    catalog_res = client.get("/api/v1/products?limit=1")
    assert catalog_res.status_code == 200
    items = catalog_res.json()["items"]
    assert len(items) > 0
    target_id = items[0]["id"]

    res = client.get(f"/api/v1/ai/recommendations/similar/{target_id}?limit=4")
    assert res.status_code == 200
    sim_items = res.json()
    assert isinstance(sim_items, list)
    # The target product itself should not be in the similar items list
    for item in sim_items:
        assert item["id"] != target_id


def test_get_frequently_bought_together(client: TestClient):
    """Test complementary product recommendation."""
    catalog_res = client.get("/api/v1/products?limit=1")
    assert catalog_res.status_code == 200
    target_id = catalog_res.json()["items"][0]["id"]

    res = client.get(f"/api/v1/ai/recommendations/frequently-bought-together/{target_id}?limit=3")
    assert res.status_code == 200
    fbt_items = res.json()
    assert isinstance(fbt_items, list)
    assert len(fbt_items) > 0


def test_get_recommendations_for_you(client: TestClient):
    """Test personalized/feed recommendations endpoint."""
    res = client.get("/api/v1/ai/recommendations/for-you?limit=6")
    assert res.status_code == 200
    feed = res.json()
    assert isinstance(feed, list)
    assert len(feed) > 0


def test_product_comparison_endpoint(client: TestClient):
    """Test side-by-side comparison matrix generation across multiple items."""
    catalog_res = client.get("/api/v1/products?limit=2")
    assert catalog_res.status_code == 200
    items = catalog_res.json()["items"]
    assert len(items) >= 2
    p_ids = [items[0]["id"], items[1]["id"]]

    res = client.post("/api/v1/ai/compare", json={"product_ids": p_ids})
    assert res.status_code == 200
    data = res.json()
    assert len(data["items"]) == 2
    assert "verdict" in data
    assert len(data["common_attributes"]) > 0
    for comp_item in data["items"]:
        assert "specs" in comp_item
        assert "value_score" in comp_item
        assert "highlights" in comp_item


def test_product_comparison_validation_error(client: TestClient):
    """Test product comparison returns 400 when less than 2 products provided."""
    catalog_res = client.get("/api/v1/products?limit=1")
    target_id = catalog_res.json()["items"][0]["id"]

    res = client.post("/api/v1/ai/compare", json={"product_ids": [target_id, "non-existent-id-999"]})
    assert res.status_code == 400


def test_semantic_search_with_intent_extraction(client: TestClient):
    """Test semantic search parsing price limits, category hints, and ranking products."""
    res = client.get("/api/v1/ai/semantic-search?q=wireless headphones under 15000&limit=5")
    assert res.status_code == 200
    data = res.json()
    assert data["query"] == "wireless headphones under 15000"
    assert "parsed_intent" in data
    assert data["parsed_intent"]["max_price"] == 15000.0
    assert isinstance(data["products"], list)
