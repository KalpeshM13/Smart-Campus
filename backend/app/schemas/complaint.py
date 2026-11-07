from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field, model_validator, ConfigDict
from app.models.complaint import Priority, ComplaintStatus
from app.schemas.feedback import FeedbackResponse

class ComplaintCreate(BaseModel):
    title: str = Field(..., min_length=5, max_length=200)
    description: str = Field(..., min_length=15)
    category_id: str
    priority: Priority = Priority.MEDIUM
    campus: str = "Main University Campus"
    building: Optional[str] = None
    room: Optional[str] = None
    attachment_name: Optional[str] = None

class ComplaintStatusUpdate(BaseModel):
    status: ComplaintStatus
    resolution_notes: Optional[str] = None
    hold_reason: Optional[str] = None

    @model_validator(mode="after")
    def validate_lifecycle_rules(self):
        # PRD Section 6 FR-06: Resolution notes are mandatory before setting a complaint to RESOLVED
        if self.status == ComplaintStatus.RESOLVED:
            if not self.resolution_notes or len(self.resolution_notes.strip()) < 5:
                raise ValueError("Resolution notes (at least 5 characters) are mandatory before marking complaint as RESOLVED.")
        
        # PRD Section 6 FR-06: Staff can place a request ON_HOLD with a reason
        if self.status == ComplaintStatus.ON_HOLD:
            if not self.hold_reason or len(self.hold_reason.strip()) < 5:
                raise ValueError("A specific hold reason (at least 5 characters) is required before placing request ON_HOLD.")
        return self

class ComplaintAssign(BaseModel):
    department_id: str
    staff_id: Optional[str] = None

class ComplaintHistoryResponse(BaseModel):
    id: str
    changed_by_name: str
    changed_by_role: str
    previous_status: str
    new_status: str
    remarks: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class ComplaintResponse(BaseModel):
    id: str
    complaint_number: str
    title: str
    description: str
    category_id: str
    category_name: Optional[str] = None
    priority: Priority
    status: ComplaintStatus
    created_by: str
    created_by_name: Optional[str] = None
    created_by_role: Optional[str] = None
    assigned_department_id: str
    assigned_department_name: Optional[str] = None
    assigned_staff_id: Optional[str] = None
    assigned_staff_name: Optional[str] = None
    campus: str
    building: Optional[str] = None
    room: Optional[str] = None
    location: str
    resolution_notes: Optional[str] = None
    hold_reason: Optional[str] = None
    attachment_name: Optional[str] = None
    sla_target_hours: int
    is_overdue: bool
    created_at: datetime
    updated_at: datetime
    resolved_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class ComplaintDetailResponse(ComplaintResponse):
    history: List[ComplaintHistoryResponse] = []
    feedback: Optional[FeedbackResponse] = None
