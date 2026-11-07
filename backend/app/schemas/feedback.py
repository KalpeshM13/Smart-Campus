from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict

class FeedbackCreate(BaseModel):
    complaint_id: str
    rating: int = Field(..., ge=1, le=5, description="1 to 5 stars")
    comments: Optional[str] = None

class FeedbackResponse(BaseModel):
    id: str
    complaint_id: str
    user_id: str
    user_name: Optional[str] = None
    rating: int
    comments: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class FeedbackAnalyticsResponse(BaseModel):
    average_rating: float
    total_reviews: int
    rating_breakdown: dict
    positive_percentage: float
