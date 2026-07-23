from io import BytesIO

def test_complaint_lifecycle(client):
    # 1. Register citizen and admin
    citizen_reg = client.post("/auth/register", json={
        "username": "citizen_one",
        "password": "securepassword123",
        "full_name": "Citizen One",
        "phone": "+919876543220",
        "user_type": "Citizen",
        "state": "West Bengal"
    })
    assert citizen_reg.status_code == 200
    citizen_token = citizen_reg.json()["token"]
    
    admin_reg = client.post("/auth/register", json={
        "username": "admin_one",
        "password": "securepassword123",
        "full_name": "Admin One",
        "phone": "+919876543221",
        "user_type": "Admin",
        "state": "West Bengal"
    })
    assert admin_reg.status_code == 200
    admin_token = admin_reg.json()["token"]
    
    officer_reg = client.post("/auth/register", json={
        "username": "officer_one",
        "password": "securepassword123",
        "full_name": "Officer One",
        "phone": "+919876543222",
        "user_type": "Department of Public Works Officer",
        "state": "West Bengal"
    })
    assert officer_reg.status_code == 200
    officer_token = officer_reg.json()["token"]

    # 2. Create complaint (Citizen)
    create_payload = {
        "text": "Huge pothole on the street lane, vehicles getting damaged.",
        "place": "Salt Lake",
        "state": "West Bengal"
    }
    
    create_res = client.post(
        "/complaints", 
        data=create_payload, 
        headers={"Authorization": f"Bearer {citizen_token}"}
    )
    assert create_res.status_code == 200
    comp_data = create_res.json()
    assert comp_data["place"] == "Salt Lake"
    assert comp_data["state"] == "West Bengal"
    comp_id = comp_data["id"]
    
    # 3. Upvote complaint (Citizen)
    upvote_res = client.post(
        f"/complaints/{comp_id}/upvote",
        headers={"Authorization": f"Bearer {citizen_token}"}
    )
    assert upvote_res.status_code == 200
    assert upvote_res.json()["upvotes"] == 1
    
    # 4. List complaints (Officer)
    list_res = client.get(
        "/complaints",
        headers={"Authorization": f"Bearer {officer_token}"}
    )
    assert list_res.status_code == 200
    assert len(list_res.json()) > 0
    assert list_res.json()[0]["id"] == comp_id

    # 5. Add comment (Officer)
    comment_res = client.post(
        f"/complaints/{comp_id}/comments",
        json={"comment": "We have dispatched a repair team to inspect the street."},
        headers={"Authorization": f"Bearer {officer_token}"}
    )
    assert comment_res.status_code == 200
    assert len(comment_res.json()["timeline"]) > 2  # Created, Upvoted, Commented

    # 6. Complete complaint with resolution photo (Officer)
    photo_file = ("resolved.jpg", BytesIO(b"dummy image bytes"), "image/jpeg")
    complete_res = client.post(
        f"/complaints/{comp_id}/complete",
        files={"resolution_photo": photo_file},
        headers={"Authorization": f"Bearer {officer_token}"}
    )
    assert complete_res.status_code == 200
    assert complete_res.json()["status"] == "resolved"
    assert complete_res.json()["resolution_photo_filename"] is not None

    # 6.5 Modify complaint (Admin)
    modify_res = client.patch(
        f"/complaints/{comp_id}",
        json={
            "text": "Water pipe is leaking near the bus stop and flooding the lane.",
            "place": "Belgharia",
            "state": "West Bengal",
            "department": "Water Works",
            "priority": "medium",
            "status": "routed",
            "category": "water_leak"
        },
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert modify_res.status_code == 200

    # 7. Delete complaint (Admin)
    delete_res = client.delete(
        f"/complaints/{comp_id}",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert delete_res.status_code == 200
    
    # Verify not listed anymore
    list_after = client.get(
        "/complaints",
        headers={"Authorization": f"Bearer {officer_token}"}
    )
    assert len(list_after.json()) == 0
