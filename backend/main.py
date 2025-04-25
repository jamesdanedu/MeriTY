from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime

# Import your routers
from app.api.endpoints import (
    auth, 
    students, 
    teachers, 
    subjects, 
    class_groups, 
    credits, 
    imports, 
    reports
)

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

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(students.router, prefix="/api/students", tags=["Students"])
app.include_router(teachers.router, prefix="/api/teachers", tags=["Teachers"])
app.include_router(subjects.router, prefix="/api/subjects", tags=["Subjects"])
app.include_router(class_groups.router, prefix="/api/class-groups", tags=["Class Groups"])
app.include_router(credits.router, prefix="/api/credits", tags=["Credits"])
app.include_router(imports.router, prefix="/api/imports", tags=["CSV Imports"])
app.include_router(reports.router, prefix="/api/reports", tags=["Reports"])

