from datetime import datetime, timezone
from typing import Optional
from pymongo.database import Database
from app.models.notification import Notification, NotificationType

def create_notification(
    db: Database,
    user_id: str,
    title: str,
    message: str,
    type: NotificationType,
    complaint_id: Optional[str] = None
) -> Notification:
    """Create in-app notification in MongoDB for student, staff, or administrator (FR-08)."""
    notif = Notification(
        user_id=user_id,
        title=title,
        message=message,
        type=type,
        complaint_id=complaint_id,
        is_read=False,
        created_at=datetime.now(timezone.utc)
    )
    db.notifications.insert_one(notif.to_mongo())
    return notif
