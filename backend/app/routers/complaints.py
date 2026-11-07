import os
from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, status
from pymongo import DESCENDING
from pymongo.database import Database
from app.core.database import get_db
from app.core.dependencies import get_current_user, require_admin, verify_complaint_access
from app.models.category import ComplaintCategory
from app.models.department import Department
from app.models.complaint import Complaint, ComplaintStatus, Priority
from app.models.history import ComplaintHistory
from app.models.user import User, Role
from app.schemas.complaint import (
    ComplaintCreate,
    ComplaintStatusUpdate,
    ComplaintAssign,
    ComplaintResponse,
    ComplaintDetailResponse
)
from app.services.complaint_number_service import generate_complaint_number
from app.services.assignment_service import route_complaint
from app.services.lifecycle_service import transition_complaint_status

router = APIRouter(prefix="/complaints", tags=["Complaints"])

UPLOAD_DIR = os.path.join(os.getcwd(), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

def _enrich_complaint_response(c: Complaint, db: Database) -> dict:
    """Helper to populate relationship names for JSON response in MongoDB."""
    cat_doc = db.complaint_categories.find_one({"$or": [{"_id": c.category_id}, {"id": c.category_id}]})
    dept_doc = db.departments.find_one({"$or": [{"_id": c.assigned_department_id}, {"id": c.assigned_department_id}]})
    creator_doc = db.users.find_one({"$or": [{"_id": c.created_by}, {"id": c.created_by}]})
    
    staff_doc = None
    if c.assigned_staff_id:
        staff_doc = db.users.find_one({"$or": [{"_id": c.assigned_staff_id}, {"id": c.assigned_staff_id}]})

    return {
        "id": c.id,
        "complaint_number": c.complaint_number,
        "title": c.title,
        "description": c.description,
        "category_id": c.category_id,
        "category_name": cat_doc.get("name") if cat_doc else "General",
        "priority": c.priority,
        "status": c.status,
        "created_by": c.created_by,
        "created_by_name": creator_doc.get("full_name") if creator_doc else "Unknown",
        "created_by_role": creator_doc.get("role") if creator_doc else "STUDENT",
        "assigned_department_id": c.assigned_department_id,
        "assigned_department_name": dept_doc.get("name") if dept_doc else "Unassigned",
        "assigned_staff_id": c.assigned_staff_id,
        "assigned_staff_name": staff_doc.get("full_name") if staff_doc else None,
        "campus": c.campus,
        "building": c.building,
        "room": c.room,
        "location": c.location,
        "resolution_notes": c.resolution_notes,
        "hold_reason": c.hold_reason,
        "attachment_name": c.attachment_name,
        "sla_target_hours": c.sla_target_hours,
        "is_overdue": c.is_overdue,
        "created_at": c.created_at,
        "updated_at": c.updated_at,
        "resolved_at": c.resolved_at,
    }

@router.post("", response_model=ComplaintResponse, status_code=status.HTTP_201_CREATED)
def create_complaint(
    data: ComplaintCreate,
    current_user: User = Depends(get_current_user),
    db: Database = Depends(get_db)
):
    """
    Register a campus complaint / service request in MongoDB (PRD Section 6 FR-02, FR-05, Test T4, T5, T6).
    - Generates unique complaint number (e.g. SCMS-2026-000001).
    - Automatically assigns responsible department based on category mapping.
    - Records history audit trail.
    """
    # 1. Validate Category exists
    cat_doc = db.complaint_categories.find_one({"$or": [{"_id": data.category_id}, {"id": data.category_id}]})
    if not cat_doc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Category '{data.category_id}' does not exist."
        )
    category = ComplaintCategory.from_mongo(cat_doc)

    # 2. Generate unique tracking number (FR-07, Section 11.1)
    complaint_num = generate_complaint_number(db)
    now = datetime.now(timezone.utc)
    location_str = f"{data.building or 'Campus Facility'} - {data.room or 'General Area'}"

    # Default fallback department (Administration)
    admin_dept = db.departments.find_one({"name": {"$regex": "Admin", "$options": "i"}})
    fallback_dept_id = admin_dept.get("id") or str(admin_dept.get("_id")) if admin_dept else category.department_id

    complaint = Complaint(
        complaint_number=complaint_num,
        title=data.title.strip(),
        description=data.description.strip(),
        category_id=category.id,
        priority=data.priority,
        status=ComplaintStatus.NEW,
        created_by=current_user.id,
        assigned_department_id=fallback_dept_id,
        campus=data.campus,
        building=data.building,
        room=data.room,
        location=location_str,
        attachment_name=data.attachment_name,
        sla_target_hours=24,
        is_overdue=False,
        created_at=now,
        updated_at=now
    )

    # 3. Automated Category-to-Department Routing Engine (FR-05)
    route_complaint(db=db, category=category, complaint=complaint, creator=current_user)

    # 4. Save complaint document to MongoDB
    db.complaints.insert_one(complaint.to_mongo())

    return _enrich_complaint_response(complaint, db)

