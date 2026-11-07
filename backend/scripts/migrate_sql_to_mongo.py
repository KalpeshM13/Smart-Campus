"""
Idempotent SQL to MongoDB Atlas Data Migration Script
Smart Campus Service Management System

Safely and idempotently transfers all data from PostgreSQL / SQLite to MongoDB Atlas.
- Preserves all unique IDs, relationships, and foreign keys.
- Preserves ISO 8601 timestamps and null values.
- Never deletes or modifies the source SQL database (Rollback safety).
- Automatically initializes MongoDB unique and compound indexes.
- Synchronizes atomic complaint counters.
"""

import os
import sys
import logging
from datetime import datetime, timezone
from typing import Any, Dict

# Ensure app modules can be imported
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy import create_engine, text
from pymongo import MongoClient
from app.core.config import settings
from app.core.database import init_mongodb_indexes

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("migration")

def parse_iso_datetime(val: Any) -> datetime | None:
    if val is None:
        return None
    if isinstance(val, datetime):
        return val.replace(tzinfo=timezone.utc) if val.tzinfo is None else val
    if isinstance(val, str):
        try:
            return datetime.fromisoformat(val.replace("Z", "+00:00"))
        except Exception:
            return None
    return None

def safe_upsert(collection, query_filter: dict, doc: dict) -> None:
    """
    Safely insert or update document in MongoDB without violating unique indexes
    or modifying immutable _id keys.
    """
    existing = collection.find_one(query_filter)
    if existing:
        update_data = {k: v for k, v in doc.items() if k != "_id"}
        collection.update_one({"_id": existing["_id"]}, {"$set": update_data})
    else:
        collection.insert_one(doc)

