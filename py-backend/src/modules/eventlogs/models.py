from src.base.models import BaseMixin
from src.database.database import Base
from sqlalchemy.orm import mapped_column, Mapped, relationship
from sqlalchemy import String, Boolean, JSON, ForeignKey, Integer, DateTime,UniqueConstraint,func
from sqlalchemy.dialects.postgresql import ARRAY

class EventLog(Base, BaseMixin):
    __tablename__ = "eventlogs"

    event_by_user_id = mapped_column(Integer, nullable=True)  # Can be None for anonymous actions
    user_name = mapped_column(String, nullable=True)
    user_phone = mapped_column(String, nullable=True)
    source_ip = mapped_column(String, nullable=True)
    event_type = mapped_column(String, nullable=False)  # e.g., "user_create", "login", etc.
    event_details = mapped_column(JSON, nullable=True)
    timestamp = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
