
import base64
from fastapi import APIRouter, Depends, Request, Response
from jinja2 import Environment, FileSystemLoader
from weasyprint import HTML
from src.auth import utils
from src.auth.models import RefreshToken
from src.auth.schemas import TokenResponse
from src.auth.service import AuthService
from src.base.service import BaseCRUD
from src.constants import APP
import json
from src.modules.eventlogs.deps import get_request, log_event
from src.modules.eventlogs.schemas import *
from src.modules.products.models import Offering, Product
from src.modules.products.schemas import PAYMENT_MODE
from src.tenants.deps import verify_tenant
from src.tenants.models import Tenant
from src.users.deps import CheckV2UserAccess, user_branch_access
from .schemas import *
from .models import *
from .service import (
    TransactionService,
    UserService,
    ProfileService,
    BranchUserService, UserRoleService, RoleService
)
from src.base.schemas import ResponseListSchema, ResponseSchema
from .exceptions import *
from src.auth.security import check_firebase_user_phone, create_access_token, create_fb_user, hash_password, update_firebase_user, verify_id_token
from fastapi_async_sqlalchemy import db
from src.auth.deps import valid_token_user


user_router = APIRouter(prefix="/v2", tags=["Users V2"])

user_service = UserService(User)
profile_service = ProfileService(Profile)
branch_user_service = BranchUserService(BranchUser)
user_role_service = UserRoleService(UserRole)
role_service = RoleService(Role)
auth_service = AuthService(RefreshToken, db)
offering_crud = BaseCRUD(model= Offering)
product_crud = BaseCRUD(model=Product)
tx_service = TransactionService(Transaction)

@user_router.post("/register", response_model=TokenResponse) #walkin self registering
async def register_user(
    *,
    response: Response,
    user_in: UserRegister,
    user_info: dict[str, Any] = Depends(verify_id_token),
    tenant: Tenant = Depends(verify_tenant),
    request: Request
):
    user_in_db = await user_service.get_by_field(value=user_in.phone_number,field="phone_number",db_session=db.session)
    if user_in_db:
        if user_in_db.is_deleted is True:
            raise UserDeleted()
        else:
            raise UserAlreadyExists()
    user_create = UserCreate(**user_in.model_dump(), tenant_id=tenant.id)
    user_db = await user_service.create(obj_in=user_create,db_session=db.session)

    user_update_info = UserUpdate(**user_info, phone_verified=True, user_preferences=UserPreference(with_omr_sheet=None,record_elimination_technique=None,current_affairs_only=False,tutor_mode=False,in_app_answering=None,download_and_upload=None))
    user_db = await user_service.update(obj_current=user_db, obj_new=user_update_info,db_session=db.session)
    #log event
    await log_event(db=db.session,request=request,event_type=EVENT_TYPE.USER_CREATE,event_by_user_id=user_db.id,user_name=user_db.full_name,user_phone=user_db.phone_number,event_details={"created_user":user_db.id})
    refresh_token_value = await auth_service.create_refresh_token(user_id=user_db.id,db_session=db.session)
    response.set_cookie(**utils.get_refresh_token_settings(refresh_token_value))

    return TokenResponse(
        access_token=create_access_token(user=user_db),
        refresh_token=refresh_token_value,
    )

# @user_router.post("/register/password", response_model=TokenResponse) #walkin self registering
# async def register_user(
#     *,
#     response: Response,
#     user_in: UserRegisterPwd,
#     tenant: Tenant = Depends(verify_tenant),
# ):
#     user_in_db = await user_service.get_by_field(value=user_in.phone_number,field="phone_number",db_session=db.session)
#     if user_in_db:
#         if user_in_db.is_deleted is True:
#             raise UserDeleted()
#         else:
#             raise UserAlreadyExists()
#     # user_create = UserCreate(**user_in.model_dump(), tenant_id=tenant.id)
#     # user_db = await user_service.create(obj_in=user_create,db_session=db.session)
#     hash_pwd = hash_password(password=user_in.password)
#     user_db = await user_service.create(obj_in=User(**user_in.model_dump(exclude={"password"},exclude_unset=True),is_onboarded=True, password = hash_pwd),db_session=db.session)

