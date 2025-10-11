from src.base.schemas import BaseSchema
from enum import Enum
from typing import Any, Optional, Dict
from datetime import datetime


class DestinationPage(str, Enum):
    home = "HOME"
    my_subscription = "MY_SUBSCRIPTION"
    # recommended_tests = "RECOMMENDED_TESTS"
    my_tests = "MY_TESTS"


class NotificationType(str, Enum):
    welcome = "WELCOME"
    free_subscription_success = "FREE_SUBSCRIPTION_SUCCESS"
    paid_subscription_success = "PAID_SUBSCRIPTION_SUCCESS"
    payment_success = "PAYMENT_SUCCESS"
    new_recommended_test = "NEW_RECOMMENDED_TEST"

NOTIFY_BODY = {
    NotificationType.welcome: f"Welcome!\n You have successfully registered for the UPSC.PRO Prelims Question Bank app. We are delighted to have you on board. You are one step closer to achieving your dream of becoming a civil servant.\n We wish you all the best and hope you enjoy using the app.",
    NotificationType.free_subscription_success: "Congratulations! You have successfully subscribed to UPSC.PRO’s free plan! You can now use the app features (restricted) until your free plan expires. If you like our app, you can buy subscription for full access from Profile-My Subscription.",
    NotificationType.paid_subscription_success: "Congratulations! You have successfully subscribed to UPSC.PRO {plan_name} plan! You can now use the app features subject to completion of payment. If your payment fails or is incomplete, you can retry payment from Profile-My Subscription.",
    NotificationType.payment_success: "Thanks! We have received your payment of Rs. {amount} for subscribing to UPSC.PRO plan {plan_name}! You can download your receipt from Profile-My Subscription.",
    NotificationType.new_recommended_test: "A new UPSC.PRO Prelims Test \"{test_name}\" is now available. Login to the app or tap on notification to take the test."
}
NOTIFY_DESTINATION_PAGE = {
    DestinationPage.home: "HOME",
    DestinationPage.my_subscription: "MY_SUBSCRIPTION",
    DestinationPage.my_tests: "MY_TESTS",
}

NOTIFY_DESTINATION_URLS = {
    DestinationPage.home: "",
    DestinationPage.my_subscription: "",
    DestinationPage.my_tests: "",
}


NOTIFY_TITLE = {
    NotificationType.welcome: "Welcome to UPSC.PRO",
    NotificationType.free_subscription_success: "UPSC.PRO Subscription",
    NotificationType.paid_subscription_success: "UPSC.PRO Subscription",
    NotificationType.payment_success: "UPSC.PRO Payment",
    NotificationType.new_recommended_test: "New UPSC.PRO Prelims Test Available"
}

"""
Notification schemas
"""


# class NotificationBase(BaseSchema):
#     pass


# class NotificationCreate(NotificationBase):
#     type: str
#     name: str
#     destination_page: DestinationPage = DestinationPage.home


# class NotificationUpdate(NotificationBase):
#     pass


# class NotificationResponse(NotificationCreate):
#     id: int


"""
User Notification schemas
"""


class UserNotificationBase(BaseSchema):
    is_read: bool = False


class UserNotificationCreate(UserNotificationBase):
    notification_type: str | None = None
    title: str | None = None
    body: str | None = None
    receiver_id: int
    data: dict[str, Any] | None = None


class UserNotificationUpdate(UserNotificationBase):
    pass


class UserNotificationResponse(UserNotificationCreate):
    id: int
    created_at: datetime
