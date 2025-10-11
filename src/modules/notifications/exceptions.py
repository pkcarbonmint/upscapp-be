from src.exceptions import BadRequest, NotFound, DetailedHTTPException, status


class ErrorCode:
    NOTIFICATION_NOT_FOUND = "Notification does not exist."


class NotificationNotFound(NotFound):
    DETAIL = ErrorCode.NOTIFICATION_NOT_FOUND
