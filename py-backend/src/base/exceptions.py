from src.exceptions import BadRequest, DetailedHTTPException, status


class ErrorCode:
    MULTIPLE_FOUND = "Multiple Results Found"

class MultipleResultsFound(DetailedHTTPException):
    STATUS_CODE = status.HTTP_409_CONFLICT
    DETAIL = ErrorCode.MULTIPLE_FOUND
