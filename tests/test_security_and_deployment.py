import pytest
from fastapi.testclient import TestClient
from app.core.security_middleware import rate_limiter


def test_security_headers_present_on_responses(client: TestClient):
    """Verify security headers are applied to protect against clickjacking, sniffing, and XSS."""
    response = client.get("/")
    assert response.status_code == 200
    headers = response.headers

    assert headers.get("x-content-type-options") == "nosniff"
    assert headers.get("x-frame-options") == "DENY"
    assert headers.get("x-xss-protection") == "1; mode=block"
    assert headers.get("referrer-policy") == "strict-origin-when-cross-origin"
    assert "permissions-policy" in headers


def test_sqli_payload_resilience_in_catalog_search(client: TestClient):
    """Verify natural language and SQL injection payloads are safely sanitized without database errors."""
    malicious_payloads = [
        "' OR '1'='1",
        "'; DROP TABLE users; --",
        "1 UNION SELECT 1, 2, 3, 4, 5 --",
        "admin' --",
        "<script>alert(1)</script>"
    ]
    for payload in malicious_payloads:
        # Search via standard catalog
        res = client.get(f"/api/v1/products?search={payload}")
        assert res.status_code == 200
        data = res.json()
        assert "items" in data

        # Search via semantic search
        sem_res = client.get(f"/api/v1/ai/semantic-search?q={payload}")
        assert sem_res.status_code == 200
        sem_data = sem_res.json()
        assert "products" in sem_data


def test_invalid_uuid_and_nonexistent_routes_fail_gracefully(client: TestClient):
    """Ensure non-existent endpoints and invalid identifiers return structured 404/422 responses."""
    # Non-existent endpoint
    res = client.get("/api/v1/non-existent-endpoint-xyz")
    assert res.status_code == 404

    # Non-existent product ID
    res = client.get("/api/v1/products/invalid-uuid-00000-does-not-exist")
    assert res.status_code == 404
    assert "detail" in res.json()


def test_rate_limiting_enforcement(client: TestClient):
    """Verify rate limiter blocks client when sensitive endpoint is flooded."""
    test_ip = "192.168.100.99"
    # Artificially fill rate limiter bucket for sensitive path
    for _ in range(45):
        rate_limiter.is_allowed(test_ip, is_sensitive=True)

    # Next request with this client IP should be blocked with 429
    allowed, retry_after = rate_limiter.is_allowed(test_ip, is_sensitive=True)
    assert allowed is False
    assert retry_after > 0


def test_cors_preflight_headers(client: TestClient):
    """Verify CORS preflight OPTIONS request returns appropriate access control headers."""
    response = client.options(
        "/api/v1/products",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "GET"
        }
    )
    assert response.status_code in [200, 204]
    assert "access-control-allow-origin" in response.headers
