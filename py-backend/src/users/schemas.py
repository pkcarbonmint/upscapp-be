from enum import Enum
from typing import Optional, List, Any, TypeVar, Generic
from datetime import datetime
from pydantic import EmailStr, Field, ConfigDict, Json, UUID4
from src.base.schemas import BaseSchema, PhoneNumber
from src.constants import APP
from src.external.cms.schemas import SubjectCMS
from src.external.pg.schemas import *
from src.tenants.schemas import BranchResponse
from src.modules.products.schemas import ProductResponse


class TEST_TYPE(str, Enum):
    custom = "CUSTOM"
    totd = "TEST_OF_THE_DAY"
    pyq = "PYQ"
    model = "MODEL"
    current_affairs = "CURRENT_AFFAIRS"

class USER_TYPE(str, Enum):
    student = "STUDENT"
    workforce = "WORKFORCE"

class Gender(str, Enum):
    male = "Male"
    female = "Female"

class STATUS(str,Enum):
    active = "ACTIVE"
    inactive = "INACTIVE"
"""
Profile schemas
"""


class LangPaper(str, Enum):
    Assamese = "Assamese"
    Bengali = "Bengali"
    Gujarati = "Gujarati"
    Hindi = "Hindi"
    Kannada = "Kannada"
    Kashmiri = "Kashmiri"
    Konkani = "Konkani"
    Malayalam = "Malayalam"
    Manipuri = "Manipuri"
    Marathi = "Marathi"
    Nepali = "Nepali"
    Odiya = "Odiya"
    Punjabi = "Punjabi"
    Sanskrit = "Sanskrit"
    Sindhi = "Sindhi"
    Tamil = "Tamil"
    Telugu = "Telugu"
    Urdu = "Urdu"
    Bodo = "Bodo"
    Dogri = "Dogri"
    Maithili = "Maithili"
    Santhali = "Santhali"


class OptionalSubject(str, Enum):
    pass

class ProfileType(str, Enum):
    aspirant = "aspirant"
    mentor = "mentor"
    # evaluator = "evaluator"
    teacher = "teacher"
    others = "others"
    # coach = "coach"
    # author = "author"
    # editor = "editor"
    # organiser = "organiser"
    # executive = "executive"
    # manager = "manager"
    # counsellor = "counsellor"

class PROFILE_UNIT(str, Enum):
    per_day = "PER_DAY"
    per_hour = "PER_HOUR"
    per_week = "PER_WEEK"
    month = "MONTH"
    paper = "PAPER"
    year = "YEAR"

class AspirantProfile(BaseSchema):
    attempts: int | None = None
    target_year: str | None = None
    lead_id: str  | None = None
    prospect_id: str  | None = None
    # optional_subject: str | None = None
    # paper_a_language: str | None = None


class MentorProfile(BaseSchema):
    rate: int | None = None
    expertise_tag: list[SubjectCMS] | None = None


class OthersProfile(BaseSchema):
    rate: int | None = None
    expertise_tag: list[SubjectCMS] | None = None

class TeacherProfile(BaseSchema):
    rate: int | None = None
    expertise_tag: list[SubjectCMS] | None = None

class ProfileInfo(BaseSchema):
    attempts: int | None = None
    target_year: str | None = None
    lead_id: str  | None = None
    prospect_id: str  | None = None

    rate: int | None = None
    unit: PROFILE_UNIT | None = None
    expertise_tag: list[SubjectCMS] | None = None

class ProfileBase(BaseSchema):
    # profile_info:  AspirantProfile | MentorProfile | OthersProfile | TeacherProfile
    profile_info: ProfileInfo


class ProfileCreate(ProfileBase):
    profile_type: ProfileType


class ProfileUpdate(ProfileBase):
    pass


class ProfileResponse(ProfileCreate):
    id: int
    user_id: int
    is_active: bool

    model_config = ConfigDict(from_attributes=True)


"""
Plans & Subscriptions Schemas
"""


class BillingFrequency(int, Enum):
    monthly = 1
    quarterly = 3
    yearly = 12