@router.get("", response_model=List[ComplaintResponse])
def get_complaints(
    status_filter: Optional[ComplaintStatus] = Query(None, alias="status"),
    priority_filter: Optional[Priority] = Query(None, alias="priority"),
    department_id: Optional[str] = None,
    category_id: Optional[str] = None,
    search: Optional[str] = None,
    only_overdue: bool = False,
    current_user: User = Depends(get_current_user),
    db: Database = Depends(get_db)
):
    """
    List complaints with filtering and strict Role-Based Access Control (RBAC & IDOR defense).
    """
    filter_criteria = {}

    # Authorization Boundaries (PRD Section 5.1 & Section 10)
    if current_user.role in [Role.STUDENT, Role.FACULTY]:
        filter_criteria["created_by"] = current_user.id
    elif current_user.role == Role.STAFF:
        if current_user.staff_department_id:
            filter_criteria["assigned_department_id"] = current_user.staff_department_id

    if status_filter:
        filter_criteria["status"] = status_filter.value
    if priority_filter:
        filter_criteria["priority"] = priority_filter.value
    if department_id and department_id != "ALL":
        filter_criteria["assigned_department_id"] = department_id
    if category_id:
        filter_criteria["category_id"] = category_id
    if only_overdue:
        filter_criteria["is_overdue"] = True

    if search:
        search_regex = {"$regex": search.strip(), "$options": "i"}
        filter_criteria["$or"] = [
            {"complaint_number": search_regex},
            {"title": search_regex},
            {"description": search_regex},
            {"location": search_regex}
        ]

    docs = db.complaints.find(filter_criteria).sort("created_at", DESCENDING)
    results = []
    for doc in docs:
        c = Complaint.from_mongo(doc)
        if c:
            results.append(_enrich_complaint_response(c, db))

    return results

@router.get("/{complaint_id}", response_model=ComplaintDetailResponse)
def get_complaint_details(
    complaint_id: str,
    current_user: User = Depends(get_current_user),
    db: Database = Depends(get_db)
):
    """Detailed view including audit history timeline and feedback (PRD Section 6 FR-07)."""
    doc = db.complaints.find_one({"$or": [{"_id": complaint_id}, {"id": complaint_id}]})
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Complaint not found.")

    complaint = Complaint.from_mongo(doc)
    verify_complaint_access(complaint, current_user)

    data = _enrich_complaint_response(complaint, db)

    # Format history timeline from MongoDB
    history_docs = db.complaint_history.find({"complaint_id": complaint.id}).sort("created_at", DESCENDING)
    history_entries = []
    for h in history_docs:
        op_doc = db.users.find_one({"$or": [{"_id": h.get("changed_by")}, {"id": h.get("changed_by")}]})
        history_entries.append({
            "id": h.get("id") or str(h.get("_id")),
            "changed_by_name": op_doc.get("full_name") if op_doc else "System",
            "changed_by_role": op_doc.get("role") if op_doc else "SYSTEM",
            "previous_status": h.get("previous_status"),
            "new_status": h.get("new_status"),
            "remarks": h.get("remarks"),
            "created_at": h.get("created_at"),
        })

    data["history"] = history_entries
    
    # Check feedback
    fb_doc = db.feedback.find_one({"complaint_id": complaint.id})
    if fb_doc:
        data["feedback"] = {
            "id": fb_doc.get("id") or str(fb_doc.get("_id")),
            "complaint_id": fb_doc.get("complaint_id"),
            "user_id": fb_doc.get("user_id"),
            "user_name": current_user.full_name,
            "rating": fb_doc.get("rating"),
            "comments": fb_doc.get("comments"),
            "created_at": fb_doc.get("created_at")
        }
    else:
        data["feedback"] = None

    return data

