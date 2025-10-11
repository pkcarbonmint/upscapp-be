from pydantic import ConfigDict, EmailStr, PlainSerializer
from src.base.schemas import BaseSchema, PhoneNumber
from src.base.schemas import BaseSchema
from enum import Enum
from datetime import datetime, date, time
from typing import Annotated, Optional, Union
from src.constants import APP
from src.external.pg.schemas import REDIRECT_MODE, SUBS_FLOW_TYPE, DeviceContext, PayInstrument
from src.tenants.schemas import BranchResponse
from src.external.cms.schemas import ExamCMS,StageCMS,PaperCMS,SubjectCMS
from typing import Optional, Dict, List, Any

class BillingFrequency(int, Enum):
    monthly = 1
    quarterly = 3
    yearly = 12

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



class OFFERING_TYPE(str, Enum):
    program = "PROGRAM"
    standalone = "STANDALONE"

class OFFERING_SUB_TYPE(str,Enum):
    mentorship = "MENTORSHIP"
    test_series = "TEST_SERIES"
    interview_program = "INTERVIEW_PROGRAM"
    courses = "COURSES"
    materials = "MATERIALS"
    qbank = "QBANK"
    misc = "MISC"

class OFFERING_CATEGORY(str,Enum):
    foundation_courses = "FOUNDATION_COURSES"
    value_addition_courses = "VALUE_ADDITION_COURSES"
    interview_programs = "INTERVIEW_PROGRAMS"
    state_service_exams = "STATE_SERVICE_EXAMS"
    others = "OTHERS"
    optional = "OPTIONAL"

class STATUS(str,Enum):
    draft = "DRAFT"
    published = "PUBLISHED"
    un_published = "UNPUBLISHED"
    active = "ACTIVE"
    inactive = "INACTIVE"
    deactivate = "DEACTIVATE"

class PURCHASE_STATUS(str,Enum):
    created = "CREATED"
    pending = "PENDING"
    inactive = "INACTIVE"
    active = "ACTIVE"
    completed = "COMPLETED"
    expired = "EXPIRED"
    paused = "PAUSED"
    cancelled = "CANCELLED"
    failed = "FAILED"
    refunded = "REFUNDED"
    provisionally_paid = "PROVISIONALLY_PAID"

class PURCHASE_TYPE(str,Enum):
    book = "BOOK"
    buy = "BUY"

class PRICING_MODEL(str,Enum):
    one_time = "ONE_TIME"
    recurring = "RECURRING"   

class ENROLLED_AS(str,Enum):
    student = "STUDENT"
    teacher = "TEACHER"
    mentor = "MENTOR"
    guide = "GUIDE"

class ENROLLMENT_STATUS(str,Enum):
    draft = "DRAFT"
    published = "PUBLISHED"
    active = "ACTIVE"
    inactive = "INACTIVE"
    
class BREAK_UP_CATEGORY(str,Enum):
    booking_price = "BOOKING_PRICE"
    selling_price = "SELLING_PRICE"
    early_bird_price = "EARLY_BIRD_PRICE"

class USER_TYPE(str, Enum):
    student = "STUDENT"
    workforce = "WORKFORCE"

class ProfileType(str, Enum):
    mentor = "mentor"
    aspirant = "aspirant"
    teacher = "teacher"
    others = "others"

class INSTALLMENT_STATUS(str,Enum):
    created = "CREATED"
    pending = "PENDING"
    provisionally_paid = "PROVISIONALLY_PAID"
    completed = "COMPLETED"
    inactive = "INACTIVE"
    active = "ACTIVE"
    expired = "EXPIRED"
    paused = "PAUSED"
    cancelled = "CANCELLED"
    failed = "FAILED"
    refunded = "REFUNDED"

class TX_STATUS(str,Enum):
    created = "CREATED"
    pending = "PENDING" #included
    provisionally_paid = "PROVISIONALLY_PAID" #included
    inactive = "INACTIVE"
    active = "ACTIVE"
    completed = "COMPLETED" #included
    expired = "EXPIRED"
    paused = "PAUSED"
    cancelled = "CANCELLED"
    failed = "FAILED" #included
    refunded = "REFUNDED" #included

