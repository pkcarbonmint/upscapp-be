import profile
from sqlalchemy.orm import Session
import json
from fastapi import APIRouter, Depends, Body
from fastapi_async_sqlalchemy import db
from src.base.schemas import ResponseListSchema, ResponseSchema
from src.users.routesv2 import user_role_service
from src.base.service import BaseCRUD
from .schemas import *
from .models import Tenant, Branch
from .service import TenantService
from src.auth.security import validate_admin_access, validate_superadmin_access
from src.users.service import *
from src.users.models import User
from src.users.schemas import UserResponse, USER_ROLE, TenantReportsResponse
from src.auth.deps import valid_token_user, valid_token_user_admin
from src.external.cms.service import create_tenant_cms
from src.external.cms.schemas import TenantCMS
from src.users.deps import CheckUserAccess, CheckV2UserAccess
from src.users.routes import subscription_service

router = APIRouter(prefix="/tenants", tags=["Tenants"])

org_router = APIRouter(prefix="/org", tags=["Organization"])

service = TenantService(Tenant, db)
user_service = UserService(User, db)
legalentity_crud = BaseCRUD(model=Tenant)
branch_crud = BaseCRUD(model=Branch)


@router.get("/students", response_model=list[UserTenantResponse])
async def get_tenant_students(
    current_user: User = Depends(
        CheckUserAccess(admin=True, role=USER_ROLE.tenant_admin)
    ),
):
    # if USER_ROLE.tenant_admin in current_user.roles:
    students = await user_service.get_tenant_users(
        tenant_id=current_user.tenant_id, db_session=db.session
    )

    return students


@router.put("/users/{id}/status", response_model=UserTenantResponse)
async def activate_deactivate_user(
    id: int,
    current_user: User = Depends(
        CheckUserAccess(admin=True, role=USER_ROLE.tenant_admin)
    ),
):
    if USER_ROLE.tenant_admin in current_user.roles:
        user_db = await user_service.get(id=id,db_session=db.session)
        if current_user.tenant_id == user_db.tenant_id:
            user_status = not user_db.is_active
            user_update = User(is_active=user_status)

            user_update_db = await user_service.update(
                obj_current=user_db, obj_new=user_update,db_session=db.session
            )

            return user_update_db


@router.get(
    "/{id}",
    response_model=TenantResponse,
    dependencies=[Depends(CheckUserAccess(admin=True, role=USER_ROLE.tenant_admin))],
)
async def get_tenant_by_id(id: int):
    tenant = await service.get(id=id,db_session=db.session)
    return tenant


@router.get(
    "/{id}/admins",
    dependencies=[Depends(CheckUserAccess(admin=True, role=USER_ROLE.tenant_admin))],
    response_model=list[UserTenantResponse],
)
async def get_tenant_admins(id: int):
    admins = await user_service.get_tenant_admins(tenant_id=id, db_session=db.session)
    return admins
    # admins_list = []
    # for admin in admins:
    #     if admin.roles is not None and USER_ROLE.tenant_admin in admin.roles:
    #         admins_list.append(admin)
    # return admins_list


@router.get(
    "/{id}/students",
    response_model=list[UserTenantResponse],
    dependencies=[Depends(CheckUserAccess(superadmin=True))],
)
async def get_tenant_admins(id: int, current_user: User = Depends(valid_token_user)):
    admins = await user_service.get_tenant_users(tenant_id=id, db_session=db.session)
    return admins


@router.get(
    "/{id}/users",
    response_model=list[UserTenantResponse],
    dependencies=[Depends(CheckUserAccess(superadmin=True))],
)
async def get_tenant_users(id: int):
    users = await user_service.get_by_field_multi(field="tenant_id", value=id,db_session=db.session)
    return users


@router.get(
    "",
    response_model=list[GetTenantResponse],
    dependencies=[Depends(CheckUserAccess(superadmin=True))],
)
async def get_tenants():
    tenants = await service.get_multi(db_session=db.session)
    resp = []
    for tenant in tenants:
       
        stats = await user_service.calc_tenant_users_stats(tenant_id=tenant.id,db_session=db.session)
        stats.update(tenant.__dict__)
        resp.append(stats)

    return resp


