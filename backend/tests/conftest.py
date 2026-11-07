import os
import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import pytest
from fastapi.testclient import TestClient
import mongomock
from app.core.database import get_db, init_mongodb_indexes
from app.core.security import create_access_token
from app.main import app
from app.services.seed_service import seed_database_defaults

@pytest.fixture()
def mongo_db():
    """In-memory mock MongoDB database for fast, isolated test execution."""
    client = mongomock.MongoClient()
    db = client["test_smartcampus_db"]
    init_mongodb_indexes(db)
    seed_database_defaults(db)
    return db

@pytest.fixture()
def db_session(mongo_db):
    """Compatibility alias for test cases interacting with database directly."""
    return mongo_db

@pytest.fixture()
def client(mongo_db):
    def override_get_db():
        try:
            yield mongo_db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()

@pytest.fixture()
def admin_headers():
    token = create_access_token(subject="usr-admin-1", role="ADMIN")
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture()
def student_headers():
    token = create_access_token(subject="usr-student-1", role="STUDENT")
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture()
def staff_headers():
    token = create_access_token(subject="usr-staff-1", role="STAFF")
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture()
def faculty_headers():
    token = create_access_token(subject="usr-faculty-1", role="FACULTY")
    return {"Authorization": f"Bearer {token}"}