class PAYMENT_MODE(str,Enum):
    # payment_gateway = "PAYMENT_GATEWAY"
    cash = "CASH"
    cheque = "CHEQUE"
    upi_intent_flow = "UPI_INTENT"
    collect_flow = "UPI_COLLECT"
    qr_flow = "UPI_QR"
    remote_payment = "REMOTE_PAYMENT" # offsite payment
    payment_link = "PAYMENT_LINK"
    others = "OTHERS"
      
class PAID_TYPE(str,Enum):
    upi = "UPI"
    card = "CARD"
    netbanking = "NETBANKING"

class WALKINFORM_TYPE(str,Enum):
    foundation_course = "FOUNDATION_COURSE"
    interview_guidance_program = "INTERVIEW_GUIDANCE_PROGRAM"
    optional = "OPTIONAL"
    value_addition_or_state_exams = "VALUE_ADDITION_OR_STATE_EXAMS"
    mentorship = "MENTORSHIP"
    intermediate = "INTERMEDIATE"
    ias_or_degree = "IAS_OR_DEGREE"
    school = "SCHOOL"
    default = "DEFAULT"

class AspirantProfile(BaseSchema):
    attempts: int | None = None
    target_year: str | None = None
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


class ProfileResponse(BaseSchema):
    profile_info: MentorProfile | OthersProfile | TeacherProfile | AspirantProfile
    profile_type: ProfileType | None = None
    id: int
    user_id: int
    is_active: bool

    model_config = ConfigDict(from_attributes=True)

class UserResponse(BaseSchema):
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


    model_config = ConfigDict(from_attributes=True)


class RoleUserResponse(BaseSchema):
    role: USER_ROLE | None = None
    apps: list[APP] | None = []
    id:int | None = None
    user_role_id: int| None = None

class BranchRoleResponse(BaseSchema):
    id:int | None = None
    name: str
    address: str | None = None
    photo:str | None = None
    city:str | None = None
    pincode:int | None = None 
    phone_number: PhoneNumber | None = None
    email:str | None = None
    status:STATUS | None = None
    tenant_id:int | None = None
    roles: list[RoleUserResponse] | None = []

class PurInstNotes(BaseSchema):
    user_name: str | None = None
    user_id: int | None = None
    date: str | None = None
    time: str | None = None
    comment: str | None = None
    student_reason: str | None = None

class Material(BaseSchema):
    id: int | None = None
    name: str | None = None
    file_type: str | None = None
    material_type: str | None = None
    exam: str | None = None
    subject: str | None = None
    topic: str | None = None
   
class RelatedCourses(BaseSchema):
    id:int
    name: str

class ProdQuotaName(str, Enum):
    test_create = "TEST_CREATE"  # custom test create
    test_attempt = "TEST_ATTEMPT"  # custom test attempt
    totd = "TEST_OF_THE_DAY"  # totd attempt
    pyq = "PYQ"  # pyq attempt
    model = "MODEL"  # model attempt
    questions_used = "QUESTIONS_USED"

class TimePeriod(str,Enum):
    month = "MONTH"
    quarter = "QUARTER"
    year = "YEAR"

class ProdQuota(BaseSchema):
    quota_name: ProdQuotaName
    quota_allowed: int | None = None
    description: str | None = None

class QBank(BaseSchema):
    quotas: list[ProdQuota] | None = None
    time_period: TimePeriod | None = None # month, quarter, year

class OfferingDetails(BaseSchema):
    related_courses: list[RelatedCourses] | None = None
    description: str | None = None
    optional_subject: SubjectCMS | None = None
    # stage: str | None = None
    # subjects: list[str] | None = None

class BatchDetails(BaseSchema):
    pass
    # allow_booking: bool | None = False
    # allow_early_bird_price: bool | None = False
    # test_count: int | None = None

class ProductDetails(BaseSchema):
    material_info: Material | None = None
    q_bank_info: QBank | None = None
    test_count: int | None = None
    
