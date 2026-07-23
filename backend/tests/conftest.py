import os
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.config import Settings
from app.dependencies import get_settings

TEST_COMPLAINTS_PATH = "./data/test_complaints.json"
TEST_USERS_PATH = "./data/test_users.json"

@pytest.fixture(scope="session", autouse=True)
def test_settings():
    settings = Settings(
        local_data_path=TEST_COMPLAINTS_PATH,
        local_users_path=TEST_USERS_PATH,
        use_firestore=False
    )
    # Override settings dependency
    app.dependency_overrides[get_settings] = lambda: settings
    
    yield settings
    
    # Cleanup test files after session
    for path in [TEST_COMPLAINTS_PATH, TEST_USERS_PATH]:
        if os.path.exists(path):
            try:
                os.remove(path)
            except Exception:
                pass

@pytest.fixture(autouse=True)
def clean_db():
    # Delete test files before each test to ensure a clean slate
    for path in [TEST_COMPLAINTS_PATH, TEST_USERS_PATH]:
        if os.path.exists(path):
            try:
                os.remove(path)
            except Exception:
                pass
    yield

@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c
