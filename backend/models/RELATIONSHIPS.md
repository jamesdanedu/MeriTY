# Database Model Relationships in MeriTY Credits Tracker

## Core Relationships Overview

### Academic Year
- One-to-Many with Class Groups
- One-to-Many with Subjects

### Class Group
- Many-to-One with Academic Year
- One-to-Many with Students

### Student
- Many-to-One with Class Group
- One-to-Many relationships with:
  - Subject Credits
  - Work Experience Credits
  - Portfolio Credits
  - Attendance Credits

### Subject
- Many-to-One with Academic Year
- One-to-Many with Subject Credits

### Credit Types
- Many-to-One with Student
- Many-to-One with Teacher
- Additional specific relationships based on credit type

## Cascade and Delete Behaviors

### Deletion Cascades
- Deleting an Academic Year will:
  - Delete associated Class Groups
  - Delete associated Subjects
  - Trigger cascading deletions for related students and credits

- Deleting a Class Group will:
  - Remove students from the group
  - Not delete the students themselves

- Deleting a Student will:
  - Delete all associated credits

## Data Integrity Constraints

- Email uniqueness enforced
- Non-nullable fields for critical data
- Enum types for standardized categorization
- Calculated properties for derived data (e.g., total credits)

## Performance Considerations

- Indexed fields for frequent query columns
- Relationships optimized for common access patterns
- Enum types for efficient storage and querying of categorical data