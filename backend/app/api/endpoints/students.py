# Complete implementation of students.py endpoint

from typing import Any, List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import EmailStr

from app.core.database import supabase
from app.core.security import get_current_active_user
from app.schemas.student import (
    Student,
    StudentCreate,
    StudentUpdate,
    StudentWithCredits
)

router = APIRouter()

@router.get("/", response_model=List[Student])
async def get_students(
    class_group_id: Optional[int] = None,
    name: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    current_user: dict = Depends(get_current_active_user)
) -> Any:
    """
    Retrieve students with optional filtering by class group and name
    """
    query = supabase.table("students").select("*").order("name").range(skip, skip + limit)
    
    # Apply filters if provided
    if class_group_id:
        query = query.eq("class_group_id", class_group_id)
    
    if name:
        query = query.ilike("name", f"%{name}%")
    
    # Execute query
    response = query.execute()
    
    if response.data:
        students = response.data
        
        # Fetch class group names and calculate total credits for each student
        for student in students:
            # Get class group name
            if student.get("class_group_id"):
                class_response = supabase.table("class_groups").select("name").eq("id", student["class_group_id"]).execute()
                if class_response.data and len(class_response.data) > 0:
                    student["class_group_name"] = class_response.data[0]["name"]
            
            # Calculate total credits
            student["total_credits"] = await calculate_student_credits(student["id"])
    
    return response.data or []

@router.post("/", response_model=Student)
async def create_student(
    student_in: StudentCreate,
    current_user: dict = Depends(get_current_active_user)
) -> Any:
    """
    Create new student
    """
    # Check if email already exists
    response = supabase.table("students").select("*").eq("email", student_in.email).execute()
    
    if response.data and len(response.data) > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A student with this email already exists"
        )
    
    # Convert to dict
    student_data = student_in.dict()
    
    # Insert into database
    response = supabase.table("students").insert(student_data).execute()
    
    if not response.data or len(response.data) == 0:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create student"
        )
    
    return response.data[0]

@router.get("/{student_id}", response_model=StudentWithCredits)
async def get_student(
    student_id: int,
    current_user: dict = Depends(get_current_active_user)
) -> Any:
    """
    Get a specific student by ID with all credit information
    """
    response = supabase.table("students").select("*").eq("id", student_id).execute()
    
    if not response.data or len(response.data) == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student not found"
        )
    
    student = response.data[0]
    
    # Get class group name
    if student.get("class_group_id"):
        class_response = supabase.table("class_groups").select("name").eq("id", student["class_group_id"]).execute()
        if class_response.data and len(class_response.data) > 0:
            student["class_group_name"] = class_response.data[0]["name"]
    
    # Get subject enrollments and credits
    enrollments_response = supabase.table("enrollments").select("*").eq("student_id", student_id).execute()
    subject_credits = []
    
    if enrollments_response.data:
        for enrollment in enrollments_response.data:
            # Get subject details
            subject_response = supabase.table("subjects").select("*").eq("id", enrollment["subject_id"]).execute()
            if subject_response.data and len(subject_response.data) > 0:
                subject = subject_response.data[0]
                
                subject_credits.append({
                    "id": enrollment["id"],
                    "subject_id": subject["id"],
                    "subject_name": subject["name"],
                    "credits_possible": subject["credit_value"],
                    "credits_earned": enrollment["credits_earned"],
                    "is_core": subject["is_core"],
                    "term": enrollment.get("term")
                })
    
    student["subject_credits"] = subject_credits
    
    # Get work experience credits
    work_exp_response = supabase.table("work_experience").select("*").eq("student_id", student_id).execute()
    student["work_experience_credits"] = work_exp_response.data or []
    
    # Get portfolio credits
    portfolio_response = supabase.table("portfolios").select("*").eq("student_id", student_id).execute()
    student["portfolio_credits"] = portfolio_response.data or []
    
    # Get attendance credits
    attendance_response = supabase.table("attendance").select("*").eq("student_id", student_id).execute()
    student["attendance_credits"] = attendance_response.data or []
    
    # Calculate total credits
    student["total_credits"] = await calculate_student_credits(student_id)
    
    return student

