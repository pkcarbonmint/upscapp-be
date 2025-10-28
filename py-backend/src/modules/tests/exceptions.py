from src.exceptions import BadRequest, NotFound, DetailedHTTPException, status


class ErrorCode:
    TEST_NOT_FOUND = "Test does not exist."
    TEST_NOT_READY = "Test is not ready."
    TEST_PAPER_NOT_FOUND = " Selected Test paper not found"
    RECOMMENDED_TEST_NOT_FOUND = "No Recommended Tests found"
    NO_QUESTIONS = "Not enough questions for the selected values"
    TEST_Q_ATTEMPT_NOT_FOUND = "Attempt for the test question not found"
    TEST_ATTEMPT_NOT_FOUND = "Attempt for the test not found"
    TEST_ATTEMPT_NOT_SUBMITTED = " Test Attempt not in submitted status"
    TEST_ATTEMPT_NO_FOUND = "No Test Attempts"
    TEST_ATTEMPT_EXISTS = "Test attempt already exists. Use resume instead."
    TEST_Q_ATTEMPT_EXISTS = "Test Question attempt already exists. Use update instead."


class TestNotFound(NotFound):
    STATUS_CODE = status.HTTP_404_NOT_FOUND
    DETAIL = ErrorCode.TEST_NOT_FOUND


class TestNotReady(NotFound):
    STATUS_CODE = status.HTTP_404_NOT_FOUND
    DETAIL = ErrorCode.TEST_NOT_READY


class TestPaperNotFound(NotFound):
    STATUS_CODE = status.HTTP_404_NOT_FOUND
    DETAIL = ErrorCode.TEST_PAPER_NOT_FOUND


class RecommendedTestsNotFound(NotFound):
    STATUS_CODE = status.HTTP_404_NOT_FOUND
    DETAIL = ErrorCode.RECOMMENDED_TEST_NOT_FOUND


class NotEnoughQuestions(NotFound):
    STATUS_CODE = status.HTTP_404_NOT_FOUND
    DETAIL = ErrorCode.NO_QUESTIONS


class TestQuestionAttemptNotFound(NotFound):
    STATUS_CODE = status.HTTP_404_NOT_FOUND
    DETAIL = ErrorCode.TEST_Q_ATTEMPT_NOT_FOUND


class TestAttemptNotFound(NotFound):
    STATUS_CODE = status.HTTP_404_NOT_FOUND
    DETAIL = ErrorCode.TEST_ATTEMPT_NOT_FOUND

class TestAttemptNotSubmitted():
    STATUS_CODE = status.HTTP_404_NOT_FOUND
    DETAIL = ErrorCode.TEST_ATTEMPT_NOT_SUBMITTED

class AttemptNotFound(NotFound):
    STATUS_CODE = status.HTTP_404_NOT_FOUND
    DETAIL = ErrorCode.TEST_ATTEMPT_NO_FOUND


class TestAttemptExists(NotFound):
    STATUS_CODE = status.HTTP_404_NOT_FOUND
    DETAIL = ErrorCode.TEST_ATTEMPT_EXISTS


class TestQuestionAttemptExists(NotFound):
    STATUS_CODE = status.HTTP_404_NOT_FOUND
    DETAIL = ErrorCode.TEST_Q_ATTEMPT_EXISTS
