from __future__ import annotations
import uuid
import logging
from typing import Any
from fastapi import HTTPException
from fastapi_async_sqlalchemy import db
from sqlalchemy import update, select
from .models import OnboardingStudent

logger = logging.getLogger(__name__)


def _normalize_phone(phone: str) -> str:
    # Keep digits and leading plus, drop spaces/dashes/parentheses
    phone = phone.strip()
    plus = "+" if phone.startswith("+") else ""
    digits = "".join(ch for ch in phone if ch.isdigit())
    return f"{plus}{digits}" if digits else phone


def _normalize_str(v: Any) -> Any:
    return v.strip() if isinstance(v, str) else v


def _normalize_background(d: dict[str, Any]) -> dict[str, Any]:
    out = dict(d)
    out["name"] = _normalize_str(out.get("name", ""))
    out["city"] = _normalize_str(out.get("city", ""))
    out["state"] = _normalize_str(out.get("state", ""))
    out["graduation_stream"] = _normalize_str(out.get("graduation_stream", ""))
    out["college"] = _normalize_str(out.get("college", ""))
    out["about"] = _normalize_str(out.get("about", ""))
    email = out.get("email")
    if isinstance(email, str):
        out["email"] = email.strip().lower()
    phone = out.get("phone")
    if isinstance(phone, str):
        out["phone"] = _normalize_phone(phone)
    return out


def _normalize_payment(d: dict[str, Any]) -> dict[str, Any]:
    out = dict(d)
    name = out.get("name_on_card")
    if isinstance(name, str):
        out["name_on_card"] = name.strip()
    last4 = out.get("card_last4")
    if isinstance(last4, str):
        out["card_last4"] = last4.strip()
    expiry = out.get("expiry")
    if isinstance(expiry, str):
        out["expiry"] = expiry.strip()
    cvv = out.get("cvv_dummy")
    if isinstance(cvv, str):
        out["cvv_dummy"] = cvv.strip()
    return out


async def create_student_row(background_dict: dict[str, Any]) -> str:
    student = OnboardingStudent(
        id=uuid.uuid4(),
        background=_normalize_background(background_dict),
        final={"submitted": False, "message": None},
    )
    db.session.add(student)  # type: ignore[attr-defined]
    await db.session.flush()  # type: ignore[attr-defined]
    await db.session.commit()  # type: ignore[attr-defined]
    logger.info("onboarding.create_student", extra={"student_id": str(student.id)})
    return str(student.id)


async def student_exists(student_id: str) -> None:
    result = await db.session.execute(  # type: ignore[attr-defined]
        select(OnboardingStudent.id).where(OnboardingStudent.id == uuid.UUID(student_id))
    )
    if result.scalar_one_or_none() is None:
        raise HTTPException(status_code=404, detail={"code": "not_found", "message": "student not found"})


async def update_section(student_id: str, section: str, value: dict[str, Any]) -> None:
    # Ensure the student exists first
    await student_exists(student_id)
    # Normalize certain sections
    if section == "background":
        value = _normalize_background(value)
    elif section == "payment":
        value = _normalize_payment(value)
    stmt = (
        update(OnboardingStudent)
        .where(OnboardingStudent.id == uuid.UUID(student_id))
        .values({section: value})
    )
    await db.session.execute(stmt)  # type: ignore[attr-defined]
    await db.session.commit()  # type: ignore[attr-defined]
    logger.info("onboarding.update_section", extra={"student_id": student_id, "section": section})


async def set_final_submitted(student_id: str, message: str) -> None:
    await student_exists(student_id)
    stmt = (
        update(OnboardingStudent)
        .where(OnboardingStudent.id == uuid.UUID(student_id))
        .values({"final": {"submitted": True, "message": message}})
    )
    await db.session.execute(stmt)  # type: ignore[attr-defined]
    await db.session.commit()  # type: ignore[attr-defined]
    logger.info("onboarding.submit", extra={"student_id": student_id})


async def create_student(background_dict: dict[str, Any]) -> str:
    """Create a new student - alias for create_student_row"""
    return await create_student_row(background_dict)


async def update_student_target(student_id: str, target_dict: dict[str, Any]) -> None:
    """Update student target information"""
    await update_section(student_id, "target", target_dict)


async def update_student_commitment(student_id: str, commitment_dict: dict[str, Any]) -> None:
    """Update student commitment information"""
    await update_section(student_id, "commitment", commitment_dict)


async def update_student_confidence(student_id: str, confidence_dict: dict[str, Any]) -> None:
    """Update student confidence information"""
    await update_section(student_id, "confidence", confidence_dict)


async def get_student_data(student_id: str) -> dict[str, Any]:
    """Get all student data for Helios integration"""
    await student_exists(student_id)
    result = await db.session.execute(  # type: ignore[attr-defined]
        select(OnboardingStudent).where(OnboardingStudent.id == uuid.UUID(student_id))
    )
    student = result.scalar_one_or_none()
    if student is None:
        raise HTTPException(status_code=404, detail={"code": "not_found", "message": "student not found"})
    
    return {
        "background": student.background or {},
        "target": student.target or {},
        "commitment": student.commitment or {},
        "confidence": student.confidence or {},
        "payment": student.payment or {},
        "final": student.final or {}
    }