#     user_update_info = UserUpdate( phone_verified=False, user_preferences=UserPreference(with_omr_sheet=None,record_elimination_technique=None,current_affairs_only=False,tutor_mode=False))
#     user_db = await user_service.update(obj_current=user_db, obj_new=user_update_info,db_session=db.session)

#     refresh_token_value = await auth_service.create_refresh_token(user_id=user_db.id,db_session=db.session)
#     response.set_cookie(**utils.get_refresh_token_settings(refresh_token_value))

#     return TokenResponse(
#         access_token=create_access_token(user=user_db),
#         refresh_token=refresh_token_value,
#     )

@user_router.get("/me", response_model=ResponseSchema[UserRoleBranchResponse])
async def get_self(current_user: User = Depends(CheckV2UserAccess(apps=[APP.account_mgnt_app]))):
    user_data = await user_service.get_user_by_role_branch(user_id=current_user.id,db_session=db.session)
    if user_data:
        user, branches = user_data
        if branches:
            valid_branches = [branch for branch in branches if branch["id"] is not None]
            unique_branches_dict = {branch['id']: branch for branch in valid_branches}           
        else:
            unique_branches_dict = { }
        branch_roles = list(unique_branches_dict.values())
        user_response = UserRoleBranchResponse(
            **user.__dict__,  
            branches=branch_roles 
        )
        # return user_response
        return ResponseSchema(data=user_response, success=True)
    else:
        return ResponseSchema(msg="user not found")

@user_router.put("/me", response_model=ResponseSchema[UserResponse])
async def update_self(
    *, current_user: User = Depends(CheckV2UserAccess(apps=[APP.account_mgnt_app])), user: UserV2Update
):
    user_db = await user_service.update(obj_current=current_user, obj_new=user,db_session=db.session)

    return ResponseSchema(data=user_db, success=True)

@user_router.post("/users", response_model=ResponseSchema[UserResponse]) # admin creating
async def create_user(*, user_in: UserCreate, request: Request, user: User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce], roles=[USER_ROLE.org_admin, USER_ROLE.branch_admin],apps=[APP.admin_app]))):   
    # if not user_in.roles or not len(user_in.roles) > 0:
    #         raise UserRolesRequied()
    if not user_in.phone_number:
            raise UserPhoneRequired()
    if not user_in.password:

        user_db = await user_service.create(obj_in=User(**user_in.model_dump(exclude_unset=True),is_onboarded=True),db_session=db.session)
    else:
        hash_pwd = hash_password(password=user_in.password)
        user_db = await user_service.create(obj_in=User(**user_in.model_dump(exclude={"password"},exclude_unset=True),is_onboarded=True, password = hash_pwd),db_session=db.session)
    #log event
    await log_event(db=db.session,request=request,event_type=EVENT_TYPE.USER_CREATE,event_by_user_id=user.id,user_name=user.full_name,user_phone=user.phone_number,event_details={"created_user":user_db.id})
    fb_user = await check_firebase_user_phone(phone_number=user_in.phone_number)
    if not fb_user:
        fb_user = await create_fb_user(
            user_in=UserCreate(
                phone_number=user_db.phone_number,
                full_name=user_db.full_name,
                email=user_db.email,
                is_admin=user_db.is_admin,
                tenant_id=user_db.tenant_id or 0,
            ),
        )
    else:
        fb_user = await update_firebase_user(
            fb_user.uid,
            {
                "email": user_db.email,
                "display_name": user_db.full_name,
            },
        )

    return ResponseSchema(data=user_db, success=True)

@user_router.put("/users/reset/password", response_model=ResponseSchema[UserResponse])
async def update_user_password(*, user_in:UserV2UpdatePwd, user: User = Depends(CheckV2UserAccess(apps=[APP.admin_app]))):
    user_in_db = await user_service.get(id=user_in.user_id,db_session=db.session)
    hash_pwd = hash_password(password=user_in.password)
    updated_user = await user_service.update(obj_current=user_in_db, obj_new={"password":hash_pwd}, db_session=db.session)
    return ResponseSchema(data=updated_user, success=True)