@router.patch("/{complaint_id}/status", response_model=ComplaintResponse)
def update_complaint_status(
    complaint_id: str,
    payload: ComplaintStatusUpdate,
    current_user: User = Depends(get_current_user),
    db: Database = Depends(get_db)
):
    """
    Update complaint lifecycle status in MongoDB (PRD Section 6 FR-06, Test T7, T8, T9).
    - Validates mandatory resolution notes before setting to RESOLVED.
    - Validates mandatory hold reason before setting to ON_HOLD.
    - Generates audit history and in-app notifications.
    """
    doc = db.complaints.find_one({"$or": [{"_id": complaint_id}, {"id": complaint_id}]})
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Complaint not found.")

    complaint = Complaint.from_mongo(doc)
    verify_complaint_access(complaint, current_user)

    updated = transition_complaint_status(
        db=db,
        complaint=complaint,
        new_status=payload.status,
        operator=current_user,
        resolution_notes=payload.resolution_notes,
        hold_reason=payload.hold_reason
    )

    return _enrich_complaint_response(updated, db)

@router.patch("/{complaint_id}/assign", response_model=ComplaintResponse)
def assign_complaint_department(
    complaint_id: str,
    payload: ComplaintAssign,
    current_user: User = Depends(require_admin),
    db: Database = Depends(get_db)
):
    """Administrator manual reassignment of department or staff member (PRD Section 6 FR-05, FR-10)."""
    doc = db.complaints.find_one({"$or": [{"_id": complaint_id}, {"id": complaint_id}]})
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Complaint not found.")

    target_dept = db.departments.find_one({"$or": [{"_id": payload.department_id}, {"id": payload.department_id}]})
    if not target_dept:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Department does not exist.")

    complaint = Complaint.from_mongo(doc)
    now = datetime.now(timezone.utc)
    target_dept_id = target_dept.get("id") or str(target_dept.get("_id"))
    complaint.assigned_department_id = target_dept_id
    complaint.assigned_staff_id = payload.staff_id

    if complaint.status == ComplaintStatus.NEW:
        complaint.status = ComplaintStatus.ASSIGNED

    complaint.updated_at = now

    history = ComplaintHistory(
        complaint_id=complaint.id,
        changed_by=current_user.id,
        previous_status=complaint.status.value,
        new_status=complaint.status.value,
        remarks=f"Reassigned to {target_dept.get('name')} by Administrator {current_user.full_name}.",
        created_at=now
    )
    db.complaint_history.insert_one(history.to_mongo())

    db.complaints.update_one(
        {"$or": [{"_id": complaint.id}, {"id": complaint.id}]},
        {"$set": complaint.to_mongo()}
    )

    return _enrich_complaint_response(complaint, db)

@router.post("/{complaint_id}/attachments", response_model=ComplaintResponse)
async def upload_attachment(
    complaint_id: str,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Database = Depends(get_db)
):
    """
    Upload and associate an attachment (photo, PDF) with a service request (PRD Section 6 FR-14).
    Enforces maximum 5 MB file size and JPEG, PNG, PDF format checks.
    """
    doc = db.complaints.find_one({"$or": [{"_id": complaint_id}, {"id": complaint_id}]})
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Complaint not found.")

    complaint = Complaint.from_mongo(doc)
    verify_complaint_access(complaint, current_user)

    allowed_exts = {".jpg", ".jpeg", ".png", ".pdf"}
    ext = os.path.splitext(file.filename)[1].lower() if file.filename else ""
    if ext not in allowed_exts:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type '{ext}'. Allowed types: JPEG, PNG, PDF."
        )

    content = await file.read()
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File size exceeds the 5 MB limit (PRD FR-14)."
        )

    safe_name = f"{complaint.complaint_number}_{int(datetime.now().timestamp())}_{file.filename}"
    file_path = os.path.join(UPLOAD_DIR, safe_name)
    with open(file_path, "wb") as f:
        f.write(content)

    complaint.attachment_name = file.filename
    complaint.attachment_path = file_path
    complaint.updated_at = datetime.now(timezone.utc)

    db.complaints.update_one(
        {"$or": [{"_id": complaint.id}, {"id": complaint.id}]},
        {"$set": {
            "attachment_name": complaint.attachment_name,
            "attachment_path": complaint.attachment_path,
            "updated_at": complaint.updated_at
        }}
    )

    return _enrich_complaint_response(complaint, db)
