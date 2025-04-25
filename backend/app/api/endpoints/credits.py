from typing import Any, List, Optional

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.database import supabase
from app.core.security import get_current_active_user
from app.schemas.credit import (
    EnrollmentCreate,
    EnrollmentUpdate,
    EnrollmentBulkCreate,
    WorkExperienceCreate,
    WorkExperienceUpdate,
    WorkExperienceBulkCreate,
    PortfolioCreate,
    PortfolioUpdate,
    PortfolioBulkCreate,
    AttendanceCreate,
    AttendanceUpdate,
    AttendanceBulkCreate
)

router = APIRouter()

# Subject enrollments endpoints
@router.post("/enrollments", response_model=dict)
async def create_enrollment(
    enrollment_in: EnrollmentCreate,
    current_user: dict = Depends(get_current_active_user)
) -> Any:
    """
    Create a new enrollment (assign subject credits to a student)
    """
    # Validate student exists
    student_response = supabase.table("students").select("*").eq("id", enrollment_in.student_id).execute()
    if not student_response.data or len(student_response.data) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Student not found"
        )
    
    # Validate subject exists
    subject_response = supabase.table("subjects").select("*").eq("id", enrollment_in.subject_id).execute()
    if not subject_response.data or len(subject_response.data) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Subject not found"
        )
    
    subject = subject_response.data[0]
    
    # Validate credits are within range
    if enrollment_in.credits_earned < 0 or enrollment_in.credits_earned > subject["credit_value"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Credits must be between 0 and {subject['credit_value']}"
        )
    
    # Check if enrollment already exists
    existing_response = supabase.table("enrollments") \
        .select("*") \
        .eq("student_id", enrollment_in.student_id) \
        .eq("subject_id", enrollment_in.subject_id) \
        .execute()
    
    if existing_response.data and len(existing_response.data) > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Enrollment already exists. Use the update endpoint to modify it."
        )
    
    # Create enrollment
    enrollment_data = enrollment_in.dict()
    
    # Add teacher_id from the current user
    enrollment_data["teacher_id"] = current_user["id"]
    
    response = supabase.table("enrollments").insert(enrollment_data).execute()
    
    if not response.data or len(response.data) == 0:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create enrollment"
        )
    
    return {
        "message": "Enrollment created successfully",
        "enrollment": response.data[0]
    }

@router.post("/enrollments/bulk", response_model=dict)
async def create_enrollments_bulk(
    enrollments_in: EnrollmentBulkCreate,
    current_user: dict = Depends(get_current_active_user)
) -> Any:
    """
    Create multiple enrollments at once
    """
    # Validate subject exists
    subject_response = supabase.table("subjects").select("*").eq("id", enrollments_in.subject_id).execute()
    if not subject_response.data or len(subject_response.data) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Subject not found"
        )
    
    subject = subject_response.data[0]
    
    # Process each student
    created_count = 0
    updated_count = 0
    errors = []
    
    for student_credit in enrollments_in.student_credits:
        # Validate student exists
        student_response = supabase.table("students").select("*").eq("id", student_credit.student_id).execute()
        if not student_response.data or len(student_response.data) == 0:
            errors.append(f"Student with ID {student_credit.student_id} not found")
            continue
        
        # Validate credits are within range
        if student_credit.credits_earned < 0 or student_credit.credits_earned > subject["credit_value"]:
            errors.append(f"Credits for student {student_credit.student_id} must be between 0 and {subject['credit_value']}")
            continue
        
        # Check if enrollment already exists
        existing_response = supabase.table("enrollments") \
            .select("*") \
            .eq("student_id", student_credit.student_id) \
            .eq("subject_id", enrollments_in.subject_id) \
            .execute()
        
        if existing_response.data and len(existing_response.data) > 0:
            # Update existing enrollment
            enrollment_id = existing_response.data[0]["id"]
            
            update_data = {
                "credits_earned": student_credit.credits_earned,
                "teacher_id": current_user["id"]
            }
            
            # Add term if provided
            if enrollments_in.term:
                update_data["term"] = enrollments_in.term
            
            update_response = supabase.table("enrollments").update(update_data).eq("id", enrollment_id).execute()
            
            if update_response.data and len(update_response.data) > 0:
                updated_count += 1
            else:
                errors.append(f"Failed to update enrollment for student {student_credit.student_id}")
        else:
            # Create new enrollment
            enrollment_data = {
                "student_id": student_credit.student_id,
                "subject_id": enrollments_in.subject_id,
                "credits_earned": student_credit.credits_earned,
                "teacher_id": current_user["id"]
            }
            
            # Add term if provided
            if enrollments_in.term:
                enrollment_data["term"] = enrollments_in.term
            
            create_response = supabase.table("enrollments").insert(enrollment_data).execute()
            
            if create_response.data and len(create_response.data) > 0:
                created_count += 1
            else:
                errors.append(f"Failed to create enrollment for student {student_credit.student_id}")
    
    return {
        "message": f"Processed {len(enrollments_in.student_credits)} enrollments. Created {created_count}, updated {updated_count}, with {len(errors)} errors.",
        "created_count": created_count,
        "updated_count": updated_count,
        "errors": errors
    }

