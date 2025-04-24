from typing import Optional, List
from pydantic import BaseModel, Field


class ClassGroupBase(BaseModel):
    """Base class group schema with common attributes"""
    name: str = Field(..., description="Name of the class group")
    academic_year_id: int = Field(..., description="ID of the associated academic year")


class ClassGroupCreate(ClassGroupBase):
    """Class group creation schema"""
    pass


class ClassGroupUpdate(BaseModel):
    """Class group update schema"""
    name: Optional[str] = None
    academic_year_id: Optional[int] = None


class ClassGroupInDB(ClassGroupBase):
    """Class group schema as stored in database"""
    id: int


class ClassGroup(ClassGroupBase):
    """Public class group schema"""
    id: int
    academic_year_name: Optional[str] = None
    student_count: Optional[int] = 0

    class Config:
        orm_mode = True


class ClassGroupWithStats(ClassGroup):
    """Class group schema with additional statistics"""
    average_credits: Optional[float] = 0