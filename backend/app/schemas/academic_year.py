from typing import Optional, List
from pydantic import BaseModel, Field, validator
from datetime import date


class AcademicYearBase(BaseModel):
    """Base academic year schema with common attributes"""
    name: str = Field(..., description="Name of the academic year (e.g., '2024-2025')")
    start_date: date = Field(..., description="Start date of the academic year")
    end_date: date = Field(..., description="End date of the academic year")


class AcademicYearCreate(AcademicYearBase):
    """Academic year creation schema"""
    @validator('end_date')
    def validate_dates(cls, end_date, values):
        """Ensure end date is after start date"""
        if 'start_date' in values and end_date <= values['start_date']:
            raise ValueError('End date must be after start date')
        return end_date


class AcademicYearUpdate(BaseModel):
    """Academic year update schema"""
    name: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None

    @validator('end_date')
    def validate_dates(cls, end_date, values):
        """Ensure end date is after start date when both are provided"""
        start_date = values.get('start_date')
        if end_date is not None and start_date is not None and end_date <= start_date:
            raise ValueError('End date must be after start date')
        return end_date


class AcademicYearInDB(AcademicYearBase):
    """Academic year schema as stored in database"""
    id: int


class AcademicYear(AcademicYearBase):
    """Public academic year schema"""
    id: int
    class_group_count: Optional[int] = 0

    class Config:
        orm_mode = True