class PaymentStatus(str, Enum):
    pending = "PENDING"
    failed = "FAILED"
    success = "SUCCESS"
    completed = "COMPLETED"
    created = "CREATED"
    notified = "NOTIFIED"


class TxType(str, Enum):
    subs_auth = "SUBS_AUTH"
    subs_debit = "SUBS_DEBIT"
    subs_payment = "SUBS_PAYMENT"
    subs_refund = "SUBS_REFUND"


class USER_ROLE(str, Enum):
    tenant_admin = "TENANT_ADMIN"
    mentor = "MENTOR"
    coach = "COACH"
    teacher = "TEACHER"
    evaluator = "EVALUATOR"
    author = "AUTHOR"
    editor = "EDITOR"
    super_admin = "SUPER_ADMIN"
    org_admin = "ORG_ADMIN"
    branch_admin = "BRANCH_ADMIN"
    front_desk_executive = "FRONT_DESK_EXECUTIVE"
    admission_counsellor = "ADMISSION_COUNSELLOR"
    admission_manager = "ADMISSION_MANAGER"
    content_author = "CONTENT_AUTHOR"
    content_editor = "CONTENT_EDITOR"
    content_author_prelims = "CONTENT_AUTHOR_PRELIMS"
    content_editor_prelims = "CONTENT_EDITOR_PRELIMS"
    content_author_mains = "CONTENT_AUTHOR_MAINS"
    content_editor_mains = "CONTENT_EDITOR_MAINS"
    content_reviewer = "CONTENT_REVIEWER"
    content_viewer = "CONTENT_VIEWER"
    evaluation_coordinator = "EVALUATION_COORDINATOR"
    evaluation_evaluator = "EVALUATION_EVALUATOR"
    evaluation_reviewer = "EVALUATION_REVIEWER"
    senior_management = "SENIOR_MANAGEMENT"
    # fee_manager = "FEE_MANAGER"
    student_administrator = "STUDENT_ADMINISTRATOR"
    product_admin = "PRODUCT_ADMIN"
    finance_manager = "FINANCE_MANAGER"
    director = "DIRECTOR"
    fee_collection_incharge = "FEE_COLLECTION_INCHARGE"
    finance_report_user =  "FINANCE_REPORT_USER"
    due_report_user = "DUE_REPORT_USER"
    collection_done_report_user = "COLLECTION_DONE_REPORT_USER"
    prelims_app_fin_report_user = "PRELIMS_APP_FINANCE_REPORT_USER"
    student_list_report_user = "STUDENT_LIST_REPORT_USER"
    walkin_report_user = "WALKIN_REPORT_USER"

class DiscountType(str, Enum):
    percent = "PERCENT"
    flat = "FLAT"


class SubscriptionStatus(str, Enum):
    inactive = "INACTIVE"
    active = "ACTIVE"
    pending = "PENDING"
    created = "CREATED"
    expired = "EXPIRED"
    paused = "PAUSED"
    cancelled = "CANCELLED"
    suspended = "SUSPENDED"
    revoked = "REVOKED"
    failed = "FAILED"
    cancel_in_progress = "CANCEL_IN_PROGRESS"


class Currency(str, Enum):
    INR = "INR"
    USD = "USD"


class FeatureName(str, Enum):
    prelims = "UPSC Prelims Package"
    mains = "UPSC Mains Package"
    interview = "UPSC Interview Package"


class QuotaName(str, Enum):
    test_create = "TEST_CREATE"  # custom test create
    test_attempt = "TEST_ATTEMPT"  # custom test attempt
    totd = "TEST_OF_THE_DAY"  # totd attempt
    pyq = "PYQ"  # pyq attempt
    model = "MODEL"  # model attempt
    mentor_request = "MENTOR_REQUEST"
    coach_request = "COACH_REQUEST"
    questions_used = "QUESTIONS_USED"


class Quota(BaseSchema):
    quota_name: QuotaName
    quota_allowed: int | None = None
    description: str | None = None
    is_monthly: bool = True


class UserQuotaBase(BaseSchema):
    pass


class UserQuotaCreate(UserQuotaBase):
    plan_name: str
    feature_name: FeatureName
    quota_name: QuotaName
    user_id: int
    subscription_id: int
    plan_id: int
    quota_consumed: int = 1


