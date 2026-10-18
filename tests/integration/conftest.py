import sys
import os
import uuid
from datetime import datetime, timedelta, timezone
import pytest
import jwt
import tempfile

os.environ.setdefault(
    "DATABASE_URL",
    "sqlite:///" + tempfile.mktemp(prefix="medibud-test-", suffix=".sqlite3"),
)
os.environ["SUPABASE_JWT_SECRET"] = "test-only-secret-not-for-deployment-123456789"
os.environ["RATE_LIMIT_PER_MINUTE"] = "10000"
from fastapi.testclient import TestClient

# Ensure services/api is in Python module search path
api_dir = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "services", "api")
)
if api_dir not in sys.path:
    sys.path.insert(0, api_dir)

from config import settings
from main import app


def synthetic_pdf(text="Hemoglobin 14.2 g/dL Reference 13.0 - 17.0"):
    import io
    from reportlab.pdfgen import canvas

    output = io.BytesIO()
    pdf = canvas.Canvas(output)
    pdf.drawString(40, 800, text)
    pdf.save()
    return output.getvalue()


@pytest.fixture(scope="session")
def client():
    with TestClient(app) as test_client:
        yield test_client


def create_jwt_token(
    user_id: str,
    email: str,
    role: str = "authenticated",
    expires_in_seconds: int = 3600,
) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "iss": settings.SUPABASE_URL.rstrip("/") + "/auth/v1",
        "aud": settings.SUPABASE_JWT_AUDIENCE,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(seconds=expires_in_seconds)).timestamp()),
    }
    return jwt.encode(payload, settings.SUPABASE_JWT_SECRET, algorithm="HS256")


@pytest.fixture
def user_a():
    uid = str(uuid.uuid4())
    token = create_jwt_token(uid, "usera@example.com")
    return {
        "user_id": uid,
        "token": token,
        "headers": {"Authorization": f"Bearer {token}"},
    }


@pytest.fixture
def user_b():
    uid = str(uuid.uuid4())
    token = create_jwt_token(uid, "userb@example.com")
    return {
        "user_id": uid,
        "token": token,
        "headers": {"Authorization": f"Bearer {token}"},
    }
