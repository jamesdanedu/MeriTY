from typing import Any, List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr, Field

from app.core.database import supabase
from app.core.security import (
    get_current_active_user, 
    get_current_admin_user, 
    get_password_hash, 
    verify_password
)
from app.core.config import settings
from app.utils.email import send_welcome_email

router = APIRouter()

class TeacherBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    is_admin: bool = False
    is_active: bool = True

class TeacherCreate(TeacherBase):
    password: Optional[str] = None

class TeacherUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    email: Optional[EmailStr] = None
    is_admin: Optional[bool] = None
    is_active: Optional[bool] = None

class TeacherResponse(TeacherBase):
    id: int

    class Config:
        orm_mode = True

class TeacherSearchParams(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    is_admin: Optional[bool] = None
    is_active: Optional[bool] = None

@router.post("/", response_model=TeacherResponse)
async def create_teacher(
    teacher: TeacherCreate,
    current_user: dict = Depends(get_current_admin_user)
) -> Any:
    """
    Create a new teacher account (admin only)
    """
    # Check if email already exists
    existing_response = supabase.table("teachers").select("*").eq("email", teacher.email).execute()
    
    if existing_response.data and len(existing_response.data) > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A teacher with this email already exists"
        )
    
    # Prepare teacher data
    teacher_data = {
        "name": teacher.name,
        "email": teacher.email,
        "is_admin": teacher.is_admin,
        "is_active": teacher.is_active
    }
    
    # Handle password
    if teacher.password:
        # If password provided, hash it
        hashed_password = get_password_hash(teacher.password)
        teacher_data["hashed_password"] = hashed_password
        teacher_data["password_changed"] = True
    else:
        # Generate a temporary password if not provided
        import secrets
        temp_password = secrets.token_urlsafe(12)
        hashed_temp_password = get_password_hash(temp_password)
        teacher_data["hashed_password"] = hashed_temp_password
        teacher_data["password_changed"] = False
        
        # Send welcome email with temporary password
        try:
            await send_welcome_email(teacher.email, teacher.name, temp_password)
        except Exception as e:
            # Log the error but don't prevent account creation
            print(f"Failed to send welcome email: {e}")
    
    # Create teacher
    response = supabase.table("teachers").insert(teacher_data).execute()
    
    if not response.data or len(response.data) == 0:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create teacher account"
        )
    
    return response.data[0]

@router.get("/", response_model=List[TeacherResponse])
async def list_teachers(
    search: Optional[TeacherSearchParams] = None,
    skip: int = 0,
    limit: int = 100,
    current_user: dict = Depends(get_current_active_user)
) -> Any:
    """
    List teachers with optional filtering
    """
    # Build query
    query = supabase.table("teachers").select("*")
    
    # Apply filters if provided
    if search:
        if search.name:
            query = query.ilike("name", f"%{search.name}%")
        
        if search.email:
            query = query.ilike("email", f"%{search.email}%")
        
        if search.is_admin is not None:
            query = query.eq("is_admin", search.is_admin)
        
        if search.is_active is not None:
            query = query.eq("is_active", search.is_active)
    
    # Add pagination
    query = query.range(skip, skip + limit)
    
    # Execute query
    response = query.execute()
    
    return response.data or []

@router.get("/{teacher_id}", response_model=TeacherResponse)
async def get_teacher(
    teacher_id: int,
    current_user: dict = Depends(get_current_active_user)
) -> Any:
    """
    Get a specific teacher by ID
    """
    response = supabase.table("teachers").select("*").eq("id", teacher_id).execute()
    
    if not response.data or len(response.data) == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Teacher not found"
        )
    
    return response.data[0]

@router.put("/{teacher_id}", response_model=TeacherResponse)
async def update_teacher(
    teacher_id: int,
    teacher: TeacherUpdate,
    current_user: dict = Depends(get_current_admin_user)
) -> Any:
    """
    Update a teacher account (admin only)
    """
    # Check if teacher exists
    existing_response = supabase.table("teachers").select("*").eq("id", teacher_id).execute()
    
    if not existing_response.data or len(existing_response.data) == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Teacher not found"
        )
    
    # Prepare update data
    update_data = {}
    
    # Check if email is being updated
    if teacher.email:
        # Check if new email already exists for another teacher
        email_check = supabase.table("teachers").select("*").eq("email", teacher.email).execute()
        
        if email_check.data and len(email_check.data) > 0:
            # Ensure it's not the same teacher
            if email_check.data[0]['id'] != teacher_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Email already in use by another teacher"
                )
        
        update_data["email"] = teacher.email
    
    # Update other fields if provided
    if teacher.name is not None:
        update_data["name"] = teacher.name
    
    if teacher.is_admin is not None:
        update_data["is_admin"] = teacher.is_admin
    
    if teacher.is_active is not None:
        update_data["is_active"] = teacher.is_active
    
    # Perform update if there are changes
    if update_data:
        response = supabase.table("teachers").update(update_data).eq("id", teacher_id).execute()
        
        if not response.data or len(response.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update teacher account"
            )
        
        return response.data[0]
    
    # If no changes, return existing data
    return existing_response.data[0]

@router.delete("/{teacher_id}")
async def delete_teacher(
    teacher_id: int,
    current_user: dict = Depends(get_current_admin_user)
) -> Any:
    """
    Delete a teacher account (admin only)
    """
    # Prevent deleting the current user
    if current_user['id'] == teacher_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete your own account"
        )
    
    # Check if teacher exists
    existing_response = supabase.table("teachers").select("*").eq("id", teacher_id).execute()
    
    if not existing_response.data or len(existing_response.data) == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Teacher not found"
        )
    
    # Delete teacher
    response = supabase.table("teachers").delete().eq("id", teacher_id).execute()
    
    if not response.data or len(response.data) == 0:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete teacher account"
        )
    
    return {"message": "Teacher account deleted successfully"}

@router.post("/{teacher_id}/reset-password")
async def reset_teacher_password(
    teacher_id: int,
    current_user: dict = Depends(get_current_admin_user)
) -> Any:
    """
    Reset password for a teacher account (admin only)
    Generates a temporary password and sends a reset email
    """
    # Check if teacher exists
    existing_response = supabase.table("teachers").select("*").eq("id", teacher_id).execute()
    
    if not existing_response.data or len(existing_response.data) == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Teacher not found"
        )
    
    teacher = existing_response.data[0]
    
    # Generate temporary password
    import secrets
    temp_password = secrets.token_urlsafe(12)
    hashed_temp_password = get_password_hash(temp_password)
    
    # Update password in database
    update_response = supabase.table("teachers").update({
        "hashed_password": hashed_temp_password,
        "password_changed": False
    }).eq("id", teacher_id).execute()
    
    if not update_response.data or len(update_response.data) == 0:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to reset password"
        )
    
    # Send reset email
    try:
        await send_welcome_email(
            teacher['email'], 
            teacher['name'], 
            temp_password, 
            reset_password=True
        )
    except Exception as e:
        # Log the error but don't prevent the password reset
        print(f"Failed to send password reset email: {e}")
    
    return {
        "message": "Password reset successful. A reset link has been sent to the teacher's email.",
        "email_sent": True
    }

@router.get("/me")
async def get_current_teacher(
    current_user: dict = Depends(get_current_active_user)
) -> Any:
    """
    Get current logged-in teacher's information
    """
    # Remove sensitive information before returning
    safe_user = {
        "id": current_user['id'],
        "name": current_user['name'],
        "email": current_user['email'],
        "is_admin": current_user.get('is_admin', False),
        "is_active": current_user.get('is_active', True)
    }
    
    return safe_user