@user_router.post("/users/register", response_model=ResponseSchema[UserResponse]) # on behalf of student
async def register_student(*, user_in: UserV2Register,request: Request, user:User = Depends(valid_token_user)):
    user_db = await user_service.create(obj_in=User(**user_in.model_dump(exclude_unset=True, exclude={"profile_info"}),is_onboarded=True, user_type = USER_TYPE.student),db_session=db.session)
    profile_db = await profile_service.create(obj_in=Profile(**user_in.model_dump(exclude_unset=True, include={"profile_info"}), profile_type = ProfileType.aspirant, user_id = user_db.id),db_session=db.session)
    #log event
    await log_event(db=db.session,request=request,event_type=EVENT_TYPE.USER_CREATE,event_by_user_id=user.id,user_name=user.full_name,user_phone=user.phone_number,event_details={"created_user":user_db.id})
    user_in_db = await user_service.get(id=user_db.id,db_session=db.session)
    return ResponseSchema(data=user_in_db, success=True)

@user_router.post("/users/register/password", response_model=ResponseSchema[UserResponse])
async def register_student_by_password(*, user_in: UserV2RegisterPwd,request: Request, user:User = Depends(valid_token_user)):
    hash_pwd = hash_password(password=user_in.password)
    user_db = await user_service.create(obj_in=User(**user_in.model_dump(exclude_unset=True, exclude={"profile_info","password"}),is_onboarded=True, password = hash_pwd, user_type = USER_TYPE.student),db_session=db.session)
    profile_db = await profile_service.create(obj_in=Profile(**user_in.model_dump(exclude_unset=True, include={"profile_info"}), profile_type = ProfileType.aspirant, user_id = user_db.id),db_session=db.session)
    #log event
    await log_event(db=db.session,request=request,event_type=EVENT_TYPE.USER_CREATE,event_by_user_id=user.id,user_name=user.full_name,user_phone=user.phone_number,event_details={"created_user":user_db.id})
    user_in_db = await user_service.get(id=user_db.id,db_session=db.session)
    return ResponseSchema(data=user_in_db, success=True)

@user_router.post("/users/onboard", response_model=UserResponse)
async def onboard_self(
    *,
    current_user: User = Depends(valid_token_user),
    user: UserV2Onboard,
):
    # user_in_db = await service.get(id=current_user.id)

    # if not user_in_db.email == user.email:
    if user.password:
        hash_pwd = hash_password(password=user.password)
        user_update_obj = UserV2IsOnboard(**user.model_dump(exclude={"password"}), is_onboarded=True, password = hash_pwd)
    else:
        user_update_obj = UserIsOnboard(**user.model_dump(), is_onboarded=True)
    user_db = await user_service.update(obj_current=current_user, obj_new=user_update_obj,db_session=db.session)
    if user.referred_by_phone:
        referred_user = await user_service.get_by_field(value=user.referred_by_phone,field="phone_number",db_session=db.session)
        if referred_user:
            user_db = await user_service.update(
                obj_current=current_user, obj_new={"referred_by_id": referred_user.id},db_session=db.session
            )
        else:
            raise UserWithPhnoNotFound() 
    elif user.referred_by_id:
        user_db = await user_service.update(
                obj_current=current_user, obj_new={"referred_by_id": user.referred_by_id},db_session=db.session
            )

    return user_db

    # else:
    #   raise HTTPException(status_code=409, detail="email already taken")

@user_router.post("/users/{id}/profiles/add", response_model=ResponseSchema[ProfileResponse])
async def add_user_profile(*, id:int, profile: ProfileCreate, user: User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce, USER_TYPE.student], roles=[USER_ROLE.org_admin, USER_ROLE.branch_admin],apps=[APP.admin_app]))):
    user_in_db = await user_service.get(id=id, db_session=db.session)
    if not user.user_type == USER_TYPE.student:
        await user_branch_access(admin= user, user=user_in_db, db_session=db.session)
    profile_in = Profile(**profile.model_dump())
    profile_in.user_id = id

    profile_in_db = await profile_service.get_profile_by_type(
        user_id=profile_in.user_id, profile_type=profile_in.profile_type,db_session=db.session
    )
    if not profile_in_db:
        profile_db = await profile_service.create(obj_in=profile_in,db_session=db.session)
    else:
        raise ProfileAlreadyExists()

    return ResponseSchema(data=profile_db, success=True)

