from typing import Optional, List
from pydantic import BaseModel, Field


# Enrollment Schemas
class StudentCreditBase(BaseModel):
    """Base schema for student credits"""
    student_id: int
    credits_earned: int = Field(0, ge=0, le=100)


class EnrollmentBase(StudentCreditBase):
    """Base enrollment schema"""
    subject_id: int
    term: Optional[str] = None


class EnrollmentCreate(EnrollmentBase):
    """Enrollment creation schema"""
    pass


class EnrollmentUpdate(BaseModel):
    """Enrollment update schema"""
    credits_earned: Optional[int] = None
    term: Optional[str] = None


class EnrollmentBulkCreate(BaseModel):
    """Bulk enrollment creation schema"""
    subject_id: int
    term: Optional[str] = None
    student_credits: List[StudentCreditBase]


# Work Experience Schemas
class WorkExperienceBase(StudentCreditBase):
    """Base work experience schema"""
    business: Optional[str] = None
    start_date: str
    end_date: str
    comments: Optional[str] = None


class WorkExperienceCreate(WorkExperienceBase):
    """Work experience creation schema"""
    pass


class WorkExperienceUpdate(BaseModel):
    """Work experience update schema"""
    business: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    credits_earned: Optional[int] = None
    comments: Optional[str] = None


class WorkExperienceBulkCreate(BaseModel):
    """Bulk work experience creation schema"""
    business: Optional[str] = None
    start_date: str
    end_date: str
    comments: Optional[str] = None
    student_credits: List[StudentCreditBase]


# Portfolio Schemas
class PortfolioBase(StudentCreditBase):
    """Base portfolio schema"""
    title: Optional[str] = None
    period: str
    interview_comments: Optional[str] = None
    feedback: Optional[str] = None


class PortfolioCreate(PortfolioBase):
    """Portfolio creation schema"""
    pass


class PortfolioUpdate(BaseModel):
    """Portfolio update schema"""
    credits_earned: Optional[int] = None
    title: Optional[str] = None
    period: Optional[str] = None
    interview_comments: Optional[str] = None
    feedback: Optional[str] = None


class PortfolioBulkCreate(BaseModel):
    """Bulk portfolio creation schema"""
    period: str
    interview_comments: Optional[str] = None
    feedback: Optional[str] = None
    student_credits: List[StudentCreditBase]


# Attendance Schemas
class AttendanceBase(StudentCreditBase):
    """Base attendance schema"""
    period: str
    comments: Optional[str] = None


class AttendanceCreate(AttendanceBase):
    """Attendance creation schema"""
    pass


class AttendanceUpdate(BaseModel):
    """Attendance update schema"""
    credits_earned: Optional[int] = None
    period: Optional[str] = None
    comments: Optional[str] = None


class AttendanceBulkCreate(BaseModel):
    """Bulk attendance creation schema"""
    period: str
    comments: Optional[str] = None
    student_credits: List[StudentCreditBase]