class UserQuotaUpdate(UserQuotaBase):
    pass


class UserQuotaResponse(UserQuotaCreate):
    id: int
    quota_consumed: int


class Feature(BaseSchema):
    name: FeatureName
    quotas: list[Quota] | None = None
    description: str | None = None
    sub_features: list[str] | None = None
 

class PlanBase(BaseSchema):
    pass


class PlanCreate(PlanBase):
    name: str
    description: str | None = None
    features: list[Feature] | None = None
    rate: int  # total price of the plan depending on billing frequency
    currency: Currency = Currency.INR
    billing_frequency: BillingFrequency = BillingFrequency.monthly
    pg_ref_id: str | None = None


class PlanUpdate(PlanBase):
    is_active: bool | None = None
    description: str | None = None
    features: list[Feature] | None = None


class PlanResponse(PlanBase):
    id: int
    name: str
    description: str | None = None
    features: list[Feature] | None = None
    rate: int  # total price of the plan depending on billing frequency
    currency: Currency = Currency.INR
    billing_frequency: BillingFrequency = BillingFrequency.monthly
    pg_ref_id: str | None = None
    is_active: bool
    tenant_id: int | None = None


class PlanBillingResp(BaseSchema):
    name: str | None = None


class DiscountCodeBase(BaseSchema):
    pass


class DiscountCodeCreate(DiscountCodeBase):
    coupon_code: str
    discount: int
    discount_type: DiscountType = DiscountType.percent
    currency: Currency = Currency.INR
    applicable_plan_id: int | None = None
    applicable_product_id: int | None = None
    max_use_count: int = 1
    shared_with: list[int] | None = None
    shared_with_phone_no: list[PhoneNumber] | None = None
    valid_from: datetime
    valid_to: datetime
    pg_ref_id: str | None = None

    # model_config = ConfigDict(arbitrary_types_allowed=True)


class DiscountCodeUpdate(DiscountCodeBase):
    is_active: bool | None = None


class DiscountCodeResponse(DiscountCodeBase):
    id: int
    coupon_code: str
    discount: int
    discount_type: DiscountType = DiscountType.percent
    currency: Currency = Currency.INR
    applicable_plan_id: int | None = None
    applicable_product_id: int | None = None
    applicable_plan: PlanResponse | None = None
    applicable_product: ProductResponse | None = None
    max_use_count: int | None = None
    actual_use_count: int | None = None
    shared_with: list[int] | None = None
    shared_with_phone_no: list[PhoneNumber] | None = None
    redeemed_by: list[int] | None = None

    valid_from: datetime
    valid_to: datetime | None = None
    pg_ref_id: str | None = None
    tenant_id: int | None = None

    is_active: bool

class PurchaseDiscResponse(DiscountCodeBase):
    product_discs:list[DiscountCodeResponse] | None = None
    combination_product_discs: list[DiscountCodeResponse] | None = None
    individual_discs: list[DiscountCodeResponse] | None = None


class SubscriptionBase(BaseSchema):
    pass


class SubscriptionCreate(SubscriptionBase):
    plan_id: int
    coupon_code: str | None = None
    free_trial: bool | None = False
    free_plan: bool | None = False
    pg_subs_info: PgSubsInfo | None = None


class SubscriptionUpdate(SubscriptionBase):
    current_expiry_at: datetime | None = None
    payment_status: PaymentStatus | None = None
    subscription_status: SubscriptionStatus | None = None
    pg_ref_id: str | None = None
    pg_data: PgSubsData | None = None


class SubscriptionResponse(SubscriptionUpdate):
    id: int
    plan: PlanResponse
    plan_id: int
    user_id: int | None = None
    discount: DiscountCodeResponse | None = None
    discount_id: int | None = None
    adjustment_amount: int | None = 0
    subscription_amount: int
    currency: Currency

    auto_renew: bool
    recurring_count: int
    start_at: datetime

    auth_req_id: str | None = None

    free_trial: bool | None = False
    free_plan: bool | None = False


class SubscriptionBillingResp(SubscriptionResponse):
    created_at: datetime | None = None
    updated_at: datetime | None = None


