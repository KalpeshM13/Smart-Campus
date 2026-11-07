from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from pymongo.database import Database
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.complaint import Complaint, ComplaintStatus
from app.models.feedback import Feedback
from app.models.history import ComplaintHistory
from app.models.user import User
from app.schemas.feedback import FeedbackCreate, FeedbackResponse, FeedbackAnalyticsResponse

router = APIRouter(prefix="/feedback", tags=["Feedback"])

@router.post("", response_model=FeedbackResponse, status_code=status.HTTP_201_CREATED)
def submit_feedback(
    payload: FeedbackCreate,
    current_user: User = Depends(get_current_user),
    db: Database = Depends(get_db)
):
    """
    Submit CSAT rating and comments for resolved service requests in MongoDB (PRD Section 6 FR-09, Test T10, T11).
    - Only the complaint creator can submit feedback.
    - Feedback is available only after resolution.
    - Exactly one feedback record allowed per complaint.
    - Automatically transitions ticket to CLOSED.
    """
    doc = db.complaints.find_one({"$or": [{"_id": payload.complaint_id}, {"id": payload.complaint_id}]})
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Complaint not found.")

    complaint = Complaint.from_mongo(doc)

    # Rule 1: Only the complaint creator can submit feedback (PRD Section 6 FR-09)
    if complaint.created_by != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Only the original complaint creator can submit resolution feedback."
        )

    # Rule 2: Feedback is available only after resolution (Test T10)
    if complaint.status not in [ComplaintStatus.RESOLVED, ComplaintStatus.CLOSED]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot submit feedback for a complaint with status '{complaint.status.value}'. Must be RESOLVED."
        )

    # Rule 3: Single feedback record allowed per complaint (Test T11)
    existing_feedback = db.feedback.find_one({"complaint_id": complaint.id})
    if existing_feedback:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Duplicate feedback rejected: A review has already been submitted for this complaint."
        )

    now = datetime.now(timezone.utc)
    fb = Feedback(
        complaint_id=complaint.id,
        user_id=current_user.id,
        rating=payload.rating,
        comments=payload.comments,
        created_at=now
    )
    db.feedback.insert_one(fb.to_mongo())

    # Transition to CLOSED upon feedback
    previous_status = complaint.status.value
    complaint.status = ComplaintStatus.CLOSED
    complaint.updated_at = now

    history = ComplaintHistory(
        complaint_id=complaint.id,
        changed_by=current_user.id,
        previous_status=previous_status,
        new_status=ComplaintStatus.CLOSED.value,
        remarks=f"Requester submitted {payload.rating}-star CSAT rating. Ticket officially closed.",
        created_at=now
    )
    db.complaint_history.insert_one(history.to_mongo())

    db.complaints.update_one(
        {"$or": [{"_id": complaint.id}, {"id": complaint.id}]},
        {"$set": {"status": ComplaintStatus.CLOSED.value, "updated_at": now}}
    )

    return FeedbackResponse(
        id=fb.id,
        complaint_id=fb.complaint_id,
        user_id=fb.user_id,
        user_name=current_user.full_name,
        rating=fb.rating,
        comments=fb.comments,
        created_at=fb.created_at
    )

@router.get("/analytics", response_model=FeedbackAnalyticsResponse)
def get_feedback_analytics(
    current_user: User = Depends(get_current_user),
    db: Database = Depends(get_db)
):
    """Aggregated CSAT analytics using MongoDB aggregation pipelines (PRD Section 6 FR-09, FR-11)."""
    feedbacks = list(db.feedback.find({}))
    total = len(feedbacks)

    if total == 0:
        return FeedbackAnalyticsResponse(
            average_rating=0.0,
            total_reviews=0,
            rating_distribution={1: 0, 2: 0, 3: 0, 4: 0, 5: 0},
            recent_comments=[]
        )

    avg_rating = round(sum(f.get("rating", 0) for f in feedbacks) / total, 2)
    dist = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
    for f in feedbacks:
        r = f.get("rating", 5)
        if r in dist:
            dist[r] += 1

    recent = []
    sorted_fb = sorted(feedbacks, key=lambda x: x.get("created_at", datetime.min), reverse=True)[:5]
    for f in sorted_fb:
        user_doc = db.users.find_one({"$or": [{"_id": f.get("user_id")}, {"id": f.get("user_id")}]})
        recent.append({
            "id": f.get("id") or str(f.get("_id")),
            "complaint_id": f.get("complaint_id"),
            "user_id": f.get("user_id"),
            "user_name": user_doc.get("full_name") if user_doc else "Student",
            "rating": f.get("rating"),
            "comments": f.get("comments"),
            "created_at": f.get("created_at")
        })

    return FeedbackAnalyticsResponse(
        average_rating=avg_rating,
        total_reviews=total,
        rating_distribution=dist,
        recent_comments=recent
    )
