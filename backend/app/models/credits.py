from sqlalchemy import Column, String, Integer, ForeignKey, Date, Enum
from sqlalchemy.orm import relationship
from .base import Base
import enum


class CreditPeriod(enum.Enum):
    """
    Enumeration for credit periods
    """
    TERM_1 = 'Term 1'
    TERM_2 = 'Term 2'
    FULL_YEAR = 'Full Year'


class SubjectCredit(Base):
    """
    Database model for subject credits (enrollments)
    """
    __tablename__ = 'subject_credits'

    student_id = Column(
        Integer, 
        ForeignKey('students.id'), 
        nullable=False
    )
    subject_id = Column(
        Integer, 
        ForeignKey('subjects.id'), 
        nullable=False
    )
    teacher_id = Column(
        Integer, 
        ForeignKey('users.id'), 
        nullable=False
    )
    credits_earned = Column(Integer, nullable=False, default=0)
    term = Column(Enum(CreditPeriod), nullable=True)

    # Relationships
    student = relationship(
        "Student", 
        back_populates="subject_credits"
    )
    subject = relationship(
        "Subject", 
        back_populates="enrollments"
    )
    teacher = relationship(
        "User", 
        back_populates="subject_credits"
    )

    def __repr__(self):
        return f"<SubjectCredit {self.student_id} - {self.subject_id}: {self.credits_earned}>"


class WorkExperienceCredit(Base):
    """
    Database model for work experience credits
    """
    __tablename__ = 'work_experience_credits'

    student_id = Column(
        Integer, 
        ForeignKey('students.id'), 
        nullable=False
    )
    teacher_id = Column(
        Integer, 
        ForeignKey('users.id'), 
        nullable=False
    )
    business = Column(String, nullable=True)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    credits_earned = Column(Integer, nullable=False, default=0)
    comments = Column(String, nullable=True)

    # Relationships
    student = relationship(
        "Student", 
        back_populates="work_experience_credits"
    )
    teacher = relationship(
        "User", 
        back_populates="work_experience_credits"
    )

    def __repr__(self):
        return f"<WorkExperienceCredit {self.student_id}: {self.credits_earned} credits>"


class PortfolioCredit(Base):
    """
    Database model for portfolio credits
    """
    __tablename__ = 'portfolio_credits'

    student_id = Column(
        Integer, 
        ForeignKey('students.id'), 
        nullable=False
    )
    teacher_id = Column(
        Integer, 
        ForeignKey('users.id'), 
        nullable=False
    )
    period = Column(Enum(CreditPeriod), nullable=False)
    credits_earned = Column(Integer, nullable=False, default=0)
    title = Column(String, nullable=True)
    interview_comments = Column(String, nullable=True)
    feedback = Column(String, nullable=True)

    # Relationships
    student = relationship(
        "Student", 
        back_populates="portfolio_credits"
    )
    teacher = relationship(
        "User", 
        back_populates="portfolio_credits"
    )

    def __repr__(self):
        return f"<PortfolioCredit {self.student_id}: {self.credits_earned} credits>"


class AttendanceCredit(Base):
    """
    Database model for attendance credits
    """
    __tablename__ = 'attendance_credits'

    student_id = Column(
        Integer, 
        ForeignKey('students.id'), 
        nullable=False
    )
    teacher_id = Column(
        Integer, 
        ForeignKey('users.id'), 
        nullable=False
    )
    period = Column(Enum(CreditPeriod), nullable=False)
    credits_earned = Column(Integer, nullable=False, default=0)
    comments = Column(String, nullable=True)

    # Relationships
    student = relationship(
        "Student", 
        back_populates="attendance_credits"
    )
    teacher = relationship(
        "User", 
        back_populates="attendance_credits"
    )

    def __repr__(self):
        return f"<AttendanceCredit {self.student_id}: {self.credits_earned} credits>"

