import sys
import os
import uuid
from datetime import datetime, timedelta, timezone
import pytest
import jwt
from fastapi.testclient import TestClient

# Ensure services/api is in Python module search path
api_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "services", "api"))
if api_dir not in sys.path:
    sys.path.insert(0, api_dir)

from config import settings
from main import app

@pytest.fixture(scope="session")
def client():
    return TestClient(app)

def create_jwt_token(user_id: str, email: str, role: str = "authenticated", expires_in_seconds: int = 3600) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "aud": settings.SUPABASE_JWT_AUDIENCE,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(seconds=expires_in_seconds)).timestamp())
    }
    return jwt.encode(payload, settings.SUPABASE_JWT_SECRET, algorithm="HS256")

@pytest.fixture
def user_a():
    uid = str(uuid.uuid4())
    token = create_jwt_token(uid, "usera@example.com")
    return {"user_id": uid, "token": token, "headers": {"Authorization": f"Bearer {token}"}}

@pytest.fixture
def user_b():
    uid = str(uuid.uuid4())
    token = create_jwt_token(uid, "userb@example.com")
    return {"user_id": uid, "token": token, "headers": {"Authorization": f"Bearer {token}"}}
