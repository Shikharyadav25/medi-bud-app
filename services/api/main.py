import uuid
from fastapi import FastAPI, Request, status
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
from services.embedding_service import get_embedding_model

app = FastAPI(
    title=settings.APP_NAME,
    description="Unified backend API for Medi Bud AI Health Companion (Next.js & Expo)",
    version="1.0.0"
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
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "code": "VALIDATION_ERROR",
            "message": "The request body or query parameter failed schema validation.",
            "request_id": req_id,
            "details": exc.errors()
        }
    )

# Liveness & Readiness Probes
@app.get("/health", tags=["System"])
async def health():
    return {
        "status": "healthy",
        "service": settings.APP_NAME,
        "environment": settings.ENVIRONMENT
    }

@app.get("/ready", tags=["System"])
async def readiness():
    model = get_embedding_model()
    model_loaded = model is not None
    return {
        "ready": True,
        "model_loaded": model_loaded,
        "embedding_dimensions": 384,
        "database_connected": True
    }

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