@user_router.put("/users/profiles/{id}", response_model=ResponseSchema[ProfileResponse])
async def update_user_profile(* ,id:int, profile: ProfileUpdate, user: User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce, USER_TYPE.student], roles=[USER_ROLE.org_admin, USER_ROLE.branch_admin, USER_ROLE.admission_counsellor],apps=[APP.admin_app]))):
    
    current_profile = await profile_service.get(id=id,db_session=db.session)
    if not user.user_type == USER_TYPE.student:
        await user_branch_access(admin= user, user=current_profile.user_id, db_session=db.session)
    profile_db = await profile_service.update(
        obj_current=current_profile, obj_new=profile,db_session=db.session
    )
    return ResponseSchema(data=profile_db, success=True)

# @user_router.post("/user/profiles", response_model=ProfileResponse)
# async def add_profile_self(
#     *, current_user: User = Depends(valid_token_user), profile: ProfileCreate
# ):
#     profile_in = Profile(**profile.model_dump())
#     profile_in.user_id = current_user.id

#     profile_in_db = await profile_service.get_profile_by_type(
#         user_id=profile_in.user_id, profile_type=profile_in.profile_type,db_session=db.session
#     )

#     if not profile_in_db:
#         profile_db = await profile_service.create(obj_in=profile_in,db_session=db.session)
#     else:
#         raise ProfileAlreadyExists()

#     return profile_db

# @user_router.put("/user/profiles/{profile_id}", response_model=ProfileResponse)
# async def update_profile_self(
#     *, id: int, current_user: User = Depends(valid_token_user), profile: ProfileUpdate
# ):
#     current_profile = await profile_service.get(id=id,db_session=db.session)
#     profile_db = await profile_service.update(
#         obj_current=current_profile, obj_new=profile,db_session=db.session
#     )

#     return profile_db


@user_router.put("/users/{id}", response_model=ResponseSchema[UserResponse])
async def update_user(
    *,id:int, user_update: UserV2Update, user: User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce],roles=[USER_ROLE.org_admin, USER_ROLE.branch_admin, USER_ROLE.front_desk_executive,USER_ROLE.admission_counsellor,USER_ROLE.admission_manager,USER_ROLE.student_administrator,USER_ROLE.fee_collection_incharge], apps=[APP.admin_app]))):
    user_in_db = await user_service.get(id=id, db_session=db.session)

    await user_branch_access(admin= user, user=user_in_db, db_session=db.session)
      
    user_db = await user_service.update(obj_current=user_in_db, obj_new=user_update,db_session=db.session)

    return ResponseSchema(data=user_db, success=True)

@user_router.put("/users/{id}/status", response_model=ResponseSchema[UserResponse])
async def update_user(
    *,id:int, status: STATUS, user: User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce], roles=[USER_ROLE.org_admin, USER_ROLE.branch_admin],apps=[APP.admin_app]))
):
    user_in_db = await user_service.get(id=id, db_session=db.session)
    await user_branch_access(admin= user, user=user_in_db, db_session=db.session)
    user_db = await user_service.update(obj_current=user_in_db, obj_new={"is_active": True if status is STATUS.active else False },db_session=db.session)

    return ResponseSchema(data=user_db, success=True)


# @user_router.get("/users", response_model=ResponseListSchema[UserResponse])
# async def get_users_by_filters(*,filters:Any | None = None,  user: User = Depends(CheckV2UserAccess(roles=[USER_ROLE.front_desk_executive,USER_ROLE.org_admin,USER_ROLE.admission_manager,USER_ROLE.admission_counsellor],apps=[APP.front_desk_app,APP.admin_app]))):
#     if filters:
#             filter_data = json.loads(filters)
#     else:
#             filter_data = {} 
        
