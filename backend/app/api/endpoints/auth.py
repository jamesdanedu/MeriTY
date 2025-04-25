from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr
from typing import Optional

router = APIRouter()

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: Optional[int] = None
    email: EmailStr
    name: Optional[str] = None

@router.post("/login", response_model=UserResponse)
async def login(user_data: UserLogin):
    # Super basic mock authentication
    if user_data.email == "test@example.com" and user_data.password == "password":
        return UserResponse(
            id=1, 
            email=user_data.email, 
            name="Test User"
        )
    raise HTTPException(status_code=401, detail="Invalid credentials")

@router.get("/me")
async def get_current_user():
    # Mock current user endpoint
    return UserResponse(
        id=1, 
        email="test@example.com", 
        name="Test User"
    )

