"""Quick MongoDB connection check. Run from back-end/: python check_db.py"""
import os
import sys

# Load .env from this directory so MONGODB_URI is set when run as: python check_db.py
from pathlib import Path
from dotenv import load_dotenv
load_dotenv(Path(__file__).resolve().parent / ".env")

uri = os.getenv("MONGODB_URI", "")
db_name = os.getenv("MONGODB_DB_NAME", "diagnostic")

if not uri:
    print("MONGODB_URI is not set (check back-end/.env)")
    sys.exit(1)

print(f"MONGODB_URI: set ({uri[:30]}...)")
print(f"MONGODB_DB_NAME: {db_name}")
print("Connecting...")

try:
    from pymongo import MongoClient
    client = MongoClient(uri, serverSelectionTimeoutMS=5000)
    client.admin.command("ping")
    print("Connection: OK")
    db = client[db_name]
    patients = list(db.patients.find({}, {"_id": 0, "id": 1, "name": 1}))
    print(f"Collection 'patients' in DB '{db_name}': {len(patients)} document(s)")
    if patients:
        for p in patients[:5]:
            print(f"  - {p.get('id', '')} {p.get('name', '')}")
    else:
        print("  (Empty — run seed_mock_patients.py to add mock data)")
except Exception as e:
    print(f"Error: {e}")
    sys.exit(1)