class PriceBreakUp(BaseSchema):
    break_up_category: BREAK_UP_CATEGORY | None = None
    name: str
    legal_entity: str | None = None
    gst_percent: int
    gstn: str | None = None
    base_price: int
    added_gst: int
    total_price: int

class InstallmentLegalEntity(BaseSchema):
    breakup_name: str | None = None
    tenant_id: int | None = None # this field is to get and update the tenant
    name: str | None = None #legal entity name
    GSTIN: str | None = None
    GST_rate: int | None = None

class OfferingBase(BaseSchema):
    pass

class OfferingCreate(OfferingBase):
    offering_type: OFFERING_TYPE 
    offering_sub_type: OFFERING_SUB_TYPE 
    offering_category: str
    walkin_category: WALKINFORM_TYPE | None = None
    display_seq_id: int | None = None
    is_batch_offering: bool | None = False
    name: str | None = None
    photo: str | None = None
    exams: list[ExamCMS]
    stages: list[StageCMS]| None = []
    papers: list[PaperCMS]| None = []
    subjects: list[SubjectCMS] | None = []
    offering_details: OfferingDetails | None = None
    status: STATUS = STATUS.draft
    
class OfferingUpdate(OfferingBase):
    name: str | None = None
    photo: str | None = None
    display_seq_id: int | None = None
    exams: list[ExamCMS] | None = None
    walkin_category: WALKINFORM_TYPE | None = None
    stages: list[StageCMS]| None = []
    papers: list[PaperCMS]| None = []
    subjects: list[SubjectCMS] | None = []
    offering_details: OfferingDetails | None = None

    # is_active: bool | None = False
    # start_at: datetime | None = None

class OfferingResponse(OfferingCreate):
    id: int
    


class BatchBase(BaseSchema):
    pass

class BatchCreate(BatchBase):
    offering_id: int
    # branch_id: int | None = None
    # name: str | None = None
    # code: str | None = None
    max_students: int | None = 1			
    batch_details: BatchDetails | None = None	
    enrollment_close_date: datetime | None = None
    planned_start_date: datetime | None = None
    planned_end_date: datetime | None = None 
    duration: int | None = None
    batch_incharge: int | None = None
    status : STATUS = STATUS.draft
   

class BatchUpdate(BatchBase):
    # branch_id: int | None = None
    # name: str | None = None
    # code: str | None = None
    max_students: int | None = None
    students_enrolled: int | None = None
    batch_details: BatchDetails | None = None
    enrollment_close_date: datetime | None = None
    planned_start_date: datetime | None = None
    planned_end_date: datetime | None = None 
    actual_start_date: datetime | None = None	
    actual_end_date: datetime | None = None 
    batch_incharge: int | None = None

class BatchResponse(BatchCreate,BatchUpdate):
    id:int   | None = None  
    # branch: BranchResponse | None = None  



class PriceBase(BaseSchema):
    pass 

class PriceCreate(PriceBase):
    product_id:int
    pricing_model: PRICING_MODEL | None = None  
    booking_price: int | None = None 
    selling_price: int | None = None 
    early_bird_price: int | None = None 
    discounted_price: int | None = None 	
    effective_date: datetime | None = None
    expiry_date: datetime | None = None
    early_bird_valid_until: datetime | None = None

class PriceUpdate(PriceBase):
    product_id:int| None = None  
    pricing_model: PRICING_MODEL | None = None  
    booking_price: int | None = None 
    selling_price: int | None = None 
    early_bird_price: int | None = None 
    discounted_price: int | None = None 	
    effective_date: datetime | None = None
    expiry_date: datetime | None = None
    early_bird_valid_until: datetime | None = None
    pricing_model: PRICING_MODEL | None = None  
    price_break_up: list[PriceBreakUp] | None = None


class PriceResponse(PriceBase):
    id: int 
    pricing_model: PRICING_MODEL | None = None  
    booking_price: int | None = None 
    selling_price: int | None = None 
    early_bird_price: int | None = None 
    discounted_price: int | None = None 	
    effective_date: datetime | None = None
    expiry_date: datetime | None = None
    early_bird_valid_until: datetime | None = None
    pricing_model: PRICING_MODEL | None = None  
    price_break_up: list[PriceBreakUp] | None = None





