import json
from typing import Any
from fastapi import APIRouter, Depends, Request
from fastapi.encoders import jsonable_encoder
from fastapi_async_sqlalchemy import db
import pytz
from src.base.schemas import ResponseSchema,ResponseListSchema,ResponsePaginatedSchema
from src.base.service import BaseCRUD
from fastcrud import JoinConfig, FilterConfig
from src.constants import APP
from src.external.pg.exceptions import TargetAppRequired, VPARequired
from src.external.pg.schemas import SUBS_FLOW_TYPE, PaymentLinkRequest, PgPAYAPISchema, PgPayApiSchema
from src.modules.eventlogs.deps import log_event
from src.modules.eventlogs.models import EventLog
from src.modules.eventlogs.schemas import EVENT_TYPE
from src.modules.eventlogs.service import EventlogService
from src.modules.frontdesk.schemas import AdmissionCreate
from src.modules.frontdesk.routes import admission_crud,walkin_crud
from src.modules.products.utils import indian_format
from src.tenants.models import Branch
from src.tenants.routes import legalentity_crud
from src.users.schemas import USER_ROLE, USER_TYPE, UserEnrolledResponse
from src.utils import generate_random_alphanum
from .models import *
from .schemas import *
from .exceptions import *
from src.users.deps import CheckV2UserAccess
from .deps import disc_check
from src.users.routesv2 import user_role_service, user_service
from src.users.models import User, Transaction
from src.external.pg.service import pg,razorpg
from src.config import settings
from jinja2 import Environment, FileSystemLoader
from weasyprint import HTML, CSS
import base64

product_router = APIRouter(tags=["Products V2"])
purchase_router = APIRouter(tags=["Purchases V2"])

offering_crud = BaseCRUD(model= Offering)
batch_crud = BaseCRUD(model= Batch)
product_crud = BaseCRUD(model=Product)
price_crud = BaseCRUD(model = Price)
enrollment_crud = BaseCRUD(model= Enrollment)
purchase_crud = BaseCRUD(model=Purchase)
purchase_installment_crud = BaseCRUD(model=PurchaseInstallment)
transaction_crud = BaseCRUD(model=Transaction)
eventlog_crud = EventlogService(model=EventLog,db=db)

@product_router.post("/offerings", response_model=ResponseSchema[OfferingResponse])
async def create_offering(*, offering: OfferingCreate, 
                          user: User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce], roles=[USER_ROLE.org_admin, USER_ROLE.branch_admin, USER_ROLE.product_admin],apps=[APP.admin_app]))):
    offering_db = await offering_crud.create(db=db.session,object=offering)
    return ResponseSchema(data=offering_db, success=True)

@product_router.put("/offerings/{id}", response_model=ResponseSchema[OfferingResponse])
async def update_offering(*, id:int, offering_update: OfferingUpdate, 
                          user: User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce], roles=[USER_ROLE.org_admin, USER_ROLE.branch_admin, USER_ROLE.product_admin],apps=[APP.admin_app]))): 
    offering_db = await offering_crud.get(db=db.session,id=id)
    if offering_db.status == STATUS.deactivate:
        return ResponseSchema(msg="cannot be updated as offering is deactivated")
    offering_update_db = await offering_crud.update(db=db.session,id=id,object=offering_update)
    offering = await offering_crud.get(db=db.session,id=id)
    return ResponseSchema(data=offering, success=True)

@product_router.get("/offerings", response_model=ResponseListSchema[OfferingResponse])
async def get_all_offerings(*, filters: Any | None = None, offset: int | None = None , limit: int | None = None, user: User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce, USER_TYPE.student], roles=[USER_ROLE.org_admin, USER_ROLE.branch_admin,USER_ROLE.director,USER_ROLE.finance_manager,USER_ROLE.fee_collection_incharge, USER_ROLE.product_admin,USER_ROLE.finance_report_user,USER_ROLE.collection_done_report_user,USER_ROLE.due_report_user,USER_ROLE.student_administrator],apps=[APP.admin_app,APP.dashboard_app,APP.front_desk_app]))):
    if filters:
        filter_data = json.loads(filters)
    else:
        filter_data = {} 
    offering_db = await offering_crud.get_multi(db=db.session,offset=offset,limit=limit,**filter_data)
    return ResponseListSchema(data=offering_db["data"], success=True, meta={"count": offering_db["total_count"]})

@product_router.get("/offerings/batches", response_model=ResponseListSchema[BatchResponse])
async def get_batches_by_filters(*, filters: Any | None = None, user: User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce], roles=[USER_ROLE.org_admin, USER_ROLE.branch_admin, USER_ROLE.product_admin],apps=[APP.admin_app]))):
    if any(role in user.roles for role in [USER_ROLE.org_admin, USER_ROLE.product_admin]):
        if filters:
            filter_data = json.loads(filters)
        else:
            filter_data = {} 
        # batches_db = await batch_crud.get_multi_joined(db=db.session,**filter_data, nest_joins=True, joins_config=[JoinConfig(model=Branch,join_on=Batch.branch_id==Branch.id, schema_to_select=BatchResponse,join_prefix="branch")])
        batches_db = await batch_crud.get_by_filters_multi(filters=filters,db=db.session)
        batches_db_count = await batch_crud.get_count_by_filters(filters=filters,db=db.session)
    elif USER_ROLE.branch_admin in user.roles:
        # admin_branch_ids = await user_role_service.get_branches_for_role_user(role=USER_ROLE.branch_admin,user_id=user.id,db_session=db.session)
        batch_ids = await user_role_service.get_batch_ids_by_user_role(role=USER_ROLE.branch_admin,user_id=user.id,db_session=db.session)
        # batches_db = await batch_crud.get_multi_joined(db=db.session,id__in=batch_ids,**filter_data, nest_joins=True, joins_config=[JoinConfig(model=Branch,join_on=Batch.branch_id==Branch.id, schema_to_select=BatchResponse,join_prefix="branch")])
        batches_db = await batch_crud.get_by_filters_multi(filters=filters,ids=batch_ids,attr="id",db=db.session)
        batches_db_count = await batch_crud.get_count_by_filters(filters=filters,ids=batch_ids,attr="id",db=db.session)

    return ResponseSchema(data=batches_db, success=True, meta={"count": batches_db_count})

@product_router.get("/offerings/{id}", response_model=ResponseSchema[OfferingResponse])
async def get_offering(*, id:int, user: User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce], roles=[USER_ROLE.org_admin, USER_ROLE.branch_admin, USER_ROLE.product_admin],apps=[APP.admin_app]))):
    offering_db = await offering_crud.get(db=db.session,id=id)
    return ResponseSchema(data=offering_db, success=True)


@product_router.put("/offerings/{id}/status", response_model=ResponseSchema[OfferingResponse])
async def offering_status_update(*, id:int, status: STATUS, user: User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce], roles=[USER_ROLE.org_admin, USER_ROLE.branch_admin, USER_ROLE.product_admin],apps=[APP.admin_app]))):
    offering_update_db = await offering_crud.update(db.session,
        {'status': status},
        # return_columns=['status', 'name'],
        id=id)
    offering_db = await offering_crud.get(db=db.session,id=id)
    return ResponseSchema(data=offering_db, success=True)


@product_router.post("/offerings/batches", response_model=ResponseSchema[BatchResponse])
async def create_batch(*, batch: BatchCreate, user: User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce], roles=[USER_ROLE.org_admin, USER_ROLE.branch_admin, USER_ROLE.product_admin],apps=[APP.admin_app]))):
    offering_db:OfferingResponse = await offering_crud.get(db=db.session,id=batch.offering_id)
    if not offering_db.status == STATUS.published:
        return ResponseSchema(msg="Offering has to published to create batch")
    if USER_ROLE.branch_admin in user.roles:
        product_db:ProductResponse = await product_crud.get_by_field(value=id,field="batch_id", db=db.session)
        admin_branch_ids = await user_role_service.get_branches_for_role_user(role=USER_ROLE.branch_admin,user_id=user.id,db_session=db.session)
        if product_db.branch_id not in admin_branch_ids:
            return ResponseSchema(msg="The batch branch does not align with the branch admin's assigned branch.")
    offering_db = await offering_crud.get(db=db.session,id=batch.offering_id)
    if offering_db.is_batch_offering is False:
        return ResponseSchema(msg="Batch cannot be created as offering cannot be batchable")
    batch_db = await batch_crud.create(db=db.session,object=batch)
    return ResponseSchema(data=batch_db, success=True)

@product_router.put("/offerings/batches/{id}", response_model=ResponseSchema[BatchResponse])
async def update_batch(*, id:int, batch_update: BatchUpdate, user: User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce], roles=[USER_ROLE.org_admin, USER_ROLE.branch_admin, USER_ROLE.product_admin],apps=[APP.admin_app]))):
    product_db:ProductResponse = await product_crud.get_by_field(value=id,field="batch_id", db=db.session)
    batch_db:BatchResponse = await batch_crud.get(db=db.session,id=id)
    if USER_ROLE.branch_admin in user.roles:
        admin_branch_ids = await user_role_service.get_branches_for_role_user(role=USER_ROLE.branch_admin,user_id=user.id,db_session=db.session)      
        if product_db.branch_id not in admin_branch_ids:
            return ResponseSchema(msg="The product branch does not align with the branch admin's assigned branch.")
    batch_update_db = await batch_crud.update(db=db.session,id=id,object=batch_update)
    # batch = await batch_crud.get_joined(db=db.session,id=id, nest_joins=True, joins_config=[JoinConfig(model=Branch,join_on=Batch.branch_id==Branch.id, schema_to_select=BranchResponse,join_prefix="branch_")])
    batch = await batch_crud.get(id=id,db=db.session)
    return ResponseSchema(data=batch, success=True)

@product_router.put("/offerings/batches/{id}/status", response_model=ResponseSchema[BatchResponse])
async def batch_status_update(*, id:int, status: STATUS, user: User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce], roles=[USER_ROLE.org_admin, USER_ROLE.branch_admin, USER_ROLE.product_admin],apps=[APP.admin_app]))):
    product_db:ProductResponse = await product_crud.get_by_field(value=id,field="batch_id", db=db.session)
    batch_db:BatchResponse = await batch_crud.get(db=db.session,id=id)
    if USER_ROLE.branch_admin in user.roles:
        admin_branch_ids = await user_role_service.get_branches_for_role_user(role=USER_ROLE.branch_admin,user_id=user.id,db_session=db.session)
        if product_db.branch_id not in admin_branch_ids:
            return ResponseSchema(msg="The product branch does not align with the branch admin's assigned branch.")
    batch_update_db = await batch_crud.update(db.session,{'status': status},id=id)  
    batch_db = await batch_crud.get(db=db.session,id=id)
    return ResponseSchema(data=batch_db, success=True)

@product_router.get("/offerings/batches/{id}", response_model=ResponseSchema[BatchResponse])
async def get_batch(*, id:int, user: User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce], roles=[USER_ROLE.org_admin, USER_ROLE.branch_admin, USER_ROLE.product_admin],apps=[APP.admin_app]))):
    product_db:ProductResponse = await product_crud.get_by_field(value=id,field="batch_id", db=db.session)
    students_enrolled = await enrollment_crud.get_count_by_filters(filters={"enrolled_as":"STUDENT","batch_id":id},db=db.session)
    batch_update_db = await batch_crud.update(db=db.session,id=id,object={"students_enrolled":students_enrolled})
    batch_db:BatchResponse = await batch_crud.get(db=db.session,id=id)
    if USER_ROLE.branch_admin in user.roles:
        admin_branch_ids = await user_role_service.get_branches_for_role_user(role=USER_ROLE.branch_admin,user_id=user.id,db_session=db.session)
        if product_db.branch_id not in admin_branch_ids:
            return ResponseSchema(msg="The product branch does not align with the branch admin's assigned branch.")
    # batch_db = await batch_crud.get(db=db.session,id=id)
    return ResponseSchema(data=batch_db, success=True)


@product_router.post("/prices", response_model=ResponseSchema[PriceResponse])
async def create_price(*, price: PriceCreate, user: User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce], roles=[USER_ROLE.org_admin, USER_ROLE.branch_admin, USER_ROLE.product_admin],apps=[APP.admin_app]))):
    prod_db:Product = await product_crud.get(db=db.session,id = price.product_id)
    if price.early_bird_price is not None and not prod_db.allow_early_bird:
        return ResponseSchema(msg="Early bird price not allowed for this product.")

    if price.booking_price is not None and not prod_db.allow_booking:
        return ResponseSchema(msg="Booking price not allowed for this product.")
        
    price_db = await price_crud.create(db=db.session,object=Price(**price.model_dump(exclude={"product_id"})))
    return ResponseSchema(data=price_db, success=True)

@product_router.put("/prices/{id}", response_model=ResponseSchema[PriceResponse])
async def update_price(*, id:int, price: PriceUpdate, user: User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce], roles=[USER_ROLE.org_admin, USER_ROLE.branch_admin, USER_ROLE.product_admin],apps=[APP.admin_app]))):
    price_update_db = await price_crud.update(db=db.session,id=id,object=price)
    price_db = await price_crud.get(db=db.session,id=id)
    return ResponseSchema(data=price_db, success=True)

@product_router.get("/prices/{id}", response_model=ResponseSchema[PriceResponse])
async def get_price(*, id:int, user: User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce], roles=[USER_ROLE.org_admin, USER_ROLE.branch_admin, USER_ROLE.product_admin],apps=[APP.admin_app]))):
    price_db = await price_crud.get(db=db.session,id=id)
    return ResponseSchema(data=price_db, success=True)

@product_router.post("/products",response_model=ResponseSchema[ProductResponse])
async def create_product(*, product: ProductCreate, user: User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce], roles=[USER_ROLE.org_admin, USER_ROLE.branch_admin, USER_ROLE.product_admin],apps=[APP.admin_app]))): 
    offering_db:OfferingResponse = await offering_crud.get(db=db.session,id=product.offering_id)
    if not offering_db.status == STATUS.published:
        return ResponseSchema(msg="Offering has to be published to create product")
    if  USER_ROLE.branch_admin in user.roles:
        admin_branch_ids = await user_role_service.get_branches_for_role_user(role=USER_ROLE.branch_admin,user_id=user.id,db_session=db.session)
        # batch_db:BatchResponse = await batch_crud.get(id=product.batch_id, db=db.session)
        if product.branch_id not in admin_branch_ids:
            return ResponseSchema(msg="The product branch does not align with the branch admin's assigned branch.")
    product_db = await product_crud.create(db=db.session,object=product)
    return ResponseSchema(data=product_db, success=True)
    
@product_router.put("/products/{product_id}", response_model=ResponseSchema[ProductResponse])
async def product_update(*, product_id: int, prod_update: ProductUpdate, user: User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce], roles=[USER_ROLE.org_admin, USER_ROLE.branch_admin, USER_ROLE.product_admin],apps=[APP.admin_app]))):  
    product_db:ProductResponse = await product_crud.get(id=product_id, db=db.session)
    if (product_db.branch_id) and USER_ROLE.branch_admin in user.roles:
        admin_branch_ids = await user_role_service.get_branches_for_role_user(role=USER_ROLE.branch_admin,user_id=user.id,db_session=db.session)
        # batch_db:BatchResponse = await batch_crud.get(id=(prod_update.batch_id or product_db.batch_id), db=db.session)
        if product_db.branch_id not in admin_branch_ids:
            return ResponseSchema(msg="The product branch does not align with the branch admin's assigned branch.")
    prod_update_db = await product_crud.update(db.session, object=prod_update, id=product_id)
    product_db:ProductResponse = await product_crud.get(id=product_id, db=db.session)
    # product_db = await product_crud.get_joined(db=db.session, id=product_id, nest_joins=True, joins_config=[JoinConfig(model=Offering,join_on=Product.offering_id==Offering.id, schema_to_select=OfferingResponse,join_prefix="offering_"), JoinConfig(model=Batch,join_on=Product.batch_id == Batch.id, schema_to_select=BatchResponse,join_prefix="batch_"), JoinConfig(model=Price,join_on=Product.price_id==Price.id, join_prefix="price_")])
    return ResponseSchema(data=product_db, success=True)

