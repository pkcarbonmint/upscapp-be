from typing import Any
from fastapi_async_sqlalchemy import db
from fastapi import APIRouter, Depends, Body
import phonenumbers
from src.auth.deps import valid_token_user_admin, valid_token_user
from src.base.schemas import ResponseSchema,ResponseListSchema
from src.constants import APP
from src.modules.accountsv2.schemas import SubsTxsSchema
from src.users.deps import CheckV2UserAccess
from src.users.routes import plan_service, discount_service
from src.users.exceptions import *
from src.users.schemas import PlanResponse, PlanCreate, PlanUpdate, DiscountCodeResponse, DiscountCodeUpdate, DiscountCodeCreate, USER_TYPE, USER_ROLE, PurchaseDiscResponse
from src.users.models import *
from src.users.service import TransactionService

account_router_v2 = APIRouter(tags=["Accounts V2"])
transaction_service = TransactionService(Transaction, db)


"""
Plan routes

"""


@account_router_v2.post(
    "/plans",
    response_model=ResponseSchema[PlanResponse],
    dependencies=[Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce], 
                                            roles=[USER_ROLE.org_admin, USER_ROLE.branch_admin],apps=[APP.admin_app]))]
)
async def create_plan(
    *, plan_in: PlanCreate, user: User = Depends(valid_token_user)
):
    plan_db = await plan_service.get_active_plan_by_name_frequency(
        tenant_id=user.tenant_id,
        plan_name=plan_in.name,
        billing_frequency=plan_in.billing_frequency,db_session=db.session
    )
   
    if plan_db:
        raise PlanAlreadyExists()
    plan = await plan_service.create(obj_in=plan_in, db_session=db.session)
    plan_update = Plan(tenant_id=user.tenant_id)

    plan_update_db = await plan_service.update(obj_current=plan, obj_new=plan_update,db_session=db.session)

    return ResponseSchema(data=plan_update_db, success=True)


@account_router_v2.put(
    "/plans/{id}", response_model= ResponseSchema[PlanResponse],
    dependencies=[Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce], 
                                            roles=[USER_ROLE.org_admin, USER_ROLE.branch_admin],apps=[APP.admin_app]))]
)
async def update_plan(
    *, id: int, plan_in: PlanUpdate
):
    plan_db_current = await plan_service.get(id=id,db_session=db.session)
    if not plan_db_current:
        raise PlanNotFound()    
    if plan_in.is_active is not None:
        plan_db = await plan_service.update(
                    obj_current=plan_db_current, obj_new=plan_in, db_session=db.session
                )
    else:
        plan_name = plan_db_current.name
        get_plans_with_name = await plan_service.get_by_field_multi(value=plan_name,field="name",db_session=db.session)
        if get_plans_with_name:
            for plan in get_plans_with_name:
                plan_db = await plan_service.update(
                    obj_current=plan, obj_new=plan_in, db_session=db.session
                )
        else:
            raise PlanNotFound()
    return ResponseSchema(data=plan_db, success=True)

@account_router_v2.get(
    "/plans",
    response_model=ResponseListSchema[PlanResponse],
    dependencies=[Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce], roles=[USER_ROLE.org_admin, USER_ROLE.branch_admin],apps=[APP.admin_app]))],
)
async def get_plans(user: User = Depends(valid_token_user)):
    plans = await plan_service.get_by_field_multi(
        value=user.tenant_id, field="tenant_id",db_session=db.session
    )
    # if not len(plans) > 0:
    #     raise PlanNotFound()
    return ResponseListSchema(data=plans, success=True)


@account_router_v2.get(
    "/plans/active",
    response_model=dict[str, list[PlanResponse]],
    dependencies=[Depends(valid_token_user)],
)
async def get_active_plans(user: User = Depends(valid_token_user)):
    plans = await plan_service.get_active_plans_grouped_by_name(
        tenant_id=user.tenant_id, db_session=db.session
    )

    if not len(plans) > 0:
        raise PlanNotFound()

    res: dict[str, Any] = {}
    for item in plans:
        res[item[0]] = item[1]

    return res


@account_router_v2.get("/plans/{id}", response_model=ResponseSchema[PlanResponse])
async def get_plan_by_id(*, id: int, current_user: User = Depends(valid_token_user)):
    # plan = await plan_service.get(id=id, db_session=db.session)
    plan = await plan_service.get_plan_by_tenant(
        plan_id=id, tenant_id=current_user.tenant_id,db_session=db.session
    )
    if not plan:
        raise NotFound()
    return ResponseSchema(data=plan, success=True)


"""
Discount routes
"""


@account_router_v2.post(
    "/discounts",
    response_model=ResponseSchema[DiscountCodeResponse],
    dependencies=[Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce], roles=[USER_ROLE.org_admin, USER_ROLE.branch_admin],apps=[APP.admin_app]))],
)
async def create_discount(
    *, discount: DiscountCodeCreate, user: User = Depends(valid_token_user)
):
    discount_db = await discount_service.verify_discount_code(
        coupon_code=discount.coupon_code, tenant_id=user.tenant_id,db_session=db.session
    )
    if discount_db:
        raise DiscountAlreadyExists()
    disc_in = DiscountCode(**discount.model_dump(), tenant_id=user.tenant_id)
    discount_db = await discount_service.create(obj_in=disc_in, db_session=db.session)

    return ResponseSchema(data=discount_db, success=True)


@account_router_v2.put(
    "/discounts/{id}/users/add",
    response_model=ResponseSchema[DiscountCodeResponse],
    dependencies=[Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce], roles=[USER_ROLE.org_admin, USER_ROLE.branch_admin],apps=[APP.admin_app]))],
)
async def add_users_to_coupon(
    *,
    id: int,
    user_ids: list[int] | None = None,
    user_phone_nos: list[str] | None = None,
    user: User = Depends(valid_token_user),
):
    discount_db_current = await discount_service.get_disc_by_tenant(
        disc_id=id, tenant_id= user.tenant_id, db_session=db.session
    )
    if not discount_db_current:
        NotFound()
    users_db_ids = (
        discount_db_current.shared_with
        if discount_db_current.shared_with is not None
        else []
    )
    users_db_nos = (
        discount_db_current.shared_with_phone_no
        if discount_db_current.shared_with_phone_no is not None
        else []
    )
    user_phone_nos = [phonenumbers.format_number(phonenumbers.parse(ph_num, "IN"), phonenumbers.PhoneNumberFormat.E164) for ph_num in user_phone_nos]
    updated_user_ids = users_db_ids  + user_ids 
    updated_user_nos = users_db_nos  + user_phone_nos
    
    disc_update = DiscountCode(
        shared_with=set(updated_user_ids), shared_with_phone_no=set(updated_user_nos)
    )
    discount_db = await discount_service.update(
        obj_current=discount_db_current, obj_new=disc_update, db_session=db.session
    )
    return ResponseSchema(data=discount_db, success=True)


@account_router_v2.put(
    "/discounts/{id}",
    response_model=ResponseSchema[DiscountCodeResponse],
    dependencies=[Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce], roles=[USER_ROLE.org_admin, USER_ROLE.branch_admin],apps=[APP.admin_app]))],
)
async def update_discount(
    *,
    id: int,
    discount: DiscountCodeUpdate,
    user: User = Depends(valid_token_user),
):
    discount_current = await discount_service.get_disc_by_tenant(
        disc_id=id, tenant_id=user.tenant_id, db_session=db.session
    )
    if not discount_current:
        NotFound()
    discount_db = await discount_service.update(
        obj_current=discount_current, obj_new=discount, db_session=db.session
    )
    return ResponseSchema(data=discount_db, success=True)


@account_router_v2.get(
    "/discounts/{id}",
    response_model=ResponseSchema[DiscountCodeResponse],
    dependencies=[Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce], roles=[USER_ROLE.org_admin, USER_ROLE.branch_admin],apps=[APP.admin_app]))],
)
async def get_discount_by_id(*, id: int, user: User = Depends(valid_token_user)):
    discount = await discount_service.get_disc_by_tenant(
        disc_id=id, tenant_id=user.tenant_id, db_session=db.session
    )
    return ResponseSchema(data=discount, success=True)


@account_router_v2.get(
    "/discounts",
    response_model=ResponseListSchema[DiscountCodeResponse],
    dependencies=[Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce, USER_TYPE.student], roles=[USER_ROLE.org_admin, USER_ROLE.branch_admin],apps=[APP.admin_app]))],
)
async def get_discounts(user: User = Depends(valid_token_user)):
    discounts = await discount_service.get_by_field_multi(
        value=user.tenant_id, field="tenant_id",db_session=db.session
    )
    return ResponseListSchema(data=discounts, success=True)


@account_router_v2.post("/discounts/verify", response_model=ResponseSchema[DiscountCodeResponse])
async def verify_user_discount(
    *,
    coupon_code: str = Body(embed=True),
    current_user: User = Depends(valid_token_user),
):
    discount = await discount_service.verify_discount_code(
        coupon_code=coupon_code, tenant_id=current_user.tenant_id, db_session=db.session
    )

    if discount:
        return ResponseSchema(data=discount, success=True)
        # discount_response = verify_discount_code(
        #     discount=discount, user_id=current_user.id
        # )
    else:
        return ResponseSchema(msg="Not found")

@account_router_v2.post("/discounts/purchases",response_model=ResponseSchema[PurchaseDiscResponse])

async def get_discounts_available(*,product_ids:list[int], user: User = Depends(valid_token_user)):

    ##some logic which will get all available discounts for the products

    return ResponseSchema(data=None, success=True)

@account_router_v2.post("/subscription/transactions")
async def get_subs_txs(*,filters: SubsTxsSchema):
    txs = await transaction_service.get_subs_txs(start_date=filters.start_date,end_date=filters.end_date,plan_id=filters.plan_id,
                                                 plan_name=filters.plan_name,user_id=filters.user_id,user_name=filters.user_name,phone_no=filters.phone_no,
                                                 status=filters.status,payment_mode=filters.payment_mode,limit=filters.limit,offset=filters.offset,db_session=db.session)
    return txs