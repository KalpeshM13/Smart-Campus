from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict
from app.models.category import DefaultPriority

class CategoryBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    description: Optional[str] = None
    department_id: str
    default_priority: DefaultPriority = DefaultPriority.MEDIUM

class CategoryCreate(CategoryBase):
    pass

class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    department_id: Optional[str] = None
    default_priority: Optional[DefaultPriority] = None
    is_active: Optional[bool] = None

class CategoryResponse(CategoryBase):
    id: str
    is_active: bool
    department_name: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
