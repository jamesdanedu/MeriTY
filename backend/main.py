from contextlib import asynccontextmanager
from typing import AsyncGenerator
from app.core.logging import setup_logging, logger
import time
from datetime import datetime

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.exceptions import HTTPException as StarletteHTTPException
import sentry_sdk
from sentry_sdk.integrations.asgi import SentryAsgiMiddleware

from app.api.endpoints import auth, students, teachers, subjects, class_groups, credits, imports, reports
from app.core.config import Settings, get_settings
from app.core.database import supabase
from app.core.logging import setup_logging

# Initialize settings
settings = get_settings()

# Set up logging
logger = setup_logging()

# Initialize Sentry if DSN is provided
if settings.SENTRY_DSN:
    sentry_sdk.init(
        dsn=settings.SENTRY_DSN,
        traces_sample_rate=1.0,
        environment=settings.ENVIRONMENT
    )

class LoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        start_time = time.time()
        
        # Log request
        logger.info(
            f"Request started",
            extra={
                "path": request.url.path,
                "method": request.method,
                "client_ip": request.client.host,
                "timestamp": datetime.utcnow().isoformat()
            }
        )
        
        try:
            response = await call_next(request)
            process_time = time.time() - start_time
            
            # Log response
            logger.info(
                f"Request completed",
                extra={
                    "path": request.url.path,
                    "method": request.method,
                    "status_code": response.status_code,
                    "process_time": process_time,
                    "timestamp": datetime.utcnow().isoformat()
                }
            )
            
            response.headers["X-Process-Time"] = str(process_time)
            return response
            
        except Exception as e:
            process_time = time.time() - start_time
            
            # Log error
            logger.error(
                f"Request failed",
                extra={
                    "path": request.url.path,
                    "method": request.method,
                    "error": str(e),
                    "process_time": process_time,
                    "timestamp": datetime.utcnow().isoformat()
                },
                exc_info=True
            )
            
            raise

class CustomErrorMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        try:
            response = await call_next(request)
            return response
        except Exception as e:
            logger.exception("Uncaught exception")
            return JSONResponse(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                content={"detail": "An unexpected error occurred"}
            )

@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator:
    """
    Startup and shutdown events for the application
    """
    # Startup
    try:
        # Test database connection
        await supabase.auth.get_user()
        
        logger.info("Application startup complete")
        
    except Exception as e:
        logger.error(f"Error during startup: {e}")
        raise
    
    yield
    
    # Shutdown
    try:
        logger.info("Application shutdown complete")
    except Exception as e:
        logger.error(f"Error during shutdown: {e}")
        raise

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="API for tracking Transition Year student credits",
    version="1.0.0",
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add Gzip compression
app.add_middleware(GZipMiddleware, minimum_size=1000)

# Add logging middleware
app.add_middleware(LoggingMiddleware)

# Add error handling middleware
app.add_middleware(CustomErrorMiddleware)

# Add Sentry middleware if configured
if settings.SENTRY_DSN:
    app.add_middleware(SentryAsgiMiddleware)

# Custom error handlers
@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    logger.error(f"HTTP error occurred", extra={
        "path": request.url.path,
        "method": request.method,
        "status_code": exc.status_code,
        "detail": str(exc.detail)
    })
    
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": str(exc.detail)}
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    logger.error(f"Validation error occurred", extra={
        "path": request.url.path,
        "method": request.method,
        "errors": exc.errors()
    })
    
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": exc.errors()}
    )

# Health check endpoint
@app.get("/health")
async def health_check():
    try:
        # Check database connection
        await supabase.auth.get_user()
        
        return {
            "status": "healthy",
            "timestamp": datetime.utcnow().isoformat(),
            "environment": settings.ENVIRONMENT,
            "version": "1.0.0"
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={
                "status": "unhealthy",
                "timestamp": datetime.utcnow().isoformat(),
                "detail": str(e)
            }
        )

# Root endpoint
@app.get("/")
async def root():
    return {
        "message": "Welcome to TY Credits Tracker API",
        "version": "1.0.0",
        "docs_url": "/docs"
    }

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(students.router, prefix="/api/students", tags=["Students"])
app.include_router(teachers.router, prefix="/api/teachers", tags=["Teachers"])
app.include_router(subjects.router, prefix="/api/subjects", tags=["Subjects"])
app.include_router(class_groups.router, prefix="/api/class-groups", tags=["Class Groups"])
app.include_router(credits.router, prefix="/api/credits", tags=["Credits"])
app.include_router(imports.router, prefix="/api/imports", tags=["CSV Imports"])
app.include_router(reports.router, prefix="/api/reports", tags=["Reports"])

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG,
        workers=settings.WORKERS_COUNT,
        log_level="info" if settings.DEBUG else "error"
    )
    
