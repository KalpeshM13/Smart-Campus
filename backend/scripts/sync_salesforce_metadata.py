import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "backend"))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), "backend", ".env"), override=True)

from app.integrations.salesforce.config import SalesforceConfig
from app.integrations.salesforce.client import SalesforceRestClient

config = SalesforceConfig.from_env()
client = SalesforceRestClient(config)

print("Connected to Salesforce org:", client.health_check())

# 1. Departments to seed in Salesforce
departments_data = [
    {
        "Name": "IT Department",
        "Code__c": "IT",
        "Queue_Name__c": "IT_Queue",
        "Contact_Email__c": "it-support@smartcampus.edu",
        "Is_Active__c": True
    },
    {
        "Name": "Maintenance Department",
        "Code__c": "MAINT",
        "Queue_Name__c": "Maintenance_Queue",
        "Contact_Email__c": "facilities@smartcampus.edu",
        "Is_Active__c": True
    },
    {
        "Name": "Electrical Department",
        "Code__c": "ELEC",
        "Queue_Name__c": "Electrical_Queue",
        "Contact_Email__c": "electrical@smartcampus.edu",
        "Is_Active__c": True
    },
    {
        "Name": "Laboratory Department",
        "Code__c": "LAB",
        "Queue_Name__c": "Laboratory_Queue",
        "Contact_Email__c": "lab-ops@smartcampus.edu",
        "Is_Active__c": True
    },
    {
        "Name": "Housekeeping Department",
        "Code__c": "HOUSE",
        "Queue_Name__c": "Housekeeping_Queue",
        "Contact_Email__c": "sanitation@smartcampus.edu",
        "Is_Active__c": True
    },
    {
        "Name": "Security Department",
        "Code__c": "SEC",
        "Queue_Name__c": "Security_Queue",
        "Contact_Email__c": "security-hq@smartcampus.edu",
        "Is_Active__c": True
    },
    {
        "Name": "Administration Department",
        "Code__c": "ADMIN",
        "Queue_Name__c": "Admin_Review_Queue",
        "Contact_Email__c": "admin-office@smartcampus.edu",
        "Is_Active__c": True
    },
]

print("\n--- Syncing Departments ---")
dept_id_map = {} # Code__c -> Salesforce Id
existing_depts = client.query("SELECT Id, Name, Code__c FROM Department__c")
for d in existing_depts:
    dept_id_map[d.get("Code__c")] = d.get("Id")

for d_data in departments_data:
    code = d_data["Code__c"]
    if code in dept_id_map:
        print(f"Department {d_data['Name']} already exists (Id: {dept_id_map[code]})")
    else:
        new_id = client.create_record("Department__c", d_data)
        dept_id_map[code] = new_id
        print(f"Created Department {d_data['Name']} -> Id: {new_id}")

# 2. Categories to seed in Salesforce
categories_data = [
    {"Name": "Internet / Wi-Fi", "Code__c": "WIFI", "dept_code": "IT", "high": 8.0, "med": 24.0, "low": 48.0},
    {"Name": "Infrastructure", "Code__c": "INFRA", "dept_code": "MAINT", "high": 24.0, "med": 72.0, "low": 120.0},
    {"Name": "Electrical", "Code__c": "ELEC", "dept_code": "ELEC", "high": 12.0, "med": 24.0, "low": 72.0},
    {"Name": "Classroom Equipment", "Code__c": "CLASS", "dept_code": "MAINT", "high": 12.0, "med": 48.0, "low": 96.0},
    {"Name": "Laboratory Equipment", "Code__c": "LAB", "dept_code": "LAB", "high": 12.0, "med": 48.0, "low": 96.0},
    {"Name": "Plumbing", "Code__c": "PLUMB", "dept_code": "MAINT", "high": 8.0, "med": 24.0, "low": 72.0},
    {"Name": "Sanitation", "Code__c": "SANIT", "dept_code": "HOUSE", "high": 8.0, "med": 24.0, "low": 48.0},
    {"Name": "Furniture", "Code__c": "FURN", "dept_code": "MAINT", "high": 24.0, "med": 72.0, "low": 120.0},
    {"Name": "Security", "Code__c": "SEC", "dept_code": "SEC", "high": 4.0, "med": 12.0, "low": 24.0},
    {"Name": "Other", "Code__c": "OTHER", "dept_code": "ADMIN", "high": 48.0, "med": 120.0, "low": 240.0},
]

print("\n--- Syncing Complaint Categories ---")
cat_id_map = {}
existing_cats = client.query("SELECT Id, Name, Code__c FROM Complaint_Category__c")
for c in existing_cats:
    cat_id_map[c.get("Code__c")] = c.get("Id")

for c_data in categories_data:
    code = c_data["Code__c"]
    if code in cat_id_map:
        print(f"Category {c_data['Name']} already exists (Id: {cat_id_map[code]})")
    else:
        dept_sf_id = dept_id_map.get(c_data["dept_code"])
        payload = {
            "Name": c_data["Name"],
            "Code__c": c_data["Code__c"],
            "Default_Department__c": dept_sf_id,
            "SLA_Hours_High__c": c_data["high"],
            "SLA_Hours_Medium__c": c_data["med"],
            "SLA_Hours_Low__c": c_data["low"],
            "Is_Active__c": True
        }
        new_cat_id = client.create_record("Complaint_Category__c", payload)
        cat_id_map[code] = new_cat_id
        print(f"Created Category {c_data['Name']} -> Id: {new_cat_id}")

print("\nSalesforce Department and Category synchronization complete!")
