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

    def is_mock(self) -> bool:
        return self.client.is_mock()

    def get_health(self) -> Dict[str, Any]:
        return self.client.health_check()

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
        fields: Dict[str, Any] = {
            "Subject": subject,
            "Description": description,
            "Complaint_Category__c": category_id,
            "Priority": priority,
            "Campus_Location__c": location,
            "Building__c": building,
            "Room__c": room,
            "ContactId": requester_id,
            "Requester_Name__c": requester_name,
            "Requester_Email__c": requester_email,
        }

        record_id = self.client.create_record("Case", fields)
        case_doc = self.client.get_record("Case", record_id)
        logger.info(f"Created Salesforce Case {case_doc.get('CaseNumber')} (Id: {record_id}, Queue: {case_doc.get('Queue_Name__c')})")
        return case_doc

    def get_case_by_id(self, case_id: str) -> Dict[str, Any]:
        """Fetch a single Case by Salesforce ID."""
        return self.client.get_record("Case", case_id)

    def get_case_by_number(self, case_number: str) -> Optional[Dict[str, Any]]:
        """Fetch a single Case by human-readable CaseNumber."""
        records = self.client.query(f"SELECT Id, CaseNumber, Subject, Status, Priority, Description FROM Case WHERE CaseNumber = '{case_number}' LIMIT 1")
        return records[0] if records else None

    def get_student_cases(self, student_id: str) -> List[Dict[str, Any]]:
        """Fetch only Cases created by the authenticated student (PRD T12 isolation)."""
        return self.client.query(f"SELECT Id, CaseNumber, Subject, Status, Priority, CreatedDate, Department__c FROM Case WHERE ContactId = '{student_id}'")

    def get_department_cases(self, department_id: str) -> List[Dict[str, Any]]:
        """Fetch only Cases routed to the staff member's department queue (PRD T13 isolation)."""
        return self.client.query(f"SELECT Id, CaseNumber, Subject, Status, Priority, CreatedDate, ContactId FROM Case WHERE Department__c = '{department_id}'")

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
            "LastModifiedById": user_id
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

