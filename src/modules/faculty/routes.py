from fastapi import APIRouter, Depends, HTTPException, Request, Response
from fastapi_async_sqlalchemy import db
from src.auth.deps import valid_token_user
from src.users.models import User
from src.base.schemas import ResponseSchema
from .schemas import (
    FacultyOTPRequest, 
    FacultyOTPVerification, 
    FacultyOTPResponse,
    FacultyLoginRequest,
    FacultyLoginResponse,
    FacultyProfile
)
from .service import FacultyAuthService

# Create router
faculty_router = APIRouter(tags=["Faculty"])

# Initialize service
faculty_auth_service = FacultyAuthService()


@faculty_router.post("/auth/send-otp", response_model=ResponseSchema[FacultyOTPResponse])
async def send_otp(request: FacultyOTPRequest):
    """Send OTP to faculty phone number"""
    result = await faculty_auth_service.send_otp(request.phone_number)
    
    if result['success']:
        return ResponseSchema(
            data=FacultyOTPResponse(
                success=True,
                verification_id=result['verification_id'],
                message=result['message'],
                test_otp=result.get('test_otp')
            ),
            success=True
        )
    else:
        raise HTTPException(status_code=400, detail=result['error'])


@faculty_router.post("/auth/verify-otp", response_model=ResponseSchema[FacultyLoginResponse])
async def verify_otp(request: FacultyOTPVerification):
    """Verify OTP and login faculty"""
    result = await faculty_auth_service.verify_otp_and_login(
        request.verification_id, 
        request.otp_code
    )
    
    if result.success:
        return ResponseSchema(data=result, success=True)
    else:
        raise HTTPException(status_code=400, detail=result.error)


@faculty_router.post("/auth/login", response_model=ResponseSchema[FacultyLoginResponse])
async def login(request: FacultyLoginRequest):
    """Login faculty with email/password or phone number"""
    
    # Handle phone number login (OTP-based)
    if request.phone_number and not request.email and not request.password:
        raise HTTPException(
            status_code=400, 
            detail="Please use /auth/send-otp endpoint for phone number login"
        )
    
    # Handle email/password login
    if request.email and request.password:
        result = await faculty_auth_service.login_with_credentials(
            request.email, 
            request.password
        )
        
        if result.success:
            return ResponseSchema(data=result, success=True)
        else:
            raise HTTPException(status_code=400, detail=result.error)
    
    raise HTTPException(
        status_code=400, 
        detail="Either email/password or phone_number must be provided"
    )


@faculty_router.get("/auth/profile", response_model=ResponseSchema[FacultyProfile])
async def get_profile(current_user: User = Depends(valid_token_user)):
    """Get faculty profile"""
    profile = await faculty_auth_service.get_faculty_profile(current_user.id)
    
    if not profile:
        raise HTTPException(status_code=404, detail="Faculty profile not found")
    
    return ResponseSchema(data=profile, success=True)


@faculty_router.post("/auth/logout")
async def logout(response: Response):
    """Logout faculty (clear any session data)"""
    # In a real implementation, you might want to invalidate tokens
    # For now, we'll just return success
    return ResponseSchema(data={"message": "Logged out successfully"}, success=True)


# Dashboard Routes
@faculty_router.get("/dashboard/stats")
async def get_dashboard_stats(current_user: User = Depends(valid_token_user)):
    """Get dashboard statistics for faculty"""
    stats = await faculty_auth_service.get_dashboard_stats(current_user.id)
    return ResponseSchema(data=stats, success=True)


# Plan Review Routes
@faculty_router.get("/plans/review")
async def get_plans_for_review(
    page: int = 1,
    search: str = "",
    current_user: User = Depends(valid_token_user)
):
    """Get plans for faculty review"""
    plans = await faculty_auth_service.get_plans_for_review(current_user.id, page, search)
    return ResponseSchema(data=plans, success=True)

# Test endpoint without authentication
@faculty_router.get("/plans/review/test")
async def get_plans_for_review_test(page: int = 1, search: str = ""):
    """Test endpoint for plans review (no auth required)"""
    plans = await faculty_auth_service.get_plans_for_review(1, page, search)
    return ResponseSchema(data=plans, success=True)


@faculty_router.get("/plans/{plan_id}")
async def get_plan_details(
    plan_id: int,
    current_user: User = Depends(valid_token_user)
):
    """Get plan details for review"""
    plan = await faculty_auth_service.get_plan_details(plan_id, current_user.id)
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    return ResponseSchema(data=plan, success=True)


@faculty_router.put("/plans/{plan_id}/approve")
async def approve_plan(
    plan_id: int,
    request: dict,
    current_user: User = Depends(valid_token_user)
):
    """Approve a plan"""
    notes = request.get("notes", "")
    result = await faculty_auth_service.approve_plan(plan_id, current_user.id, notes)
    return ResponseSchema(data=result, success=True)


@faculty_router.put("/plans/{plan_id}/reject")
async def reject_plan(
    plan_id: int,
    request: dict,
    current_user: User = Depends(valid_token_user)
):
    """Reject a plan"""
    reason = request.get("reason", "")
    result = await faculty_auth_service.reject_plan(plan_id, current_user.id, reason)
    return ResponseSchema(data=result, success=True)


# Student Management Routes
@faculty_router.get("/students")
async def get_students(
    page: int = 1,
    search: str = "",
    current_user: User = Depends(valid_token_user)
):
    """Get students for faculty management"""
    students = await faculty_auth_service.get_students(current_user.id, page, search)
    return ResponseSchema(data=students, success=True)


@faculty_router.get("/students/{student_id}")
async def get_student_details(
    student_id: str,
    current_user: User = Depends(valid_token_user)
):
    """Get student details"""
    student = await faculty_auth_service.get_student_details(student_id, current_user.id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    return ResponseSchema(data=student, success=True)


@faculty_router.get("/students/{student_id}/plans")
async def get_student_plans(
    student_id: str,
    current_user: User = Depends(valid_token_user)
):
    """Get student's plans"""
    plans = await faculty_auth_service.get_student_plans(student_id, current_user.id)
    return ResponseSchema(data=plans, success=True)
