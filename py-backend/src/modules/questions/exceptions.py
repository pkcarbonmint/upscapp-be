from src.exceptions import BadRequest, NotFound, DetailedHTTPException, status


class ErrorCode:
    QUESTION_NOT_FOUND = "Question with id does not exist."


class QuestionNotFound(NotFound):
    STATUS_CODE = status.HTTP_404_NOT_FOUND
    DETAIL = ErrorCode.QUESTION_NOT_FOUND
