from typing import Optional
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field, field_validator, ConfigDict
from app.models.user import Role

class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8, description="Minimum 8 characters")
    full_name: str = Field(..., min_length=2, max_length=100)
    role: Role = Role.STUDENT
    student_id: Optional[str] = None
    course: Optional[str] = None
    department: Optional[str] = None
    year: Optional[int] = None
    phone: Optional[str] = None

    @field_validator("role")
    def validate_public_registration_role(cls, v: Role):
        # PRD Section 6 FR-01: Public registration must not allow users to create administrator or department-staff accounts
        if v not in [Role.STUDENT, Role.FACULTY]:
            raise ValueError("Public registration is restricted to STUDENT or FACULTY accounts only.")
        return v

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class StudentProfileResponse(BaseModel):
    student_id: str
    course: Optional[str] = None
    department: Optional[str] = None
    year: Optional[int] = None
    phone: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class UserResponse(BaseModel):
    id: str
    full_name: str
    email: EmailStr
    role: Role
    is_active: bool
    staff_department_id: Optional[str] = None
    student_profile: Optional[StudentProfileResponse] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