@product_router.put("/products/{product_id}/status", response_model=ResponseSchema[ProductResponse])
async def product_status_update(*, product_id: int, status: STATUS, user: User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce], roles=[USER_ROLE.org_admin, USER_ROLE.branch_admin, USER_ROLE.product_admin],apps=[APP.admin_app]))):
    product_db:ProductResponse = await product_crud.get(id=product_id, db=db.session)
    if product_db.branch_id and USER_ROLE.branch_admin in user.roles:
        admin_branch_ids = await user_role_service.get_branches_for_role_user(role=USER_ROLE.branch_admin,user_id=user.id,db_session=db.session)
        # batch_db:BatchResponse = await batch_crud.get(id=product_db.batch_id, db=db.session)
        if product_db.branch_id not in admin_branch_ids:
            return ResponseSchema(msg="The product branch does not align with the branch admin's assigned branch.")
        
    prod_update_db = await product_crud.update( db.session, {'status': status}, id=product_id)
    # product = await product_crud.get_joined(db=db.session, id=product_id, nest_joins=True, joins_config=[JoinConfig(model=Offering,join_on=Product.offering_id==Offering.id, schema_to_select=OfferingResponse,join_prefix="offering_"), JoinConfig(model=Batch,join_on=Product.batch_id == Batch.id, schema_to_select=BatchResponse,join_prefix="batch_"), JoinConfig(model=Price,join_on=Product.price_id==Price.id, join_prefix="price_")])
    product = await product_crud.get(db=db.session, id=product_id)
    return ResponseSchema(data=product, success=True)

@product_router.get("/products/latest", response_model=ResponseListSchema[ProductResponse])
async def get_products_latest(offset:int, limit:int, user: User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce,USER_TYPE.student]))):
    products = await product_crud.get_by_filters_multi_desc(db=db.session, order_by="id",skip=offset,limit=limit)
    products_count = await product_crud.get_count_by_filters(db=db.session )
    return ResponseListSchema(data=products, success=True,meta={"count":products_count})

@product_router.get("/products/{id}", response_model=ResponseSchema[ProductResponse])
async def get_product(*, id:int, user: User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce], roles=[USER_ROLE.org_admin, USER_ROLE.branch_admin,USER_ROLE.front_desk_executive,USER_ROLE.admission_counsellor, USER_ROLE.admission_manager, USER_ROLE.student_administrator, USER_ROLE.product_admin,USER_ROLE.teacher],apps=[APP.admin_app]))):
    product_db:ProductResponse = await product_crud.get(id=id, db=db.session)
    if product_db.branch_id and USER_ROLE.branch_admin in user.roles:
        admin_branch_ids = await user_role_service.get_branches_for_role_user(role=USER_ROLE.branch_admin,user_id=user.id,db_session=db.session)
        # batch_db:BatchResponse = await batch_crud.get(id=product_db.batch_id, db=db.session)
        if product_db.branch_id not in admin_branch_ids:
            return ResponseSchema(msg="The product branch does not align with the branch admin's assigned branch.")
        
    product = await product_crud.get(db=db.session, id=id)
    return ResponseSchema(data=product, success=True)

@product_router.get("/products", response_model=ResponseListSchema[ProductResponse])
async def get_products_with_filters(*, filters: Any | None = None, user: User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce, USER_TYPE.student], roles=[USER_ROLE.org_admin, USER_ROLE.branch_admin,USER_ROLE.admission_manager,USER_ROLE.front_desk_executive,USER_ROLE.admission_counsellor,USER_ROLE.student_administrator,USER_ROLE.director,USER_ROLE.finance_manager,USER_ROLE.fee_collection_incharge, USER_ROLE.product_admin,USER_ROLE.finance_report_user,USER_ROLE.collection_done_report_user,USER_ROLE.due_report_user,USER_ROLE.student_administrator,USER_ROLE.teacher],apps=[APP.admin_app, APP.front_desk_app,APP.dashboard_app]))):
    if USER_TYPE.student == user.user_type or user.roles is None or any(role in {USER_ROLE.org_admin, USER_ROLE.admission_manager,USER_ROLE.front_desk_executive,USER_ROLE.admission_counsellor,USER_ROLE.student_administrator,USER_ROLE.director,USER_ROLE.finance_manager,USER_ROLE.fee_collection_incharge, USER_ROLE.product_admin,USER_ROLE.finance_report_user,USER_ROLE.collection_done_report_user,USER_ROLE.due_report_user,USER_ROLE.student_administrator,USER_ROLE.teacher} for role in user.roles):       
        if filters:
            filter_data = json.loads(filters)
        else:
            filter_data = {} 
        
        products = await product_crud.get_by_filters_multi(db=db.session, filters=filter_data)
        products_count = await product_crud.get_count_by_filters(db=db.session, filters=filter_data)
    elif USER_ROLE.branch_admin in user.roles:
        admin_branch_ids = await user_role_service.get_branches_for_role_user(role=USER_ROLE.branch_admin,user_id=user.id,db_session=db.session)
        # batch_ids = await user_role_service.get_batches_by_branch(role=USER_ROLE.branch_admin,user_id=user.id,db_session=db.session)
        if filters:
            filter_data = json.loads(filters)
        else:
            filter_data = {} 
        # products = await product_crud.get_multi_joined(db=db.session,id__in=admin_branch_ids, **filter_data, nest_joins=True, joins_config=[JoinConfig(model=Offering,join_on=Product.offering_id==Offering.id, schema_to_select=OfferingResponse,join_prefix="offering_"), JoinConfig(model=Batch,join_on=Product.batch_id == Batch.id, schema_to_select=BatchResponse,join_prefix="batch_"), JoinConfig(model=Price,join_on=Product.price_id==Price.id, join_prefix="price_")])
        products = await product_crud.get_by_filters_multi(db=db.session, filters=filter_data, attr="branch_id", ids=admin_branch_ids)
        products_count = await product_crud.get_count_by_filters(db=db.session, filters=filter_data, attr="branch_id", ids=admin_branch_ids)
    
        
    return ResponseListSchema(data=products, success=True,meta={"count":products_count})


@product_router.get("/products/count/student/{student_id}")
async def get_purchases_count_for_student(*,student_id:int):
    count = await purchase_crud.get_count_by_filters(filters={"student_id":student_id,"purchase_status":"COMPLETED"},db=db.session)
    return count

@product_router.delete("/products/{id}", response_model=ResponseSchema[ProductResponse])
async def delete_product(*, id:int, user: User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce], roles=[USER_ROLE.org_admin, USER_ROLE.branch_admin, USER_ROLE.product_admin],apps=[APP.admin_app]))):
    product_db:ProductResponse = await product_crud.get(db=db.session,id=id)
    if product_db:
        if product_db.branch_id and USER_ROLE.branch_admin in user.roles:
            admin_branch_ids = await user_role_service.get_branches_for_role_user(role=USER_ROLE.branch_admin,user_id=user.id,db_session=db.session)
            # batch_db:BatchResponse = await batch_crud.get(id=product_db.batch_id, db=db.session)
            if product_db.branch_id not in admin_branch_ids:
                return ResponseSchema(msg="The product branch does not align with the branch admin's assigned branch.")
        
        product_db_delete = await product_crud.db_delete(db=db.session,id=id)
        price_db_delete = await price_crud.db_delete(db=db.session,id=product_db.price_id)   
        return ResponseSchema(data=product_db_delete, success=True, msg="deleted")
    else:
        return ResponseSchema(success=False, msg="product with specified id not found")    

@product_router.get("/enrollments", response_model= ResponseListSchema[EnrollmentResponse])
async def get_enrollments_with_filters(*,filters: Any | None = None, user: User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce, USER_TYPE.student], roles=[USER_ROLE.org_admin, USER_ROLE.branch_admin,USER_ROLE.admission_manager,USER_ROLE.front_desk_executive,USER_ROLE.admission_counsellor, USER_ROLE.product_admin,USER_ROLE.student_administrator,USER_ROLE.director,USER_ROLE.finance_manager,USER_ROLE.teacher],apps=[APP.admin_app,APP.front_desk_app]))):
    # if USER_TYPE.student == user.user_type or USER_ROLE.org_admin in user.roles if user.roles else True:  
    if USER_TYPE.student == user.user_type or user.roles is None or any(role in {USER_ROLE.org_admin, USER_ROLE.admission_manager,USER_ROLE.front_desk_executive,USER_ROLE.admission_counsellor, USER_ROLE.product_admin,USER_ROLE.student_administrator,USER_ROLE.director,USER_ROLE.finance_manager,USER_ROLE.teacher} for role in user.roles): 
        if filters:
            filter_data = json.loads(filters)
        else:
            filter_data = {}  
        enrollments_db = await user_service.get_enrollments_with_user_details(db_session=db.session,  **filter_data)
        user_responses = []
        count = 0 
        for data in enrollments_db:
            enrolles, branches, total_users = data
            if branches:
                valid_branches = [branch for branch in branches if branch["id"] is not None]
                unique_branches_dict = {branch['id']: branch for branch in valid_branches}
            else:
                unique_branches_dict = { }
            
            branch_roles = list(unique_branches_dict.values())
            user_response = EnrollmentResponse(
                **enrolles.__dict__,  
                branches= branch_roles
            )
            user_responses.append(user_response)
            count = total_users
        return ResponseListSchema(data=user_responses, success=True, meta={"count":count})

    elif USER_ROLE.branch_admin in user.roles:
        prod_ids = await user_role_service.get_products_by_branch(role=USER_ROLE.branch_admin,user_id=user.id,db_session=db.session)
        if filters:
            filter_data = json.loads(filters)
        else:
            filter_data = {} 
        # enrollments_db = await enrollment_crud.get_multi_joined(db=db.session,batch_id__in=batch_ids, **filter_data, nest_joins=True, joins_config=[JoinConfig(model=User,join_on=Enrollment.enrolled_user_id==User.id, schema_to_select=UserBranchResponse,join_prefix="enrolled_user_")])
        enrollments_db = await user_service.get_enrollments_with_prod_ids(db_session=db.session,role_product_ids = prod_ids, **filter_data)
        user_responses = []
        count = 0 
        for data in enrollments_db:
            enrolles, branches, total_users = data
            if branches:
                valid_branches = [branch for branch in branches if branch["id"] is not None]
                unique_branches_dict = {branch['id']: branch for branch in valid_branches}
            else:
                unique_branches_dict = { }
            
            branch_roles = list(unique_branches_dict.values())
            user_response = EnrollmentResponse(
                **enrolles.__dict__,  
                branches= branch_roles
            )
            user_responses.append(user_response)
            count = total_users
        return ResponseListSchema(data=user_responses, success=True, meta={"count":count})
    else:
        return ResponseSchema(msg="Access denied")
  
@product_router.post("/enrollments", response_model= ResponseSchema[EnrollmentResponse])
async def create_enrollment(*, enrollment: EnrollmentCreate, user: User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce, USER_TYPE.student], roles=[USER_ROLE.org_admin, USER_ROLE.branch_admin, USER_ROLE.product_admin,USER_ROLE.admission_manager],apps=[APP.admin_app, APP.front_desk_app,APP.student_app]))):
    if user.user_type == USER_TYPE.student or  any(role in user.roles for role in [USER_ROLE.org_admin, USER_ROLE.product_admin,USER_ROLE.admission_manager]):
        enrollment_db = await enrollment_crud.create(db=db.session,object=enrollment)
        if enrollment_db.batch_id:
            students_enrolled = await enrollment_crud.get_count_by_filters(filters={"enrolled_as":"STUDENT","batch_id":enrollment_db.batch_id},db=db.session)
            batch_update_db = await batch_crud.update(db=db.session,id=enrollment_db.batch_id,object={"students_enrolled":students_enrolled})
        return ResponseSchema(data=enrollment_db, success=True)
    elif enrollment.product_id and USER_ROLE.branch_admin in user.roles:
        product_db:ProductResponse = await product_crud.get(db=db.session,id=enrollment.product_id)
        admin_branch_ids = await user_role_service.get_branches_for_role_user(role=USER_ROLE.branch_admin,user_id=user.id,db_session=db.session)
        if product_db.branch_id not in admin_branch_ids:
            return ResponseSchema(msg="The product branch does not align with the branch admin's assigned branch.")
        enrollment_db = await enrollment_crud.create(db=db.session,object=enrollment)
        if enrollment_db.batch_id:
            students_enrolled = await enrollment_crud.get_count_by_filters(filters={"enrolled_as":"STUDENT","batch_id":enrollment_db.batch_id},db=db.session)
            batch_update_db = await batch_crud.update(db=db.session,id=enrollment_db.batch_id,object={"students_enrolled":students_enrolled})
        return ResponseSchema(data=enrollment_db, success=True)
    else:
        return ResponseSchema(msg="Access denied")
    
@product_router.put("/enrollments/{id}", response_model= ResponseSchema[EnrollmentResponse])
async def update_enrollment(*,id:int,request:Request, enrollment_update: EnrollmentUpdate, user: User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce], roles=[USER_ROLE.org_admin, USER_ROLE.branch_admin, USER_ROLE.product_admin],apps=[APP.admin_app]))):
    # if USER_ROLE.org_admin in user.roles:  
    if any(role in user.roles for role in [USER_ROLE.org_admin, USER_ROLE.product_admin]):
        enrollment_update_db = await enrollment_crud.update(db=db.session,id=id,object=enrollment_update) 
        enrollment_db = await enrollment_crud.get_joined(db=db.session, id=id, nest_joins=True, joins_config=[JoinConfig(model=User,join_on=Enrollment.enrolled_user_id==User.id, schema_to_select=UserEnrolledResponse,join_prefix="enrolled_user_")])
        if enrollment_update.assigned_mentor_id:
            await log_event(db=db.session,request=request,event_type=EVENT_TYPE.ENROLLMENT_UPDATE,event_by_user_id=user.id,user_name=user.full_name,user_phone=user.phone_number,event_details={"enrollment_id": id, **enrollment_update.model_dump(exclude_unset=True)})
     
        return ResponseSchema(data=enrollment_db, success=True)

    elif USER_ROLE.branch_admin in user.roles:
        enrollment = await enrollment_crud.get(db=db.session, id=id)
        if enrollment.product_id:
            product_db:ProductResponse = await product_crud.get(db=db.session,id=enrollment.product_id)
            admin_branch_ids = await user_role_service.get_branches_for_role_user(role=USER_ROLE.branch_admin,user_id=user.id,db_session=db.session)
            if product_db.branch_id not in admin_branch_ids:
                return ResponseSchema(msg="The product branch does not align with the branch admin's assigned branch.")
            enrollment_update_db = await enrollment_crud.update(db=db.session,id=id,object=enrollment_update) 
            enrollment_db = await enrollment_crud.get_joined(db=db.session, id=id, nest_joins=True, joins_config=[JoinConfig(model=User,join_on=Enrollment.enrolled_user_id==User.id, schema_to_select= UserEnrolledResponse,join_prefix="enrolled_user_")])
            if  enrollment_update.assigned_mentor_id:
                await log_event(db=db.session,request=request,event_type=EVENT_TYPE.ENROLLMENT_UPDATE,event_by_user_id=user.id,user_name=user.full_name,user_phone=user.phone_number,event_details={"enrollment_id": id, **enrollment_update.model_dump(exclude_unset=True)})
     
            return ResponseSchema(data=enrollment_db, success=True)
    
    else:
        return ResponseSchema(msg="Access denied")
  
