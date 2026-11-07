from typing import List
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from pymongo import ASCENDING
from pymongo.database import Database
from app.core.database import get_db
from app.core.dependencies import get_current_user, require_admin
from app.models.department import Department
from app.models.complaint import ComplaintStatus
from app.models.user import User
from app.schemas.department import DepartmentCreate, DepartmentUpdate, DepartmentResponse

router = APIRouter(prefix="/departments", tags=["Departments"])

@router.get("", response_model=List[DepartmentResponse])
def get_departments(
    include_inactive: bool = False,
    current_user: User = Depends(get_current_user),
    db: Database = Depends(get_db)
):
    """List campus departments with live open complaints count in MongoDB (PRD Section 6 FR-10)."""
    filter_query = {} if include_inactive else {"is_active": True}
    dept_docs = db.departments.find(filter_query).sort("name", ASCENDING)
    
    results = []
    closed_statuses = [ComplaintStatus.RESOLVED.value, ComplaintStatus.CLOSED.value, ComplaintStatus.REJECTED.value]

    for doc in dept_docs:
        d = Department.from_mongo(doc)
        if not d:
            continue

        open_count = db.complaints.count_documents({
            "assigned_department_id": d.id,
            "status": {"$nin": closed_statuses}
        })

        res = DepartmentResponse.model_validate(d)
        res.open_complaints_count = open_count
        results.append(res)
        
    return results

@router.post("", response_model=DepartmentResponse, status_code=status.HTTP_201_CREATED)
def create_department(
    payload: DepartmentCreate,
    current_user: User = Depends(require_admin),
    db: Database = Depends(get_db)
):
    """Administrator create new operational department (FR-10)."""
    clean_name = payload.name.strip()
    existing = db.departments.find_one({"name": {"$regex": f"^{clean_name}$", "$options": "i"}})
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Department with this name already exists.")

    dept = Department(
        name=clean_name,
        description=payload.description,
        contact_email=payload.contact_email,
        head_name=payload.head_name,
        sla_target_hours=payload.sla_target_hours,
        is_active=True,
        created_at=datetime.now(timezone.utc)
    )
    db.departments.insert_one(dept.to_mongo())
    return dept

@router.put("/{dept_id}", response_model=DepartmentResponse)
def update_department(
    dept_id: str,
    payload: DepartmentUpdate,
    current_user: User = Depends(require_admin),
    db: Database = Depends(get_db)
):
    """Administrator update department configuration in MongoDB (FR-10)."""
    doc = db.departments.find_one({"$or": [{"_id": dept_id}, {"id": dept_id}]})
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Department not found.")

    dept = Department.from_mongo(doc)
    update_fields = {}

    if payload.name is not None:
        dept.name = payload.name.strip()
        update_fields["name"] = dept.name
    if payload.description is not None:
        dept.description = payload.description
        update_fields["description"] = dept.description
    if payload.contact_email is not None:
        dept.contact_email = payload.contact_email
        update_fields["contact_email"] = dept.contact_email
    if payload.head_name is not None:
        dept.head_name = payload.head_name
        update_fields["head_name"] = dept.head_name
    if payload.sla_target_hours is not None:
        dept.sla_target_hours = payload.sla_target_hours
        update_fields["sla_target_hours"] = dept.sla_target_hours
    if payload.is_active is not None:
        dept.is_active = payload.is_active
        update_fields["is_active"] = dept.is_active

    if update_fields:
        db.departments.update_one({"$or": [{"_id": dept_id}, {"id": dept_id}]}, {"$set": update_fields})

    return dept

@router.delete("/{dept_id}")
def deactivate_department(
    dept_id: str,
    current_user: User = Depends(require_admin),
    db: Database = Depends(get_db)
):
    """
    Deactivate department (PRD Section 6 FR-10: Deactivation preferred over deletion to preserve complaint history).
    """
    doc = db.departments.find_one({"$or": [{"_id": dept_id}, {"id": dept_id}]})
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Department not found.")

    db.departments.update_one(
        {"$or": [{"_id": dept_id}, {"id": dept_id}]},
        {"$set": {"is_active": False}}
    )
    return {"message": f"Department '{doc.get('name')}' successfully deactivated. Historical records preserved."}
