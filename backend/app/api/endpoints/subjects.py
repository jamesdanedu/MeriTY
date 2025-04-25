from typing import Any, List, Optional

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.database import supabase
from app.core.security import get_current_active_user, get_current_admin_user
from app.schemas.subject import (
    Subject,
    SubjectCreate,
    SubjectUpdate,
    SubjectWithEnrollments
)

router = APIRouter()

@router.get("/", response_model=List[Subject])
async def get_subjects(
    academic_year_id: Optional[int] = None,
    type: Optional[str] = None,
    name: Optional[str] = None,
    current_user: dict = Depends(get_current_active_user)
) -> Any:
    """
    Retrieve subjects with optional filtering
    """
    query = supabase.table("subjects").select("*").order("name")
    
    # Apply filters if provided
    if academic_year_id:
        query = query.eq("academic_year_id", academic_year_id)
    
    if type:
        query = query.eq("type", type)
    
    if name:
        query = query.ilike("name", f"%{name}%")
    
    # Execute query
    response = query.execute()
    
    if response.data:
        subjects = response.data
        
        # Get academic year name for each subject
        for subject in subjects:
            if subject.get("academic_year_id"):
                year_response = supabase.table("academic_years").select("name").eq("id", subject["academic_year_id"]).execute()
                if year_response.data and len(year_response.data) > 0:
                    subject["academic_year_name"] = year_response.data[0]["name"]
    
    return response.data or []

@router.post("/", response_model=Subject)
async def create_subject(
    subject_in: SubjectCreate,
    current_user: dict = Depends(get_current_admin_user)
) -> Any:
    """
    Create new subject (admin only)
    """
    # Check if subject with same name already exists in the academic year
    response = supabase.table("subjects") \
        .select("*") \
        .eq("name", subject_in.name) \
        .eq("academic_year_id", subject_in.academic_year_id) \
        .execute()
    
    if response.data and len(response.data) > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A subject with this name already exists in the selected academic year"
        )
    
    # Check if academic year exists
    year_response = supabase.table("academic_years").select("*").eq("id", subject_in.academic_year_id).execute()
    
    if not year_response.data or len(year_response.data) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Academic year not found"
        )
    
    # Validate subject type
    valid_types = ["core", "optional", "short", "other"]
    if subject_in.type not in valid_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid subject type. Must be one of: {', '.join(valid_types)}"
        )
    
    # Convert to dict
    subject_data = subject_in.dict()
    
    # Insert into database
    response = supabase.table("subjects").insert(subject_data).execute()
    
    if not response.data or len(response.data) == 0:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create subject"
        )
    
    result = response.data[0]
    
    # Add academic year name
    result["academic_year_name"] = year_response.data[0]["name"]
    
    return result

@router.get("/{subject_id}", response_model=SubjectWithEnrollments)
async def get_subject(
    subject_id: int,
    current_user: dict = Depends(get_current_active_user)
) -> Any:
    """
    Get a specific subject by ID with enrollment statistics
    """
    response = supabase.table("subjects").select("*").eq("id", subject_id).execute()
    
    if not response.data or len(response.data) == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subject not found"
        )
    
    subject = response.data[0]
    
    # Get academic year name
    if subject.get("academic_year_id"):
        year_response = supabase.table("academic_years").select("name").eq("id", subject["academic_year_id"]).execute()
        if year_response.data and len(year_response.data) > 0:
            subject["academic_year_name"] = year_response.data[0]["name"]
    
    # Get enrollment stats
    enrollments_response = supabase.table("enrollments").select("*").eq("subject_id", subject_id).execute()
    enrollments = enrollments_response.data or []
    
    subject["enrolled_students_count"] = len(enrollments)
    subject["enrollments"] = []
    
    # Get student details for each enrollment
    for enrollment in enrollments:
        student_response = supabase.table("students").select("*").eq("id", enrollment["student_id"]).execute()
        if student_response.data and len(student_response.data) > 0:
            student = student_response.data[0]
            
            # Get class group if available
            class_group_name = "None"
            if student.get("class_group_id"):
                class_group_response = supabase.table("class_groups").select("name").eq("id", student["class_group_id"]).execute()
                if class_group_response.data and len(class_group_response.data) > 0:
                    class_group_name = class_group_response.data[0]["name"]
            
            # Calculate progress percentage
            progress_percentage = 0
            if subject["credit_value"] > 0:
                progress_percentage = int((enrollment["credits_earned"] / subject["credit_value"]) * 100)
            
            subject["enrollments"].append({
                "enrollment_id": enrollment["id"],
                "student_id": student["id"],
                "student_name": student["name"],
                "class_group": class_group_name,
                "credits_earned": enrollment["credits_earned"],
                "progress_percentage": progress_percentage,
                "term": enrollment.get("term")
            })
    
    return subject

