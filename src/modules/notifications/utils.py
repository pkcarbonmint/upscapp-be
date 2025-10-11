from src.base.service import BaseService
from .schemas import *
from .models import *

from src.external.notifications import push_notification
from src.users.models import User, Subscription
from src.users.service import UserService

from src.modules.tests.models import Test
from src.modules.tests.service import TestService
from src.modules.tests.schemas import TEST_TYPE
from src.users.routes import service
from src.external.emailer import email
from .service import UserNotificationService
from fastapi_async_sqlalchemy import db
from sqlalchemy.ext.asyncio import AsyncSession

notification_service = UserNotificationService(UserNotification, db)
test_service = TestService(Test,db)
user_service = UserService(User,db)


async def send_notifications(user_id: int,notify_type: NotificationType):
    # create dynamic data fields depending on the notification_type
    async with db():
        user = await user_service.get(id=user_id, db_session=db.session)
        data = build_notify_fields(notify_type=notify_type, user=user)

        notify_in = UserNotificationCreate(
            notification_type=notify_type,
            title=data["notify_title"],
            body=data["notify_body"],
            receiver_id=user.id,
            data=data["notify_data"],
        )

        
        notify_db = await notification_service.create(obj_in=notify_in,db_session=db.session)
        
    
        # send push if enabled (enable/diable TODO later)
        resp = await push_notification.send_push(
            registration_tokens=user.fb_device_tokens,
            title=notify_db.title,
            body=notify_db.body,
            data=notify_db.data,
        )

        # send email if enabled (enable/diable TODO later)
        email_data = {
            **notify_db.data,
            "title": notify_db.title,
            "body": notify_db.body,
        }
        # send email
        await email.send_email_notification(
            recipient_name=user.full_name, email_to=[user.email], data=email_data
        )
        return resp

async def subscribe_topic(topic: str,user_fb_tokens: list[str] = []):
    resp = await push_notification.subscribe_topic_push(registration_tokens=user_fb_tokens,topic=topic)
    return resp

async def unsubscribe_topic(topic: str,user_fb_tokens: list[str] = []):
    resp = await push_notification.unsubscribe_topic_push(registration_tokens=user_fb_tokens,topic=topic)
    return resp

async def send_admin_tests_topic_notifications(topic: str,test_id:int,notify_type: NotificationType):
    display_test_types = {
    TEST_TYPE.totd: "Test of the day",
    TEST_TYPE.pyq: "PYQ",
    TEST_TYPE.model: "Model",
    TEST_TYPE.current_affairs: "Current Affairs"
}
    async with db():
        test = await test_service.get(id=test_id, db_session=db.session)
        display_test_type = display_test_types.get(test.test_type)
        notify_body_format = NOTIFY_BODY.get(notify_type).format(test_name=test.title, test_type= display_test_type) or ""
        notify_body = notify_body_format.replace('UPSC.PRO', 'U'+'\u200B'+'PSC'+'\u200B'+'.'+'PRO')
        notify_title = NOTIFY_TITLE.get(notify_type).format() or ""
        notify_data = {
            "destination_page": NOTIFY_DESTINATION_PAGE.get(DestinationPage.my_tests),
            "notification_type": NotificationType.new_recommended_test,
            "test_id": str(test.id),
            "paper_id": str(test.paper["id"]),
            "test_title": test.title,
            "test_type": test.test_type,        
        }
        resp = await push_notification.send_by_topic_push(topic=topic,title=notify_title,
            body=notify_body,
            data=notify_data)  
        
        # user_emails = await user_service.get_user_emails()
        
        email_data = {      
            "title": notify_title,
            "body": notify_body
        }
        
        users_emails = await service.get_user_emails(db_session=db.session)
        # users_dict = [{**item._asdict()} for item in users]
        
        # send email
        await email.send_email_notifications(
            recipient_name= "Community" , email_to=users_emails, data=email_data
        )
        
        return resp



def build_notify_fields(notify_type: NotificationType, user: User) -> dict[str, Any]:
    subs: Subscription = user.subscription
    if notify_type == NotificationType.welcome:
        notify_body = NOTIFY_BODY.get(notify_type).format().replace('UPSC.PRO', 'U'+'\u200B'+'PSC'+'\u200B'+'.'+'PRO') or ""
        notify_title = NOTIFY_TITLE.get(notify_type).format() or ""
        notify_data = {
            "destination_page": NOTIFY_DESTINATION_PAGE.get(DestinationPage.home),
            "notification_type": NotificationType.welcome,
            "user_id": str(user.id),
            "user_name": user.full_name,
            "user_pic": user.photo or "",
        }
    elif notify_type == NotificationType.free_subscription_success:
        notify_body = NOTIFY_BODY.get(notify_type).format().replace('UPSC.PRO', 'U'+'\u200B'+'PSC'+'\u200B'+'.'+'PRO') or ""
        notify_title = NOTIFY_TITLE.get(notify_type).format() or ""
        notify_data = {
            "destination_page": NOTIFY_DESTINATION_PAGE.get(
                DestinationPage.my_subscription
            ),
            "notification_type": NotificationType.free_subscription_success,
            "user_id": str(user.id),
            "user_name": user.full_name,
            "user_pic": user.photo or "",
        }
    elif notify_type == NotificationType.paid_subscription_success:
        notify_body = (
            NOTIFY_BODY.get(notify_type).format(plan_name=subs.plan.name).replace('UPSC.PRO', 'U'+'\u200B'+'PSC'+'\u200B'+'.'+'PRO') or ""
        )
        print("plan_name is ", subs.plan.name)
        notify_title = NOTIFY_TITLE.get(notify_type).format() or ""
        notify_data = {
            "destination_page": NOTIFY_DESTINATION_PAGE.get(
                DestinationPage.my_subscription
            ),
            "notification_type": NotificationType.paid_subscription_success,
            "user_id": str(user.id),
            "user_name": user.full_name,
            "user_pic": user.photo or "",
        }
    elif notify_type == NotificationType.payment_success:
        notify_body = (
            NOTIFY_BODY.get(notify_type).format(
                amount=(subs.subscription_amount / 100),
                plan_name=subs.plan.name,
            ).replace('UPSC.PRO', 'U'+'\u200B'+'PSC'+'\u200B'+'.'+'PRO')
            or ""
        )
        notify_title = NOTIFY_TITLE.get(notify_type).format() or ""
        notify_data = {
            "destination_page": NOTIFY_DESTINATION_PAGE.get(
                DestinationPage.my_subscription
            ),
            "notification_type": NotificationType.payment_success,
            "user_id": str(user.id),
            "user_name": user.full_name,
            "user_pic": user.photo or "",
        }
    
    else:
        notify_body = ""
        notify_title = ""
        notify_data = {}

    return {
        "notify_title": notify_title,
        "notify_body": notify_body,
        "notify_data": notify_data,
    }
