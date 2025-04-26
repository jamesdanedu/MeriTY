# app/api/auth.py
from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException, status, Response, Cookie
from fastapi.security import OAuth2PasswordRequestForm

from app.core.dependencies import (
    get_current_active_teacher,
    get_current_active_admin,
    check_password_changed,
)
from app.models.teacher import (
    Teacher,
    TeacherCreate,
    Token,
    PasswordReset,
    PasswordResetConfirm,
    PasswordChange,
)
from app.services.auth_service import (
    authenticate_teacher,
    create_teacher,
    request_password_reset,
    reset_password,
    change_password,
    create_access_token_for_teacher,
)

from app.db import get_db
db = get_db()

router = APIRouter()


@router.post("/login", response_model=Dict[str, Any])
async def login(
    response: Response,
    form_data: OAuth2PasswordRequestForm = Depends()
) -> Any:
    """
    OAuth2 compatible token login, get an access token for future requests
    """
    teacher = await authenticate_teacher(
        email=form_data.username, password=form_data.password
    )
    if not teacher:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = create_access_token_for_teacher(teacher)
    
    # Set token as httpOnly cookie
    response.set_cookie(
        key="access_token",
        value=f"Bearer {access_token}",
        httponly=True,
        max_age=60 * 60 * 24 * 7,  # 7 days
        samesite="lax",
        secure=False,  # Set to True in production with HTTPS
    )
    
    return {
        "success": True,
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": teacher.id,
            "name": teacher.name,
            "email": teacher.email,
            "isAdmin": teacher.is_admin,
            "passwordChanged": teacher.password_changed
        }
    }


@router.post("/logout")
async def logout(response: Response) -> Dict[str, Any]:
    """
    Logout user by clearing the cookie
    """
    response.delete_cookie(key="access_token")
    return {"success": True, "message": "Logged out successfully"}


@router.post("/request-reset", response_model=Dict[str, Any])
async def request_password_reset_route(
    reset_data: PasswordReset,
) -> Any:
    """
    Request a password reset
    """
    result = await request_password_reset(email=reset_data.email)
    return {"success": True, **result}


@router.post("/reset-password", response_model=Dict[str, Any])
async def reset_password_route(
    reset_data: PasswordResetConfirm,
) -> Any:
    """
    Reset password
    """
    try:
        result = await reset_password(
            token=reset_data.token, new_password=reset_data.new_password
        )
        return {"success": True, **result}
    except HTTPException as e:
        return {"success": False, "message": e.detail}


@router.post("/change-password", response_model=Dict[str, Any])
async def change_password_route(
    password_data: PasswordChange,
    current_teacher: Teacher = Depends(get_current_active_teacher),
) -> Any:
    """
    Change password
    """
    try:
        result = await change_password(
            teacher_id=current_teacher.id,
            current_password=password_data.current_password,
            new_password=password_data.new_password,
        )
        return {"success": True, **result}
    except HTTPException as e:
        return {"success": False, "message": e.detail}


@router.post("/create-teacher", response_model=Dict[str, Any])
async def create_teacher_route(
    teacher_in: TeacherCreate,
    current_teacher: Teacher = Depends(get_current_active_admin),
) -> Any:
    """
    Create new teacher (admin only)
    """
    try:
        teacher = await create_teacher(teacher_in=teacher_in, created_by_admin=True)
        return {
            "success": True,
            "message": "Teacher created successfully",
            "teacher": {
                "id": teacher.id,
                "name": teacher.name,
                "email": teacher.email,
                "isAdmin": teacher.is_admin
            }
        }
    except HTTPException as e:
        return {"success": False, "message": e.detail}


@router.get("/me", response_model=Dict[str, Any])
async def read_users_me(
    current_teacher: Teacher = Depends(get_current_active_teacher),
) -> Any:
    """
    Get current teacher
    """
    return {
        "success": True,
        "user": {
            "id": current_teacher.id,
            "name": current_teacher.name,
            "email": current_teacher.email,
            "isAdmin": current_teacher.is_admin,
            "passwordChanged": current_teacher.password_changed
        }
    }


@router.get("/check-auth")
async def check_auth(
    access_token: str = Cookie(None)
) -> Dict[str, Any]:
    """
    Check if user is authenticated
    """
    if not access_token or not access_token.startswith("Bearer "):
        return {"authenticated": False}
    
    try:
        # This will throw an exception if the token is invalid
        token = access_token.split(" ")[1]
        from app.core.security import decode_token
        
        payload = decode_token(token)
        
        # Fetch teacher to check if active and password changed
        from app.services.auth_service import get_teacher_by_id
        
        teacher_id = payload["sub"]
        teacher = await get_teacher_by_id(int(teacher_id))
        
        if not teacher or not teacher.is_active:
            return {"authenticated": False}
        
        return {
            "authenticated": True,
            "passwordChanged": teacher.password_changed,
            "isAdmin": teacher.is_admin
        }
    except Exception:
        return {"authenticated": False}

@router.get("/debug")
async def debug():
    """
    Debug endpoint to check auth system
    """
    try:
        # Try to create a test user
        from app.services.auth_service import create_test_user
        test_user_created = await create_test_user()
        
        # Check database connection - use the correct syntax for Supabase
        db_response = db.table("teachers").select("*").execute()
        teacher_count = len(db_response.data) if db_response.data else 0
        
        # Get a sample of teacher fields if any exist
        sample_fields = list(db_response.data[0].keys()) if db_response.data and len(db_response.data) > 0 else []
        
        # Check settings
        from app.core.config import settings
        
        return {
            "test_user_created": test_user_created,
            "db_connection": "OK",
            "teacher_count": teacher_count,
            "sample_fields": sample_fields,
            "jwt_secret": f"{settings.SECRET_KEY[:5]}..." if settings.SECRET_KEY else "Not set",
            "api_base": settings.API_V1_STR
        }
    except Exception as e:
        import traceback
        error_traceback = traceback.format_exc()
        return {
            "error": str(e),
            "traceback": error_traceback
        }
    