from __future__ import annotations
from typing import List, Optional, Literal
from pydantic import BaseModel, Field, constr, EmailStr
from datetime import date


# Requests
class BackgroundInput(BaseModel):
    name: str
    phone: constr(strip_whitespace=True, min_length=7, max_length=20, pattern=r"^[0-9+()\-\s]+$")
    email: EmailStr
    city: str
    state: str
    graduation_stream: str
    college: str
    graduation_year: int
    about: str


class TargetInput(BaseModel):
    target_year: int
    start_date: Optional[str] = None
    attempt_number: Optional[int] = None
    optional_subjects: Optional[List[str]] = None
    study_approach: Optional[str] = None


class CommitmentInput(BaseModel):
    weekly_hours: int = Field(ge=0, le=168)
    available_days: Optional[List[str]] = None
    constraints: Optional[str] = None


class ConfidenceInput(BaseModel):
    confidence: int = Field(ge=0, le=100)
    areas_of_concern: Optional[List[str]] = None


class PaymentInput(BaseModel):
    name_on_card: str
    card_last4: constr(min_length=4, max_length=4)
    expiry: constr(strip_whitespace=True, min_length=4, max_length=5, pattern=r"^(0[1-9]|1[0-2])/\d{2}$")
    cvv_dummy: str


# Preview models
class BlockHours(BaseModel):
    studyHours: float
    revisionHours: float
    practiceHours: float
    testHours: float


class BlockResourceSummary(BaseModel):
    oneLine: str
    extraLine: Optional[str] = None


class BlockPreview(BaseModel):
    blockId: str
    title: str
    subjects: List[str]
    durationWeeks: int
    hours: BlockHours
    resources: BlockResourceSummary
    # Cycle information (using cycleType instead of category)
    cycleId: Optional[str] = None
    cycleName: Optional[str] = None
    cycleType: Optional[str] = None
    cycleOrder: Optional[int] = None
    # NEW: Date fields
    blockStartDate: Optional[date] = None
    blockEndDate: Optional[date] = None


class MajorMilestones(BaseModel):
    foundationToPrelimsDate: Optional[str] = None
    prelimsToMainsDate: Optional[str] = None


class IWFPreview(BaseModel):
    # Raw Haskell data for UI to process directly
    raw_helios_data: dict  # Complete StudyPlan from Haskell
    milestones: MajorMilestones
    studyPlanId: Optional[str] = None  # Study plan ID for document downloads


# Responses
class CreateStudentResponse(BaseModel):
    student_id: str
    created: bool
    class Config:
        schema_extra = {
            "example": {"student_id": "3a2b7c2d-9f9e-4b1d-8a1e-5e4b7f9f2c3a", "created": True}
        }


class UpdateAck(BaseModel):
    student_id: str
    updated: bool
    class Config:
        schema_extra = {
            "example": {"student_id": "3a2b7c2d-9f9e-4b1d-8a1e-5e4b7f9f2c3a", "updated": True}
        }


class PaymentResponse(BaseModel):
    student_id: str
    payment_status: str
    reference: str
    class Config:
        schema_extra = {
            "example": {
                "student_id": "3a2b7c2d-9f9e-4b1d-8a1e-5e4b7f9f2c3a",
                "payment_status": "accepted",
                "reference": "PMT-REF-14-4242",
            }
        }


class SubmitResponse(BaseModel):
    student_id: str
    submitted: bool
    message: str
    class Config:
        schema_extra = {
            "example": {
                "student_id": "3a2b7c2d-9f9e-4b1d-8a1e-5e4b7f9f2c3a",
                "submitted": True,
                "message": "Your application has been submitted. You will receive your plan within 48 hours.",
            }
        }


class PreviewResponse(BaseModel):
    student_id: str
    preview: IWFPreview
    class Config:
        schema_extra = {
            "example": {
                "student_id": "3a2b7c2d-9f9e-4b1d-8a1e-5e4b7f9f2c3a",
                "preview": {
                    "blocks": [
                        {
                            "blockId": "blk-1",
                            "title": "Foundation: Core GS",
                            "subjects": ["Polity", "History"],
                            "durationWeeks": 3,
                            "hours": {
                                "studyHours": 60.0,
                                "revisionHours": 12.0,
                                "practiceHours": 9.0,
                                "testHours": 6.0,
                            },
                            "resources": {
                                "oneLine": "Curated resources and PYQ-driven practice",
                                "extraLine": "Weekly checkpoints and mentor feedback",
                            },
                            "cycleType": "FoundationCycle",
                        }
                    ],
                    "milestones": {
                        "foundationToPrelimsDate": "2025-02-20",
                        "prelimsToMainsDate": "2025-06-15",
                    },
                },
            }
        }


class ErrorResponse(BaseModel):
    code: str
    message: str
    class Config:
        schema_extra = {"example": {"code": "not_found", "message": "student not found"}}
