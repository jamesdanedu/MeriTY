from typing import Any, List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.core.database import supabase
from app.core.security import get_current_active_user
from app.schemas.student import Student
from app.schemas.subject import Subject

router = APIRouter()

class StudentReportRequest(BaseModel):
    student_id: int
    academic_year_id: int

class ClassGroupReportRequest(BaseModel):
    class_group_id: int
    academic_year_id: int

class AnnualReportRequest(BaseModel):
    academic_year_id: int
    include_detailed_reports: bool = True
    include_certificates: bool = True

@router.post("/student")
async def generate_student_report(
    report_request: StudentReportRequest,
    current_user: dict = Depends(get_current_active_user)
) -> Any:
    """
    Generate a comprehensive report for a specific student in a given academic year
    """
    # Validate student exists
    student_response = supabase.table("students").select("*").eq("id", report_request.student_id).execute()
    if not student_response.data or len(student_response.data) == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student not found"
        )
    
    # Validate academic year exists
    year_response = supabase.table("academic_years").select("*").eq("id", report_request.academic_year_id).execute()
    if not year_response.data or len(year_response.data) == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Academic year not found"
        )
    
    # Collect all credit information
    # Subject credits
    subject_credits_response = supabase.table("enrollments") \
        .select("*, subjects(name, credit_value)") \
        .eq("student_id", report_request.student_id) \
        .execute()
    
    # Work experience
    work_exp_response = supabase.table("work_experience") \
        .select("*") \
        .eq("student_id", report_request.student_id) \
        .execute()
    
    # Portfolio
    portfolio_response = supabase.table("portfolios") \
        .select("*") \
        .eq("student_id", report_request.student_id) \
        .execute()
    
    # Attendance
    attendance_response = supabase.table("attendance") \
        .select("*") \
        .eq("student_id", report_request.student_id) \
        .execute()
    
    # Prepare report data
    report_data = {
        "student": student_response.data[0],
        "academic_year": year_response.data[0],
        "subject_credits": subject_credits_response.data or [],
        "work_experience": work_exp_response.data or [],
        "portfolio": portfolio_response.data or [],
        "attendance": attendance_response.data or []
    }
    
    # In a real-world scenario, you might want to generate a PDF or more complex report
    return report_data

@router.post("/class-group")
async def generate_class_group_report(
    report_request: ClassGroupReportRequest,
    current_user: dict = Depends(get_current_active_user)
) -> Any:
    """
    Generate a report for all students in a specific class group
    """
    # Validate class group exists
    class_group_response = supabase.table("class_groups").select("*").eq("id", report_request.class_group_id).execute()
    if not class_group_response.data or len(class_group_response.data) == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Class group not found"
        )
    
    # Validate academic year exists
    year_response = supabase.table("academic_years").select("*").eq("id", report_request.academic_year_id).execute()
    if not year_response.data or len(year_response.data) == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Academic year not found"
        )
    
    # Get students in this class group
    students_response = supabase.table("students") \
        .select("*") \
        .eq("class_group_id", report_request.class_group_id) \
        .execute()
    
    # Collect credit information for each student
    students_reports = []
    for student in students_response.data or []:
        # Similar to student report, collect credit information
        subject_credits_response = supabase.table("enrollments") \
            .select("*, subjects(name, credit_value)") \
            .eq("student_id", student["id"]) \
            .execute()
        
        students_reports.append({
            "student": student,
            "subject_credits": subject_credits_response.data or []
        })
    
    return {
        "class_group": class_group_response.data[0],
        "academic_year": year_response.data[0],
        "students": students_reports
    }

@router.post("/annual")
async def generate_annual_reports(
    report_request: AnnualReportRequest,
    current_user: dict = Depends(get_current_active_user)
) -> Any:
    """
    Generate year-end reports and certificates for all students
    """
    # Validate academic year exists
    year_response = supabase.table("academic_years").select("*").eq("id", report_request.academic_year_id).execute()
    if not year_response.data or len(year_response.data) == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Academic year not found"
        )
    
    # Get all students in the academic year's class groups
    class_groups_response = supabase.table("class_groups").select("id").eq("academic_year_id", report_request.academic_year_id).execute()
    class_group_ids = [group["id"] for group in class_groups_response.data or []]
    
    students_response = supabase.table("students") \
        .select("*") \
        .in_("class_group_id", class_group_ids) \
        .execute()
    
    # Prepare annual reports for each student
    annual_reports = []
    for student in students_response.data or []:
        # Calculate total credits
        total_credits = await calculate_student_total_credits(student["id"])
        
        annual_reports.append({
            "student": student,
            "total_credits": total_credits,
            "generate_detailed_report": report_request.include_detailed_reports,
            "generate_certificate": report_request.include_certificates
        })
    
    return {
        "academic_year": year_response.data[0],
        "total_students": len(annual_reports),
        "reports": annual_reports
    }

async def calculate_student_total_credits(student_id: int) -> int:
    """
    Helper function to calculate total credits for a student
    """
    total_credits = 0
    
    # Subject credits
    enrollments_response = supabase.table("enrollments").select("credits_earned").eq("student_id", student_id).execute()
    total_credits += sum(e.get("credits_earned", 0) for e in enrollments_response.data or [])
    
    # Work experience credits
    work_exp_response = supabase.table("work_experience").select("credits_earned").eq("student_id", student_id).execute()
    total_credits += sum(e.get("credits_earned", 0) for e in work_exp_response.data or [])
    
    # Portfolio credits
    portfolio_response = supabase.table("portfolios").select("credits_earned").eq("student_id", student_id).execute()
    total_credits += sum(e.get("credits_earned", 0) for e in portfolio_response.data or [])
    
    # Attendance credits
    attendance_response = supabase.table("attendance").select("credits_earned").eq("student_id", student_id).execute()
    total_credits += sum(e.get("credits_earned", 0) for e in attendance_response.data or [])
    
    return total_credits