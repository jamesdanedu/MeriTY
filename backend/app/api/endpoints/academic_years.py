from typing import Any, List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.core.database import supabase
from app.core.security import get_current_active_user, get_current_admin_user
from app.schemas.academic_year import (
    AcademicYear,
    AcademicYearCreate,
    AcademicYearUpdate
)

router = APIRouter()

@router.get("/", response_model=List[AcademicYear])
async def get_academic_years(
    current_user: dict = Depends(get_current_active_user)
) -> Any:
    """
    Retrieve all academic years
    """
    response = supabase.table("academic_years").select("*").order("start_date", desc=True).execute()
    
    academic_years = response.data or []
    
    # Populate class group counts for each academic year
    for year in academic_years:
        # Get class groups count
        class_groups_response = supabase.table("class_groups").select("id").eq("academic_year_id", year["id"]).execute()
        year["class_group_count"] = len(class_groups_response.data or [])
    
    return academic_years

@router.post("/", response_model=AcademicYear)
async def create_academic_year(
    academic_year_in: AcademicYearCreate,
    current_user: dict = Depends(get_current_admin_user)
) -> Any:
    """
    Create new academic year (admin only)
    """
    # Check if academic year with same name already exists
    response = supabase.table("academic_years").select("*").eq("name", academic_year_in.name).execute()
    
    if response.data and len(response.data) > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An academic year with this name already exists"
        )
    
    # Validate date range
    if academic_year_in.start_date >= academic_year_in.end_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Start date must be before end date"
        )
    
    # Convert to dict
    academic_year_data = academic_year_in.dict()
    
    # Insert into database
    response = supabase.table("academic_years").insert(academic_year_data).execute()
    
    if not response.data or len(response.data) == 0:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create academic year"
        )
    
    # Initialize with class_group_count = 0
    result = response.data[0]
    result["class_group_count"] = 0
    
    return result

@router.get("/{academic_year_id}", response_model=AcademicYear)
async def get_academic_year(
    academic_year_id: int,
    current_user: dict = Depends(get_current_active_user)
) -> Any:
    """
    Get a specific academic year by ID
    """
    response = supabase.table("academic_years").select("*").eq("id", academic_year_id).execute()
    
    if not response.data or len(response.data) == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Academic year not found"
        )
    
    academic_year = response.data[0]
    
    # Get class groups count
    class_groups_response = supabase.table("class_groups").select("id").eq("academic_year_id", academic_year_id).execute()
    academic_year["class_group_count"] = len(class_groups_response.data or [])
    
    return academic_year

@router.put("/{academic_year_id}", response_model=AcademicYear)
async def update_academic_year(
    academic_year_id: int,
    academic_year_in: AcademicYearUpdate,
    current_user: dict = Depends(get_current_admin_user)
) -> Any:
    """
    Update an academic year (admin only)
    """
    # Check if academic year exists
    response = supabase.table("academic_years").select("*").eq("id", academic_year_id).execute()
    
    if not response.data or len(response.data) == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Academic year not found"
        )
    
    # If name is being updated, check if it already exists for another academic year
    if academic_year_in.name:
        name_response = supabase.table("academic_years").select("*").eq("name", academic_year_in.name).execute()
        
        if name_response.data and len(name_response.data) > 0:
            for year in name_response.data:
                if year["id"] != academic_year_id:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="An academic year with this name already exists"
                    )
    
    # Validate date range if both dates are provided
    if academic_year_in.start_date and academic_year_in.end_date:
        if academic_year_in.start_date >= academic_year_in.end_date:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Start date must be before end date"
            )
    # Check if only one date is provided
    elif academic_year_in.start_date:
        # Get current end date
        current_end_date = response.data[0]["end_date"]
        if academic_year_in.start_date >= current_end_date:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Start date must be before end date"
            )
    elif academic_year_in.end_date:
        # Get current start date
        current_start_date = response.data[0]["start_date"]
        if current_start_date >= academic_year_in.end_date:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Start date must be before end date"
            )
    
    # Update academic year data (only non-None fields)
    update_data = {k: v for k, v in academic_year_in.dict().items() if v is not None}
    
    if update_data:
        response = supabase.table("academic_years").update(update_data).eq("id", academic_year_id).execute()
        
        if not response.data or len(response.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update academic year"
            )
    
    # Get updated academic year
    response = supabase.table("academic_years").select("*").eq("id", academic_year_id).execute()
    academic_year = response.data[0]
    
    # Get class groups count
    class_groups_response = supabase.table("class_groups").select("id").eq("academic_year_id", academic_year_id).execute()
    academic_year["class_group_count"] = len(class_groups_response.data or [])
    
    return academic_year