@router.put("/{student_id}", response_model=Student)
async def update_student(
    student_id: int,
    student_in: StudentUpdate,
    current_user: dict = Depends(get_current_active_user)
) -> Any:
    """
    Update a student
    """
    # Check if student exists
    response = supabase.table("students").select("*").eq("id", student_id).execute()
    
    if not response.data or len(response.data) == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student not found"
        )
    
    # If email is being updated, check if it already exists for another student
    if student_in.email:
        email_response = supabase.table("students").select("*").eq("email", student_in.email).execute()
        
        if email_response.data and len(email_response.data) > 0:
            for student in email_response.data:
                if student["id"] != student_id:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="A student with this email already exists"
                    )
    
    # Update student data (only non-None fields)
    update_data = {k: v for k, v in student_in.dict().items() if v is not None}
    
    if update_data:
        response = supabase.table("students").update(update_data).eq("id", student_id).execute()
        
        if not response.data or len(response.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update student"
            )
    
    # Get updated student
    response = supabase.table("students").select("*").eq("id", student_id).execute()
    student = response.data[0]
    
    # Get class group name
    if student.get("class_group_id"):
        class_response = supabase.table("class_groups").select("name").eq("id", student["class_group_id"]).execute()
        if class_response.data and len(class_response.data) > 0:
            student["class_group_name"] = class_response.data[0]["name"]
    
    # Calculate total credits
    student["total_credits"] = await calculate_student_credits(student_id)
    
    return student

@router.delete("/{student_id}")
async def delete_student(
    student_id: int,
    current_user: dict = Depends(get_current_active_user)
) -> Any:
    """
    Delete a student
    """
    # Check if student exists
    response = supabase.table("students").select("*").eq("id", student_id).execute()
    
    if not response.data or len(response.data) == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student not found"
        )
    
    # Delete related records first
    supabase.table("enrollments").delete().eq("student_id", student_id).execute()
    supabase.table("work_experience").delete().eq("student_id", student_id).execute()
    supabase.table("portfolios").delete().eq("student_id", student_id).execute()
    supabase.table("attendance").delete().eq("student_id", student_id).execute()
    
    # Delete student
    response = supabase.table("students").delete().eq("id", student_id).execute()
    
    if not response.data or len(response.data) == 0:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete student"
        )
    
    return {"message": "Student deleted successfully"}

@router.get("/{student_id}/credits", response_model=dict)
async def get_student_credits(
    student_id: int,
    current_user: dict = Depends(get_current_active_user)
) -> Any:
    """
    Get all credits for a specific student
    """
    # Check if student exists
    student_response = supabase.table("students").select("*").eq("id", student_id).execute()
    
    if not student_response.data or len(student_response.data) == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student not found"
        )
    
    # Get subject enrollments
    enrollments_response = supabase.table("enrollments").select("*").eq("student_id", student_id).execute()
    
    # Get work experience
    work_exp_response = supabase.table("work_experience").select("*").eq("student_id", student_id).execute()
    
    # Get portfolio
    portfolio_response = supabase.table("portfolios").select("*").eq("student_id", student_id).execute()
    
    # Get attendance
    attendance_response = supabase.table("attendance").select("*").eq("student_id", student_id).execute()
    
    # Calculate total credits
    total_credits = await calculate_student_credits(student_id)
    
    return {
        "subject_credits": enrollments_response.data or [],
        "work_experience_credits": work_exp_response.data or [],
        "portfolio_credits": portfolio_response.data or [],
        "attendance_credits": attendance_response.data or [],
        "total_credits": total_credits
    }

async def calculate_student_credits(student_id: int) -> int:
    """
    Calculate the total credits earned by a student
    """
    total_credits = 0
    
    # Subject credits
    enrollments_response = supabase.table("enrollments").select("credits_earned").eq("student_id", student_id).execute()
    if enrollments_response.data:
        for enrollment in enrollments_response.data:
            total_credits += enrollment.get("credits_earned", 0) or 0
    
    # Work experience credits
    work_exp_response = supabase.table("work_experience").select("credits_earned").eq("student_id", student_id).execute()
    if work_exp_response.data:
        for work_exp in work_exp_response.data:
            total_credits += work_exp.get("credits_earned", 0) or 0
    
    # Portfolio credits
    portfolio_response = supabase.table("portfolios").select("credits_earned").eq("student_id", student_id).execute()
    if portfolio_response.data:
        for portfolio in portfolio_response.data:
            total_credits += portfolio.get("credits_earned", 0) or 0
    
    # Attendance credits
    attendance_response = supabase.table("attendance").select("credits_earned").eq("student_id", student_id).execute()
    if attendance_response.data:
        for attendance in attendance_response.data:
            total_credits += attendance.get("credits_earned", 0) or 0
    
    return total_credits