from sqlalchemy import Column, String, Integer, ForeignKey
from sqlalchemy.orm import relationship
from .base import Base


class ClassGroup(Base):
    """
    Database model for class groups
    """
    __tablename__ = 'class_groups'

    name = Column(String, nullable=False, index=True)
    academic_year_id = Column(
        Integer, 
        ForeignKey('academic_years.id'), 
        nullable=False
    )

    # Relationships
    academic_year = relationship(
        "AcademicYear", 
        back_populates="class_groups"
    )

    students = relationship(
        "Student", 
        back_populates="class_group", 
        cascade="all, delete-orphan"
    )

    def __repr__(self):
        return f"<ClassGroup {self.name}>"

    @property
    def student_count(self):
        """
        Calculate the number of students in this class group
        """
        return len(self.students)

    