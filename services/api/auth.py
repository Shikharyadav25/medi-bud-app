import uuid
from typing import Optional
import jwt
from fastapi import Header, HTTPException, status
from pydantic import BaseModel
from config import settings

class AuthenticatedUser(BaseModel):
    user_id: str
    email: Optional[str] = None
    role: str = "authenticated"

def verify_token(token: str) -> AuthenticatedUser:
    """
    Validates Supabase Auth JWT token signature, expiry, and audience.
    Derives owner strictly from the 'sub' subject claim.
    Never accepts unverified headers or arbitrary parameters.
    """
    try:
        # In Supabase, tokens are typically signed with HS256 using the JWT secret,
        # or RS256/ES256 in newer asymmetric setups.
        payload = jwt.decode(
            token,
            settings.SUPABASE_JWT_SECRET,
            algorithms=["HS256", "RS256"],
            audience=settings.SUPABASE_JWT_AUDIENCE,
            options={"verify_exp": True, "verify_aud": True}
        )
        
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={"code": "INVALID_TOKEN", "message": "Missing 'sub' subject claim in token"}
            )
            
        # Verify valid UUID format
        try:
            uuid.UUID(user_id)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={"code": "INVALID_USER_ID", "message": "Token subject is not a valid UUID"}
            )
            
        return AuthenticatedUser(
            user_id=user_id,
            email=payload.get("email"),
            role=payload.get("role", "authenticated")
        )
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "TOKEN_EXPIRED", "message": "Authorization token has expired"}
        )
    except jwt.PyJWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "INVALID_TOKEN", "message": f"Token verification failed: {str(e)}"}
        )

async def get_current_user(authorization: Optional[str] = Header(None)) -> AuthenticatedUser:
    """FastAPI Dependency for protected endpoints."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "UNAUTHORIZED", "message": "Missing or malformed Authorization header with Bearer token"}
        )
    
    token = authorization.split("Bearer ")[1].strip()
    return verify_token(token)

def create_test_token(user_id: str, email: str = "test@medibud.local", expires_in: int = 3600) -> str:
    """Generates a valid signed JWT for automated integration tests."""
    import time
    now = int(time.time())
    payload = {
        "sub": user_id,
        "email": email,
        "aud": settings.SUPABASE_JWT_AUDIENCE,
        "role": "authenticated",
        "iat": now,
        "exp": now + expires_in
    }
    return jwt.encode(payload, settings.SUPABASE_JWT_SECRET, algorithm="HS256")