@product_router.put("/enrollments/{id}/status", response_model=ResponseSchema[EnrollmentResponse])
async def update_enrollment_status(*, id:int, status: ENROLLMENT_STATUS, user: User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce], roles=[USER_ROLE.org_admin, USER_ROLE.branch_admin, USER_ROLE.product_admin],apps=[APP.admin_app]))):
    if any(role in user.roles for role in [USER_ROLE.org_admin, USER_ROLE.product_admin]):
        enrollment_update_db = await enrollment_crud.update(db.session,{'enrollment_status': status},id=id) 
        enrollment_db = await enrollment_crud.get_joined(db=db.session, id=id, nest_joins=True, joins_config=[JoinConfig(model=User,join_on=Enrollment.enrolled_user_id==User.id, schema_to_select=UserEnrolledResponse,join_prefix="enrolled_user_")])
        
        return ResponseSchema(data=enrollment_db, success=True)

    elif USER_ROLE.branch_admin in user.roles:
        enrollment = await enrollment_crud.get(db=db.session, id=id)
        if enrollment.product_id:
            product_db:ProductResponse = await product_crud.get(db=db.session,id=enrollment.product_id)
            admin_branch_ids = await user_role_service.get_branches_for_role_user(role=USER_ROLE.branch_admin,user_id=user.id,db_session=db.session)
            if product_db.branch_id not in admin_branch_ids:
                return ResponseSchema(msg="The product branch does not align with the branch admin's assigned branch.")
            enrollment_update_db = await enrollment_crud.update(db.session,{'enrollment_status': status},id=id) 
            enrollment_db = await enrollment_crud.get_joined(db=db.session, id=id, nest_joins=True, joins_config=[JoinConfig(model=User,join_on=Enrollment.enrolled_user_id==User.id, schema_to_select=UserEnrolledResponse,join_prefix="enrolled_user_")])
            return ResponseSchema(data=enrollment_db, success=True)   
    else:
        return ResponseSchema(msg="Access denied")

@product_router.put("/enrollments/{id}/batch/change", response_model=ResponseSchema[EnrollmentResponse])
async def update_batch_for_enrollemnts(*,id:int,request:Request, update_data: EnrollmentBatchUpdate, user: User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce]))):
    product_db:ProductResponse = await product_crud.get(db=db.session,id=update_data.product_id)
    enrollment_update_db = await enrollment_crud.update(db=db.session,id=id,object={"batch_id":update_data.batch_id,"product_id":update_data.product_id,"offering_id":update_data.offering_id})
    purchase = await purchase_crud.get(db=db.session, id=update_data.purchase_id)
    old_purchase_amt = purchase.total_amount
    tot_amt = update_data.new_purchase_amount - (purchase.discount_amount if purchase.discount_amount else 0 + purchase.additional_disc_amt if purchase.additional_disc_amt else 0)
    purchase_update_db = await purchase_crud.update(db=db.session,id=update_data.purchase_id,object = {"product_id":update_data.product_id,"price_id":update_data.price_id,"total_amount":tot_amt})
    
    installments = await purchase_installment_crud.get_by_filters_multi(filters={"purchase_id":update_data.purchase_id,"is_deleted":False},db=db.session) 
    admissions = await admission_crud.update(db=db.session,id = purchase.admission_id, object = {"branch_id":product_db.branch_id})
    if installments:
        for ins in installments:
            purchase_update_db = await  purchase_installment_crud.update(db=db.session,id=ins.id,object = {"product_id":update_data.product_id,"price_id":update_data.price_id})

    students_enrolled = await enrollment_crud.get_count_by_filters(filters={"enrolled_as":"STUDENT","batch_id":update_data.batch_id},db=db.session)
    students_enrolled_old = await enrollment_crud.get_count_by_filters(filters={"enrolled_as":"STUDENT","batch_id":update_data.old_batch_id},db=db.session)
    batch_update_db = await batch_crud.update(db=db.session,id=update_data.batch_id,object={"students_enrolled":students_enrolled})
    batch_update_db = await batch_crud.update(db=db.session,id=update_data.old_batch_id,object={"students_enrolled":students_enrolled_old})
    
    await log_event(db=db.session,request=request,event_type=EVENT_TYPE.ENROLLMENT_UPDATE,event_by_user_id=user.id,user_name=user.full_name,user_phone=user.phone_number,event_details={"enrollment_id": id, "old_product_id":update_data.old_product_id,"new_product_id":update_data.product_id, "old_batch_id":update_data.old_batch_id,"new_batch_id":update_data.batch_id,
                                                                                                                                                                                        "old_offering_id": update_data.old_offering_id ,"offering_id":update_data.offering_id,"old_pur_tot_amt":old_purchase_amt,"new_pur_tot_amt":update_data.new_purchase_amount}
                                                                                                                                                                                        )
                                                                                                                                                                                            
    enrollment_db = await enrollment_crud.get(db=db.session,id=id)
    return ResponseSchema(data=enrollment_db, success=True)   
    # update enrollemnt batch and prod id
    # update purchase's and installments's prod id and price id
    #change admission branch id
    # update batch's enrollment count
    # log 
    

@product_router.post("/enrollments/products")
async def get_products_for_enrollment(*, enrollment_products_in: EnrollmentProduct ):

    enrollment_db = await user_service.get_products_for_enrollment(enrolled_user_id=enrollment_products_in.enrolled_user_id,
                                assigned_mentor_id=enrollment_products_in.assigned_mentor_id,
                                assigned_guide_id=enrollment_products_in.assigned_guide_id,
                                offering_name=enrollment_products_in.offering_name,
                                offering_category=enrollment_products_in.offering_category,
                                product_name=enrollment_products_in.product_name,
                                product_code=enrollment_products_in.product_code,
                                planned_start_date=enrollment_products_in.planned_start_date,
                                branch_id=enrollment_products_in.branch_id,
                                exam_id=enrollment_products_in.exam_id,
                                stage_id=enrollment_products_in.stage_id,
                                subject_id=enrollment_products_in.subject_id,
                                limit=enrollment_products_in.limit,
                                offset=enrollment_products_in.offset,
                                db_session=db.session)
    return enrollment_db

@product_router.get("/enrollments/students")
async def get_student_with_guide_mentor(*, product_id:int,batch_id:int | None = None,name:str | None = None,student_id:int | None = None,email:str | None = None,phone_no:str | None = None, offset: int = 0,limit: int = 100):
    
    students = await user_service.get_students_with_guides_mentors(product_id=product_id,batch_id=batch_id,
                                                                   student_id=student_id, email=email, name=name,
                                                                   phone_no=phone_no,limit=limit,offset=offset,db_session=db.session)
    results = [{**item._asdict()} for item in students]
    return results

@product_router.get("/teacher/students")
async def get_students_by_teacher(*,teacher_id:int,
                                    student_name: str | None = None,
                                    student_id: int | None = None,
                                    phone_number: str | None = None,
                                    email: str | None = None,
                                    offering_name: str | None = None,
                                    product_name: str | None = None,
                                    product_code: str | None = None,
                                    branch_name: str | None = None,
                                    guide_name: str | None = None,
                                    status: str | None = None,
                                    limit: int | None = None,
                                    offset: int | None = None):
    
    students= await user_service.get_student_for_teacher(teacher_id=teacher_id,student_name=student_name,
                    student_id=student_id,phone_number=phone_number,email=email,offering_name=offering_name,
                    product_name=product_name,product_code=product_code,branch_name=branch_name,guide_name=guide_name,
                    status=status,limit=limit,offset = offset,db_session=db.session)
    return students

@product_router.get("/enrollment/summary/{user_id}")
async def get_enrollment_summary(
    user_id: int,
   
):  
    data = await user_service.get_prod_student_count_for_teacher(user_id=user_id,db_session=db.session)
    return data

@product_router.get("/enrollments/{id}", response_model=ResponseSchema[EnrollmentResponse])
async def get_enrollment(*,id:int, user: User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce, USER_TYPE.student], roles=[USER_ROLE.org_admin, USER_ROLE.branch_admin,USER_ROLE.admission_manager,USER_ROLE.front_desk_executive,USER_ROLE.admission_counsellor, USER_ROLE.product_admin],apps=[APP.admin_app, APP.front_desk_app]))):
    # if USER_ROLE.org_admin in user.roles: 
    if USER_TYPE.student == user.user_type or user.roles is None or any(role in {USER_ROLE.org_admin, USER_ROLE.admission_manager,USER_ROLE.front_desk_executive,USER_ROLE.admission_counsellor, USER_ROLE.product_admin} for role in user.roles): 
        # enrollment_db = await enrollment_crud.get_joined(db=db.session, id=id, nest_joins=True, joins_config=[JoinConfig(model=User,join_on=Enrollment.enrolled_user_id==User.id, schema_to_select=UserBranchResponse,join_prefix="enrolled_user_")])
        enrollment_db = await enrollment_crud.get(id=id, db=db.session)
        user_data = await user_service.get_user_by_role_branch(user_id=enrollment_db.enrolled_user_id,db_session=db.session)
        if user_data:
            user, branches = user_data
            if branches:
                valid_branches = [branch for branch in branches if branch["id"] is not None]
                unique_branches_dict = {branch['id']: branch for branch in valid_branches}           
            else:
                unique_branches_dict = { }
            branch_roles = list(unique_branches_dict.values())
            user_response = EnrollmentResponse(
                **enrollment_db.__dict__,  
                branches=branch_roles 
            )
            return ResponseSchema(data=user_response,success=True)
        else:
            return ResponseSchema(msg="user not found")
    elif USER_ROLE.branch_admin in user.roles:
        enrollment = await enrollment_crud.get(db=db.session, id=id)
        if enrollment.product_id:
            product_db:ProductResponse = await product_crud.get(db=db.session,id=enrollment.product_id)
            admin_branch_ids = await user_role_service.get_branches_for_role_user(role=USER_ROLE.branch_admin,user_id=user.id,db_session=db.session)
            if product_db.branch_id not in admin_branch_ids:
                return ResponseSchema(msg="The product branch does not align with the branch admin's assigned branch.")
            # enrollment_db = await enrollment_crud.get_joined(db=db.session, id=id, nest_joins=True, joins_config=[JoinConfig(model=User,join_on=Enrollment.enrolled_user_id==User.id, schema_to_select=UserBranchResponse,join_prefix="enrolled_user_")])
            enrollment_db = await enrollment_crud.get(id=id, db=db.session)
            user_data = await user_service.get_user_by_role_branch(user_id=enrollment_db.enrolled_user_id,db_session=db.session)
            if user_data:
                user, branches = user_data
                if branches:
                    valid_branches = [branch for branch in branches if branch["id"] is not None]
                    unique_branches_dict = {branch['id']: branch for branch in valid_branches}           
                else:
                    unique_branches_dict = { }
                branch_roles = list(unique_branches_dict.values())
                user_response = EnrollmentResponse(
                    **enrollment_db.__dict__,  
                    branches=branch_roles 
                )
                return ResponseSchema(data=user_response,success=True)
            else:
                return ResponseSchema(msg="user not found")
    else:
        return ResponseSchema(msg="Access denied")

@product_router.delete("/enrollments/{id}")
async def delete_enrollment(*, id:int, user: User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce], roles=[USER_ROLE.org_admin, USER_ROLE.branch_admin, USER_ROLE.product_admin],apps=[APP.admin_app]))):
    enrollment = await enrollment_crud.get(db=db.session, id=id)
    if any(role in user.roles for role in [USER_ROLE.org_admin, USER_ROLE.product_admin]): 
        if not enrollment:
            return ResponseSchema(success=False, msg="enrollment with specified id not found") 
        if enrollment.enrolled_as == "MENTOR":
            product_id =  enrollment.product_id
            product = await product_crud.get(db=db.session, id=product_id)
            price_id = product.price_id
            enrollment_delete_db = await enrollment_crud.db_delete(db=db.session,id=id)   
            product_db_delete = await product_crud.db_delete(db=db.session,id=product_id)
            price_db_delete = await price_crud.db_delete(db=db.session,id=price_id)
        else:    
            enrollment_delete_db = await enrollment_crud.db_delete(db=db.session,id=id)   
        return ResponseSchema(data=enrollment_delete_db, success=True)  
    elif USER_ROLE.branch_admin in user.roles:
        if not enrollment:
            return ResponseSchema(success=False, msg="enrollment with specified id not found")
        if enrollment.product_id:
            product_db:ProductResponse = await product_crud.get(db=db.session,id=enrollment.product_id)
            admin_branch_ids = await user_role_service.get_branches_for_role_user(role=USER_ROLE.branch_admin,user_id=user.id,db_session=db.session)
            if product_db.branch_id not in admin_branch_ids:
                return ResponseSchema(msg="The product branch does not align with the branch admin's assigned branch.")
        if enrollment.enrolled_as == "MENTOR":
            product_id =  enrollment.product_id
            product = await product_crud.get(db=db.session, id=product_id)
            price_id = product.price_id
            enrollment_delete_db = await enrollment_crud.db_delete(db=db.session,id=id)   
            product_db_delete = await product_crud.db_delete(db=db.session,id=product_id)
            price_db_delete = await price_crud.db_delete(db=db.session,id=price_id)
        else:    
            enrollment_delete_db = await enrollment_crud.db_delete(db=db.session,id=id)   
        return ResponseSchema(msg="Deleted successfully", success=True)
    else:
        return ResponseSchema(msg="Access denied")

@product_router.get("/enrollments/students/count")# to update students enrolled in a batch or product
async def get_students_count_for_prod_batch(*, filters: Any | None = None,):
    
    if filters:
            filter_data = json.loads(filters)
    else:
            filter_data = {} 
            # checking for max students in a batch with students enrolled for that batch
    students_count = await enrollment_crud.get_count_by_filters(db=db.session, filters=filter_data)

    return students_count
   

@product_router.get("/categories/offerings", response_model=ResponseListSchema[OfferingResponse])
async def get_offerings_by_category(category: str, user: User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce], roles=[USER_ROLE.org_admin, USER_ROLE.branch_admin, USER_ROLE.product_admin],apps=[APP.admin_app]))):
    offerings_by_category = await offering_crud.get_multi(db=db.session,offering_category=category)
    return ResponseListSchema(data=offerings_by_category["data"], success=True,meta={"count":offerings_by_category["total_count"]})
    # offerings = await offering_service.get_offerings_by_category(db_session=db.session)
    
# @purchase_router.post("/purchases", response_model=ResponseSchema[PurchaseReponse])
# async def create_purchase(*, purchase:PurchaseCreate, user:User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce],roles=[USER_ROLE.admission_manager],apps=[APP.front_desk_app]))):
#     purchase_db = await purchase_crud.create(object=purchase,db=db.session)
#     return ResponseSchema(data=purchase_db,success=True)