#     walkins = await user_service.get_by_filters_multi(db_session=db.session, filters=filter_data)
#     walkin_count = await user_service.get_count_by_filters(db=db.session, filters=filter_data)
#     return ResponseListSchema(data=walkins, success=True,meta={"count":walkin_count})



@user_router.post("/roles", response_model=ResponseSchema[RoleResponse])
async def add_roles(*, role: RoleCreate, user: User = Depends(CheckV2UserAccess())):
    role_db = await role_service.create(obj_in=role, db_session=db.session)
    return ResponseSchema(data=role_db, success=True)

@user_router.get("/roles", response_model=ResponseListSchema[RoleResponse])
async def get_roles( user: User = Depends(CheckV2UserAccess())):
    role_db = await role_service.get_multi(db_session=db.session)
    return ResponseListSchema(data=role_db, success=True)
    
@user_router.put("/roles/{id}", response_model=ResponseSchema[RoleResponse])
async def update_roles(*,id:int, role: RoleUpdate, user: User = Depends(CheckV2UserAccess())):
    role_in = await role_service.get(id=id,db_session=db.session)
    role_db = await role_service.update(obj_current=role_in, obj_new=role, db_session=db.session)
    return ResponseSchema(data=role_db, success=True)

@user_router.get("/roles/{id}", response_model=ResponseSchema[RoleResponse])
async def get_role(*,id:int, user: User = Depends(CheckV2UserAccess())):
    role_db = await role_service.get(id=id,db_session=db.session)
    return ResponseSchema(data=role_db, success=True)

@user_router.post("/users/{id}/branches/add", response_model=ResponseSchema[BranchUserResponse]) #assign branch
async def add_branch_user(*, id:int,request: Request, branchuser: BranchUserCreate, user: User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce], roles=[USER_ROLE.org_admin, USER_ROLE.branch_admin],apps=[APP.admin_app]))): 
    user_in_db = await user_service.get(id=id, db_session=db.session)
    await user_branch_access(admin= user, user=user_in_db, branch_id=branchuser.branch_id , db_session=db.session)
    user_branch_db = await branch_user_service.create(obj_in=branchuser, db_session=db.session)
    #log event
    await log_event(db=db.session,request=request,event_type=EVENT_TYPE.USER_UPDATE,event_by_user_id=user.id,user_name=user.full_name,user_phone=user.phone_number,event_details={"updated_user_id":id,"updated_data":branchuser.model_dump(exclude_unset=True)})

    return ResponseSchema(data=user_branch_db, success=True)

@user_router.delete("/users/{user_id}/branches/{branch_id}")
async def delete_branch_user(*,user_id:int, branch_id:int, user: User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce], roles=[USER_ROLE.org_admin, USER_ROLE.branch_admin],apps=[APP.admin_app]))):
    user_in_db = await user_service.get(id=user_id, db_session=db.session)
    await user_branch_access(admin= user, user=user_in_db, branch_id=branch_id, db_session=db.session)
    branch_user = await branch_user_service.get_user_branch(user_id=user_id,branch_id=branch_id,db_session=db.session)
    await branch_user_service.delete(id=branch_user.id, db_session=db.session)
    return ResponseSchema(msg="Deleted successfully", success=True)

@user_router.post("/users/{id}/roles/branches/add", response_model=ResponseSchema[UserRoleResponse]) #assign branch
async def add_user_role_branch(*, id:int,request: Request, user_role: UserRoleCreate, user: User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce], roles=[USER_ROLE.org_admin, USER_ROLE.branch_admin],apps=[APP.admin_app]))): 
    user_in_db = await user_service.get(id=id, db_session=db.session)
    await user_branch_access(admin= user, user=user_in_db, branch_id = user_role.branch_id, db_session=db.session)
    user_branch_db = await user_role_service.create(obj_in=user_role, db_session=db.session)
    #log event
    await log_event(db=db.session,request=request,event_type=EVENT_TYPE.USER_UPDATE,event_by_user_id=user.id,user_name=user.full_name,user_phone=user.phone_number,event_details={"updated_user_id":id,"updated_data":user_role.model_dump(exclude_unset=True)})

    return ResponseSchema(data=user_branch_db, success=True)