@router.put("/enrollments/{enrollment_id}", response_model=dict)
async def update_enrollment(
    enrollment_id: int,
    enrollment_in: EnrollmentUpdate,
    current_user: dict = Depends(get_current_active_user)
) -> Any:
    """
    Update an existing enrollment
    """
    # Check if enrollment exists
    enrollment_response = supabase.table("enrollments").select("*").eq("id", enrollment_id).execute()
    
    if not enrollment_response.data or len(enrollment_response.data) == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Enrollment not found"
        )
    
    enrollment = enrollment_response.data[0]
    
    # Get subject max credits
    subject_response = supabase.table("subjects").select("*").eq("id", enrollment["subject_id"]).execute()
    
    if not subject_response.data or len(subject_response.data) == 0:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Associated subject not found"
        )
    
    max_credits = subject_response.data[0]["credit_value"]
    
    # Validate credits are within range
    if enrollment_in.credits_earned < 0 or enrollment_in.credits_earned > max_credits:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Credits must be between 0 and {max_credits}"
        )
    
    # Update enrollment
    update_data = {
        "credits_earned": enrollment_in.credits_earned,
        "teacher_id": current_user["id"]
    }
    
    # Update term if provided
    if enrollment_in.term is not None:
        update_data["term"] = enrollment_in.term
    
    response = supabase.table("enrollments").update(update_data).eq("id", enrollment_id).execute()
    
    if not response.data or len(response.data) == 0:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update enrollment"
        )
    
    return {
        "message": "Enrollment updated successfully",
        "enrollment": response.data[0]
    }

@router.delete("/enrollments/{enrollment_id}", response_model=dict)
async def delete_enrollment(
    enrollment_id: int,
    current_user: dict = Depends(get_current_active_user)
) -> Any:
    """
    Delete an enrollment
    """
    # Check if enrollment exists
    enrollment_response = supabase.table("enrollments").select("*").eq("id", enrollment_id).execute()
    
    if not enrollment_response.data or len(enrollment_response.data) == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Enrollment not found"
        )
    
    # Delete enrollment
    response = supabase.table("enrollments").delete().eq("id", enrollment_id).execute()
    
    if not response.data or len(response.data) == 0:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete enrollment"
        )
    
    return {
        "message": "Enrollment deleted successfully"
    }

# Work Experience endpoints
@router.post("/work-experience", response_model=dict)
async def create_work_experience(
    work_exp_in: WorkExperienceCreate,
    current_user: dict = Depends(get_current_active_user)
) -> Any:
    """
    Create a new work experience record
    """
    # Validate student exists
    student_response = supabase.table("students").select("*").eq("id", work_exp_in.student_id).execute()
    if not student_response.data or len(student_response.data) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Student not found"
        )
    
    # Validate date range
    if work_exp_in.start_date >= work_exp_in.end_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Start date must be before end date"
        )
    
    # Validate credits
    if work_exp_in.credits_earned < 0 or work_exp_in.credits_earned > 100:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Credits must be between 0 and 100"
        )
    
    # Create work experience record
    work_exp_data = work_exp_in.dict()
    
    # Add teacher_id from current user
    work_exp_data["teacher_id"] = current_user["id"]
    
    response = supabase.table("work_experience").insert(work_exp_data).execute()
    
    if not response.data or len(response.data) == 0:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create work experience record"
        )
    
    return {
        "message": "Work experience record created successfully",
        "work_experience": response.data[0]
    }

