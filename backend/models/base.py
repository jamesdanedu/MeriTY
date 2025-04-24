from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy import Column, Integer, DateTime, func
from sqlalchemy.orm import declared_attr


class CustomBase:
    """
    Custom base class for SQLAlchemy models with additional utilities
    """
    # Automatically generate table names from class names
    @declared_attr
    def __tablename__(cls):
        return cls.__name__.lower()

    # Primary key for all models
    id = Column(Integer, primary_key=True, index=True)

    # Timestamps for tracking creation and updates
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


# Create the base model class
Base = declarative_base(cls=CustomBase)
