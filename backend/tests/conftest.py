import os
# Set environment variables BEFORE importing any app modules
os.environ["LOCAL_DATA_PATH"] = "./data/test_complaints.json"
os.environ["LOCAL_USERS_PATH"] = "./data/test_users.json"
os.environ["APP_ENV"] = "test"
os.environ["USE_FIRESTORE"] = "False"

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.config import get_settings
from app.dependencies import get_store, get_user_store, get_notification_store

TEST_COMPLAINTS_PATH = "./data/test_complaints.json"
TEST_USERS_PATH = "./data/test_users.json"

@pytest.fixture(scope="session", autouse=True)
def test_setup():
    # Clear any caches to make sure they load settings from env variables
    get_settings.cache_clear()
    get_store.cache_clear()
    get_user_store.cache_clear()
    get_notification_store.cache_clear()
    
    yield
    
    # Cleanup test files after session
    for path in [TEST_COMPLAINTS_PATH, TEST_USERS_PATH]:
        if os.path.exists(path):
            try:
                os.remove(path)
            except Exception:
                pass

@pytest.fixture(autouse=True)
def clean_db():
    # Clear caches to ensure clean slate
    get_settings.cache_clear()
    get_store.cache_clear()
    get_user_store.cache_clear()
    get_notification_store.cache_clear()

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
