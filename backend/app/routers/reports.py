import io
import csv
from typing import Optional
from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from pymongo import DESCENDING
from pymongo.database import Database
from app.core.database import get_db
from app.core.dependencies import require_admin
from app.models.complaint import Complaint, ComplaintStatus, Priority
from app.models.user import User

router = APIRouter(prefix="/reports", tags=["Reports & Analytics"])

@router.get("/complaints")
def get_complaints_report(
    status_filter: Optional[ComplaintStatus] = Query(None, alias="status"),
    priority_filter: Optional[Priority] = Query(None, alias="priority"),
    department_id: Optional[str] = None,
    category_id: Optional[str] = None,
    current_user: User = Depends(require_admin),
    db: Database = Depends(get_db)
):
    """Filtered complaints audit report for administrators in MongoDB (PRD Section 6 FR-12)."""
    filter_criteria = {}
    if status_filter:
        filter_criteria["status"] = status_filter.value
    if priority_filter:
        filter_criteria["priority"] = priority_filter.value
    if department_id and department_id != "ALL":
        filter_criteria["assigned_department_id"] = department_id
    if category_id:
        filter_criteria["category_id"] = category_id

    docs = db.complaints.find(filter_criteria).sort("created_at", DESCENDING)
    
    report_items = []
    for doc in docs:
        c = Complaint.from_mongo(doc)
        if not c:
            continue

        cat_doc = db.complaint_categories.find_one({"$or": [{"_id": c.category_id}, {"id": c.category_id}]})
        dept_doc = db.departments.find_one({"$or": [{"_id": c.assigned_department_id}, {"id": c.assigned_department_id}]})
        creator_doc = db.users.find_one({"$or": [{"_id": c.created_by}, {"id": c.created_by}]})

        report_items.append({
            "complaint_number": c.complaint_number,
            "title": c.title,
            "category": cat_doc.get("name") if cat_doc else "General",
            "department": dept_doc.get("name") if dept_doc else "Unassigned",
            "priority": c.priority.value,
            "status": c.status.value,
            "created_by": creator_doc.get("full_name") if creator_doc else "Unknown",
            "location": c.location,
            "sla_target_hours": c.sla_target_hours,
            "is_overdue": c.is_overdue,
            "created_at": c.created_at.isoformat(),
            "resolved_at": c.resolved_at.isoformat() if c.resolved_at else None,
        })
        
    return {"total": len(report_items), "records": report_items}

@router.get("/export")
def export_complaints_csv(
    status_filter: Optional[ComplaintStatus] = Query(None, alias="status"),
    priority_filter: Optional[Priority] = Query(None, alias="priority"),
    department_id: Optional[str] = None,
    category_id: Optional[str] = None,
    current_user: User = Depends(require_admin),
    db: Database = Depends(get_db)
):
    """
    Export filtered reports to CSV format from MongoDB (PRD Section 6 FR-12, Test T15).
    """
    filter_criteria = {}
    if status_filter:
        filter_criteria["status"] = status_filter.value
    if priority_filter:
        filter_criteria["priority"] = priority_filter.value
    if department_id and department_id != "ALL":
        filter_criteria["assigned_department_id"] = department_id
    if category_id:
        filter_criteria["category_id"] = category_id

    docs = db.complaints.find(filter_criteria).sort("created_at", DESCENDING)

    output = io.StringIO()
    writer = csv.writer(output)

    # Header Row
    writer.writerow([
        "Complaint Number",
        "Title",
        "Category",
        "Priority",
        "Status",
        "Created By",
        "Assigned Department",
        "Location",
        "SLA Target (Hours)",
        "Overdue",
        "Created At",
        "Resolved At",
        "Resolution Notes"
    ])

    for doc in docs:
        c = Complaint.from_mongo(doc)
        if not c:
            continue

        cat_doc = db.complaint_categories.find_one({"$or": [{"_id": c.category_id}, {"id": c.category_id}]})
        dept_doc = db.departments.find_one({"$or": [{"_id": c.assigned_department_id}, {"id": c.assigned_department_id}]})
        creator_doc = db.users.find_one({"$or": [{"_id": c.created_by}, {"id": c.created_by}]})

        writer.writerow([
            c.complaint_number,
            c.title,
            cat_doc.get("name") if cat_doc else "General",
            c.priority.value,
            c.status.value,
            creator_doc.get("full_name") if creator_doc else "Unknown",
            dept_doc.get("name") if dept_doc else "Unassigned",
            c.location,
            c.sla_target_hours,
            "YES" if c.is_overdue else "NO",
            c.created_at.isoformat(),
            c.resolved_at.isoformat() if c.resolved_at else "",
            c.resolution_notes or ""
        ])

    output.seek(0)
    response = StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv"
    )
    response.headers["Content-Disposition"] = "attachment; filename=Smart_Campus_Complaints_Audit.csv"
    return response