class ProductBase(BaseSchema):
    pass 

class ProductCreate(ProductBase):
    offering_id: int
    batch_id:int | None = None
    price_id:int | None = None
    branch_id: int | None = None
    name: str | None = None
    code: str | None = None
    product_details: ProductDetails | None = None
    allow_installments: bool = False
    allow_booking: bool | None = False
    allow_early_bird: bool | None = False
    status: STATUS | None = STATUS.draft
   
    
class ProductUpdate(ProductBase):
    batch_id:int | None = None
    price_id:int | None = None
    branch_id: int | None = None
    name: str | None = None
    code: str | None = None
    product_details: ProductDetails | None = None
    allow_installments: bool = False
    allow_booking: bool | None = False
    allow_early_bird: bool | None = False

class ProductResponse(ProductCreate):
    id:int
    offering: OfferingResponse| None = None
    batch: BatchResponse | None = None
    price: PriceResponse| None = None
    branch: BranchResponse | None = None  

class ProdResp(BaseSchema):
    id:int
    name: str | None = None
    code: str | None = None
    offering: OfferingResponse| None = None
    
# class ProdPriceSchema(BaseSchema):
#     pricing_model: PRICING_MODEL | None = None  
#     booking_price: int | None = None 
#     selling_price: int | None = None 
#     early_bird_price: int | None = None 
#     discounted_price: int | None = None 	
#     effective_date: datetime | None = None
#     expiry_date: datetime | None = None
#     early_bird_valid_until: datetime | None = None
#     product_details: ProductDetails | None = None
#     offering_id: int
#     batch_id:int | None = None


class EnrollmentBase(BaseSchema): 
    pass

class EnrollmentCreate(EnrollmentBase):
    enrolled_as: ENROLLED_AS
    enrolled_user_id: int
    batch_id:int | None = None
    offering_id:int
    product_id:int | None = None
    enrollment_status: ENROLLMENT_STATUS
    assigned_mentor_id:int | None = None 
    assigned_guide_id:int | None = None 

class EnrollmentUpdate(EnrollmentBase):
    product_id:int | None = None
    batch_id:int | None = None
    assigned_mentor_id:int | None = None 
    assigned_guide_id:int | None = None 

class EnrollmentResponse(EnrollmentCreate,EnrollmentUpdate):
    id:int  
    enrolled_user: UserResponse  | None = None 
    branches :list[BranchRoleResponse] | None = []

class EnrollmentProduct(BaseSchema):
    enrolled_user_id:int | None = None 
    assigned_mentor_id:int | None = None 
    assigned_guide_id:int | None = None 

class EnrollmentBatchUpdate(BaseSchema):
    old_offering_id: int
    offering_id:int 
    old_product_id:int
    product_id:int
    old_batch_id: int
    batch_id:int
    price_id:int
    new_purchase_amount: int
    purchase_id:int

class StudentGuideSchema(BaseSchema):
    product_id:int
    batch_id:int

class PurchaseDetails(BaseSchema):
    #for personlaized mentorship
    subjects: list[SubjectCMS] | None = None
    optional_subject: SubjectCMS | None = None
    duration: int | None = None

    info: str | None = None

class PurchasesCreate(BaseSchema):

    product_id: int
    price_id:int
    student_id: int
    admission_id:int | None = None
    purchase_type: PURCHASE_TYPE | None  = PURCHASE_TYPE.buy
    pricing_model: PRICING_MODEL | None = PRICING_MODEL.one_time
    intallments_count: int | None = 0
    quantity: int | None = 1
    amount: int | None = 0
    purchase_date: datetime
    discount_id:int | None = None
    discount_amount:int | None = None
    additional_discount_id: int | None = None
    additional_disc_amt: int | None = None

    purchase_details: PurchaseDetails | None = None

    legal_entity_details: InstallmentLegalEntity | None = None

   
    # total_amount: int | None = 0
    # purchase_installments: list[InstallmentSchema] = []

