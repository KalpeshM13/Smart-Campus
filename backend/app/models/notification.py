import uuid
from datetime import datetime, timezone
from typing import Optional
import enum
from pydantic import BaseModel, Field, ConfigDict

class NotificationType(str, enum.Enum):
    ASSIGNMENT = "ASSIGNMENT"
    STATUS_CHANGE = "STATUS_CHANGE"
    RESOLVED = "RESOLVED"
    FEEDBACK = "FEEDBACK"
    OVERDUE = "OVERDUE"

class Notification(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    title: str
    message: str
    is_read: bool = False
    complaint_id: Optional[str] = None
    type: NotificationType = NotificationType.STATUS_CHANGE
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    def to_mongo(self) -> dict:
        d = self.model_dump()
        d["_id"] = self.id
        return d

    @classmethod
    def from_mongo(cls, d: dict | None):
        if not d:
            return None
        data = dict(d)
        if "_id" in data and "id" not in data:
            data["id"] = str(data["_id"])
        data.pop("_id", None)
        return cls(**data)
