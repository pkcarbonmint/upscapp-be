from fastapi import APIRouter, Depends
from src.auth.deps import valid_token_user
from src.users.models import User
from fastapi_async_sqlalchemy import db
from .service import *
from .models import UserNotification
from .exceptions import NotificationNotFound
from .utils import send_notifications


notification_router = APIRouter(prefix="/notifications", tags=["Notification"])
notification_router_v2 = APIRouter(prefix="/notifications", tags=["Notification V2"])

notification_service = UserNotificationService(UserNotification, db)

@notification_router_v2.post("/test")
@notification_router.post("/test")
async def test_push(*, notification_type: str, user: User = Depends(valid_token_user)):
    response = await send_notifications(user=user, notify_type=notification_type,db_session=db.session)
    return response

@notification_router_v2.get("", response_model=list[UserNotificationResponse])
@notification_router.get("", response_model=list[UserNotificationResponse])
async def get_notifications(*, user: User = Depends(valid_token_user)):
    notification_db = await notification_service.get_by_field_multi(
        value=user.id, field="receiver_id", db_session=db.session
    )
    return notification_db

@notification_router_v2.put("", response_model=list[UserNotificationResponse])
@notification_router.put("", response_model=list[UserNotificationResponse])
async def mark_notifications(user: User = Depends(valid_token_user)):
    notification_db = await notification_service.get_by_field_multi(
        value=user.id, field="receiver_id", db_session=db.session
    )
    if not notification_db:
        NotificationNotFound()
    for n in notification_db:
        n_update = UserNotification(is_read=True)
        notification_update_db = await notification_service.update(
            obj_current=n, obj_new=n_update, db_session=db.session
        )
    return notification_db

@notification_router_v2.delete("")
@notification_router.delete("")
async def delete_notifications(*, user: User = Depends(valid_token_user)):
    notifications = await notification_service.get_by_field_multi(
        value=user.id, field="receiver_id", db_session=db.session
    )
    for n in notifications:
        await notification_service.delete(id=n.id, db_session=db.session)

    return {"message": "Notifications deleted successfully"}

@notification_router_v2.put("/{id}", response_model=UserNotificationResponse)
@notification_router.put("/{id}", response_model=UserNotificationResponse)
async def mark_notification(*, id: int, user: User = Depends(valid_token_user)):
    notification_db = await notification_service.get_notification(
        notify_id=id, user_id=user.id, db_session=db.session
    )
    notification_update = UserNotification(is_read=True)
    notification_update_db = await notification_service.update(
        obj_current=notification_db, obj_new=notification_update, db_session=db.session
    )
    return notification_update_db

@notification_router_v2.delete("/{id}")
@notification_router.delete("/{id}")
async def delete_notification(*, id: int, user: User = Depends(valid_token_user)):
    notification_db = await notification_service.get_notification(
        notify_id=id, user_id=user.id, db_session=db.session
    )
    notify_delete = await notification_service.delete(id=notification_db.id, db_session=db.session)
    return {"message": "Notifications deleted successfully"}
