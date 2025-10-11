"""
Faculty user management utilities
"""
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi_async_sqlalchemy import db
from src.users.models import User
from src.users.service import UserService
from src.users.schemas import USER_TYPE, USER_ROLE


class FacultyManagementService:
    """Service for managing faculty users"""
    
    def __init__(self):
        self.user_service = UserService(User, db)
    
    async def create_faculty_user(
        self,
        email: str,
        phone_number: str,
        full_name: str,
        roles: List[USER_ROLE],
        password: Optional[str] = None
    ) -> User:
        """Create a new faculty user"""
        from src.auth.security import hash_password
        
        # Check if user already exists
        existing_user = await self.user_service.get_by_field(
            field="email", 
            value=email, 
            db_session=db.session
        )
        if existing_user:
            raise ValueError(f"User with email {email} already exists")
        
        # Create user data
        user_data = {
            "email": email,
            "phone_number": phone_number,
            "full_name": full_name,
            "user_type": USER_TYPE.workforce,
            "is_faculty": True,
            "is_active": True,
            "roles": roles,
            "phone_verified": False
        }
        
        if password:
            user_data["password"] = hash_password(password)
        
        # Create user
        faculty_user = await self.user_service.create(
            obj_in=user_data,
            db_session=db.session
        )
        
        return faculty_user
    
    async def update_faculty_status(
        self,
        user_id: int,
        is_faculty: bool,
        roles: Optional[List[USER_ROLE]] = None
    ) -> User:
        """Update faculty status and roles for a user"""
        user = await self.user_service.get_by_field(
            field="id", 
            value=user_id, 
            db_session=db.session
        )
        
        if not user:
            raise ValueError(f"User with ID {user_id} not found")
        
        if user.user_type != USER_TYPE.workforce:
            raise ValueError("Only workforce users can be assigned faculty status")
        
        update_data = {"is_faculty": is_faculty}
        if roles is not None:
            update_data["roles"] = roles
        
        updated_user = await self.user_service.update(
            obj_current=user,
            obj_new=update_data,
            db_session=db.session
        )
        
        return updated_user
    
    async def get_faculty_users(self) -> List[User]:
        """Get all faculty users"""
        # This would need a custom query to filter by is_faculty=True
        # For now, we'll get all workforce users and filter
        workforce_users = await self.user_service.get_by_field(
            field="user_type",
            value=USER_TYPE.workforce,
            db_session=db.session
        )
        
        # Filter for faculty users
        faculty_users = [user for user in workforce_users if user.is_faculty]
        return faculty_users
    
    async def validate_faculty_user(self, user_id: int) -> bool:
        """Validate if a user is a proper faculty member"""
        user = await self.user_service.get_by_field(
            field="id", 
            value=user_id, 
            db_session=db.session
        )
        
        if not user:
            return False
        
        # Check all faculty requirements
        return (
            user.is_active and
            not user.is_deleted and
            user.user_type == USER_TYPE.workforce and
            user.is_faculty and
            user.roles and
            any(role in {
                USER_ROLE.teacher, USER_ROLE.mentor, USER_ROLE.evaluator,
                USER_ROLE.content_author, USER_ROLE.content_editor,
                USER_ROLE.content_reviewer, USER_ROLE.org_admin,
                USER_ROLE.branch_admin
            } for role in user.roles)
        )


# Global instance
faculty_management_service = FacultyManagementService()


