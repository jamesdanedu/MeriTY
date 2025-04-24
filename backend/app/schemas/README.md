# Pydantic Schemas for MeriTY Credits Tracker

## Overview
This directory contains Pydantic schema definitions for the MeriTY Credits Tracker application. These schemas provide data validation, serialization, and documentation for the application's data models.

## Schema Files

### User Management
- `user.py`: Schemas for user authentication, creation, and management
  - Includes schemas for login, password reset, token handling
  - Provides validation for user data and password complexity

### Student Management
- `student.py`: Schemas for student-related operations
  - Handles student creation, updates, and credit tracking
  - Supports CSV import functionality

### Subject Management
- `subject.py`: Schemas for academic subjects
  - Defines subject types (core, optional, short, other)
  - Validates subject creation and updates

### Academic Year Management
- `academic_year.py`: Schemas for tracking academic years
  - Validates date ranges and academic year information

### Class Group Management
- `class_group.py`: Schemas for class groups
  - Includes additional statistics tracking

### Credits Management
- `credit.py`: Comprehensive schemas for different credit types
  - Supports enrollments, work experience, portfolio, and attendance credits
  - Provides bulk creation and update schemas

## Key Features
- Comprehensive data validation
- Type hints and runtime type checking
- ORM mode for easy integration with database models
- Nested validation and complex type support

## Best Practices
- Use these schemas for input validation
- Leverage Pydantic's built-in serialization
- Implement custom validators for complex business logic

## Dependencies
- Requires Pydantic v2.x
- Python 3.8+

## Contributing
- Ensure new schemas follow existing patterns
- Add appropriate validators and field descriptions
- Maintain clear, descriptive naming conventions