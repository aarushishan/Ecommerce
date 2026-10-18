import uuid


def test_register_new_customer(client):
    unique_email = f"customer_{uuid.uuid4().hex[:8]}@shopsphere.com"
    payload = {
        "email": unique_email,
        "password": "SecurePassword123!",
        "first_name": "Aarav",
        "last_name": "Sharma",
        "phone_number": "+91 9988776655",
        "role": "CUSTOMER"
    }
    response = client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["email"] == unique_email
    assert data["user"]["first_name"] == "Aarav"


def test_register_duplicate_email(client):
    unique_email = f"customer_{uuid.uuid4().hex[:8]}@shopsphere.com"
    payload = {
        "email": unique_email,
        "password": "SecurePassword123!",
        "first_name": "Aarav",
        "last_name": "Sharma",
        "role": "CUSTOMER"
    }
    # First registration
    res1 = client.post("/api/v1/auth/register", json=payload)
    assert res1.status_code == 201

    # Duplicate registration
    res2 = client.post("/api/v1/auth/register", json=payload)
    assert res2.status_code == 400
    assert "already exists" in res2.json()["detail"]


def test_login_valid_credentials(client):
    unique_email = f"login_{uuid.uuid4().hex[:8]}@shopsphere.com"
    reg_payload = {
        "email": unique_email,
        "password": "MySecretPassword123!",
        "first_name": "Siddharth",
        "last_name": "Mehta",
        "role": "CUSTOMER"
    }
    client.post("/api/v1/auth/register", json=reg_payload)

    login_res = client.post("/api/v1/auth/login", json={
        "email": unique_email,
        "password": "MySecretPassword123!"
    })
    assert login_res.status_code == 200
    data = login_res.json()
    assert "access_token" in data
    assert data["user"]["first_name"] == "Siddharth"


def test_login_invalid_password(client):
    unique_email = f"invalid_pwd_{uuid.uuid4().hex[:8]}@shopsphere.com"
    client.post("/api/v1/auth/register", json={
        "email": unique_email,
        "password": "CorrectPassword123!",
        "first_name": "Rohan",
        "last_name": "Verma"
    })

    response = client.post("/api/v1/auth/login", json={
        "email": unique_email,
        "password": "WrongPassword999!"
    })
    assert response.status_code == 401
    assert "Invalid email or password" in response.json()["detail"]


def test_get_current_user_me(client):
    unique_email = f"me_test_{uuid.uuid4().hex[:8]}@shopsphere.com"
    reg_res = client.post("/api/v1/auth/register", json={
        "email": unique_email,
        "password": "SecurePassword123!",
        "first_name": "Priya",
        "last_name": "Patel"
    })
    token = reg_res.json()["access_token"]

    headers = {"Authorization": f"Bearer {token}"}
    me_res = client.get("/api/v1/auth/me", headers=headers)
    assert me_res.status_code == 200
    user_data = me_res.json()
    assert user_data["email"] == unique_email
    assert user_data["first_name"] == "Priya"


def test_get_current_user_unauthorized(client):
    response = client.get("/api/v1/auth/me")
    assert response.status_code == 401


def test_update_profile(client):
    unique_email = f"profile_update_{uuid.uuid4().hex[:8]}@shopsphere.com"
    reg_res = client.post("/api/v1/auth/register", json={
        "email": unique_email,
        "password": "SecurePassword123!",
        "first_name": "Vikram",
        "last_name": "Singh"
    })
    token = reg_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    update_payload = {
        "first_name": "Vikramaditya",
        "last_name": "Singh Rathore",
        "phone_number": "+91 9999999999"
    }
    res = client.put("/api/v1/users/profile", json=update_payload, headers=headers)
    assert res.status_code == 200
    assert res.json()["first_name"] == "Vikramaditya"
    assert res.json()["last_name"] == "Singh Rathore"


def test_user_address_crud(client):
    unique_email = f"address_test_{uuid.uuid4().hex[:8]}@shopsphere.com"
    reg_res = client.post("/api/v1/auth/register", json={
        "email": unique_email,
        "password": "SecurePassword123!",
        "first_name": "Ananya",
        "last_name": "Deshmukh"
    })
    token = reg_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Create Address
    address_payload = {
        "full_name": "Ananya Deshmukh",
        "phone_number": "+91 9876543210",
        "address_line1": "Flat 501, Palm Grove, Bandra West",
        "address_line2": "Opposite Hill Road Church",
        "city": "Mumbai",
        "state": "Maharashtra",
        "postal_code": "400050",
        "country": "India",
        "is_default": True
    }
    create_res = client.post("/api/v1/users/addresses", json=address_payload, headers=headers)
    assert create_res.status_code == 201
    address = create_res.json()
    assert address["city"] == "Mumbai"
    assert address["is_default"] is True
    address_id = address["id"]

    # 2. List Addresses
    list_res = client.get("/api/v1/users/addresses", headers=headers)
    assert list_res.status_code == 200
    addresses = list_res.json()
    assert len(addresses) == 1

    # 3. Update Address
    update_res = client.put(f"/api/v1/users/addresses/{address_id}", json={
        "city": "Mumbai Suburban"
    }, headers=headers)
    assert update_res.status_code == 200
    assert update_res.json()["city"] == "Mumbai Suburban"

    # 4. Delete Address
    del_res = client.delete(f"/api/v1/users/addresses/{address_id}", headers=headers)
    assert del_res.status_code == 200
    assert "deleted successfully" in del_res.json()["message"]
