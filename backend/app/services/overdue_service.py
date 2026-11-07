from datetime import datetime, timezone
from pymongo.database import Database
from app.models.complaint import Complaint, ComplaintStatus
from app.models.notification import NotificationType
from app.models.user import Role
from app.services.notification_service import create_notification

def check_and_flag_overdue_complaints(db: Database) -> int:
    """
    Automated SLA Overdue Inspection on MongoDB (PRD Section 6 FR-15, Section 11.2, Test T17).
    - Identifies open complaints exceeding configured service targets.
    - Sets is_overdue = True.
    - Notifies department supervisors and administrators.
    """
    now = datetime.now(timezone.utc)
    open_statuses = [
        ComplaintStatus.NEW.value,
        ComplaintStatus.ASSIGNED.value,
        ComplaintStatus.IN_PROGRESS.value,
        ComplaintStatus.ON_HOLD.value
    ]

    open_docs = db.complaints.find({
        "status": {"$in": open_statuses},
        "is_overdue": False
    })

    flagged_count = 0

    for doc in open_docs:
        c = Complaint.from_mongo(doc)
        if not c:
            continue

        created_aware = c.created_at.replace(tzinfo=timezone.utc) if c.created_at.tzinfo is None else c.created_at
        elapsed_hours = (now - created_aware).total_seconds() / 3600.0

        if elapsed_hours >= c.sla_target_hours:
            db.complaints.update_one(
                {"$or": [{"_id": c.id}, {"id": c.id}]},
                {"$set": {"is_overdue": True, "updated_at": now}}
            )
            flagged_count += 1

            # Notify department staff
            staff_docs = db.users.find({
                "staff_department_id": c.assigned_department_id,
                "role": Role.STAFF.value
            })

            for s_doc in staff_docs:
                staff_id = s_doc.get("id") or str(s_doc.get("_id"))
                create_notification(
                    db=db,
                    user_id=staff_id,
                    title=f"SLA Breach Escalation: {c.complaint_number}",
                    message=f"Ticket '{c.title}' has exceeded its {c.sla_target_hours}h SLA deadline.",
                    type=NotificationType.OVERDUE,
                    complaint_id=c.id
                )

    return flagged_count
