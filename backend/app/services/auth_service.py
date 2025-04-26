# app/services/auth_service.py
from datetime import datetime, timedelta
import uuid
from typing import Optional, Dict, Any, Union

from fastapi import HTTPException, status
from pydantic import EmailStr

from app.core.config import settings
from app.core.security import verify_password, get_password_hash, create_access_token
from app.db import get_db
from app.models.teacher import Teacher, TeacherCreate

db = get_db()


async def get_teacher_by_email(email: str) -> Optional[Teacher]:
    """
    Get a teacher by email
    """
    try:
        response = db.table("teachers").select("*").eq("email", email.lower()).execute()
        if response.data and len(response.data) > 0:
            return Teacher(**response.data[0])
        return None
    except Exception as e:
        print(f"Error getting teacher by email: {e}")
        return None


async def get_teacher_by_id(teacher_id: int) -> Optional[Teacher]:
    """
    Get a teacher by ID
    """
    try:
        response = db.table("teachers").select("*").eq("id", teacher_id).execute()
        if response.data and len(response.data) > 0:
            return Teacher(**response.data[0])
        return None
    except Exception as e:
        print(f"Error getting teacher by ID: {e}")
        return None

async def authenticate_teacher(email: str, password: str) -> Optional[Teacher]:
    """
    Authenticate a teacher using email and password
    """
    try:
        print(f"Attempting to authenticate: {email}")
        
        # Get the teacher by email
        response = db.table("teachers").select("*").eq("email", email.lower()).execute()
        print(f"Database response: {response}")
        
        if not response.data or len(response.data) == 0:
            print(f"No teacher found with email: {email}")
            return None
            
        teacher_data = response.data[0]
        print(f"Teacher data: {teacher_data}")
        
        # Check if teacher is active
        if not teacher_data.get("is_active", False):
            print(f"Teacher is not active: {email}")
            return None
            
        # Verify password
        stored_password = teacher_data.get("hashed_password", "")
        print(f"Attempting to verify password")
        
        try:
            is_valid = verify_password(password, stored_password)
            print(f"Password verification result: {is_valid}")
            
            if not is_valid:
                return None
        except Exception as pwd_error:
            print(f"Password verification error: {pwd_error}")
            return None
        
        # Create Teacher model
        teacher = Teacher(**teacher_data)
        
        # Update last login timestamp
        now = datetime.utcnow()
        update_response = db.table("teachers").update({"last_login": now.isoformat()}).eq("id", teacher.id).execute()
        print(f"Update last_login response: {update_response}")
        
        # Update teacher object
        teacher.last_login = now
        
        return teacher
    except Exception as e:
        print(f"Error in authenticate_teacher: {e}")
        import traceback
        traceback.print_exc()
        return None
    

async def create_teacher(teacher_in: TeacherCreate, created_by_admin: bool = True) -> Teacher:
    """
    Create a new teacher
    """
    # Check if teacher with this email already exists
    existing_teacher = await get_teacher_by_email(teacher_in.email)
    if existing_teacher:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A teacher with this email already exists",
        )
    
    # Hash password
    hashed_password = get_password_hash(teacher_in.password)
    
    # Create teacher
    teacher_data = {
        "name": teacher_in.name,
        "email": teacher_in.email.lower(),
        "hashed_password": hashed_password,
        "is_admin": teacher_in.is_admin,
        "is_active": True,
        "password_changed": not created_by_admin  # If created by admin, password change required
    }
    
    response = db.table("teachers").insert(teacher_data).execute()
    
    if not response.data or len(response.data) == 0:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create teacher",
        )
    
    return Teacher(**response.data[0])

async def create_test_user() -> bool:
    """
    Create a test user for debugging purposes
    """
    try:
        # Hash a known password
        from app.core.security import get_password_hash
        hashed_pwd = get_password_hash("password001")
        
        # Create test user data
        test_user = {
            "name": "Test User",
            "email": "test@example.com",
            "hashed_password": hashed_pwd,
            "is_admin": True,
            "is_active": True,
            "password_changed": True
        }
        
        # Check if user already exists
        response = db.table("teachers").select("*").eq("email", "test@example.com").execute()
        if response.data and len(response.data) > 0:
            print("Test user already exists")
            return True
            
        # Insert test user
        insert_response = db.table("teachers").insert(test_user).execute()
        print(f"Test user creation response: {insert_response}")
        
        return True
    except Exception as e:
        print(f"Error creating test user: {e}")
        import traceback
        traceback.print_exc()
        return False
    

async def request_password_reset(email: str) -> Dict[str, Any]:
    """
    Request a password reset
    """
    teacher = await get_teacher_by_email(email)
    if not teacher or not teacher.is_active:
        # For security, don't reveal that the teacher doesn't exist
        return {"message": "If your email is registered, you will receive a password reset link"}
    
    # Create a reset token
    token = str(uuid.uuid4())
    expires_at = datetime.utcnow() + timedelta(hours=24)
    
    # Delete any existing tokens for this teacher
    db.table("password_resets").delete().eq("teacher_id", teacher.id).execute()
    
    # Create a new token
    token_data = {
        "teacher_id": teacher.id,
        "token": token,
        "expires_at": expires_at.isoformat()
    }
    
    response = db.table("password_resets").insert(token_data).execute()
    
    if not response.data or len(response.data) == 0:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create password reset token",
        )
    
    # In a real app, send an email with the reset link
    # For now, return the token for testing
    return {
        "message": "If your email is registered, you will receive a password reset link",
        "token": token  # Remove this in production
    }


async def reset_password(token: str, new_password: str) -> Dict[str, Any]:
    """
    Reset a password using a token
    """
    # Find the token
    now = datetime.utcnow().isoformat()
    response = db.table("password_resets").select("*").eq("token", token).gte("expires_at", now).execute()
    
    if not response.data or len(response.data) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired token",
        )
    
    reset_data = response.data[0]
    teacher_id = reset_data["teacher_id"]
    
    # Hash the new password
    hashed_password = get_password_hash(new_password)
    
    # Update the teacher's password
    update_data = {
        "hashed_password": hashed_password,
        "password_changed": True,
        "updated_at": now
    }
    
    db.table("teachers").update(update_data).eq("id", teacher_id).execute()
    
    # Delete the used token
    db.table("password_resets").delete().eq("id", reset_data["id"]).execute()
    
    return {"message": "Password has been reset successfully"}


async def change_password(
    teacher_id: int, current_password: str, new_password: str
) -> Dict[str, Any]:
    """
    Change a teacher's password
    """
    teacher = await get_teacher_by_id(teacher_id)
    if not teacher:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Teacher not found",
        )
    
    # Verify current password
    if not verify_password(current_password, teacher.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect",
        )
    
    # Hash the new password
    hashed_password = get_password_hash(new_password)
    
    # Update the password
    now = datetime.utcnow().isoformat()
    update_data = {
        "hashed_password": hashed_password,
        "password_changed": True,
        "updated_at": now
    }
    
    db.table("teachers").update(update_data).eq("id", teacher_id).execute()
    
    return {"message": "Password changed successfully"}


def create_access_token_for_teacher(teacher: Teacher) -> str:
    """
    Create an access token for a teacher
    """
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return create_access_token(
        subject=teacher.id, expires_delta=access_token_expires
    )