class FDPurchaseSchema(BaseSchema):
    purchases: list[PurchasesCreate]
    # manager_disc_id: int | None = None
    # manager_disc_amt: int | None = None

class PurchaseInstallmentBase(BaseSchema):
    pass 

class PurchaseInstallmentCreate(PurchaseInstallmentBase):
    price_id: int | None = None
    product_id: int | None = None
    # tier_price_id: int | None = None
    purchase_id: int
    # transaction_id: int | None = None

    installment_date: datetime | None = None
    installment_amount: int
    installment_status: INSTALLMENT_STATUS

    is_original: bool | None = None

    legal_entity_details: InstallmentLegalEntity | None = None

    # pay_now: bool | None = False
    # intallments_count: int | None = 0

class PurchaseInstallmentUpdate(PurchaseInstallmentBase):
    # transaction_id: int | None = None
    installment_date: datetime | None = None
    installment_amount: int | None = None
    notes: list[PurInstNotes] | None = None
    legal_entity_details: InstallmentLegalEntity | None = None
    # installment_status: INSTALLMENT_STATUS

class PurchaseInstallmentResponse(PurchaseInstallmentBase):
    id:int | None = None
    price_id: int | None = None
    product_id: int | None = None
    # tier_price_id: int | None = None
    purchase_id: int | None = None
    transaction_id: int | None = None
    is_original: bool | None = None
    installment_date: datetime | None = None
    original_installment_date: datetime | None = None
    installment_amount: int | None = None
    original_installment_amount: int | None = None
    installment_status: INSTALLMENT_STATUS | None = None
    is_deleted: bool | None = None
    notes: list[PurInstNotes] | None = None
    legal_entity_details: InstallmentLegalEntity | None = None

class PayTxData(BaseSchema):
    account_holder_name: str| None = None
    account_number: str | None = None
    bank_name: str | None = None
    check_number: str | None = None
    date: Optional[Annotated[date, PlainSerializer(lambda dt: dt.isoformat())]]
    amount:int | None = None
    collected_by: int | None = None # user_id

    check_image_url: str | None = None

    # cash
    time: Optional[Annotated[time, PlainSerializer(lambda dt: dt.isoformat())]]
    
    # # online
    payer_name: str | None = None
    tx_image_url: str | None = None
    online_tx_id: int | None = None

    remarks: str | None = None

    purchase_ids: list[int] | None = None
    purchase_installment_ids: list[int] | None = None

class PayTxDataResp(BaseSchema):
    account_holder_name: str| None = None
    account_number: str | None = None
    bank_name: str | None = None
    check_number: str | None = None
    cheque_date: str | None = None
    # date: Optional[Annotated[date, PlainSerializer(lambda dt: dt.isoformat())]]
    date: str | None = None
    amount:int | None = None
    collected_by: int | None = None # user_id

    check_image_url: str | None = None

    # cash
    # time: Optional[Annotated[time, PlainSerializer(lambda dt: dt.isoformat())]] = None
    # time: Optional[Union[time, Annotated[time, PlainSerializer(lambda t: t.isoformat())]]]
    time: str | None = None

    # # online
    payer_name: str | None = None
    tx_image_url: str | None = None
    online_tx_id: int | None = None

    remarks: str | None = None

    purchase_ids: list[int] | None = None
    purchase_installment_ids: list[int] | None = None

class PayTxOfflineData(BaseSchema):
    account_holder_name: str| None = None
    account_number: str | None = None
    bank_name: str | None = None
    check_number: str | None = None
    cheque_date: Optional[Annotated[date, PlainSerializer(lambda dt: dt.isoformat())]]
    date: Optional[Annotated[date, PlainSerializer(lambda dt: dt.isoformat())]]
    amount:int | None = None
    collected_by: int | None = None # user_id

    check_image_url: str | None = None

    # cash
    time: Optional[Annotated[time, PlainSerializer(lambda dt: dt.isoformat())]]

    # # online
    payer_name: str | None = None
    tx_image_url: str | None = None
    online_tx_id: int | None = None

    remarks: str | None = None

