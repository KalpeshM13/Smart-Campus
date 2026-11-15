"""
Salesforce Service Cloud Integration Test Suite.
Verifies OAuth configuration, Case creation, Queue auto-routing, Validation rules,
Status lifecycle, Feedback constraints, and Role-based data isolation.
"""

import pytest
from app.integrations.salesforce.config import SalesforceConfig
from app.integrations.salesforce.mock_provider import SalesforceMockProvider
from app.integrations.salesforce.client import SalesforceAPIError, SalesforceRestClient
from app.integrations.salesforce.service import SalesforceService

@pytest.fixture
def sf_mock():
    """Provides a fresh, isolated Salesforce Mock Provider for each test."""
    provider = SalesforceMockProvider()
    provider.reset_sandbox()
    return provider

@pytest.fixture
def sf_service(sf_mock):
    """Provides a SalesforceService bound to the isolated mock provider."""
    return SalesforceService(client=sf_mock)


def test_salesforce_config_defaults_to_safe_mock_mode():
    """Verify that when no live credentials are provided, config safely enables mock mode."""
    cfg = SalesforceConfig()
    assert cfg.MOCK_MODE is True
    assert cfg.DEFAULT_CASE_ORIGIN == "Web Portal"
    assert cfg.ADMIN_REVIEW_QUEUE == "Admin_Review_Queue"


def test_case_creation_and_automatic_queue_routing(sf_service):
    """PRD FR-05 & Rule 44: Category-based routing to department queues."""
    case = sf_service.create_case(
        subject="Wi-Fi down in Turing Block",
        description="Unable to connect to campus network",
        category_id="a02-wifi",
        priority="High",
        location="Turing Block B, Room 204",
        requester_id="usr-student-1",
        requester_name="Sarah Chen",
        requester_email="sarah.chen@student.smartcampus.edu"
    )

    assert case["Id"].startswith("500")
    assert case["CaseNumber"].startswith("SCMS-2026-")
    assert case["Status"] == "Assigned"
    assert case["OwnerId"] == "00G-IT-QUEUE"
    assert case["Queue_Name__c"] == "IT Department Queue"
    assert case["Department__c"] == "a01-it"
    assert case["Priority"] == "High"


def test_unmapped_category_routes_to_admin_review_queue(sf_service):
    """PRD FR-05 & Rule 45: Unmapped category remains New and routes to Admin Review Queue."""
    case = sf_service.create_case(
        subject="Unknown campus issue",
        description="Uncategorized inquiry",
        category_id="non-existent-cat-999",
        requester_id="usr-student-1"
    )

    assert case["Status"] == "New"
    assert case["OwnerId"] == "00G-ADMIN-QUEUE"
    assert case["Queue_Name__c"] == "Admin Review Queue"
    assert case.get("Needs_Admin_Triage__c") is True


def test_status_transition_and_history_audit(sf_service):
    """PRD FR-06 & Rule 51: Status changes must record history entries."""
    case = sf_service.create_case(
        subject="Projector failure in Hall 101",
        description="Bulb blinking amber",
        category_id="a02-class",
        requester_id="usr-student-1"
    )
    case_id = case["Id"]

    # Transition Assigned -> In Progress
    updated = sf_service.update_status(case_id, "In Progress", user_id="usr-staff-1")
    assert updated["Status"] == "In Progress"

    # Audit history entries
    history = sf_service.get_case_history(case_id)
    assert len(history) >= 2
    assert any(h["NewValue"] == "In Progress" for h in history)


def test_resolution_notes_mandatory_validation_rule(sf_service):
    """PRD FR-06 & Rule 48: Resolution notes are mandatory before marking Resolved."""
    case = sf_service.create_case(
        subject="AC leaking in Lab 3",
        description="Water leaking near server rack",
        category_id="a02-elec",
        requester_id="usr-student-1"
    )
    case_id = case["Id"]

    # Attempting to resolve without notes must fail with 422
    with pytest.raises(SalesforceAPIError) as exc_info:
        sf_service.update_status(case_id, "Resolved", user_id="usr-staff-1", resolution_notes="")
    assert exc_info.value.status_code == 422
    assert "Resolution notes are mandatory" in exc_info.value.message

    # Attempting to resolve with valid notes succeeds
    resolved = sf_service.update_status(
        case_id,
        "Resolved",
        user_id="usr-staff-1",
        resolution_notes="Replaced condensate drain tube and verified 0% leakage."
    )
    assert resolved["Status"] == "Resolved"
    assert resolved["Resolution_Notes__c"] == "Replaced condensate drain tube and verified 0% leakage."


