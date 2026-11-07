from typing import List
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from pymongo import ASCENDING
from pymongo.database import Database
from app.core.database import get_db
from app.core.dependencies import get_current_user, require_admin
from app.models.category import ComplaintCategory
from app.models.department import Department
from app.models.user import User
from app.schemas.category import CategoryCreate, CategoryUpdate, CategoryResponse

router = APIRouter(prefix="/categories", tags=["Categories"])

@router.get("", response_model=List[CategoryResponse])
def get_categories(
    include_inactive: bool = False,
    current_user: User = Depends(get_current_user),
    db: Database = Depends(get_db)
):
    """List complaint categories and mapped departments in MongoDB (PRD Section 6 FR-03)."""
    filter_query = {} if include_inactive else {"is_active": True}
    cat_docs = db.complaint_categories.find(filter_query).sort("name", ASCENDING)
    
    results = []
    for doc in cat_docs:
        c = ComplaintCategory.from_mongo(doc)
        if not c:
            continue

        dept_doc = db.departments.find_one({"$or": [{"_id": c.department_id}, {"id": c.department_id}]})
        dept_name = dept_doc.get("name") if dept_doc else "Unassigned"

        res = CategoryResponse(
            id=c.id,
            name=c.name,
            description=c.description,
            department_id=c.department_id,
            department_name=dept_name,
            default_priority=c.default_priority,
            is_active=c.is_active,
            created_at=c.created_at
        )
        results.append(res)

    return results

@router.post("", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
def create_category(
    payload: CategoryCreate,
    current_user: User = Depends(require_admin),
    db: Database = Depends(get_db)
):
    """Administrator create new complaint category and map to department in MongoDB (FR-03, FR-05)."""
    clean_name = payload.name.strip()
    existing = db.complaint_categories.find_one({"name": {"$regex": f"^{clean_name}$", "$options": "i"}})
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Category already exists.")

    dept_doc = db.departments.find_one({"$or": [{"_id": payload.department_id}, {"id": payload.department_id}]})
    if not dept_doc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Mapped Department does not exist.")

    cat = ComplaintCategory(
        name=clean_name,
        description=payload.description,
        department_id=payload.department_id,
        default_priority=payload.default_priority,
        is_active=True,
        created_at=datetime.now(timezone.utc)
    )
    db.complaint_categories.insert_one(cat.to_mongo())

    return CategoryResponse(
        id=cat.id,
        name=cat.name,
        description=cat.description,
        department_id=cat.department_id,
        department_name=dept_doc.get("name", "Unassigned"),
        default_priority=cat.default_priority,
        is_active=cat.is_active,
        created_at=cat.created_at
    )

@router.put("/{cat_id}", response_model=CategoryResponse)
def update_category(
    cat_id: str,
    payload: CategoryUpdate,
    current_user: User = Depends(require_admin),
    db: Database = Depends(get_db)
):
    """Administrator update category details or remap department (FR-03, FR-05)."""
    doc = db.complaint_categories.find_one({"$or": [{"_id": cat_id}, {"id": cat_id}]})
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found.")

    cat = ComplaintCategory.from_mongo(doc)
    update_fields = {}

    if payload.name is not None:
        cat.name = payload.name.strip()
        update_fields["name"] = cat.name
    if payload.description is not None:
        cat.description = payload.description
        update_fields["description"] = cat.description
    if payload.department_id is not None:
        dept_doc = db.departments.find_one({"$or": [{"_id": payload.department_id}, {"id": payload.department_id}]})
        if not dept_doc:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Department does not exist.")
        cat.department_id = payload.department_id
        update_fields["department_id"] = cat.department_id
    if payload.default_priority is not None:
        cat.default_priority = payload.default_priority
        update_fields["default_priority"] = cat.default_priority.value
    if payload.is_active is not None:
        cat.is_active = payload.is_active
        update_fields["is_active"] = cat.is_active

    if update_fields:
        db.complaint_categories.update_one({"$or": [{"_id": cat_id}, {"id": cat_id}]}, {"$set": update_fields})

    dept_doc = db.departments.find_one({"$or": [{"_id": cat.department_id}, {"id": cat.department_id}]})
    dept_name = dept_doc.get("name") if dept_doc else "Unassigned"

    return CategoryResponse(
        id=cat.id,
        name=cat.name,
        description=cat.description,
        department_id=cat.department_id,
        department_name=dept_name,
        default_priority=cat.default_priority,
        is_active=cat.is_active,
        created_at=cat.created_at
    )

@router.delete("/{cat_id}")
def deactivate_category(
    cat_id: str,
    current_user: User = Depends(require_admin),
    db: Database = Depends(get_db)
):
    """Deactivate category (preserves audit integrity)."""
    doc = db.complaint_categories.find_one({"$or": [{"_id": cat_id}, {"id": cat_id}]})
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found.")

    db.complaint_categories.update_one(
        {"$or": [{"_id": cat_id}, {"id": cat_id}]},
        {"$set": {"is_active": False}}
    )
    return {"message": f"Category '{doc.get('name')}' deactivated successfully."}
