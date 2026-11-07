import pytest
import io
from datetime import datetime, timezone, timedelta
from app.models.category import ComplaintCategory, DefaultPriority
from app.models.department import Department
from app.models.complaint import Complaint, ComplaintStatus, Priority
from app.services.overdue_service import check_and_flag_overdue_complaints

# Test T1: Create a user with valid details (PRD Section 13)
def test_t1_create_user_with_valid_details(client):
    payload = {
        "email": "new.student@smartcampus.edu",
        "password": "SecurePassword123!",
        "full_name": "Kavita Patel",
        "role": "STUDENT",
        "student_id": "STU-2026-9901",
        "course": "B.Tech Data Science",
        "department": "School of Computing",
        "year": 2,
        "phone": "+1 555-442-1209"
    }
    response = client.post("/api/auth/register", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert "access_token" in data
    assert data["user"]["email"] == "new.student@smartcampus.edu"
    assert data["user"]["role"] == "STUDENT"

# Test Public registration cannot create ADMIN or STAFF (PRD Section 6 FR-01)
def test_t1_admin_registration_rejected(client):
    payload = {
        "email": "malicious.admin@smartcampus.edu",
        "password": "SecurePassword123!",
        "full_name": "Hacker Admin",
        "role": "ADMIN"
    }
    response = client.post("/api/auth/register", json=payload)
    assert response.status_code == 422 # Pydantic field_validator rejects ADMIN

# Test T2: Log in with valid credentials (PRD Section 13)
def test_t2_login_with_valid_credentials(client):
    payload = {
        "email": "sarah.chen@student.smartcampus.edu",
        "password": "CampusSecret2026!"
    }
    response = client.post("/api/auth/login", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["user"]["email"] == "sarah.chen@student.smartcampus.edu"

# Test T3: Log in with invalid credentials (PRD Section 13)
def test_t3_login_with_invalid_credentials(client):
    payload = {
        "email": "sarah.chen@student.smartcampus.edu",
        "password": "WrongPassword999!"
    }
    response = client.post("/api/auth/login", json=payload)
    assert response.status_code == 401
    assert "Invalid email or password" in response.json()["detail"]

# Test T4 & T5: Submit valid complaint & Category-to-Department Auto-assignment (PRD Section 13)
def test_t4_and_t5_submit_mapped_category(client, student_headers):
    payload = {
        "title": "Wi-Fi Access Point dropped connection in Seminar Hall",
        "description": "Continuous ping timeouts on AP-B2-101. Over 50 students unable to connect during exam.",
        "category_id": "cat-wifi", # Mapped to IT Department
        "priority": "HIGH",
        "campus": "Main University Campus",
        "building": "Turing Computing Block",
        "room": "Room 204"
    }
    response = client.post("/api/complaints", json=payload, headers=student_headers)
    assert response.status_code == 201
    data = response.json()
    assert data["complaint_number"].startswith("SCMS-2026-")
    assert data["status"] == "ASSIGNED" # Auto-assigned
    assert data["assigned_department_id"] == "dept-it"
    assert data["sla_target_hours"] == 24

# Test T6: Submit unmapped category (PRD Section 13)
def test_t6_submit_unmapped_category(client, student_headers, db_session):
    # Create category mapped to deactivated department
    deactivated_dept = Department(
        id="dept-deactivated",
        name="Obsolete Department",
        contact_email="obs@smartcampus.edu",
        is_active=False
    )
    db_session.departments.insert_one(deactivated_dept.to_mongo())

    unmapped_cat = ComplaintCategory(
        id="cat-unmapped",
        name="Unmapped Special Service",
        department_id=deactivated_dept.id,
        is_active=True
    )
    db_session.complaint_categories.insert_one(unmapped_cat.to_mongo())

    payload = {
        "title": "Unmapped special complaint needing admin triage",
        "description": "No active campus department handles this request directly. Requires manual routing.",
        "category_id": "cat-unmapped",
        "priority": "LOW",
        "campus": "Main University Campus",
        "building": "Admin Hall",
        "room": "Room 10"
    }
    response = client.post("/api/complaints", json=payload, headers=student_headers)
    assert response.status_code == 201
    data = response.json()
    assert data["status"] == "NEW" # Remains NEW and flagged

# Test T7: Staff updates complaint status (PRD Section 13)
def test_t7_staff_updates_complaint_status(client, staff_headers, student_headers):
    # 1. Student creates complaint
    payload = {
        "title": "Ethernet wall socket cracked in Lab 301",
        "description": "RJ45 connector does not lock in place and drops gigabit network connection.",
        "category_id": "cat-wifi",
        "priority": "MEDIUM",
        "building": "Turing Block",
        "room": "Lab 301"
    }
    res_create = client.post("/api/complaints", json=payload, headers=student_headers)
    cid = res_create.json()["id"]

    # 2. Staff updates status to IN_PROGRESS
    update_payload = {"status": "IN_PROGRESS"}
    res_update = client.patch(f"/api/complaints/{cid}/status", json=update_payload, headers=staff_headers)
    assert res_update.status_code == 200
    assert res_update.json()["status"] == "IN_PROGRESS"

    # 3. Check history audit log
    res_detail = client.get(f"/api/complaints/{cid}", headers=staff_headers)
    history = res_detail.json()["history"]
    assert any(h["new_status"] == "IN_PROGRESS" for h in history)

# Test T8: Resolve without resolution notes is rejected (PRD Section 13)
def test_t8_resolve_without_notes_rejected(client, staff_headers, student_headers):
    payload = {
        "title": "Access card turnstile stuck in open position",
        "description": "Gate 2 turnstile remains unlocked and beeps intermittently.",
        "category_id": "cat-wifi",
        "priority": "HIGH",
        "building": "North Gate",
        "room": "Gate 2"
    }
    cid = client.post("/api/complaints", json=payload, headers=student_headers).json()["id"]

    # Attempt to mark RESOLVED without resolution notes
    resolve_payload = {
        "status": "RESOLVED",
        "resolution_notes": None
    }
    response = client.patch(f"/api/complaints/{cid}/status", json=resolve_payload, headers=staff_headers)
    assert response.status_code == 422 # Validation error enforced

# Test T9: Resolve with valid resolution notes succeeded (PRD Section 13)
def test_t9_resolve_with_valid_notes_succeeded(client, staff_headers, student_headers):
    payload = {
        "title": "Switch port flapping in Server Room Rack 4",
        "description": "Port 18 flapping between 100Mbps and 1Gbps duplex link.",
        "category_id": "cat-wifi",
        "priority": "HIGH",
        "building": "Computing Block",
        "room": "Server Room"
    }
    cid = client.post("/api/complaints", json=payload, headers=student_headers).json()["id"]

    resolve_payload = {
        "status": "RESOLVED",
        "resolution_notes": "Re-crimped Cat6A patch lead and hardcoded switch port speed to 1000/Full duplex. Verified zero packet drops."
    }
    response = client.patch(f"/api/complaints/{cid}/status", json=resolve_payload, headers=staff_headers)
    assert response.status_code == 200
    assert response.json()["status"] == "RESOLVED"
    assert response.json()["resolved_at"] is not None

# Test T10 & T11: Feedback workflow and duplicate rejection (PRD Section 13)
def test_t10_and_t11_feedback_workflow(client, staff_headers, student_headers):
    # 1. Create and resolve complaint
    payload = {
        "title": "DNS resolution failing on campus eduroam",
        "description": "Internal DNS server 10.0.0.53 timing out for campus subdomains.",
        "category_id": "cat-wifi",
        "priority": "HIGH",
        "building": "All Campus",
        "room": "Wireless Zone"
    }
    cid = client.post("/api/complaints", json=payload, headers=student_headers).json()["id"]

    client.patch(
        f"/api/complaints/{cid}/status",
        json={"status": "RESOLVED", "resolution_notes": "Restarted named daemon and flushed BIND cache."},
        headers=staff_headers
    )

    # 2. Test T10: Requester submits 5-star feedback
    fb_payload = {
        "complaint_id": cid,
        "rating": 5,
        "comments": "Fixed immediately within 30 minutes! Thank you."
    }
    res_fb = client.post("/api/feedback", json=fb_payload, headers=student_headers)
    assert res_fb.status_code == 201
    assert res_fb.json()["rating"] == 5

    # Check that complaint status transitioned to CLOSED
    detail = client.get(f"/api/complaints/{cid}", headers=student_headers).json()
    assert detail["status"] == "CLOSED"

    # 3. Test T11: Duplicate feedback is rejected
    res_dup = client.post("/api/feedback", json=fb_payload, headers=student_headers)
    assert res_dup.status_code == 400
    assert "Duplicate feedback rejected" in res_dup.json()["detail"]

# Test T12: Access another student's complaint is denied (IDOR protection)
def test_t12_access_another_student_complaint_denied(client, student_headers, faculty_headers):
    payload = {
        "title": "Private student request in dormitory",
        "description": "Desk lamp outlet in Dorm B room 14 does not receive current.",
        "category_id": "cat-wifi",
        "priority": "LOW",
        "building": "Dorm B",
        "room": "14"
    }
    cid = client.post("/api/complaints", json=payload, headers=student_headers).json()["id"]

    # Faculty attempts to access Student's private complaint
    res = client.get(f"/api/complaints/{cid}", headers=faculty_headers)
    assert res.status_code == 403
    assert "Access denied" in res.json()["detail"]

# Test T13: Access another department's complaint is denied
def test_t13_access_another_department_complaint_denied(client, student_headers, staff_headers):
    # Complaint assigned to Maintenance Department
    payload = {
        "title": "Pipe leakage in Central Washroom",
        "description": "Cold water pipe elbow joint leaking onto floor.",
        "category_id": "cat-plumb", # Mapped to Maintenance Department
        "priority": "HIGH",
        "building": "Student Center",
        "room": "2W"
    }
    cid = client.post("/api/complaints", json=payload, headers=student_headers).json()["id"]

    # IT staff (Alex Vance) attempts to access Maintenance complaint
    res = client.get(f"/api/complaints/{cid}", headers=staff_headers)
    assert res.status_code == 403
    assert "assigned to another department" in res.json()["detail"]

# Test T14: Open reports and dashboard reflects database records (PRD Section 13)
def test_t14_reports_and_dashboard_figures(client, admin_headers):
    response = client.get("/api/dashboard/admin", headers=admin_headers)
    assert response.status_code == 200
    data = response.json()
    assert "total_complaints" in data
    assert "resolution_rate_percent" in data
    assert "category_distribution" in data

# Test T15: Export filtered report to CSV (PRD Section 13)
def test_t15_export_filtered_report_csv(client, admin_headers):
    response = client.get("/api/reports/export", headers=admin_headers)
    assert response.status_code == 200
    assert response.headers["content-type"] == "text/csv; charset=utf-8"
    content = response.text
    assert "Complaint Number,Title,Category" in content

# Test FR-14: Upload file attachment to complaint
def test_fr14_attachment_upload(client, student_headers):
    payload = {
        "title": "Ceiling plaster chipped in classroom 402",
        "description": "Plaster falling near back row desks. Photographic proof attached.",
        "category_id": "cat-infra",
        "priority": "MEDIUM",
        "building": "Academic Block A",
        "room": "Room 402"
    }
    cid = client.post("/api/complaints", json=payload, headers=student_headers).json()["id"]

    # Upload sample test file
    file_bytes = b"%PDF-1.4 Fake PDF file content for test verification."
    files = {"file": ("inspection_photo.pdf", io.BytesIO(file_bytes), "application/pdf")}
    res_upload = client.post(f"/api/complaints/{cid}/attachments", files=files, headers=student_headers)
    assert res_upload.status_code == 200
    assert res_upload.json()["attachment_name"] == "inspection_photo.pdf"

# Test T17: Check overdue complaint (PRD Section 13)
def test_t17_check_overdue_complaint(client, db_session):
    past_time = datetime.now(timezone.utc) - timedelta(hours=48)
    complaint = Complaint(
        complaint_number="SCMS-2026-999999",
        title="Backdated test ticket for SLA breach",
        description="Testing automated overdue escalation background process.",
        category_id="cat-wifi",
        priority=Priority.HIGH,
        status=ComplaintStatus.IN_PROGRESS,
        created_by="usr-student-1",
        assigned_department_id="dept-it",
        campus="Main University Campus",
        location="Lab 100",
        sla_target_hours=24,
        is_overdue=False,
        created_at=past_time,
        updated_at=past_time
    )
    db_session.complaints.insert_one(complaint.to_mongo())

    # Run overdue inspection engine
    flagged = check_and_flag_overdue_complaints(db_session)
    assert flagged >= 1

    # Verify ticket is flagged in MongoDB
    updated_doc = db_session.complaints.find_one({"_id": complaint.id})
    assert updated_doc["is_overdue"] is True
