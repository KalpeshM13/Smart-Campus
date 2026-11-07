import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from app.core.config import settings
from app.core.database import get_database, init_mongodb_indexes, _mongo_client
from app.services.seed_service import seed_database_defaults
from app.services.overdue_service import check_and_flag_overdue_complaints
from app.routers import (
    auth,
    complaints,
    departments,
    categories,
    feedback,
    notifications,
    dashboards,
    reports
)

# Ensure uploads directory exists for attachments (FR-14)
UPLOAD_DIR = os.path.join(os.getcwd(), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: connect to MongoDB Atlas / local MongoDB, verify indexes, and seed default data
    db = get_database()
    init_mongodb_indexes(db)
    seed_database_defaults(db)
    check_and_flag_overdue_complaints(db)
    yield
    # Shutdown: close MongoDB client pool
    if _mongo_client:
        _mongo_client.close()

app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    description="Centralized web API for Smart Campus Service Management System powered by MongoDB Atlas.",
    lifespan=lifespan
)

# CORS Middleware (PRD Section 7.2)
cors_list = [origin.strip() for origin in settings.CORS_ORIGINS.split(",") if origin.strip()]
if not cors_list:
    cors_list = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount uploads static directory for attachments
if os.path.exists(UPLOAD_DIR):
    app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# Secure Global Exception Handler (PRD Section 7.2: Avoid leaking sensitive credentials/stack traces)
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    # If it is an HTTPException or Validation error, let Starlette handle it
    from fastapi.exceptions import RequestValidationError
    from starlette.exceptions import HTTPException as StarletteHTTPException
    if isinstance(exc, (StarletteHTTPException, RequestValidationError)):
        raise exc
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "An internal server error occurred. The incident has been recorded."}
    )

# Include API Routers
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(complaints.router, prefix=settings.API_V1_STR)
app.include_router(departments.router, prefix=settings.API_V1_STR)
app.include_router(categories.router, prefix=settings.API_V1_STR)
app.include_router(feedback.router, prefix=settings.API_V1_STR)
app.include_router(notifications.router, prefix=settings.API_V1_STR)
app.include_router(dashboards.router, prefix=settings.API_V1_STR)
app.include_router(reports.router, prefix=settings.API_V1_STR)

@app.get("/health")
def health_check():
    """Service health check endpoint verifying MongoDB database connectivity."""
    try:
        db = get_database()
        db.command("ping")
        mongo_status = "connected"
    except Exception as e:
        mongo_status = f"unreachable: {str(e)}"

    return {
        "status": "healthy" if mongo_status == "connected" else "degraded",
        "service": "Smart Campus Service Management API",
        "database": "MongoDB Atlas",
        "db_status": mongo_status,
        "version": "1.0.0"
    }
