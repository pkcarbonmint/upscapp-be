from src.auth.constants import ErrorCode
from src.exceptions import BadRequest, NotAuthenticated, PermissionDenied, NotFound


class AuthRequired(NotAuthenticated):
    DETAIL = ErrorCode.AUTHENTICATION_REQUIRED


class AuthorizationFailed(PermissionDenied):
    DETAIL = ErrorCode.AUTHORIZATION_FAILED

class AuthenticationFailed(NotAuthenticated):
    DETAIL = ErrorCode.AUTHENTICATION_FAILED

class InvalidToken(NotAuthenticated):
    DETAIL = ErrorCode.INVALID_TOKEN

class UserNotActive(NotAuthenticated):
    DETAIL = ErrorCode.USER_INVALID


class InvalidAuthScheme(NotAuthenticated):
    DETAIL = ErrorCode.INVALID_AUTH_SCHEME


class InvalidCredentials(NotAuthenticated):
    DETAIL = ErrorCode.INVALID_CREDENTIALS


class RefreshTokenNotValid(NotAuthenticated):
    DETAIL = ErrorCode.REFRESH_TOKEN_NOT_VALID
