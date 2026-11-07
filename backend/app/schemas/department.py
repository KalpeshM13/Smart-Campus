from typing import Optional
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field, ConfigDict

class DepartmentBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    description: Optional[str] = None
    contact_email: EmailStr
    sla_target_hours: int = Field(24, ge=1, le=720)
    head_name: Optional[str] = None

class DepartmentCreate(DepartmentBase):
    pass

class DepartmentUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    contact_email: Optional[EmailStr] = None
    sla_target_hours: Optional[int] = None
    head_name: Optional[str] = None
    is_active: Optional[bool] = None

class DepartmentResponse(DepartmentBase):
    id: str
    is_active: bool
    created_at: datetime
    open_complaints_count: Optional[int] = 0

    model_config = ConfigDict(from_attributes=True)
