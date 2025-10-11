from src.exceptions import DetailedHTTPException, status


class ErrorCode:
    TRANSACTION_FAILED = "Transaction failed"
    NOTIFICATION_FAILED = "Recurring debit notification failed"
    RECURR_FAILED = "Auto debit for subscription failed"
    SUBS_CANCEL_FAILED = "Cancellation of subcription failed"
    CALL_BACK_NOT_FOUND = "Call back type not found"
    SUBSCRIPTION_FAILED = "Create pg subscription failed"
    VPA_NOT_VERIFIED = "VPA not verified."
    VPA_REQUIRED = "VPA required."
    TARGET_APP_REQUIRED = "Target app required."
    AUTH_REQUEST_FAILED = "Subscription mandate auth request failed"
    AUTH_STATUS_CHECK_FAILED = "Auth status check failed."
    PG_REQUEST_FAILED = "PhonePe pg request failed."
    RECURR_INIT_FAILED = ""


class PgRequestFailed(DetailedHTTPException):
    STATUS_CODE = status.HTTP_501_NOT_IMPLEMENTED
    DETAIL = ErrorCode.PG_REQUEST_FAILED


class TransactionFailed(DetailedHTTPException):
    STATUS_CODE = status.HTTP_501_NOT_IMPLEMENTED
    DETAIL = ErrorCode.TRANSACTION_FAILED


class NotificationFailed(DetailedHTTPException):
    STATUS_CODE = status.HTTP_501_NOT_IMPLEMENTED
    DETAIL = ErrorCode.NOTIFICATION_FAILED


class RecurringDebitFailed(DetailedHTTPException):
    STATUS_CODE = status.HTTP_501_NOT_IMPLEMENTED
    DETAIL = ErrorCode.RECURR_FAILED


class CancelSubscriptionFailed(DetailedHTTPException):
    STATUS_CODE = status.HTTP_501_NOT_IMPLEMENTED
    DETAIL = ErrorCode.SUBS_CANCEL_FAILED


class CallBackNotFound(DetailedHTTPException):
    STATUS_CODE = status.HTTP_501_NOT_IMPLEMENTED
    DETAIL = ErrorCode.CALL_BACK_NOT_FOUND


class PgSubsCreateFailed(DetailedHTTPException):
    STATUS_CODE = status.HTTP_400_BAD_REQUEST
    DETAIL = ErrorCode.SUBSCRIPTION_FAILED


class VPANotVerified(DetailedHTTPException):
    STATUS_CODE = status.HTTP_403_FORBIDDEN
    DETAIL = ErrorCode.VPA_NOT_VERIFIED


class VPARequired(DetailedHTTPException):
    STATUS_CODE = status.HTTP_400_BAD_REQUEST
    DETAIL = ErrorCode.VPA_REQUIRED


class TargetAppRequired(DetailedHTTPException):
    STATUS_CODE = status.HTTP_400_BAD_REQUEST
    DETAIL = ErrorCode.TARGET_APP_REQUIRED


class AuthMandateRequestFailed(DetailedHTTPException):
    STATUS_CODE = status.HTTP_400_BAD_REQUEST
    DETAIL = ErrorCode.AUTH_REQUEST_FAILED


class AuthStatusCheckFailed(DetailedHTTPException):
    STATUS_CODE = status.HTTP_400_BAD_REQUEST
    DETAIL = ErrorCode.AUTH_STATUS_CHECK_FAILED
