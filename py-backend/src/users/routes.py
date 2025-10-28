import pytz
from sqlalchemy.ext.asyncio import AsyncSession
import calendar
import phonenumbers
from src.base.service import BaseCRUD
from src.exceptions import UpdatePermissionDenied
from src.utils import generate_random_alphanum
from dateutil.relativedelta import relativedelta
from datetime import date, datetime, timedelta, timezone
from fastapi import (
    APIRouter,
    Depends,
    Response,
    Body,
    HTTPException,
    BackgroundTasks,
    Path,
)
import base64
from jinja2 import Environment, FileSystemLoader
from weasyprint import HTML, CSS
from fastapi_async_sqlalchemy import db
from .schemas import ProfileResponse
from .schemas import *
from .models import *
from .service import (
    UserService,
    ProfileService,
    PlanService,
    SubscriptionService,
    DiscountCodeService,
    TransactionService,
    UserQuotaService,
)
from .exceptions import *
from .utils import *
from src.auth.service import AuthService
from src.auth.models import RefreshToken
from src.auth.schemas import TokenResponse, TokenData
from src.auth import utils
from src.auth.deps import valid_token_user, valid_token_user_admin
from src.auth.security import (
    create_fb_user,
    verify_id_token,
    create_access_token,
    parse_jwt_token,
    validate_admin_access,
    create_user_with_pwd,
    check_firebase_user,
    check_firebase_user_phone,
)
from src.users.deps import CheckUserAccess
from src.external.emailer import Email
from src.tenants.deps import verify_tenant
from src.tenants.models import Tenant
from src.external.pg.service import pg
from src.external.pg.schemas import (
    PgSubsCreateSchema,
    SUBS_FREQUENCY,
    PgAuthRequestSchema,
    AUTH_WORKFLOW_TYPE,
    AMOUNT_TYPE,
)
from src.modules.notifications.utils import send_notifications,subscribe_topic,unsubscribe_topic
from src.modules.notifications.schemas import NotificationType
from src.external.pg.exceptions import *
from src.tenants.deps import tenant_service
import asyncio
from src.tasks.celery_tasks import run_celery, get_all_scheduled_tasks, get_task
from .routesv2 import user_router


router = APIRouter(prefix="/users", tags=["Users"])
account_router = APIRouter(prefix="", tags=["Accounts"])
admin_router = APIRouter(prefix="/admin", tags=["Admin"])
service = UserService(User, db)
profile_service = ProfileService(Profile, db)
auth_service = AuthService(RefreshToken, db)
plan_service = PlanService(Plan, db)
subscription_service = SubscriptionService(Subscription, db)
discount_service = DiscountCodeService(DiscountCode, db)
transaction_service = TransactionService(Transaction, db)
user_quota_service = UserQuotaService(UserQuota, db)
user_branch_crud = BaseCRUD(model=BranchUser)

# user_router = APIRouter(prefix="/v2/users", tags=["Users V2"])


@router.post("/exists", response_model=UserExistsResponse)
async def user_exists(*, phone_number: PhoneNumber = Body(embed=True)):
    user_db = await service.get_by_field(field="phone_number", value=phone_number, db_session=db.session)
    # task_id = run_celery.apply_async(
    #     ("HI",), eta=datetime.utcnow() + timedelta(seconds=40)
    # )
    if user_db:
     tenant = await tenant_service.get_by_field( field="id",value=user_db.tenant_id,db_session=db.session)
     
    if not user_db or user_db.is_deleted is True:
        return {"exists": False}

    return {
        "exists": True,
        "active": user_db.is_active,
        "tenant_id": user_db.tenant_id,
        "domain": tenant.domain,
        "admin": user_db.is_admin,
    }

@user_router.post("/exists/new", response_model=UserExistsResponse)
@router.post("/exists/new", response_model=UserExistsResponse)
@admin_router.post("/exists", response_model=UserExistsResponse)
async def user_exists(*, user_name: PhoneNumber | EmailStr = Body(embed=True)):
    user_db = await service.check_auth_user(auth_user=user_name, db_session=db.session)

    # if user_db:
    #  tenant = await tenant_service.get_by_field( field="id",value=user_db.tenant_id)

    if not user_db:
        return {"exists": False}

    return {
        "exists": True,
        "active": user_db.is_active,
        "tenant_id": user_db.tenant_id,
        # "domain": tenant.domain if user_db else None,
        "admin": user_db.is_admin,
    }

@router.post("/exists/phonenumbers")
async def user_ph_nos(*, partial_ph_no: str, user: User = Depends(valid_token_user)):
    response = await service.get_users_by_partial_ph_nos(
        prefix=partial_ph_no, db_session=db.session
    )
    return response


@router.post("/register", response_model=TokenResponse)
async def register_user(
    *,
    response: Response,
    user_in: UserRegister,
    user_info: dict[str, Any] = Depends(verify_id_token),
    tenant: Tenant = Depends(verify_tenant),
):
    user_in_db = await service.get_by_field(value=user_in.phone_number,field="phone_number",db_session=db.session)
    if user_in_db:
        if user_in_db.is_deleted is True:
            raise UserDeleted()
        else:
            raise UserAlreadyExists()
    user_create = UserCreate(**user_in.model_dump(), tenant_id=tenant.id)
    user_db = await service.create(obj_in=user_create,db_session=db.session)

    user_update_info = UserUpdate(**user_info, phone_verified=True, user_preferences=UserPreference(with_omr_sheet=None,record_elimination_technique=None,current_affairs_only=False,tutor_mode=False))
    user_db = await service.update(obj_current=user_db, obj_new=user_update_info,db_session=db.session)

    refresh_token_value = await auth_service.create_refresh_token(user_id=user_db.id,db_session=db.session)
    response.set_cookie(**utils.get_refresh_token_settings(refresh_token_value))

    return TokenResponse(
        access_token=create_access_token(user=user_db),
        refresh_token=refresh_token_value,
    )

@router.put("/account/delete")
async def account_delete(*,user: User = Depends(valid_token_user)):
    user_db = await service.get(id=user.id,db_session=db.session)
    if user_db:
        user_delete_db = await service.update(obj_current=user_db,obj_new={"is_deleted":True},db_session=db.session)
        
    else:
       raise UserNotFound()
    
    return "User deleted"