@router.delete("/{academic_year_id}")
async def delete_academic_year(
    academic_year_id: int,
    current_user: dict = Depends(get_current_admin_user)
) -> Any:
    """
    Delete an academic year (admin only)
    This will also delete all class groups, and consequently all enrollments
    associated with students in those class groups
    """
    # Check if academic year exists
    response = supabase.table("academic_years").select("*").eq("id", academic_year_id).execute()
    
    if not response.data or len(response.data) == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Academic year not found"
        )
    
    # Get class groups for this academic year
    class_groups_response = supabase.table("class_groups").select("id").eq("academic_year_id", academic_year_id).execute()
    class_group_ids = [group["id"] for group in class_groups_response.data or []]
    
    # For each class group, get students
    all_student_ids = []
    for class_group_id in class_group_ids:
        students_response = supabase.table("students").select("id").eq("class_group_id", class_group_id).execute()
        student_ids = [student["id"] for student in students_response.data or []]
        all_student_ids.extend(student_ids)
    
    # Delete all enrollments for these students
    for student_id in all_student_ids:
        supabase.table("enrollments").delete().eq("student_id", student_id).execute()
        supabase.table("work_experience").delete().eq("student_id", student_id).execute()
        supabase.table("portfolios").delete().eq("student_id", student_id).execute()
        supabase.table("attendance").delete().eq("student_id", student_id).execute()
    
    # Delete all students in these class groups
    for class_group_id in class_group_ids:
        supabase.table("students").delete().eq("class_group_id", class_group_id).execute()
    
    # Delete all class groups
    supabase.table("class_groups").delete().eq("academic_year_id", academic_year_id).execute()
    
    # Delete all subjects for this academic year
    supabase.table("subjects").delete().eq("academic_year_id", academic_year_id).execute()
    
    # Finally, delete the academic year
    response = supabase.table("academic_years").delete().eq("id", academic_year_id).execute()
    
    if not response.data or len(response.data) == 0:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete academic year"
        )
    
    return {"message": "Academic year and all related data deleted successfully"}

@router.get("/{academic_year_id}/class-groups", response_model=List[dict])
async def get_academic_year_class_groups(
    academic_year_id: int,
    current_user: dict = Depends(get_current_active_user)
) -> Any:
    """
    Get all class groups for a specific academic year
    """
    # Check if academic year exists
    year_response = supabase.table("academic_years").select("*").eq("id", academic_year_id).execute()
    
    if not year_response.data or len(year_response.data) == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Academic year not found"
        )
    
    # Get class groups
    response = supabase.table("class_groups").select("*").eq("academic_year_id", academic_year_id).order("name").execute()
    class_groups = response.data or []
    
    # Get student count for each class group
    for group in class_groups:
        students_response = supabase.table("students").select("id").eq("class_group_id", group["id"]).execute()
        group["student_count"] = len(students_response.data or [])
    
    return class_groups

@router.get("/{academic_year_id}/subjects", response_model=List[dict])
async def get_academic_year_subjects(
    academic_year_id: int,
    current_user: dict = Depends(get_current_active_user)
) -> Any:
    """
    Get all subjects for a specific academic year
    """
    # Check if academic year exists
    year_response = supabase.table("academic_years").select("*").eq("id", academic_year_id).execute()
    
    if not year_response.data or len(year_response.data) == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Academic year not found"
        )
    
    # Get subjects
    response = supabase.table("subjects").select("*").eq("academic_year_id", academic_year_id).order("name").execute()
    
    return response.data or []

@router.get("/current", response_model=AcademicYear)
async def get_current_academic_year(
    current_user: dict = Depends(get_current_active_user)
) -> Any:
    """
    Get the current academic year (based on current date)
    """
    from datetime import date
    
    today = date.today().isoformat()
    
    # Try to find academic year where today is between start and end dates
    response = supabase.table("academic_years") \
        .select("*") \
        .lte("start_date", today) \
        .gte("end_date", today) \
        .execute()
    
    if not response.data or len(response.data) == 0:
        # If no current academic year found, return the most recent one
        response = supabase.table("academic_years") \
            .select("*") \
            .order("start_date", desc=True) \
            .limit(1) \
            .execute()
        
        if not response.data or len(response.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No academic years found"
            )
    
    academic_year = response.data[0]
    
    # Get class groups count
    class_groups_response = supabase.table("class_groups").select("id").eq("academic_year_id", academic_year["id"]).execute()
    academic_year["class_group_count"] = len(class_groups_response.data or [])
    
    return academic_year