def test_feedback_submission_and_auto_close(sf_service):
    """PRD FR-09 & Rule 50: Feedback after resolution transitions Case to Closed."""
    case = sf_service.create_case(
        subject="Broken desk leg",
        description="Desk unstable in Seminar Room 4",
        category_id="a02-furn",
        requester_id="usr-student-1"
    )
    case_id = case["Id"]

    # Feedback before resolution is rejected
    with pytest.raises(SalesforceAPIError) as exc_info:
        sf_service.submit_feedback(case_id, rating=5, comments="Great job", requester_id="usr-student-1")
    assert exc_info.value.status_code == 400

    # Resolve case first
    sf_service.update_status(case_id, "Resolved", user_id="usr-staff-1", resolution_notes="Welded frame.")

    # Submit feedback
    fb = sf_service.submit_feedback(case_id, rating=5, comments="Fixed very quickly, thank you!", requester_id="usr-student-1")
    assert fb["rating"] == 5
    assert fb["status"] == "Closed"

    # Case status in Salesforce is now Closed
    closed_case = sf_service.get_case_by_id(case_id)
    assert closed_case["Status"] == "Closed"

    # Duplicate feedback submission rejected (PRD Rule 50)
    with pytest.raises(SalesforceAPIError) as exc_info:
        sf_service.submit_feedback(case_id, rating=4, comments="Second review attempt", requester_id="usr-student-1")
    assert exc_info.value.status_code == 400
    assert "Duplicate feedback rejected" in exc_info.value.message


def test_role_based_case_isolation(sf_service):
    """PRD T12 & T13: Requesters see only their Cases; Staff see only their department Cases."""
    # Student 1 Case (IT dept)
    c1 = sf_service.create_case(
        subject="Wi-Fi issue",
        description="Slow network",
        category_id="a02-wifi",
        requester_id="student-sarah"
    )
    # Student 2 Case (Maintenance dept)
    c2 = sf_service.create_case(
        subject="Door lock jammed",
        description="Lock stuck",
        category_id="a02-infr",
        requester_id="student-john"
    )

    # Student 1 query returns ONLY their Case
    sarah_cases = sf_service.get_student_cases("student-sarah")
    assert len(sarah_cases) == 1
    assert sarah_cases[0]["Id"] == c1["Id"]

    # Student 2 query returns ONLY their Case
    john_cases = sf_service.get_student_cases("student-john")
    assert len(john_cases) == 1
    assert john_cases[0]["Id"] == c2["Id"]

    # IT Staff query returns ONLY IT department Cases
    it_cases = sf_service.get_department_cases("a01-it")
    assert len(it_cases) == 1
    assert it_cases[0]["Id"] == c1["Id"]

    # Maintenance Staff query returns ONLY Maintenance department Cases
    maint_cases = sf_service.get_department_cases("a01-maint")
    assert len(maint_cases) == 1
    assert maint_cases[0]["Id"] == c2["Id"]


def test_dashboard_metrics_aggregation(sf_service):
    """PRD FR-11: Dashboard metrics accurately reflect live Salesforce Cases."""
    sf_service.create_case("Issue 1", "Desc", "a02-wifi", requester_id="s1")
    c2 = sf_service.create_case("Issue 2", "Desc", "a02-infr", requester_id="s2")
    sf_service.update_status(c2["Id"], "Resolved", user_id="staff-1", resolution_notes="Fixed completely.")

    metrics = sf_service.get_dashboard_metrics()
    assert metrics["total_complaints"] == 2
    assert metrics["assigned_complaints"] == 1
    assert metrics["resolved_complaints"] == 1
    assert metrics["resolution_rate"] == 50.0


def test_health_check_does_not_leak_secrets(sf_service):
    """PRD Security: Health check exposes connection status without leaking credentials."""
    health = sf_service.get_health()
    assert health["status"] == "connected"
    assert "mode" in health
    assert "client_secret" not in health
    assert "access_token" not in health
    assert "password" not in health