auth_test_router = APIRouter(prefix="/auth/test", tags=["Auth Test"])


@auth_test_router.post("/gettoken", include_in_schema=True)
async def get_token(id: int):
    user_db = await service.get(id=id,db_session=db.session)
    if not user_db.is_active:
        raise UserDeactivated()

    refresh_token_value = await auth_service.create_refresh_token(user_id=id,db_session=db.session)
    return TokenResponse(
        access_token=create_access_token(user=user_db),
        refresh_token=refresh_token_value,
    )


@auth_test_router.get("/tasks/", include_in_schema=True)
async def get_celery_tasks():
    tasks = get_all_scheduled_tasks()
    return tasks


@auth_test_router.get("/tasks/{id}", include_in_schema=True)
async def get_celery_tasks(id: str):
    task = get_task(task_id=id)

    return task.status

@user_router.post("/fbtokens")
@router.post("/fbtokens")
async def add_device_token(
    *, device_token: str, user: User = Depends(valid_token_user),bckgrnd_tasks:BackgroundTasks
):
    users_db_tokens = user.fb_device_tokens if user.fb_device_tokens is not None else []
    users_db_tokens.append(device_token)
    user_tokens_update = User(fb_device_tokens=set(users_db_tokens))

    user_update_db = await service.update(obj_current=user, obj_new=user_tokens_update,db_session=db.session)
    bckgrnd_tasks.add_task(
        subscribe_topic, user_fb_tokens=user.fb_device_tokens,topic = settings.PUSH_NOTIFICATIONS_TOPIC
    )
    return user_update_db

@user_router.put("/fbtokens")
@router.put("/fbtokens")
async def update_fbtoken(
    *, old_token: str, new_token: str, user: User = Depends(valid_token_user)
):
    tokens = user.fb_device_tokens
    if tokens:
        updated_tokens = [new_token if token == old_token else token for token in tokens]
    else:
        updated_tokens = [new_token]    
    user_token_update = User(fb_device_tokens=updated_tokens)
    user_update_db = await service.update(obj_current=user, obj_new=user_token_update,db_session=db.session)
    unsubscribed_token = await unsubscribe_topic(topic=settings.PUSH_NOTIFICATIONS_TOPIC, user_fb_tokens=[old_token])

    return user_update_db

@router.get("/me", response_model=UserResponse)
async def get_self(current_user: User = Depends(valid_token_user)):
    if (current_user.subscription) and (current_user.subscription.subscription_status == SubscriptionStatus.active):
        timezone = current_user.subscription.current_expiry_at and current_user.subscription.current_expiry_at.tzinfo
        if current_user.subscription.current_expiry_at < datetime.now(timezone):
            subs_db = await subscription_service.get_by_field(value=current_user.subscription.id,field="id",db_session=db.session)
            current_user.subscription.subscription_status = SubscriptionStatus.expired
            subs_update_db = await subscription_service.update(obj_current=subs_db,obj_new={"subscription_status":SubscriptionStatus.expired},db_session=db.session)

    return current_user


@router.post("/me/onboard", response_model=UserResponse)
async def onboard_self(
    *,
    current_user: User = Depends(valid_token_user),
    bckgrnd_tasks: BackgroundTasks,
    user: UserOnboard,
):
    # user_in_db = await service.get(id=current_user.id)

    # if not user_in_db.email == user.email:

    user_update_obj = UserIsOnboard(**user.model_dump(), is_onboarded=True)
    user_db = await service.update(obj_current=current_user, obj_new=user_update_obj,db_session=db.session)
    if user.referred_by_phone:
        referred_user = await service.get_by_field(value=user.referred_by_phone,field="phone_number",db_session=db.session)
        if referred_user:
            user_db = await service.update(
                obj_current=current_user, obj_new={"referred_by_id": referred_user.id},db_session=db.session
            )
        else:
            raise UserWithPhnoNotFound() 
    elif user.referred_by_id:
        user_db = await service.update(
                obj_current=current_user, obj_new={"referred_by_id": user.referred_by_id},db_session=db.session
            )

    # notify user
    bckgrnd_tasks.add_task(
        send_notifications, user_id=user_db.id, notify_type=NotificationType.welcome
    )

    return user_db

    # else:
    #   raise HTTPException(status_code=409, detail="email already taken")


@router.put("/me", response_model=UserResponse)
async def update_self(
    *, current_user: User = Depends(valid_token_user), user: UserUpdate
):
    
    if user.photo is not None and current_user.photo_lock_enabled:
        raise UpdatePhotoDenied()
    user_db = await service.update(obj_current=current_user, obj_new=user,db_session=db.session)
    

    return user_db


@router.put("/me/email", response_model=UserResponse)
async def update_self_email(
    *,
    current_user: User = Depends(valid_token_user),
    email: Optional[EmailStr] = Body(None,embed=True),
):
    if current_user.email == email:
        return current_user
    current_email = current_user.email
    if email is not None :
        user_db = await service.check_auth_user(auth_user=email, db_session=db.session)
        if user_db:
            raise EmailTaken()

    user_db_updated = await service.update(
        obj_current=current_user, obj_new={"email": email, "email_verified": False},db_session=db.session
    )
   
    if current_email is not None:
        fb_current_user = await check_firebase_user(email=current_email)
        if fb_current_user is not None:
            fb_user_updated = await update_firebase_user(
                fb_current_user.uid,
                {"email": user_db_updated.email},
            )
           

    return user_db_updated


@router.put("/me/phone", response_model=UserResponse)
async def update_self_phone(
    *,
    current_user: User = Depends(valid_token_user),
    phone_number: PhoneNumber = Body(embed=True),
):
    if current_user.phone_number == phone_number:
        return current_user

    user_db = await service.check_auth_user(
        auth_user=phone_number, db_session=db.session
    )
    if user_db:
        raise PhoneNumberTaken()

    user_db_updated = await service.update(
        obj_current=current_user,
        obj_new={"phone_number": phone_number, "phone_verified": False},db_session=db.session
    )

    fb_current_user = await check_firebase_user_phone(phone_number=phone_number)
    if fb_current_user is not None:
        fb_user_updated = await update_firebase_user(
            fb_current_user.uid,
            {"phone_number": user_db_updated.phone_number},
        )

    return user_db_updated