@purchase_router.post("/purchases/discountpolicies", response_model=ResponseListSchema[PuchaseDiscSchema])
async def get_disc_policies_by_products(*,product_ids:list[int],user_id:int,user:User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce,USER_TYPE.student],roles=[USER_ROLE.admission_manager, USER_ROLE.student_administrator, USER_ROLE.product_admin],apps=[APP.front_desk_app,APP.admin_app,APP.student_app]))):
        prod_categories = []
        has_value_addition_course = False
        has_foundation_course = False

        # Step 1: Gather product categories for each prod_id
        for prod_id in product_ids:
            product_db: Product = await product_crud.get(id=prod_id, db=db.session)
            category = product_db.offering.offering_category
            name = product_db.offering.name
            prod_categories.append({"prod_id": prod_id, "category": category, "name": name})

            # Step 2: Check for required categories
            if category == "VALUE_ADDITION_COURSES":
                has_value_addition_course = True
            elif category == "FOUNDATION_COURSES":
                has_foundation_course = True
        
        if has_value_addition_course and has_foundation_course:
            
            discounts = await disc_check.fc_and_vac_check(prod_categories=prod_categories,user_id=user_id,db_session=db.session)
        elif has_value_addition_course:
            
            discounts = await disc_check.vac_check(prod_categories=prod_categories,user_id=user_id,db_session=db.session)
        elif has_foundation_course:
            
            discounts = await disc_check.fc_check(prod_categories=prod_categories,db_session=db.session)
        else:
            
            discounts_applied = []
            for prod in prod_categories:
                product_db : Product = await product_crud.get(id=prod["prod_id"],db=db.session)
                price_db = await price_crud.get_by_field(value=product_db.price_id, field="id", db = db.session)
                discounts_applied.append({
                            "prod_id": prod["prod_id"],
                            "selling_price": price_db.selling_price,
                            "discount_no": None,
                            "discount_applied":  0,
                })
            discounts = discounts_applied

        return ResponseListSchema(data=discounts,success=True)

@purchase_router.post("/purchases",response_model=ResponseListSchema[PurchaseReponse])
async def create_purchases(*, purchases_create: FDPurchaseSchema, user:User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce,USER_TYPE.student],roles=[USER_ROLE.admission_manager,USER_ROLE.student_administrator],apps=[APP.front_desk_app,APP.student_app]))):
    # tx_in = await transaction_crud.create(object=Transaction(paid_by=purchase.student_id,
    #                                                          tx_id = generate_random_alphanum(length=15)),
    #                                                          tx_status = TX_STATUS.created)
    purchases = []
    # total_purchase_amt = sum(purchase.amount for purchase in purchases_create.purchases)
    for purchase in purchases_create.purchases:
        product_db: ProductResponse = await product_crud.get(id=purchase.product_id,db=db.session)
        if purchase.purchase_type is PURCHASE_TYPE.book and not product_db.allow_booking is True:
            return ResponseSchema(msg="This product cannot be booked")
        # pro_disc = (purchases_create.manager_disc_amt if purchases_create.manager_disc_amt else 0 *round(purchase.amount/total_purchase_amt))
        # tot_amt = purchase.amount - (purchase.discount_amount if purchase.discount_amount else 0  + pro_disc if pro_disc else 0 )
        tot_amt = purchase.amount - (purchase.discount_amount if purchase.discount_amount else 0 + purchase.additional_disc_amt if purchase.additional_disc_amt else 0)
        purchase_create = PurchaseCreate(product_id=product_db.id,
                                         price_id=purchase.price_id,
                                         student_id=purchase.student_id,
                                         admission_id=purchase.admission_id,
                                         purchase_type=purchase.purchase_type,
                                         quantity=purchase.quantity,
                                         amount=purchase.amount,
                                         intallments_count=purchase.intallments_count,
                                         purchase_date=purchase.purchase_date,
                                         discount_id=purchase.discount_id,
                                         discount_amount=purchase.discount_amount,
                                         additional_discount_id=purchase.additional_discount_id, 
                                         additional_disc_amt=purchase.additional_disc_amt,
                                         purchase_status=PURCHASE_STATUS.created,
                                         total_amount= tot_amt,
                                         purchase_details= purchase.purchase_details,
                                         legal_entity_details= purchase.legal_entity_details
                                        #  transaction_id=tx_in.id if not purchase.purchase_installments else None
                                         )
        purchase_in = await purchase_crud.create(object=purchase_create,db=db.session)
        purchases.append(purchase_in)
        # if purchase.purchase_installments:
        #     for installment in purchase.purchase_installments:
        #         installment_create = PurchaseInstallmentCreate(product_id=product_db.id,
        #                                                         price_id=product_db.price_id,
        #                                                         purchase_id=purchase_in.id,
        #                                                         transaction_id=tx_in.id if installment.to_be_paid else None,
        #                                                         installment_date=installment.installment_date,
        #                                                         installment_amount=installment.installment_amount,
        #                                                         installment_status=INSTALLMENT_STATUS.created)
        #         installments_in = await purchase_installment_crud.create(object=installment_create,db=db.session)
        #         tx_amt = tx_amt + installment.installment_amount if installment.to_be_paid else 0
    
    # transaction_db = await transaction_crud.update(object={"amount":tx_amt},db=db.session)

    return ResponseListSchema(data=purchases, success=True)

@purchase_router.get("/purchases/user",response_model=UserPurchaseRespData)
async def get_purchases(*, user_id:int | None = None,limit: int = 100, offset: int = 0,user:User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce],roles=[USER_ROLE.admission_manager,USER_ROLE.student_administrator],apps=[APP.front_desk_app]))):
    purchases = await  user_service.get_purchases_with_prod_admission_data(user_id=user_id,limit=limit,offset=offset,db_session=db.session)
    results = [{**item._asdict()} for item in purchases]
    return {"data":results}

@purchase_router.get("/purchases/filter",response_model=UserPurchaseRespData)
async def get_purchases(*, user_id:int | None = None,
                        student_name: str | None = None,
                        ph_no: str | None = None,
                        branch_name: str | None = None,
                        purchase_amt: int | None = None,
                        purchase_date: date | None = None,
                        installment_date: date | None = None,
                        prod_name: str | None = None,
                        purchase_id: int | None = None,
                        purchase_type: str | None = None,
                        purchase_status: str | None = None,
                        admission_id:int | None = None,
                        limit: int = 100, offset: int = 0,
                        user:User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce],roles=[USER_ROLE.org_admin, USER_ROLE.branch_admin,USER_ROLE.admission_manager,USER_ROLE.student_administrator,USER_ROLE.teacher],apps=[APP.front_desk_app]))):
    purchases = await  user_service.get_purchases_with_filters(user_id=user_id,
                        student_name=student_name,
                        ph_no=ph_no,
                        branch_name=branch_name,
                        purchase_amt=purchase_amt,
                        purchase_date=purchase_date,
                        installment_date=installment_date,
                        prod_name=prod_name,
                        purchase_id=purchase_id,
                        purchase_type=purchase_type,
                        admission_id = admission_id,
                        purchase_status=purchase_status,limit=limit,offset=offset,db_session=db.session)
    results = [{**item._asdict()} for item in purchases]
    return {"data":results}
    
@purchase_router.get("/purchases/{id}",response_model=ResponseSchema[PurchaseReponse])
async def get_purchase(*,id:int, user:User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce],roles=[USER_ROLE.admission_manager,USER_ROLE.front_desk_executive,USER_ROLE.admission_counsellor,USER_ROLE.student_administrator],apps=[APP.front_desk_app]))):
    purchase_db = await purchase_crud.get(id=id,db=db.session)
    return ResponseSchema(data=purchase_db,success=True)

@purchase_router.get("/purchases", response_model=ResponseListSchema[PurchaseReponse])
async def get_purchases(*, filters: Any | None = None, user:User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce],roles=[USER_ROLE.admission_manager,USER_ROLE.front_desk_executive,USER_ROLE.admission_counsellor,USER_ROLE.student_administrator,USER_ROLE.admission_counsellor,USER_ROLE.student_administrator,
                                                                                                                                             USER_ROLE.mentor,USER_ROLE.teacher,USER_ROLE.evaluation_evaluator,
                                                                                                                                             USER_ROLE.evaluation_coordinator,USER_ROLE.evaluation_reviewer],apps=[APP.front_desk_app,APP.teaching_app]))):
    if filters:
            filter_data = json.loads(filters)
    else:
            filter_data = {} 
    purchases_db = await purchase_crud.get_by_filters_multi(filters=filter_data, db=db.session)
    return ResponseListSchema(data=purchases_db,success=True)
    


# @purchase_router.delete("/purchases/{id}")
# async def delete_purchase(*, id:int, user:User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce],roles=[USER_ROLE.admission_manager],apps=[APP.front_desk_app]))):
#     delete_purchase_db = await purchase_crud.db_delete(db=db.session,id=id)   
#     return ResponseSchema(success=True, msg="Deleted successfully") 

# @purchase_router.post("/purchaseinstallments", response_model=ResponseSchema[PurchaseInstallmentResponse])
# async def create_purchase_instalment(*, purchase_installment:PurchaseInstallmentCreate, user:User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce],roles=[USER_ROLE.admission_manager,USER_ROLE.student_administrator],apps=[APP.front_desk_app]))):
#     prod_db = await product_crud.get(id=purchase_installment.product_id,db=db.session)
    
#     if prod_db.allow_installments is False:
#         return ResponseSchema(msg="installments are not allowed for this product")
#     installments = await purchase_installment_crud.get_by_filters_multi(filters={"purchase_id":purchase_installment.purchase_id,"is_deleted":False},db=db.session) 
#     if installments:
#         price_db = await price_crud.get(id=prod_db.price_id,db=db.session)
#         purchase_db = await purchase_crud.get(id=purchase_installment.purchase_id,db=db.session)
#         if not price_db:
#             return ResponseSchema(msg="no price attached to product")
#         price_break_up = price_db.price_break_up
#         total_by_legal_entity = {k: sum(x["total_price"] for x in price_break_up if x["legal_entity"] == k) for k in set(x["legal_entity"] for x in price_break_up)}
#         total_sum = sum(total_by_legal_entity.values())
#         if total_sum != purchase_db.amount:
#             return ResponseSchema(msg="price attached doesnt match with purchase amount")
#         total_purchase_disc = purchase_db.discount_amount + purchase_db.additional_disc_amt
#         final_total = {
#         k: round(v - (v / total_sum) * total_purchase_disc)
#         for k, v in total_by_legal_entity.items()
#         }
#         # print("final_amt>>>>", final_total)
#         sums_by_legal_entity_name = {k: sum(inst.installment_amount or 0 for inst in installments if inst.legal_entity_details and inst.legal_entity_details["name"] == k) for k in set(inst.legal_entity_details["name"] for inst in installments if inst.legal_entity_details and inst.legal_entity_details["name"])}
       
#         inst_legal_name = purchase_installment.legal_entity_details.name
#         total_legal_amt = purchase_installment.installment_amount + sums_by_legal_entity_name.get(inst_legal_name, 0)
#         # print("ins>>>>>>?????????", sums_by_legal_entity_name, purchase_installment.installment_amount + sums_by_legal_entity_name.get(inst_legal_name, 0),total_legal_amt)
#         if total_legal_amt > final_total.get(inst_legal_name, 0):
#             return ResponseSchema(
#                 success=False,
#                 msg="sum of installment amounts for the given legal entity is exceeding"
#             )
       
#         total_installments = sum(installment.installment_amount for installment in installments)
#         total_amt = total_installments + purchase_installment.installment_amount
    
#         if total_amt > purchase_db.total_amount:
#             return ResponseSchema(
#                 success=False,
#                 msg=f"Total installments amount ({total_amt}) is greater than or equal to the purchase amount ({purchase_db.total_amount})"
#             )

#     if purchase_installment.is_original == True:
#         purchase_installment = PurchaseInstallment(**purchase_installment.model_dump(),original_installment_date=purchase_installment.installment_date,
#                                                                                                                 original_installment_amount=purchase_installment.installment_amount)
#         purchase_installment_db = await purchase_installment_crud.create(object=purchase_installment,db=db.session)
        
#     elif purchase_installment.is_original == False:
#         purchase_installment_db = await purchase_installment_crud.create(object=purchase_installment,db=db.session)
    
#     installments = await purchase_installment_crud.get_by_filters_multi(filters={"purchase_id":purchase_installment.purchase_id,"is_deleted":False},db=db.session)
            
#     installments_count = len(installments)
        
#     purchase_update_db = await purchase_crud.update(db=db.session,id=purchase_installment.purchase_id,object={ "intallments_count":installments_count })
#     # if purchase_installment.pay_now is True:
#     #      purchase_ins_update_db = await purchase_installment_crud.update(db=db.session,id=purchase_installment_db.id,object={"transaction_id":purchase_installment.transaction_id })
#     return ResponseSchema(data=purchase_installment_db,success=True)

@purchase_router.post("/purchaseinstallments", response_model=ResponseSchema[PurchaseInstallmentResponse])
async def create_purchase_instalment(*, purchase_installment:PurchaseInstallmentCreate, user:User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce,USER_TYPE.student],roles=[USER_ROLE.admission_manager,USER_ROLE.student_administrator],apps=[APP.front_desk_app,APP.student_app]))):
    prod_db = await product_crud.get(id=purchase_installment.product_id,db=db.session)
    if prod_db.allow_installments is False:
        return ResponseSchema(msg="installments are not allowed for this product")
    installments = await purchase_installment_crud.get_by_filters_multi(filters={"purchase_id":purchase_installment.purchase_id,"is_deleted":False},db=db.session) 
    if installments:
        purchase_db = await purchase_crud.get(id=purchase_installment.purchase_id,db=db.session)
        total_installments = sum(installment.installment_amount for installment in installments)
        total_amt = total_installments + purchase_installment.installment_amount
    
        if total_amt > purchase_db.total_amount:
            return ResponseSchema(
                success=False,
                msg=f"Total installments amount ({total_amt}) is greater than or equal to the purchase amount ({purchase_db.total_amount})"
            )

    if purchase_installment.is_original == True:
        purchase_installment = PurchaseInstallment(**purchase_installment.model_dump(),original_installment_date=purchase_installment.installment_date,
                                                                                                                original_installment_amount=purchase_installment.installment_amount)
        purchase_installment_db = await purchase_installment_crud.create(object=purchase_installment,db=db.session)
        
    elif purchase_installment.is_original == False:
        purchase_installment_db = await purchase_installment_crud.create(object=purchase_installment,db=db.session)
    
    installments = await purchase_installment_crud.get_by_filters_multi(filters={"purchase_id":purchase_installment.purchase_id,"is_deleted":False},db=db.session)
            
    installments_count = len(installments)
        
    purchase_update_db = await purchase_crud.update(db=db.session,id=purchase_installment.purchase_id,object={ "intallments_count":installments_count })
    # if purchase_installment.pay_now is True:
    #      purchase_ins_update_db = await purchase_installment_crud.update(db=db.session,id=purchase_installment_db.id,object={"transaction_id":purchase_installment.transaction_id })
    return ResponseSchema(data=purchase_installment_db,success=True)

@purchase_router.put("/purchaseinstallments/{id}", response_model=ResponseSchema[PurchaseInstallmentResponse])
async def update_purchase_installment(*,id:int,request:Request, purchase_installment:PurchaseInstallmentUpdate,user:User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce],roles=[USER_ROLE.org_admin, USER_ROLE.branch_admin,USER_ROLE.admission_manager,USER_ROLE.student_administrator,USER_ROLE.fee_collection_incharge],apps=[APP.front_desk_app]))):
    purchase_installment_db = await purchase_installment_crud.get(id=id,db=db.session)
    if purchase_installment_db.transaction_id is not None and purchase_installment_db.installment_status == "COMPLETED":
        purchase_installment_update = await purchase_installment_crud.update(db=db.session,id=id,object={"legal_entity_details":purchase_installment.legal_entity_details.dict()})
        purchase_installment_db = await purchase_installment_crud.get(id=id,db=db.session)
        return ResponseSchema(data=purchase_installment_db,success=True)
        
    purchase_installment_update = await purchase_installment_crud.update(db=db.session,id=id,object=purchase_installment)
    purchase_installment_db = await purchase_installment_crud.get(id=id,db=db.session)
    if purchase_installment.installment_amount:
                event_details = purchase_installment.model_dump(exclude_unset=True)
                event_details["installment_id"] = id
                await log_event(db=db.session,request=request,event_type=EVENT_TYPE.AMOUNT_UPDATE,event_by_user_id=user.id,user_name=user.full_name,user_phone=user.phone_number,event_details=json.dumps(jsonable_encoder(event_details)))
     
    return ResponseSchema(data=purchase_installment_db,success=True)