def migrate_data():
    sql_url = settings.DATABASE_URL
    mongo_uri = settings.MONGODB_URI
    db_name = settings.MONGODB_DB_NAME

    logger.info(f"--- Starting Migration: SQL -> MongoDB Atlas ---")
    logger.info(f"Source Database: {sql_url.split('@')[-1] if '@' in sql_url else sql_url}")
    logger.info(f"Target Database: {mongo_uri.split('@')[-1] if '@' in mongo_uri else mongo_uri} (DB: {db_name})")

    # Connect to SQL
    try:
        connect_args = {"check_same_thread": False} if sql_url.startswith("sqlite") else {}
        sql_engine = create_engine(sql_url, connect_args=connect_args)
        sql_conn = sql_engine.connect()
        logger.info("Connected to source SQL database successfully.")
    except Exception as e:
        logger.error(f"Failed to connect to source SQL database: {e}")
        return False

    # Connect to MongoDB
    try:
        mongo_client = MongoClient(mongo_uri, serverSelectionTimeoutMS=5000)
        mongo_db = mongo_client[db_name]
        mongo_client.server_info()
        logger.info("Connected to target MongoDB instance successfully.")
    except Exception as e:
        logger.error(f"Failed to connect to target MongoDB Atlas database: {e}")
        sql_conn.close()
        return False

    # Initialize Indexes in MongoDB
    init_mongodb_indexes(mongo_db)

    stats = {
        "departments": 0,
        "complaint_categories": 0,
        "users": 0,
        "student_profiles": 0,
        "complaints": 0,
        "complaint_history": 0,
        "feedback": 0,
        "notifications": 0,
    }

    try:
        # 1. Departments
        logger.info("Migrating departments...")
        depts = sql_conn.execute(text("SELECT * FROM departments")).mappings().all()
        for row in depts:
            doc = {
                "_id": row["id"],
                "id": row["id"],
                "name": row["name"],
                "description": row.get("description"),
                "contact_email": row["contact_email"],
                "is_active": bool(row["is_active"]),
                "head_name": row.get("head_name"),
                "sla_target_hours": int(row.get("sla_target_hours") or 24),
                "created_at": parse_iso_datetime(row.get("created_at")) or datetime.now(timezone.utc)
            }
            safe_upsert(mongo_db.departments, {"$or": [{"_id": doc["_id"]}, {"name": doc["name"]}]}, doc)
            stats["departments"] += 1

        # 2. Complaint Categories
        logger.info("Migrating complaint categories...")
        cats = sql_conn.execute(text("SELECT * FROM complaint_categories")).mappings().all()
        for row in cats:
            doc = {
                "_id": row["id"],
                "id": row["id"],
                "name": row["name"],
                "description": row.get("description"),
                "department_id": row["department_id"],
                "is_active": bool(row["is_active"]),
                "default_priority": str(row.get("default_priority") or "MEDIUM"),
                "created_at": parse_iso_datetime(row.get("created_at")) or datetime.now(timezone.utc)
            }
            safe_upsert(mongo_db.complaint_categories, {"$or": [{"_id": doc["_id"]}, {"name": doc["name"]}]}, doc)
            stats["complaint_categories"] += 1

        # 3. Users
        logger.info("Migrating users...")
        users = sql_conn.execute(text("SELECT * FROM users")).mappings().all()
        for row in users:
            doc = {
                "_id": row["id"],
                "id": row["id"],
                "full_name": row["full_name"],
                "email": row["email"].lower(),
                "password_hash": row["password_hash"],
                "role": str(row["role"]),
                "is_active": bool(row["is_active"]),
                "staff_department_id": row.get("staff_department_id"),
                "created_at": parse_iso_datetime(row.get("created_at")) or datetime.now(timezone.utc)
            }
            safe_upsert(mongo_db.users, {"$or": [{"_id": doc["_id"]}, {"email": doc["email"]}]}, doc)
            stats["users"] += 1

        # 4. Student Profiles
        logger.info("Migrating student profiles...")
        profiles = sql_conn.execute(text("SELECT * FROM student_profiles")).mappings().all()
        for row in profiles:
            doc = {
                "_id": row["id"],
                "id": row["id"],
                "user_id": row["user_id"],
                "student_id": row["student_id"],
                "course": row.get("course"),
                "department": row.get("department"),
                "year": int(row["year"]) if row.get("year") else None,
                "phone": row.get("phone")
            }
            safe_upsert(
                mongo_db.student_profiles,
                {"$or": [{"_id": doc["_id"]}, {"user_id": doc["user_id"]}, {"student_id": doc["student_id"]}]},
                doc
            )
            # Also embed into user document for fast retrieval
            mongo_db.users.update_one(
                {"$or": [{"_id": doc["user_id"]}, {"id": doc["user_id"]}]},
                {"$set": {"student_profile": doc}}
            )
            stats["student_profiles"] += 1

        # 5. Complaints
        logger.info("Migrating complaints...")
        complaints = sql_conn.execute(text("SELECT * FROM complaints")).mappings().all()
        max_seq = 0
        for row in complaints:
            c_num = row["complaint_number"]
            # Extract number from SCMS-2026-XXXXXX
            if c_num and "SCMS-2026-" in c_num:
                try:
                    num_part = int(c_num.split("SCMS-2026-")[-1])
                    if num_part > max_seq:
                        max_seq = num_part
                except Exception:
                    pass

            doc = {
                "_id": row["id"],
                "id": row["id"],
                "complaint_number": row["complaint_number"],
                "title": row["title"],
                "description": row["description"],
                "category_id": row["category_id"],
                "priority": str(row["priority"]),
                "status": str(row["status"]),
                "created_by": row["created_by"],
                "assigned_department_id": row["assigned_department_id"],
                "assigned_staff_id": row.get("assigned_staff_id"),
                "campus": row.get("campus") or "Main University Campus",
                "building": row.get("building"),
                "room": row.get("room"),
                "location": row["location"],
                "resolution_notes": row.get("resolution_notes"),
                "hold_reason": row.get("hold_reason"),
                "attachment_name": row.get("attachment_name"),
                "attachment_path": row.get("attachment_path"),
                "sla_target_hours": int(row.get("sla_target_hours") or 24),
                "is_overdue": bool(row["is_overdue"]),
                "created_at": parse_iso_datetime(row.get("created_at")) or datetime.now(timezone.utc),
                "updated_at": parse_iso_datetime(row.get("updated_at")) or datetime.now(timezone.utc),
                "resolved_at": parse_iso_datetime(row.get("resolved_at"))
            }
            safe_upsert(mongo_db.complaints, {"$or": [{"_id": doc["_id"]}, {"complaint_number": doc["complaint_number"]}]}, doc)
            stats["complaints"] += 1

        # Sync atomic counter
        if max_seq > 0:
            mongo_db.counters.update_one(
                {"_id": "complaint_number"},
                {"$set": {"seq": max_seq}},
                upsert=True
            )
            logger.info(f"Synchronized complaint number counter at sequence {max_seq}.")

        # 6. Complaint History
        logger.info("Migrating complaint history...")
        histories = sql_conn.execute(text("SELECT * FROM complaint_history")).mappings().all()
        for row in histories:
            doc = {
                "_id": row["id"],
                "id": row["id"],
                "complaint_id": row["complaint_id"],
                "changed_by": row["changed_by"],
                "previous_status": row["previous_status"],
                "new_status": row["new_status"],
                "remarks": row["remarks"],
                "created_at": parse_iso_datetime(row.get("created_at")) or datetime.now(timezone.utc)
            }
            safe_upsert(mongo_db.complaint_history, {"_id": doc["_id"]}, doc)
            stats["complaint_history"] += 1

        # 7. Feedback
        logger.info("Migrating feedback...")
        feedbacks = sql_conn.execute(text("SELECT * FROM feedback")).mappings().all()
        for row in feedbacks:
            doc = {
                "_id": row["id"],
                "id": row["id"],
                "complaint_id": row["complaint_id"],
                "user_id": row["user_id"],
                "rating": int(row["rating"]),
                "comments": row.get("comments"),
                "created_at": parse_iso_datetime(row.get("created_at")) or datetime.now(timezone.utc)
            }
            safe_upsert(mongo_db.feedback, {"$or": [{"_id": doc["_id"]}, {"complaint_id": doc["complaint_id"]}]}, doc)
            stats["feedback"] += 1

        # 8. Notifications
        logger.info("Migrating notifications...")
        notifications = sql_conn.execute(text("SELECT * FROM notifications")).mappings().all()
        for row in notifications:
            doc = {
                "_id": row["id"],
                "id": row["id"],
                "user_id": row["user_id"],
                "title": row["title"],
                "message": row["message"],
                "is_read": bool(row["is_read"]),
                "complaint_id": row.get("complaint_id"),
                "type": str(row.get("type") or "STATUS_CHANGE"),
                "created_at": parse_iso_datetime(row.get("created_at")) or datetime.now(timezone.utc)
            }
            safe_upsert(mongo_db.notifications, {"_id": doc["_id"]}, doc)
            stats["notifications"] += 1

        logger.info("=" * 60)
        logger.info("MIGRATION COMPLETED SUCCESSFULLY!")
        logger.info("=" * 60)
        for collection_name, count in stats.items():
            logger.info(f"  * {collection_name.ljust(22)}: {count} documents migrated/upserted")
        logger.info("=" * 60)
        logger.info("Source database untouched. Complete rollback capability intact.")
        return True

    except Exception as e:
        logger.error(f"Migration error occurred: {e}", exc_info=True)
        return False
    finally:
        sql_conn.close()
        mongo_client.close()

if __name__ == "__main__":
    success = migrate_data()
    sys.exit(0 if success else 1)
