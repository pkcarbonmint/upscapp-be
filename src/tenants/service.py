from src.base.service import BaseService
from src.exceptions import NotFound
from fastapi_async_sqlalchemy import db
from .schemas import TenantCreate, TenantUpdate
from .models import Tenant
from sqlalchemy.ext.asyncio import AsyncSession



class TenantService(BaseService[Tenant, TenantCreate, TenantUpdate]):
    async def check_tenant(self, value: str, auth_field_type: str, db_session:AsyncSession | None = None) -> Tenant:
        tenant = await self.get_by_field(field=auth_field_type, value=value,db_session=db_session)
        if not tenant:
            raise NotFound()

        return tenant

    async def check_tenant_by_id(self, id, db_session: AsyncSession | None = None,) -> Tenant:
        tenant = await self.get(id=id,db_session=db_session)
        if not tenant:
            raise NotFound()

        return tenant
