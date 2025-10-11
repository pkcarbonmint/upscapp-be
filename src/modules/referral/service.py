from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from src.users.models import User, Referral
from src.student_id import generate_referral_code, validate_referral_code
from src.base.service import BaseService
from src.base.schemas import BaseModel


class ReferralCreate(BaseModel):
    referrer_student_id: str
    referred_student_id: Optional[int] = None
    referral_code: str


class ReferralUpdate(BaseModel):
    referred_student_id: Optional[int] = None


class ReferralService(BaseService[Referral, ReferralCreate, ReferralUpdate]):
    
    async def create_referral_link(self, student_id: str, db_session: AsyncSession) -> str:
        """
        Create a referral link for a student.
        
        Args:
            student_id: The student's ID
            db_session: Database session
            
        Returns:
            Referral code (same as student_id for simplicity)
        """
        referral_code = generate_referral_code(student_id)
        
        # Check if referral already exists
        existing = await self.get_by_field(
            field="referrer_student_id", 
            value=student_id, 
            db_session=db_session
        )
        
        if not existing:
            # Create referral record
            referral_data = ReferralCreate(
                referrer_student_id=student_id,
                referral_code=referral_code
            )
            await self.create(object=referral_data, db=db_session)
        
        return referral_code
    
    async def process_referral(self, referral_code: str, new_user_id: int, db_session: AsyncSession) -> bool:
        """
        Process an incoming referral when a new user signs up.
        
        Args:
            referral_code: The referral code used
            new_user_id: The new user's ID
            db_session: Database session
            
        Returns:
            True if referral was processed successfully
        """
        if not validate_referral_code(referral_code):
            return False
        
        # Find the referral record
        referral = await self.get_by_field(
            field="referral_code", 
            value=referral_code, 
            db_session=db_session
        )
        
        if not referral:
            return False
        
        # Update the referral with the new user ID
        update_data = ReferralUpdate(referred_student_id=new_user_id)
        await self.update(id=referral.id, obj_in=update_data, db_session=db_session)
        
        return True
    
    async def get_referral_stats(self, student_id: str, db_session: AsyncSession) -> dict:
        """
        Get referral statistics for a student.
        
        Args:
            student_id: The student's ID
            db_session: Database session
            
        Returns:
            Dictionary with referral statistics
        """
        # Get all referrals by this student
        referrals = await self.get_multi(
            filters={"referrer_student_id": student_id},
            db_session=db_session
        )
        
        total_referrals = len(referrals)
        successful_referrals = len([r for r in referrals if r.referred_student_id is not None])
        
        return {
            "total_referrals": total_referrals,
            "successful_referrals": successful_referrals,
            "referral_code": student_id  # Same as student_id for simplicity
        }
    
    async def get_referrer_by_code(self, referral_code: str, db_session: AsyncSession) -> Optional[str]:
        """
        Get the referrer's student ID by referral code.
        
        Args:
            referral_code: The referral code
            db_session: Database session
            
        Returns:
            Referrer's student ID if found, None otherwise
        """
        referral = await self.get_by_field(
            field="referral_code", 
            value=referral_code, 
            db_session=db_session
        )
        
        return referral.referrer_student_id if referral else None