@purchase_router.get("/purchaseinstallments/{id}", response_model=ResponseSchema[PurchaseInstallmentResponse])
async def get_purchase_installment(*,id:int, user:User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce],roles=[USER_ROLE.admission_manager,USER_ROLE.student_administrator],apps=[APP.front_desk_app]))):
    purchase_installment_db = await purchase_installment_crud.get(id=id,db=db.session)
    if purchase_installment_db.is_deleted == True:
        return ResponseSchema(msg="Purchase Installment deleted", success= False)
    return ResponseSchema(data=purchase_installment_db,success=True)
    
@purchase_router.get("/purchaseinstallments", response_model=ResponseListSchema[PurchaseInstallmentResponse])
async def get_purchase_installment(*, filters: Any | None = None, user:User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce],roles=[USER_ROLE.admission_manager,USER_ROLE.student_administrator],apps=[APP.front_desk_app]))):
    if filters:
            filter_data = json.loads(filters)
    else:
            filter_data = {} 
    filter_data["is_deleted"] = False
    purchase_installment_db = await purchase_installment_crud.get_by_filters_multi(filters=filter_data,order_by="installment_date",db=db.session)
    return ResponseListSchema(data=purchase_installment_db,success=True)

@purchase_router.delete("/purchaseinstallments/{id}")
async def delete_purchase_installment(*, id:int, user:User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce],roles=[USER_ROLE.admission_manager,USER_ROLE.student_administrator],apps=[APP.front_desk_app]))):
    purchase_installment_db = await purchase_installment_crud.get(id=id,db=db.session)
    if purchase_installment_db.transaction_id is not None and purchase_installment_db.installment_status == "COMPLETED":
        return ResponseSchema(success=False, msg="Paid Installment cant be deleted") 
    if purchase_installment_db.is_original == True:
        delete_purchase_db = await purchase_installment_crud.update(db=db.session,id=id,object={"is_deleted":True})        
    else:
        delete_purchase_db = await purchase_installment_crud.db_delete(db=db.session,id=id) 
    return ResponseSchema(success=True, msg="Deleted successfully") 

@purchase_router.post("/purchases/pay")
async def purchase_pay(*,payment_in:PaymentSchema, user:User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce],roles=[USER_ROLE.admission_manager, USER_ROLE.student_administrator,USER_ROLE.fee_collection_incharge],apps=[APP.front_desk_app]))):
    # if payment_in.payment_instrument.type == SUBS_FLOW_TYPE.collect_flow:
    #     if not payment_in.payment_instrument.vpa:
    #         raise VPARequired()
    #     verify_vpa = await pg.verify_vpa(vpa=payment_in.payment_instrument.vpa)
    # elif (
    #     payment_in.payment_instrument.type == SUBS_FLOW_TYPE.upi_intent_flow
    #     and not payment_in.payment_instrument.target_app
    # ):
    #     raise TargetAppRequired()
    # tx_db = await transaction_crud.get(id=payment_in.transaction_id)
    tx_id = generate_random_alphanum(length=20)
        # pg_pay_resp = await pg.pg_pay_api(pay_api_in=PgPAYAPISchema(
        #                 merchantId=settings.MERCHANT_ID,
        #                 merchantTransactionId= tx_id,
        #                 merchantUserId=str(payment_in.student_id),
        #                 amount=payment_in.amount,
        #                 mobileNumber=payment_in.mobile_number,
        #                 callbackUrl= f"{settings.API_BASE_URL}/phonepe/pay/callback",
        #                 device_context=payment_in.device_context,
        #                 paymentInstrument=payment_in.payment_instrument,
        # ))
    pg_pay_resp = await pg.pay_api(pay_api_in=PgPayApiSchema(
                    merchantId=settings.MERCHANT_ID,
                    merchantTransactionId= tx_id,
                    merchantUserId=str(payment_in.student_id),
                    amount=payment_in.amount,
                    mobileNumber=payment_in.mobile_number,
                    redirect_mode= payment_in.redirect_mode,
                    redirect_url=payment_in.redirect_url,
                    callbackUrl= f"{settings.API_BASE_URL}/phonepe/pay/callback",
                    paymentInstrument=payment_in.payment_instrument,
    ))
    print("pg_pay_resp>>>>>>>>>>>>", pg_pay_resp)    
    tx_in = await transaction_crud.create(object=Transaction(paid_by=payment_in.student_id,
                                                            tx_id = tx_id,
                                                            amount=payment_in.amount,
                                                            payment_mode=payment_in.payment_instrument.type,
                                                            # pg_ref_id = pg_pay_resp["transactionId"],
                                                            tx_at=datetime.now(),
                                                            tx_status=TX_STATUS.pending),db=db.session)
    pur_ids = []
    if payment_in.purchase_ids:
        for id in payment_in.purchase_ids:
            pur_ids.append(id)
            installments = await purchase_installment_crud.get_by_filters_multi(filters={"purchase_id":id,"is_deleted":False},db=db.session)            
            installments_count = len(installments)
            purchase_update = await purchase_crud.update(db=db.session,id=id,object={"transaction_id":tx_in.id,"purchase_status":INSTALLMENT_STATUS.created,"intallments_count":installments_count})
    if payment_in.purchase_installment_ids:
        for inst_id in payment_in.purchase_installment_ids:
            purchase = await purchase_installment_crud.get(id=inst_id,db=db.session)
            pur_ids.append(purchase.purchase_id)
            installments = await purchase_installment_crud.get_by_filters_multi(filters={"purchase_id":purchase.purchase_id,"is_deleted":False},db=db.session)            
            installments_count = len(installments)
            pur_installment_update = await purchase_installment_crud.update(db=db.session,id=inst_id,object={"installment_status":INSTALLMENT_STATUS.created,"transaction_id":tx_in.id})
            purchase_update = await purchase_crud.update(db=db.session,id=purchase.purchase_id,object={"purchase_status":INSTALLMENT_STATUS.created,"intallments_count":installments_count})

    # pur_ins_ids = []
    # if payment_in.purchase_installment_id: # for next installment payment 
    #     pur_installment_update = await purchase_installment_crud.update(db=db.session,id=payment_in.purchase_installment_id,object={"installment_status":INSTALLMENT_STATUS.created,"transaction_id":tx_in.id})
    #     pur_ins_ids.append(payment_in.purchase_installment_id)
    # else:
    #     for id in payment_in.purchase_ids:
    #         installments = await purchase_installment_crud.get_by_filters_multi(filters={"purchase_id":id,"is_deleted":False},order_by="installment_date",db=db.session)
            
    #         installments_count = len(installments)
    #         if installments_count > 0:
    #             first_installment = installments[0]
    #             pur_ins_ids.append(first_installment.id)
    #             pur_installment_update = await purchase_installment_crud.update(db=db.session,id=first_installment.id,object={"installment_status":INSTALLMENT_STATUS.created,"transaction_id":tx_in.id})
    #             purchase_update = await purchase_crud.update(db=db.session,id=first_installment.purchase_id,object={"purchase_status":INSTALLMENT_STATUS.created,"intallments_count":installments_count})
    #         else:   
    #             purchase_update = await purchase_crud.update(db=db.session,id=id,object={"transaction_id":tx_in.id,"purchase_status":INSTALLMENT_STATUS.created,"intallments_count":installments_count})
    tx_data = TxPayData(purchase_ids=pur_ids,purchase_installment_ids=payment_in.purchase_installment_ids )
    # tx_update = PurchaseTransactionUpdate(
    #                                       amount=payment_in.amount,
    #                                       payment_method=payment_in.payment_instrument.type,
    #                                       pg_ref_id = pg_pay_resp["transactionId"],
    #                                       tx_at=datetime.now(),
    #                                       tx_status=TX_STATUS.pending)
    # transaction_db = await transaction_crud.update(object=tx_update,db=db.session)
    # installments = await purchase_installment_crud.get_by_filters_multi(ids=[tx_db.id],attr="transaction_id",db=db.session)
    # purchases = await purchase_crud.get_by_filters_multi(ids=[tx_db.id],attr="transaction_id",db=db.session)
    # for purchase in purchases:
    #     purchase_update = await purchase_crud.update(db=db.session,id=installment.id,object={"installment_status":INSTALLMENT_STATUS.pending})
    # for installment in installments:
    #     installments_update = await purchase_installment_crud.update(db=db.session,id=installment.id,object={"installment_status":INSTALLMENT_STATUS.pending})
    tx_update = await transaction_crud.update(db=db.session,id=tx_in.id,object={"tx_data":tx_data.model_dump(exclude_unset=True)})
    return ResponseSchema(data=pg_pay_resp,success=True)

@purchase_router.put("/purchases/pay", response_model=ResponseSchema[PurchaseTransactionResponse])
async def purchase_pay_offline(*,payment_in:PaymentOfflineSchema, request: Request,
                               user:User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce],roles=[USER_ROLE.admission_manager, USER_ROLE.student_administrator,USER_ROLE.fee_collection_incharge],apps=[APP.front_desk_app]))):
    async def check_for_tx(tx_id: int, pur_ids: list[int] | None = None, ins_ids: list[int] | None = None):
        tenant = await legalentity_crud.get(db=db.session, id=payment_in.tenant_id)
        legal_entity = next(
            (entity for entity in tenant.legal_entities if entity.get('name') == payment_in.legalentity_name), 
            None
        )  
        key_id = legal_entity["razorpay_key_id"]
        key_secret = legal_entity["razorpay_key_secret"]

        tx_db = await transaction_crud.get_by_field(value=tx_id,field="id",db=db.session)
        if tx_db.payment_mode == "PAYMENT_LINK":
            paymentlink_id = tx_db.tx_data.get("id")
            link_status = await razorpg.payment_link_status(paymentlink_id=paymentlink_id,key_id = key_id ,key_secret = key_secret)
            link_status_data = link_status.json()
            if link_status_data["status"] == "created":
                tx_ids = []
                if pur_ids:
                    for id in pur_ids:
                        purchase = await purchase_crud.get_by_field(value=id, field="id", db=db.session)
                        if purchase.transaction_id:
                            tx_ids.append(purchase.transaction_id)
        
                if ins_ids: 
                    for id in ins_ids:
                        purchase = await purchase_installment_crud.get_by_field(value=id, field="id", db=db.session)
                        if purchase.transaction_id:
                            tx_ids.append(purchase.transaction_id)

                if len(set(tx_ids)) > 1:
                    return None
                print("tx_DSISDSD>>>>",tx_ids )
                return link_status_data
        return None

    if payment_in.purchase_ids:
        for id in payment_in.purchase_ids:
            purchase = await purchase_crud.get_by_field(value=id, field="id", db=db.session)
            if purchase.transaction_id:
                tx = await check_for_tx(tx_id= purchase.transaction_id,pur_ids=payment_in.purchase_ids,ins_ids=payment_in.purchase_installment_ids if payment_in.purchase_installment_ids else None)
                if tx:
                    return ResponseSchema(msg="Transaction through payment link is active.",success=False)
    if payment_in.purchase_installment_ids:
        for id in payment_in.purchase_installment_ids:
            purchase = await purchase_installment_crud.get_by_field(value=id, field="id", db=db.session)
            if purchase.transaction_id:
                tx = await check_for_tx(tx_id= purchase.transaction_id,ins_ids=payment_in.purchase_installment_ids,pur_ids=payment_in.purchase_ids if payment_in.purchase_ids else None)
                if tx:
                    return ResponseSchema(msg="Transaction through payment link is active.",success=False)
    tx_in = await transaction_crud.create(object=PurchaseTransactionCreate(paid_by=payment_in.student_id,
                                                                           paid_to=payment_in.tx_data.collected_by,
                                                            tx_id = generate_random_alphanum(length=20),
                                                            amount=payment_in.amount,
                                                            payment_mode=payment_in.payment_mode,
                                                            # tx_data= payment_in.tx_data.model_dump(exclude_unset=True),
                                                            # tx_at=datetime.now(),
                                                            tx_at = payment_in.tx_at,
                                                            tx_status=TX_STATUS.provisionally_paid if payment_in.payment_mode == PAYMENT_MODE.cheque else TX_STATUS.completed), db=db.session)
    pur_ids = []
    if payment_in.purchase_ids:
        for id in payment_in.purchase_ids:
            pur_ids.append(id)
            installments = await purchase_installment_crud.get_by_filters_multi(filters={"purchase_id":id,"is_deleted":False},db=db.session)            
            installments_count = len(installments)
            purchase_update = await purchase_crud.update(db=db.session,id=id,object={"transaction_id":tx_in.id,"purchase_status":TX_STATUS.provisionally_paid if payment_in.payment_mode == PAYMENT_MODE.cheque else TX_STATUS.completed,"intallments_count":installments_count})
    if payment_in.purchase_installment_ids:
        for inst_id in payment_in.purchase_installment_ids:
            purchase = await purchase_installment_crud.get(id=inst_id,db=db.session)
            pur_ids.append(purchase.purchase_id)
            installments = await purchase_installment_crud.get_by_filters_multi(filters={"purchase_id":purchase.purchase_id,"is_deleted":False},db=db.session)            
            installments_count = len(installments)
            pur_installment_update = await purchase_installment_crud.update(db=db.session,id=inst_id,object={"installment_status":INSTALLMENT_STATUS.provisionally_paid if payment_in.payment_mode == PAYMENT_MODE.cheque else TX_STATUS.completed,"transaction_id":tx_in.id})
            purchase_update = await purchase_crud.update(db=db.session,id=purchase.purchase_id,object={"purchase_status":INSTALLMENT_STATUS.provisionally_paid if payment_in.payment_mode == PAYMENT_MODE.cheque else TX_STATUS.completed,"intallments_count":installments_count})
    # pur_ins_ids = []
    # if payment_in.purchase_installment_id: # for next installment payment 
    #     pur_installment_update = await purchase_installment_crud.update(db=db.session,id=payment_in.purchase_installment_id,object={"installment_status":INSTALLMENT_STATUS.provisionally_paid if payment_in.payment_mode == PAYMENT_MODE.cheque else TX_STATUS.completed,"transaction_id":tx_in.id})
    #     pur_ins_ids.append(payment_in.purchase_installment_id)
    # else:
    #     for id in payment_in.purchase_ids:
    #         installments = await purchase_installment_crud.get_by_filters_multi(filters={"purchase_id":id,"is_deleted":False},order_by="installment_date",db=db.session)
    #         installments_count = len(installments)
    #         if installments:
    #             first_installment = installments[0]
    #             pur_ins_ids.append(first_installment.id)
    #             pur_installment = await purchase_installment_crud.update(db=db.session,id=first_installment.id,object={"installment_status":TX_STATUS.provisionally_paid if payment_in.payment_mode == PAYMENT_MODE.cheque else TX_STATUS.completed,"transaction_id":tx_in.id})
    #             purchase_update = await purchase_crud.update(db=db.session,id=first_installment.purchase_id,object={"purchase_status":TX_STATUS.provisionally_paid if payment_in.payment_mode == PAYMENT_MODE.cheque else TX_STATUS.completed, "intallments_count":installments_count})
    #         else:   
    #             purchase_update = await purchase_crud.update(db=db.session,id=id,object={"transaction_id":tx_in.id,"purchase_status":TX_STATUS.provisionally_paid if payment_in.payment_mode == PAYMENT_MODE.cheque else TX_STATUS.completed,"intallments_count":installments_count})

    # installments = await purchase_installment_crud.get_by_filters_multi(ids=[tx_db.id],attr="transaction_id",db=db.session)
    # purchases = await purchase_crud.get_by_filters_multi(ids=[tx_db.id],attr="transaction_id",db=db.session)
    # for purchase in purchases:
    #     purchase_update = await purchase_crud.update(db=db.session,id=purchase.id,object={"installment_status":INSTALLMENT_STATUS.completed})
    # for installment in installments:
    #     installments_update = await purchase_installment_crud.update(db=db.session,id=installment.id,object={"installment_status":INSTALLMENT_STATUS.completed})
    tx_data = PayTxData(**payment_in.tx_data.model_dump(exclude_unset=True),purchase_ids=pur_ids,purchase_installment_ids=payment_in.purchase_installment_ids )
    tx_update = await transaction_crud.update(db=db.session,id=tx_in.id,object={"tx_data":tx_data.model_dump(exclude_unset=True)})
    if payment_in.payment_mode != PAYMENT_MODE.cheque:
        #log event
        await log_event(db=db.session,request=request,event_type=EVENT_TYPE.OFFLINE_PAYMENT_SUCCESS,event_by_user_id=user.id,user_name=user.full_name,user_phone=user.phone_number,event_details={"tx_id":tx_in.id,"paid_by":tx_in.paid_by,"purchase_ids":payment_in.purchase_ids if payment_in.purchase_ids else None,"installment_ids":payment_in.purchase_installment_ids if payment_in.purchase_installment_ids else None})

    return ResponseSchema(data=tx_in,success=True)

