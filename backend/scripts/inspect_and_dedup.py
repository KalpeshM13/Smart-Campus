from app.core.database import get_db

def main():
    db = next(get_db())
    cases = list(db.complaints.find({}))
    by_sf_id = {}
    for c in cases:
        sf_id = c.get("salesforce_case_id")
        if sf_id:
            by_sf_id.setdefault(sf_id, []).append(c)

    print(f"Total complaints in MongoDB: {len(cases)}")
    dups = {k: v for k, v in by_sf_id.items() if len(v) > 1}
    print(f"Duplicates count by salesforce_case_id: {len(dups)}")
    for sf_id, docs in dups.items():
        print(f"\nSF ID: {sf_id}")
        for d in docs:
            print(f"   _id: {d.get('_id')} | num: {d.get('complaint_number')} | title: {d.get('title')}")

if __name__ == "__main__":
    main()
