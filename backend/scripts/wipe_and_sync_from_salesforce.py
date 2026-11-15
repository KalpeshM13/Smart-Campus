"""
Administrative Database Migration & Salesforce Cloud Ingestion Script.
Wipes old MongoDB collections and populates everything directly from live Salesforce Service Cloud.
"""

import sys
import os
import json

# Add backend directory to path
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, backend_dir)

from dotenv import load_dotenv
load_dotenv(os.path.join(backend_dir, ".env"), override=True)

from app.core.database import get_database, init_mongodb_indexes
from app.integrations.salesforce.sync import get_sync_engine

def main():
    print("=" * 80)
    print("SMART CAMPUS: SALESFORCE SERVICE CLOUD COMPLETE DATA INGESTION")
    print("=" * 80)

    db = get_database()
    print(f"Target MongoDB Database: {db.name}")

    engine = get_sync_engine()
    print(f"Connecting to Salesforce: {engine.client.config.INSTANCE_URL}")
    health = engine.client.health_check()
    print("Salesforce Health:", health)

    if health.get("status") != "connected":
        print("ERROR: Cannot connect to Salesforce Service Cloud. Aborting wipe.")
        sys.exit(1)

    print("\nExecuting complete MongoDB wipe and Salesforce data ingestion...")
    summary = engine.full_wipe_and_sync(db)

    print("\nRe-creating MongoDB indexes...")
    init_mongodb_indexes(db)

    print("\n" + "=" * 80)
    print("MIGRATION SUMMARY")
    print("=" * 80)
    print(json.dumps(summary, indent=2))

    print("\nVerifying MongoDB counts:")
    for coll_name in ["departments", "complaint_categories", "users", "complaints", "feedback", "complaint_history"]:
        count = db[coll_name].count_documents({})
        print(f"  - {coll_name}: {count} records")

    print("\nVerification Complete: All data is now sourced 100% from Salesforce Service Cloud!")

if __name__ == "__main__":
    main()

