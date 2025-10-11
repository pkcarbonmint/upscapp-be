from __future__ import annotations
import uuid
from sqlalchemy import Column, DateTime, func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from src.database.database import Base


class OnboardingStudent(Base):
    __tablename__ = "onboarding_students"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    background = Column(JSONB, nullable=True)
    target = Column(JSONB, nullable=True)
    commitment = Column(JSONB, nullable=True)
    confidence = Column(JSONB, nullable=True)
    payment = Column(JSONB, nullable=True)
    final = Column(JSONB, nullable=True)
    preview_cache = Column(JSONB, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
