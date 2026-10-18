import uuid
import pytest
from app.models.user import Role


def create_user(client, role_name="CUSTOMER"):
    email = f"user_{uuid.uuid4().hex[:8]}@shopsphere.com"
    reg_res = client.post("/api/v1/auth/register", json={
        "email": email,
        "password": "Password123!",
        "first_name": "Test",
        "last_name": "User"
    })
    assert reg_res.status_code == 201
    user_data = reg_res.json()
    token = user_data["access_token"]
    user_id = user_data["user"]["id"]

    # If role_name is SELLER or ADMIN, we can promote via DB directly or via admin
    if role_name != "CUSTOMER":
        from app.core.database import SessionLocal
        from app.models.user import User as UserModel
        db = SessionLocal()
        try:
            target_role = db.query(Role).filter(Role.name == role_name).first()
            user_obj = db.query(UserModel).filter(UserModel.id == user_id).first()
            if target_role and user_obj:
                user_obj.role_id = target_role.id
                db.commit()
        finally:
            db.close()

        # Re-login to get updated JWT with new role
        login_res = client.post("/api/v1/auth/login", json={
            "email": email,
            "password": "Password123!"
        })
        assert login_res.status_code == 200
        token = login_res.json()["access_token"]

    headers = {"Authorization": f"Bearer {token}"}
    return headers, user_id, email


def test_rbac_security_barriers(client):
    # Customer trying to access Admin or Seller endpoints directly
    cust_headers, _, _ = create_user(client, "CUSTOMER")

    # Accessing admin KPIs
    admin_res = client.get("/api/v1/admin/kpis", headers=cust_headers)
    assert admin_res.status_code == 403
    assert "administrator" in admin_res.json()["detail"].lower()

    # Accessing seller metrics without being a seller
    seller_res = client.get("/api/v1/seller/metrics", headers=cust_headers)
    assert seller_res.status_code == 403
    assert "seller" in seller_res.json()["detail"].lower()


def test_seller_onboarding_and_product_management(client):
    # Register customer and onboard as seller
    headers, user_id, email = create_user(client, "CUSTOMER")

    # 1. Onboard as Seller
    onboard_res = client.post("/api/v1/seller/onboard", json={
        "store_name": f"Aura Tech Store {uuid.uuid4().hex[:4]}",
        "description": "Premium lifestyle acoustics and gadgets.",
        "tax_id": "GSTIN-IND-998822"
    }, headers=headers)
    assert onboard_res.status_code == 201
    store = onboard_res.json()
    assert store["store_name"].startswith("Aura Tech Store")
    assert store["is_approved"] is True

    # Re-login to refresh JWT role to SELLER
    login_res = client.post("/api/v1/auth/login", json={
        "email": email,
        "password": "Password123!"
    })
    assert login_res.status_code == 200
    seller_token = login_res.json()["access_token"]
    seller_headers = {"Authorization": f"Bearer {seller_token}"}

    # 2. Get Seller Metrics (initial)
    metrics_res = client.get("/api/v1/seller/metrics", headers=seller_headers)
    assert metrics_res.status_code == 200
    metrics = metrics_res.json()
    assert "total_revenue" in metrics
    assert "low_stock_count" in metrics

    # 3. Create Product in Seller Catalog
    # Get a valid category ID
    cat_res = client.get("/api/v1/categories")
    assert cat_res.status_code == 200
    cat_id = cat_res.json()[0]["id"]

    new_prod_res = client.post("/api/v1/seller/products", json={
        "title": "Aura Ultra Pro Studio Monitor",
        "category_id": cat_id,
        "brand": "AuraAudio",
        "description": "Reference-grade studio monitoring headphones with active noise cancellation.",
        "base_price": "2499.00",
        "discount_price": "1999.00",
        "initial_stock": 15,
        "sku": f"AURA-STUDIO-{uuid.uuid4().hex[:6].upper()}"
    }, headers=seller_headers)
    assert new_prod_res.status_code == 201
    prod_data = new_prod_res.json()
    prod_id = prod_data["id"]

    # 4. View Seller Products
    seller_prods = client.get("/api/v1/seller/products", headers=seller_headers)
    assert seller_prods.status_code == 200
    prods_list = seller_prods.json()
    created_prod = next(p for p in prods_list if p["id"] == prod_id)
    assert created_prod["title"] == "Aura Ultra Pro Studio Monitor"
    assert created_prod["total_stock"] == 15
    variant_id = created_prod["variants"][0]["id"]

    # 5. Quick Stock Adjustment with Row Lock
    stock_res = client.patch(f"/api/v1/seller/inventory/{variant_id}", json={
        "variant_id": variant_id,
        "quantity": 3,
        "low_stock_threshold": 5
    }, headers=seller_headers)
    assert stock_res.status_code == 200
    assert stock_res.json()["quantity"] == 3

    # Verify low stock alert now triggered in metrics
    updated_metrics = client.get("/api/v1/seller/metrics", headers=seller_headers).json()
    assert updated_metrics["low_stock_count"] >= 1

    # 6. Test Data Isolation: Second Seller cannot edit First Seller's product
    seller2_headers, _, email2 = create_user(client, "CUSTOMER")
    client.post("/api/v1/seller/onboard", json={
        "store_name": f"Second Store {uuid.uuid4().hex[:4]}"
    }, headers=seller2_headers)

    login2 = client.post("/api/v1/auth/login", json={
        "email": email2,
        "password": "Password123!"
    })
    assert login2.status_code == 200
    seller2_headers = {"Authorization": f"Bearer {login2.json()['access_token']}"}

    forbidden_edit = client.patch(f"/api/v1/seller/products/{prod_id}", json={
        "title": "Hacked Product Name"
    }, headers=seller2_headers)
    assert forbidden_edit.status_code == 404


