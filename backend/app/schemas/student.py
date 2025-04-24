from typing import Optional, List, Dict
from pydantic import BaseModel, Field, validator


class SubjectBase(BaseModel):
    """Base subject schema with common attributes"""
    name: str = Field(..., description="Name of the subject")
    credit_value: int = Field(..., gt=0, le=100, description="Number of credits for the subject")
    academic_year_id: int = Field(..., description="ID of the associated academic year")
    type: str = Field('core', description="Type of subject (core, optional, short, other)")


class SubjectCreate(SubjectBase):
    """Subject creation schema"""
    @validator('type')
    def validate_type(cls, type):
        """Validate subject type"""
        valid_types = ['core', 'optional', 'short', 'other']
        if type not in valid_types:
            raise ValueError(f'Type must be one of: {", ".join(valid_types)}')
        return type


class SubjectUpdate(BaseModel):
    """Subject update schema"""
    name: Optional[str] = None
    credit_value: Optional[int] = None
    academic_year_id: Optional[int] = None
    type: Optional[str] = None

    @validator('type')
    def validate_type(cls, type):
        """Validate subject type"""
        if type is not None:
            valid_types = ['core', 'optional', 'short', 'other']
            if type not in valid_types:
                raise ValueError(f'Type must be one of: {", ".join(valid_types)}')
        return type


class SubjectInDB(SubjectBase):
    """Subject schema as stored in database"""
    id: int


class Subject(SubjectBase):
    """Public subject schema"""
    id: int
    academic_year_name: Optional[str] = None

    class Config:
        orm_mode = True


class SubjectWithEnrollments(Subject):
    """Detailed subject schema with enrollment information"""
    enrolled_students_count: Optional[int] = 0
    enrollments: List[Dict] = []


class SubjectImport(BaseModel):
    """Subject import schema for CSV import"""
    csv_content: str