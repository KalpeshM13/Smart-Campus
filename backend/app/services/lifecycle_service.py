from datetime import datetime, timezone
from typing import Optional
from fastapi import HTTPException, status
from pymongo.database import Database
from app.models.complaint import Complaint, ComplaintStatus
from app.models.history import ComplaintHistory
from app.models.notification import NotificationType
from app.models.user import User, Role
from app.services.notification_service import create_notification

def transition_complaint_status(
    db: Database,
    complaint: Complaint,
    new_status: ComplaintStatus,
    operator: User,
    resolution_notes: Optional[str] = None,
    hold_reason: Optional[str] = None
) -> Complaint:
    """
    Enforce Complaint Lifecycle Management on MongoDB (PRD Section 6 FR-06).
    - Status progression: NEW -> ASSIGNED -> IN_PROGRESS -> ON_HOLD -> RESOLVED -> CLOSED
    - Resolution notes are mandatory before setting a complaint to RESOLVED.
    - Hold reason is mandatory before placing a complaint ON_HOLD.
    - Every status change creates a history record and updates the complaint document.
    """
    previous_status = complaint.status

    # PRD FR-06: Resolution notes are mandatory before setting to RESOLVED (Test T8, T9)
    if new_status == ComplaintStatus.RESOLVED:
        if not resolution_notes or len(resolution_notes.strip()) < 5:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Validation Error: Detailed resolution notes (minimum 5 characters) are mandatory before resolving a complaint."
            )

    # PRD FR-06: Staff can place a request ON_HOLD with a reason
    if new_status == ComplaintStatus.ON_HOLD:
        if not hold_reason or len(hold_reason.strip()) < 5:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Validation Error: A specific justification is mandatory before placing a complaint on hold."
            )

    # Requesters can only transition to CLOSED or request review
    if operator.role in [Role.STUDENT, Role.FACULTY]:
        if new_status not in [ComplaintStatus.CLOSED]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Requesters are only permitted to close resolved complaints or submit feedback."
            )

    now = datetime.now(timezone.utc)
    complaint.status = new_status
    complaint.updated_at = now

    remarks_text = f"Status updated from {previous_status.value} to {new_status.value} by {operator.full_name} ({operator.role.value})."

    if new_status == ComplaintStatus.RESOLVED:
        complaint.resolved_at = now
        complaint.resolution_notes = resolution_notes
        remarks_text += f" Resolution notes: {resolution_notes}"
    elif new_status == ComplaintStatus.ON_HOLD:
        complaint.hold_reason = hold_reason
        remarks_text += f" Hold reason: {hold_reason}"
    elif new_status == ComplaintStatus.IN_PROGRESS and previous_status == ComplaintStatus.ON_HOLD:
        complaint.hold_reason = None
        remarks_text += " Resumed active processing after temporary hold."

    # Record history entry (FR-06, Test T7) in MongoDB
    history_entry = ComplaintHistory(
        complaint_id=complaint.id,
        changed_by=operator.id,
        previous_status=previous_status.value,
        new_status=new_status.value,
        remarks=remarks_text,
        created_at=now
    )
    db.complaint_history.insert_one(history_entry.to_mongo())

    # In-app notification to requester
    if operator.id != complaint.created_by:
        notif_type = NotificationType.RESOLVED if new_status == ComplaintStatus.RESOLVED else NotificationType.STATUS_CHANGE
        create_notification(
            db=db,
            user_id=complaint.created_by,
            title=f"Complaint Status: {complaint.complaint_number}",
            message=f"Status changed to {new_status.value}. {resolution_notes or hold_reason or ''}".strip(),
            type=notif_type,
            complaint_id=complaint.id
        )

    # Update complaint document in MongoDB
    db.complaints.update_one(
        {"$or": [{"_id": complaint.id}, {"id": complaint.id}]},
        {"$set": complaint.to_mongo()}
    )

    return complaint
