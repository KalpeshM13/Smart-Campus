import uuid
from datetime import datetime, timezone
from typing import Optional
import enum
from pydantic import BaseModel, Field, ConfigDict

class Role(str, enum.Enum):
    STUDENT = "STUDENT"
    FACULTY = "FACULTY"
    STAFF = "STAFF"
    ADMIN = "ADMIN"

class StudentProfile(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    student_id: str
    course: Optional[str] = None
    department: Optional[str] = None
    year: Optional[int] = None
    phone: Optional[str] = None

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

class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    full_name: str
    email: str
    password_hash: str
    role: Role = Role.STUDENT
    is_active: bool = True
    staff_department_id: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    student_profile: Optional[StudentProfile] = None

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    def to_mongo(self) -> dict:
        d = self.model_dump()
        d["_id"] = self.id
        if self.student_profile:
            d["student_profile"] = self.student_profile.model_dump()
        return d

    @classmethod
    def from_mongo(cls, d: dict | None):
        if not d:
            return None
        data = dict(d)
        if "_id" in data and "id" not in data:
            data["id"] = str(data["_id"])
        data.pop("_id", None)
        if data.get("student_profile") and isinstance(data["student_profile"], dict):
            data["student_profile"] = StudentProfile(**data["student_profile"])
        return cls(**data)
