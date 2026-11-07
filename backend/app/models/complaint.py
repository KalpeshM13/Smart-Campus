import uuid
from datetime import datetime, timezone
from typing import Optional
import enum
from pydantic import BaseModel, Field, ConfigDict

class Priority(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"

class ComplaintStatus(str, enum.Enum):
    NEW = "NEW"
    ASSIGNED = "ASSIGNED"
    IN_PROGRESS = "IN_PROGRESS"
    ON_HOLD = "ON_HOLD"
    RESOLVED = "RESOLVED"
    CLOSED = "CLOSED"
    REJECTED = "REJECTED"

class Complaint(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    complaint_number: str
    title: str
    description: str
    category_id: str
    priority: Priority = Priority.MEDIUM
    status: ComplaintStatus = ComplaintStatus.NEW
    created_by: str
    assigned_department_id: str
    assigned_staff_id: Optional[str] = None
    
    campus: str = "Main University Campus"
    building: Optional[str] = None
    room: Optional[str] = None
    location: str
    
    resolution_notes: Optional[str] = None
    hold_reason: Optional[str] = None
    attachment_name: Optional[str] = None
    attachment_path: Optional[str] = None
    
    sla_target_hours: int = 24
    is_overdue: bool = False
    
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    resolved_at: Optional[datetime] = None

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
