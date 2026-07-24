def test_register_and_login(client):
    # 1. Register a new user
    register_payload = {
        "username": "testcitizen",
        "password": "securepassword123",
        "full_name": "Test Citizen",
        "phone": "+919876543210",
        "user_type": "Citizen",
        "state": "West Bengal"
    }
    
    register_res = client.post("/auth/register", json=register_payload)
    assert register_res.status_code == 200
    data = register_res.json()
    assert "token" in data
    assert data["user"]["username"] == "testcitizen"
    token = data["token"]
    
    # 2. Login with the user
    login_payload = {
        "username": "testcitizen",
        "password": "securepassword123"
    }
    login_res = client.post("/auth/login", json=login_payload)
    assert login_res.status_code == 200
    assert "token" in login_res.json()
    
    # 3. Retrieve me profile
    me_res = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_res.status_code == 200
    assert me_res.json()["username"] == "testcitizen"

def test_change_password(client):
    # Register user
    register_payload = {
        "username": "passwordchanger",
        "password": "oldpassword123",
        "full_name": "Changer User",
        "phone": "+919876543211",
        "user_type": "Citizen",
        "state": "Delhi"
    }
    reg_res = client.post("/auth/register", json=register_payload)
    token = reg_res.json()["token"]
    
    # Change password
    change_payload = {
        "old_password": "oldpassword123",
        "new_password": "newpassword123"
    }
    change_res = client.post("/auth/change-password", json=change_payload, headers={"Authorization": f"Bearer {token}"})
    assert change_res.status_code == 200
    
    # Login with old password (should fail)
    login_fail = client.post("/auth/login", json={"username": "passwordchanger", "password": "oldpassword123"})
    assert login_fail.status_code == 401
    
    # Login with new password (should succeed)
    login_ok = client.post("/auth/login", json={"username": "passwordchanger", "password": "newpassword123"})
    assert login_ok.status_code == 200

def test_admin_only_endpoints(client):
    # Register citizen
    reg_citizen = client.post("/auth/register", json={
        "username": "citizen123",
        "password": "securepassword123",
        "full_name": "Citizen",
        "phone": "+919876543212",
        "user_type": "Citizen"
    })
    assert reg_citizen.status_code == 200
    citizen_token = reg_citizen.json()["token"]
    
    # Try fetching users as citizen (should fail 403)
    users_fail = client.get("/auth/users", headers={"Authorization": f"Bearer {citizen_token}"})
    assert users_fail.status_code == 403
    
    # Register admin
    reg_admin = client.post("/auth/register", json={
        "username": "admin123",
        "password": "securepassword123",
        "full_name": "Admin User",
        "phone": "+919876543213",
        "user_type": "Admin"
    })
    assert reg_admin.status_code == 200
    admin_token = reg_admin.json()["token"]
    
    # Fetch users as admin (should succeed)
    users_ok = client.get("/auth/users", headers={"Authorization": f"Bearer {admin_token}"})
    assert users_ok.status_code == 200
    assert len(users_ok.json()) >= 2
