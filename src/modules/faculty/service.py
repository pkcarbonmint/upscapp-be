from typing import Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi_async_sqlalchemy import db
from sqlalchemy import select, and_
from src.users.models import User
from src.users.service import UserService
from src.users.schemas import USER_TYPE, USER_ROLE
from src.auth.security import create_access_token, check_password
from src.auth.service import AuthService
from src.auth.models import RefreshToken
from src.external.otp_service import otp_service
from .schemas import FacultyLoginRequest, FacultyOTPVerification, FacultyLoginResponse, FacultyProfile


class FacultyAuthService:
    """Service for faculty authentication with OTP support"""
    
    def __init__(self):
        self.user_service = UserService(User, db)
        self.auth_service = AuthService(RefreshToken, db)
    
    def _validate_faculty_user(self, user: User) -> Optional[str]:
        """Validate that user is a proper faculty member"""
        # Check if user is active
        if not user.is_active:
            return 'Faculty account is deactivated'
        
        # Check if user is deleted
        if user.is_deleted:
            return 'Faculty account has been deleted'
        
        # Check user type - must be workforce
        if user.user_type != USER_TYPE.workforce:
            return 'Only workforce members can access faculty portal'
        
        # Check faculty flag
        if not user.is_faculty:
            return 'User is not authorized as faculty member'
        
        # Check if user has appropriate roles
        faculty_roles = {USER_ROLE.teacher, USER_ROLE.mentor, USER_ROLE.evaluator, 
                        USER_ROLE.content_author, USER_ROLE.content_editor, 
                        USER_ROLE.content_reviewer, USER_ROLE.org_admin, 
                        USER_ROLE.branch_admin}
        
        if not user.roles or not any(role in faculty_roles for role in user.roles):
            return 'User does not have appropriate faculty role'
        
        return None  # No validation errors
    
    async def send_otp(self, phone_number: str) -> Dict[str, Any]:
        """Send OTP to faculty phone number"""
        try:
            # Check if faculty exists with this phone number
            faculty = await self.user_service.get_by_field(
                field="phone_number", 
                value=phone_number, 
                db_session=db.session
            )
            
            if not faculty:
                return {
                    'success': False,
                    'error': 'No faculty found with this phone number'
                }
            
            # Validate faculty user
            validation_error = self._validate_faculty_user(faculty)
            if validation_error:
                return {
                    'success': False,
                    'error': validation_error
                }
            
            # Send OTP
            result = await otp_service.send_otp(phone_number)
            return result
            
        except Exception as e:
            return {
                'success': False,
                'error': f'Failed to send OTP: {str(e)}'
            }
    
    async def verify_otp_and_login(self, verification_id: str, otp_code: str) -> FacultyLoginResponse:
        """Verify OTP and login faculty"""
        try:
            # Verify OTP
            otp_result = await otp_service.verify_otp(verification_id, otp_code)
            
            if not otp_result['success']:
                return FacultyLoginResponse(
                    success=False,
                    error=otp_result['error']
                )
            
            # Get verification status to get phone number
            status_result = await otp_service.check_verification_status(verification_id)
            
            if not status_result['success'] or not status_result['is_verified']:
                return FacultyLoginResponse(
                    success=False,
                    error='Phone number not verified'
                )
            
            phone_number = status_result['phone_number']
            
            # Find faculty by phone number
            faculty = await self.user_service.get_by_field(
                field="phone_number", 
                value=phone_number, 
                db_session=db.session
            )
            
            if not faculty:
                return FacultyLoginResponse(
                    success=False,
                    error='Faculty not found'
                )
            
            # Validate faculty user
            validation_error = self._validate_faculty_user(faculty)
            if validation_error:
                return FacultyLoginResponse(
                    success=False,
                    error=validation_error
                )
            
            # Update phone verification status
            await self.user_service.update(
                obj_current=faculty,
                obj_new={"phone_verified": True},
                db_session=db.session
            )
            
            # Create refresh token
            refresh_token = await self.auth_service.create_refresh_token(
                user_id=faculty.id,
                db_session=db.session
            )
            
            # Create access token
            access_token = create_access_token(user=faculty)
            
            # Convert faculty to profile
            faculty_profile = FacultyProfile(
                id=faculty.id,
                email=faculty.email or '',
                phone_number=faculty.phone_number,
                full_name=faculty.full_name or '',
                is_active=faculty.is_active,
                phone_verified=True,
                is_faculty=faculty.is_faculty,
                user_type=faculty.user_type,
                roles=faculty.roles or [],
                created_at=faculty.created_at.isoformat() if faculty.created_at else '',
                updated_at=faculty.updated_at.isoformat() if faculty.updated_at else ''
            )
            
            return FacultyLoginResponse(
                success=True,
                user=faculty_profile.dict(),
                token=access_token,
                message='Login successful'
            )
            
        except Exception as e:
            return FacultyLoginResponse(
                success=False,
                error=f'Login failed: {str(e)}'
            )
    
    async def login_with_credentials(self, email: str, password: str) -> FacultyLoginResponse:
        """Login faculty with email and password"""
        try:
            # Find faculty by email
            faculty = await self.user_service.get_by_field(
                field="email", 
                value=email, 
                db_session=db.session
            )
            
            if not faculty:
                return FacultyLoginResponse(
                    success=False,
                    error='Invalid email or password'
                )
            
            if not faculty.password:
                return FacultyLoginResponse(
                    success=False,
                    error='Password not set for this account'
                )
            
            # Validate faculty user
            validation_error = self._validate_faculty_user(faculty)
            if validation_error:
                return FacultyLoginResponse(
                    success=False,
                    error=validation_error
                )
            
            # Check password
            if not check_password(password, faculty.password):
                return FacultyLoginResponse(
                    success=False,
                    error='Invalid email or password'
                )
            
            # Create refresh token
            refresh_token = await self.auth_service.create_refresh_token(
                user_id=faculty.id,
                db_session=db.session
            )
            
            # Create access token
            access_token = create_access_token(user=faculty)
            
            # Convert faculty to profile
            faculty_profile = FacultyProfile(
                id=faculty.id,
                email=faculty.email or '',
                phone_number=faculty.phone_number,
                full_name=faculty.full_name or '',
                is_active=faculty.is_active,
                phone_verified=faculty.phone_verified or False,
                is_faculty=faculty.is_faculty,
                user_type=faculty.user_type,
                roles=faculty.roles or [],
                created_at=faculty.created_at.isoformat() if faculty.created_at else '',
                updated_at=faculty.updated_at.isoformat() if faculty.updated_at else ''
            )
            
            return FacultyLoginResponse(
                success=True,
                user=faculty_profile.dict(),
                token=access_token,
                message='Login successful'
            )
            
        except Exception as e:
            return FacultyLoginResponse(
                success=False,
                error=f'Login failed: {str(e)}'
            )
    
    async def get_faculty_profile(self, faculty_id: int) -> Optional[FacultyProfile]:
        """Get faculty profile by ID"""
        try:
            faculty = await self.user_service.get_by_field(
                field="id", 
                value=faculty_id, 
                db_session=db.session
            )
            
            if not faculty:
                return None
            
            # Validate faculty user
            validation_error = self._validate_faculty_user(faculty)
            if validation_error:
                return None
            
            return FacultyProfile(
                id=faculty.id,
                email=faculty.email or '',
                phone_number=faculty.phone_number,
                full_name=faculty.full_name or '',
                is_active=faculty.is_active,
                phone_verified=faculty.phone_verified or False,
                is_faculty=faculty.is_faculty,
                user_type=faculty.user_type,
                roles=faculty.roles or [],
                created_at=faculty.created_at.isoformat() if faculty.created_at else '',
                updated_at=faculty.updated_at.isoformat() if faculty.updated_at else ''
            )
            
        except Exception as e:
            print(f"Error getting faculty profile: {e}")
            return None
    
    async def get_dashboard_stats(self, faculty_id: int) -> dict:
        """Get dashboard statistics for faculty"""
        try:
            # For now, return mock data
            # In a real implementation, you would query the database for actual stats
            stats = {
                "totalPlans": 0,
                "pendingReview": 0,
                "approvedToday": 0,
                "rejectedToday": 0,
                "totalStudents": 0,
                "activeStudents": 0
            }
            
            return stats
            
        except Exception as e:
            print(f"Error getting dashboard stats: {e}")
            return {
                "totalPlans": 0,
                "pendingReview": 0,
                "approvedToday": 0,
                "rejectedToday": 0,
                "totalStudents": 0,
                "activeStudents": 0
            }
    
    # Plan Review Methods
    async def get_plans_for_review(self, faculty_id: int, page: int = 1, search: str = "") -> dict:
        """Get plans for faculty review"""
        try:
            # Mock data for now - return structure expected by frontend
            plans = {
                "items": [],
                "total": 0,
                "page": page,
                "per_page": 10,
                "pages": 0
            }
            return plans
        except Exception as e:
            print(f"Error getting plans for review: {e}")
            return {"items": [], "total": 0, "page": page, "per_page": 10, "pages": 0}
    
    async def get_plan_details(self, plan_id: int, faculty_id: int) -> dict:
        """Get plan details for review"""
        try:
            # Mock data for now
            return {
                "id": plan_id,
                "title": "Sample Study Plan",
                "description": "This is a sample study plan",
                "status": "pending_review",
                "created_at": "2025-09-25T12:00:00Z"
            }
        except Exception as e:
            print(f"Error getting plan details: {e}")
            return None
    
    async def approve_plan(self, plan_id: int, faculty_id: int, notes: str = "") -> dict:
        """Approve a plan"""
        try:
            # Mock implementation
            return {"message": f"Plan {plan_id} approved successfully", "notes": notes}
        except Exception as e:
            print(f"Error approving plan: {e}")
            return {"message": "Error approving plan"}
    
    async def reject_plan(self, plan_id: int, faculty_id: int, reason: str = "") -> dict:
        """Reject a plan"""
        try:
            # Mock implementation
            return {"message": f"Plan {plan_id} rejected", "reason": reason}
        except Exception as e:
            print(f"Error rejecting plan: {e}")
            return {"message": "Error rejecting plan"}
    
    # Student Management Methods
    async def get_students(self, faculty_id: int, page: int = 1, search: str = "") -> dict:
        """Get students for faculty management"""
        try:
            # Mock data for now - return structure expected by frontend
            students = {
                "items": [],
                "total": 0,
                "page": page,
                "per_page": 10,
                "pages": 0
            }
            return students
        except Exception as e:
            print(f"Error getting students: {e}")
            return {"items": [], "total": 0, "page": page, "per_page": 10, "pages": 0}
    
    async def get_student_details(self, student_id: str, faculty_id: int) -> dict:
        """Get student details"""
        try:
            # Mock data for now
            return {
                "id": student_id,
                "name": "Sample Student",
                "email": "student@example.com",
                "phone": "+919876543210",
                "status": "active"
            }
        except Exception as e:
            print(f"Error getting student details: {e}")
            return None
    
    async def get_student_plans(self, student_id: str, faculty_id: int) -> list:
        """Get student's plans"""
        try:
            # Mock data for now
            return []
        except Exception as e:
            print(f"Error getting student plans: {e}")
            return []