class TxPayData(BaseSchema):
    purchase_ids: list[int] | None = None
    purchase_installment_ids: list[int] | None = None


class PayUpdateTxData(BaseSchema):
     # online
    payer_name: str | None = None
    tx_image_url: str | None = None
    online_tx_id: int | None = None
    date: Optional[Annotated[date, PlainSerializer(lambda dt: dt.isoformat())]]
    time: Optional[Annotated[time, PlainSerializer(lambda dt: dt.isoformat())]]
    amount:int | None = None

class LinkTxData(BaseSchema):
    purchase_ids: list[int] | None = None
    purchase_installment_ids: list[int] | None = None
    accept_partial: bool | None = None
    amount: int
    amount_paid: int
    callback_method: str | None = None
    callback_url: str | None = None
    cancelled_at: int | None = None
    created_at: int | None = None
    currency: str | None = None
    customer: dict | None = None
    description: str | None = None
    expire_by: int | None = None
    expired_at: int | None = None
    first_min_partial_amount: int | None = None
    id: str
    order_id: str | None = None
    notes: Dict[str, str] | None = None
    notify: dict | None = None
    payments: Optional[Any] | None = None  # could be None or a list of payments
    reference_id: str | None = None
    reminder_enable: bool | None = None
    reminders: Any | None = None  # empty list or list of reminder objects
    short_url: str
    status: str | None = None
    updated_at: int | None = None
    upi_link: bool | None = None
    user_id: str | None = None

class PurchaseBase(BaseSchema):
    pass 

class PurchaseCreate(PurchaseBase):
    product_id: int  | None = None 
    price_id: int  | None = None 
    tier_price_id: int  | None = None 
    student_id: int
    admission_id: int | None = None 
    purchase_type: PURCHASE_TYPE  | None = PURCHASE_TYPE.buy
    quantity: int | None = 0
    amount: int | None = 0
    intallments_count: int | None = 0
    purchase_date: datetime
    pricing_model: PRICING_MODEL | None = PRICING_MODEL.one_time
    discount_id: int | None = None
    discount_amount: int | None = 0
    additional_discount_id:int | None = None
    additional_disc_amt:int | None = None
    total_amount: int | None = 0
    billing_frequency: BillingFrequency | None = None
    recurring_count: int  | None = 0
    purchase_status: PURCHASE_STATUS 
    transaction_id: int  | None = None 
    purchase_details: PurchaseDetails | None = None
    legal_entity_details: InstallmentLegalEntity | None = None

class PurchaseUpdate(PurchaseBase):
    admission_id: int | None = None
    # discount_id: int | None = None
    # discount_amount: int | None = 0
    total_amount: int | None = 0
    product_id: int  | None = None 
    price_id: int  | None = None 
    # quantity: int | None = 0
    purchase_status: PURCHASE_STATUS | None = None
    intallments_count: int | None = 0
    refund_tx_id:  int | None = None
    refund_amount:  int | None = None
    additional_discount_id:int | None = None
    additional_disc_amt:int | None = None
    # purchase_details: PurchaseDetails | None = None
    legal_entity_details: InstallmentLegalEntity | None = None
    # tx_data: PayUpdateTxData | None = None
    # transaction_id: int  | None = None
    # purchase_type: PURCHASE_TYPE | None  = PURCHASE_TYPE.buy

class PurchaseReponse(PurchaseCreate):
    id:int
    refund_tx_id:  int | None = None
    refund_amount:  int | None = None
    purchase_installments: list[PurchaseInstallmentResponse] | None = None

class UserResp(BaseSchema):
    id: int
    full_name: str | None = None
    photo: str | None = None
    is_active: bool | None = None
    phone_number: PhoneNumber | None = None
    email: EmailStr | None = None

class AdmissionResponse(BaseSchema):
    id: int
    status: str | None = None
    user: UserResp
    branch: BranchResponse | None = None
    
