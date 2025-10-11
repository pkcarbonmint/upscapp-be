from fastapi import APIRouter, Depends, HTTPException
from fastapi_async_sqlalchemy.middleware import db
from sqlalchemy.ext.asyncio import AsyncSession
from src.modules.referral.service import referral_service
from src.users.models import User
from src.auth.deps import valid_token_user
from src.base.schemas import ResponseSchema

router = APIRouter(prefix="/studyplanner/referral", tags=["Referral"])


@router.post("/create-link")
async def create_referral_link(
    current_user: User = Depends(valid_token_user)
) -> ResponseSchema[dict]:
    """
    Create a referral link for the current user.
    """
    if not current_user.student_id:
        raise HTTPException(status_code=400, detail="Student ID not found")
    
    referral_code = await referral_service.create_referral_link(
        student_id=current_user.student_id,
        db_session=db.session
    )
    
    return ResponseSchema(
        data={
            "referral_code": referral_code,
            "referral_link": f"{current_user.student_id}?ref={referral_code}"
        },
        success=True
    )


@router.post("/process")
async def process_referral(
    referral_code: str,
    current_user: User = Depends(valid_token_user)
) -> ResponseSchema[dict]:
    """
    Process a referral when a user signs up with a referral code.
    """
    success = await referral_service.process_referral(
        referral_code=referral_code,
        new_user_id=current_user.id,
        db_session=db.session
    )
    
    if not success:
        raise HTTPException(status_code=400, detail="Invalid referral code")
    
    return ResponseSchema(
        data={"message": "Referral processed successfully"},
        success=True
    )


@router.get("/stats")
async def get_referral_stats(
    current_user: User = Depends(valid_token_user)
) -> ResponseSchema[dict]:
    """
    Get referral statistics for the current user.
    """
    if not current_user.student_id:
        raise HTTPException(status_code=400, detail="Student ID not found")
    
    stats = await referral_service.get_referral_stats(
        student_id=current_user.student_id,
        db_session=db.session
    )
    
    return ResponseSchema(data=stats, success=True)


@router.get("/referrer/{referral_code}")
async def get_referrer_by_code(
    referral_code: str
) -> ResponseSchema[dict]:
    """
    Get the referrer's student ID by referral code (public endpoint).
    """
    referrer_id = await referral_service.get_referrer_by_code(
        referral_code=referral_code,
        db_session=db.session
    )
    
    if not referrer_id:
        raise HTTPException(status_code=404, detail="Referral code not found")
    
    return ResponseSchema(
        data={"referrer_student_id": referrer_id},
        success=True
    )