def test_admin_portal_operations_and_audit_trail(client):
    admin_headers, admin_id, admin_email = create_user(client, "ADMIN")

    # 1. Platform KPIs
    kpi_res = client.get("/api/v1/admin/kpis", headers=admin_headers)
    assert kpi_res.status_code == 200
    kpis = kpi_res.json()
    assert "gmv" in kpis
    assert "total_orders" in kpis
    assert "total_users" in kpis
    assert "recent_sales_trend" in kpis
    assert len(kpis["recent_sales_trend"]) == 7

    # 2. User Directory & Role Promotion
    cust_headers, target_user_id, target_email = create_user(client, "CUSTOMER")
    users_res = client.get("/api/v1/admin/users", headers=admin_headers)
    assert users_res.status_code == 200
    users_list = users_res.json()
    assert len(users_list) >= 2

    # Promote Customer to SELLER role via Admin
    promote_res = client.patch(f"/api/v1/admin/users/{target_user_id}", json={
        "role_name": "SELLER"
    }, headers=admin_headers)
    assert promote_res.status_code == 200
    assert promote_res.json()["role_name"] == "SELLER"

    # 3. Seller Approval Queue
    # Create seller profile for target user
    client.post("/api/v1/seller/onboard", json={
        "store_name": f"Pending Store {uuid.uuid4().hex[:4]}"
    }, headers=cust_headers)

    sellers_res = client.get("/api/v1/admin/sellers", headers=admin_headers)
    assert sellers_res.status_code == 200
    sellers = sellers_res.json()
    target_seller = next(s for s in sellers if s["user_id"] == target_user_id)
    seller_id = target_seller["id"]

    # Toggle Approval
    approval_res = client.patch(f"/api/v1/admin/sellers/{seller_id}/approval", json={
        "is_approved": True
    }, headers=admin_headers)
    assert approval_res.status_code == 200
    assert approval_res.json()["is_approved"] is True

    # 4. Product Visibility & Feature Toggle
    prods = client.get("/api/v1/products").json()["items"]
    target_prod_id = prods[0]["id"]

    vis_res = client.patch(f"/api/v1/admin/products/{target_prod_id}/visibility", json={
        "is_active": True,
        "is_featured": True
    }, headers=admin_headers)
    assert vis_res.status_code == 200
    assert vis_res.json()["is_featured"] is True

    # 5. Category Taxonomy Management
    cat_create_res = client.post("/api/v1/admin/categories", json={
        "name": f"Smart Wearables {uuid.uuid4().hex[:4]}",
        "is_active": True
    }, headers=admin_headers)
    assert cat_create_res.status_code == 201
    created_cat_id = cat_create_res.json()["id"]

    # Update category
    cat_patch_res = client.patch(f"/api/v1/admin/categories/{created_cat_id}", json={
        "name": "Updated Wearables Category"
    }, headers=admin_headers)
    assert cat_patch_res.status_code == 200

    # 6. Immutable Audit Trail
    audit_res = client.get("/api/v1/admin/audit-logs", headers=admin_headers)
    assert audit_res.status_code == 200
    logs = audit_res.json()
    assert len(logs) >= 3

    # Verify audit actions exist in the log
    actions = [l["action"] for l in logs]
    assert "UPDATE_USER_ROLE_OR_STATUS" in actions
    assert "UPDATE_SELLER_APPROVAL" in actions
    assert "CREATE_CATEGORY" in actions