@user_router.put("/users/{user_id}/roles/branches/add", response_model=ResponseSchema[UserRoleResponse])
async def update_role_branch(*, user_id:int,request: Request, id:int, user_role_update: UserRoleUpdate, user: User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce], roles=[USER_ROLE.org_admin, USER_ROLE.branch_admin],apps=[APP.admin_app]))):
    user_in_db = await user_service.get(id=user_id, db_session=db.session)
    await user_branch_access(admin= user, user=user_in_db, db_session=db.session)
    current_user_role = await user_role_service.get(id=id,db_session=db.session)
    user_db = await user_role_service.update(
        obj_current=current_user_role, obj_new=user_role_update,db_session=db.session
    )
    #log event
    await log_event(db=db.session,request=request,event_type=EVENT_TYPE.USER_UPDATE,event_by_user_id=user.id,user_name=user.full_name,user_phone=user.phone_number,event_details={"updated_user_id":user_id,"updated_data":user_role_update.model_dump(exclude_unset=True)})
    return ResponseSchema(data=user_db, success=True)

@user_router.delete("/users/{user_id}/roles/branches/add", response_model=ResponseSchema[UserRoleResponse])
async def delete_role_branch(*, user_id:int, id:int, user: User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce], roles=[USER_ROLE.org_admin, USER_ROLE.branch_admin],apps=[APP.admin_app]))):
    user_in_db = await user_service.get(id=user_id, db_session=db.session)
    if not user_in_db:
        return ResponseSchema(msg="User not found")
    await user_branch_access(admin= user, user=user_in_db, db_session=db.session)
    user_db = await user_role_service.delete(
        id=id,db_session=db.session
    )
    return ResponseSchema(msg="Deleted successfully", success=True)

@user_router.delete("/users/profiles/{id}")
async def delete_user_profile(*, id:int, user: User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce], roles=[USER_ROLE.org_admin, USER_ROLE.branch_admin],apps=[APP.admin_app]))):
    current_profile = await profile_service.get(id=id,db_session=db.session)
    if not user.user_type == USER_TYPE.student:
        await user_branch_access(admin= user, user=current_profile.user_id, db_session=db.session)
    if current_profile:
        profile_db = await profile_service.delete(
        id=id,db_session=db.session
        )
    return ResponseSchema(msg="Deleted successfully", success=True)    

@user_router.get("/users",response_model=ResponseListSchema[UserRoleBranchResponse]) 
async def get_users_by_filter(*,user_type: USER_TYPE | None = None, is_external:bool | None = None, role: USER_ROLE | None = None, user: User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce], roles=[USER_ROLE.org_admin, USER_ROLE.branch_admin,USER_ROLE.front_desk_executive,USER_ROLE.admission_manager,USER_ROLE.admission_counsellor, USER_ROLE.content_author,USER_ROLE.teacher],apps=[APP.admin_app, APP.front_desk_app]))):
    required_roles = {USER_ROLE.org_admin, USER_ROLE.front_desk_executive, USER_ROLE.admission_manager, USER_ROLE.admission_counsellor, USER_ROLE.content_author,USER_ROLE.teacher}    
    if required_roles.intersection(user.roles): 
        users_data = await user_service.get_users_role_branch_by_filter(user_type=user_type,is_external=is_external,role=role,db_session=db.session)
    elif USER_ROLE.branch_admin in user.roles:
        admin_branch_ids = await user_role_service.get_branches_for_role_user(role=USER_ROLE.branch_admin,user_id=user.id,db_session=db.session)
        users_data = await user_service.get_users_role_branch_by_filter(user_type=user_type,is_external=is_external,role=role,branch_ids=admin_branch_ids,db_session=db.session)
    
    user_responses = []
    count = 0 
    for data in users_data:
        user, branches, total_users = data
        if branches:
            valid_branches = [branch for branch in branches if branch["id"] is not None]
            unique_branches_dict = {branch['id']: branch for branch in valid_branches}
        else:
            unique_branches_dict = { }
        
        branch_roles = list(unique_branches_dict.values())
        user_response = UserRoleBranchResponse(
            **user.__dict__,  
            branches=branch_roles
        )
        user_responses.append(user_response)
        count = total_users
    # resp = [{**item._asdict()} for item in users_data]
    return ResponseListSchema(data=user_responses, success=True , meta={"count":count})

