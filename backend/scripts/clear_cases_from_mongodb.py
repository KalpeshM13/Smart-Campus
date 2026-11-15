import os
import sys

backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, backend_dir)

from dotenv import load_dotenv
load_dotenv(os.path.join(backend_dir, ".env"), override=True)

from app.core.database import get_database

def clear_cases_and_reset():
    db = get_database()
    print("=" * 80)
    print("CLEARING ALL CASE & COMPLAINT RECORDS FROM MONGODB")
    print("=" * 80)

    # 1. Delete complaint-related collections
    collections_to_empty = [
        "complaints",
        "complaint_history",
        "feedback",
        "notifications",
        "counters"
    ]

    for coll in collections_to_empty:
        count = db[coll].count_documents({})
        res = db[coll].delete_many({})
        print(f"Cleared {res.deleted_count} records from collection '{coll}' (was {count}).")

    # 2. Reset counter for complaint numbering so new tickets start at 1
    db.counters.replace_one(
        {"_id": "complaint_number_seq"},
        {"_id": "complaint_number_seq", "seq": 0},
        upsert=True
    )
    print("Reset complaint counter: next ticket will be SCMS-2026-000001.")

    print("\n" + "=" * 80)
    print("CURRENT MONGODB COLLECTION STATUS")
    print("=" * 80)
    all_colls = ["complaints", "complaint_history", "feedback", "notifications", "counters", "departments", "complaint_categories", "users"]
    for coll in all_colls:
        c = db[coll].count_documents({})
        print(f"  - {coll:<22}: {c} records")

    print("\nSUCCESS: All Cases and related records are completely empty!")
    print("Ready for manual complaint insertion by user.")
    print("=" * 80)

if __name__ == "__main__":
    clear_cases_and_reset()
