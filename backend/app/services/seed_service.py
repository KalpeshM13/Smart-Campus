from datetime import datetime, timezone, timedelta
from pymongo.database import Database
from app.models.department import Department
from app.models.category import ComplaintCategory, DefaultPriority
from app.models.user import User, StudentProfile, Role
from app.models.complaint import Complaint, ComplaintStatus, Priority
from app.models.history import ComplaintHistory
from app.models.feedback import Feedback
from app.models.notification import Notification, NotificationType
from app.core.security import get_password_hash

def seed_database_defaults(db: Database) -> None:
    """
    Idempotent seeding of default departments, category mappings, demo accounts,
    and realistic sample complaints into MongoDB Atlas (PRD Section 18).
    Does not overwrite existing records.
    """
    now = datetime.now(timezone.utc)

    # 1. Departments (PRD Section 6 FR-05)
    departments_data = [
        {"id": "dept-it", "name": "IT Department", "desc": "Campus network, Wi-Fi, lab workstations.", "email": "it-support@smartcampus.edu", "head": "Dr. Arthur Pendelton", "sla": 24},
        {"id": "dept-maint", "name": "Maintenance Department", "desc": "Civil infrastructure, plumbing, classroom projectors.", "email": "facilities@smartcampus.edu", "head": "Engr. Sarah Jenkins", "sla": 72},
        {"id": "dept-elec", "name": "Electrical Department", "desc": "High voltage grids, lab outlets, campus lighting.", "email": "electrical@smartcampus.edu", "head": "Rajesh Sharma", "sla": 24},
        {"id": "dept-lab", "name": "Laboratory Department", "desc": "Specialized scientific instruments, fume hoods.", "email": "lab-ops@smartcampus.edu", "head": "Dr. Michael Chen", "sla": 48},
        {"id": "dept-house", "name": "Housekeeping Department", "desc": "Sanitation, hygiene maintenance, waste handling.", "email": "sanitation@smartcampus.edu", "head": "Maria Rodriguez", "sla": 24},
        {"id": "dept-sec", "name": "Security Department", "desc": "Campus access control, biometric gates, CCTV.", "email": "security-hq@smartcampus.edu", "head": "Capt. David Vance", "sla": 12},
        {"id": "dept-admin", "name": "Administration Department", "desc": "General campus governance, student affairs.", "email": "admin-office@smartcampus.edu", "head": "Elena Rostova", "sla": 120},
    ]

    for d in departments_data:
        existing = db.departments.find_one({"$or": [{"_id": d["id"]}, {"id": d["id"]}, {"name": d["name"]}]})
        if not existing:
            dept = Department(
                id=d["id"],
                name=d["name"],
                description=d["desc"],
                contact_email=d["email"],
                head_name=d["head"],
                sla_target_hours=d["sla"],
                is_active=True,
                created_at=now
            )
            db.departments.insert_one(dept.to_mongo())

    # 2. Categories mapped to Departments (PRD Section 6 FR-03, FR-05)
    categories_data = [
        {"id": "cat-wifi", "name": "Internet / Wi-Fi", "dept_id": "dept-it", "prio": DefaultPriority.HIGH, "desc": "Wi-Fi dropping, access points, network connectivity."},
        {"id": "cat-infra", "name": "Infrastructure", "dept_id": "dept-maint", "prio": DefaultPriority.MEDIUM, "desc": "Structural repairs, walls, ceilings, windows, doors."},
        {"id": "cat-elec", "name": "Electrical", "dept_id": "dept-elec", "prio": DefaultPriority.HIGH, "desc": "Power outages, tripped circuit breakers, sparking sockets."},
        {"id": "cat-class", "name": "Classroom Equipment", "dept_id": "dept-maint", "prio": DefaultPriority.MEDIUM, "desc": "Smartboards, projectors, audio-visual mics."},
        {"id": "cat-lab", "name": "Laboratory Equipment", "dept_id": "dept-lab", "prio": DefaultPriority.HIGH, "desc": "Oscilloscopes, fume hoods, analytical instruments."},
        {"id": "cat-plumb", "name": "Plumbing", "dept_id": "dept-maint", "prio": DefaultPriority.HIGH, "desc": "Water leaks, washroom clogs, damaged pipe fittings."},
        {"id": "cat-sanit", "name": "Sanitation", "dept_id": "dept-house", "prio": DefaultPriority.LOW, "desc": "Waste disposal, cleaning, consumable refills."},
        {"id": "cat-furn", "name": "Furniture", "dept_id": "dept-maint", "prio": DefaultPriority.LOW, "desc": "Broken chairs, student desks, classroom tables."},
        {"id": "cat-sec", "name": "Security", "dept_id": "dept-sec", "prio": DefaultPriority.HIGH, "desc": "Biometric gates, RFID access cards, surveillance."},
        {"id": "cat-other", "name": "Other", "dept_id": "dept-admin", "prio": DefaultPriority.LOW, "desc": "General campus services and administrative requests."},
    ]

    for c in categories_data:
        existing = db.complaint_categories.find_one({"$or": [{"_id": c["id"]}, {"id": c["id"]}, {"name": c["name"]}]})
        if not existing:
            cat = ComplaintCategory(
                id=c["id"],
                name=c["name"],
                description=c["desc"],
                department_id=c["dept_id"],
                default_priority=c["prio"],
                is_active=True,
                created_at=now
            )
            db.complaint_categories.insert_one(cat.to_mongo())

    # 3. Demonstration Users (PRD Section 18)
    default_pw_hash = get_password_hash("CampusSecret2026!")

    users_data = [
        {
            "id": "usr-admin-1",
            "email": "dean.sterling@smartcampus.edu",
            "full_name": "Dr. Eleanor Sterling",
            "role": Role.ADMIN,
            "dept_id": None
        },
        {
            "id": "usr-staff-1",
            "email": "alex.vance@it.smartcampus.edu",
            "full_name": "Alex Vance",
            "role": Role.STAFF,
            "dept_id": "dept-it"
        },
        {
            "id": "usr-faculty-1",
            "email": "r.miller@smartcampus.edu",
            "full_name": "Prof. Robert Miller",
            "role": Role.FACULTY,
            "dept_id": None
        },
        {
            "id": "usr-student-1",
            "email": "sarah.chen@student.smartcampus.edu",
            "full_name": "Sarah Chen",
            "role": Role.STUDENT,
            "dept_id": None,
            "student_profile": {
                "id": "prof-student-1",
                "student_id": "CS-2024-8841",
                "course": "B.Tech Computer Science & Engineering",
                "department": "School of Computing",
                "year": 3,
                "phone": "+1 (555) 382-9102"
            }
        }
    ]

    for u in users_data:
        existing = db.users.find_one({"$or": [{"_id": u["id"]}, {"id": u["id"]}, {"email": u["email"].lower()}]})
        if not existing:
            prof_data = u.get("student_profile")
            profile = StudentProfile(user_id=u["id"], **prof_data) if prof_data else None
            user = User(
                id=u["id"],
                email=u["email"].lower(),
                full_name=u["full_name"],
                password_hash=default_pw_hash,
                role=u["role"],
                staff_department_id=u["dept_id"],
                is_active=True,
                created_at=now,
                student_profile=profile
            )
            db.users.insert_one(user.to_mongo())
            if profile:
                db.student_profiles.update_one(
                    {"$or": [{"_id": profile.id}, {"user_id": profile.user_id}]},
                    {"$set": profile.to_mongo()},
                    upsert=True
                )

    # 4. Realistic Sample Complaints (If collection is empty)
    if db.complaints.count_documents({}) == 0:
        complaints_seed = [
            {
                "id": "cmp-101",
                "complaint_number": "SCMS-2026-000101",
                "title": "Wi-Fi access point dropping packets in Turing Auditorium 202",
                "description": "During CS-401 lecture, the primary ceiling access point AP-B3-202 continuously reboots every 12 minutes, disconnecting 85 students.",
                "category_id": "cat-wifi",
                "priority": Priority.HIGH,
                "status": ComplaintStatus.IN_PROGRESS,
                "created_by": "usr-student-1",
                "assigned_department_id": "dept-it",
                "assigned_staff_id": "usr-staff-1",
                "campus": "Main University Campus",
                "building": "Turing Computing Block B",
                "room": "Auditorium 202",
                "location": "Turing Computing Block B - Auditorium 202",
                "sla_target_hours": 24,
                "is_overdue": False,
                "created_at": now - timedelta(hours=6),
                "updated_at": now - timedelta(hours=2),
                "history": [
                    {"prev": "NONE", "new": "NEW", "remarks": "Registered via student portal.", "hours_ago": 6},
                    {"prev": "NEW", "new": "ASSIGNED", "remarks": "Auto-routed to IT Department (24h SLA).", "hours_ago": 6},
                    {"prev": "ASSIGNED", "new": "IN_PROGRESS", "remarks": "Technician Alex Vance dispatched with diagnostic spectrum analyzer.", "hours_ago": 2}
                ]
            },
            {
                "id": "cmp-102",
                "complaint_number": "SCMS-2026-000102",
                "title": "Main cold water supply pipe leakage in Student Center Restroom",
                "description": "High pressure pipe fitting cracked beneath sink basin #3, leaking water across the entrance walkway.",
                "category_id": "cat-plumb",
                "priority": Priority.HIGH,
                "status": ComplaintStatus.ASSIGNED,
                "created_by": "usr-student-1",
                "assigned_department_id": "dept-maint",
                "assigned_staff_id": None,
                "campus": "Main University Campus",
                "building": "Student Center & Dining Commons",
                "room": "Restroom 1W",
                "location": "Student Center - Restroom 1W",
                "sla_target_hours": 24,
                "is_overdue": False,
                "created_at": now - timedelta(hours=3),
                "updated_at": now - timedelta(hours=3),
                "history": [
                    {"prev": "NONE", "new": "NEW", "remarks": "Registered via web portal.", "hours_ago": 3},
                    {"prev": "NEW", "new": "ASSIGNED", "remarks": "Auto-routed to Maintenance Department.", "hours_ago": 3}
                ]
            },
            {
                "id": "cmp-103",
                "complaint_number": "SCMS-2026-000103",
                "title": "Overhead 4K laser projector lamp failure in Faraday Hall 104",
                "description": "Digital projector won't power up; status indicator blinks red error code 5 (lamp filament failure).",
                "category_id": "cat-class",
                "priority": Priority.MEDIUM,
                "status": ComplaintStatus.RESOLVED,
                "created_by": "usr-faculty-1",
                "assigned_department_id": "dept-maint",
                "assigned_staff_id": "usr-staff-1",
                "campus": "Main University Campus",
                "building": "Faraday Science Block",
                "room": "Lecture Theatre 104",
                "location": "Faraday Science Block - Lecture Theatre 104",
                "resolution_notes": "Installed OEM replacement laser ballast unit and recalibrated keystone distortion. Verified 4K signal input from HDMI lectern.",
                "sla_target_hours": 72,
                "is_overdue": False,
                "created_at": now - timedelta(days=2),
                "updated_at": now - timedelta(hours=5),
                "resolved_at": now - timedelta(hours=5),
                "feedback": {
                    "rating": 5,
                    "comments": "Replaced very quickly before our afternoon laboratory session. Excellent turnaround!"
                },
                "history": [
                    {"prev": "NONE", "new": "NEW", "remarks": "Registered by Faculty.", "hours_ago": 48},
                    {"prev": "NEW", "new": "ASSIGNED", "remarks": "Auto-routed to Maintenance.", "hours_ago": 48},
                    {"prev": "ASSIGNED", "new": "IN_PROGRESS", "remarks": "Parts retrieved from spares warehouse.", "hours_ago": 24},
                    {"prev": "IN_PROGRESS", "new": "RESOLVED", "remarks": "Ballast replaced and tested.", "hours_ago": 5}
                ]
            },
            {
                "id": "cmp-104",
                "complaint_number": "SCMS-2026-000104",
                "title": "Air conditioning unit leaking water in Server Room 03",
                "description": "Precision cooling cassette unit #2 condensate drain blocked, dripping onto floor near Rack 7.",
                "category_id": "cat-elec",
                "priority": Priority.HIGH,
                "status": ComplaintStatus.ON_HOLD,
                "created_by": "usr-staff-1",
                "assigned_department_id": "dept-elec",
                "assigned_staff_id": None,
                "campus": "Main University Campus",
                "building": "Turing Computing Block B",
                "room": "Server Room 03",
                "location": "Turing Computing Block B - Server Room 03",
                "hold_reason": "Awaiting specialized HVAC technician from Daikin campus service partner scheduled tomorrow at 9 AM.",
                "sla_target_hours": 24,
                "is_overdue": False,
                "created_at": now - timedelta(hours=14),
                "updated_at": now - timedelta(hours=4),
                "history": [
                    {"prev": "NONE", "new": "NEW", "remarks": "Ticket logged by IT Staff.", "hours_ago": 14},
                    {"prev": "NEW", "new": "ASSIGNED", "remarks": "Auto-routed to Electrical Dept.", "hours_ago": 14},
                    {"prev": "ASSIGNED", "new": "ON_HOLD", "remarks": "Awaiting specialized HVAC technician from Daikin.", "hours_ago": 4}
                ]
            }
        ]

        for item in complaints_seed:
            c = Complaint(
                id=item["id"],
                complaint_number=item["complaint_number"],
                title=item["title"],
                description=item["description"],
                category_id=item["category_id"],
                priority=item["priority"],
                status=item["status"],
                created_by=item["created_by"],
                assigned_department_id=item["assigned_department_id"],
                assigned_staff_id=item.get("assigned_staff_id"),
                campus=item["campus"],
                building=item["building"],
                room=item["room"],
                location=item["location"],
                resolution_notes=item.get("resolution_notes"),
                hold_reason=item.get("hold_reason"),
                sla_target_hours=item["sla_target_hours"],
                is_overdue=item["is_overdue"],
                created_at=item["created_at"],
                updated_at=item["updated_at"],
                resolved_at=item.get("resolved_at")
            )
            db.complaints.insert_one(c.to_mongo())

            # Seed history
            for h in item.get("history", []):
                hist = ComplaintHistory(
                    complaint_id=c.id,
                    changed_by=item["created_by"],
                    previous_status=h["prev"],
                    new_status=h["new"],
                    remarks=h["remarks"],
                    created_at=now - timedelta(hours=h["hours_ago"])
                )
                db.complaint_history.insert_one(hist.to_mongo())

            # Seed feedback
            if "feedback" in item:
                fb_data = item["feedback"]
                fb = Feedback(
                    complaint_id=c.id,
                    user_id=item["created_by"],
                    rating=fb_data["rating"],
                    comments=fb_data["comments"],
                    created_at=item["resolved_at"]
                )
                db.feedback.insert_one(fb.to_mongo())

        # Sync counter
        db.counters.update_one(
            {"_id": "complaint_number"},
            {"$set": {"seq": 105}},
            upsert=True
        )
