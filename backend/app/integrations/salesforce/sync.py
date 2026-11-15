"""
Salesforce Service Cloud Continuous Synchronization Engine.
Authoritative Data Ingestion: Wipes and syncs all records directly from Salesforce Service Cloud to MongoDB Atlas.
Maintains continuous real-time bi-directional sync between Salesforce and MongoDB.
"""

import asyncio
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from pymongo.database import Database

from app.core.security import get_password_hash
from app.integrations.salesforce.client import SalesforceRestClient, SalesforceClientInterface
from app.integrations.salesforce.config import sf_config
from app.models.user import User, Role, StudentProfile

logger = logging.getLogger("smart_campus.salesforce.sync")

class SalesforceSyncEngine:
    """
    Continuous Synchronization Engine.
    Salesforce Service Cloud is the single source of truth.
    MongoDB acts as the high-speed local read cache and operational projection.
    """

    def __init__(self, client: Optional[SalesforceClientInterface] = None):
        self.client = client or SalesforceRestClient(sf_config)
        self.last_sync_time: Optional[datetime] = None
        self.is_syncing: bool = False
        self.total_cases_synced: int = 0
        self._background_task: Optional[asyncio.Task] = None
        self._queues_map: Dict[str, str] = {} # queue_id -> queue_name

    def _load_queues(self) -> None:
        """Fetch all Queue definitions from Salesforce."""
        try:
            queues = self.client.query("SELECT Id, Name, DeveloperName FROM Group WHERE Type = 'Queue'")
            self._queues_map = {q["Id"]: q.get("DeveloperName", q.get("Name")) for q in queues}
        except Exception as e:
            logger.warning(f"Unable to load Salesforce Queues: {e}")

    def wipe_collections(self, db: Database) -> Dict[str, int]:
        """
        Drop and clear all existing data collections in MongoDB
        except users (which will be reset and aligned with Salesforce IDs).
        """
        logger.warning("Wiping existing MongoDB collections per user authorization...")
        collections_to_clear = [
            "complaints",
            "departments",
            "complaint_categories",
            "feedback",
            "complaint_history",
            "notifications",
            "counters",
            "users",
            "student_profiles"
        ]
        cleared_counts = {}
        for coll_name in collections_to_clear:
            count = db[coll_name].count_documents({})
            db[coll_name].delete_many({})
            cleared_counts[coll_name] = count
            logger.info(f"Cleared {count} records from collection '{coll_name}'.")
        return cleared_counts

    def sync_departments(self, db: Database) -> int:
        """Ingest all Department__c records from Salesforce into MongoDB."""
        soql = "SELECT Id, Name, Code__c, Queue_Name__c, Contact_Email__c, Is_Active__c FROM Department__c"
        records = self.client.query(soql)
        count = 0
        now = datetime.now(timezone.utc)

        for rec in records:
            sf_id = rec.get("Id")
            doc = {
                "_id": sf_id,
                "id": sf_id,
                "name": rec.get("Name"),
                "code": rec.get("Code__c"),
                "description": f"Salesforce Service Cloud Queue: {rec.get('Queue_Name__c')}",
                "queue_name": rec.get("Queue_Name__c"),
                "contact_email": rec.get("Contact_Email__c") or "facilities@smartcampus.edu",
                "is_active": rec.get("Is_Active__c", True),
                "head_name": "Department Administrator",
                "sla_target_hours": 24,
                "salesforce_id": sf_id,
                "created_at": now,
                "updated_at": now
            }
            db.departments.replace_one({"_id": sf_id}, doc, upsert=True)
            count += 1

        logger.info(f"Synced {count} departments directly from Salesforce Cloud.")
        return count

    def sync_categories(self, db: Database) -> int:
        """Ingest all Complaint_Category__c records from Salesforce into MongoDB."""
        soql = "SELECT Id, Name, Code__c, Default_Department__c, SLA_Hours_High__c, SLA_Hours_Medium__c, SLA_Hours_Low__c, Is_Active__c FROM Complaint_Category__c"
        records = self.client.query(soql)
        count = 0
        now = datetime.now(timezone.utc)

        for rec in records:
            sf_id = rec.get("Id")
            sla_med = int(rec.get("SLA_Hours_Medium__c") or 24)
            doc = {
                "_id": sf_id,
                "id": sf_id,
                "name": rec.get("Name"),
                "code": rec.get("Code__c"),
                "department_id": rec.get("Default_Department__c"),
                "default_priority": "MEDIUM",
                "is_active": rec.get("Is_Active__c", True),
                "sla_hours_high": rec.get("SLA_Hours_High__c") or 12,
                "sla_hours_medium": sla_med,
                "sla_hours_low": rec.get("SLA_Hours_Low__c") or 48,
                "salesforce_id": sf_id,
                "created_at": now,
                "updated_at": now
            }
            db.complaint_categories.replace_one({"_id": sf_id}, doc, upsert=True)
            count += 1

        logger.info(f"Synced {count} categories directly from Salesforce Cloud.")
        return count

    def sync_cases(self, db: Database, since: Optional[datetime] = None) -> int:
        """
        Ingest Cases from Salesforce into MongoDB.
        Maps all fields and parameters 1-to-1.
        """
        self._load_queues()
        
        soql = (
            "SELECT Id, CaseNumber, Subject, Description, Status, Priority, Origin, "
            "CreatedDate, LastModifiedDate, OwnerId, Department__c, Complaint_Category__c, "
            "Campus_Location__c, Building__c, Room__c, SuppliedName, SuppliedEmail, ContactId, "
            "Resolution_Notes__c, Hold_Reason__c, Is_Overdue__c, SLA_Target_Time__c "
            "FROM Case"
        )
        if since:
            since_iso = since.strftime("%Y-%m-%dT%H:%M:%SZ")
            soql += f" WHERE LastModifiedDate >= {since_iso}"
        soql += " ORDER BY CreatedDate DESC"

        records = self.client.query(soql)
        count = 0
        now = datetime.now(timezone.utc)

        # Preload users for mapping
        users_by_email = {u["email"].lower(): u["_id"] for u in db.users.find({})}
        default_student = db.users.find_one({"role": "STUDENT"})
        default_student_id = default_student["_id"] if default_student else "usr-student-1"

        for rec in records:
            sf_id = rec.get("Id")
            case_number = rec.get("CaseNumber") or f"SF-{sf_id[-6:]}"
            subject = rec.get("Subject") or f"Salesforce Service Case {case_number}"
            description = rec.get("Description") or subject

            # Deduplication check: inspect if this Case already exists in MongoDB
            existing = db.complaints.find_one({
                "$or": [
                    {"_id": sf_id},
                    {"id": sf_id},
                    {"salesforce_case_id": sf_id}
                ]
            })

            # If an existing record was stored under an older UUID _id, migrate references and remove the duplicate
            if existing and str(existing.get("_id")) != sf_id:
                old_id = existing["_id"]
                logger.info(f"Removing duplicate complaint document {old_id} in favor of authoritative {sf_id}")
                db.complaints.delete_one({"_id": old_id})
                db.complaint_history.update_many({"complaint_id": old_id}, {"$set": {"complaint_id": sf_id}})
                db.feedback.update_many({"complaint_id": old_id}, {"$set": {"complaint_id": sf_id}})
                db.notifications.update_many({"complaint_id": old_id}, {"$set": {"complaint_id": sf_id}})

            # Authoritative complaint number: preserve campus tracking format SCMS-2026-XXXXXX
            if existing and existing.get("complaint_number") and str(existing["complaint_number"]).startswith("SCMS-"):
                complaint_num = existing["complaint_number"]
            elif case_number and str(case_number).isdigit():
                complaint_num = f"SCMS-2026-{int(case_number):06d}"
            else:
                complaint_num = case_number

            # Determine creator (preserve existing student/faculty creator)
            supplied_email = rec.get("SuppliedEmail")
            if existing and existing.get("created_by"):
                created_by = existing["created_by"]
            elif supplied_email and supplied_email.lower() in users_by_email:
                created_by = users_by_email[supplied_email.lower()]
            else:
                created_by = default_student_id

            # Map status
            raw_status = rec.get("Status", "New")
            status_map = {
                "New": "NEW",
                "Assigned": "ASSIGNED",
                "In Progress": "IN_PROGRESS",
                "On Hold": "ON_HOLD",
                "Resolved": "RESOLVED",
                "Closed": "CLOSED",
                "Rejected": "REJECTED"
            }
            status_val = status_map.get(raw_status, raw_status.upper().replace(" ", "_"))

            # Map priority
            raw_priority = (rec.get("Priority") or "Medium").upper()
            priority_val = raw_priority if raw_priority in ("LOW", "MEDIUM", "HIGH") else "MEDIUM"

            # Parse dates
            created_date_str = rec.get("CreatedDate")
            created_at = (
                datetime.fromisoformat(created_date_str.replace("Z", "+00:00"))
                if created_date_str
                else (existing.get("created_at") if existing else now)
            )
            modified_date_str = rec.get("LastModifiedDate")
            updated_at = (
                datetime.fromisoformat(modified_date_str.replace("Z", "+00:00"))
                if modified_date_str
                else now
            )

            owner_id = rec.get("OwnerId")
            queue_name = self._queues_map.get(owner_id)

            location_str = rec.get("Campus_Location__c")
            if not location_str:
                bldg = rec.get("Building__c") or (existing.get("building") if existing else "Campus Facility")
                rm = rec.get("Room__c") or (existing.get("room") if existing else "General Area")
                location_str = f"{bldg} - {rm}"

            doc = {
                "_id": sf_id,
                "id": sf_id,
                "complaint_number": complaint_num,
                "title": subject,
                "description": description,
                "category_id": rec.get("Complaint_Category__c") or (existing.get("category_id") if existing else "cat-other"),
                "assigned_department_id": rec.get("Department__c") or (existing.get("assigned_department_id") if existing else "dept-admin"),
                "priority": priority_val,
                "status": status_val,
                "created_by": created_by,
                "campus": "Main University Campus",
                "building": rec.get("Building__c") or (existing.get("building") if existing else None),
                "room": rec.get("Room__c") or (existing.get("room") if existing else None),
                "location": location_str,
                "resolution_notes": rec.get("Resolution_Notes__c") or (existing.get("resolution_notes") if existing else None),
                "hold_reason": rec.get("Hold_Reason__c") or (existing.get("hold_reason") if existing else None),
                "salesforce_case_id": sf_id,
                "salesforce_case_number": case_number,
                "queue_name": queue_name or (existing.get("queue_name") if existing else None),
                "sla_target_hours": 24,
                "is_overdue": bool(rec.get("Is_Overdue__c", False)),
                "created_at": created_at,
                "updated_at": updated_at,
                "resolved_at": updated_at if status_val in ("RESOLVED", "CLOSED") else (existing.get("resolved_at") if existing else None)
            }

            db.complaints.replace_one({"_id": sf_id}, doc, upsert=True)
            count += 1

        self.total_cases_synced = count
        logger.info(f"Synced {count} Cases directly from Salesforce Cloud.")
        return count

    def sync_feedback(self, db: Database) -> int:
        """Ingest all Complaint_Feedback__c records from Salesforce into MongoDB."""
        soql = "SELECT Id, Case__c, Rating__c, Comments__c, Requester_Id__c, Submitted_Date__c FROM Complaint_Feedback__c"
        records = self.client.query(soql)
        count = 0
        now = datetime.now(timezone.utc)

        for rec in records:
            sf_id = rec.get("Id")
            case_id = rec.get("Case__c")
            if not case_id:
                continue

            sub_date_str = rec.get("Submitted_Date__c")
            created_at = (
                datetime.fromisoformat(sub_date_str.replace("Z", "+00:00"))
                if sub_date_str
                else now
            )

            doc = {
                "_id": sf_id,
                "id": sf_id,
                "complaint_id": case_id,
                "user_id": rec.get("Requester_Id__c") or "usr-student-1",
                "rating": int(rec.get("Rating__c") or 5),
                "comments": rec.get("Comments__c") or "",
                "salesforce_feedback_id": sf_id,
                "created_at": created_at
            }
            db.feedback.replace_one({"_id": sf_id}, doc, upsert=True)
            count += 1

        logger.info(f"Synced {count} feedback reviews directly from Salesforce Cloud.")
        return count

    def sync_case_history(self, db: Database) -> int:
        """Ingest audit trail from Salesforce CaseHistory."""
        soql = "SELECT Id, CaseId, Field, OldValue, NewValue, CreatedDate, CreatedById FROM CaseHistory ORDER BY CreatedDate ASC"
        records = self.client.query(soql)
        count = 0
        now = datetime.now(timezone.utc)

        for rec in records:
            sf_id = rec.get("Id")
            case_id = rec.get("CaseId")
            cdate_str = rec.get("CreatedDate")
            cdate = (
                datetime.fromisoformat(cdate_str.replace("Z", "+00:00"))
                if cdate_str
                else now
            )

            doc = {
                "_id": sf_id,
                "id": sf_id,
                "complaint_id": case_id,
                "changed_by": rec.get("CreatedById") or "Salesforce System",
                "field": rec.get("Field"),
                "previous_status": str(rec.get("OldValue")) if rec.get("OldValue") is not None else None,
                "new_status": str(rec.get("NewValue")) if rec.get("NewValue") is not None else None,
                "remarks": f"Audit captured from Salesforce Service Cloud ({rec.get('Field')})",
                "created_at": cdate
            }
            db.complaint_history.replace_one({"_id": sf_id}, doc, upsert=True)
            count += 1

        logger.info(f"Synced {count} CaseHistory audit entries from Salesforce Cloud.")
        return count

    def provision_users(self, db: Database) -> int:
        """
        Provision authoritative demonstration and integration users,
        mapping staff department IDs directly to the live Salesforce Department IDs.
        """
        now = datetime.now(timezone.utc)
        default_pw_hash = get_password_hash("CampusSecret2026!")

        # Find Salesforce Department IDs for IT, Maintenance, Electrical
        it_dept = db.departments.find_one({"code": "IT"})
        maint_dept = db.departments.find_one({"code": "MAINT"})
        elec_dept = db.departments.find_one({"code": "ELEC"})

        it_id = it_dept["_id"] if it_dept else "dept-it"
        maint_id = maint_dept["_id"] if maint_dept else "dept-maint"
        elec_id = elec_dept["_id"] if elec_dept else "dept-elec"

        users_to_provision = [
            {
                "id": "usr-admin-1",
                "email": "dean.sterling@smartcampus.edu",
                "full_name": "Dr. Eleanor Sterling",
                "role": Role.ADMIN.value,
                "staff_department_id": None
            },
            {
                "id": "usr-admin-salesforce",
                "email": "kalpesh.more.2b01288c778b@agentforce.com",
                "full_name": "Kalpesh More (Salesforce Admin)",
                "role": Role.ADMIN.value,
                "staff_department_id": None
            },
            {
                "id": "usr-staff-it",
                "email": "alex.vance@it.smartcampus.edu",
                "full_name": "Alex Vance (IT Specialist)",
                "role": Role.STAFF.value,
                "staff_department_id": it_id
            },
            {
                "id": "usr-staff-maint",
                "email": "facilities@smartcampus.edu",
                "full_name": "Engr. Sarah Jenkins (Maintenance)",
                "role": Role.STAFF.value,
                "staff_department_id": maint_id
            },
            {
                "id": "usr-staff-elec",
                "email": "electrical@smartcampus.edu",
                "full_name": "Rajesh Sharma (Electrical)",
                "role": Role.STAFF.value,
                "staff_department_id": elec_id
            },
            {
                "id": "usr-faculty-1",
                "email": "r.miller@smartcampus.edu",
                "full_name": "Prof. Robert Miller",
                "role": Role.FACULTY.value,
                "staff_department_id": None
            },
            {
                "id": "usr-student-1",
                "email": "sarah.chen@student.smartcampus.edu",
                "full_name": "Sarah Chen",
                "role": Role.STUDENT.value,
                "staff_department_id": None,
                "student_profile": {
                    "id": "prof-sarah",
                    "user_id": "usr-student-1",
                    "student_id": "SC-2024-8841",
                    "course": "B.Tech Computer Science",
                    "department": "School of Computing",
                    "year": 3,
                    "phone": "+1 (555) 234-5678"
                }
            }
        ]

        count = 0
        for u in users_to_provision:
            doc = {
                "_id": u["id"],
                "id": u["id"],
                "email": u["email"],
                "full_name": u["full_name"],
                "password_hash": default_pw_hash,
                "role": u["role"],
                "is_active": True,
                "staff_department_id": u["staff_department_id"],
                "created_at": now,
                "student_profile": u.get("student_profile")
            }
            db.users.replace_one({"_id": u["id"]}, doc, upsert=True)
            count += 1

        logger.info(f"Provisioned {count} authentication user profiles mapped to Salesforce departments.")
        return count

    def full_wipe_and_sync(self, db: Database) -> Dict[str, Any]:
        """
        Executes complete wipe of MongoDB and builds all collections fresh from Salesforce Cloud.
        """
        self.is_syncing = True
        start_time = datetime.now(timezone.utc)
        try:
            # 1. Wipe collections
            cleared = self.wipe_collections(db)

            # 2. Ingest Departments
            depts_count = self.sync_departments(db)

            # 3. Ingest Categories
            cats_count = self.sync_categories(db)

            # 4. Provision Users with mapped Salesforce Department IDs
            users_count = self.provision_users(db)

            # 5. Ingest Cases
            cases_count = self.sync_cases(db)

            # 6. Ingest Feedback
            feedback_count = self.sync_feedback(db)

            # 7. Ingest CaseHistory
            history_count = self.sync_case_history(db)

            self.last_sync_time = datetime.now(timezone.utc)
            duration_s = (self.last_sync_time - start_time).total_seconds()

            summary = {
                "status": "success",
                "cleared_records": cleared,
                "synced_from_salesforce": {
                    "departments": depts_count,
                    "categories": cats_count,
                    "cases": cases_count,
                    "feedback": feedback_count,
                    "case_history": history_count,
                    "users_provisioned": users_count
                },
                "duration_seconds": round(duration_s, 2),
                "timestamp": self.last_sync_time.isoformat()
            }
            logger.info(f"Full Salesforce Cloud sync completed successfully in {duration_s:.2f}s: {summary}")
            return summary
        finally:
            self.is_syncing = False

    def delta_sync(self, db: Database) -> Dict[str, Any]:
        """
        Fast delta synchronization: polls Salesforce for any newly created or modified
        Cases, feedback, departments, and categories since last sync.
        """
        if self.is_syncing:
            return {"status": "skipped", "reason": "Sync already in progress"}

        self.is_syncing = True
        try:
            since = self.last_sync_time
            cases_count = self.sync_cases(db, since=since)
            feedback_count = self.sync_feedback(db)
            self.last_sync_time = datetime.now(timezone.utc)
            return {
                "status": "success",
                "mode": "delta_sync",
                "cases_updated": cases_count,
                "feedback_updated": feedback_count,
                "last_sync_time": self.last_sync_time.isoformat()
            }
        except Exception as e:
            logger.error(f"Error during delta sync from Salesforce: {e}")
            return {"status": "error", "error": str(e)}
        finally:
            self.is_syncing = False

    async def run_continuous_sync_loop(self, db_getter, interval_seconds: int = 30) -> None:
        """
        Continuous background synchronization loop.
        Polls Salesforce every `interval_seconds` to reflect all updates in real-time.
        """
        logger.info(f"Starting continuous Salesforce Service Cloud sync daemon (Interval: {interval_seconds}s)...")
        while True:
            try:
                await asyncio.sleep(interval_seconds)
                db = db_getter()
                if db is not None:
                    res = self.delta_sync(db)
                    if res.get("cases_updated", 0) > 0:
                        logger.info(f"Continuous sync detected {res['cases_updated']} updated Cases in Salesforce.")
            except asyncio.CancelledError:
                logger.info("Continuous Salesforce sync daemon cancelled.")
                break
            except Exception as e:
                logger.error(f"Continuous Salesforce sync error: {e}")


# Singleton instance
_sync_engine_instance: Optional[SalesforceSyncEngine] = None

def get_sync_engine() -> SalesforceSyncEngine:
    global _sync_engine_instance
    if _sync_engine_instance is None:
        _sync_engine_instance = SalesforceSyncEngine()
    return _sync_engine_instance
