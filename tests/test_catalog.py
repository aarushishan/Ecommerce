def test_list_categories(client):
    response = client.get("/api/v1/categories")
    assert response.status_code == 200
    categories = response.json()
    assert len(categories) > 0
    slugs = [c["slug"] for c in categories]
    assert "audio" in slugs
    assert "laptops" in slugs


def test_list_products_pagination(client):
    response = client.get("/api/v1/products?page=1&limit=4")
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert len(data["items"]) <= 4
    assert data["page"] == 1
    assert data["limit"] == 4
    assert data["total"] >= 1


def test_search_products_by_keyword(client):
    response = client.get("/api/v1/products?search=AuraPro")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] >= 1
    titles = [item["title"] for item in data["items"]]
    assert any("AuraPro" in title for title in titles)


def test_filter_products_by_category(client):
    response = client.get("/api/v1/products?category=audio")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] >= 1
    for item in data["items"]:
        assert item["category_slug"] == "audio"


def test_filter_products_by_price_range(client):
    response = client.get("/api/v1/products?min_price=10000&max_price=30000")
    assert response.status_code == 200
    data = response.json()
    for item in data["items"]:
        effective_price = float(item["discount_price"] or item["base_price"])
        assert 10000 <= effective_price <= 30000


def test_sort_products_by_price(client):
    # Price Ascending
    res_asc = client.get("/api/v1/products?sort=price_asc")
    assert res_asc.status_code == 200
    items_asc = res_asc.json()["items"]
    prices_asc = [float(i["discount_price"] or i["base_price"]) for i in items_asc]
    assert prices_asc == sorted(prices_asc)

    # Price Descending
    res_desc = client.get("/api/v1/products?sort=price_desc")
    assert res_desc.status_code == 200
    items_desc = res_desc.json()["items"]
    prices_desc = [float(i["discount_price"] or i["base_price"]) for i in items_desc]
    assert prices_desc == sorted(prices_desc, reverse=True)


def test_get_product_detail_success(client):
    response = client.get("/api/v1/products/aurapro-wireless-noise-cancelling-headphones")
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "AuraPro Wireless Noise Cancelling Headphones"
    assert data["brand"] == "SoundAura"
    assert len(data["images"]) >= 1
    assert len(data["variants"]) >= 1
    assert data["total_stock"] > 0


def test_get_product_detail_not_found(client):
    response = client.get("/api/v1/products/non-existent-product-slug-xyz")
    assert response.status_code == 404
    assert "detail" in response.json()