@purchase_router.post("/purchases/pay/links")
async def purchase_link(*,paymentlink_in:PurchasePaymentLinkSchema,user:User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce,USER_TYPE.student],roles=[USER_ROLE.admission_manager, USER_ROLE.student_administrator,USER_ROLE.fee_collection_incharge],apps=[APP.front_desk_app,APP.student_app]))):
    tenant = await legalentity_crud.get(db=db.session, id=paymentlink_in.tenant_id)
    legal_entity = next(
        (entity for entity in tenant.legal_entities if entity.get('name') == paymentlink_in.legalentity_name), 
        None
    )  
    key_id = legal_entity["razorpay_key_id"]
    key_secret = legal_entity["razorpay_key_secret"]

    async def check_for_tx(tx_id: int,pur_ids: list[int] | None = None, ins_ids: list[int] | None = None):
        tx_db = await transaction_crud.get_by_field(value=tx_id,field="id",db=db.session)
        if tx_db.payment_mode == "PAYMENT_LINK":
            paymentlink_id = tx_db.tx_data.get("id")
            link_status = await razorpg.payment_link_status(paymentlink_id=paymentlink_id,key_id = key_id ,key_secret = key_secret)
            link_status_data = link_status.json()
            print("LINKS_STS>>>",link_status_data, tx_id,pur_ids, ins_ids )
            if link_status_data["status"] == "created":
                tx_ids = []
                if pur_ids:
                    for id in pur_ids:
                        purchase = await purchase_crud.get_by_field(value=id, field="id", db=db.session)
                        if purchase.transaction_id:
                            tx_ids.append(purchase.transaction_id)
        
                if ins_ids: 
                    for id in ins_ids:
                        purchase = await purchase_installment_crud.get_by_field(value=id, field="id", db=db.session)
                        if purchase.transaction_id:
                            tx_ids.append(purchase.transaction_id)
                print("TX_IDS>>>>>", tx_ids)
                if len(set(tx_ids)) > 1:
                    return None
                return link_status_data
        return None

    if paymentlink_in.purchase_ids:
        for id in paymentlink_in.purchase_ids:
            purchase = await purchase_crud.get_by_field(value=id, field="id", db=db.session)
            if purchase.transaction_id:
                print("DFRECRECFERE")
                tx = await check_for_tx(tx_id= purchase.transaction_id,pur_ids=paymentlink_in.purchase_ids,ins_ids=paymentlink_in.purchase_installment_ids if paymentlink_in.purchase_installment_ids else None)
                if tx:
                    return ResponseSchema(data=tx,success=True)
    if paymentlink_in.purchase_installment_ids:
        for id in paymentlink_in.purchase_installment_ids:
            purchase = await purchase_installment_crud.get_by_field(value=id, field="id", db=db.session)
            if purchase.transaction_id:
                print("nnoiFRECRECFERE")
                tx = await check_for_tx(tx_id= purchase.transaction_id,ins_ids=paymentlink_in.purchase_installment_ids,pur_ids=paymentlink_in.purchase_ids if paymentlink_in.purchase_ids else None)
                if tx:
                    return ResponseSchema(data=tx,success=True)
               
    pay_ref_id = generate_random_alphanum(length=20)
    
    pg_resp = await razorpg.paymentlink_api(key_id = key_id ,key_secret = key_secret ,link_in=PaymentLinkRequest(
                                                amount = paymentlink_in.amount,
                                                currency = "INR",
                                                # accept_partial = paymentlink_in.accept_partial,
                                                # first_min_partial_amount = paymentlink_in.first_min_partial_amount,
                                                expire_by = paymentlink_in.expire_by,
                                                reference_id = pay_ref_id,
                                                description= "payment",
                                                customer= paymentlink_in.customer,
                                                callback_url= paymentlink_in.callback_url,
                                                callback_method= paymentlink_in.callback_method,
                                                notify= paymentlink_in.notify,
                                                reminder_enable= paymentlink_in.reminder_enable,
                                                notes= paymentlink_in.notes
                                                ))
    print("pg_pay_resp>>>>>>>>>>>>", pg_resp)   
    if pg_resp.status_code != 200:
        return  pg_resp.json()
    pg_pay_resp = pg_resp.json()
    tx_in = await transaction_crud.create(object=Transaction(paid_by=paymentlink_in.student_id,
                                                            tx_id = pay_ref_id,
                                                            amount=paymentlink_in.amount,
                                                            payment_mode= "PAYMENT_LINK",
                                                            tx_at=datetime.now(),
                                                            tx_status=TX_STATUS.pending),db=db.session)
    pur_ids = []
    if paymentlink_in.purchase_ids:
        for id in paymentlink_in.purchase_ids:
            pur_ids.append(id)
            installments = await purchase_installment_crud.get_by_filters_multi(filters={"purchase_id":id,"is_deleted":False},db=db.session)            
            installments_count = len(installments)
            purchase_update = await purchase_crud.update(db=db.session,id=id,object={"transaction_id":tx_in.id,"purchase_status":INSTALLMENT_STATUS.created,"intallments_count":installments_count})
    if paymentlink_in.purchase_installment_ids:
        for inst_id in paymentlink_in.purchase_installment_ids:
            purchase = await purchase_installment_crud.get(id=inst_id,db=db.session)
            pur_ids.append(purchase.purchase_id)
            installments = await purchase_installment_crud.get_by_filters_multi(filters={"purchase_id":purchase.purchase_id,"is_deleted":False},db=db.session)            
            installments_count = len(installments)
            pur_installment_update = await purchase_installment_crud.update(db=db.session,id=inst_id,object={"installment_status":INSTALLMENT_STATUS.created,"transaction_id":tx_in.id})
            purchase_update = await purchase_crud.update(db=db.session,id=purchase.purchase_id,object={"purchase_status":INSTALLMENT_STATUS.created,"intallments_count":installments_count})

    
    tx_data = LinkTxData(purchase_ids=pur_ids,purchase_installment_ids=paymentlink_in.purchase_installment_ids, **pg_pay_resp )
    
    tx_update = await transaction_crud.update(db=db.session,id=tx_in.id,object={"tx_data":tx_data.model_dump(exclude_unset=True)})
    return ResponseSchema(data=pg_pay_resp,success=True)

@purchase_router.get("/purchases/paymentlink/{tx_id}/status",response_model=ResponseSchema[PurchaseTransactionResponse])
async def purchase_link_status(tx_id:str,legalentity_name:str,request: Request,tenant_id:int,paymentlink_id:str,user:User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce,USER_TYPE.student],roles=[USER_ROLE.admission_manager, USER_ROLE.student_administrator,USER_ROLE.fee_collection_incharge],apps=[APP.front_desk_app,APP.student_app]))):
    tenant = await legalentity_crud.get(db=db.session, id=tenant_id)
    legal_entity = next(
        (entity for entity in tenant.legal_entities if entity.get('name') == legalentity_name), 
        None
    )  
    key_id = legal_entity["razorpay_key_id"]
    key_secret = legal_entity["razorpay_key_secret"]

    tx_db = await transaction_crud.get_by_field(value=tx_id,field="tx_id",db=db.session)
    # if tx_db.pg_ref_id:
    #     return ResponseSchema(data = tx_db, success=True)  
    link_status = await razorpg.payment_link_status(paymentlink_id=paymentlink_id,key_id = key_id ,key_secret = key_secret)
    link_status_data = link_status.json()
    if link_status.status_code != 200:
        return ResponseSchema(data = link_status.json())
    # tx_db = await transaction_crud.get_by_field(value=tx_id,field="tx_id",db=db.session)
    if isinstance(link_status_data.get("payments"), list) and link_status_data["payments"]:
        pg_status = await razorpg.paymentlink_payment_status(payment_id=link_status_data["payments"][0]["payment_id"],key_id = key_id ,key_secret = key_secret )
        if pg_status.status_code != 200:
            return ResponseSchema(data = pg_status.json())
        pg_payment_status = pg_status.json()
        
        if not tx_db:
            return ResponseSchema(msg="No transaction available with the provided tx_id")
        if not tx_db.tx_data["id"]:
            return ResponseSchema(msg="No transaction available with the provided paymentlink id")
        # link_status = await razorpg.payment_link_status(paymentlink_id=tx_db.tx_data["id"],key_id = key_id ,key_secret = key_secret)
        # if link_status.status_code != 200:
        #     return ResponseSchema(data = link_status.json())
        installments = await purchase_installment_crud.get_by_filters_multi(ids=[tx_db.id],attr="transaction_id",db=db.session)
        purchases = await purchase_crud.get_by_filters_multi(ids=[tx_db.id],attr="transaction_id",db=db.session)
        purchase_ids = tx_db.tx_data["purchase_ids"]
        purchase_installment_ids = tx_db.tx_data["purchase_installment_ids"]
        tx_data = LinkTxData(purchase_ids=purchase_ids,purchase_installment_ids=purchase_installment_ids, **link_status.json() )
        
        #pg_status = await razorpg.paymentlink_payment_status(payment_id=link_update.razorpay_payment_id)
        if pg_payment_status["status"] == "captured":
            tx_update = PurchaseTransactionUpdate(
                amount = pg_payment_status["amount"],
                pg_data = RazorpayPayment(**pg_payment_status),
                tx_data = tx_data,
                tx_status=TX_STATUS.completed,
                tx_at=pg_payment_status["captured_at"],
                pg_ref_id= pg_payment_status["id"]
                )
            
            tx_update_db = await transaction_crud.update(db=db.session,object=tx_update,id=tx_db.id)  
            log_check = await eventlog_crud.get_logs_by_filters(tx_id=tx_db.id,event_type=EVENT_TYPE.ONLINE_PAYMENT_SUCCESS,db_session=db.session)
            if not log_check:
                #log event
                await log_event(db=db.session,request=request,event_type=EVENT_TYPE.ONLINE_PAYMENT_SUCCESS,event_by_user_id=user.id,user_name=user.full_name,user_phone=user.phone_number,event_details={"tx_id":tx_db.id,"paid_by":tx_db.paid_by,"purchase_ids":purchase_ids,"installment_ids":purchase_installment_ids})
        
            
            if purchases:
                for purchase in purchases:
                    # admission_db = await admission_crud.create(db=db.session,object=AdmissionCreate(user_id=purchase.paid_by,status=TX_STATUS.created))
                    purchase_update = await purchase_crud.update(db=db.session,id=purchase.id,object={"purchase_status":INSTALLMENT_STATUS.completed})
            if installments:
                for installment in installments :
                    installments_update = await purchase_installment_crud.update(db=db.session,id=installment.id,object={"installment_status":INSTALLMENT_STATUS.completed})   
                    purchase_update = await purchase_crud.update(db=db.session,id=installment.purchase_id,object={"purchase_status":INSTALLMENT_STATUS.completed})       
        elif pg_payment_status["status"] == "failed":
            tx_update = PurchaseTransactionUpdate(
                    amount = pg_payment_status["amount"],
                    pg_data = RazorpayPayment(**pg_payment_status),
                    tx_status=TX_STATUS.failed,
                    tx_at=pg_payment_status["created_at"],
                    tx_data = tx_data,
                    pg_ref_id= pg_payment_status["id"]
                    )
            tx_update_db = await transaction_crud.update(db=db.session,object=tx_update,id=tx_db.id)  
            log_check = await eventlog_crud.get_logs_by_filters(tx_id=tx_db.id,event_type=EVENT_TYPE.ONLINE_PAYMENT_FAILURE,db_session=db.session)
            if not log_check:
                #log event
                await log_event(db=db.session,request=request,event_type=EVENT_TYPE.ONLINE_PAYMENT_FAILURE,event_by_user_id=user.id,user_name=user.full_name,user_phone=user.phone_number,event_details={"tx_id":tx_db.id,"paid_by":tx_db.paid_by,"purchase_ids":purchase_ids,"installment_ids":purchase_installment_ids})
        
        
            if purchases:
                for purchase in purchases:
                    purchase_update = await purchase_crud.update(db=db.session,id=purchase.id,object={"purchase_status":INSTALLMENT_STATUS.created})
            if installments:
                for installment in installments :
                    installments_update = await purchase_installment_crud.update(db=db.session,id=installment.id,object={"installment_status":INSTALLMENT_STATUS.created})
                    purchase_update = await purchase_crud.update(db=db.session,id=installment.purchase_id,object={"purchase_status":INSTALLMENT_STATUS.created})

        tx_update_db = await transaction_crud.get(db=db.session,id=tx_db.id) 
       
    else:
        purchase_ids=tx_db.tx_data.get("purchase_ids")
        purchase_installment_ids=tx_db.tx_data.get("purchase_installment_ids")
        tx_data = LinkTxData(purchase_ids=purchase_ids,purchase_installment_ids=purchase_installment_ids, **link_status.json() )  
       
        tx_update = PurchaseTransactionUpdate(
            tx_data = tx_data,
            tx_status=TX_STATUS.pending
            )
        
        tx_update = await transaction_crud.update(db=db.session,object=tx_update,id=tx_db.id) 
        tx_update_db = await transaction_crud.get(db=db.session,id=tx_db.id) 

    return ResponseSchema(data = tx_update_db, success=True)        
        

# @purchase_router.put("/transactions/{tx_id}",response_model=ResponseSchema[PurchaseTransactionResponse]) # update the status 
# async def update_transaction(*,tx_id:str,link_update:Paymentlinkupdate):
#     tx_db = await transaction_crud.get_by_field(value=tx_id,field="tx_id",db=db.session)
#     if tx_db.tx_id != link_update.razorpay_payment_link_reference_id:
#         return ResponseSchema(msg="Payment link referenced id not matching")
#     tx_update = await transaction_crud.update(db=db.session,object={"pg_ref_id":link_update.razorpay_payment_id},id=tx_db.id)
#     tx_update_db = await transaction_crud.get(db=db.session,id=tx_db.id) 

#     return ResponseSchema(data = tx_update_db, success=True)  
    
