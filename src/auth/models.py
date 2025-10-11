from sqlalchemy.orm import mapped_column
from sqlalchemy import String, DateTime, ForeignKey, UUID, func
from src.database.database import Base
import uuid


class RefreshToken(Base):
    __tablename__ = "refreshtokens"
    uuid = mapped_column(UUID, primary_key=True, default=uuid.uuid4)
    user_id = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    refresh_token = mapped_column(String, nullable=False)
    expires_at = mapped_column(DateTime, nullable=False)
    created_at = mapped_column(DateTime, server_default=func.now(), nullable=False)
    updated_at = mapped_column(DateTime, onupdate=func.now())
