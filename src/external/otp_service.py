import random
import string
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi_async_sqlalchemy import db
from sqlalchemy import select, and_
from src.external.notifications import push_notification


class OTPService:
    """Service for handling OTP generation, sending, and verification"""
    
    def __init__(self):
        self.otp_storage: Dict[str, Dict[str, Any]] = {}  # In-memory storage for demo
        self.otp_expiry_minutes = 5
        self.max_attempts = 3
    
    def _generate_otp(self, length: int = 6) -> str:
        """Generate a random OTP code"""
        return ''.join(random.choices(string.digits, k=length))
    
    def _generate_otp_for_phone(self, phone_number: str) -> str:
        """Generate OTP for specific phone number (with test OTPs)"""
        # Test OTPs for specific phone numbers
        test_otps = {
            '8888888888': '666666',  # All 8s phone -> All 6s OTP
            '6666666666': '777777',  # All 6s phone -> All 7s OTP
            '+918888888888': '666666',  # With country code
            '+916666666666': '777777',  # With country code
            '+919999999999': '123456',  # Admin phone
        }
        
        # Return test OTP if this is a test phone number
        if phone_number in test_otps:
            return test_otps[phone_number]
        
        # Generate random OTP for other numbers
        return self._generate_otp()
    
    def _generate_verification_id(self) -> str:
        """Generate a unique verification ID"""
        return ''.join(random.choices(string.ascii_letters + string.digits, k=32))
    
    async def send_otp(self, phone_number: str) -> Dict[str, Any]:
        """
        Send OTP to phone number
        Returns verification ID and success status
        """
        try:
            # Generate OTP and verification ID
            otp_code = self._generate_otp_for_phone(phone_number)
            verification_id = self._generate_verification_id()
            
            # Store OTP data
            self.otp_storage[verification_id] = {
                'phone_number': phone_number,
                'otp_code': otp_code,
                'created_at': datetime.utcnow(),
                'attempts': 0,
                'is_verified': False
            }
            
            # In a real implementation, you would send SMS here
            # For now, we'll just log it and return success
            print(f"OTP for {phone_number}: {otp_code}")
            
            # TODO: Integrate with actual SMS service (Twilio, AWS SNS, etc.)
            # await self._send_sms(phone_number, otp_code)
            
            return {
                'success': True,
                'verification_id': verification_id,
                'message': 'OTP sent successfully',
                'test_otp': otp_code  # For development/testing
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': f'Failed to send OTP: {str(e)}'
            }
    
    async def verify_otp(self, verification_id: str, otp_code: str) -> Dict[str, Any]:
        """
        Verify OTP code
        Returns verification status
        """
        try:
            # Check if verification ID exists
            if verification_id not in self.otp_storage:
                return {
                    'success': False,
                    'error': 'Invalid verification ID'
                }
            
            otp_data = self.otp_storage[verification_id]
            
            # Check if OTP has expired
            if datetime.utcnow() - otp_data['created_at'] > timedelta(minutes=self.otp_expiry_minutes):
                # Clean up expired OTP
                del self.otp_storage[verification_id]
                return {
                    'success': False,
                    'error': 'OTP has expired'
                }
            
            # Check if already verified
            if otp_data['is_verified']:
                return {
                    'success': True,
                    'message': 'Phone number already verified'
                }
            
            # Check attempts
            if otp_data['attempts'] >= self.max_attempts:
                del self.otp_storage[verification_id]
                return {
                    'success': False,
                    'error': 'Maximum verification attempts exceeded'
                }
            
            # Verify OTP code
            if otp_data['otp_code'] == otp_code:
                # Mark as verified
                otp_data['is_verified'] = True
                otp_data['verified_at'] = datetime.utcnow()
                
                return {
                    'success': True,
                    'message': 'Phone number verified successfully'
                }
            else:
                # Increment attempts
                otp_data['attempts'] += 1
                
                remaining_attempts = self.max_attempts - otp_data['attempts']
                return {
                    'success': False,
                    'error': f'Invalid OTP code. {remaining_attempts} attempts remaining'
                }
                
        except Exception as e:
            return {
                'success': False,
                'error': f'Verification failed: {str(e)}'
            }
    
    async def check_verification_status(self, verification_id: str) -> Dict[str, Any]:
        """Check if phone number is verified"""
        try:
            if verification_id not in self.otp_storage:
                return {
                    'success': False,
                    'error': 'Invalid verification ID'
                }
            
            otp_data = self.otp_storage[verification_id]
            
            # Check if expired
            if datetime.utcnow() - otp_data['created_at'] > timedelta(minutes=self.otp_expiry_minutes):
                del self.otp_storage[verification_id]
                return {
                    'success': False,
                    'error': 'Verification expired'
                }
            
            return {
                'success': True,
                'is_verified': otp_data['is_verified'],
                'phone_number': otp_data['phone_number'],
                'attempts': otp_data['attempts']
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': f'Status check failed: {str(e)}'
            }
    
    def cleanup_expired_otps(self):
        """Clean up expired OTPs from storage"""
        current_time = datetime.utcnow()
        expired_ids = []
        
        for verification_id, otp_data in self.otp_storage.items():
            if current_time - otp_data['created_at'] > timedelta(minutes=self.otp_expiry_minutes):
                expired_ids.append(verification_id)
        
        for verification_id in expired_ids:
            del self.otp_storage[verification_id]


# Global instance
otp_service = OTPService()
