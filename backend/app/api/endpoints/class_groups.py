from typing import Any, List, Optional

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.database import supabase
from app.core.security import get_current_active_user, get_current_admin_user
from app.schemas.class_group import (
    ClassGroup,
    ClassGroupCreate,
    ClassGroupUpdate,
    ClassGroupWithStats
)

router = APIRouter()

@router.get("/", response_model=List[ClassGroup])
async def get_class_groups(
    academic_year_id: Optional[int] = None,
    name: Optional[str] = None,
    current_user: dict = Depends(get_current_active_user)
) -> Any:
    """
    Retrieve class groups with optional filtering
    """
    query = supabase.table("class_groups").select("*").order("name")
    
    # Apply filters if provided
    if academic_year_id:
        query = query.eq("academic_year_id", academic_year_id)
    
    if name:
        query = query.ilike("name", f"%{name}%")
    
    # Execute query
    response = query.execute()
    
    if response.data:
        class_groups = response.data
        
        # Get additional information for each class group
        for group in class_groups:
            # Get academic year name
            if group.get("academic_year_id"):
                year_response = supabase.table("academic_years").select("name").eq("id", group["academic_year_id"]).execute()
                if year_response.data and len(year_response.data) > 0:
                    group["academic_year_name"] = year_response.data[0]["name"]
            
            # Get student count
            students_response = supabase.table("students").select("id").eq("class_group_id", group["id"]).execute()
            group["student_count"] = len(students_response.data or [])
    
    return response.data or []

@router.post("/", response_model=ClassGroup)
async def create_class_group(
    class_group_in: ClassGroupCreate,
    current_user: dict = Depends(get_current_admin_user)
) -> Any:
    """
    Create new class group (admin only)
    """
    # Check if class group with same name already exists in the academic year
    response = supabase.table("class_groups") \
        .select("*") \
        .eq("name", class_group_in.name) \
        .eq("academic_year_id", class_group_in.academic_year_id) \
        .execute()
    
    if response.data and len(response.data) > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A class group with this name already exists in the selected academic year"
        )
    
    # Check if academic year exists
    year_response = supabase.table("academic_years").select("*").eq("id", class_group_in.academic_year_id).execute()
    
    if not year_response.data or len(year_response.data) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Academic year not found"
        )
    
    # Convert to dict
    class_group_data = class_group_in.dict()
    
    # Insert into database
    response = supabase.table("class_groups").insert(class_group_data).execute()
    
    if not response.data or len(response.data) == 0:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create class group"
        )
    
    result = response.data[0]
    
    # Add academic year name
    result["academic_year_name"] = year_response.data[0]["name"]
    
    # Initialize with student_count = 0
    result["student_count"] = 0
    
    return result

@router.get("/{class_group_id}", response_model=ClassGroupWithStats)
async def get_class_group(
    class_group_id: int,
    current_user: dict = Depends(get_current_active_user)
) -> Any:
    """
    Get a specific class group by ID with additional statistics
    """
    response = supabase.table("class_groups").select("*").eq("id", class_group_id).execute()
    
    if not response.data or len(response.data) == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Class group not found"
        )
    
    class_group = response.data[0]
    
    # Get academic year name
    if class_group.get("academic_year_id"):
        year_response = supabase.table("academic_years").select("name").eq("id", class_group["academic_year_id"]).execute()
        if year_response.data and len(year_response.data) > 0:
            class_group["academic_year_name"] = year_response.data[0]["name"]
    
    # Get students in this class group
    students_response = supabase.table("students").select("*").eq("class_group_id", class_group_id).execute()
    students = students_response.data or []
    class_group["student_count"] = len(students)
    
    # Calculate average credits if there are students
    total_credits = 0
    if students:
        for student in students:
            # Calculate student credits
            student_credits = await calculate_student_credits(student["id"])
            total_credits += student_credits
        
        class_group["average_credits"] = total_credits / len(students)
    else:
        class_group["average_credits"] = 0
    
    return class_group

@router.put("/{class_group_id}", response_model=ClassGroup)
async def update_class_group(
    class_group_id: int,
    class_group_in: ClassGroupUpdate,
    current_user: dict = Depends(get_current_admin_user)
) -> Any:
    """
    Update a class group (admin only)
    """
    # Check if class group exists
    response = supabase.table("class_groups").select("*").eq("id", class_group_id).execute()
    
    if not response.data or len(response.data) == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Class group not found"
        )
    
    existing_class_group = response.data[0]
    
    # If changing academic year, check if it exists
    academic_year_id = class_group_in.academic_year_id or existing_class_group["academic_year_id"]
    
    year_response = supabase.table("academic_years").select("*").eq("id", academic_year_id).execute()
    
    if not year_response.data or len(year_response.data) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Academic year not found"
        )
    
    # If name is being updated, check if it already exists for another class group in the same academic year
    if class_group_in.name and class_group_in.name != existing_class_group["name"]:
        name_response = supabase.table("class_groups") \
            .select("*") \
            .eq("name", class_group_in.name) \
            .eq("academic_year_id", academic_year_id) \
            .execute()
        
        if name_response.data and len(name_response.data) > 0:
            for group in name_response.data:
                if group["id"] != class_group_id:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="A class group with this name already exists in the selected academic year"
                    )
    
    # Update class group data (only non-None fields)
    update_data = {k: v for k, v in class_group_in.dict().items() if v is not None}
    
    if update_data:
        response = supabase.table("class_groups").update(update_data).eq("id", class_group_id).execute()
        
        if not response.data or len(response.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update class group"
            )
    
    # Get updated class group
    response = supabase.table("class_groups").select("*").eq("id", class_group_id).execute()
    class_group = response.data[0]
    
    # Add academic year name
    class_group["academic_year_name"] = year_response.data[0]["name"]
    
    # Get student count
    students_response = supabase.table("students").select("id").eq("class_group_id", class_group_id).execute()
    class_group["student_count"] = len(students_response.data or [])
    
    return class_group

@router.delete("/{class_group_id}")
async def delete_class_group(
    class_group_id: int,
    current_user: dict = Depends(get_current_admin_user)
) -> Any:
    """
    Delete a class group (admin only)
    This will also update students to remove their class group association
    """
    # Check if class group exists
    response = supabase.table("class_groups").select("*").eq("id", class_group_id).execute()
    
    if not response.data or len(response.data) == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Class group not found"
        )
    
    # Update students to remove class group association
    supabase.table("students").update({"class_group_id": None}).eq("class_group_id", class_group_id).execute()
    
    # Delete the class group
    response = supabase.table("class_groups").delete().eq("id", class_group_id).execute()
    
    if not response.data or len(response.data) == 0:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete class group"
        )
    
    return {"message": "Class group deleted successfully"}

@router.get("/{class_group_id}/students", response_model=List[dict])
async def get_class_group_students(
    class_group_id: int,
    current_user: dict = Depends(get_current_active_user)
) -> Any:
    """
    Get all students in a specific class group
    """
    # Check if class group exists
    group_response = supabase.table("class_groups").select("*").eq("id", class_group_id).execute()
    
    if not group_response.data or len(group_response.data) == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Class group not found"
        )
    
    # Get students
    response = supabase.table("students").select("*").eq("class_group_id", class_group_id).order("name").execute()
    students = response.data or []
    
    # Calculate total credits for each student
    for student in students:
        student["total_credits"] = await calculate_student_credits(student["id"])
    
    return students

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