class PgSubsMandateCreate(BaseSchema):
    subscription_id: int
    payment_instrument: PaymentInstrument


class TransactionBase(BaseSchema):
    pass


class TransactionCreate(TransactionBase):
    paid_by: int | None = None
    paid_to: int | None = None
    subscription_id: int | None = None
    amount: int | None = None
    currency: str = "INR"
    payment_mode: str | None = None
    description: str | None = None
    tx_uuid: UUID4 | None = None
    tx_id: str | None = None
    tx_at: datetime | None = None
    tx_type: str | None = None
    tx_status: str | None = None


class TransactionUpdate(TransactionCreate):
    pg_ref_id: str | None = None
    pg_data: PgTxData | None = None


class TransactionResponse(TransactionUpdate):
    id: int
    paid_by: int | None = None
    paid_to: int | None = None
    subscription_id: int | None = None
    amount: int
    currency: str = "INR"
    payment_mode: str | None = None
    description: str | None = None
    pg_ref_id: str | None = None
    pg_data: PgTxData | None = None
    tx_id: str | None = None
    tx_uuid: UUID4 | None = None
    tx_at: datetime | None = None
    tx_type: str | None = None
    tx_status: str | None = None


"""
User schemas
"""


class LocationInfo(BaseSchema):
    name: str
    latitude: float | None = None
    longitude: float | None = None


class UserPreference(BaseSchema):
    with_omr_sheet: bool | None = None
    record_elimination_technique: bool | None = None
    current_affairs_only: bool | None = False
    tutor_mode: bool | None = False
    personalised_mentorship_preference: bool | None = False
    in_app_answering: bool | None = None
    download_and_upload: bool | None = None


class UserExistsResponse(BaseSchema):
    exists: bool
    active: bool | None = None
    tenant_id: int | None = None
    admin: bool | None = None
    domain: str | None = None


class UserBase(BaseSchema):
    phone_number: PhoneNumber


class UserCreate(UserBase):
    full_name: str | None = None
    email: EmailStr | None = None
    password: str | None = None
    roles: list[USER_ROLE] | None = None
    is_admin: bool | None = False
    tenant_id: int
    about_me: str | None = None
    user_type: USER_TYPE | None = None #student,workforce 
    tagline: str | None = None
    is_external: bool | None = None

    # password: str | None = None


class UserRegister(UserBase):
    pass

class UserRegisterPwd(UserBase):
    password: str | None = None

class UserOnboard(BaseSchema):
    email: EmailStr | None = None
    full_name: str
    # age: int | None = None
    gender: Gender | None = None
    about_me: str | None = None
    user_type: USER_TYPE | None = USER_TYPE.student
    photo: str | None = None
    referred_by_id: int | None = None
    referred_by_phone: PhoneNumber | None = None

class UserV2Onboard(BaseSchema):
    email: EmailStr | None = None
    full_name: str
    # age: int | None = None
    gender: Gender | None = None
    password: str | None = None
    about_me: str | None = None
    user_type: USER_TYPE | None = USER_TYPE.student
    photo: str | None = None
    referred_by_id: int | None = None
    referred_by_phone: PhoneNumber | None = None


class UserIsOnboard(UserOnboard):
    is_onboarded: bool | None

class UserV2IsOnboard(UserV2Onboard):
    is_onboarded: bool | None


class UserUpdate(BaseSchema):
    # phone_number: PhoneNumber | None = None
    # email: EmailStr | None = None
    # username: str | None = None
    full_name: str | None = None
    # age: int | None = None
    gender: Gender | None = None
    # location: str | None = None
    about_me: str | None = None
    photo: str | None = None
    user_preferences: UserPreference | None = None

    roles: list[USER_ROLE] | None = None
    subscription_id: int | None = None

    is_active: bool | None = None
    email_verified: bool | None = None
    phone_verified: bool | None = None

    tagline: str | None = None
    is_external: bool | None = None

    # free_trial_used: bool | None = None
    # test_attempts_count: int | None = None