@router.post("/work-experience/bulk", response_model=dict)
async def create_work_experience_bulk(
    work_exp_in: WorkExperienceBulkCreate,
    current_user: dict = Depends(get_current_active_user)
) -> Any:
    """
    Create work experience records for multiple students
    """
    # Validate date range
    if work_exp_in.start_date >= work_exp_in.end_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Start date must be before end date"
        )
    
    # Process each student
    created_count = 0
    errors = []
    
    for student_credit in work_exp_in.student_credits:
        # Validate student exists
        student_response = supabase.table("students").select("*").eq("id", student_credit.student_id).execute()
        if not student_response.data or len(student_response.data) == 0:
            errors.append(f"Student with ID {student_credit.student_id} not found")
            continue
        
        # Validate credits
        if student_credit.credits_earned < 0 or student_credit.credits_earned > 100:
            errors.append(f"Credits for student {student_credit.student_id} must be between 0 and 100")
            continue
        
        # Create work experience record
        work_exp_data = {
            "student_id": student_credit.student_id,
            "business": work_exp_in.business or "Work Experience Placement",
            "start_date": work_exp_in.start_date,
            "end_date": work_exp_in.end_date,
            "credits_earned": student_credit.credits_earned,
            "teacher_id": current_user["id"]
        }
        
        # Add comments if provided
        if work_exp_in.comments:
            work_exp_data["comments"] = work_exp_in.comments
        
        create_response = supabase.table("work_experience").insert(work_exp_data).execute()
        
        if create_response.data and len(create_response.data) > 0:
            created_count += 1
        else:
            errors.append(f"Failed to create work experience record for student {student_credit.student_id}")
    
    return {
        "message": f"Processed {len(work_exp_in.student_credits)} work experience records. Created {created_count}, with {len(errors)} errors.",
        "created_count": created_count,
        "errors": errors
    }

@router.put("/work-experience/{work_exp_id}", response_model=dict)
async def update_work_experience(
    work_exp_id: int,
    work_exp_in: WorkExperienceUpdate,
    current_user: dict = Depends(get_current_active_user)
) -> Any:
    """
    Update an existing work experience record
    """
    # Check if record exists
    work_exp_response = supabase.table("work_experience").select("*").eq("id", work_exp_id).execute()
    
    if not work_exp_response.data or len(work_exp_response.data) == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Work experience record not found"
        )
    
    work_exp = work_exp_response.data[0]
    
    # Prepare update data
    update_data = {k: v for k, v in work_exp_in.dict().items() if v is not None}
    
    # Add teacher_id from current user
    update_data["teacher_id"] = current_user["id"]
    
    # Validate date range if both dates are provided
    if "start_date" in update_data and "end_date" in update_data:
        if update_data["start_date"] >= update_data["end_date"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Start date must be before end date"
            )
    # Check if only start_date is provided
    elif "start_date" in update_data:
        if update_data["start_date"] >= work_exp["end_date"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Start date must be before end date"
            )
    # Check if only end_date is provided
    elif "end_date" in update_data:
        if work_exp["start_date"] >= update_data["end_date"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Start date must be before end date"
            )
    
    # Validate credits if provided
    if "credits_earned" in update_data:
        if update_data["credits_earned"] < 0 or update_data["credits_earned"] > 100:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Credits must be between 0 and 100"
            )
    
    # Update record
    response = supabase.table("work_experience").update(update_data).eq("id", work_exp_id).execute()
    
    if not response.data or len(response.data) == 0:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update work experience record"
        )
    
    return {
        "message": "Work experience record updated successfully",
        "work_experience": response.data[0]
    }

@router.delete("/work-experience/{work_exp_id}", response_model=dict)
async def delete_work_experience(
    work_exp_id: int,
    current_user: dict = Depends(get_current_active_user)
) -> Any:
    """
    Delete a work experience record
    """
    # Check if record exists
    work_exp_response = supabase.table("work_experience").select("*").eq("id", work_exp_id).execute()
    
    if not work_exp_response.data or len(work_exp_response.data) == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Work experience record not found"
        )
    
    # Delete record
    response = supabase.table("work_experience").delete().eq("id", work_exp_id).execute()
    
    if not response.data or len(response.data) == 0:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete work experience record"
        )
    
    return {
        "message": "Work experience record deleted successfully"
    }