@router.put("/{subject_id}", response_model=Subject)
async def update_subject(
    subject_id: int,
    subject_in: SubjectUpdate,
    current_user: dict = Depends(get_current_admin_user)
) -> Any:
    """
    Update a subject (admin only)
    """
    # Check if subject exists
    response = supabase.table("subjects").select("*").eq("id", subject_id).execute()
    
    if not response.data or len(response.data) == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subject not found"
        )
    
    existing_subject = response.data[0]
    
    # If changing academic year, check if it exists
    academic_year_id = subject_in.academic_year_id or existing_subject["academic_year_id"]
    
    year_response = supabase.table("academic_years").select("*").eq("id", academic_year_id).execute()
    
    if not year_response.data or len(year_response.data) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Academic year not found"
        )
    
    # If name is being updated, check if it already exists for another subject in the same academic year
    if subject_in.name and subject_in.name != existing_subject["name"]:
        name_response = supabase.table("subjects") \
            .select("*") \
            .eq("name", subject_in.name) \
            .eq("academic_year_id", academic_year_id) \
            .execute()
        
        if name_response.data and len(name_response.data) > 0:
            for subj in name_response.data:
                if subj["id"] != subject_id:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="A subject with this name already exists in the selected academic year"
                    )
    
    # If type is being updated, validate it
    if subject_in.type:
        valid_types = ["core", "optional", "short", "other"]
        if subject_in.type not in valid_types:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid subject type. Must be one of: {', '.join(valid_types)}"
            )
    
    # Update subject data (only non-None fields)
    update_data = {k: v for k, v in subject_in.dict().items() if v is not None}
    
    if update_data:
        response = supabase.table("subjects").update(update_data).eq("id", subject_id).execute()
        
        if not response.data or len(response.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update subject"
            )
    
    # Get updated subject
    response = supabase.table("subjects").select("*").eq("id", subject_id).execute()
    subject = response.data[0]
    
    # Add academic year name
    subject["academic_year_name"] = year_response.data[0]["name"]
    
    return subject

@router.delete("/{subject_id}")
async def delete_subject(
    subject_id: int,
    current_user: dict = Depends(get_current_admin_user)
) -> Any:
    """
    Delete a subject (admin only)
    This will also delete all enrollments for this subject
    """
    # Check if subject exists
    response = supabase.table("subjects").select("*").eq("id", subject_id).execute()
    
    if not response.data or len(response.data) == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subject not found"
        )
    
    # Delete all enrollments for this subject
    supabase.table("enrollments").delete().eq("subject_id", subject_id).execute()
    
    # Delete the subject
    response = supabase.table("subjects").delete().eq("id", subject_id).execute()
    
    if not response.data or len(response.data) == 0:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete subject"
        )
    
    return {"message": "Subject and all related enrollments deleted successfully"}

@router.get("/{subject_id}/enrollments", response_model=List[dict])
async def get_subject_enrollments(
    subject_id: int,
    class_group_id: Optional[int] = None,
    term: Optional[str] = None,
    current_user: dict = Depends(get_current_active_user)
) -> Any:
    """
    Get all enrollments for a specific subject with optional filtering
    """
    # Check if subject exists
    subject_response = supabase.table("subjects").select("*").eq("id", subject_id).execute()
    
    if not subject_response.data or len(subject_response.data) == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subject not found"
        )
    
    # Build query for enrollments
    query = supabase.table("enrollments").select("*").eq("subject_id", subject_id)
    
    # Apply term filter if provided
    if term:
        query = query.eq("term", term)
    
    # Execute query
    enrollments_response = query.execute()
    enrollments = enrollments_response.data or []
    
    # Get student details and apply class group filter if needed
    result = []
    for enrollment in enrollments:
        student_response = supabase.table("students").select("*").eq("id", enrollment["student_id"]).execute()
        if not student_response.data or len(student_response.data) == 0:
            continue
        
        student = student_response.data[0]
        
        # Apply class group filter if provided
        if class_group_id and student.get("class_group_id") != class_group_id:
            continue
        
        # Get class group if available
        class_group_name = "None"
        if student.get("class_group_id"):
            class_group_response = supabase.table("class_groups").select("name").eq("id", student["class_group_id"]).execute()
            if class_group_response.data and len(class_group_response.data) > 0:
                class_group_name = class_group_response.data[0]["name"]
        
        # Calculate progress percentage
        progress_percentage = 0
        subject = subject_response.data[0]
        if subject["credit_value"] > 0:
            progress_percentage = int((enrollment["credits_earned"] / subject["credit_value"]) * 100)
        
        result.append({
            "enrollment_id": enrollment["id"],
            "student_id": student["id"],
            "student_name": student["name"],
            "class_group_id": student.get("class_group_id"),
            "class_group_name": class_group_name,
            "credits_earned": enrollment["credits_earned"],
            "progress_percentage": progress_percentage,
            "term": enrollment.get("term")
        })
    
    return result