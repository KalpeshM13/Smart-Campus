from typing import Tuple, Optional
from datetime import datetime, timezone
from pymongo.database import Database
from app.models.category import ComplaintCategory
from app.models.department import Department
from app.models.complaint import Complaint, ComplaintStatus, Priority
from app.models.history import ComplaintHistory
from app.models.notification import NotificationType
from app.models.user import User
from app.services.notification_service import create_notification
from app.core.config import settings

def route_complaint(
    db: Database,
    category: ComplaintCategory,
    complaint: Complaint,
    creator: User
) -> Tuple[ComplaintStatus, Optional[str], int]:
    """
    Automated Category-to-Department Routing Engine (PRD Section 6 FR-05) on MongoDB.
    - Checks active department mapping in MongoDB.
    - Determines SLA hours based on priority.
    - Transitions to ASSIGNED if department active, otherwise retains NEW.
    """
    # Calculate SLA hours
    sla_hours = settings.SLA_HOURS_MEDIUM
    if complaint.priority == Priority.HIGH:
        sla_hours = settings.SLA_HOURS_HIGH
    elif complaint.priority == Priority.LOW:
        sla_hours = settings.SLA_HOURS_LOW

    # Check mapped department in MongoDB
    dept_doc = db.departments.find_one({
        "$or": [{"_id": category.department_id}, {"id": category.department_id}],
        "is_active": True
    })

    now = datetime.now(timezone.utc)

    if dept_doc:
        dept = Department.from_mongo(dept_doc)
        # Successful auto-assignment
        complaint.assigned_department_id = dept.id
        complaint.status = ComplaintStatus.ASSIGNED
        complaint.sla_target_hours = sla_hours

        # Log auto-routing history
        history_entry = ComplaintHistory(
            complaint_id=complaint.id,
            changed_by=creator.id,
            previous_status="NEW",
            new_status=ComplaintStatus.ASSIGNED.value,
            remarks=f"Auto-assigned to {dept.name} based on Category mapping [{category.name}]. SLA Target: {sla_hours} hours.",
            created_at=now
        )
        db.complaint_history.insert_one(history_entry.to_mongo())

        # In-app notification
        create_notification(
            db=db,
            user_id=creator.id,
            title=f"Request Assigned: {complaint.complaint_number}",
            message=f"Your complaint has been automatically routed to {dept.name} with a {sla_hours}h service target.",
            type=NotificationType.ASSIGNMENT,
            complaint_id=complaint.id
        )

        return ComplaintStatus.ASSIGNED, dept.id, sla_hours
    else:
        # No valid active department mapping exists
        complaint.status = ComplaintStatus.NEW
        complaint.sla_target_hours = sla_hours

        history_entry = ComplaintHistory(
            complaint_id=complaint.id,
            changed_by=creator.id,
            previous_status="NEW",
            new_status=ComplaintStatus.NEW.value,
            remarks=f"No active department mapped for category [{category.name}]. Complaint flagged as NEW for Administrator triage.",
            created_at=now
        )
        db.complaint_history.insert_one(history_entry.to_mongo())

        create_notification(
            db=db,
            user_id=creator.id,
            title=f"Request Registered: {complaint.complaint_number}",
            message="Your request has been logged and is pending administrator department assignment.",
            type=NotificationType.ASSIGNMENT,
            complaint_id=complaint.id
        )

        return ComplaintStatus.NEW, None, sla_hours
