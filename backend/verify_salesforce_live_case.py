from fastapi.testclient import TestClient
from app.main import app
from app.integrations.salesforce import get_salesforce_service

def main():
    client = TestClient(app)

    # 1. Login as Student
    res = client.post('/api/auth/login', json={'email': 'sarah.chen@student.smartcampus.edu', 'password': 'CampusSecret2026!'})
    assert res.status_code == 200, f"Login failed: {res.text}"
    token = res.json()['access_token']
    headers = {'Authorization': f'Bearer {token}'}

    # 2. Get live categories
    cats_res = client.get('/api/categories', headers=headers)
    categories = cats_res.json()
    wifi_cat = next(c for c in categories if 'Wi-Fi' in c['name'] or c.get('code') == 'WIFI')
    print(f"Using live category: {wifi_cat['name']} (ID: {wifi_cat['id']})")

    # 3. Submit complaint (simulating UI registration modal)
    payload = {
        'title': 'High latency and packet drops on 5GHz Wi-Fi in Engineering Block C',
        'description': 'Students cannot access online lecture notes during the 4 PM networking lab session.',
        'category_id': wifi_cat['id'],
        'priority': 'HIGH',
        'campus': 'Main University Campus',
        'building': 'Engineering Block C',
        'room': 'Lab 305'
    }
    create_res = client.post('/api/complaints', json=payload, headers=headers)
    print(f"Complaint creation HTTP status: {create_res.status_code}")
    data = create_res.json()
    complaint_num = data.get('complaint_number')
    sf_case_id = data.get('salesforce_case_id')
    sf_case_number = data.get('salesforce_case_number')
    queue_name = data.get('queue_name')

    print(f"  - Campus Complaint Number: {complaint_num}")
    print(f"  - Salesforce Case ID:       {sf_case_id}")
    print(f"  - Salesforce Case Number:   {sf_case_number}")
    print(f"  - Assigned Queue:           {queue_name}")

    assert sf_case_id, "Salesforce Case ID must not be None"

    # 4. Query live Salesforce Service Cloud directly
    sf = get_salesforce_service()
    query = f"SELECT Id, CaseNumber, Subject, Status, Priority, OwnerId, Owner.Name, CreatedDate FROM Case WHERE Id = '{sf_case_id}'"
    results = sf.client.query(query)
    assert len(results) > 0, "Case must exist in Salesforce Service Cloud"
    live_case = results[0]

    print("\n[SALESFORCE SERVICE CLOUD RECORD VERIFICATION]")
    print(f"  Case Number: {live_case.get('CaseNumber')}")
    print(f"  Subject:     {live_case.get('Subject')}")
    print(f"  Status:      {live_case.get('Status')}")
    print(f"  Priority:    {live_case.get('Priority')}")
    print(f"  Owner:       {live_case.get('Owner', {}).get('Name')} (OwnerId: {live_case.get('OwnerId')})")
    print(f"  Created:     {live_case.get('CreatedDate')}")

    print("\nSUCCESS: Complaint created from application is confirmed LIVE in Salesforce Service Cloud!")

if __name__ == '__main__':
    main()
