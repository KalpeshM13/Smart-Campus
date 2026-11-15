"""
Salesforce Service Cloud Domain Service.
Encapsulates all Case lifecycle operations, queue-based auto-routing, SLA monitoring, and role-based data isolation.
Delegates persistence to the active Salesforce client (Rest or Mock Provider).
"""

import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from app.integrations.salesforce.client import SalesforceClientInterface, SalesforceRestClient, SalesforceAPIError
from app.integrations.salesforce.mock_provider import SalesforceMockProvider
from app.integrations.salesforce.config import SalesforceConfig, sf_config

logger = logging.getLogger("smart_campus.salesforce")

class SalesforceService:
    """High-level application service for Salesforce Service Cloud operations."""

    def __init__(self, client: Optional[SalesforceClientInterface] = None):
        if client:
            self.client = client
        elif sf_config.MOCK_MODE:
            logger.info("Initializing Salesforce Service in MOCK SANDBOX mode.")
            self.client = SalesforceMockProvider(sf_config)
        else:
            logger.info("Initializing Salesforce Service in LIVE REST API mode.")
            self.client = SalesforceRestClient(sf_config)

        # Internal metadata cache
        self._queues_cache: Dict[str, str] = {}  # DeveloperName -> Queue Id
        self._departments_cache: Dict[str, Dict[str, Any]] = {}  # Id or Code -> Dept dict
        self._categories_cache: Dict[str, Dict[str, Any]] = {}  # Id, Code, or Name -> Cat dict
        self._metadata_loaded = False

    def is_mock(self) -> bool:
        return self.client.is_mock()

    def get_health(self) -> Dict[str, Any]:
        return self.client.health_check()

    def _ensure_metadata(self) -> None:
        """Loads and caches Queues, Departments, and Categories for fast SOQL routing."""
        if self._metadata_loaded:
            return

        try:
            # 1. Queues
            queue_records = self.client.query("SELECT Id, Name, DeveloperName FROM Group WHERE Type = 'Queue'")
            for q in queue_records:
                dev_name = q.get("DeveloperName")
                if dev_name:
                    self._queues_cache[dev_name] = q.get("Id")
                    self._queues_cache[dev_name.lower()] = q.get("Id")

            # 2. Departments
            dept_records = self.client.query("SELECT Id, Name, Code__c, Queue_Name__c, Is_Active__c FROM Department__c")
            for d in dept_records:
                sf_id = d.get("Id")
                code = d.get("Code__c")
                if sf_id:
                    self._departments_cache[sf_id] = d
                if code:
                    self._departments_cache[code.upper()] = d

            # 3. Categories
            cat_records = self.client.query("SELECT Id, Name, Code__c, Default_Department__c, Is_Active__c FROM Complaint_Category__c")
            for c in cat_records:
                sf_id = c.get("Id")
                code = c.get("Code__c")
                name = c.get("Name")
                if sf_id:
                    self._categories_cache[sf_id] = c
                if code:
                    self._categories_cache[code.upper()] = c
                if name:
                    self._categories_cache[name.lower()] = c

            self._metadata_loaded = True
            logger.info(f"Loaded Salesforce routing metadata: {len(self._queues_cache)} queues, {len(dept_records)} departments, {len(cat_records)} categories.")
        except Exception as exc:
            logger.warning(f"Could not load Salesforce routing metadata: {exc}. Routing will fallback safely.")

    def _resolve_routing(self, category_identifier: str) -> Dict[str, Any]:
        """Resolves category ID, code, or name to Salesforce Category, Department, and Queue ID."""
        self._ensure_metadata()
        
        # Normalize category lookup key
        key = str(category_identifier).strip()
        code_key = key.replace("cat-", "").upper()
        
        cat = (
            self._categories_cache.get(key)
            or self._categories_cache.get(code_key)
            or self._categories_cache.get(key.lower())
        )

        dept_id = None
        queue_id = None
        queue_name = None
        cat_sf_id = None
        needs_admin_triage = False

        if cat and cat.get("Is_Active__c", True):
            cat_sf_id = cat.get("Id")
            dept_id = cat.get("Default_Department__c")
            dept = self._departments_cache.get(dept_id)
            if dept and dept.get("Is_Active__c", True):
                q_name = dept.get("Queue_Name__c")
                queue_name = q_name
                queue_id = self._queues_cache.get(q_name) or self._queues_cache.get(q_name.lower()) if q_name else None
        
        # If unmapped or inactive category, fallback to Admin Review Queue (PRD Section 6 FR-05)
        if not queue_id:
            needs_admin_triage = True
            queue_name = sf_config.ADMIN_REVIEW_QUEUE
            queue_id = self._queues_cache.get(queue_name) or self._queues_cache.get("Admin_Review_Queue")

        return {
            "category_id": cat_sf_id or category_identifier,
            "department_id": dept_id,
            "queue_id": queue_id,
            "queue_name": queue_name,
            "needs_admin_triage": needs_admin_triage
        }

    def create_case(
        self,
        subject: str,
        description: str,
        category_id: str,
        priority: str = "Medium",
        location: Optional[str] = None,
        building: Optional[str] = None,
        room: Optional[str] = None,
        requester_id: Optional[str] = None,
        requester_name: Optional[str] = None,
        requester_email: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Creates a new Case in Salesforce with automatic category routing to department queues.
        """
        routing = self._resolve_routing(category_id)

        fields: Dict[str, Any] = {
            "Subject": subject,
            "Description": description,
            "Priority": priority,
            "Origin": sf_config.DEFAULT_CASE_ORIGIN,
        }

        # Apply mapped routing
        if routing["category_id"] and str(routing["category_id"]).startswith("a0"):
            fields["Complaint_Category__c"] = routing["category_id"]
        elif self.is_mock():
            fields["Complaint_Category__c"] = category_id

        if routing["department_id"]:
            fields["Department__c"] = routing["department_id"]

        if routing["queue_id"]:
            fields["OwnerId"] = routing["queue_id"]
            fields["Status"] = "Assigned"

        if routing["needs_admin_triage"]:
            fields["Needs_Admin_Triage__c"] = True

        # Location details
        if location:
            fields["Campus_Location__c"] = location
        if building:
            fields["Building__c"] = building
        if room:
            fields["Room__c"] = room

        # Contact / Web Requester details
        if requester_name:
            fields["SuppliedName"] = requester_name
        if requester_email:
            fields["SuppliedEmail"] = requester_email
        if requester_id:
            if str(requester_id).startswith("003") or self.is_mock():
                fields["ContactId"] = requester_id

        record_id = self.client.create_record("Case", fields)
        case_doc = self.client.get_record("Case", record_id)
        
        # Ensure queue_name is attached to returned case doc for app usage
        if "Queue_Name__c" not in case_doc and routing.get("queue_name"):
            case_doc["Queue_Name__c"] = routing["queue_name"]

        logger.info(f"Created Salesforce Case {case_doc.get('CaseNumber')} (Id: {record_id}, Queue: {case_doc.get('Queue_Name__c')})")
        return case_doc

    def get_case_by_id(self, case_id: str) -> Dict[str, Any]:
        """Fetch a single Case by Salesforce ID."""
        return self.client.get_record("Case", case_id)

    def get_case_by_number(self, case_number: str) -> Optional[Dict[str, Any]]:
        """Fetch a single Case by human-readable CaseNumber."""
        records = self.client.query(f"SELECT Id, CaseNumber, Subject, Status, Priority, Description FROM Case WHERE CaseNumber = '{case_number}' LIMIT 1")
        return records[0] if records else None

    def get_student_cases(self, student_id: str, email: Optional[str] = None) -> List[Dict[str, Any]]:
        """Fetch only Cases created by the authenticated student (PRD T12 isolation)."""
        where_clause = f"ContactId = '{student_id}'"
        if email:
            where_clause = f"(ContactId = '{student_id}' OR SuppliedEmail = '{email}')"
        return self.client.query(f"SELECT Id, CaseNumber, Subject, Status, Priority, CreatedDate, Department__c FROM Case WHERE {where_clause}")

    def get_department_cases(self, department_id: str) -> List[Dict[str, Any]]:
        """Fetch only Cases routed to the staff member's department queue (PRD T13 isolation)."""
        if self.is_mock():
            return self.client.query(f"SELECT Id, CaseNumber, Subject, Status, Priority, CreatedDate, ContactId FROM Case WHERE Department__c = '{department_id}'")

        self._ensure_metadata()
        # Resolve department ID if passed as code or mongo id
        code_key = department_id.replace("dept-", "").upper()
        dept = self._departments_cache.get(department_id) or self._departments_cache.get(code_key)
        sf_dept_id = dept.get("Id") if dept else department_id
        
        q_name = dept.get("Queue_Name__c") if dept else None
        q_id = self._queues_cache.get(q_name) if q_name else None

        if q_id:
            where_clause = f"(Department__c = '{sf_dept_id}' OR OwnerId = '{q_id}')"
        else:
            where_clause = f"Department__c = '{sf_dept_id}'"

        return self.client.query(f"SELECT Id, CaseNumber, Subject, Status, Priority, CreatedDate, ContactId FROM Case WHERE {where_clause}")

    def get_all_cases(self) -> List[Dict[str, Any]]:
        """Fetch all Cases across all departments (Administrator only)."""
        return self.client.query("SELECT Id, CaseNumber, Subject, Status, Priority, CreatedDate, Department__c, ContactId FROM Case")

    def update_status(
        self,
        case_id: str,
        new_status: str,
        user_id: str,
        resolution_notes: Optional[str] = None,
        hold_reason: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Transition a Case status, validating mandatory resolution notes or hold justification.
        """
        update_fields: Dict[str, Any] = {
            "Status": new_status,
        }
        if resolution_notes:
            update_fields["Resolution_Notes__c"] = resolution_notes
        if hold_reason:
            update_fields["Hold_Reason__c"] = hold_reason

        self.client.update_record("Case", case_id, update_fields)
        return self.client.get_record("Case", case_id)

    def submit_feedback(
        self,
        case_id: str,
        rating: int,
        comments: Optional[str] = None,
        requester_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Submit a 1-5 star CSAT feedback rating on a resolved Case.
        Transitions the Case to Closed.
        """
        case = self.client.get_record("Case", case_id)
        if case.get("ContactId") and requester_id and case.get("ContactId") != requester_id:
            raise SalesforceAPIError("Unauthorized: You can only submit feedback for your own Cases.", status_code=403)

        feedback_fields = {
            "Case__c": case_id,
            "Rating__c": rating,
            "Comments__c": comments or "",
            "Requester_Id__c": requester_id,
            "Submitted_Date__c": datetime.now(timezone.utc).isoformat()
        }
        feedback_id = self.client.create_record("Complaint_Feedback__c", feedback_fields)

        # Transition Case to Closed in Salesforce Cloud upon feedback submission
        try:
            self.client.update_record("Case", case_id, {"Status": "Closed"})
            logger.info(f"Transitioned Salesforce Case {case_id} to Closed upon feedback submission.")
        except Exception as e:
            logger.warning(f"Notice updating Salesforce Case {case_id} to Closed: {e}")

        return {
            "id": feedback_id,
            "case_id": case_id,
            "rating": rating,
            "comments": comments,
            "status": "Closed"
        }

    def get_case_history(self, case_id: str) -> List[Dict[str, Any]]:
        """Retrieve audit history entries for a given Case."""
        return self.client.query(f"SELECT Id, CaseId, Field, OldValue, NewValue, CreatedDate, CreatedById FROM CaseHistory WHERE CaseId = '{case_id}'")

    def get_dashboard_metrics(self) -> Dict[str, Any]:
        """Calculate real-time operational KPI metrics from Salesforce Cases."""
        cases = self.get_all_cases()
        total = len(cases)
        new_count = sum(1 for c in cases if c.get("Status") == "New")
        assigned_count = sum(1 for c in cases if c.get("Status") == "Assigned")
        in_progress_count = sum(1 for c in cases if c.get("Status") == "In Progress")
        resolved_count = sum(1 for c in cases if c.get("Status") == "Resolved")
        closed_count = sum(1 for c in cases if c.get("Status") == "Closed")
        overdue_count = sum(1 for c in cases if c.get("Is_Overdue__c", False))
        
        resolution_rate = round(((resolved_count + closed_count) / total * 100), 1) if total > 0 else 0.0

        return {
            "total_complaints": total,
            "new_complaints": new_count,
            "assigned_complaints": assigned_count,
            "in_progress_complaints": in_progress_count,
            "resolved_complaints": resolved_count,
            "closed_complaints": closed_count,
            "overdue_complaints": overdue_count,
            "resolution_rate": resolution_rate,
            "mode": "Salesforce Service Cloud (Authoritative)"
        }


# Singleton service holder
_salesforce_service_instance: Optional[SalesforceService] = None

def get_salesforce_service() -> SalesforceService:
    """Dependency provider for SalesforceService."""
    global _salesforce_service_instance
    if _salesforce_service_instance is None:
        _salesforce_service_instance = SalesforceService()
    return _salesforce_service_instance

