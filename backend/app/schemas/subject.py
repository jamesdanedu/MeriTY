from typing import Optional, List
from pydantic import BaseModel


class SubjectBase(BaseModel):
    """Base subject schema with common attributes"""
    name: str
    credit_value: int
    is_core: bool = False
    academic_year_id: int


class SubjectCreate(SubjectBase):
    """Subject creation schema"""
    pass


class SubjectUpdate(BaseModel):
    """Subject update schema"""
    name: Optional[str] = None
    credit_value: Optional[int] = None
    is_core: Optional[bool] = None
    academic_year_id: Optional[int] = None


class SubjectInDB(SubjectBase):
    """Subject schema as stored in database"""
    id: int


class Subject(SubjectBase):
    """Public subject schema"""
    id: int
    academic_year_name: Optional[str] = None
    
    class Config:
        orm_mode = True


class SubjectImport(BaseModel):
    """Subject import schema"""
    csv_content: str


# Enrollment (Student-Subject relationship with credits)
class EnrollmentBase(BaseModel):
    """Base enrollment schema"""
    student_id: int
    subject_id: int
    credits_earned: Optional[int] = 0


class EnrollmentCreate(EnrollmentBase):
    """Enrollment creation schema"""
    pass


class EnrollmentUpdate(BaseModel):
    """Enrollment update schema"""
    credits_earned: int


class EnrollmentInDB(EnrollmentBase):
    """Enrollment schema as stored in database"""
    id: int


class Enrollment(EnrollmentBase):
    """Public enrollment schema"""
    id: int
    student_name: Optional[str] = None
    subject_name: Optional[str] = None
    
    class Config:
        orm_mode = True


# Work Experience
class WorkExperienceBase(BaseModel):
    """Base work experience schema"""
    student_id: int
    company: str
    start_date: str
    end_date: str
    credits_earned: Optional[int] = 0


class WorkExperienceCreate(WorkExperienceBase):
    """Work experience creation schema"""
    pass


class WorkExperienceUpdate(BaseModel):
    """Work experience update schema"""
    company: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    credits_earned: Optional[int] = None


class WorkExperienceInDB(WorkExperienceBase):
    """Work experience schema as stored in database"""
    id: int


class WorkExperience(WorkExperienceBase):
    """Public work experience schema"""
    id: int
    student_name: Optional[str] = None
    
    class Config:
        orm_mode = True


# Portfolio
class PortfolioBase(BaseModel):
    """Base portfolio schema"""
    student_id: int
    title: str
    submission_date: str
    credits_earned: Optional[int] = 0


class PortfolioCreate(PortfolioBase):
    """Portfolio creation schema"""
    pass


class PortfolioUpdate(BaseModel):
    """Portfolio update schema"""
    title: Optional[str] = None
    submission_date: Optional[str] = None
    credits_earned: Optional[int] = None


class PortfolioInDB(PortfolioBase):
    """Portfolio schema as stored in database"""
    id: int


class Portfolio(PortfolioBase):
    """Public portfolio schema"""
    id: int
    student_name: Optional[str] = None
    
    class Config:
        orm_mode = True