@purchase_router.put("/purchases/{id}",response_model=ResponseSchema[PurchaseReponse])
async def update_purchase(*,id:int,request:Request, purchase_update:PurchaseUpdate, user:User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce,USER_TYPE.student],roles=[USER_ROLE.org_admin, USER_ROLE.branch_admin,USER_ROLE.admission_manager,USER_ROLE.student_administrator],apps=[APP.front_desk_app,APP.student_app]))):
    purchase_update_db = await purchase_crud.update(db=db.session,id=id,object=purchase_update)
    purchase_db = await purchase_crud.get(id=id,db=db.session)
    if purchase_update.product_id or purchase_update.price_id or purchase_update.total_amount:
        await log_event(db=db.session,request=request,event_type=EVENT_TYPE.AMOUNT_UPDATE,event_by_user_id=user.id,user_name=user.full_name,user_phone=user.phone_number,event_details=json.dumps(jsonable_encoder({**purchase_update.model_dump(exclude_unset=True), "purchase_id": id})))
    # if purchase_update.purchase_details:
    #     await log_event(db=db.session,request=request,event_type=EVENT_TYPE.ENROLLMENT_UPDATE,event_by_user_id=user.id,user_name=user.full_name,user_phone=user.phone_number,event_details=json.dumps(jsonable_encoder({**purchase_update.model_dump(exclude_unset=True), "purchase_id": id})))
    return ResponseSchema(data=purchase_db,success=True)

@purchase_router.get("/purchases/{tx_id}/status",response_model=ResponseSchema[PurchaseTransactionResponse])
async def payment_status(*,tx_id:str,user:User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce,USER_TYPE.student],roles=[USER_ROLE.admission_manager, USER_ROLE.student_administrator, USER_ROLE.fee_collection_incharge],apps=[APP.front_desk_app,APP.student_app]))):
    pg_payment_status = await pg.check_payapi_status(merchant_tx_id=tx_id)
    tx_db = await transaction_crud.get_by_field(value=tx_id,field="tx_id",db=db.session)
    if not tx_db:
        return ResponseSchema(msg="No transaction available with the provided tx_id")
    installments = await purchase_installment_crud.get_by_filters_multi(ids=[tx_db.id],attr="transaction_id",db=db.session)
    purchases = await purchase_crud.get_by_filters_multi(ids=[tx_db.id],attr="transaction_id",db=db.session)
    if pg_payment_status["responseCode"] == "SUCCESS" or pg_payment_status["state"] == TX_STATUS.completed: 
            
            tx_update = PurchaseTransactionUpdate(
            amount = pg_payment_status["amount"],
            pg_data = PayPgData(**pg_payment_status),
            tx_status=pg_payment_status["state"],
            tx_at=datetime.now(),
            pg_ref_id= pg_payment_status["transactionId"]
            )
           
            tx_update_db = await transaction_crud.update(db=db.session,object=tx_update,id=tx_db.id)          
            
            if purchases:
                for purchase in purchases:
                    # admission_db = await admission_crud.create(db=db.session,object=AdmissionCreate(user_id=purchase.paid_by,status=TX_STATUS.created))
                    purchase_update = await purchase_crud.update(db=db.session,id=purchase.id,object={"purchase_status":INSTALLMENT_STATUS.completed})
            if installments:
                for installment in installments :
                    installments_update = await purchase_installment_crud.update(db=db.session,id=installment.id,object={"installment_status":INSTALLMENT_STATUS.completed})   
                    purchase_update = await purchase_crud.update(db=db.session,id=installment.purchase_id,object={"purchase_status":INSTALLMENT_STATUS.completed})       
    elif pg_payment_status["state"] == TX_STATUS.failed:
            tx_update = PurchaseTransactionUpdate(
                amount = pg_payment_status["amount"],
                pg_data = PayPgData(**pg_payment_status),
                tx_status=pg_payment_status["state"],
                tx_at=datetime.now(),
                pg_ref_id= pg_payment_status["transactionId"]
                )
            tx_update_db = await transaction_crud.update(db=db.session,object=tx_update,id=tx_db.id)  
       
            if purchases:
                for purchase in purchases:
                    purchase_update = await purchase_crud.update(db=db.session,id=purchase.id,object={"purchase_status":INSTALLMENT_STATUS.created})
            if installments:
                for installment in installments :
                    installments_update = await purchase_installment_crud.update(db=db.session,id=installment.id,object={"installment_status":INSTALLMENT_STATUS.created})
                    purchase_update = await purchase_crud.update(db=db.session,id=installment.purchase_id,object={"purchase_status":INSTALLMENT_STATUS.created})
    
    tx_update_db = await transaction_crud.get(db=db.session,id=tx_db.id) 

    return ResponseSchema(data = tx_update_db, success=True) 

@purchase_router.put("/purchase/{purchase_id}/cancel")
async def cancel_purchase_refund(*,purchase_id:int,payment_in:PaymentCancelSchema,user:User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce],roles=[USER_ROLE.admission_manager, USER_ROLE.student_administrator],apps=[APP.front_desk_app]))):
    pur_db = await purchase_crud.get_by_field(value=purchase_id,field="id",db=db.session)
    if pur_db.purchase_status  != TX_STATUS.completed:
        return ResponseSchema(success=False,msg="Purchase not completed")
    tx_data = PayTxData(**payment_in.tx_data.model_dump(exclude_unset=True),purchase_ids=[purchase_id],purchase_installment_ids=[])
    tx_in = await transaction_crud.create(object=PurchaseTransactionCreate(paid_by=payment_in.paid_by,
                                                                           paid_to=payment_in.paid_to,
                                                            # tx_id = generate_random_alphanum(length=20),
                                                            amount= - payment_in.amount,
                                                            payment_mode=payment_in.payment_mode,
                                                            tx_data= tx_data,
                                                            # tx_at=datetime.now(),
                                                            tx_at = payment_in.tx_at,
                                                            tx_status=TX_STATUS.refunded,
                                                            description=f"refund for purchase {purchase_id}"), db=db.session)
    
    purchase_update = await purchase_crud.update(db=db.session,id=purchase_id,object={"refund_tx_id":tx_in.id,"purchase_status":INSTALLMENT_STATUS.cancelled,"refund_amount":round(payment_in.amount/100)})
    
    # if payment_in.purchase_installment_id: # for next installment payment 
    #     pur_installment_update = await purchase_installment_crud.update(db=db.session,id=payment_in.purchase_installment_id,object={"installment_status":INSTALLMENT_STATUS.refunded,"transaction_id":tx_in.id})
    # else:
    #     for id in payment_in.purchase_ids:
    #         installments = await purchase_installment_crud.get_by_filters_multi(filters={"purchase_id":id},attr="transaction_id",ids=[tx_id],db=db.session)
    #         if installments:
    #             for installment in installments:
    #                 pur_installment_update = await purchase_installment_crud.update(db=db.session,id=installment.id,object={"installment_status":INSTALLMENT_STATUS.refunded,"transaction_id":tx_in.id})
    #             purchase_update = await purchase_crud.update(db=db.session,id=id,object={"purchase_status":INSTALLMENT_STATUS.refunded})
    #         else:        
    #             purchase_update = await purchase_crud.update(db=db.session,id=id,object={"transaction_id":tx_in.id,"purchase_status":INSTALLMENT_STATUS.refunded})
            
    return { "msg": "Action completed","success": True,"data": tx_in }

# @purchase_router.put("/transactions/{id}", response_model=ResponseSchema[PurchaseTransactionResponse])
# async def update_transaction(*,id:int, tx_update:PurchaseTransactionUpdate, user:User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce],roles=[USER_ROLE.admission_manager],apps=[APP.front_desk_app]))):
#     tx_update_db = await transaction_crud.update(db=db.session,id=id,object=tx_update)
#     tx_db = await transaction_crud.get(id=id,db=db.session)
#     return ResponseSchema(data=tx_db,success=True)

@purchase_router.put("/transactions/{id}/update", response_model=ResponseSchema[PurchaseTransactionResponse])
async def update_cheque_transaction(*,id:int, tx_in: TxUpdateSchema,request:Request, user:User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce],roles=[USER_ROLE.admission_manager,USER_ROLE.student_administrator],apps=[APP.front_desk_app]))):
    tx_db = await transaction_crud.get(id=id,db=db.session)
    if tx_db.tx_status != TX_STATUS.provisionally_paid:
        return ResponseSchema(msg=f"Tx in {tx_db.tx_status} status. It should be provisionally paid")
    tx_update = await transaction_crud.update(id= id, object={"tx_status":tx_in.status,"description":tx_in.reason}, db=db.session)
    await log_event(db=db.session,request=request,event_type=EVENT_TYPE.OFFLINE_PAYMENT_SUCCESS if tx_in.status == TX_STATUS.completed else EVENT_TYPE.OFFLINE_PAYMENT_FAILURE ,event_by_user_id=user.id,user_name=user.full_name,user_phone=user.phone_number,event_details={"tx_id":tx_db.id,"paid_by":tx_db.paid_by,"purchase_ids":tx_db.tx_data.purchase_ids,"installment_ids":tx_db.tx_data.purchase_installment_ids})

    installments = await purchase_installment_crud.get_by_filters_multi(ids=[tx_db.id],attr="transaction_id",db=db.session)
    purchases = await purchase_crud.get_by_filters_multi(ids=[tx_db.id],attr="transaction_id",db=db.session)
    if purchases:
                for purchase in purchases:
                    # admission_db = await admission_crud.create(db=db.session,object=AdmissionCreate(user_id=purchase.paid_by,status=TX_STATUS.created))
                    purchase_update = await purchase_crud.update(db=db.session,id=purchase.id,object={"purchase_status":TX_STATUS.created if tx_in.status == TX_STATUS.failed else TX_STATUS.completed})
    if installments:
        for installment in installments :
            installments_update = await purchase_installment_crud.update(db=db.session,id=installment.id,object={"installment_status":TX_STATUS.created if tx_in.status == TX_STATUS.failed else TX_STATUS.completed})
            purchase_update = await purchase_crud.update(db=db.session,id=installment.purchase_id,object={"purchase_status":TX_STATUS.created if tx_in.status == TX_STATUS.failed else TX_STATUS.completed})
    transaction_db = await transaction_crud.get(id=id,db=db.session)
    return ResponseSchema(data=transaction_db,success=True)

@purchase_router.get("/transactions/{id}", response_model=ResponseSchema[PurchaseTransactionResponse])
async def get_transaction(*,id:int, user:User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce,USER_TYPE.student],roles=[USER_ROLE.admission_manager,USER_ROLE.front_desk_executive,USER_ROLE.admission_counsellor,USER_ROLE.student_administrator],apps=[APP.front_desk_app,APP.student_app]))):
    transaction_db = await transaction_crud.get(id=id,db=db.session)
    return ResponseSchema(data=transaction_db,success=True)

@purchase_router.get("/transactions/user/{user_id}", response_model=ResponseListSchema[PurchaseTransactionResponse])
async def get_user_transactions(*, user_id: int | None = None, user:User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce,USER_TYPE.student],roles=[USER_ROLE.admission_manager,USER_ROLE.front_desk_executive,
                                                                                                                                             USER_ROLE.admission_counsellor,USER_ROLE.student_administrator,
                                                                                                                                             USER_ROLE.mentor,USER_ROLE.teacher,USER_ROLE.evaluation_evaluator,
                                                                                                                                             USER_ROLE.evaluation_coordinator,USER_ROLE.evaluation_reviewer],apps=[APP.front_desk_app,APP.teaching_app,APP.student_app]))):
    txs = await transaction_crud.get_by_filters_multi_by_or(filters={"paid_by":user_id,"paid_to":user_id},db=db.session)
    return ResponseSchema(data=txs, success=True)

@purchase_router.get("/transactions/purchase/{purchase_id}")
async def get_purchase_transactions(*, purchase_id: int | None = None, user:User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce],roles=[USER_ROLE.admission_manager,USER_ROLE.front_desk_executive,USER_ROLE.admission_counsellor,USER_ROLE.student_administrator],apps=[APP.front_desk_app]))):
    txs = await user_service.get_all_txs_by_purchase(purchase_id=purchase_id,db_session=db.session)
    purchase = await purchase_crud.get_by_field(field="id",value=purchase_id,db=db.session)
    # purchase_installments = await purchase_installment_crud.get_by_filters_multi(filters={"purchase_id":purchase_id},db=db.session)
    result = [{"purchase": purchase ,"transactions":txs}]
    return {"data":result}
    
    if not txs:
        return []
    result = [
       {
            "purchase": purchase ,
            "installments": purchase_installments,
            "transactions": txs
        }
       
    ]

    return ResponseSchema(data=result, success=True)

@purchase_router.post("/reports/transactions/date")
async def get_tx_by_date_filter(*,report_filters:TxReport,user:User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce],roles=[USER_ROLE.admission_manager,USER_ROLE.student_administrator],apps=[APP.front_desk_app]))):
    tsx = await user_service.txs_by_date_window(start_date=report_filters.start_date,end_date=report_filters.end_date,branch_ids=report_filters.branch_ids,is_online_branch= report_filters.is_online_branch,include_incomplete_txs = report_filters.include_incomplete_txs,plan_name = report_filters.plan_name,limit=report_filters.limit,offset=report_filters.offset,db_session=db.session)
    results = [{**item._asdict()} for item in tsx]
    # for r in results:
    #     print("tx.id", r["Transaction"]["id"])
    # print("results>>>>>>>>", len(results))
    return results

@purchase_router.post("/reports/purchases/pending")
async def get_pending_purchases(*, report_filters:PurchaseReport,user:User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce],roles=[USER_ROLE.admission_manager,USER_ROLE.student_administrator],apps=[APP.front_desk_app]))):
    txs = await user_service.pending_purchases(branch_ids=report_filters.branch_ids,limit=report_filters.limit,offset=report_filters.offset,db_session=db.session)
    results = [{**item._asdict()} for item in txs]
    return results
    
@purchase_router.post("/report/installments/upcoming")
async def get_pending_installments(*,report_filters:PurchaseReport,user:User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce],roles=[USER_ROLE.admission_manager,USER_ROLE.student_administrator],apps=[APP.front_desk_app]))):
    txs = await user_service.pending_installments_by_date(upto_date=report_filters.upto_date, branch_ids=report_filters.branch_ids,limit=report_filters.limit,offset=report_filters.offset,db_session=db.session)
    results = [{**item._asdict()} for item in txs]
    return results

@purchase_router.get("/transactions", response_model=ResponseListSchema[PurchaseTransactionResponse]) #here
async def get_transactions(*, filters: Any | None = None, user:User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce],roles=[USER_ROLE.admission_manager,USER_ROLE.front_desk_executive,USER_ROLE.admission_counsellor,USER_ROLE.student_administrator],apps=[APP.front_desk_app]))):
    if filters:
            filter_data = json.loads(filters)
    else:
            filter_data = {} 
    transactions_db = await transaction_crud.get_by_filters_multi(filters=filter_data,db=db.session)
    return ResponseListSchema(data=transactions_db,success=True)

