import os
import sys
import pytest

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

from app.core.database import Base, engine, SessionLocal
from app.main import app, initialize_default_roles, initialize_seed_catalog
from fastapi.testclient import TestClient


@pytest.fixture(scope="session", autouse=True)
def setup_test_database():
    """Ensure database schema is created and seeded for testing."""
    Base.metadata.create_all(bind=engine)
    initialize_default_roles()
    initialize_seed_catalog()
    yield
    # Cleanup after session if needed


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c