@user_router.get("/users/students",response_model=ResponseListSchema[UserBranchResponse])
async def get_students(*,limit: int = 100, offset: int = 0,user: User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce],roles=[USER_ROLE.org_admin,USER_ROLE.branch_admin]))):
    branch_users = await user_service.get_branch_users(user_type=USER_TYPE.student, limit=limit,
        offset=offset,db_session=db.session)
    if USER_ROLE.branch_admin in user.roles:
        admin_branch_ids = await user_role_service.get_branches_for_role_user(role=USER_ROLE.branch_admin,user_id=user.id,db_session=db.session)
        branch_users = await user_service.get_branch_users(user_type=USER_TYPE.student,branch_ids=admin_branch_ids, limit=limit,
            offset=offset,db_session=db.session)
    user_responses = []
    count = 0 
    for data in branch_users:
        user, branches,total_users = data
        valid_branches = [branch for branch in branches if branch["id"] is not None]
        user_response = UserBranchResponse(
            **user.__dict__, 
            branches=valid_branches 
        )
        user_responses.append(user_response)
        count = total_users
    return ResponseListSchema(data=user_responses, success=True , meta={"count":count})
    
@user_router.get("/users/search", response_model=ResponseListSchema[UserResponse])
async def get_users(*, name:str|None = None, phno: str|None =None, user: User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce], roles=[USER_ROLE.org_admin,USER_ROLE.front_desk_executive,USER_ROLE.admission_manager,USER_ROLE.admission_counsellor],apps=[APP.admin_app, APP.front_desk_app]))):
    users = await user_service.get_users_by_name_phno(name=name,phno=phno,db_session=db.session)
    return ResponseSchema(data=users, success=True)

@user_router.get("/users/reviewers")
async def get_reviewers(*,user: User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce]))):
    reviewers = await user_service.count_review_items_for_reviewers(db_session=db.session)
    # reviewers = [item._asdict() for item in reviewers]
    return reviewers


@user_router.get("/users/{id}",response_model=ResponseSchema[UserRoleBranchResponse])
async def get_user(*,id: int, user: User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce], roles=[USER_ROLE.org_admin, USER_ROLE.branch_admin,USER_ROLE.front_desk_executive,USER_ROLE.admission_manager,USER_ROLE.admission_counsellor,USER_ROLE.student_administrator,USER_ROLE.evaluation_evaluator,USER_ROLE.teacher],apps=[APP.admin_app, APP.front_desk_app, APP.teaching_app]))):
    user_in_db = await user_service.get(id=id, db_session=db.session)
    if user.roles:
        await user_branch_access(admin= user, user=user_in_db, db_session=db.session)
    user_data = await user_service.get_user_by_role_branch(user_id=id,db_session=db.session)
    if user_data:
        user, branches = user_data
        if branches:
            valid_branches = [branch for branch in branches if branch["id"] is not None]
            unique_branches_dict = {branch['id']: branch for branch in valid_branches}           
        else:
            unique_branches_dict = { }
        branch_roles = list(unique_branches_dict.values())
        user_response = UserRoleBranchResponse(
            **user.__dict__,  
            branches=branch_roles 
        )
        return ResponseSchema(data=user_response, success=True)
    else:
        return ResponseSchema(msg="user not found")

