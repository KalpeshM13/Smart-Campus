import uuid
from datetime import datetime, timezone
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict

class Department(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: Optional[str] = None
    contact_email: str
    is_active: bool = True
    head_name: Optional[str] = None
    sla_target_hours: int = 24
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
