from fastapi import APIRouter, Depends, HTTPException, Body
from fastapi_async_sqlalchemy.middleware import db
from sqlalchemy.ext.asyncio import AsyncSession
from src.modules.plan_editor.service import PlanEditorService
from src.users.models import User
from src.auth.deps import valid_token_user
from src.base.schemas import ResponseSchema
from typing import Dict, Any, Optional
import json

router = APIRouter(prefix="/studyplanner/plans/editor", tags=["Plan Editor"])


@router.post("/session/create")
async def create_editor_session(
    plan_id: Optional[int] = None,
    current_user: User = Depends(valid_token_user)
) -> ResponseSchema[dict]:
    """
    Create a new plan editor session.
    """
    service = PlanEditorService(db.session)
    
    session_id = await service.create_session(
        user_id=current_user.id,
        plan_id=plan_id
    )
    
    return ResponseSchema(
        data={
            "session_id": session_id,
            "message": "Editor session created successfully"
        },
        success=True
    )


@router.post("/session/{session_id}/save")
async def save_editor_session(
    session_id: str,
    plan_data: Dict[str, Any] = Body(...),
    current_user: User = Depends(valid_token_user)
) -> ResponseSchema[dict]:
    """
    Save plan data to an editor session.
    """
    service = PlanEditorService(db.session)
    
    success = await service.save_session(
        session_id=session_id,
        plan_data=plan_data,
        user_id=current_user.id
    )
    
    if not success:
        raise HTTPException(status_code=400, detail="Failed to save session")
    
    return ResponseSchema(
        data={"message": "Session saved successfully"},
        success=True
    )


@router.get("/session/{session_id}")
async def load_editor_session(
    session_id: str,
    current_user: User = Depends(valid_token_user)
) -> ResponseSchema[dict]:
    """
    Load plan data from an editor session.
    """
    service = PlanEditorService(db.session)
    
    plan_data = await service.load_session(
        session_id=session_id,
        user_id=current_user.id
    )
    
    if not plan_data:
        raise HTTPException(status_code=404, detail="Session not found")
    
    return ResponseSchema(data=plan_data, success=True)


@router.post("/validate")
async def validate_plan(
    plan_data: Dict[str, Any] = Body(...),
    current_user: User = Depends(valid_token_user)
) -> ResponseSchema[dict]:
    """
    Validate a plan using the Helios engine.
    """
    service = PlanEditorService(db.session)
    
    validation_errors = await service.validate_plan(plan_data)
    
    return ResponseSchema(
        data={
            "errors": validation_errors,
            "is_valid": len(validation_errors) == 0
        },
        success=True
    )


@router.post("/draft/save")
async def save_draft_plan(
    plan_data: Dict[str, Any] = Body(...),
    plan_id: Optional[int] = None,
    current_user: User = Depends(valid_token_user)
) -> ResponseSchema[dict]:
    """
    Save a draft plan to the database.
    """
    service = PlanEditorService(db.session)
    
    saved_plan_id = await service.save_draft_plan(
        plan_data=plan_data,
        user_id=current_user.id,
        plan_id=plan_id
    )
    
    return ResponseSchema(
        data={
            "plan_id": saved_plan_id,
            "message": "Draft plan saved successfully"
        },
        success=True
    )


@router.post("/submit-review")
async def submit_plan_for_review(
    plan_id: int = Body(...),
    current_user: User = Depends(valid_token_user)
) -> ResponseSchema[dict]:
    """
    Submit a plan for faculty review.
    """
    if not current_user.student_id:
        raise HTTPException(status_code=400, detail="Student ID not found")
    
    service = PlanEditorService(db.session)
    
    success = await service.submit_for_review(
        plan_id=plan_id,
        user_id=current_user.id,
        student_id=current_user.student_id
    )
    
    if not success:
        raise HTTPException(status_code=400, detail="Failed to submit plan for review")
    
    return ResponseSchema(
        data={"message": "Plan submitted for review successfully"},
        success=True
    )


@router.get("/sessions")
async def get_user_sessions(
    current_user: User = Depends(valid_token_user)
) -> ResponseSchema[dict]:
    """
    Get all editor sessions for the current user.
    """
    service = PlanEditorService(db.session)
    
    sessions = await service.get_user_sessions(current_user.id)
    
    return ResponseSchema(data={"sessions": sessions}, success=True)


@router.delete("/session/{session_id}")
async def delete_editor_session(
    session_id: str,
    current_user: User = Depends(valid_token_user)
) -> ResponseSchema[dict]:
    """
    Delete an editor session.
    """
    service = PlanEditorService(db.session)
    
    success = await service.delete_session(
        session_id=session_id,
        user_id=current_user.id
    )
    
    if not success:
        raise HTTPException(status_code=400, detail="Failed to delete session")
    
    return ResponseSchema(
        data={"message": "Session deleted successfully"},
        success=True
    )
