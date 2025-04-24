# SQLAlchemy Database Models for MeriTY Credits Tracker

## Overview
This directory contains SQLAlchemy ORM (Object-Relational Mapping) models for the MeriTY Credits Tracker application. These models define the database schema and relationships between different entities.

## Model Files

### Base Model
- `base.py`: Declarative base for all database models
  - Provides common configuration and utilities

### User Management
- `user.py`: User and authentication-related models
  - Defines User, PasswordReset, and related database tables

### Student Management
- `student.py`: Student-related database models
  - Tracks student information, class groups, and credits

### Subject Management
- `subject.py`: Academic subject models
  - Defines subject types and enrollment relationships

### Academic Year Management
- `academic_year.py`: Academic year tracking models
  - Manages academic year periods and associated records

### Credits Management
- `credits.py`: Models for different credit types
  - Supports enrollments, work experience, portfolio, and attendance credits

## Key Features
- SQLAlchemy ORM models
- Relationship definitions between models
- Type annotations and constraints
- Support for different credit tracking mechanisms

## Dependencies
- SQLAlchemy v2.x
- Python 3.8+

## Best Practices
- Use these models with SQLAlchemy sessions
- Leverage relationship definitions for efficient querying
- Maintain consistency with corresponding Pydantic schemas

## Contributing
- Ensure models align with schema definitions
- Use appropriate column types and constraints
- Document complex relationship logic