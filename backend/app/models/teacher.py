# app/models/teacher.py
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field


# Shared properties
class TeacherBase(BaseModel):
    email: Optional[EmailStr] = None
    name: Optional[str] = None
    is_admin: Optional[bool] = False
    is_active: Optional[bool] = True


# Properties to receive via API on creation
class TeacherCreate(TeacherBase):
    email: EmailStr
    name: str
    password: str


# Properties to receive via API on update
class TeacherUpdate(TeacherBase):
    password: Optional[str] = None


# Properties to return via API
class Teacher(TeacherBase):
    id: int
    hashed_password: str 
    password_changed: bool
    last_login: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Auth related models
class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenPayload(BaseModel):
    sub: Optional[int] = None


class Login(BaseModel):
    email: EmailStr
    password: str


class PasswordReset(BaseModel):
    email: EmailStr


class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str


class PasswordChange(BaseModel):
    current_password: str
    new_password: str