class UserPurchaseResponse(BaseSchema):
    due_amount: int | None = None
    tx_at: datetime | None = None
    Purchase: PurchaseReponse
    Product: ProdResp
    Admission: AdmissionResponse | None = None

class UserPurchaseRespData(BaseSchema):
    data: list[UserPurchaseResponse] = []

class PaymentInstrument(BaseSchema):
    type: PAID_TYPE | None = None
    utr: str | None = None
    target_app: str | None = None
    vpa: str | None = None

    card_type: str | None = None
    pg_transaction_id: str | None = None
    bank_transaction_id: str | None = None
    pg_authorization_code: str | None = None
    pg_service_transaction_id: str | None = None
    arn: str | None = None
    bankId: str | None = None
    brn: str | None = None
    
class PayPgData(BaseSchema):
    merchant_id: str | None = None
    merchant_transaction_id: str | None = None
    transaction_id: str | None = None
    amount: int | None = None
    state: TX_STATUS | None = None
    response_code: str | None = None
    payment_instrument: PaymentInstrument | None = None

class AcquirerData(BaseSchema):
    bank_transaction_id: Optional[str] = None
    rrn: Optional[str] = None
    auth_code: Optional[str] = None
    arn: Optional[str] = None
    transaction_id: Optional[str] = None

class UPIData(BaseSchema):
    vpa: Optional[str] = None

class RazorpayPayment(BaseSchema):
    id: str
    entity: str| None = None
    amount: int | None = None
    currency: str | None = None
    status: str | None = None
    order_id: str | None = None
    invoice_id: Optional[str]| None = None
    international: bool | None = None
    method: str | None = None
    amount_refunded: int | None = None
    refund_status: Optional[str] | None = None
    captured: bool | None = None
    description: str | None = None
    card_id: Optional[str] | None = None
    bank: Any| None = None
    wallet: Optional[Any] | None = None
    vpa: Optional[Any] | None = None
    email: Optional[str] | None = None
    contact: str | None = None
    customer_id: Optional[str] | None = None
    token_id: Optional[str] | None = None
    notes: Any | None = None
    fee: int | None = None
    tax: int | None = None
    error_code: Optional[str] | None = None
    error_description: Optional[str] | None = None
    error_source: Optional[Any]| None = None
    error_step: Optional[Any] | None = None
    error_reason: Optional[Any] | None = None
    acquirer_data: Optional[AcquirerData] | None = None
    upi: Optional[Any] | None = None
    created_at: int | None = None

# class redirectInfo(BaseSchema):
#     url: str
#     method: str

# class instrumentResponse(BaseSchema):
#     type: str = "PAY_PAGE"
#     redirect_info: redirectInfo

# class PayPgData(BaseSchema):
#     merchant_id: str | None = None
#     merchant_transaction_id: str | None = None
#     instrument_response: instrumentResponse
    

class PurchaseTransactionBase(BaseSchema):
    pass 

class PurchaseTransactionCreate(PurchaseTransactionBase):
    tx_id: str | None = None # phonepe's unique merchantTransactionId
    amount: int | None = None
    paid_by: int   | None = None
    paid_to: int | None = None
    payment_mode: PAYMENT_MODE
    tx_data: PayTxData | None = None
    tx_at: datetime | None = None
    description: str | None = None
    tx_status: TX_STATUS 

class PurchaseTransactionUpdate(PurchaseInstallmentBase):
    payment_mode: PAYMENT_MODE | None = None
    pg_ref_id: str | None = None
    tx_at: datetime | None = None
    tx_data: Union[PayTxData,LinkTxData]  | None = None
    pg_data: Union[PayPgData, RazorpayPayment] | None = None
    tx_status: TX_STATUS 
	
class PurchaseTransactionResponse(PurchaseTransactionCreate):
    id:int
    paid_to: int | None = None
    paid_by: int   | None = None
    amount: int
    currency: str = "INR"
    payment_mode: str | None = None
    description: str | None = None
    pg_ref_id: str | None = None
    pg_data: Union[PayPgData, RazorpayPayment] | None = None
    tx_data: Union[PayTxDataResp,LinkTxData] | None = None
    tx_id: str | None = None
    tx_at: datetime | None = None
    tx_type: str | None = None
    tx_status: str | None = None
    created_at: datetime | None = None


