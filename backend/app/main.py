import os
import asyncio
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, RedirectResponse
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
    reports,
    salesforce_sync
)

logger = logging.getLogger("smart_campus")

# Ensure uploads directory exists for attachments (FR-14)
UPLOAD_DIR = os.path.join(os.getcwd(), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: connect to MongoDB, verify indexes, and start continuous Salesforce sync
    sync_task = None
    try:
        db = get_database()
        init_mongodb_indexes(db)

        from app.integrations.salesforce.config import sf_config
        from app.integrations.salesforce.sync import get_sync_engine

        if not sf_config.MOCK_MODE:
            logger.info("Initializing from live Salesforce Service Cloud and starting continuous sync daemon...")
            sync_engine = get_sync_engine()
            # If MongoDB has no metadata, do initial ingest
            if db.departments.count_documents({}) == 0:
                sync_engine.full_wipe_and_sync(db)
            else:
                sync_engine.delta_sync(db)
            # Start background continuous synchronization loop (polls every 30s)
            sync_task = asyncio.create_task(
                sync_engine.run_continuous_sync_loop(get_database, interval_seconds=30)
            )
        else:
            seed_database_defaults(db)

        check_and_flag_overdue_complaints(db)
        logger.info("MongoDB database connection and synchronization initialized successfully.")
    except Exception as e:
        logger.error(
            f"Startup database initialization error: {e}. "
            "If connecting to MongoDB Atlas, ensure Network Access allows 0.0.0.0/0."
        )
    yield
    # Shutdown: cancel background continuous sync and close MongoDB client pool
    if sync_task and not sync_task.done():
        sync_task.cancel()
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

# HTTPS Enforcement & Security Headers Middleware (FR-01 & Security Best Practices)
@app.middleware("http")
async def security_and_https_headers_middleware(request: Request, call_next):
    # Enforce HTTPS redirect if x-forwarded-proto is http on production hosts
    proto = request.headers.get("x-forwarded-proto", "").lower()
    host = request.url.hostname or ""
    if proto == "http" and host not in ("localhost", "127.0.0.1", "testserver") and not host.endswith(".local"):
        https_url = str(request.url).replace("http://", "https://", 1)
        return RedirectResponse(url=https_url, status_code=status.HTTP_301_MOVED_PERMANENTLY)

    response = await call_next(request)
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "SAMEORIGIN"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response

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
app.include_router(salesforce_sync.router, prefix=settings.API_V1_STR)

@app.get("/")
def root():
    """Root endpoint providing service status and quick links."""
    return {
        "service": settings.PROJECT_NAME,
        "status": "online",
        "docs": "/docs",
        "health": "/health",
        "version": "1.0.0"
    }

@app.get("/health")
@app.get("/api/health")
def health_check():
    """Service health check endpoint verifying MongoDB and Salesforce Service Cloud connectivity."""
    try:
        db = get_database()
        db.command("ping")
        mongo_status = "connected"
    except Exception as e:
        mongo_status = f"unreachable: {str(e)}"

    from app.integrations.salesforce import get_salesforce_service
    try:
        sf_service = get_salesforce_service()
        sf_health = sf_service.get_health()
    except Exception as e:
        sf_health = {"status": "unreachable", "error": str(e)}

    is_healthy = (mongo_status == "connected") and (sf_health.get("status") in ("connected", "simulated_healthy"))

    return {
        "status": "healthy" if is_healthy else "degraded",
        "service": "Smart Campus Service Management API",
        "database": "MongoDB Atlas",
        "db_status": mongo_status,
        "salesforce": sf_health,
        "version": "1.0.0"
    }
