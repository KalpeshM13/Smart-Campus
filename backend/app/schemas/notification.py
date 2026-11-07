from typing import Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict
from app.models.notification import NotificationType

class NotificationResponse(BaseModel):
    id: str
    user_id: str
    title: str
    message: str
    is_read: bool
    complaint_id: Optional[str] = None
    type: NotificationType
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