class PaymentSchema(BaseSchema):
    # transaction_id:int
    student_id:int
    purchase_ids: list[int]  | None = None # for direct purchases
    # purchase_installment_id: int | None = None
    purchase_installment_ids : list[int] | None = None # for installment based purchases
    amount:int
    mobile_number: PhoneNumber | None = None
    redirect_mode: REDIRECT_MODE
    redirect_url: str
    # payment_mode: PAYMENT_MODE
    # device_context: DeviceContext | None = None
    payment_instrument: PayInstrument | None = None
   
    
class PaymentOfflineSchema(BaseSchema):
    # transaction_id:int
    student_id:int
    purchase_ids: list[int]  | None = None # for direct purchases
    # purchase_installment_id: int | None = None
    purchase_installment_ids : list[int] | None = None # for installment based purchases
    amount:int
    payment_mode: PAYMENT_MODE
    tx_at: datetime
    tx_data: PayTxOfflineData | None = None
    tenant_id:int | None = None
    legalentity_name:str | None = None

class Customer(BaseSchema):
    name: str
    contact: str
    email: str

class Notify(BaseSchema):
    sms: bool = True
    email: bool = True

class PurchasePaymentLinkSchema(BaseSchema):
    purchase_ids: list[int]  | None = None # for direct purchases
    # purchase_installment_id: int | None = None
    purchase_installment_ids : list[int] | None = None # for installment based purchases
    student_id:int
    amount: int
    # accept_partial: bool = False
    # first_min_partial_amount: int | None = None
    expire_by: int
    customer: Customer
    callback_url: str| None = None
    callback_method: str = "get"
    notify: Notify
    reminder_enable: bool = True
    notes: dict
    tenant_id:int
    legalentity_name:str
    
class PuchaseDiscSchema(BaseSchema):
    prod_id: int
    selling_price: int
    discount_no: int | None = None
    discount_applied: int = 0
    
class PaymentCancelSchema(BaseSchema):
    paid_by: int
    paid_to: int
    tx_at: datetime
    # purchase_ids: list[int] | None = None
    # purchase_installment_id: int | None = None
    amount:int
    payment_mode: PAYMENT_MODE
    tx_data: PayTxOfflineData | None = None
    
class PurchaseTxs(BaseSchema):
    purchase: PurchaseReponse
    installments: list[PurchaseInstallmentResponse]| None = []
    transactions: list[PurchaseTransactionResponse] | None = None
    
class TxUpdateSchema(BaseSchema):
    status: TX_STATUS
    reason: str | None = None

class TxReport(BaseSchema):
    start_date: date | None = None
    end_date: date | None = None
    branch_ids: list[int] | None = None
    plan_name: str | None = None
    is_online_branch: bool | None = None
    include_incomplete_txs: bool | None = None
    limit: int | None = None
    offset: int | None = None

class PurchaseReport(BaseSchema):
    upto_date: date | None = None
    branch_ids: list[int] | None = None
    limit: int | None = None
    offset: int | None = None

class EnrollmentProduct(BaseSchema):
    enrolled_user_id:int | None = None 
    assigned_mentor_id:int | None = None 
    assigned_guide_id:int | None = None
    limit: int = 100
    offset: int = 0
    offering_name: str | None = None
    offering_category: str | None = None
    product_name: str | None = None
    product_code: str | None = None
    planned_start_date: str | None = None
    branch_id: int | None = None
    exam_id: int | None = None
    stage_id: int| None = None
    subject_id: int| None = None

class Paymentlinkupdate(BaseSchema):

    razorpay_payment_id: str | None = None
    razorpay_payment_link_id: str | None = None
    razorpay_payment_link_reference_id: str  | None = None
    razorpay_payment_link_status: str | None = None

class InvoiceSchema(BaseSchema):
    # admission_id: int
    tx_ids: list[int]