from typing import Optional
from pydantic import BaseModel, EmailStr, Field, validator
import re


class UserBase(BaseModel):
    """Base user schema with common attributes"""
    name: str = Field(..., description="Full name of the user")
    email: EmailStr = Field(..., description="User's email address")
    is_admin: bool = False
    is_active: bool = True


class UserCreate(UserBase):
    """User creation schema"""
    password: Optional[str] = Field(
        None, 
        min_length=8, 
        description="Optional password (will be generated if not provided)"
    )

    @validator('password')
    def validate_password(cls, password):
        """Validate password strength if provided"""
        if password:
            # Check password complexity
            if len(password) < 8:
                raise ValueError('Password must be at least 8 characters long')
            
            # Optional additional complexity checks
            if not re.search(r'[A-Z]', password):
                raise ValueError('Password must contain at least one uppercase letter')
            if not re.search(r'[a-z]', password):
                raise ValueError('Password must contain at least one lowercase letter')
            if not re.search(r'\d', password):
                raise ValueError('Password must contain at least one number')
            if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
                raise ValueError('Password must contain at least one special character')
        
        return password


class UserUpdate(BaseModel):
    """User update schema"""
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    is_admin: Optional[bool] = None
    is_active: Optional[bool] = None


class UserPasswordUpdate(BaseModel):
    """Password update schema"""
    current_password: Optional[str] = None
    new_password: str = Field(..., min_length=8)

    @validator('new_password')
    def validate_new_password(cls, new_password):
        """Validate new password strength"""
        if len(new_password) < 8:
            raise ValueError('Password must be at least 8 characters long')
        
        # Optional additional complexity checks
        if not re.search(r'[A-Z]', new_password):
            raise ValueError('Password must contain at least one uppercase letter')
        if not re.search(r'[a-z]', new_password):
            raise ValueError('Password must contain at least one lowercase letter')
        if not re.search(r'\d', new_password):
            raise ValueError('Password must contain at least one number')
        if not re.search(r'[!@#$%^&*(),.?":{}|<>]', new_password):
            raise ValueError('Password must contain at least one special character')
        
        return new_password


class UserInDB(UserBase):
    """User schema as stored in database"""
    id: int
    hashed_password: str
    password_changed: bool = False
    last_login: Optional[str] = None


class User(UserBase):
    """Public user schema"""
    id: int
    
    class Config:
        orm_mode = True


class UserLogin(BaseModel):
    """User login schema"""
    email: EmailStr
    password: str


class UserPasswordReset(BaseModel):
    """Password reset request schema"""
    email: EmailStr


class UserPasswordResetComplete(BaseModel):
    """Complete password reset with token"""
    token: str
    new_password: str


class Token(BaseModel):
    """Token response schema"""
    access_token: str
    token_type: str


class TokenData(BaseModel):
    """Token data schema"""
    user_id: Optional[str] = None


class UserImport(BaseModel):
    """User import schema for CSV import"""
    csv_content: str