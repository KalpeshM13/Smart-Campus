import sys
import os

backend_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, backend_dir)

from fastapi.testclient import TestClient
from app.main import app

def test_department_visibility_and_electrical_flow():
    client = TestClient(app)

    print("=" * 80)
    print("VERIFYING ELECTRICAL COMPLAINT ROUTING & FACULTY/STAFF DASHBOARD VISIBILITY")
    print("=" * 80)

    # 1. Login as Student
    login_student = client.post('/api/auth/login', json={'email': 'sarah.chen@student.smartcampus.edu', 'password': 'CampusSecret2026!'})
    assert login_student.status_code == 200, login_student.text
    student_token = login_student.json()['access_token']
    student_headers = {'Authorization': f'Bearer {student_token}'}

    # 2. Login as Faculty (Prof. Robert Miller - Electrical)
    login_faculty = client.post('/api/auth/login', json={'email': 'r.miller@smartcampus.edu', 'password': 'CampusSecret2026!'})
    assert login_faculty.status_code == 200, login_faculty.text
    faculty_token = login_faculty.json()['access_token']
    faculty_headers = {'Authorization': f'Bearer {faculty_token}'}
    faculty_user = login_faculty.json()['user']
    print(f"Faculty User: {faculty_user['full_name']} | Dept: {faculty_user.get('staff_department_id')}")

    # 3. Student creates an Electrical complaint
    cats = client.get('/api/categories', headers=student_headers).json()
    elec_cat = next((c for c in cats if 'Electrical' in c['name'] or c.get('code') == 'ELEC'), cats[0])
    print(f"Submitting complaint for category: {elec_cat['name']} (ID: {elec_cat['id']})")

    create_res = client.post('/api/complaints', json={
        'title': 'High voltage power fluctuation in Electrical Lab 102',
        'description': 'Oscilloscopes experiencing brownouts; breaker buzzing in panel 2.',
        'category_id': elec_cat['id'],
        'priority': 'HIGH',
        'campus': 'Main University Campus',
        'building': 'Tesla Hall',
        'room': '102'
    }, headers=student_headers)
    assert create_res.status_code == 201, create_res.text
    new_case = create_res.json()
    case_id = new_case['id']
    complaint_num = new_case['complaint_number']
    print(f"-> Created Live Case: {complaint_num} (ID: {case_id}, Status: {new_case['status']}, Dept: {new_case.get('assigned_department_name')})")

    # 4. Check that Faculty (Prof. Robert Miller) immediately sees this Electrical complaint
    faculty_cmps = client.get('/api/complaints', headers=faculty_headers).json()
    matching_case = next((c for c in faculty_cmps if c['id'] == case_id), None)
    assert matching_case is not None, f"Electrical complaint {case_id} not visible to Faculty!"
    print(f"PASS: Faculty {faculty_user['full_name']} successfully sees Electrical complaint {matching_case['complaint_number']} on dashboard!")

    # 5. Check IT Staff DOES NOT see this Electrical complaint
    login_it = client.post('/api/auth/login', json={'email': 'alex.vance@it.smartcampus.edu', 'password': 'CampusSecret2026!'})
    it_token = login_it.json()['access_token']
    it_cmps = client.get('/api/complaints', headers={'Authorization': f'Bearer {it_token}'}).json()
    assert not any(c['id'] == case_id for c in it_cmps), "IT Staff should NOT see Electrical Department complaint!"
    print("PASS: IT Staff isolated from Electrical Department complaint.")

    print("\n" + "=" * 80)
    print("DEPARTMENTAL VISIBILITY AND WORKFLOW VERIFIED ACROSS ROLES!")
    print("=" * 80)

if __name__ == '__main__':
    test_department_visibility_and_electrical_flow()
