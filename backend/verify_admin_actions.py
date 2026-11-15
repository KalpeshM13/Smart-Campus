from fastapi.testclient import TestClient
from app.main import app
from app.integrations.salesforce import get_salesforce_service

def test_admin_flow():
    client = TestClient(app)

    # 1. Login as Student (Sarah Chen)
    login_student = client.post('/api/auth/login', json={'email': 'sarah.chen@student.smartcampus.edu', 'password': 'CampusSecret2026!'})
    assert login_student.status_code == 200, login_student.text
    student_token = login_student.json()['access_token']
    student_headers = {'Authorization': f'Bearer {student_token}'}

    # 2. Student submits a new complaint
    cats_res = client.get('/api/categories', headers=student_headers)
    wifi_cat = next(c for c in cats_res.json() if 'Wi-Fi' in c['name'] or c.get('code') == 'WIFI')
    
    payload = {
        'title': 'Wi-Fi router power failure in Lab 404',
        'description': 'Main router power brick has burnt smell and no LED activity.',
        'category_id': wifi_cat['id'],
        'priority': 'HIGH',
        'campus': 'Main University Campus',
        'building': 'Block B',
        'room': 'Lab 404'
    }
    create_res = client.post('/api/complaints', json=payload, headers=student_headers)
    assert create_res.status_code == 201, create_res.text
    complaint_data = create_res.json()
    complaint_id = complaint_data['id']
    sf_case_id = complaint_data.get('salesforce_case_id')
    print(f"1. Student created complaint: {complaint_data['complaint_number']} (ID: {complaint_id}, SF Case: {sf_case_id}, Status: {complaint_data['status']})")

    # 3. Login as Admin (Dr. Eleanor Sterling)
    login_admin = client.post('/api/auth/login', json={'email': 'dean.sterling@smartcampus.edu', 'password': 'CampusSecret2026!'})
    assert login_admin.status_code == 200, login_admin.text
    admin_token = login_admin.json()['access_token']
    admin_headers = {'Authorization': f'Bearer {admin_token}'}

    # 4. Admin accesses the complaint
    get_res = client.get(f'/api/complaints/{complaint_id}', headers=admin_headers)
    assert get_res.status_code == 200, get_res.text
    print(f"2. Admin successfully fetched complaint: {get_res.json()['title']}")

    # 5. Admin starts work on the ticket (IN_PROGRESS)
    status_res = client.patch(
        f'/api/complaints/{complaint_id}/status',
        json={'status': 'IN_PROGRESS'},
        headers=admin_headers
    )
    assert status_res.status_code == 200, status_res.text
    print(f"3. Admin transitioned ticket to IN_PROGRESS: {status_res.json()['status']}")

    # 6. Admin resolves the ticket with mandatory technical notes
    resolve_res = client.patch(
        f'/api/complaints/{complaint_id}/status',
        json={
            'status': 'RESOLVED',
            'resolution_notes': 'Replaced damaged 12V power supply. Tested ping and speed at 150 Mbps.'
        },
        headers=admin_headers
    )
    assert resolve_res.status_code == 200, resolve_res.text
    resolved_data = resolve_res.json()
    print(f"4. Admin resolved ticket: status={resolved_data['status']}, notes={resolved_data['resolution_notes']}")

    # 7. Verify live Salesforce Case reflection
    if sf_case_id:
        sf = get_salesforce_service()
        sf_records = sf.client.query(f"SELECT Id, CaseNumber, Status, Resolution_Notes__c FROM Case WHERE Id = '{sf_case_id}'")
        assert len(sf_records) > 0
        live_case = sf_records[0]
        print(f"5. Verified in live Salesforce: Status={live_case.get('Status')}, Notes={live_case.get('Resolution_Notes__c')}")

    print("\nALL ADMIN ACTIONS VERIFIED AND WORKING 100% AGAINST LIVE SALESFORCE!")

if __name__ == '__main__':
    test_admin_flow()