@router.post(
    "",
    response_model=TenantResponse,
    dependencies=[Depends(CheckUserAccess(superadmin=True))],
)
async def create_tenant(*, tenant_in: TenantCreate):
    if tenant_in.company_info and tenant_in.company_info.website:
        tenant_in.company_info.website = str(tenant_in.company_info.website)
        
    tenant_db = await service.get_by_field(value=tenant_in.domain,field="domain",db_session=db.session)    
    if tenant_db:
        AdminDomainAlreadyExists()

    tenant = await service.create(obj_in=tenant_in,db_session=db.session)
 
    tenant_cms = await create_tenant_cms(
        tenant_in=TenantCMS(name=tenant.name, domain=tenant.domain, tenant_id=tenant.id)
    )

    return tenant


@router.delete(
    "/{id}",
    response_model=TenantResponse,
    dependencies=[Depends(CheckUserAccess(superadmin=True))],
)
async def delete_tenant(id: int):
    tenant = await service.delete(id=id,db_session=db.session)
    return tenant


@router.put(
    "/{id}",
    response_model=TenantResponse,
    dependencies=[Depends(CheckUserAccess(admin=True, role=USER_ROLE.tenant_admin))],
)
async def update_tenant(*, id: int, tenant_in: TenantUpdate):
    current_tenant = await service.get(id=id,db_session=db.session)
    if tenant_in.company_info and tenant_in.company_info.website:
        tenant_in.company_info.website = str(tenant_in.company_info.website)
    tenant = await service.update(obj_current=current_tenant, obj_new=tenant_in,db_session=db.session)
    return tenant


@router.get(
    "/domain/{domain}",
    response_model=TenantResponse,
    dependencies=[Depends(CheckUserAccess(admin=True, role=USER_ROLE.tenant_admin))],
)
async def get_tenant_by_domain(*, domain: str):
    tenant = await service.get_by_field(field="domain", value=domain,db_session=db.session)
    return tenant


@router.get("/{id}/students/stats", dependencies=[Depends(CheckUserAccess(admin=True))])
async def get_student_stats(id: int, admin: User = Depends(valid_token_user_admin)):
    if not id == admin.tenant_id:
        RequiredAdminAccess()
    stats = await user_service.calc_tenant_users_stats(tenant_id=id,db_session=db.session)
    # for obj in stats:
    return stats


@router.get(
    "/students/reports",
    response_model=list[TenantReportsResponse],
    dependencies=[Depends(CheckUserAccess(superadmin=True))],
)
async def get_tenant_billing_reports(admin: User = Depends(validate_admin_access)):
    reports = await subscription_service.tenant_user_reports(db_session=db.session)
    reports_dict = [item._asdict() for item in reports]
    # res = [{**item._asdict()} for item in reports]
    # return res

    return reports_dict


@router.get(
    "/{id}/student/reports",
    response_model=list[TenantBillingResponse],
    dependencies=[Depends(CheckUserAccess(admin=True))],
)
async def get_student_reports(id: int, user: User = Depends(valid_token_user_admin)):
    if not id == user.tenant_id:
        RequiredAdminAccess()
    reports = await subscription_service.get_billing_reports(tenant_id=id,db_session=db.session)
    reports_dict = [item._asdict() for item in reports]
    resp = [report for report in reports_dict]

    return resp


@router.get(
    "/{tenant_id}/students/{student_id}/subscriptions",
    response_model=list[StudentSubsResponse],
    dependencies=[Depends(CheckUserAccess(admin=True))],
)
async def get_student_subscriptions(
    tenant_id: int, student_id: int, user: User = Depends(valid_token_user_admin)
):
    if not tenant_id == user.tenant_id:
        RequiredAdminAccess()
    results = await subscription_service.get_student_subscription(
        student_id=student_id, tenant_id=tenant_id,db_session=db.session
    )
    reports_dict = [item._asdict() for item in results]
    resp = [report for report in reports_dict]

    return resp

