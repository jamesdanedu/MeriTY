from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.database import supabase
from app.core.security import get_current_active_user, get_current_admin_user, get_password_hash
from app.utils.csv_parser import (
    parse_students_csv,
    parse_subjects_csv,
    parse_teachers_csv,
    generate_temp_password,
    CSVParseError
)
from app.utils.email import send_welcome_email
from app.schemas.user import UserImport
from app.schemas.student import StudentImport
from app.schemas.subject import SubjectImport

router = APIRouter()


@router.post("/students")
async def import_students(
    import_data: StudentImport,
    current_user: dict = Depends(get_current_active_user)
) -> Any:
    """
    Import students from CSV
    """
    try:
        # Parse CSV
        students_data = parse_students_csv(import_data.csv_content)
        
        if not students_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No valid student data found in CSV"
            )
        
        # Process students
        processed_count = 0
        for student in students_data:
            name = student.get("Name")
            email = student.get("Email")
            class_group_name = student.get("Class Group")
            
            if not name or not email:
                continue  # Skip rows with missing required data
            
            # Check if student already exists
            existing = supabase.table("students").select("*").eq("email", email).execute()
            
            if existing.data and len(existing.data) > 0:
                # Update existing student
                student_id = existing.data[0]["id"]
                
                # Look up class group id if provided
                class_group_id = None
                if class_group_name:
                    class_group = supabase.table("class_groups").select("*").eq("name", class_group_name).execute()
                    if class_group.data and len(class_group.data) > 0:
                        class_group_id = class_group.data[0]["id"]
                
                # Update student
                update_data = {
                    "name": name
                }
                
                if class_group_id:
                    update_data["class_group_id"] = class_group_id
                
                supabase.table("students").update(update_data).eq("id", student_id).execute()
            else:
                # Create new student
                # Look up class group id if provided
                class_group_id = None
                if class_group_name:
                    class_group = supabase.table("class_groups").select("*").eq("name", class_group_name).execute()
                    if class_group.data and len(class_group.data) > 0:
                        class_group_id = class_group.data[0]["id"]
                
                # Insert student
                student_data = {
                    "name": name,
                    "email": email,
                    "class_group_id": class_group_id
                }
                
                supabase.table("students").insert(student_data).execute()
            
            processed_count += 1
        
        return {
            "message": f"Successfully processed {processed_count} students",
            "processed_count": processed_count
        }
        
    except CSVParseError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/subjects")
async def import_subjects(
    import_data: SubjectImport,
    current_user: dict = Depends(get_current_active_user)
) -> Any:
    """
    Import subjects from CSV
    """
    try:
        # Parse CSV
        subjects_data = parse_subjects_csv(import_data.csv_content)
        
        if not subjects_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No valid subject data found in CSV"
            )
        
        # Process subjects
        processed_count = 0
        for subject in subjects_data:
            name = subject.get("Name")
            credit_value = subject.get("Credit Value")
            is_core = subject.get("Is Core")
            academic_year_name = subject.get("Academic Year")
            
            if not name or not academic_year_name:
                continue  # Skip rows with missing required data
            
            # Look up academic year id
            academic_year = supabase.table("academic_years").select("*").eq("name", academic_year_name).execute()
            
            if not academic_year.data or len(academic_year.data) == 0:
                continue  # Skip if academic year not found
            
            academic_year_id = academic_year.data[0]["id"]
            
            # Check if subject already exists
            existing = supabase.table("subjects").select("*").eq("name", name).eq("academic_year_id", academic_year_id).execute()
            
            if existing.data and len(existing.data) > 0:
                # Update existing subject
                subject_id = existing.data[0]["id"]
                
                # Update subject
                update_data = {
                    "credit_value": credit_value,
                    "is_core": is_core
                }
                
                supabase.table("subjects").update(update_data).eq("id", subject_id).execute()
            else:
                # Create new subject
                subject_data = {
                    "name": name,
                    "credit_value": credit_value,
                    "is_core": is_core,
                    "academic_year_id": academic_year_id
                }
                
                supabase.table("subjects").insert(subject_data).execute()
            
            processed_count += 1
        
        return {
            "message": f"Successfully processed {processed_count} subjects",
            "processed_count": processed_count
        }
        
    except CSVParseError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/teachers")
async def import_teachers(
    import_data: UserImport,
    current_user: dict = Depends(get_current_admin_user)
) -> Any:
    """
    Import teachers from CSV (admin only)
    """
    try:
        # Parse CSV
        teachers_data = parse_teachers_csv(import_data.csv_content)
        
        if not teachers_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No valid teacher data found in CSV"
            )
        
        # Process teachers
        processed_count = 0
        email_results: Dict[str, Dict] = {}
        
        for teacher in teachers_data:
            name = teacher.get("Name")
            email = teacher.get("Email")
            is_admin = teacher.get("Is Admin")
            
            if not name or not email:
                continue  # Skip rows with missing required data
            
            # Check if teacher already exists
            existing = supabase.table("teachers").select("*").eq("email", email).execute()
            
            if existing.data and len(existing.data) > 0:
                # Update existing teacher
                teacher_id = existing.data[0]["id"]
                
                # Update teacher
                update_data = {
                    "name": name,
                    "is_admin": is_admin
                }
                
                supabase.table("teachers").update(update_data).eq("id", teacher_id).execute()
                
                email_results[email] = {
                    "status": "updated",
                    "message": "Teacher account updated"
                }
            else:
                # Create new teacher with temporary password
                temp_password = generate_temp_password()
                hashed_password = get_password_hash(temp_password)
                
                # Insert teacher
                teacher_data = {
                    "name": name,
                    "email": email,
                    "is_admin": is_admin,
                    "hashed_password": hashed_password,
                    "password_changed": False
                }
                
                response = supabase.table("teachers").insert(teacher_data).execute()
                
                if response.data and len(response.data) > 0:
                    # Send welcome email with temporary password
                    email_sent = await send_welcome_email(email, name, temp_password)
                    
                    if email_sent:
                        email_results[email] = {
                            "status": "created",
                            "message": "Teacher account created and welcome email sent"
                        }
                    else:
                        email_results[email] = {
                            "status": "created_no_email",
                            "message": "Teacher account created but failed to send welcome email"
                        }
            
            processed_count += 1
        
        return {
            "message": f"Successfully processed {processed_count} teachers",
            "processed_count": processed_count,
            "email_results": email_results
        }
        
    except CSVParseError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )