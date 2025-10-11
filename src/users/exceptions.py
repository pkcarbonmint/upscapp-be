from src.exceptions import BadRequest, NotFound, DetailedHTTPException, status


class ErrorCode:
    EMAIL_TAKEN = "Email is already taken."
    USER_NOT_FOUND = "User does not exist."
    USER_PWD_NOT_FOUND = "No password for the user"
    USER_WITH_PH_NO_NOT_FOUND = " Referrer with phone number not found"
    PHONE_NUMBER_TAKEN = "Phone number is already taken."
    NO_PROFILES = "No profiles found."
    PROFILE_EXISTS = "Profile type already exists for user."
    PLAN_EXISTS = "Plan type already exists."
    DOMAIN_EXISTS = "Domain already exists"
    ACTIVE_SUBSCRIPTION_EXISTS = "Active subscription already exists."
    NO_SUBSCRIPTION = "No subscription found for user"
    NO_PLAN = "Plan not found."
    NO_QUOTA = "Quota not found"
    USER_ROLES_REQUIRED = "Roles required for admin user."
    USER_EMAIL_REQUIRED = "Email required for admin user."
    USER_PHONE_REQUIRED = "Phone number required for workforce user."
    USER_INACTIVE = "User is not active"
    USER_INACTIVE = "User is not active"
    USER_DELETED = "User is deleted"
    USER_EXISTS = "User already exists"
    SUPER_ADMIN_ACCESS = "User should be superadmin"
    ADMIN_ACCESS = "User should be Admin"
    USER_ROLE_ACCESS = "User role does not match with the role required for access"
    USER_TYPE_ACCESS = "User type does not match with the user type required for access"
    USER_APP_ACCESS = "User does not have access to app"
    USER_BRANCH_ACCESS = "User does not have access to branch"
    SUBS_ACCESS = "User is not subscribed or subscription is inactive or expired "
    FEATURE_QUOTA_ACCESS = (
        "User does not have the required plan feature and/or quota to access "
    )
    FEATURE_ACCESS = "User does not have the required plan feature to access"
    QUOTA_ACCESS = "User has exceed quota limit"
    DISCOUNT_EXISTS = "Discount with code already exists."


class EmailTaken(BadRequest):
    DETAIL = ErrorCode.EMAIL_TAKEN


class PhoneNumberTaken(BadRequest):
    DETAIL = ErrorCode.PHONE_NUMBER_TAKEN


class UserNotFound(NotFound):
    DETAIL = ErrorCode.USER_NOT_FOUND

class UserPwdNotFound(NotFound):
    DETAIL = ErrorCode.USER_PWD_NOT_FOUND

class UserWithPhnoNotFound(NotFound):
    DETAIL = ErrorCode.USER_WITH_PH_NO_NOT_FOUND

class UserRolesRequied(DetailedHTTPException):
    STATUS_CODE = status.HTTP_422_UNPROCESSABLE_ENTITY
    DETAIL = ErrorCode.USER_ROLES_REQUIRED


class UserEmailRequied(DetailedHTTPException):
    STATUS_CODE = status.HTTP_422_UNPROCESSABLE_ENTITY
    DETAIL = ErrorCode.USER_EMAIL_REQUIRED

class UserPhoneRequired(DetailedHTTPException):
    STATUS_CODE = status.HTTP_422_UNPROCESSABLE_ENTITY
    DETAIL = ErrorCode.USER_PHONE_REQUIRED

class ProfileNotFound(NotFound):
    DETAIL = ErrorCode.NO_PROFILES


class ProfileAlreadyExists(DetailedHTTPException):
    STATUS_CODE = status.HTTP_409_CONFLICT
    DETAIL = ErrorCode.PROFILE_EXISTS


class PlanAlreadyExists(DetailedHTTPException):
    STATUS_CODE = status.HTTP_409_CONFLICT
    DETAIL = ErrorCode.PLAN_EXISTS


class ActiveSubscriptionExists(DetailedHTTPException):
    STATUS_CODE = status.HTTP_409_CONFLICT
    DETAIL = ErrorCode.ACTIVE_SUBSCRIPTION_EXISTS


class SubscriptionNotFound(NotFound):
    DETAIL = ErrorCode.NO_SUBSCRIPTION


class PlanNotFound(NotFound):
    DETAIL = ErrorCode.NO_PLAN


class QuotaNotFound(NotFound):
    DETAIL = ErrorCode.NO_QUOTA


class UserDeactivated(DetailedHTTPException):
    STATUS_CODE = status.HTTP_401_UNAUTHORIZED
    DETAIL = ErrorCode.USER_INACTIVE

class UserDeleted(DetailedHTTPException):
    STATUS_CODE = status.HTTP_401_UNAUTHORIZED
    DETAIL = ErrorCode.USER_DELETED

class UserAlreadyExists(DetailedHTTPException):
    STATUS_CODE = status.HTTP_403_FORBIDDEN
    DETAIL = ErrorCode.USER_EXISTS 

class RequiredSuperAdminAccess(DetailedHTTPException):
    STATUS_CODE = status.HTTP_403_FORBIDDEN
    DETAIL = ErrorCode.SUPER_ADMIN_ACCESS


class RequiredAdminAccess(DetailedHTTPException):
    STATUS_CODE = status.HTTP_403_FORBIDDEN
    DETAIL = ErrorCode.ADMIN_ACCESS

class AdminDomainAlreadyExists(DetailedHTTPException):
    STATUS_CODE = status.HTTP_409_CONFLICT
    DETAIL = ErrorCode.DOMAIN_EXISTS


class RequiredUserRoleAccess(DetailedHTTPException):
    STATUS_CODE = status.HTTP_403_FORBIDDEN
    DETAIL = ErrorCode.USER_ROLE_ACCESS


class RequiredUserTypeAccess(DetailedHTTPException):
    STATUS_CODE = status.HTTP_403_FORBIDDEN
    DETAIL = ErrorCode.USER_TYPE_ACCESS

class RequiredAppAccess(DetailedHTTPException):
    STATUS_CODE = status.HTTP_403_FORBIDDEN
    DETAIL = ErrorCode.USER_APP_ACCESS

class RequiredBranchAccess(DetailedHTTPException):
    STATUS_CODE = status.HTTP_403_FORBIDDEN
    DETAIL = ErrorCode.USER_BRANCH_ACCESS


class RequiredSubscriptionAccess(DetailedHTTPException):
    STATUS_CODE = status.HTTP_403_FORBIDDEN
    DETAIL = ErrorCode.SUBS_ACCESS


class RequiredFeatureQuotaAccess(DetailedHTTPException):
    STATUS_CODE = status.HTTP_403_FORBIDDEN
    DETAIL = ErrorCode.FEATURE_QUOTA_ACCESS


class NoFeatureAccess(DetailedHTTPException):
    STATUS_CODE = status.HTTP_403_FORBIDDEN
    DETAIL = ErrorCode.FEATURE_ACCESS


class QuotaExceed(DetailedHTTPException):
    STATUS_CODE = status.HTTP_403_FORBIDDEN
    DETAIL = ErrorCode.QUOTA_ACCESS


class DiscountAlreadyExists(DetailedHTTPException):
    STATUS_CODE = status.HTTP_409_CONFLICT
    DETAIL = ErrorCode.DISCOUNT_EXISTS