@org_router.post("/legalentities",response_model=ResponseListSchema[LegalEntityResponse])
async def create_legalentity(*, legal_entity: LegalEntityCreate, user: User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce], roles=[USER_ROLE.org_admin],apps=[APP.admin_app]))):
    tenant = await legalentity_crud.get(db=db.session, id=legal_entity.tenant_id)
    if tenant.legal_entities:
        for entity in tenant.legal_entities:
            # Check for non-null fields only
            if (legal_entity.name and entity.get('name') == legal_entity.name) or \
            (legal_entity.reg_no and entity.get('reg_no') == legal_entity.reg_no) or \
            (legal_entity.GSTIN and entity.get('GSTIN') == legal_entity.GSTIN):
                return ResponseListSchema(msg="A legal entity with the same name, reg_no, or GSTIN already exists")
    current_legal_entities = tenant.legal_entities or []
    current_legal_entities.append(legal_entity.model_dump(exclude={"tenant_id"}))
    legalentity_db = await legalentity_crud.update(db=db.session,id =legal_entity.tenant_id, object=TenantUpdate(legal_entities = current_legal_entities))
    legalentity_in = await legalentity_crud.get(db=db.session,id=legal_entity.tenant_id)
    return ResponseListSchema(data=legalentity_in.legal_entities, success=True)

@org_router.put("/{tenant_id}/legalentities",response_model=ResponseListSchema[LegalEntityResponse])
async def update_legalentity(*, tenant_id: int, name: str, legal_entity_update: LegalEntityUpdate, user: User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce], roles=[USER_ROLE.org_admin],apps=[APP.admin_app]))):
    tenant = await legalentity_crud.get(db=db.session, id=tenant_id)
    if not tenant:
        return ResponseSchema(success=False, msg="Tenant not found")
    legal_entity_to_update = next(
        (entity for entity in tenant.legal_entities if entity.get('name') == name), 
        None
    )  
    if not legal_entity_to_update or legal_entity_to_update["status"] == LegalEntityStatus.inactive:
        return ResponseSchema(success=False, msg="Legal entity cannot be updated")
    update_data = legal_entity_update.model_dump(exclude_unset=True)
    legal_entity_to_update.update(update_data)
    await legalentity_crud.update(
        db=db.session,
        id=tenant_id,
        object=TenantUpdate(legal_entities=tenant.legal_entities)
    )
    legalentity = await legalentity_crud.get(db=db.session,id=tenant_id)
    return ResponseListSchema(data=legalentity.legal_entities, success=True)

    
# async def update_legalentity(*, tenant_id:int, legal_entity: LegalEntityUpdate):
    # legalentity_update_db = await legalentity_crud.update(db=db.session,id=tenant_id, object=TenantUpdate(legal_entity = legal_entity.model_dump_json()))
    # legalentity = await legalentity_crud.get(db=db.session,id=legalentity_update_db.id)
    # return ResponseSchema(data=legalentity, success=True)

@org_router.put("/{tenant_id}/legalentities/status",response_model=ResponseSchema[LegalEntityResponse])
async def legalentity_status_update(*, tenant_id:int,name: str, status: LegalEntityStatus, user: User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce], roles=[USER_ROLE.org_admin],apps=[APP.admin_app]))):
    tenant = await legalentity_crud.get(db=db.session, id=tenant_id)
    if not tenant:
        return ResponseSchema(success=False, msg="Tenant not found")
    legal_entity_to_update = next(
        (entity for entity in tenant.legal_entities if entity.get('name') == name), 
        None
    )  
    if not legal_entity_to_update:
        return ResponseSchema(success=False, msg="Legal entity with the provided GSTIN not found")
    if legal_entity_to_update['status'] != LegalEntityStatus.inactive:
        legal_entity_to_update['status'] = status
        await legalentity_crud.update(
            db=db.session,
            id=tenant_id,
            object=TenantUpdate(legal_entities=tenant.legal_entities)
        )
    legalentity = await legalentity_crud.get(db=db.session,id=tenant_id)
    entity = next((e for e in legalentity.legal_entities if e['name'] == name), None)

    return ResponseSchema(data=entity, success=True)