# Portfolio endpoints
@router.post("/portfolio", response_model=dict)
async def create_portfolio(
    portfolio_in: PortfolioCreate,
    current_user: dict = Depends(get_current_active_user)
) -> Any:
    """
    Create a new portfolio record
    """
    # Validate student exists
    student_response = supabase.table("students").select("*").eq("id", portfolio_in.student_id).execute()
    if not student_response.data or len(student_response.data) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Student not found"
        )
    
    # Validate period
    valid_periods = ["Term 1", "Term 2", "Full Year"]
    if portfolio_in.period not in valid_periods:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid period. Must be one of: {', '.join(valid_periods)}"
        )
    
    # Validate credits
    if portfolio_in.credits_earned < 0 or portfolio_in.credits_earned > 100:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Credits must be between 0 and 100"
        )
    
    # Check if portfolio record already exists for this student and period
    existing_response = supabase.table("portfolios") \
        .select("*") \
        .eq("student_id", portfolio_in.student_id) \
        .eq("period", portfolio_in.period) \
        .execute()
    
    if existing_response.data and len(existing_response.data) > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Portfolio record for {portfolio_in.period} already exists for this student. Use the update endpoint."
        )
    
    # Create portfolio record
    portfolio_data = portfolio_in.dict()
    
    # Add teacher_id from current user
    portfolio_data["teacher_id"] = current_user["id"]
    
    response = supabase.table("portfolios").insert(portfolio_data).execute()
    
    if not response.data or len(response.data) == 0:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create portfolio record"
        )
    
    return {
        "message": "Portfolio record created successfully",
        "portfolio": response.data[0]
    }

@router.post("/portfolio/bulk", response_model=dict)
async def create_portfolio_bulk(
    portfolio_in: PortfolioBulkCreate,
    current_user: dict = Depends(get_current_active_user)
) -> Any:
    """
    Create portfolio records for multiple students
    """
    # Validate period
    valid_periods = ["Term 1", "Term 2", "Full Year"]
    if portfolio_in.period not in valid_periods:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid period. Must be one of: {', '.join(valid_periods)}"
        )
    
    # Process each student
    created_count = 0
    updated_count = 0
    errors = []
    
    for student_credit in portfolio_in.student_credits:
        # Validate student exists
        student_response = supabase.table("students").select("*").eq("id", student_credit.student_id).execute()
        if not student_response.data or len(student_response.data) == 0:
            errors.append(f"Student with ID {student_credit.student_id} not found")
            continue
        
        # Validate credits
        if student_credit.credits_earned < 0 or student_credit.credits_earned > 100:
            errors.append(f"Credits for student {student_credit.student_id} must be between 0 and 100")
            continue
        
        # Check if portfolio record already exists for this student and period
        existing_response = supabase.table("portfolios") \
            .select("*") \
            .eq("student_id", student_credit.student_id) \
            .eq("period", portfolio_in.period) \
            .execute()
        
        if existing_response.data and len(existing_response.data) > 0:
            # Update existing record
            portfolio_id = existing_response.data[0]["id"]
            
            update_data = {
                "credits_earned": student_credit.credits_earned,
                "teacher_id": current_user["id"]
            }
            
            # Add comments and feedback if provided
            if portfolio_in.interview_comments:
                update_data["interview_comments"] = portfolio_in.interview_comments
            
            if portfolio_in.feedback:
                update_data["feedback"] = portfolio_in.feedback
            
            update_response = supabase.table("portfolios").update(update_data).eq("id", portfolio_id).execute()
            
            if update_response.data and len(update_response.data) > 0:
                updated_count += 1
            else:
                errors.append(f"Failed to update portfolio record for student {student_credit.student_id}")
        else:
            # Create new record
            portfolio_data = {
                "student_id": student_credit.student_id,
                "period": portfolio_in.period,
                "credits_earned": student_credit.credits_earned,
                "teacher_id": current_user["id"]
            }
            
            # Add comments and feedback if provided
            if portfolio_in.interview_comments:
                portfolio_data["interview_comments"] = portfolio_in.interview_comments
            
            if portfolio_in.feedback:
                portfolio_data["feedback"] = portfolio_in.feedback
            
            create_response = supabase.table("portfolios").insert(portfolio_data).execute()
            
            if create_response.data and len(create_response.data) > 0:
                created_count += 1
            else:
                errors.append(f"Failed to create portfolio record for student {student_credit.student_id}")
    
    return {
        "message": f"Processed {len(portfolio_in.student_credits)} portfolio records. Created {created_count}, updated {updated_count}, with {len(errors)} errors.",
        "created_count": created_count,
        "updated_count": updated_count,
        "errors": errors
    }

