from sqlalchemy import Column, String, Integer, ForeignKey
from sqlalchemy.orm import relationship
from .base import Base


class Student(Base):
    """
    Database model for students
    """
    __tablename__ = 'students'

    name = Column(String, nullable=False)
    email = Column(String, nullable=False, unique=True, index=True)
    class_group_id = Column(
        Integer, 
        ForeignKey('class_groups.id'), 
        nullable=True
    )

    # Relationships
    class_group = relationship(
        "ClassGroup", 
        back_populates="students"
    )

    subject_credits = relationship(
        "SubjectCredit", 
        back_populates="student", 
        cascade="all, delete-orphan"
    )

    work_experience_credits = relationship(
        "WorkExperienceCredit", 
        back_populates="student", 
        cascade="all, delete-orphan"
    )

    portfolio_credits = relationship(
        "PortfolioCredit", 
        back_populates="student", 
        cascade="all, delete-orphan"
    )

    attendance_credits = relationship(
        "AttendanceCredit", 
        back_populates="student", 
        cascade="all, delete-orphan"
    )

    def __repr__(self):
        return f"<Student {self.name} ({self.email})>"

    @property
    def total_credits(self):
        """
        Calculate total credits across all credit types
        """
        return (
            sum(credit.credits_earned for credit in self.subject_credits) +
            sum(credit.credits_earned for credit in self.work_experience_credits) +
            sum(credit.credits_earned for credit in self.portfolio_credits) +
            sum(credit.credits_earned for credit in self.attendance_credits)
        )