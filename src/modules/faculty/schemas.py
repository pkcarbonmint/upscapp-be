from pydantic import BaseModel, Field, validator
from typing import Optional, List
from src.users.schemas import PhoneNumber, USER_ROLE


class FacultyLoginRequest(BaseModel):
    """Faculty login request schema"""
    email: Optional[str] = None
    password: Optional[str] = None
    phone_number: Optional[PhoneNumber] = None
    
    @validator('email', 'password', 'phone_number')
    def validate_login_fields(cls, v, values):
        """Ensure at least one login method is provided"""
        if not any([values.get('email'), values.get('password'), values.get('phone_number')]):
            raise ValueError('Either email/password or phone_number must be provided')
        return v


class FacultyOTPRequest(BaseModel):
    """Faculty OTP request schema"""
    phone_number: PhoneNumber


class FacultyOTPVerification(BaseModel):
    """Faculty OTP verification schema"""
    verification_id: str
    otp_code: str = Field(..., min_length=6, max_length=6)


class FacultyOTPResponse(BaseModel):
    """Faculty OTP response schema"""
    success: bool
    verification_id: Optional[str] = None
    message: Optional[str] = None
    error: Optional[str] = None
    test_otp: Optional[str] = None  # For development


class FacultyLoginResponse(BaseModel):
    """Faculty login response schema"""
    success: bool
    user: Optional[dict] = None
    token: Optional[str] = None
    message: Optional[str] = None
    error: Optional[str] = None


class FacultyProfile(BaseModel):
    """Faculty profile schema"""
    id: int
    email: str
    phone_number: str
    full_name: str
    is_active: bool
    phone_verified: bool
    is_faculty: bool
    user_type: str
    roles: List[USER_ROLE]
    created_at: str
    updated_at: str
