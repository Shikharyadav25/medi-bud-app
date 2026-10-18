import uuid
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from config import settings

from routes.auth_routes import auth_router
from routes.log_routes import log_router
from routes.reminder_routes import reminder_router
from routes.report_routes import report_router
from routes.chat_routes import chat_router
from routes.diet_routes import diet_router
from routes.care_routes import care_router
from routes.symptom_routes import symptom_router
from routes.mobile_ai_routes import mobile_ai_router
from storage import initialize, transaction, check_rate_limit
from starlette.concurrency import run_in_threadpool


@asynccontextmanager
async def lifespan(app):
    initialize()
    yield


app = FastAPI(
    lifespan=lifespan,
    title=settings.APP_NAME,
    description="Unified backend API for Medi Bud AI Health Companion (Next.js & Expo)",
    version="1.0.0",
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Unified Error Handlers
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    req_id = str(uuid.uuid4())
    return JSONResponse(
        status_code=422,
        content={
            "code": "VALIDATION_ERROR",
            "message": "The request body or query parameter failed schema validation.",
            "request_id": req_id,
            "details": [
                {"loc": list(e["loc"]), "type": e["type"], "msg": e["msg"]}
                for e in exc.errors()
            ],
        },
    )


# Liveness & Readiness Probes
@app.get("/health", tags=["System"])
async def health():
    return {
        "status": "healthy",
        "service": settings.APP_NAME,
        "environment": settings.ENVIRONMENT,
    }


@app.get("/ready", tags=["System"])
async def readiness():
    try:

        def probe():
            from storage import execute, _decode

            with transaction() as conn:
                row = execute(
                    conn,
                    "SELECT value FROM app_records WHERE value LIKE 'enc:%' LIMIT 1",
                ).fetchone()
                if row:
                    _decode(row[0])

        await run_in_threadpool(probe)
        return {
            "ready": True,
            "database_connected": True,
            "ai_configured": bool(settings.GEMINI_API_KEY),
            "retrieval_mode": "lexical",
        }
    except Exception:
        return JSONResponse(
            status_code=503, content={"ready": False, "database_connected": False}
        )


@app.middleware("http")
async def protect_requests(request: Request, call_next):
    declared_size = request.headers.get("content-length")
    if declared_size and (
        not declared_size.isdigit() or int(declared_size) > 15 * 1024 * 1024
    ):
        return JSONResponse(
            status_code=413, content={"message": "Request exceeds the upload limit"}
        )
    # Bound chunked requests as well as requests with a Content-Length header.
    received = 0
    receive = request._receive

    async def limited_receive():
        nonlocal received
        message = await receive()
        received += len(message.get("body", b""))
        if received > 15 * 1024 * 1024:
            from starlette.exceptions import HTTPException

            raise HTTPException(413, "Request exceeds the upload limit")
        return message

    request._receive = limited_receive
    if request.url.path not in ("/health", "/ready"):
        address = request.client.host if request.client else "unknown"
        if not await run_in_threadpool(
            check_rate_limit, "ip:" + address, settings.RATE_LIMIT_PER_MINUTE * 3
        ):
            return JSONResponse(
                status_code=429,
                content={"message": "Too many requests"},
                headers={"Retry-After": "60"},
            )
    response = await call_next(request)
    response.headers["Cache-Control"] = "no-store"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Referrer-Policy"] = "no-referrer"
    return response


@app.exception_handler(Exception)
async def unexpected_error(request, exc):
    request_id = str(uuid.uuid4())
    # Never include exception strings, request bodies, tokens, or health data.
    return JSONResponse(
        status_code=503,
        content={
            "code": "SERVICE_UNAVAILABLE",
            "message": "The service could not complete this request. Please try again.",
            "request_id": request_id,
        },
    )


# Mount /v1 API Endpoints
app.include_router(auth_router)
app.include_router(log_router)
app.include_router(reminder_router)
app.include_router(report_router)
app.include_router(chat_router)
app.include_router(diet_router)
app.include_router(care_router)
app.include_router(symptom_router)
app.include_router(mobile_ai_router)

if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=settings.PORT, reload=True)
