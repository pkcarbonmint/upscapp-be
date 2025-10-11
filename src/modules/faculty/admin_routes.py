"""
Faculty administration routes
"""
from fastapi import APIRouter, Depends, HTTPException
from fastapi_async_sqlalchemy import db
from src.users.deps import CheckV2UserAccess
from src.users.models import User
from src.users.schemas import USER_ROLE, USER_TYPE
from src.base.schemas import ResponseSchema, ResponseListSchema
from .management import faculty_management_service
from .schemas import FacultyProfile
from typing import List

# Create router
faculty_admin_router = APIRouter(prefix="/api/studyplanner/faculty/admin", tags=["Faculty Admin"])


@faculty_admin_router.post("/create-faculty", response_model=ResponseSchema[FacultyProfile])
async def create_faculty_user(
    email: str,
    phone_number: str,
    full_name: str,
    roles: List[USER_ROLE],
    password: str = None,
    current_user: User = Depends(CheckV2UserAccess(
        user_types=[USER_TYPE.workforce], 
        roles=[USER_ROLE.org_admin, USER_ROLE.branch_admin],
        apps=[]
    ))
):
    """Create a new faculty user (admin only)"""
    try:
        faculty_user = await faculty_management_service.create_faculty_user(
            email=email,
            phone_number=phone_number,
            full_name=full_name,
            roles=roles,
            password=password
        )
        
        faculty_profile = FacultyProfile(
            id=faculty_user.id,
            email=faculty_user.email or '',
            phone_number=faculty_user.phone_number,
            full_name=faculty_user.full_name or '',
            is_active=faculty_user.is_active,
            phone_verified=faculty_user.phone_verified or False,
            is_faculty=faculty_user.is_faculty,
            user_type=faculty_user.user_type,
            roles=faculty_user.roles or [],
            created_at=faculty_user.created_at.isoformat() if faculty_user.created_at else '',
            updated_at=faculty_user.updated_at.isoformat() if faculty_user.updated_at else ''
        )
        
        return ResponseSchema(data=faculty_profile, success=True)
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create faculty user: {str(e)}")


@faculty_admin_router.put("/update-faculty-status/{user_id}", response_model=ResponseSchema[FacultyProfile])
async def update_faculty_status(
    user_id: int,
    is_faculty: bool,
    roles: List[USER_ROLE] = None,
    current_user: User = Depends(CheckV2UserAccess(
        user_types=[USER_TYPE.workforce], 
        roles=[USER_ROLE.org_admin, USER_ROLE.branch_admin],
        apps=[]
    ))
):
    """Update faculty status for a user (admin only)"""
    try:
        updated_user = await faculty_management_service.update_faculty_status(
            user_id=user_id,
            is_faculty=is_faculty,
            roles=roles
        )
        
        faculty_profile = FacultyProfile(
            id=updated_user.id,
            email=updated_user.email or '',
            phone_number=updated_user.phone_number,
            full_name=updated_user.full_name or '',
            is_active=updated_user.is_active,
            phone_verified=updated_user.phone_verified or False,
            is_faculty=updated_user.is_faculty,
            user_type=updated_user.user_type,
            roles=updated_user.roles or [],
            created_at=updated_user.created_at.isoformat() if updated_user.created_at else '',
            updated_at=updated_user.updated_at.isoformat() if updated_user.updated_at else ''
        )
        
        return ResponseSchema(data=faculty_profile, success=True)
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update faculty status: {str(e)}")


@faculty_admin_router.get("/faculty-users", response_model=ResponseListSchema[FacultyProfile])
async def get_faculty_users(
    current_user: User = Depends(CheckV2UserAccess(
        user_types=[USER_TYPE.workforce], 
        roles=[USER_ROLE.org_admin, USER_ROLE.branch_admin],
        apps=[]
    ))
):
    """Get all faculty users (admin only)"""
    try:
        faculty_users = await faculty_management_service.get_faculty_users()
        
        faculty_profiles = []
        for user in faculty_users:
            faculty_profile = FacultyProfile(
                id=user.id,
                email=user.email or '',
                phone_number=user.phone_number,
                full_name=user.full_name or '',
                is_active=user.is_active,
                phone_verified=user.phone_verified or False,
                is_faculty=user.is_faculty,
                user_type=user.user_type,
                roles=user.roles or [],
                created_at=user.created_at.isoformat() if user.created_at else '',
                updated_at=user.updated_at.isoformat() if user.updated_at else ''
            )
            faculty_profiles.append(faculty_profile)
        
        return ResponseListSchema(data=faculty_profiles, success=True, meta={"count": len(faculty_profiles)})
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get faculty users: {str(e)}")


@faculty_admin_router.get("/validate-faculty/{user_id}", response_model=ResponseSchema[dict])
async def validate_faculty_user(
    user_id: int,
    current_user: User = Depends(CheckV2UserAccess(
        user_types=[USER_TYPE.workforce], 
        roles=[USER_ROLE.org_admin, USER_ROLE.branch_admin],
        apps=[]
    ))
):
    """Validate if a user is a proper faculty member (admin only)"""
    try:
        is_valid = await faculty_management_service.validate_faculty_user(user_id)
        
        return ResponseSchema(
            data={"user_id": user_id, "is_valid_faculty": is_valid}, 
            success=True
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to validate faculty user: {str(e)}")













