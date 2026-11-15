"""
Salesforce Service Cloud In-Memory Mock Sandbox Provider.
Simulates Salesforce REST API endpoints, Case Schema, Queues, CaseHistory, and Validation Rules.
Strictly labeled as mock mode for local development, CI/CD, and test automation.
"""

import uuid
import re
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional
from app.integrations.salesforce.client import SalesforceClientInterface, SalesforceAPIError
from app.integrations.salesforce.config import SalesforceConfig, sf_config

def _generate_sf_id(prefix: str = "500") -> str:
    """Generate an 18-character simulated Salesforce Case/Record ID (e.g. 500xxxxxxxxxxxxAAA)."""
    raw = uuid.uuid4().hex.upper()
    return f"{prefix}{raw[:12]}AAA"

class SalesforceMockProvider(SalesforceClientInterface):
    """
    In-memory sandbox simulating Salesforce Service Cloud database, queues, and automation.
    All data is clearly stamped as simulated mock data.
    """

    def __init__(self, config: Optional[SalesforceConfig] = None):
        self.config = config or sf_config
        self._case_counter = 100
        
        # In-memory sObject stores
        self.cases: Dict[str, Dict[str, Any]] = {}
        self.departments: Dict[str, Dict[str, Any]] = {}
        self.categories: Dict[str, Dict[str, Any]] = {}
        self.queues: Dict[str, Dict[str, Any]] = {}
        self.case_history: List[Dict[str, Any]] = []
        self.case_feedback: Dict[str, Dict[str, Any]] = {}  # CaseId -> Feedback
        self.files: Dict[str, Dict[str, Any]] = {}
        
        self._seed_default_sandbox_data()

    def is_mock(self) -> bool:
        return True

    def _seed_default_sandbox_data(self) -> None:
        """Seed default department queues and category-to-department mappings."""
        # 1. Department Queues
        default_queues = [
            {"Id": "00G-IT-QUEUE", "Name": "IT Department Queue", "DeveloperName": "IT_Queue"},
            {"Id": "00G-MAINT-QUEUE", "Name": "Maintenance Department Queue", "DeveloperName": "Maintenance_Queue"},
            {"Id": "00G-ELEC-QUEUE", "Name": "Electrical Department Queue", "DeveloperName": "Electrical_Queue"},
            {"Id": "00G-LAB-QUEUE", "Name": "Laboratory Department Queue", "DeveloperName": "Laboratory_Queue"},
            {"Id": "00G-HOUSE-QUEUE", "Name": "Housekeeping Department Queue", "DeveloperName": "Housekeeping_Queue"},
            {"Id": "00G-SEC-QUEUE", "Name": "Security Department Queue", "DeveloperName": "Security_Queue"},
            {"Id": "00G-ADMIN-QUEUE", "Name": "Admin Review Queue", "DeveloperName": "Admin_Review_Queue"},
        ]
        for q in default_queues:
            self.queues[q["DeveloperName"]] = q

        # 2. Departments Custom Object (Department__c)
        dept_defs = [
            {"Id": "a01-it", "Name": "IT Department", "Code__c": "IT", "Queue_Name__c": "IT_Queue", "Contact_Email__c": "it-support@smartcampus.edu", "Is_Active__c": True},
            {"Id": "a01-maint", "Name": "Maintenance Department", "Code__c": "MAINT", "Queue_Name__c": "Maintenance_Queue", "Contact_Email__c": "facilities@smartcampus.edu", "Is_Active__c": True},
            {"Id": "a01-elec", "Name": "Electrical Department", "Code__c": "ELEC", "Queue_Name__c": "Electrical_Queue", "Contact_Email__c": "electrical@smartcampus.edu", "Is_Active__c": True},
            {"Id": "a01-lab", "Name": "Laboratory Department", "Code__c": "LAB", "Queue_Name__c": "Laboratory_Queue", "Contact_Email__c": "labs@smartcampus.edu", "Is_Active__c": True},
            {"Id": "a01-house", "Name": "Housekeeping Department", "Code__c": "HOUSE", "Queue_Name__c": "Housekeeping_Queue", "Contact_Email__c": "sanitation@smartcampus.edu", "Is_Active__c": True},
            {"Id": "a01-sec", "Name": "Security Department", "Code__c": "SEC", "Queue_Name__c": "Security_Queue", "Contact_Email__c": "security@smartcampus.edu", "Is_Active__c": True},
            {"Id": "a01-admin", "Name": "Administration Department", "Code__c": "ADMIN", "Queue_Name__c": "Admin_Review_Queue", "Contact_Email__c": "admin@smartcampus.edu", "Is_Active__c": True},
        ]
        for d in dept_defs:
            self.departments[d["Id"]] = d

        # 3. Complaint Categories (Complaint_Category__c) with SLA defaults
        cat_defs = [
            {"Id": "a02-wifi", "Name": "Internet / Wi-Fi", "Default_Department__c": "a01-it", "SLA_Hours__c": 24, "Is_Active__c": True},
            {"Id": "a02-infr", "Name": "Infrastructure", "Default_Department__c": "a01-maint", "SLA_Hours__c": 72, "Is_Active__c": True},
            {"Id": "a02-elec", "Name": "Electrical", "Default_Department__c": "a01-elec", "SLA_Hours__c": 24, "Is_Active__c": True},
            {"Id": "a02-class", "Name": "Classroom Equipment", "Default_Department__c": "a01-maint", "SLA_Hours__c": 48, "Is_Active__c": True},
            {"Id": "a02-lab", "Name": "Laboratory Equipment", "Default_Department__c": "a01-lab", "SLA_Hours__c": 48, "Is_Active__c": True},
            {"Id": "a02-plumb", "Name": "Plumbing", "Default_Department__c": "a01-maint", "SLA_Hours__c": 24, "Is_Active__c": True},
            {"Id": "a02-san", "Name": "Sanitation", "Default_Department__c": "a01-house", "SLA_Hours__c": 12, "Is_Active__c": True},
            {"Id": "a02-furn", "Name": "Furniture", "Default_Department__c": "a01-maint", "SLA_Hours__c": 72, "Is_Active__c": True},
            {"Id": "a02-sec", "Name": "Security", "Default_Department__c": "a01-sec", "SLA_Hours__c": 12, "Is_Active__c": True},
            {"Id": "a02-other", "Name": "Other", "Default_Department__c": "a01-admin", "SLA_Hours__c": 72, "Is_Active__c": True},
        ]
        for c in cat_defs:
            self.categories[c["Id"]] = c

    def reset_sandbox(self) -> None:
        """Clear all created Cases, history, and feedback for isolated unit test runs."""
        self.cases.clear()
        self.case_history.clear()
        self.case_feedback.clear()
        self.files.clear()
        self._case_counter = 100
        self._seed_default_sandbox_data()

    def health_check(self) -> Dict[str, Any]:
        return {
            "status": "connected",
            "mode": "mock_sandbox",
            "provider": "SalesforceMockProvider",
            "cases_count": len(self.cases),
            "queues_count": len(self.queues),
            "note": "Running in certified safe in-memory sandbox mode"
        }

    def _next_case_number(self) -> str:
        self._case_counter += 1
        return f"SCMS-2026-{self._case_counter:06d}"

    def create_record(self, sobject: str, fields: Dict[str, Any]) -> str:
        record_id = _generate_sf_id(prefix="500" if sobject == "Case" else "a03")
        now_iso = datetime.now(timezone.utc).isoformat()

        doc = dict(fields)
        doc["Id"] = record_id
        doc["CreatedDate"] = now_iso
        doc["LastModifiedDate"] = now_iso

        if sobject == "Case":
            # Assign unique Case Number
            if "CaseNumber" not in doc:
                doc["CaseNumber"] = self._next_case_number()

            # Set Origin default
            doc.setdefault("Origin", self.config.DEFAULT_CASE_ORIGIN)
            doc.setdefault("Status", "New")
            doc.setdefault("Priority", "Medium")
            doc.setdefault("Is_Overdue__c", False)

            # Automated Category-to-Queue Routing (PRD Section 19.3)
            category_id = doc.get("Complaint_Category__c")
            assigned_queue_id = None
            assigned_queue_name = None
            assigned_dept_id = None

            if category_id and category_id in self.categories:
                cat = self.categories[category_id]
                dept_id = cat.get("Default_Department__c")
                if dept_id and dept_id in self.departments and self.departments[dept_id].get("Is_Active__c", True):
                    dept = self.departments[dept_id]
                    q_dev_name = dept.get("Queue_Name__c", "IT_Queue")
                    queue = self.queues.get(q_dev_name)
                    if queue:
                        assigned_queue_id = queue["Id"]
                        assigned_queue_name = queue["Name"]
                        assigned_dept_id = dept_id

            if assigned_queue_id:
                doc["OwnerId"] = assigned_queue_id
                doc["Queue_Name__c"] = assigned_queue_name
                doc["Department__c"] = assigned_dept_id
                doc["Status"] = "Assigned"
            else:
                # Fallback to Admin Review Queue
                admin_queue = self.queues.get(self.config.ADMIN_REVIEW_QUEUE, {"Id": "00G-ADMIN-QUEUE", "Name": "Admin Review Queue"})
                doc["OwnerId"] = admin_queue["Id"]
                doc["Queue_Name__c"] = admin_queue["Name"]
                doc["Department__c"] = None
                doc["Status"] = "New"
                doc["Needs_Admin_Triage__c"] = True

            # Calculate SLA target deadline
            sla_hours = 72
            if category_id and category_id in self.categories:
                sla_hours = self.categories[category_id].get("SLA_Hours__c", 72)
            doc["SLA_Target_Time__c"] = (datetime.now(timezone.utc) + timedelta(hours=sla_hours)).isoformat()

            self.cases[record_id] = doc

            # Record Initial CaseHistory entry
            self.case_history.append({
                "Id": _generate_sf_id(prefix="017"),
                "CaseId": record_id,
                "Field": "Status",
                "OldValue": None,
                "NewValue": doc["Status"],
                "CreatedDate": now_iso,
                "CreatedById": doc.get("CreatedById", "usr-portal-user")
            })

            return record_id

        elif sobject == "Complaint_Feedback__c":
            case_id = doc.get("Case__c")
            if not case_id or case_id not in self.cases:
                raise SalesforceAPIError("Complaint_Feedback__c must reference a valid Case__c.", status_code=400)
            
            # Enforce single feedback per Case (PRD Rule 50)
            if case_id in self.case_feedback:
                raise SalesforceAPIError("Duplicate feedback rejected: feedback already exists for this Case.", status_code=400)
            
            target_case = self.cases[case_id]
            if target_case.get("Status") not in ("Resolved", "Closed"):
                raise SalesforceAPIError("Feedback can only be submitted after Case resolution.", status_code=400)

            self.case_feedback[case_id] = doc
            
            # Auto-close Case upon feedback submission (PRD Section 11.2)
            self.update_record("Case", case_id, {"Status": "Closed"})
            return record_id

        elif sobject == "Department__c":
            self.departments[record_id] = doc
            return record_id

        elif sobject == "Complaint_Category__c":
            self.categories[record_id] = doc
            return record_id

        else:
            # Generic storage
            self.files[record_id] = doc
            return record_id

    def get_record(self, sobject: str, record_id: str, fields: Optional[List[str]] = None) -> Dict[str, Any]:
        store = self.cases if sobject == "Case" else (self.departments if sobject == "Department__c" else self.categories)
        if record_id in store:
            doc = store[record_id]
            if fields:
                return {k: doc.get(k) for k in fields}
            return dict(doc)
        raise SalesforceAPIError(f"{sobject} record '{record_id}' not found in mock sandbox.", status_code=404)

    def update_record(self, sobject: str, record_id: str, fields: Dict[str, Any]) -> bool:
        if sobject == "Case":
            if record_id not in self.cases:
                raise SalesforceAPIError(f"Case '{record_id}' not found.", status_code=404)
            
            doc = self.cases[record_id]
            old_status = doc.get("Status")
            new_status = fields.get("Status")
            now_iso = datetime.now(timezone.utc).isoformat()

            # Validation Rule: Mandatory Resolution Notes before Resolved (PRD FR-06 & Rule 48)
            if new_status == "Resolved":
                notes = fields.get("Resolution_Notes__c") or doc.get("Resolution_Notes__c")
                if not notes or len(str(notes).strip()) < 5:
                    raise SalesforceAPIError(
                        "Validation Rule Failed: Resolution notes are mandatory (min 5 characters) before marking a Case Resolved.",
                        status_code=422
                    )
                fields["Resolved_Date__c"] = now_iso

            # Validation Rule: Hold reason required for On Hold
            if new_status == "On Hold":
                reason = fields.get("Hold_Reason__c") or doc.get("Hold_Reason__c")
                if not reason or len(str(reason).strip()) < 3:
                    raise SalesforceAPIError(
                        "Validation Rule Failed: Justification is required when placing a Case On Hold.",
                        status_code=422
                    )

            # Update document fields
            for k, v in fields.items():
                doc[k] = v
            doc["LastModifiedDate"] = now_iso

            # Append to CaseHistory if status changed
            if new_status and new_status != old_status:
                self.case_history.append({
                    "Id": _generate_sf_id(prefix="017"),
                    "CaseId": record_id,
                    "Field": "Status",
                    "OldValue": old_status,
                    "NewValue": new_status,
                    "CreatedDate": now_iso,
                    "CreatedById": fields.get("LastModifiedById", "usr-staff-user")
                })

            return True

        elif sobject == "Department__c" and record_id in self.departments:
            self.departments[record_id].update(fields)
            return True
        elif sobject == "Complaint_Category__c" and record_id in self.categories:
            self.categories[record_id].update(fields)
            return True
        
        raise SalesforceAPIError(f"{sobject} record '{record_id}' not found for update.", status_code=404)

    def delete_record(self, sobject: str, record_id: str) -> bool:
        if sobject == "Case" and record_id in self.cases:
            del self.cases[record_id]
            return True
        return False

    def upload_file(self, title: str, filename: str, content: bytes, linked_entity_id: str) -> str:
        doc_id = _generate_sf_id(prefix="068")
        self.files[doc_id] = {
            "Id": doc_id,
            "Title": title,
            "PathOnClient": filename,
            "Size": len(content),
            "FirstPublishLocationId": linked_entity_id,
            "CreatedDate": datetime.now(timezone.utc).isoformat()
        }
        return doc_id

    def query(self, soql: str) -> List[Dict[str, Any]]:
        """
        Lightweight SOQL evaluator for mock sandbox.
        Parses common SOQL queries used in Case management, dashboards, and reporting.
        """
        soql_upper = soql.upper()
        
        # 1. Querying CaseHistory (checked before Case to avoid substring clash)
        if re.search(r"\bFROM\s+CASEHISTORY\b", soql_upper):
            case_match = re.search(r"CASEID\s*=\s*'([^']+)'", soql, re.IGNORECASE)
            if case_match:
                cid = case_match.group(1)
                return [dict(h) for h in self.case_history if h.get("CaseId") == cid]
            return [dict(h) for h in self.case_history]

        # 2. Querying Cases
        elif re.search(r"\bFROM\s+CASE\b", soql_upper):
            results = list(self.cases.values())
            
            # ContactId / Requester filtering (Student isolation: PRD T12)
            contact_match = re.search(r"CONTACTID\s*=\s*'([^']+)'", soql, re.IGNORECASE)
            if contact_match:
                cid = contact_match.group(1)
                results = [c for c in results if c.get("ContactId") == cid]

            # Department / Queue filtering (Staff isolation: PRD T13)
            dept_match = re.search(r"DEPARTMENT__C\s*=\s*'([^']+)'", soql, re.IGNORECASE)
            if dept_match:
                did = dept_match.group(1)
                results = [c for c in results if c.get("Department__c") == did]

            # Status filter
            status_match = re.search(r"STATUS\s*=\s*'([^']+)'", soql, re.IGNORECASE)
            if status_match:
                st = status_match.group(1)
                results = [c for c in results if c.get("Status", "").lower() == st.lower()]

            # Return sorted by CreatedDate descending
            results.sort(key=lambda x: x.get("CreatedDate", ""), reverse=True)
            return [dict(r) for r in results]

            # Status filter
            status_match = re.search(r"STATUS\s*=\s*'([^']+)'", soql, re.IGNORECASE)
            if status_match:
                st = status_match.group(1)
                results = [c for c in results if c.get("Status", "").lower() == st.lower()]

            # Return sorted by CreatedDate descending
            results.sort(key=lambda x: x.get("CreatedDate", ""), reverse=True)
            return [dict(r) for r in results]

        # 2. Querying Department__c
        elif "FROM DEPARTMENT__C" in soql_upper:
            return [dict(d) for d in self.departments.values()]

        # 3. Querying Complaint_Category__c
        elif "FROM COMPLAINT_CATEGORY__C" in soql_upper:
            return [dict(c) for c in self.categories.values()]

        # 4. Querying CaseHistory
        elif "FROM CASEHISTORY" in soql_upper:
            case_match = re.search(r"CASEID\s*=\s*'([^']+)'", soql, re.IGNORECASE)
            if case_match:
                cid = case_match.group(1)
                return [dict(h) for h in self.case_history if h.get("CaseId") == cid]
            return [dict(h) for h in self.case_history]

        # 5. Querying Complaint_Feedback__c
        elif "FROM COMPLAINT_FEEDBACK__C" in soql_upper:
            case_match = re.search(r"CASE__C\s*=\s*'([^']+)'", soql, re.IGNORECASE)
            if case_match:
                cid = case_match.group(1)
                fb = self.case_feedback.get(cid)
                return [dict(fb)] if fb else []
            return [dict(fb) for fb in self.case_feedback.values()]

        # 6. Querying Organization (Health check)
        elif "FROM ORGANIZATION" in soql_upper:
            return [{"Id": "00D000000000001EAA", "Name": "Smart Campus Salesforce Sandbox", "OrganizationType": "Developer Edition"}]

        return []