@user_router.get("/branches/{id}/users",response_model=ResponseListSchema[UserBranchResponse])
async def get_branch_users(*,id:int, user_type:USER_TYPE | None = None, is_external:bool | None = None, role: USER_ROLE | None = None, user: User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce], roles=[USER_ROLE.org_admin, USER_ROLE.branch_admin],apps=[APP.admin_app]))):
    branch_users = await user_service.get_branch_users(user_type=user_type,is_external=is_external,role=role,branch_ids=[id],db_session=db.session)
    user_responses = []
    count = 0 
    for data in branch_users:
        user, branches,total_users = data
        valid_branches = [branch for branch in branches if branch["id"] is not None]
        user_response = UserBranchResponse(
            **user.__dict__, 
            branches=valid_branches 
        )
        user_responses.append(user_response)
        count = total_users

    return ResponseListSchema(data=user_responses, success=True , meta={"count":count})
     
@user_router.post("/student/cards")
async def get_stu_user_id_cards(card_ins: list[StudentCardIn]):
    cards = []
    for card_in in card_ins:
        student = await user_service.get_user(user_id=card_in.student_id,db_session=db.session)
        print("student>>>>>", student)
        offering = await offering_crud.get(id=card_in.offering_id, db=db.session)
        product = await product_crud.get(id=card_in.product_id,db=db.session)
        file_loader = FileSystemLoader('src/templates/id_cards_templates')
        env = Environment(loader=file_loader)
        student_user = student[0]["User"]
        branch_info = student[0]["branches"][0]  # assuming there's at least one branch
        print("spiib>>>>>>", student_user.photo, offering, product)

        data = {
            "laex_icon": "src/assets/student-id-logo.svg",
            "student_bg": "src/assets/student-id-bg.svg",
            "student": student_user,
            "offering": offering,
            "product": product,
            "profile_pic": student_user.photo,
            "branch_name": branch_info["name"]
        }
        #data = {"laex_icon":"src/assets/student-id-logo.svg","student_bg": "src/assets/student-id-bg.svg", "student": student[0].User,"offering":offering,"product":product, "profile_pic": student[0].User["photo"],"branch_name":student[0]["branches"]["name"]  }
        template = env.get_template('student_id.html')
        output = template.render(data)
        pdf_fileobj = HTML(string=output, base_url='.').write_pdf()

        pdf_encoded = base64.b64encode(pdf_fileobj).decode("utf-8")
        cards.append({"encoded_str":pdf_encoded,"user_name":student_user.full_name,"user_id":student_user.id, "phone_no":student_user.phone_number })
    # return pdf_encoded

    return {"card_name":"student_idcard","data": cards}

@user_router.post("/workforce/cards")
async def get_wf_user_id_cards(card_ins: list[WorkforceCardIn]):
    cards = []
    for card_in in card_ins:
        student = await user_service.get_by_field(value=card_in.workforce_id, field="id",db_session=db.session)
        
        file_loader = FileSystemLoader('src/templates/id_cards_templates')
        env = Environment(loader=file_loader)

        data = {
            "laex_icon": "src/assets/workforce-id-logo.svg",
            "student_bg": "src/assets/workforce-id-bg.svg",
            "student": student,
            "profile_pic": student.photo,
            "branch_name": card_in.branch_name
        }
        #data = {"laex_icon":"src/assets/student-id-logo.svg","student_bg": "src/assets/student-id-bg.svg", "student": student[0].User,"offering":offering,"product":product, "profile_pic": student[0].User["photo"],"branch_name":student[0]["branches"]["name"]  }
        template = env.get_template('workforce_id.html')
        output = template.render(data)
        pdf_fileobj = HTML(string=output, base_url='.').write_pdf()

        pdf_encoded = base64.b64encode(pdf_fileobj).decode("utf-8")
        cards.append({"encoded_str":pdf_encoded,"user_name":student.full_name,"user_id":student.id, "phone_no":student.phone_number })
    # return pdf_encoded

    return {"card_name":"workforce_idcard","data": cards}

@user_router.put("/offline/transactions")
async def update_offline_transactions(tx_update: TxUpdate):
    tx_db = await tx_service.get(id=tx_update.id, db_session=db.session)
    if tx_db.payment_mode in {PAYMENT_MODE.cash, PAYMENT_MODE.cheque, PAYMENT_MODE.remote_payment}:
        tx_update =  await tx_service.update(obj_current=tx_db,obj_new=tx_update,db_session=db.session)
        return tx_update
    else:
        return "Can't update online payments"
    

