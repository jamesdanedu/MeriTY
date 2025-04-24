from sqlalchemy import Column, String, Integer, ForeignKey, Enum
from sqlalchemy.orm import relationship
from .base import Base
import enum


class SubjectType(enum.Enum):
    """
    Enumeration for subject types
    """
    CORE = 'core'
    OPTIONAL = 'optional'
    SHORT = 'short'
    OTHER = 'other'


class Subject(Base):
    """
    Database model for academic subjects
    """
    __tablename__ = 'subjects'

    name = Column(String, nullable=False, index=True)
    credit_value = Column(Integer, nullable=False)
    type = Column(Enum(SubjectType), nullable=False, default=SubjectType.CORE)
    academic_year_id = Column(
        Integer, 
        ForeignKey('academic_years.id'), 
        nullable=False
    )

    # Relationships
    academic_year = relationship(
        "AcademicYear", 
        back_populates="subjects"
    )

    enrollments = relationship(
        "SubjectCredit", 
        back_populates="subject", 
        cascade="all, delete-orphan"
    )

    def __repr__(self):
        return f"<Subject {self.name} ({self.type.value}, {self.credit_value} credits)>"

    @property
    def enrolled_students_count(self):
        """
        Calculate the number of students enrolled in this subject
        """
        return len(self.enrollments)

