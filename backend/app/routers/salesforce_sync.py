"""
Salesforce Synchronization Control API Router.
Provides endpoints for manual triggering of sync, status inspection, and sync metrics.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pymongo.database import Database
from typing import Dict, Any

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User, Role
from app.integrations.salesforce.sync import get_sync_engine

router = APIRouter(prefix="/salesforce", tags=["Salesforce Synchronization"])

@router.get("/sync/status")
def get_sync_status(
    current_user: User = Depends(get_current_user),
    db: Database = Depends(get_db)
) -> Dict[str, Any]:
    """Get real-time Salesforce synchronization status and MongoDB projection metrics."""
    engine = get_sync_engine()
    cases_in_mongo = db.complaints.count_documents({})
    depts_in_mongo = db.departments.count_documents({})
    cats_in_mongo = db.complaint_categories.count_documents({})
    feedback_in_mongo = db.feedback.count_documents({})

    health = engine.client.health_check()

    return {
        "status": "active",
        "is_syncing": engine.is_syncing,
        "last_sync_time": engine.last_sync_time.isoformat() if engine.last_sync_time else None,
        "salesforce": health,
        "mongo_projection": {
            "cases": cases_in_mongo,
            "departments": depts_in_mongo,
            "categories": cats_in_mongo,
            "feedback": feedback_in_mongo,
        },
        "sync_mode": "continuous_bi_directional"
    }

@router.post("/sync")
def trigger_sync(
    full: bool = Query(False, description="When true, performs full wipe and fresh re-ingestion"),
    current_user: User = Depends(get_current_user),
    db: Database = Depends(get_db)
) -> Dict[str, Any]:
    """
    Trigger on-demand synchronization with Salesforce Service Cloud.
    Requires ADMIN privileges for full wipe and re-sync.
    """
    engine = get_sync_engine()
    
    if full:
        if current_user.role != Role.ADMIN:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Administrator role is required for full Salesforce wipe and re-ingestion."
            )
        return engine.full_wipe_and_sync(db)
    else:
        return engine.delta_sync(db)