@router.put("/portfolio/{portfolio_id}", response_model=dict)
async def update_portfolio(
    portfolio_id: int,
    portfolio_in: PortfolioUpdate,
    current_user: dict = Depends(get_current_active_user)
) -> Any:
    """
    Update an existing portfolio record
    """
    # Check if record exists
    portfolio_response = supabase.table("portfolios").select("*").eq("id", portfolio_id).execute()
    
    if not portfolio_response.data or len(portfolio_response.data) == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Portfolio record not found"
        )
    
    # Prepare update data
    update_data = {k: v for k, v in portfolio_in.dict().items() if v is not None}
    
    # Add teacher_id from current user
    update_data["teacher_id"] = current_user["id"]
    
    # Validate period if provided
    if "period" in update_data:
        valid_periods = ["Term 1", "Term 2", "Full Year"]
        if update_data["period"] not in valid_periods:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid period. Must be one of: {', '.join(valid_periods)}"
            )
    
    # Validate credits if provided
    if "credits_earned" in update_data:
        if update_data["credits_earned"] < 0 or update_data["credits_earned"] > 100:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Credits must be between 0 and 100"
            )
    
    # Update record
    response = supabase.table("portfolios").update(update_data).eq("id", portfolio_id).execute()
    
    if not response.data or len(response.data) == 0:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update portfolio record"
        )
    
    return {
        "message": "Portfolio record updated successfully",
        "portfolio": response.data[0]
    }

@router.delete("/portfolio/{portfolio_id}", response_model=dict)
async def delete_portfolio(
    portfolio_id: int,
    current_user: dict = Depends(get_current_active_user)
) -> Any:
    """
    Delete a portfolio record
    """
    # Check if record exists
    portfolio_response = supabase.table("portfolios").select("*").eq("id", portfolio_id).execute()
    
    if not portfolio_response.data or len(portfolio_response.data) == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Portfolio record not found"
        )
    
    # Delete record
    response = supabase.table("portfolios").delete().eq("id", portfolio_id).execute()
    
    if not response.data or len(response.data) == 0:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete portfolio record"
        )
    
    return {
        "message": "Portfolio record deleted successfully"
    }

# Attendance endpoints
@router.post("/attendance", response_model=dict)
async def create_attendance(
    attendance_in: AttendanceCreate,
    current_user: dict = Depends(get_current_active_user)
) -> Any:
    """
    Create a new attendance record
    """
    # Validate student exists
    student_response = supabase.table("students").select("*").eq("id", attendance_in.student_id).execute()
    if not student_response.data or len(student_response.data) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Student not found"
        )
    
    # Validate period
    valid_periods = ["Term 1", "Term 2"]
    if attendance_in.period not in valid_periods:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid period. Must be one of: {', '.join(valid_periods)}"
        )
    
    # Validate credits
    if attendance_in.credits_earned < 0 or attendance_in.credits_earned > 10:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Attendance credits must be between 0 and 10"
        )
    
    # Check if attendance record already exists for this student and period
    existing_response = supabase.table("attendance") \
        .select("*") \
        .eq("student_id", attendance_in.student_id) \
        .eq("period", attendance_in.period) \
        .execute()
    
    if existing_response.data and len(existing_response.data) > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Attendance record for {attendance_in.period} already exists for this student. Use the update endpoint."
        )
    
    # Create attendance record
    attendance_data = attendance_in.dict()
    
    # Add teacher_id from current user
    attendance_data["teacher_id"] = current_user["id"]
    
    response = supabase.table("attendance").insert(attendance_data).execute()
    
    if not response.data or len(response.data) == 0:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create attendance record"
        )
    
    return {
        "message": "Attendance record created successfully",
        "attendance": response.data[0]
    }

