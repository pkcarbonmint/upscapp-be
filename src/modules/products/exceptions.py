from src.exceptions import BadRequest, DetailedHTTPException, status


class ErrorCode:
    BATCH_CANT_BE_CREATED = "Batch cannot be created"
    ALREADY_EXISTS = "Resource already exists with provided input"

class NotBatchable(DetailedHTTPException):
    STATUS_CODE = status.HTTP_400_BAD_REQUEST
    DETAIL = ErrorCode.BATCH_CANT_BE_CREATED

class ResourceAlreadyExists(DetailedHTTPException):
    STATUS_CODE = status.HTTP_409_CONFLICT
    DETAIL = ErrorCode.ALREADY_EXISTS