class UserV2Update(BaseSchema):
    phone_number: PhoneNumber | None = None
    email: EmailStr | None = None
    # username: str | None = None
    full_name: str | None = None
    # age: int | None = None
    gender: Gender | None = None
    # location: str | None = None
    about_me: str | None = None
    photo: str | None = None
    photo_lock_enabled: bool | None = None
    user_preferences: UserPreference | None = None

    roles: list[USER_ROLE] | None = None
    subscription_id: int | None = None

    is_active: bool | None = None
    email_verified: bool | None = None
    phone_verified: bool | None = None

    tagline: str | None = None
    is_external: bool | None = None
    user_type: USER_TYPE | None = None #student,workforce 

    # free_trial_used: bool | None = None
    # test_attempts_count: int | None = None

class UserV2Register(UserBase):
    tenant_id: int
    full_name: str | None = None
    photo: str | None = None
    phone_number: PhoneNumber
    email: EmailStr
    gender: Gender | None = None
    profile_info: AspirantProfile | None = None

class UserV2RegisterPwd(UserBase):
    tenant_id: int
    full_name: str | None = None
    photo: str | None = None
    phone_number: PhoneNumber
    email: EmailStr
    password: str | None = None
    gender: Gender | None = None
    profile_info: AspirantProfile | None = None
   
class UserV2UpdatePwd(BaseSchema):
    user_id : int
    password: str

class UserResponse(UserUpdate):
    id: int
    tenant_id: int | None = None
    phone_number: PhoneNumber | None = None
    email: EmailStr | None = None

    is_onboarded: bool | None = None
    is_deleted: bool | None = None

    is_admin: bool | None = None
    is_superadmin: bool | None = None

    roles: list[USER_ROLE] | None = None

    free_trial_used: bool | None = None
    test_attempts_count: int | None = None
    referred_by_id: int | None = None

    subscription: SubscriptionResponse | None = None

    profiles: list[ProfileResponse] | None = None

    user_type: USER_TYPE | None = None #student,workforce 
    tagline: str | None = None
    is_external: bool | None = None
    photo_lock_enabled: bool | None = None


    model_config = ConfigDict(from_attributes=True)

class UserBranchResponse(BaseSchema):

    id: int
    tenant_id: int | None = None
    full_name: str | None = None
    phone_number: PhoneNumber | None = None
    email: EmailStr | None = None
    about_me: str | None = None
    photo: str | None = None

    is_onboarded: bool | None = None
    is_deleted: bool | None = None
    is_active: bool | None = None

    is_admin: bool | None = None
    is_superadmin: bool | None = None

    roles: list[USER_ROLE] | None = None

    free_trial_used: bool | None = None
    test_attempts_count: int | None = None
    referred_by_id: int | None = None

    profiles: list[ProfileResponse] | None = None

    user_type: USER_TYPE | None = None #student,workforce 
    tagline: str | None = None
    is_external: bool | None = None

    branches: list[BranchResponse] | None = []

    model_config = ConfigDict(from_attributes=True)


class UserTenantResponse(UserUpdate):
    id: int
    tenant_id: int | None = None
    phone_number: PhoneNumber | None = None
    email: EmailStr | None = None

    is_onboarded: bool | None = None

    is_admin: bool | None = None
    is_superadmin: bool | None = None


    free_trial_used: bool | None = None
    test_attempts_count: int | None = None

    subscription: SubscriptionBillingResp | None = None

    profiles: list[ProfileResponse] | None = None

    model_config = ConfigDict(from_attributes=True)


class UserBasicInfo(BaseSchema):
    id: int
    full_name: str | None = None
    location: str | None = None
    about_me: str | None = None
    photo: str | None = None

class UserReferralResponse(BaseSchema):
    referee_id: int
    referee_joined: datetime
    referee_name: str
    referee_phno: PhoneNumber
    referrer_id: int
    referrer_name: str
    referrer_phno: PhoneNumber

# class UserBillingResponse(BaseSchema):
#     id: int | None = None
#     full_name: str | None = None
#     photo: str | None = None
# subscription: SubscriptionResponse | None = None


class TenantBillingResponse(BaseSchema):
    User: UserBasicInfo | None = None
    Subscription: SubscriptionBillingResp | None = None