@router.post("/attendance/bulk", response_model=dict)
async def create_attendance_bulk(
    attendance_in: AttendanceBulkCreate,
    current_user: dict = Depends(get_current_active_user)
) -> Any:
    """
    Create attendance records for multiple students
    """
    # Validate period
    valid_periods = ["Term 1", "Term 2"]
    if attendance_in.period not in valid_periods:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid period. Must be one of: {', '.join(valid_periods)}"
        )
    
    # Process each student
    created_count = 0
    updated_count = 0
    errors = []
    
    for student_credit in attendance_in.student_credits:
        # Validate student exists
        student_response = supabase.table("students").select("*").eq("id", student_credit.student_id).execute()
        if not student_response.data or len(student_response.data) == 0:
            errors.append(f"Student with ID {student_credit.student_id} not found")
            continue
        
        # Validate credits
        if student_credit.credits_earned < 0 or student_credit.credits_earned > 10:
            errors.append(f"Attendance credits for student {student_credit.student_id} must be between 0 and 10")
            continue
        
        # Check if attendance record already exists for this student and period
        existing_response = supabase.table("attendance") \
            .select("*") \
            .eq("student_id", student_credit.student_id) \
            .eq("period", attendance_in.period) \
            .execute()
        
        if existing_response.data and len(existing_response.data) > 0:
            # Update existing record
            attendance_id = existing_response.data[0]["id"]
            
            update_data = {
                "credits_earned": student_credit.credits_earned,
                "teacher_id": current_user["id"]
            }
            
            # Add comments if provided
            if attendance_in.comments:
                update_data["comments"] = attendance_in.comments
            
            update_response = supabase.table("attendance").update(update_data).eq("id", attendance_id).execute()
            
            if update_response.data and len(update_response.data) > 0:
                updated_count += 1
            else:
                errors.append(f"Failed to update attendance record for student {student_credit.student_id}")
        else:
            # Create new record
            attendance_data = {
                "student_id": student_credit.student_id,
                "period": attendance_in.period,
                "credits_earned": student_credit.credits_earned,
                "teacher_id": current_user["id"]
            }
            
            # Add comments if provided
            if attendance_in.comments:
                attendance_data["comments"] = attendance_in.comments
            
            create_response = supabase.table("attendance").insert(attendance_data).execute()
            
            if create_response.data and len(create_response.data) > 0:
                created_count += 1
            else:
                errors.append(f"Failed to create attendance record for student {student_credit.student_id}")
    
    return {
        "message": f"Processed {len(attendance_in.student_credits)} attendance records. Created {created_count}, updated {updated_count}, with {len(errors)} errors.",
        "created_count": created_count,
        "updated_count": updated_count,
        "errors": errors
    }

@router.put("/attendance/{attendance_id}", response_model=dict)
async def update_attendance(
    attendance_id: int,
    attendance_in: AttendanceUpdate,
    current_user: dict = Depends(get_current_active_user)
) -> Any:
    """
    Update an existing attendance record
    """
    # Check if record exists
    attendance_response = supabase.table("attendance").select("*").eq("id", attendance_id).execute()
    
    if not attendance_response.data or len(attendance_response.data) == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Attendance record not found"
        )
    
    # Prepare update data
    update_data = {k: v for k, v in attendance_in.dict().items() if v is not None}
    
    # Add teacher_id from current user
    update_data["teacher_id"] = current_user["id"]
    
    # Validate period if provided
    if "period" in update_data:
        valid_periods = ["Term 1", "Term 2"]
        if update_data["period"] not in valid_periods:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid period. Must be one of: {', '.join(valid_periods)}"
            )
    
    # Validate credits if provided
    if "credits_earned" in update_data:
        if update_data["credits_earned"] < 0 or update_data["credits_earned"] > 10:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Attendance credits must be between 0 and 10"
            )
    
    # Update record
    response = supabase.table("attendance").update(update_data).eq("id", attendance_id).execute()
    
    if not response.data or len(response.data) == 0:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update attendance record"
        )
    
    return {
        "message": "Attendance record updated successfully",
        "attendance": response.data[0]
    }

@router.delete("/attendance/{attendance_id}", response_model=dict)
async def delete_attendance(
    attendance_id: int,
    current_user: dict = Depends(get_current_active_user)
) -> Any:
    """
    Delete an attendance record
    """
    # Check if record exists
    attendance_response = supabase.table("attendance").select("*").eq("id", attendance_id).execute()
    
    if not attendance_response.data or len(attendance_response.data) == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Attendance record not found"
        )
    
    # Delete record
    response = supabase.table("attendance").delete().eq("id", attendance_id).execute()
    
    if not response.data or len(response.data) == 0:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete attendance record"
        )
    
    return {
        "message": "Attendance record deleted successfully"
    }
