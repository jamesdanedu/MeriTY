from datetime import timedelta
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from supabase.client import Client

from app.core.database import supabase
from app.core.config import settings
from app.core.security import (
    create_access_token,
    get_password_hash,
    verify_password,
    get_current_user
)
from app.schemas.user import (
    Token,
    UserLogin,
    UserPasswordUpdate,
    UserPasswordReset
)
from app.utils.email import send_password_reset_email

router = APIRouter()

def authenticate_user(email: str, password: str) -> Optional[dict]:
    """
    Authenticate a user against Supabase
    """
    try:
        # Get user from Supabase
        response = supabase.table("teachers") \
            .select("*") \
            .eq("email", email) \
            .single() \
            .execute()
        
        if response.error:
            return None
        
        user = response.data
        if not user:
            return None
        
        # Check if user is active
        if not user.get("is_active", True):
            return None
        
        # Verify password
        if not verify_password(password, user["hashed_password"]):
            return None
        
        return user
    except Exception as e:
        print(f"Authentication error: {str(e)}")
        return None

@router.post("/login", response_model=Token)
async def login_access_token(form_data: OAuth2PasswordRequestForm = Depends()) -> Any:
    """
    OAuth2 compatible token login, get an access token for future requests
    """
    user = authenticate_user(form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Create access token
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(user["id"])}, 
        expires_delta=access_token_expires
    )
    
    # Update last login timestamp
    try:
        supabase.table("teachers") \
            .update({"last_login": "now()"}) \
            .eq("id", user["id"]) \
            .execute()
    except Exception as e:
        print(f"Failed to update last login: {str(e)}")
    
    return {
        "access_token": access_token,
        "token_type": "bearer"
    }

@router.post("/login/json", response_model=Token)
async def login_json(login_data: UserLogin) -> Any:
    """
    JSON-based login endpoint (alternative to OAuth2 form-based login)
    """
    user = authenticate_user(login_data.email, login_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    # Create access token
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(user["id"])}, 
        expires_delta=access_token_expires
    )
    
    # Update last login timestamp
    try:
        supabase.table("teachers") \
            .update({"last_login": "now()"}) \
            .eq("id", user["id"]) \
            .execute()
    except Exception as e:
        print(f"Failed to update last login: {str(e)}")
    
    return {
        "access_token": access_token,
        "token_type": "bearer"
    }

@router.post("/change-password")
async def change_password(
    password_data: UserPasswordUpdate,
    current_user: dict = Depends(get_current_user)
) -> Any:
    """
    Change user password
    """
    try:
        # If first login (no current_password provided), don't verify current password
        if password_data.current_password is not None:
            # Verify current password
            if not verify_password(password_data.current_password, current_user["hashed_password"]):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Incorrect password"
                )
        
        # Update password
        hashed_password = get_password_hash(password_data.new_password)
        
        response = supabase.table("teachers") \
            .update({
                "hashed_password": hashed_password,
                "password_changed": True
            }) \
            .eq("id", current_user["id"]) \
            .execute()
        
        if response.error:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update password"
            )
        
        return {"message": "Password updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An unexpected error occurred: {str(e)}"
        )

@router.post("/reset-password")
async def reset_password(password_data: UserPasswordReset) -> Any:
    """
    Request password reset (sends email with reset token)
    """
    try:
        # Check if user exists
        response = supabase.table("teachers") \
            .select("*") \
            .eq("email", password_data.email) \
            .single() \
            .execute()
        
        if response.error or not response.data:
            # Don't reveal that email doesn't exist
            return {"message": "If your email exists in our system, a password reset link will be sent"}
        
        user = response.data
        
        # Generate reset token (valid for 30 minutes)
        reset_token_expires = timedelta(minutes=30)
        reset_token = create_access_token(
            data={"sub": str(user["id"]), "type": "password_reset"},
            expires_delta=reset_token_expires
        )
        
        # Store token in Supabase
        response = supabase.table("password_resets") \
            .insert({
                "teacher_id": user["id"],
                "token": reset_token,
                "expires_at": "now() + interval '30 minutes'"
            }) \
            .execute()
        
        if response.error:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create password reset token"
            )
        
        # Send email
        await send_password_reset_email(user["email"], user["name"], reset_token)
        
        return {"message": "If your email exists in our system, a password reset link will be sent"}
    except HTTPException:
        raise
    except Exception as e:
        # Log the error but don't reveal it to the user
        print(f"Password reset error: {str(e)}")
        return {"message": "If your email exists in our system, a password reset link will be sent"}
        
