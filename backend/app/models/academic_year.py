from sqlalchemy import Column, String, Date
from sqlalchemy.orm import relationship
from .base import Base


class AcademicYear(Base):
    """
    Database model for academic years
    """
    __tablename__ = 'academic_years'

    name = Column(String, nullable=False, unique=True, index=True)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)

    # Relationships
    class_groups = relationship(
        "ClassGroup", 
        back_populates="academic_year", 
        cascade="all, delete-orphan"
    )
    subjects = relationship(
        "Subject", 
        back_populates="academic_year", 
        cascade="all, delete-orphan"
    )

    def __repr__(self):
        return f"<AcademicYear {self.name} ({self.start_date} - {self.end_date})>"
    