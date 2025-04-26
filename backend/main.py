# backend/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from app.core.config import settings
from app.api import auth

from pathlib import Path

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# Get CORS origins as a list
cors_origins = settings.get_cors_origins()
print(f"CORS origins: {cors_origins}")

# Set up CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins or ["*"],  # Fallback to all origins if none specified
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Include routers
app.include_router(auth.router, prefix=f"{settings.API_V1_STR}/auth", tags=["auth"])

# Determine the frontend directory path
# This handles both development (running from backend/) and production scenarios
frontend_dir = Path(__file__).parent.parent / "frontend"
if not frontend_dir.exists():
    # Try relative path for when running inside backend/
    frontend_dir = Path(__file__).parent.parent.parent / "frontend"

print(f"Mounting frontend files from: {frontend_dir}")
if frontend_dir.exists():
    # Mount the frontend static files
    app.mount("/", StaticFiles(directory=str(frontend_dir), html=True), name="frontend")
else:
    print(f"WARNING: Frontend directory not found at {frontend_dir}")

# For local development only (not used in Vercel)
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)