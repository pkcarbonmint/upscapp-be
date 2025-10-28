from src.exceptions import BadRequest, NotFound, DetailedHTTPException, status


class ErrorCode:
    TENANT_DOMAIN_TAKEN = "Tenant domain is already taken."
    TENANT_NOT_FOUND = "Tenant does not exist."
    TENANT_HEADER_REQUIRED = "Tenant header required."


class TenantDomainTaken(BadRequest):
    DETAIL = ErrorCode.TENANT_DOMAIN_TAKEN


class TenantNotFound(NotFound):
    DETAIL = ErrorCode.TENANT_NOT_FOUND


class TenantHeaderRequied(DetailedHTTPException):
    STATUS_CODE = status.HTTP_422_UNPROCESSABLE_ENTITY
    DETAIL = ErrorCode.TENANT_HEADER_REQUIRED
