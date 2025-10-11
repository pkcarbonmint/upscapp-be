from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import (
    String,
    Text,
    JSON,
    ForeignKey,
    Integer,
    DateTime,
    func,
    Enum,
    Float,
    Boolean,
    UUID,
)
from sqlalchemy.dialects.postgresql import ARRAY
from src.base.models import BaseMixin
from src.database.database import Base


class UserNotification(Base, BaseMixin):
    __tablename__ = "usernotifications"

    notification_type = mapped_column(String)
    title = mapped_column(String)
    body = mapped_column(String)
    receiver_id = mapped_column(ForeignKey("users.id"))
    is_read = mapped_column(Boolean, default=False)
    data = mapped_column(JSON)
    # notification_id = mapped_column(ForeignKey("notifications.id"))
    # notification = relationship("Notification", lazy="selectin")


# class Notification(Base, BaseMixin):
#     __tablename__ = "notifications"

#     type = mapped_column(String, unique=True)
#     name = mapped_column(String)
#     destination_page = mapped_column(String)


"""
class NotificationSetting()

"""
