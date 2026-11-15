import os
import sys

backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, backend_dir)

from dotenv import load_dotenv
load_dotenv(os.path.join(backend_dir, ".env"), override=True)

from app.core.database import get_database

def cleanup_duplicates():
    db = get_database()
    print("=" * 80)
    print("CLEANING UP DUPLICATE COMPLAINTS IN MONGODB")
    print("=" * 80)

    # 1. Group complaints by salesforce_case_id
    all_complaints = list(db.complaints.find({}))
    print(f"Initial total complaints count in MongoDB: {len(all_complaints)}")

    by_sf_id = {}
    for c in all_complaints:
        sf_id = c.get("salesforce_case_id")
        if sf_id:
            by_sf_id.setdefault(sf_id, []).append(c)

    duplicates_merged = 0
    for sf_id, docs in by_sf_id.items():
        if len(docs) > 1:
            print(f"\nProcessing duplicate group for Salesforce Case ID: {sf_id}")
            # Identify the doc with SCMS- tracking number, and doc with SF Case ID as _id
            scms_doc = next((d for d in docs if str(d.get("complaint_number", "")).startswith("SCMS-")), None)
            sf_doc = next((d for d in docs if str(d.get("_id")) == sf_id), None)

            # Determine authoritative complaint number & creator
            authoritative_number = scms_doc.get("complaint_number") if scms_doc else f"SCMS-2026-{docs[0].get('salesforce_case_number', '000000')}"
            authoritative_creator = (scms_doc.get("created_by") if scms_doc else None) or docs[0].get("created_by")

            # Master document is the one with _id == sf_id (or if none, pick the first and update its _id)
            master_doc = sf_doc if sf_doc else docs[0]
            master_id = sf_id

            # Update master document
            update_fields = {
                "_id": sf_id,
                "id": sf_id,
                "salesforce_case_id": sf_id,
                "complaint_number": authoritative_number,
                "created_by": authoritative_creator
            }
            if scms_doc and scms_doc.get("salesforce_case_number"):
                update_fields["salesforce_case_number"] = scms_doc.get("salesforce_case_number")
            elif sf_doc and sf_doc.get("complaint_number") and sf_doc.get("complaint_number").isdigit():
                update_fields["salesforce_case_number"] = sf_doc.get("complaint_number")

            # Remove all docs in this group from MongoDB
            ids_to_remove = [d["_id"] for d in docs]
            db.complaints.delete_many({"_id": {"$in": ids_to_remove}})

            # Re-insert the single merged master doc
            master_doc.update(update_fields)
            db.complaints.replace_one({"_id": sf_id}, master_doc, upsert=True)

            # Re-point history, feedback, and notifications from all old IDs to master_id
            for old_id in ids_to_remove:
                if str(old_id) != sf_id:
                    db.complaint_history.update_many({"complaint_id": old_id}, {"$set": {"complaint_id": sf_id}})
                    db.feedback.update_many({"complaint_id": old_id}, {"$set": {"complaint_id": sf_id}})
                    db.notifications.update_many({"complaint_id": old_id}, {"$set": {"complaint_id": sf_id}})

            print(f"   -> Successfully merged into single document {sf_id} (Number: {authoritative_number})")
            duplicates_merged += 1

    # 2. Format any remaining raw 000010XX numbers into SCMS-2026-0010XX for visual consistency
    raw_number_docs = list(db.complaints.find({"complaint_number": {"$regex": "^0000"}}))
    print(f"\nFormatting {len(raw_number_docs)} legacy Case numbers into standard SCMS- format...")
    for doc in raw_number_docs:
        c_num = doc["complaint_number"]
        if c_num.isdigit():
            new_num = f"SCMS-2026-{int(c_num):06d}"
            db.complaints.update_one(
                {"_id": doc["_id"]},
                {"$set": {"complaint_number": new_num, "salesforce_case_number": c_num}}
            )

    final_count = db.complaints.count_documents({})
    print(f"\nFinal total complaints count in MongoDB: {final_count}")
    print(f"Total duplicate groups resolved: {duplicates_merged}")
    print("=" * 80)

if __name__ == "__main__":
    cleanup_duplicates()
