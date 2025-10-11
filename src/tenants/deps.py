from .models import Tenant
from .exceptions import TenantNotFound, TenantHeaderRequied
from .service import TenantService
from fastapi_async_sqlalchemy import db
from fastapi import Header


tenant_service = TenantService(Tenant, db)


async def verify_tenant(
    tenant: str = Header(..., alias="tenant")
) -> Tenant:
    if not tenant:
        raise TenantHeaderRequied()
    
    tenant_db = await tenant_service.get_by_field(field="domain", value=tenant,db_session=db.session)

    if not tenant_db:
        raise TenantNotFound()

    return tenant_db
