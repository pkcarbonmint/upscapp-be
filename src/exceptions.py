from typing import Any, Union

from fastapi import HTTPException, status, Request
from starlette.status import HTTP_422_UNPROCESSABLE_ENTITY
from fastapi.encoders import jsonable_encoder
from .utils import logger
import sys
from fastapi.responses import PlainTextResponse, JSONResponse, Response
from fastapi.exceptions import (
    RequestValidationError,
    HTTPException,
    ResponseValidationError,
)
from fastapi.exception_handlers import (
    request_validation_exception_handler as _request_validation_exception_handler,
    # response_validation_exception_handler as _response_validation_exception_handler,
    http_exception_handler as _http_exception_handler,
)


async def request_validation_exception_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    """
    This is a wrapper to the default RequestValidationException handler of FastAPI.
    This function will be called when client input is not valid.
    """
    logger.debug("Our custom request_validation_exception_handler was called")
    # body = await request.body()
    # query_params = request.query_params._dict  # pylint: disable=protected-access
    detail = {
        "errors": exc.errors(),
        # "body": body.decode(),
        # "query_params": query_params,
    }
    logger.info(detail)
    # Standardized error shape
    return JSONResponse(
        status_code=HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "code": "validation_error",
            "message": "Request validation failed",
            "details": jsonable_encoder(exc.errors()),
        },
    )


async def response_validation_exception_handler(
    request: Request, exc: ResponseValidationError
) -> JSONResponse:
    """
    This is a wrapper to the default ResponseValidationException handler of FastAPI.
    This function will be called when client input is not valid.
    """
    logger.debug("Our custom response_validation_exception_handler was called")
    # body = await request.body()
    # query_params = request.query_params._dict  # pylint: disable=protected-access
    detail = {
        "errors": exc.errors(),
        # "body": body.decode(),
        # "query_params": query_params,
    }
    logger.info(detail)
    # Standardized error shape
    return JSONResponse(
        status_code=HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "code": "response_validation_error",
            "message": "Response validation failed",
            "details": jsonable_encoder(exc.errors()),
        },
    )


async def http_exception_handler(
    request: Request, exc: HTTPException
) -> Union[JSONResponse, Response]:
    """
    This is a wrapper to the default HTTPException handler of FastAPI.
    This function will be called when a HTTPException is explicitly raised.
    """
    logger.debug("Our custom http_exception_handler was called")
    # If detail is already a dict with our schema, pass it through
    if isinstance(exc.detail, dict) and "code" in exc.detail and "message" in exc.detail:
        return JSONResponse(status_code=exc.status_code, content=exc.detail)

    # Otherwise, map common status codes to a standard code/message
    code_map = {
        400: ("bad_request", "Bad request"),
        401: ("unauthorized", "User not authenticated"),
        403: ("forbidden", "Permission denied"),
        404: ("not_found", "Resource not found"),
        422: ("validation_error", "Request validation failed"),
    }
    code, message = code_map.get(exc.status_code, ("http_error", str(exc.detail) if exc.detail else "HTTP error"))
    return JSONResponse(status_code=exc.status_code, content={"code": code, "message": message})


async def unhandled_exception_handler(
    request: Request, exc: Exception
) -> PlainTextResponse:
    """
    This middleware will log all unhandled exceptions.
    Unhandled exceptions are all exceptions that are not HTTPExceptions or RequestValidationErrors.
    """
    logger.debug("Our custom unhandled_exception_handler was called")
    host = getattr(getattr(request, "client", None), "host", None)
    port = getattr(getattr(request, "client", None), "port", None)
    url = (
        f"{request.url.path}?{request.query_params}"
        if request.query_params
        else request.url.path
    )
    exception_type, exception_value, exception_traceback = sys.exc_info()
    exception_name = getattr(exception_type, "__name__", None)
    logger.error(
        f'{host}:{port} - "{request.method} {url}" 500 Internal Server Error <{exception_name}: {exception_value}>'
    )
    # Standard server error response
    return JSONResponse(status_code=500, content={"code": "server_error", "message": "Internal server error"})


class DetailedHTTPException(HTTPException):
    STATUS_CODE = status.HTTP_500_INTERNAL_SERVER_ERROR
    DETAIL = "Server error"

    def __init__(self, **kwargs: dict[str, Any]) -> None:
        super().__init__(status_code=self.STATUS_CODE, detail=self.DETAIL, **kwargs)


class PermissionDenied(DetailedHTTPException):
    STATUS_CODE = status.HTTP_403_FORBIDDEN
    DETAIL = "Permission denied"


class NotFound(DetailedHTTPException):
    STATUS_CODE = status.HTTP_404_NOT_FOUND
    DETAIL = "Resource Not Found"


class BadRequest(DetailedHTTPException):
    STATUS_CODE = status.HTTP_400_BAD_REQUEST
    DETAIL = "Bad Request"


class NotAuthenticated(DetailedHTTPException):
    STATUS_CODE = status.HTTP_401_UNAUTHORIZED
    DETAIL = "User not authenticated"

    def __init__(self) -> None:
        super().__init__(headers={"WWW-Authenticate": "Bearer"})
