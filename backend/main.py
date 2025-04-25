from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime

# Only import the auth router
from app.api.endpoints import auth

app = FastAPI()

# CORS middleware (kept from previous configuration)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:8000",
        "https://merity-frontend.vercel.app",
        "https://merity.vercel.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {
        "message": "Welcome to TY Credits Tracker API",
        "timestamp": datetime.utcnow().isoformat()
    }

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat()
    }

# Include only the auth router
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])

