from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from pymongo import DESCENDING
from pymongo.database import Database
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.notification import Notification
from app.models.user import User, Role
from app.schemas.notification import NotificationResponse

router = APIRouter(prefix="/notifications", tags=["Notifications"])

@router.get("", response_model=List[NotificationResponse])
def get_user_notifications(
    unread_only: bool = False,
    current_user: User = Depends(get_current_user),
    db: Database = Depends(get_db)
):
    """Retrieve in-app notifications for authenticated user in MongoDB (PRD Section 6 FR-08)."""
    filter_criteria = {}
    if current_user.role != Role.ADMIN:
        filter_criteria["user_id"] = current_user.id

    if unread_only:
        filter_criteria["is_read"] = False

    docs = db.notifications.find(filter_criteria).sort("created_at", DESCENDING).limit(50)
    results = []
    for doc in docs:
        n = Notification.from_mongo(doc)
        if n:
            results.append(n)

    return results

@router.patch("/{notif_id}/read", response_model=NotificationResponse)
def mark_notification_as_read(
    notif_id: str,
    current_user: User = Depends(get_current_user),
    db: Database = Depends(get_db)
):
    """Mark a notification as read in MongoDB (FR-08)."""
    doc = db.notifications.find_one({"$or": [{"_id": notif_id}, {"id": notif_id}]})
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found.")

    if doc.get("user_id") != current_user.id and current_user.role != Role.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden.")

    db.notifications.update_one(
        {"$or": [{"_id": notif_id}, {"id": notif_id}]},
        {"$set": {"is_read": True}}
    )
    doc["is_read"] = True
    return Notification.from_mongo(doc)
