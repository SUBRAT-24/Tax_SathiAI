"""
TaxSathi AI — FastAPI Main Application
Entry point with CORS, middleware, and router mounting.
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi.errors import RateLimitExceeded

from app.config import settings
from app.database import init_db, close_db
from app.middleware.rate_limiter import limiter, rate_limit_exceeded_handler

# Import routers
from app.api.v1.auth import router as auth_router
from app.api.v1.chat import router as chat_router
from app.api.v1.documents import router as documents_router
from app.api.v1.tools import router as tools_router
from app.api.v1.dashboard import router as dashboard_router
from app.api.v1.admin import router as admin_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan — startup and shutdown events."""
    print(f"🚀 Starting {settings.APP_NAME} v{settings.APP_VERSION}")
    print(f"   Environment: {settings.ENVIRONMENT}")
    print(f"   Debug: {settings.DEBUG}")

    # Initialize database
    await init_db()
    print("   ✅ Database initialized")

    # Create upload directories
    import os
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    os.makedirs(settings.CHROMADB_PERSIST_DIR, exist_ok=True)
    print("   ✅ Upload directories ready")

    print(f"   ✅ {settings.APP_NAME} is ready!")
    print(f"   📖 Docs: http://localhost:8000/docs")

    yield

    # Shutdown
    await close_db()
    print(f"👋 {settings.APP_NAME} shutting down")


# Create FastAPI app
app = FastAPI(
    title=settings.APP_NAME,
    description="AI-Powered GST & Tax Compliance Partner — RAG chatbot for Indian tax queries",
    version=settings.APP_VERSION,
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# ─── Middleware ──────────────────────────────────────

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Rate limiting
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)


# Maintenance mode middleware
@app.middleware("http")
async def maintenance_mode_middleware(request: Request, call_next):
    if settings.MAINTENANCE_MODE and not request.url.path.startswith("/api/v1/admin"):
        return JSONResponse(
            status_code=503,
            content={
                "success": False,
                "data": None,
                "message": "TaxSathi AI is currently under maintenance. Please try again later.",
            },
        )
    return await call_next(request)


# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "data": None,
            "message": "An internal error occurred",
            "error": str(exc) if settings.DEBUG else "Internal server error",
        },
    )


# ─── Routes ─────────────────────────────────────────

# Health check
@app.get("/", tags=["Health"])
async def root():
    return {
        "success": True,
        "data": {
            "app": settings.APP_NAME,
            "version": settings.APP_VERSION,
            "status": "running",
            "environment": settings.ENVIRONMENT,
        },
        "message": "TaxSathi AI is running 🚀",
    }


@app.get("/health", tags=["Health"])
async def health_check():
    return {"status": "healthy", "app": settings.APP_NAME}


# Mount API v1 routers
app.include_router(auth_router, prefix="/api/v1")
app.include_router(chat_router, prefix="/api/v1")
app.include_router(documents_router, prefix="/api/v1")
app.include_router(tools_router, prefix="/api/v1")
app.include_router(dashboard_router, prefix="/api/v1")
app.include_router(admin_router, prefix="/api/v1")
