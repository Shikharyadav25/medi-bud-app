import uuid
from typing import Optional
import jwt
from fastapi import Header, HTTPException, status, Depends
from pydantic import BaseModel
from config import settings
from storage import request_transaction, is_revoked, check_rate_limit
from starlette.concurrency import run_in_threadpool
from functools import lru_cache


@lru_cache(maxsize=4)
def jwks_client(url):
    return jwt.PyJWKClient(url, timeout=5, lifespan=300)


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
    # Seamless demonstration fallback for local development without active Supabase credentials
    if (
        settings.ENVIRONMENT == "development"
        and settings.ENABLE_DEMO_AUTH
        and token in ("demo_jwt_token", "demo_token")
    ):
        return AuthenticatedUser(
            user_id="00000000-0000-0000-0000-000000000001",
            email="demo@medibud.local",
            role="authenticated",
        )

    try:
        # In Supabase, tokens are typically signed with HS256 using the JWT secret,
        # or RS256/ES256 in newer asymmetric setups.
        algorithm = jwt.get_unverified_header(token).get("alg")
        if algorithm in ("ES256", "RS256"):
            key = (
                jwks_client(
                    settings.SUPABASE_URL.rstrip("/") + "/auth/v1/.well-known/jwks.json"
                )
                .get_signing_key_from_jwt(token)
                .key
            )
            algorithms = [algorithm]
        elif algorithm == "HS256" and settings.SUPABASE_JWT_SECRET:
            key = settings.SUPABASE_JWT_SECRET
            algorithms = ["HS256"]
        else:
            raise jwt.InvalidTokenError("Unsupported signing configuration")
        payload = jwt.decode(
            token,
            key,
            algorithms=algorithms,
            audience=settings.SUPABASE_JWT_AUDIENCE,
            issuer=settings.SUPABASE_URL.rstrip("/") + "/auth/v1",
            options={
                "require": ["exp", "sub", "aud", "iss"],
                "verify_exp": True,
                "verify_aud": True,
            },
        )

        user_id = payload.get("sub")
        if payload.get("role") != "authenticated":
            raise jwt.InvalidTokenError("Invalid role")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={
                    "code": "INVALID_TOKEN",
                    "message": "Missing 'sub' subject claim in token",
                },
            )

        # Verify valid UUID format
        try:
            uuid.UUID(user_id)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={
                    "code": "INVALID_USER_ID",
                    "message": "Token subject is not a valid UUID",
                },
            )

        return AuthenticatedUser(
            user_id=user_id,
            email=payload.get("email"),
            role=payload.get("role", "authenticated"),
        )
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "code": "TOKEN_EXPIRED",
                "message": "Authorization token has expired",
            },
        )
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "INVALID_TOKEN", "message": "Token verification failed"},
        )


async def get_current_user(
    authorization: Optional[str] = Header(None),
) -> AuthenticatedUser:
    """FastAPI Dependency for protected endpoints."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "code": "UNAUTHORIZED",
                "message": "Missing or malformed Authorization header with Bearer token",
            },
        )

    token = authorization.split("Bearer ")[1].strip()
    user = await run_in_threadpool(verify_token, token)
    if await run_in_threadpool(is_revoked, user.user_id):
        raise HTTPException(
            401,
            detail={
                "code": "ACCOUNT_DELETED",
                "message": "This account has been deleted",
            },
        )
    if not await run_in_threadpool(
        check_rate_limit, "user:" + user.user_id, settings.RATE_LIMIT_PER_MINUTE
    ):
        raise HTTPException(
            429,
            detail="Too many requests. Try again in one minute.",
            headers={"Retry-After": "60"},
        )
    async with request_transaction(user.user_id):
        if is_revoked(user.user_id):
            raise HTTPException(401, detail="This account has been deleted")
        yield user


def create_test_token(
    user_id: str, email: str = "test@medibud.local", expires_in: int = 3600
) -> str:
    """Generates a valid signed JWT for automated integration tests."""
    import time

    now = int(time.time())
    payload = {
        "sub": user_id,
        "email": email,
        "aud": settings.SUPABASE_JWT_AUDIENCE,
        "role": "authenticated",
        "iss": settings.SUPABASE_URL.rstrip("/") + "/auth/v1",
        "iat": now,
        "exp": now + expires_in,
    }
    return jwt.encode(payload, settings.SUPABASE_JWT_SECRET, algorithm="HS256")


async def require_ai_budget(
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    if not await run_in_threadpool(
        check_rate_limit,
        "ai:" + current_user.user_id,
        settings.AI_RATE_LIMIT_PER_MINUTE,
    ):
        raise HTTPException(
            429,
            detail="AI request limit reached. Try again shortly.",
            headers={"Retry-After": "60"},
        )
    return current_user