class TenantReportsResponse(TenantBillingResponse):
    # User: UserBillingResponse | None = None

    tenant_logo: str | None = None
    brand_name: str | None = None
    tenant_domain: str | None = None


class StudentSubsResponse(BaseSchema):
    Subscription: SubscriptionBillingResp | None = None
    Transaction: TransactionResponse | None = None

class UserEnrolledResponse(BaseSchema):
    id:int
    full_name: str | None = None
    email: EmailStr | None = None
    tenant_id: int | None = None
    phone_number: PhoneNumber | None = None
    is_onboarded: bool | None = None
    is_deleted: bool | None = None
    is_admin: bool | None = None
    is_superadmin: bool | None = None
    is_active: bool | None = None
    roles: list[USER_ROLE] | None = None 
    tagline: str | None = None
    tenant_id: int
    # age: int | None = None
    gender: Gender | None = None
    # location: str | None = None
    about_me: str | None = None
    photo: str | None = None
    
class UserWorkforceCreate(BaseSchema):
    full_name: str | None = None
    user_type: USER_TYPE | None = None #student,workforce   
    phone_number: PhoneNumber | None = None
    email: EmailStr | None = None
    roles: list[USER_ROLE] | None = None 
    tagline: str | None = None
    location: str | None = None
    about_me: str | None = None
    photo: str | None = None   
    tenant_id: int
    branch_id: int 
    is_external: bool | None = None

   
class UserWorkforceResponse(UserWorkforceCreate):
    id:int


class BranchUserBase(BaseSchema):
   pass 

class BranchUserCreate(BranchUserBase):
    branch_id: int 
    user_id: int   

class BranchUserUpdate(BranchUserBase):
    pass 
    
class BranchUserResponse(BranchUserBase):
    id:int
    branch_id: int 
    user_id: int 

class RoleBase(BaseSchema):
    pass 

class RoleCreate(RoleBase):
    role: USER_ROLE
    apps: list[APP] | None = []

class RoleUpdate(RoleBase):
    apps: list[APP] | None = []

class RoleResponse(RoleCreate):
    id:int    

class UserRoleBase(BaseSchema):
   pass 

class UserRoleCreate(UserRoleBase):
    branch_id: int | None = None
    user_id: int   
    role_id:int | None = None

class UserRoleUpdate(UserRoleBase):
    branch_id: int 
    role_id:int
    
class UserRoleResponse(UserRoleBase):
    id:int
    branch_id: int  | None = None
    user_id: int 
    role_id:int | None = None

class RoleUserResponse(UserRoleBase):
    role: USER_ROLE | None = None
    apps: list[APP] | None = []
    id:int | None = None
    user_role_id: int| None = None

class BranchRoleResponse(BranchResponse):
    roles: list[RoleUserResponse] | None = []
    
class UserRoleBranchResponse(BaseSchema):
    id: int 
    tenant_id: int | None = None
    full_name: str | None = None
    phone_number: PhoneNumber | None = None
    email: EmailStr | None = None
    about_me: str | None = None
    photo: str | None = None
    photo_lock_enabled: bool | None = None

    is_onboarded: bool | None = None
    is_deleted: bool | None = None
    is_active: bool | None = None

    is_admin: bool | None = None
    is_superadmin: bool | None = None

    user_preferences: UserPreference | None = None
    roles: list[USER_ROLE] | None = None

    free_trial_used: bool | None = None
    test_attempts_count: int | None = None
    referred_by_id: int | None = None

    profiles: list[ProfileResponse] | None = None

    user_type: USER_TYPE | None = None #student,workforce 
    tagline: str | None = None
    is_external: bool | None = None

    branches: list[BranchRoleResponse] | None = []

    model_config = ConfigDict(from_attributes=True)

class StudentCardIn(BaseSchema):
    student_id: int
    offering_id: int
    product_id: int

class WorkforceCardIn(BaseSchema):
    workforce_id: int
    branch_name: str

class TxUpdate(BaseSchema):
    id: int
    paid_to: int | None = None
    paid_by: int | None = None
    amount:int | None = None
    payment_mode: str | None = None