@purchase_router.post("/receipt/payment")
async def get_payment_receipt(*,id:int, user:User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce,USER_TYPE.student]))):
    tx = await transaction_crud.get(id=id,db=db.session)
    if tx.tx_status not in [TX_STATUS.provisionally_paid, TX_STATUS.completed, TX_STATUS.refunded]:
        return ResponseSchema(msg= f"Transaction is in {tx.tx_status} status")
    user = await user_service.get(id=tx.paid_by, db_session=db.session)
    user_paid_to = None
    if tx.paid_to:
        user_paid_to = await user_service.get(id=tx.paid_to, db_session=db.session)
    purchases = []
    pur_ids = []
    purchase_installments = await purchase_installment_crud.get_by_filters_multi(filters={"transaction_id":tx.id},db=db.session)  
    if purchase_installments:
        legalentity_name = (
                purchase_installments[0].legal_entity_details["name"]
                if purchase_installments and purchase_installments[0].legal_entity_details and purchase_installments[0].legal_entity_details["name"]
                else None
            )
        for purinst in purchase_installments:
            purchase = await purchase_crud.get_by_field(value= purinst.purchase_id , field="id",db=db.session)
            pur_ids.append(purchase.id)
            purchases.append(purchase)

    purchs = await purchase_crud.get_by_filters_multi_by_or(filters={"transaction_id":tx.id,"refund_tx_id":tx.id},db=db.session)    
    if purchs:
        legalentity_name = (
                purchs[0].legal_entity_details["name"]
                if purchs and purchs[0].legal_entity_details and purchs[0].legal_entity_details["name"]
                else None
            )
        for purchase in purchs:
            pur_ids.append(purchase.id)
            purchases.append(purchase)
        purchases.extend(purchs)

    # if purchase_installments:
    #     legalentity_name = (
    #             purchase_installments[0].legal_entity_details["name"]
    #             if purchase_installments and purchase_installments[0].legal_entity_details and purchase_installments[0].legal_entity_details["name"]
    #             else None
    #         )
    #     purchase = await purchase_crud.get_by_field(value= purchase_installments[0].purchase_id , field="id",db=db.session)
    #     admission_id = purchase.admission_id
    #     purchases = await purchase_crud.get_by_filters_multi(filters={"admission_id":admission_id},db=db.session)  
    # else: # for only single who purchase
    #     purchases = await purchase_crud.get_by_filters_multi_by_or(filters={"transaction_id":tx.id,"refund_tx_id":tx.id},db=db.session)    
    #     legalentity_name = (
    #             purchases[0].legal_entity_details["name"]
    #             if purchases and purchases[0].legal_entity_details and purchases[0].legal_entity_details["name"]
    #             else None
    #         )

    # pur = await user_service.get_purchases_with_offering_name(admission_id=purchases[0].admission_id,db_session=db.session)
    pur = await user_service.get_purchases_with_offering_name(pur_ids = pur_ids,db_session=db.session)

    
    total_purchase_amt = sum(purchase.amount for purchase in purchases)

    net_amt = sum(
    next((installment.installment_amount for installment in purchase.purchase_installments if installment.transaction_id), purchase.total_amount)
    for purchase in purchases
    )

    disc_amt1 = sum(
    purchase.discount_amount 
    for purchase in purchases
    )
    disc_amt2 = sum(
    purchase.additional_disc_amt 
    for purchase in purchases
    )
    
    def format_date(date_str):
            if isinstance(date_str, str):  
                date_str = datetime.fromisoformat(date_str)
            ist_timezone = pytz.timezone('Asia/Kolkata')
            ist_datetime = date_str.astimezone(ist_timezone)
            formatted_date = ist_datetime.strftime("%d %b %Y").upper()
            # formatted_time = ist_datetime.strftime("%I:%M %p")
            return formatted_date
    def format_date_with_time(date_input):
        if isinstance(date_input, str):  
            date_input = datetime.fromisoformat(date_input)
        ist_timezone = pytz.timezone('Asia/Kolkata')
        ist_datetime = date_input.astimezone(ist_timezone)
        # Format: "Apr 25, 2025 at 11:45 AM IST"
        return ist_datetime.strftime("%d %b %Y , %I:%M %p IST")
    file_loader = FileSystemLoader('src/templates/payment_templates')
    env = Environment(loader=file_loader)
    template = env.get_template('payment_receipt_v2.html')
    data = {"laex_icon":"src/assets/laex.svg","receipt_id":tx.id,"date": format_date(date_str=tx.tx_at),"tx":tx, "tx_created": format_date_with_time(date_input=tx.created_at),
                "username":user.full_name,"ph_no":user.phone_number,"email":user.email,"payment":tx,"purchases":pur,
                  "legalentity_name":legalentity_name,"paid_to_user":user_paid_to or "",
                "total_purchase_amt":total_purchase_amt,"discount_amt":disc_amt1 + disc_amt2,"net_amt":net_amt, 
                "pur_installments_info": purchase_installments, "indian_format": indian_format,"format_date":format_date}

    output = template.render(data)
    pdf_fileobj = HTML(string=output, base_url='.').write_pdf()

    pdf_encoded = base64.b64encode(pdf_fileobj).decode("utf-8")

    return {"receipt_name":"Payment Receipt","data": pdf_encoded}

@product_router.post("/recommendations")
async def get_product_recommendations(*,product_ids:list[int], user_id:int):
    # get products based on opposite part of offering_type with filter on same exam, stage, paper of the product_ids provided above
    get_offering_types = await user_service.get_offering_types_by_prod_ids(prod_ids=product_ids,db_session=db.session)
    foundation_purchases = await user_service.get_purchases_with_prod_filter(user_id=user_id,category="FOUNDATION_COURSES",db_session=db.session)
    value_addn_purchases = await user_service.get_purchases_with_prod_filter(user_id=user_id,category="VALUE_ADDITION_COURSES",db_session=db.session)
        
    results = [{**item._asdict()} for item in get_offering_types]

    exam_ids = list(set([int(result["exam_ids"]) for result in results if result["exam_ids"] is not None]))
    stage_ids = list(set([int(result["stage_ids"]) for result in results if result["stage_ids"] is not None]))
    paper_ids = list(set([int(result["paper_ids"]) for result in results if result["paper_ids"] is not None]))

    # Collect offering categories without filtering for None
    off_types = list(set([result["offering_category"] for result in results]))

    recomm_prod_ids = set()
   
    # return await  user_service.get_product_ids_by_filter(offering_category = OFFERING_CATEGORY.value_addition_courses,
     #                                                                       exam_ids= exam_ids,stage_ids = stage_ids,paper_ids = paper_ids, db_session = db.session)
    if OFFERING_CATEGORY.foundation_courses in off_types or OFFERING_CATEGORY.value_addition_courses in off_types:
            recomm_prod_ids1 = await  user_service.get_product_ids_by_filter(offering_category = OFFERING_CATEGORY.value_addition_courses,
                                                                             exam_ids= exam_ids,stage_ids = stage_ids,paper_ids = paper_ids, db_session = db.session)
            recomm_prod_ids.update(recomm_prod_ids1)

    if foundation_purchases or value_addn_purchases :
        recomm_prod_ids2 = await  user_service.get_product_ids_by_filter(offering_category = OFFERING_CATEGORY.value_addition_courses, exam_ids= exam_ids,db_session = db.session)
        recomm_prod_ids.update(recomm_prod_ids2)
    return recomm_prod_ids

@purchase_router.post("/receipt/invoices")
async def get_invoice_receipt(*,data_in:InvoiceSchema):
    tx_data = []
    def format_date(date_str):
        if isinstance(date_str, str):
            date_str = datetime.fromisoformat(date_str)
        if isinstance(date_str, datetime):
            ist_timezone = pytz.timezone('Asia/Kolkata')
            ist_datetime = date_str.astimezone(ist_timezone)
            return ist_datetime.strftime("%d-%b-%Y").upper()
        return None  # fallback if input is invalid
    
    for tx_id in data_in.tx_ids:
            details_list = []
            pur_ids = []
            admission_ids = []
            admission_id = None
            student_id = None
            addrs = {}
            gst_rate = None
            gst_no = None
            breakup_name = None
            total_base_amt = 0
            total_gst_amt  = 0
            total_price_amt = 0
            tx = await transaction_crud.get(id=tx_id,db=db.session)
            purchase_installments = await purchase_installment_crud.get_by_filters_multi(filters={"transaction_id":tx.id},db=db.session)  # check for installments paid with the tx
            if purchase_installments:                
                # legal_entity = purchase_installments[0].legal_entity_details
                # gst_rate = legal_entity.get("GST_rate") if legal_entity else None
                # gst_no = legal_entity.get("GSTIN") if legal_entity else None
                # breakup_name = legal_entity.get("breakup_name") if legal_entity else None
                purchase = await purchase_crud.get_by_field(value= purchase_installments[0].purchase_id , field="id",db=db.session)
                student_id = purchase.student_id
                admission_id = purchase.admission_id
                user = await user_service.get(id=student_id,db_session=db.session)
                # admission = await admission_crud.get_by_field(value=purchase.admission_id,field="id",db=db.session)
                walkin = await walkin_crud.get_by_field(value=admission_id,field="admission_id", db=db.session)
                addrs = walkin.address_details if walkin else None
                for pur in purchase_installments:
                    purchase = await purchase_crud.get_by_field(value= pur.purchase_id , field="id",db=db.session)
                    pur_ids.append(pur.purchase_id)
                    admission_ids.append(purchase.admission_id)
                    installments = await purchase_installment_crud.get_by_filters_multi(filters={"purchase_id":pur.purchase_id,"is_deleted": False},order_by="installment_date",db=db.session)
                    for idx, ins in enumerate(installments, start=1):
                        if ins.id == pur.id:
                            pur_installment_number = idx
                            break
                    print("purc_>>",pur_installment_number)
                    
                    legal_entity = pur.legal_entity_details
                    legalentity_name = legal_entity.get("name") if legal_entity else None
                    gst_rate = legal_entity.get("GST_rate") if legal_entity else None
                    gst_no = legal_entity.get("GSTIN") if legal_entity else None
                    breakup_name = legal_entity.get("breakup_name") if legal_entity else None
                    inst_amt = pur.installment_amount
                    base_amt =  pur.installment_amount - (((gst_rate if gst_rate else 0)/100)*(pur.installment_amount))
                    total_base_amt = total_base_amt + base_amt
                    total_gst_amt  = total_gst_amt + ( inst_amt - base_amt )
                    total_price_amt = total_price_amt + inst_amt
                    purchase = await purchase_crud.get_by_field(value= pur.purchase_id , field="id",db=db.session)
                    product = await product_crud.get_by_field(value=purchase.product_id, field="id",db=db.session)
                    data = {
                        "offering_name": product.offering.name,
                        "off_type": product.offering.offering_type,
                        "pro_name": product.name,
                        "pro_code": product.code,
                        "start": (
                                            format_date(product.batch.actual_start_date)
                                            if product.batch and product.batch.actual_start_date
                                            else format_date(product.batch.planned_start_date)
                                            if product.batch and product.batch.planned_start_date
                                            else None
                                        ),
                        "end": (
                                        format_date(product.batch.actual_end_date)
                                        if product.batch and product.batch.actual_end_date
                                        else format_date(product.batch.planned_end_date)
                                        if product.batch and product.batch.planned_end_date
                                        else None
                                    ),

                        "duration": product.batch.duration if product.batch else None,
                        "branch": product.branch.name if product.branch else None,

                    }
                    data2 = {
                        "base_amt": base_amt,
                        "tot_amt": inst_amt,
                        "gst_amt": inst_amt - base_amt if gst_rate else None,
                        "offering_name": product.offering.name,
                        "inst_number": pur_installment_number,
                        "breakup_name": breakup_name,
                        "gst_rate": gst_rate,
                        "gst_no": gst_no,
                        "legalentity_name":legalentity_name
                    }
                    details_list.append({
                        "offering_data": data,
                        "amount_data": data2
                    })
            else:
                purchases = await purchase_crud.get_by_filters_multi(filters={"transaction_id":tx.id},db=db.session)
                purchase = await purchase_crud.get_by_field(value= purchases[0].id , field="id",db=db.session)
                admission_id = purchase.admission_id
                student_id = purchase.student_id
                user = await user_service.get(id=student_id,db_session=db.session)
                # admission = await admission_crud.get_by_field(value=purchase.admission_id,field="id",db=db.session)
                walkin = await walkin_crud.get_by_field(value=admission_id,field="admission_id", db=db.session)
                addrs = walkin.address_details if walkin else None
                # legal_entity = purchases[0].legal_entity_details
                # if legal_entity:
                #     gst_rate = legal_entity.get("GST_rate")
                #     gst_no = legal_entity.get("GSTIN")
                #     breakup_name = legal_entity.get("breakup_name") if legal_entity else None
                for purchase in purchases:
                    pur_ids.append(purchase.id)
                    admission_ids.append(purchase.admission_id)
                    product = await product_crud.get_by_field(value=purchase.product_id, field="id",db=db.session)
                    
                    legal_entity = purchase.legal_entity_details
                    legalentity_name = legal_entity.get("name") if legal_entity else None
                    gst_rate = legal_entity.get("GST_rate") if legal_entity else None
                    gst_no = legal_entity.get("GSTIN") if legal_entity else None
                    breakup_name = legal_entity.get("breakup_name") if legal_entity else None
                    pur_amt = purchase.total_amount
                    base_amt =  purchase.total_amount - ((gst_rate if gst_rate else 0)/100)*(purchase.total_amount) 
                    total_base_amt = total_base_amt + base_amt
                    total_gst_amt  = total_gst_amt + ( pur_amt - base_amt )
                    total_price_amt = total_price_amt + pur_amt
                    data = {
                        "offering_name": product.offering.name,
                        "off_type": product.offering.offering_type,
                        "pro_name": product.name,
                        "pro_code": product.code,
                        # "planned_start": format_date(product.batch.planned_start_date),
                        # "planned_end": format_date(product.batch.planned_end_date),
                        # "actual_start": format_date(product.batch.actual_start_date),
                        # "actual_end": format_date(product.batch.actual_end_date),
                        "start": (
                                format_date(product.batch.actual_start_date)
                                if product.batch and product.batch.actual_start_date
                                else format_date(product.batch.planned_start_date)
                                if product.batch and product.batch.planned_start_date
                                else None
                            ),
                        "end": (
                                format_date(product.batch.actual_end_date)
                                if product.batch and product.batch.actual_end_date
                                else format_date(product.batch.planned_end_date)
                                if product.batch and product.batch.planned_end_date
                                else None
                            ),
                       "duration": product.batch.duration if product.batch else None,
                        "branch": product.branch.name if product.branch else None,

                    }
                    data2 = {
                        "base_amt": base_amt,
                        "tot_amt": pur_amt,
                        "gst_amt": pur_amt - base_amt if gst_rate else None,
                        "offering_name": product.offering.name,
                        "inst_number": 0,
                        "breakup_name": breakup_name,
                        "gst_rate": gst_rate,
                        "gst_no": gst_no,
                        "legalentity_name":legalentity_name
                    }

                    details_list.append({
                        "offering_data": data,
                        "amount_data": data2
                    }) 

            data = {
                "laex_icon": "src/assets/la-excellence-logo.svg",
                "indian_format": indian_format,
                # "purchase": pur_bought,
                "details_list": details_list,
                "invoice_number": tx.id,
                "date": format_date(tx.tx_at),
                "admission_ids": admission_ids,
                "student_id":student_id,
                "name": user.full_name,
                "phone_no": user.phone_number,
                "bill_to": addrs,
                "pur_ids":pur_ids,
                # "walkin": walkin,
               
                "total_base_amt": total_base_amt,
                "total_gst_amt": total_gst_amt if gst_rate else None,
                "total_price_amt": total_price_amt
            }
            print("data>>>>>>>>>", data, tx.tx_at,format_date(tx.tx_at))
            file_loader = FileSystemLoader('src/templates/payment_templates')
            env = Environment(loader=file_loader)
            #data = {"laex_icon":"src/assets/student-id-logo.svg","student_bg": "src/assets/student-id-bg.svg", "student": student[0].User,"offering":offering,"product":product, "profile_pic": student[0].User["photo"],"branch_name":student[0]["branches"]["name"]  }
            template = env.get_template('invoice.html')
            output = template.render(data)
            pdf_fileobj = HTML(string=output, base_url='.').write_pdf()

            pdf_encoded = base64.b64encode(pdf_fileobj).decode("utf-8")
            tx_data.append({"encoded_str":pdf_encoded,"tx_id":tx.id,"tx_date":format_date(tx.tx_at)})
    # return pdf_encoded

    return {"type":"invoice","data": tx_data}