@org_router.get("/legalentities", response_model=ResponseListSchema[LegalEntityResponse])
async def get_legalentities(*, tenant_id:int, 
                            user: User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce,USER_TYPE.student], roles=[USER_ROLE.org_admin, USER_ROLE.branch_admin, USER_ROLE.product_admin, USER_ROLE.student_administrator,USER_ROLE.fee_collection_incharge,USER_ROLE.director,USER_ROLE.admission_manager],apps=[APP.admin_app,APP.student_app]))):
    
    legalentity_db = await legalentity_crud.get(db=db.session,id=tenant_id)
    legalentities = legalentity_db.legal_entities if legalentity_db.legal_entities else []
    return ResponseListSchema(data=legalentities, success=True)

@org_router.get("/{tenant_id}/legalentities", response_model=ResponseSchema[LegalEntityResponse])
async def get_legalentity(*, tenant_id:int,name:str, user: User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce], roles=[USER_ROLE.org_admin, USER_ROLE.branch_admin, USER_ROLE.admission_manager],apps=[APP.admin_app]))):
    tenant = await legalentity_crud.get(db=db.session, id=tenant_id)
    if not tenant:
        return ResponseSchema(success=False, msg="Tenant not found")
    legal_entity = next(
        (entity for entity in tenant.legal_entities if entity.get('name') == name), 
        None
    )  
    return ResponseSchema(data=legal_entity, success=True)


@org_router.post("/branches", response_model=ResponseSchema[BranchResponse])
async def create_branch(*, branch: BranchCreate, user: User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce], roles=[USER_ROLE.org_admin],apps=[APP.admin_app]))):
    branch_db = await branch_crud.create(db=db.session,object=branch)
    return ResponseSchema(data=branch_db, success=True)

@org_router.put("/branches/{id}", response_model=ResponseSchema[BranchResponse])
async def update_branch(*, id:int, branch_update: BranchUpdate, user: User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce], roles=[USER_ROLE.org_admin, USER_ROLE.branch_admin],apps=[APP.admin_app]))):
    branch_update_db = await branch_crud.update(db=db.session,id=id, object=branch_update)
    branch_db = await branch_crud.get(db=db.session,id=id)
    return ResponseSchema(data=branch_db, success=True)

@org_router.put("/branches/{id}/status", response_model=ResponseSchema[BranchResponse])
async def branch_status_update(*, id:int, status: BranchStatus, user: User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce], roles=[USER_ROLE.org_admin],apps=[APP.admin_app]))):
    branch_update_db = await branch_crud.update(db.session,{'status': status},id=id)  
    branch_db = await branch_crud.get(db=db.session,id=id)
    return ResponseSchema(data=branch_db, success=True)

@org_router.get("/branches", response_model=ResponseListSchema[BranchResponse])
async def get_branches_by_filters(*, filters: Any | None = None, user: User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce, USER_TYPE.student],apps=[APP.admin_app, APP.account_mgnt_app, APP.front_desk_app,APP.dashboard_app]))):
    if USER_TYPE.student == user.user_type or USER_ROLE.branch_admin not in user.roles if user.roles else True:
        if filters:
            filter_data = json.loads(filters)
        else:
            filter_data = {} 
        
        branch_db = await branch_crud.get_multi(db=db.session,**filter_data)
    elif USER_ROLE.branch_admin in user.roles:
        admin_branch_ids = await user_role_service.get_branches_for_role_user(role=USER_ROLE.branch_admin,user_id=user.id,db_session=db.session)
        if filters:
            filter_data = json.loads(filters)
        else:
            filter_data = {} 
        branch_db = await branch_crud.get_multi(db=db.session,id__in=admin_branch_ids, **filter_data)
    
    return ResponseListSchema(data=branch_db["data"], success=True, meta={"count": branch_db["total_count"]})
