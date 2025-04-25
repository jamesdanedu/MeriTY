from typing import Any, List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.core.database import supabase
from app.core.security import get_current_active_user, get_current_admin_user

router = APIRouter()

class EnrollmentBase(BaseModel):
    student_id: int
    subject_id: int
    credits_earned: int = Field(0, ge=0)
    term: Optional[str] = None

class EnrollmentCreate(EnrollmentBase):
    pass

class EnrollmentUpdate(BaseModel):
    credits_earned: Optional[int] = Field(None, ge=0)
    term: Optional[str] = None

class EnrollmentResponse(EnrollmentBase):
    id: int
    student_name: Optional[str] = None
    subject_name: Optional[str] = None

    class Config:
        orm_mode = True

@router.post("/", response_model=EnrollmentResponse)
async def create_enrollment(
    enrollment: EnrollmentCreate,
    current_user: dict = Depends(get_current_active_user)
) -> Any:
    """
    Create a new enrollment
    """
    # Validate student exists
    student_response = supabase.table("students").select("*").eq("id", enrollment.student_id).execute()
    if not student_response.data or len(student_response.data) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Student not found"
        )
    
    # Validate subject exists
    subject_response = supabase.table("subjects").select("*").eq("id", enrollment.subject_id).execute()
    if not subject_response.data or len(subject_response.data) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Subject not found"
        )
    
    subject = subject_response.data[0]
    
    # Validate credits are within subject's max credit value
    if enrollment.credits_earned > subject.get('credit_value', 0):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Credits cannot exceed subject's max value of {subject['credit_value']}"
        )
    
    # Check for existing enrollment
    existing_response = supabase.table("enrollments") \
        .select("*") \
        .eq("student_id", enrollment.student_id) \
        .eq("subject_id", enrollment.subject_id) \
        .execute()
    
    if existing_response.data and len(existing_response.data) > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Enrollment already exists. Use update endpoint."
        )
    
    # Prepare enrollment data
    enrollment_data = {
        "student_id": enrollment.student_id,
        "subject_id": enrollment.subject_id,
        "credits_earned": enrollment.credits_earned,
        "term": enrollment.term
    }
    
    # Create enrollment
    response = supabase.table("enrollments").insert(enrollment_data).execute()
    
    if not response.data or len(response.data) == 0:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create enrollment"
        )
    
    # Prepare response with student and subject names
    enrollment_response = response.data[0]
    enrollment_response['student_name'] = student_response.data[0]['name']
    enrollment_response['subject_name'] = subject_response.data[0]['name']
    
    return enrollment_response

@router.get("/", response_model=List[EnrollmentResponse])
async def list_enrollments(
    student_id: Optional[int] = None,
    subject_id: Optional[int] = None,
    term: Optional[str] = None,
    current_user: dict = Depends(get_current_active_user)
) -> Any:
    """
    List enrollments with optional filtering
    """
    # Build query
    query = supabase.table("enrollments").select("*, students(name), subjects(name)")
    
    # Apply filters
    if student_id:
        query = query.eq("student_id", student_id)
    
    if subject_id:
        query = query.eq("subject_id", subject_id)
    
    if term:
        query = query.eq("term", term)
    
    # Execute query
    response = query.execute()
    
    # Process response
    enrollments = []
    for enrollment in response.data or []:
        processed_enrollment = {
            "id": enrollment["id"],
            "student_id": enrollment["student_id"],
            "subject_id": enrollment["subject_id"],
            "credits_earned": enrollment["credits_earned"],
            "term": enrollment.get("term"),
            "student_name": enrollment["students"]["name"] if enrollment.get("students") else None,
            "subject_name": enrollment["subjects"]["name"] if enrollment.get("subjects") else None
        }
        enrollments.append(processed_enrollment)
    
    return enrollments

@router.put("/{enrollment_id}", response_model=EnrollmentResponse)
async def update_enrollment(
    enrollment_id: int,
    enrollment: EnrollmentUpdate,
    current_user: dict = Depends(get_current_active_user)
) -> Any:
    """
    Update an existing enrollment
    """
    # Check if enrollment exists
    existing_response = supabase.table("enrollments").select("*, students(name), subjects(name)").eq("id", enrollment_id).execute()
    
    if not existing_response.data or len(existing_response.data) == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Enrollment not found"
        )
    
    existing = existing_response.data[0]
    
    # Prepare update data
    update_data = {}
    
    # Validate and prepare credits update
    if enrollment.credits_earned is not None:
        # Get subject details to validate max credits
        subject_response = supabase.table("subjects").select("*").eq("id", existing["subject_id"]).execute()
        subject = subject_response.data[0]
        
        if enrollment.credits_earned > subject.get('credit_value', 0):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Credits cannot exceed subject's max value of {subject['credit_value']}"
            )
        
        update_data["credits_earned"] = enrollment.credits_earned
    
    # Update term if provided
    if enrollment.term is not None:
        update_data["term"] = enrollment.term
    
    # Perform update
    if update_data:
        response = supabase.table("enrollments").update(update_data).eq("id", enrollment_id).execute()
        
        if not response.data or len(response.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update enrollment"
            )
    
    # Return updated enrollment
    updated = response.data[0] if response.data else existing
    
    return {
        "id": updated["id"],
        "student_id": updated["student_id"],
        "subject_id": updated["subject_id"],
        "credits_earned": updated["credits_earned"],
        "term": updated.get("term"),
        "student_name": existing["students"]["name"],
        "subject_name": existing["subjects"]["name"]
    }

@router.delete("/{enrollment_id}")
async def delete_enrollment(
    enrollment_id: int,
    current_user: dict = Depends(get_current_active_user)
) -> Any:
    """
    Delete an enrollment
    """
    # Check if enrollment exists
    existing_response = supabase.table("enrollments").select("*").eq("id", enrollment_id).execute()
    
    if not existing_response.data or len(existing_response.data) == 0:
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
    
    return {"message": "Enrollment deleted successfully"}