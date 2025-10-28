from src.base.service import BaseService
from .schemas import *
from .models import *
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession


class UserNotificationService(
    BaseService[UserNotification, UserNotificationCreate, UserNotificationUpdate]
):
    async def get_notification(
        self, notify_id: int, user_id: int, db_session: AsyncSession | None = None
    ):
        session = db_session 
        query = select(self.model).where(
            and_(
                self.model.id == notify_id,
                self.model.receiver_id == user_id,
            )
        )
        notification = await session.execute(query)

        return notification.scalar_one_or_none()