"""
Profiles routes
"""


@router.post("/me/profiles", response_model=ProfileResponse)
async def add_profile(
    *, token: TokenData = Depends(parse_jwt_token), profile: ProfileCreate
):
    profile_in = Profile(**profile.model_dump())
    profile_in.user_id = token.user_id

    profile_in_db = await profile_service.get_profile_by_type(
        user_id=profile_in.user_id, profile_type=profile_in.profile_type,db_session=db.session
    )

    if not profile_in_db:
        profile_db = await profile_service.create(obj_in=profile_in,db_session=db.session)
    else:
        raise ProfileAlreadyExists()

    return profile_db


@router.put("/me/profiles/{profile_id}", response_model=ProfileResponse)
async def update_profile(
    *, id: int, token: TokenData = Depends(parse_jwt_token), profile: ProfileUpdate
):
    current_profile = await profile_service.get(id=id,db_session=db.session)
    profile_db = await profile_service.update(
        obj_current=current_profile, obj_new=profile,db_session=db.session
    )

    return profile_db


@router.get("/me/profiles", response_model=list[ProfileResponse])
async def get_self_profiles(*, token: TokenData = Depends(parse_jwt_token)):
    my_profiles = await profile_service.get_profiles(user_id=token.user_id,db_session=db.session)

    return my_profiles


"""
User management routes for Admin
"""


@router.post(
    "",
    response_model=UserResponse,
    dependencies=[Depends(CheckUserAccess(admin=True, role=USER_ROLE.tenant_admin))],
    tags=["Admin"],
)
async def create_user(*, user_in: UserCreate, bg_tasks: BackgroundTasks):
    if user_in.is_admin:
        if not user_in.roles or not len(user_in.roles) > 0:
            raise UserRolesRequied()
        if not user_in.email:
            raise UserEmailRequied()

    user_db = await service.create(obj_in=user_in,db_session=db.session)
    fb_user = await check_firebase_user(email=user_in.email)
    if not fb_user:
        password = create_random_pwd()
        fb_user = await create_user_with_pwd(
            user_in=UserCreate(
                phone_number=user_db.phone_number,
                full_name=user_db.full_name,
                email=user_db.email,
                is_admin=user_db.is_admin,
                tenant_id=user_db.tenant_id or 0,
            ),
            password=password,
        )
        bg_tasks.add_task(
            Email().send_password,
            recipient_name=user_db.full_name,
            email_to=[user_db.email],
            data={"password": password},
        )
    else:
        fb_user = await update_firebase_user(
            fb_user.uid,
            {
                "phone_number": user_db.phone_number,
                "display_name": user_db.full_name,
            },
        )

    return user_db


@router.get(
    "/referrals",
    response_model=list[UserReferralResponse],
    dependencies=[Depends(CheckUserAccess(admin=True, role=USER_ROLE.tenant_admin))],
    tags=["Admin"],
)
async def get_referral_users():
    users_db = await service.get_referred_users(db_session=db.session)
    res = [{**item._asdict()} for item in users_db]

    return res

@router.get(
    "/roles",
    response_model=list[UserResponse],
    tags=["Admin"],
)
async def get_users(user_role: USER_ROLE):
    users_db = await service.get_by_field_multi( value=[user_role], field="roles",db_session=db.session)
    return users_db


@router.put(
    "/{id}",
    response_model=UserResponse,
    dependencies=[Depends(CheckUserAccess(admin=True, role=USER_ROLE.tenant_admin))],
    tags=["Admin"],
)
async def update_user(*, id: int, user: UserUpdate):
    user_db_current = await service.get(id=id,db_session=db.session)
    if not user_db_current:
        raise NotFound()
    user_db = await service.update(obj_current=user_db_current, obj_new=user,db_session=db.session)

    return user_db


@router.get(
    "/{id}",
    response_model=UserResponse,
    dependencies=[Depends(CheckUserAccess(admin=True, role=USER_ROLE.tenant_admin))],
    tags=["Admin"],
)
async def get_user_by_id(*, id: int):
    user_db = await service.get(id=id,db_session=db.session)
    if not user_db:
        raise NotFound()

    return user_db


@router.get(
    "",
    response_model=list[UserResponse],
    dependencies=[Depends(CheckUserAccess(admin=True, role=USER_ROLE.tenant_admin))],
    tags=["Admin"],
)
async def get_users():
    users_db = await service.get_multi(db_session=db.session)
    return users_db


"""
Plan routes

"""


