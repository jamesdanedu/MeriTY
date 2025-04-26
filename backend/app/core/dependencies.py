# app/core/dependencies.py
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt
from pydantic import ValidationError

from app.core.config import settings
from app.core.security import ALGORITHM, decode_token
from app.models.teacher import Teacher, TokenPayload
from app.services.auth_service import get_teacher_by_id

oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_STR}/auth/login"
)


async def get_current_teacher(
    token: str = Depends(oauth2_scheme)
) -> Teacher:
    """
    Get the current teacher from the token
    """
    try:
        payload = decode_token(token)
        token_data = TokenPayload(**payload)
        
        if token_data.sub is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
            
        teacher = await get_teacher_by_id(token_data.sub)
        
        if not teacher:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Teacher not found",
                headers={"WWW-Authenticate": "Bearer"},
            )
            
        if not teacher.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Inactive teacher",
                headers={"WWW-Authenticate": "Bearer"},
            )
            
        return teacher
    except (jwt.JWTError, ValidationError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_current_active_teacher(
    current_teacher: Teacher = Depends(get_current_teacher),
) -> Teacher:
    """
    Get the current active teacher
    """
    if not current_teacher.is_active:
        raise HTTPException(status_code=400, detail="Inactive teacher")
    return current_teacher


async def get_current_active_admin(
    current_teacher: Teacher = Depends(get_current_teacher),
) -> Teacher:
    """
    Get the current active admin
    """
    if not current_teacher.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="The teacher doesn't have enough privileges",
        )
    return current_teacher


async def check_password_changed(
    current_teacher: Teacher = Depends(get_current_teacher),
) -> Teacher:
    """
    Check if the teacher has changed their password
    """
    if not current_teacher.password_changed:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Password change required",
            headers={"X-Password-Change-Required": "True"},
        )
    return current_teacher
