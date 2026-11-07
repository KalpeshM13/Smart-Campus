from pymongo.database import Database
from pymongo import ReturnDocument

def generate_complaint_number(db: Database) -> str:
    """
    Generate sequential, unique complaint tracking number in MongoDB.
    Format: SCMS-2026-000001 (PRD Section 11.1)
    Uses atomic MongoDB find_one_and_update to prevent race conditions.
    """
    # Sync with current total count if counter doesn't exist
    existing_count = db.complaints.count_documents({})
    
    counter = db.counters.find_one_and_update(
        {"_id": "complaint_number"},
        {"$inc": {"seq": 1}},
        upsert=True,
        return_document=ReturnDocument.AFTER
    )
    seq = counter.get("seq", 1) if counter else 1
    if seq <= existing_count:
        seq = existing_count + 1
        db.counters.update_one({"_id": "complaint_number"}, {"$set": {"seq": seq}}, upsert=True)

    return f"SCMS-2026-{seq:06d}"