@account_router.post(
    "/plans",
    response_model=PlanResponse,
    dependencies=[Depends(CheckUserAccess(admin=True, role=USER_ROLE.tenant_admin))],
)
async def create_plan(
    *, plan_in: PlanCreate, user: User = Depends(valid_token_user_admin)
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

    return plan_update_db


@account_router.put(
    "/plans/{id}",response_model=PlanResponse,
    dependencies=[Depends(CheckUserAccess(admin=True, role=USER_ROLE.tenant_admin))],
)
async def update_plan(
    *, id: int, plan_in: PlanUpdate, user: User = Depends(valid_token_user_admin)
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
    return plan_db


@account_router.get(
    "/plans",
    response_model=list[PlanResponse],
    dependencies=[Depends(CheckUserAccess(admin=True, role=USER_ROLE.tenant_admin))],
)
async def get_plans(user: User = Depends(valid_token_user_admin)):
    plans = await plan_service.get_by_field_multi(
        value=user.tenant_id, field="tenant_id",db_session=db.session
    )
    # if not len(plans) > 0:
    #     raise PlanNotFound()
    return plans


@account_router.get(
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


@account_router.get("/plans/{id}", response_model=PlanResponse)
async def get_plan_by_id(*, id: int, current_user: User = Depends(valid_token_user)):
    # plan = await plan_service.get(id=id, db_session=db.session)
    plan = await plan_service.get_plan_by_tenant(
        plan_id=id, tenant_id=current_user.tenant_id,db_session=db.session
    )
    if not plan:
        raise NotFound()
    return plan


"""
Discount routes
"""


@account_router.post(
    "/discounts",
    response_model=DiscountCodeResponse,
    dependencies=[Depends(CheckUserAccess(admin=True, role=USER_ROLE.tenant_admin))],
)
async def create_discount(
    *, discount: DiscountCodeCreate, user: User = Depends(valid_token_user_admin)
):
    discount_db = await discount_service.verify_discount_code(
        coupon_code=discount.coupon_code, tenant_id=user.tenant_id,db_session=db.session
    )
    if discount_db:
        raise DiscountAlreadyExists()
    disc_in = DiscountCode(**discount.model_dump(), tenant_id=user.tenant_id)
    discount_db = await discount_service.create(obj_in=disc_in, db_session=db.session)

    return discount_db


@account_router.put(
    "/discounts/{id}/users/add",
    response_model=DiscountCodeResponse,
    dependencies=[Depends(CheckUserAccess(admin=True, role=USER_ROLE.tenant_admin))],
)
async def add_users_to_coupon(
    *,
    id: int,
    user_ids: list[int] | None = None,
    user_phone_nos: list[str] | None = None,
    user: User = Depends(valid_token_user_admin),
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
    return discount_db


@account_router.put(
    "/discounts/{id}",
    response_model=DiscountCodeResponse,
    dependencies=[Depends(CheckUserAccess(admin=True, role=USER_ROLE.tenant_admin))],
)
async def update_discount(
    id: int,
    *,
    discount: DiscountCodeUpdate,
    user: User = Depends(valid_token_user_admin),
):
    discount_current = await discount_service.get_disc_by_tenant(
        disc_id=id, tenant_id=user.tenant_id, db_session=db.session
    )
    if not discount_current:
        NotFound()
    discount_db = await discount_service.update(
        obj_current=discount_current, obj_new=discount, db_session=db.session
    )
    return discount_db


@account_router.get(
    "/discounts/{id}",
    response_model=DiscountCodeResponse,
    dependencies=[Depends(CheckUserAccess(admin=True, role=USER_ROLE.tenant_admin))],
)
async def get_discount_by_id(*, id: int, user: User = Depends(valid_token_user_admin)):
    discount = await discount_service.get_disc_by_tenant(
        disc_id=id, tenant_id=user.tenant_id, db_session=db.session
    )
    return discount


@account_router.get(
    "/discounts",
    response_model=list[DiscountCodeResponse],
    dependencies=[Depends(CheckUserAccess(admin=True, role=USER_ROLE.tenant_admin))],
)
async def get_discounts(user: User = Depends(valid_token_user_admin)):
    discounts = await discount_service.get_by_field_multi(
        value=user.tenant_id, field="tenant_id",db_session=db.session
    )
    return discounts


@account_router.post("/discounts/verify")
async def verify_user_discount(
    *,
    coupon_code: str = Body(embed=True),
    current_user: User = Depends(valid_token_user),
):
    discount = await discount_service.verify_discount_code(
        coupon_code=coupon_code, tenant_id=current_user.tenant_id, db_session=db.session
    )

    if discount:
        return discount
        # discount_response = verify_discount_code(
        #     discount=discount, user_id=current_user.id
        # )
    else:
        raise NotFound()


""""
subscription routes
"""


async def create_new_subscription(
    *,
    user_id: int,
    bckgrnd_tasks: BackgroundTasks,
    subscription_in: SubscriptionCreate,
    adj_amt: int = 0,
    db_session: AsyncSession,
) -> Subscription:
    plan = await plan_service.get(id=subscription_in.plan_id,db_session=db_session)
    if not plan:
        raise PlanNotFound()

    user_db = await service.get(id=user_id,db_session=db_session)

    start_at = datetime.now()
    plan_amount = plan.rate * plan.billing_frequency


    if plan.rate == 0 or subscription_in.free_plan == True :

        start_at = datetime.now()
        end_at = datetime.now() + timedelta(days=365)  # 1 years from now

        user_subs = await subscription_service.get_user_subs_free_plan(user_id = user_id,db_session=db_session)
        if user_subs:
            user_subs_dict = [item._asdict() for item in user_subs]
            user_subs_db = user_subs_dict[0]["Subscription"]
            subscription_update = user_subs_db
            subscription_update.subscription_status = SubscriptionStatus.active
            subscription_update.start_at = start_at
            subscription_update.current_expiry_at = end_at

            subscription_db = await subscription_service.update(
                obj_current=user_subs_db, obj_new=subscription_update,db_session=db_session
            )
            return subscription_db
        
        subscription = Subscription(
            plan_id=subscription_in.plan_id,
            user_id=user_db.id,
            subscription_amount=0,
            subscription_status=SubscriptionStatus.active,
            start_at=start_at,
            free_plan=True if subscription_in.free_plan == True else False ,
            current_expiry_at=end_at,
            recurring_count=1,
        )

        subscription_db = await subscription_service.create(obj_in=subscription,db_session=db_session)
        # notify user
        bckgrnd_tasks.add_task(
            send_notifications,
            user_id=user_db.id,
            notify_type=NotificationType.free_subscription_success
        )

        return subscription_db

    discount = await discount_service.get_by_field(
        field="coupon_code", value=subscription_in.coupon_code, db_session=db_session
    )

    if discount and verify_discount_code(
        discount=discount,
        user_id=user_id,
        phone_no=subscription_in.pg_subs_info.mobile_number,
    ):
        if discount.discount_type == "PERCENT":
            discount_amt = int(plan_amount * (discount.discount / 100))
        else:
            discount_amt = discount.discount
        discount_id = discount.id
    else:
        discount_amt = 0
        discount_id = None

    subscription_amount = max(plan_amount - discount_amt, 0)

    # expiry_month = (start_at.month + plan.billing_frequency) % 12 or (
    #     start_at.month + plan.billing_frequency
    # )
    expiry_month = (start_at.month + plan.billing_frequency - 1) % 12 + 1
    # expiry_year = start_at.year + int((start_at.month + plan.billing_frequency) / 12)
    expiry_year = start_at.year + (start_at.month + plan.billing_frequency - 1) // 12
    days_in_expiry_month = calendar.monthrange(year=expiry_year, month=expiry_month)[1]

    expiry_day = min(start_at.day, days_in_expiry_month)

    current_expiry_at = (
        start_at.replace(day=expiry_day)
        .replace(month=expiry_month)
        .replace(year=expiry_year)
    )

    if subscription_in.free_trial or subscription_amount == 0:
        current_expiry_at = (
            start_at + timedelta(days=30)
            if subscription_in.free_trial
            else current_expiry_at
        )

        subscription = Subscription(
            plan_id=plan.id,
            user_id=user_id,
            discount_id=discount_id,
            subscription_amount=0,
            subscription_status=SubscriptionStatus.active,
            currency=plan.currency,
            start_at=start_at,
            current_expiry_at=current_expiry_at,
            recurring_count=1,
            free_trial=subscription_in.free_trial,
        )

        subscription_db = await subscription_service.create(
            obj_in=subscription, db_session=db_session
        )
        # notify user
        bckgrnd_tasks.add_task(
            send_notifications,
            user_id=user_db.id,
            notify_type=NotificationType.free_subscription_success
        )

        if subscription_db.discount_id:
            updated_users = (
                [user_id]
                if not discount.redeemed_by
                else discount.redeemed_by + [user_id]
            )

            disc_update = DiscountCode(
                redeemed_by=set(updated_users),
                actual_use_count=discount.actual_use_count + 1,
            )
            discount_update_db = await discount_service.update(
                obj_current=discount, obj_new=disc_update, db_session=db_session
            )

        if subscription_in.free_trial:
            user_update_db = await service.update(
                obj_current=user_db, obj_new={"free_trial_used": True}, db_session=db_session
            )

        return subscription_db

    subscription = Subscription(
        plan_id=plan.id,
        user_id=user_id,
        discount_id=discount_id,
        discount_amount=discount_amt,
        adjustment_amount=adj_amt,
        subscription_amount=subscription_amount,
        payment_status=PaymentStatus.pending,
        subscription_status=SubscriptionStatus.pending,
        currency=plan.currency,
        start_at=start_at,
        current_expiry_at=current_expiry_at,
    )

    subs_db = await subscription_service.create(
        obj_in=subscription, db_session=db_session
    )

    pg_freq = {
        1: SUBS_FREQUENCY.monthly,
        3: SUBS_FREQUENCY.quaterly,
        12: SUBS_FREQUENCY.yearly,
    }.get(plan.billing_frequency)

    ### create pg user subscription
    subs_pg_details = PgSubsCreateSchema(
        merchantId=settings.MERCHANT_ID,
        merchantSubscriptionId=subs_db.subs_id,
        merchantUserId=str(user_id),
        subscriptionName="{} plan on {} frequency".format(plan.name, pg_freq),
        authWorkflowType=AUTH_WORKFLOW_TYPE.transaction,
        amountType=AMOUNT_TYPE.variable,
        amount=subs_db.subscription_amount,
        frequency=pg_freq,
        recurringCount=subs_db.recurring_count,
        description=plan.description,
        mobileNumber=subscription_in.pg_subs_info
        and subscription_in.pg_subs_info.mobile_number,
        deviceContext=subscription_in.pg_subs_info
        and subscription_in.pg_subs_info.device_context,
    )

    pg_subs = await pg.create_subscription(create_subs=subs_pg_details)

    if not pg_subs:
        raise PgSubsCreateFailed()

    subs_update = SubscriptionUpdate(
        pg_ref_id=pg_subs["subscriptionId"],
        pg_data=pg_subs,
        subscription_status=pg_subs["state"],
    )

    subs_update_db = await subscription_service.update(
        obj_current=subs_db, obj_new=subs_update, db_session=db_session
    )
    # notify user
    bckgrnd_tasks.add_task(
        send_notifications,
        user_id=user_db.id,
        notify_type=NotificationType.paid_subscription_success
    )
    
    # if subs_update_db.discount_id:
    #     updated_users = (
    #         [user_id] if not discount.redeemed_by else discount.redeemed_by + [user_id]
    #     )

    #     disc_update = DiscountCode(
    #         redeemed_by=set(updated_users),
    #         actual_use_count=discount.actual_use_count + 1,
    #     )
    #     discount_update_db = await discount_service.update(
    #         obj_current=discount, obj_new=disc_update, db_session=db_session
    #     )

    return subs_update_db


@account_router.post("/me/subscriptions", response_model=SubscriptionResponse)
async def add_subscription(
    *,
    user: User = Depends(CheckUserAccess()),
    subscription_in: SubscriptionCreate,
    bckgrnd_tasks: BackgroundTasks,
):
    active_subscription = await subscription_service.get_active_subscription(
        id=user.subscription_id, db_session=db.session
    )
    if active_subscription:
        raise ActiveSubscriptionExists()

    subscription_db = await create_new_subscription(
        bckgrnd_tasks=bckgrnd_tasks,
        user_id=user.id,
        subscription_in=subscription_in,
        db_session=db.session,
    )

    user_update = user
    user_update.subscription_id = subscription_db.id
    
    user_db = await service.update(obj_current=user, obj_new=user_update, db_session=db.session)

    return subscription_db


# @account_router.get("/me/subscriptions/free", response_model=SubscriptionResponse)
# async def add_free_subscription(*, user: User = Depends(CheckUserAccess())):
#     active_subscription = await subscription_service.get_active_subscription(
#         id=user.subscription_id
#     )
#     if active_subscription:
#         raise ActiveSubscriptionExists()


@account_router.post("/me/subscriptions/{subs_id}/mandate")
async def create_mandate(
    *,
    user: User = Depends(CheckUserAccess()),
    subs_id: int,
    mandate_in: PgSubsMandateCreate,
):
    subs_db = await subscription_service.get(id=subs_id, db_session=db.session)
    if not subs_db:
        raise SubscriptionNotFound()
    if mandate_in.payment_instrument.type == SUBS_FLOW_TYPE.collect_flow:
        if not mandate_in.payment_instrument.vpa:
            raise VPARequired()
        verify_vpa = await pg.verify_vpa(vpa=mandate_in.payment_instrument.vpa)
    elif (
        mandate_in.payment_instrument.type == SUBS_FLOW_TYPE.upi_intent_flow
        and not mandate_in.payment_instrument.target_app
    ):
        raise TargetAppRequired()

    # subs_amount: int = (
    #     max(subs_db.subscription_amount - subs_db.adjustment_amount, 0)
    #     if subs_db.adjustment_amount and subs_db.adjustment_amount > 0
    #     else subs_db.subscription_amount,
    # )

    # if subs_db.pg_ref_id:
    #     pg_subs = await pg.check_subscription_status(subs_id=subs_db.subs_id)

    if subs_db.pg_ref_id:
        response = await pg.check_subscription_status(subs_id=subs_db.subs_id)
        if response.status_code != 200:
            raise PgRequestFailed()

        pg_subs = response.json()["data"]

        if pg_subs and pg_subs["state"] in [SubscriptionStatus.created]:
            auth_req_id_new = generate_random_alphanum(length=20)
            mandate = await pg.submit_auth_request(
                auth_req_in=PgAuthRequestSchema(
                    merchantId=settings.MERCHANT_ID,
                    merchantUserId=str(user.id),
                    subscriptionId=subs_db.pg_ref_id,
                    authRequestId=auth_req_id_new,
                    amount=subs_db.subscription_amount,
                    paymentInstrument=mandate_in.payment_instrument,
                )
            )
            subs_db = await subscription_service.update(
                obj_current=subs_db, obj_new={"auth_req_id": auth_req_id_new}, db_session=db.session
            )
        else:
            raise HTTPException(
                status_code=400,
                detail="Pg subscription not found or not in CREATED status",
            )

    else:
        raise HTTPException(
            status_code=404, detail="Pg subscription reference not found"
        )

    tx_db = await transaction_service.get_by_field(
        field="tx_id", value=subs_db.auth_req_id, db_session=db.session
    )
    if tx_db:
        transaction_db = await transaction_service.update(
            obj_current=tx_db,
            obj_new=TransactionUpdate(
                amount=subs_db.subscription_amount,
                payment_mode=mandate_in.payment_instrument.type,
                tx_status=PaymentStatus.pending,
            ), db_session=db.session
        )
    else:
        transaction_db = await transaction_service.create(
            obj_in=TransactionCreate(
                paid_by=user.id,
                subscription_id=mandate_in.subscription_id,
                amount=subs_db.subscription_amount,
                payment_mode=mandate_in.payment_instrument.type,
                description="Subscription Auth Mandate Transaction",
                tx_id=subs_db.auth_req_id,
                tx_status=PaymentStatus.pending,
                tx_type=TxType.subs_auth,
                tx_at=datetime.now(),
            ), db_session=db.session
        )

    return mandate


@account_router.post("/me/subscriptions/{subs_id}/payment/status")
@account_router.post("/me/subscriptions/{subs_id}/payment/{auth_req_id}/status")
async def get_subscription_payment_status(
    *,
    user: User = Depends(CheckUserAccess()),
    subs_id: int,
    auth_req_id: str | None = None,
    bckgrnd_tasks: BackgroundTasks,
):
    ### check tx db for pending .. if pending... call pg auth stattus req
    subs_db = await subscription_service.get(id=subs_id, db_session=db.session)
    if not subs_db:
        raise SubscriptionNotFound()
    if not subs_db.auth_req_id:
        raise AuthStatusCheckFailed()
    tx_db = await transaction_service.get_by_field(
        field="tx_id", value=subs_db.auth_req_id, db_session=db.session
    )

    if not tx_db or subs_db.id != tx_db.subscription_id:
        raise AuthStatusCheckFailed()

    if (
        tx_db
        and tx_db.pg_data
        and subs_db.pg_data
        and tx_db.tx_status == PaymentStatus.completed
        and subs_db.payment_status == PaymentStatus.completed
    ):
        if subs_db.discount_id:
            discount = await discount_service.get(id=subs_db.discount_id,db_session=db.session)
            if not discount.redeemed_by:
                discount.redeemed_by = []  
            if subs_db.user_id not in discount.redeemed_by:      
                updated_users = (
                    [subs_db.user_id] if not discount.redeemed_by else discount.redeemed_by + [subs_db.user_id]
                )

                disc_update = DiscountCode(
                    redeemed_by=set(updated_users),
                    actual_use_count=discount.actual_use_count + 1,
                )
                discount_update_db = await discount_service.update(
                    obj_current=discount, obj_new=disc_update, db_session=db.session
                )
        # notify user
        bckgrnd_tasks.add_task(
            send_notifications,
            user_id=user.id,
            notify_type=NotificationType.payment_success
        )

        return {
            "status": tx_db.tx_status,
            "transactionDetails": tx_db.pg_data,
            "subscriptionDetails": subs_db.pg_data,
        }

    # check auth req status
    auth_req_status: PgAuthStatusResponse = await pg.auth_request_status(
        auth_req_id=subs_db.auth_req_id
    )
    
    if (
        auth_req_status["subscriptionDetails"]
        and (
            auth_req_status["subscriptionDetails"]["state"] == SubscriptionStatus.active
        )
        and (auth_req_status["transactionDetails"])
        and (auth_req_status["transactionDetails"]["state"] == PaymentStatus.completed)
    ):
        tx_update = TransactionUpdate(
            pg_data=auth_req_status["transactionDetails"],
            pg_ref_id=auth_req_status["transactionDetails"]["providerReferenceId"],
            tx_status=auth_req_status["transactionDetails"]["state"],
        )
        tx_update_db = await transaction_service.update(
            obj_current=tx_db, obj_new=tx_update, db_session=db.session
        )

        pg_data = subs_db.pg_data
        # PgSubsData(**auth_req_status.subscriptionDetails.model_dump()
        pg_data["state"] = auth_req_status["subscriptionDetails"]["state"]
        subs_update = SubscriptionUpdate(
            subscription_status=auth_req_status["subscriptionDetails"]["state"],
            payment_status=auth_req_status["transactionDetails"]["state"],
            pg_data=pg_data,
        )

        subs_update_db = await subscription_service.update(
            obj_current=subs_db, obj_new=subs_update, db_session=db.session
        )
        if subs_update_db.discount_id:
            discount = await discount_service.get(id=subs_update_db.discount_id,db_session=db.session)
            if not discount.redeemed_by:
                discount.redeemed_by = []  
            if subs_update_db.user_id not in discount.redeemed_by:                  
                updated_users = (
                    [subs_update_db.user_id] if not discount.redeemed_by else discount.redeemed_by + [subs_update_db.user_id]
                )
                disc_update = DiscountCode(
                    redeemed_by=set(updated_users),
                    actual_use_count=discount.actual_use_count + 1,
                )
                discount_update_db = await discount_service.update(
                    obj_current=discount, obj_new=disc_update, db_session=db.session
                )
        return {
            "status": auth_req_status["subscriptionDetails"]["state"],
            "transactionDetails": auth_req_status["transactionDetails"],
            "subscriptionDetails": auth_req_status["subscriptionDetails"],
        }

    return {
        "status": tx_db.tx_status,
        "transactionDetails": auth_req_status.get("transactionDetails"),
        "subscriptionDetails": auth_req_status["subscriptionDetails"],
    }


@account_router.get("/me/subscriptions")
async def get_subscription(*, user: User = Depends(valid_token_user)):
    my_subscription = await subscription_service.get_active_subscription(
        id=user.subscription_id, db_session=db.session
    )
    if not my_subscription:
        raise SubscriptionNotFound()

    return my_subscription


@account_router.put("/me/subscriptions/cancel", response_model=SubscriptionResponse)
async def cancel_subscription(*, user: User = Depends(CheckUserAccess())):
    if not user.subscription_id:
        raise SubscriptionNotFound()

    subscription_db = await subscription_service.cancel_subscription(
        id=user.subscription_id, db_session=db.session
    )

    # if not subscription_db.free_trial and not subscription_db.subscription_amount == 0:
    if subscription_db.pg_ref_id:  # only for paid subs
        res = await pg.check_subscription_status(subs_id=subscription_db.subs_id)
        if res.status_code != 200:
            if (res.status_code == 400 and res.json()["code"] == "SUBSCRIPTION_NOT_FOUND"):
                pass
            elif (res.status_code == 204 and res.__dict__.get("reason") == "No Content"):
                pass
            else:
                raise PgRequestFailed()
        else:
            pg_subs = res.json()["data"]
            if pg_subs and pg_subs["state"] in [
                SubscriptionStatus.active,
            ]:
                pg_subs = await pg.cancel_subscription(
                    user_id=user.id, pg_subs_id=subscription_db.pg_ref_id
                )
    # if subscription_db.pg_ref_id:  # only for paid subs
    #     pg_subs = await pg.check_subscription_status(subs_id=subscription_db.subs_id)

    #     if pg_subs and pg_subs["state"] in [
    #         SubscriptionStatus.active,
    #     ]:
    #         pg_subs = await pg.cancel_subscription(
    #             user_id=user.id, pg_subs_id=subscription_db.pg_ref_id
    #         )

    ## update tx table and subs table in handle call back function
            
    user = await service.get(id=user.id, db_session=db.session)

    user_update = user
    user_update.subscription_id = None
    user_db = await service.update(obj_current=user, obj_new=user_update, db_session=db.session)

    return subscription_db


@account_router.put("/me/subscriptions/change", response_model=SubscriptionResponse)
async def upgrade_subscrition(
    *,
    bckgrnd_tasks: BackgroundTasks,
    user: User = Depends(CheckUserAccess()),
    subscription_new: SubscriptionCreate,
):
    # adj_amt: int = 0
    if not user.subscription_id:
        raise SubscriptionNotFound()

    if subscription_new.coupon_code:
        discount = await discount_service.get_by_field(
            field="coupon_code", value=subscription_new.coupon_code, db_session=db.session
        )

        if not discount:
            raise HTTPException(
                        status_code=404, detail="Discount code not valid for you"
                    )
            
        verify_discount_code(discount=discount,user_id=user.id,phone_no=subscription_new.pg_subs_info.mobile_number)

    subscription_db = await subscription_service.cancel_subscription(
        id=user.subscription_id, db_session=db.session
    )

    # if not subscription_db.free_trial and not subscription_db.subscription_amount == 0:
    if subscription_db.pg_ref_id:  # only for paid subs
        res = await pg.check_subscription_status(subs_id=subscription_db.subs_id)
        if res.status_code != 200:
            if (res.status_code == 400 and res.json()["code"] == "SUBSCRIPTION_NOT_FOUND"):
                pass
            elif (res.status_code == 204 and res.__dict__.get("reason") == "No Content"):
                pass
            else:
                raise PgRequestFailed()
        else:
            pg_subs = res.json()["data"]
            if pg_subs and pg_subs["state"] in [
                SubscriptionStatus.active,
            ]:
                pg_subs = await pg.cancel_subscription(
                    user_id=user.id, pg_subs_id=subscription_db.pg_ref_id
                )
    # if subscription_db.pg_ref_id:  # only for paid subs
    #     pg_subs = await pg.check_subscription_status(subs_id=subscription_db.subs_id)

    #     if pg_subs and pg_subs["state"] in [
    #         SubscriptionStatus.active,
    #     ]:
    #         pg_subs = await pg.cancel_subscription(
    #             user_id=user.id, pg_subs_id=subscription_db.pg_ref_id
    #         )

        # old_plan: Plan = subs_old_db.plan
        # current_expiry: datetime = subs_old_db.current_expiry_at
        # days_remaining = current_expiry - datetime.now(tz=current_expiry.tzinfo)

        # adj_amt = (subs_old_db.subscription_amount * days_remaining.days) / (
        #     old_plan.billing_frequency * 30
        # )
    subscription_db = await create_new_subscription(
        bckgrnd_tasks=bckgrnd_tasks,
        user_id=user.id,
        subscription_in=subscription_new,
        # adj_amt=adj_amt,
        db_session=db.session,
    )

    # user_update = user
    # user_update.subscription_id = subscription_db.id
    user = await service.get(id=user.id, db_session=db.session)
   
    user_db = await service.update(obj_current=user, obj_new={"subscription_id":subscription_db.id}, db_session=db.session)

    return subscription_db


@account_router.get(
    "/me/transactions",
)
async def get_transactions(*, user: User = Depends(valid_token_user)):
    my_transactions = await transaction_service.get_transactions(
        user_id=user.id, db_session=db.session
    )
    if not my_transactions:
        return []
    result = [
        {"transaction": item[0], "subscription_details": item[1]}
        for item in my_transactions
    ]

    return result


@account_router.get(
    "/me/transactions/{subs_id}/{auth_req_id}", response_model=list[TransactionResponse]
)
async def get_transaction(
    *, subs_id: int, auth_req_id: str, user: User = Depends(valid_token_user)
):
    my_transaction = await transaction_service.get_tx_by_id(
        auth_req_id=auth_req_id, subs_id=subs_id, db_session=db.session
    )
    if not my_transaction:
        return []

    return my_transaction

@account_router.post("/payment/receipts")
async def get_payment_receipt( *, subs_id: int, auth_req_id: str, user: User = Depends(valid_token_user)
):
    my_transaction = await transaction_service.get_tx_by_id(
        auth_req_id=auth_req_id, subs_id=subs_id, db_session=db.session
    )
    if my_transaction:
        tx = my_transaction[0]

        subscription = await subscription_service.get_by_field(value=tx.subscription_id,field="id", db_session=db.session)

        def format_date(date_str):
            ist_timezone = pytz.timezone('Asia/Kolkata')
            ist_datetime = date_str.astimezone(ist_timezone)
            formatted_date = ist_datetime.strftime("%b %d, %Y").upper()
            # formatted_time = ist_datetime.strftime("%I:%M %p")
            return formatted_date
        if subscription.plan.billing_frequency == 1: 
            freq = "Monthly"
        elif subscription.plan.billing_frequency == 3: 
            freq = "Quaterly" 
        elif subscription.plan.billing_frequency == 6: 
            freq = "Half Yealy" 
        elif subscription.plan.billing_frequency == 12: 
            freq = "Yearly" 
        else:
            None    
        
        file_loader = FileSystemLoader('src/templates/payment_templates')
        env = Environment(loader=file_loader)
        data = {"laex_icon":"src/assets/la-excellence-logo.svg","receipt_id":tx.id,"date": format_date(date_str=tx.created_at),"tx":tx,
                "username":user.full_name,"ph_no":user.phone_number,"email":user.email,"subscription":subscription,"freq":freq,
                "payment":tx,"disc_rate":subscription.discount.discount if subscription.discount else "N/A" ,
                "disc": subscription.discount.coupon_code if subscription.discount else "N/A", "tx_at":format_date(tx.tx_at),
                "next_pay_at":format_date(subscription.current_expiry_at),"sub_at":format_date(subscription.start_at) }
        template = env.get_template('payment_receipt.html')
        output = template.render(data)
        pdf_fileobj = HTML(string=output, base_url='.').write_pdf()
    
        pdf_encoded = base64.b64encode(pdf_fileobj).decode("utf-8")

        return {"report_name":"payment_report","data": pdf_encoded}



    if not my_transaction:
        return []

    return my_transaction

"""
UserQuota 
"""


@router.get("/me/quotas/consumed")
async def get_quota_consumed_by_plan_feature(
    *, user: User = Depends(CheckUserAccess())
):
    subs: Subscription = user.subscription
    if not user.subscription:
        result = [
        {
            "plan_name": None,
            "feature_name": None,
            "quota_name": None,
            "consumed":None,
        }
    ]

        return result

    current_expiry_at: datetime = subs and subs.current_expiry_at
    timezone = current_expiry_at and current_expiry_at.tzinfo
    current_date = datetime.now(timezone)

    current_monthly_expiry_at = current_date + relativedelta(day=current_expiry_at.day)
    prev_monthly_expiry = current_monthly_expiry_at + relativedelta(months=-1, day=current_expiry_at.day) if current_monthly_expiry_at > current_date else current_monthly_expiry_at
    next_monthly_expiry = prev_monthly_expiry + relativedelta(months=+1) 

   
    res = await user_quota_service.get_all_user_quota_consumed(
        user_id=user.id,
        subscription_id=user.subscription_id,
        from_date=prev_monthly_expiry.date(),
        till_date=next_monthly_expiry.date(),db_session=db.session
    )

    result = [
        {
            "plan_name": item[0],
            "feature_name": item[1],
            "quota_name": item[2],
            "consumed": item[3],
        }
        for item in res
    ]

    return result

"""
@router.get("/quotas/consumed")
async def quota_consumed(*, user: User = Depends(CheckUserAccess(subscr=True))):
    subs: Subscription = user.subscription
    user_plan: Plan = subs.plan
    user_features: list[Feature] = user_plan.features

    consumed_quota = []
    for feature in user_features:
        for quota in feature.get("quotas"):
            if not quota:
                PlanNotFound()
            current_expiry_at: datetime = subs and subs.current_expiry_at
            current_start_date: datetime = subs.start_at
            current_date = current_start_date
            month_dates = []

            while current_date < current_expiry_at + timedelta(days=2):
                month_dates.append(current_date)
                date = current_date.day
                next_month = current_date.replace(day=date) + timedelta(days=31)
                current_date = next_month.replace(
                    day=min(
                        current_start_date.day, (next_month - timedelta(days=1)).day
                    )
                )
            timezone = current_expiry_at and current_expiry_at.tzinfo

            date_now = datetime.now(timezone)
            for i in range(len(month_dates) - 1):
                if month_dates[i] <= date_now <= month_dates[i + 1]:
                    from_date = month_dates[i]
                    till_date = month_dates[i + 1]

            print("Mon>>>", month_dates, "FROM>>>", from_date, "tiL>>>", till_date)

            quota_consumed = await user_quota_service.get_user_quota_consumed(
                user_id=user.id,
                subscription_id=subs.id,
                plan_name=user_plan.name,
                feature_name=feature["name"],
                quota_name=quota["quota_name"],
                from_date=from_date,
                till_date=till_date,
                db_session=db.session,
            )
            consumed_quota.append(
                {
                    "quota_name": quota["quota_name"],
                    "feature_name": feature["name"],
                    "consumed": 0 if quota_consumed == None else quota_consumed,
                }
            )

    return consumed_quota
"""
