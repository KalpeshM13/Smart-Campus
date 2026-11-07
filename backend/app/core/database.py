import logging
from typing import Generator, Any, Dict, List
import certifi
from pymongo import MongoClient, ASCENDING, DESCENDING
from pymongo.database import Database
from pymongo.errors import OperationFailure, ConfigurationError
from app.core.config import settings

logger = logging.getLogger("smart_campus.database")

_mongo_client: MongoClient | None = None

def get_client() -> MongoClient:
    """Singleton MongoDB Client instance with connection pooling and TLS certificates."""
    global _mongo_client
    if _mongo_client is None:
        logger.info(f"Connecting to MongoDB at {settings.MONGODB_URI.split('@')[-1]} (DB: {settings.MONGODB_DB_NAME})")
        client_kwargs: Dict[str, Any] = {
            "serverSelectionTimeoutMS": 5000,
            "connectTimeoutMS": 5000,
            "socketTimeoutMS": 10000,
            "maxPoolSize": 50,
            "minPoolSize": 5,
            "retryWrites": True,
        }
        if "mongodb+srv://" in settings.MONGODB_URI or "ssl=true" in settings.MONGODB_URI.lower() or "tls=true" in settings.MONGODB_URI.lower():
            client_kwargs["tlsCAFile"] = certifi.where()

        _mongo_client = MongoClient(settings.MONGODB_URI, **client_kwargs)
    return _mongo_client

def get_database() -> Database:
    """Return configured MongoDB Database instance."""
    client = get_client()
    return client[settings.MONGODB_DB_NAME]

def get_db() -> Generator[Database, None, None]:
    """FastAPI database dependency yielding active PyMongo database."""
    db = get_database()
    yield db

def init_mongodb_indexes(db: Database) -> None:
    """
    Ensure all unique, compound, and single-field indexes are created (PRD Section 8.3 & Performance Audit).
    Safe and idempotent: pymongo create_index ignores existing identical indexes.
    """
    try:
        # 1. Users collection
        db.users.create_index([("email", ASCENDING)], unique=True, name="idx_users_email_unique")
        db.users.create_index([("role", ASCENDING)], name="idx_users_role")
        db.users.create_index([("staff_department_id", ASCENDING)], name="idx_users_staff_department")

        # 2. Student Profiles
        db.student_profiles.create_index([("user_id", ASCENDING)], unique=True, name="idx_student_profiles_user_id_unique")
        db.student_profiles.create_index([("student_id", ASCENDING)], unique=True, name="idx_student_profiles_student_id_unique")

        # 3. Departments
        db.departments.create_index([("name", ASCENDING)], unique=True, name="idx_departments_name_unique")
        db.departments.create_index([("is_active", ASCENDING)], name="idx_departments_active")

        # 4. Complaint Categories
        db.complaint_categories.create_index([("name", ASCENDING)], unique=True, name="idx_categories_name_unique")
        db.complaint_categories.create_index([("department_id", ASCENDING)], name="idx_categories_department")
        db.complaint_categories.create_index([("is_active", ASCENDING)], name="idx_categories_active")

        # 5. Complaints collection (Primary high-traffic indexes)
        db.complaints.create_index([("complaint_number", ASCENDING)], unique=True, name="idx_complaints_number_unique")
        db.complaints.create_index([("status", ASCENDING)], name="idx_complaints_status")
        db.complaints.create_index([("created_by", ASCENDING), ("created_at", DESCENDING)], name="idx_complaints_created_by_time")
        db.complaints.create_index([("assigned_department_id", ASCENDING), ("status", ASCENDING)], name="idx_complaints_dept_status")
        db.complaints.create_index([("is_overdue", ASCENDING)], name="idx_complaints_overdue")
        db.complaints.create_index([("created_at", DESCENDING)], name="idx_complaints_created_at_desc")

        # 6. Complaint History
        db.complaint_history.create_index([("complaint_id", ASCENDING), ("created_at", DESCENDING)], name="idx_history_complaint_time")

        # 7. Feedback (CSAT ratings)
        db.feedback.create_index([("complaint_id", ASCENDING)], unique=True, name="idx_feedback_complaint_unique")
        db.feedback.create_index([("user_id", ASCENDING)], name="idx_feedback_user")

        # 8. Notifications
        db.notifications.create_index([("user_id", ASCENDING), ("is_read", ASCENDING)], name="idx_notifications_user_read")
        db.notifications.create_index([("created_at", DESCENDING)], name="idx_notifications_created_at")

        logger.info("Successfully verified and provisioned all MongoDB collections and indexes.")
    except Exception as e:
        logger.warning(f"Note on MongoDB index initialization: {e}")

def clean_doc(doc: Dict[str, Any] | None) -> Dict[str, Any] | None:
    """Helper to convert MongoDB BSON document to clean JSON-serializable dictionary."""
    if doc is None:
        return None
    res = dict(doc)
    if "_id" in res:
        res["id"] = str(res["_id"])
        # Retain _id or remove it for clean Pydantic compatibility
        del res["_id"]
    return res

def clean_docs(docs: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Helper to convert list of MongoDB BSON documents."""
    return [clean_doc(d) for d in docs if d is not None]
