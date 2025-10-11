from src.base.schemas import BaseSchema, PhoneNumber
from enum import Enum
from typing import Any
from datetime import datetime


class AUTH_WORKFLOW_TYPE(str, Enum):
    penny_drop = "PENNY_DROP"
    transaction = "TRANSACTION"


class AMOUNT_TYPE(str, Enum):
    fixed = "FIXED"
    variable = "VARIABLE"


class CALLBACK_TYPE(str, Enum):
    subscription = "SUBSCRIPTION"
    debit = "DEBIT"
    notify = "NOTIFY"
    auth = "AUTH"


class SUBS_FREQUENCY(str, Enum):
    daily = "DAILY"
    weekly = "WEEKLY"
    fortnightly = "FORTNIGHTLY"
    monthly = "MONTHLY"  # 1
    quaterly = "QUARTERLY"  # 3
    halfyearly = "HALFYEARLY"
    yearly = "YEARLY"  # 12
    on_demand = "ON_DEMAND"


class SUBS_FLOW_TYPE(str, Enum):
    upi = "UPI"
    upi_intent_flow = "UPI_INTENT"
    collect_flow = "UPI_COLLECT"
    qr_flow = "UPI_QR"
    pay_page = "PAY_PAGE"


class REDIRECT_MODE(str, Enum):
    redirect = "REDIRECT"
    post = "POST"


class DeviceContext(BaseSchema):
    phone_pe_version_code: int | None = None
    device_o_s: str | None = "IOS"
    merchant_call_back_scheme: str | None = "iOSIntentIntegration"
    is_p_p_app_present: bool = True


class PaymentInstrument(BaseSchema):
    type: SUBS_FLOW_TYPE
    target_app: str | None = None
    vpa: str | None = None

class Customer(BaseSchema):
    name: str
    contact: str
    email: str

class Notify(BaseSchema):
    sms: bool = True
    email: bool = True

class PgSubsCreateSchema(BaseSchema):  # Open Intent or Collect Flow
    merchant_id: str
    merchant_subscription_id: str
    merchant_user_id: str
    subscription_name: str
    auth_workflow_type: AUTH_WORKFLOW_TYPE = AUTH_WORKFLOW_TYPE.transaction
    amount_type: AMOUNT_TYPE = AMOUNT_TYPE.variable
    amount: int
    frequency: SUBS_FREQUENCY = SUBS_FREQUENCY.monthly
    recurring_count: int
    description: str | None = None
    mobile_number: PhoneNumber | None = None
    sub_merchant_id: str | None = None
    device_context: DeviceContext | None = None


class PgAuthRequestSchema(
    BaseSchema
):  # Open Intent - When authWorkflowType is TRANSACTION
    merchant_id: str
    merchant_user_id: str
    subscription_id: str
    auth_request_id: str
    amount: int
    payment_instrument: PaymentInstrument


class PgRecurringInitSchema(BaseSchema):
    merchant_id: str
    merchant_user_id: str
    subscription_id: str
    transaction_id: str
    auto_debit: bool = True
    amount: int


class PgRecurringDebitExecute(BaseSchema):
    merchant_id: str
    merchant_user_id: str
    subscription_id: str
    notification_id: str
    transaction_id: str


class PgAuthResponseData(BaseSchema):
    redirect_type: str
    redirect_u_r_l: str


class PgAuthResponseSchema(
    BaseSchema
):  # Open Intent - When authWorkflowType is TRANSACTION
    message: str
    data: PgAuthResponseData | str | dict | None


class PgSubsInfo(BaseSchema):
    device_context: DeviceContext | None = None  # Mandatory For Subscription - PhonePe Intent Flow and not for Open Intent Flow and Collect Flow
    mobile_number: PhoneNumber | None = None


class PgSubsData(BaseSchema):
    subscription_id: str | None = None
    state: str | None = None

    valid_upto: int | None = None
    is_supported_app: bool | None = None
    is_supported_user: bool | None = None

    state_start_date: int | None = None
    state_end_date: int | None = None


class PgNotificationData(BaseSchema):
    # notificationDetails
    notification_id: str | None = None
    amount: int
    state: str
    notified_at: int | None = None
    valid_after: int | None = None
    valid_upto: int | None = None


class PgPaymentMode(BaseSchema):
    mode: str | None = None
    amount: int | None = None
    utr: str | None = None
    ifsc: str | None = None
    masked_account_number: str | None = None
    umn: str | None = None


class PgTxData(BaseSchema):
    provider_reference_id: str | None = None
    amount: int
    state: str
    pay_response_code: str | None = None
    pay_response_code_description: str | None = None
    payment_modes: list[PgPaymentMode] | None = None
    notification_details: PgNotificationData | None = None


class PgTxNotifyComboData(PgTxData, PgNotificationData):
    pass


class PgAuthStatusResponse(BaseSchema):
    merchant_id: str | None = None
    auth_request_id: str | None = None
    transaction_details: PgTxData | None = None
    subscription_details: PgSubsData | None = None


class PgVerifyVPA(BaseSchema):
    exists: bool
    name: str | None = None
    vpa: str

class PaymentInstrumentPay(BaseSchema):
    type: SUBS_FLOW_TYPE | None = None
    utr: str | None = None

    card_type: str | None = None
    pg_transaction_id: str | None = None
    bank_transaction_id: str | None = None
    pg_authorization_code: str | None = None
    pg_service_transaction_id: str | None = None
    arn: str | None = None
    bank_id: str | None = None
    brn: str | None = None

class PayInstrument(BaseSchema):
    type: SUBS_FLOW_TYPE | None = None

class PgS2SCallbackResponse(BaseSchema):
    callback_type: str
    merchant_id: str | None = None
    transaction_id: str | None = None
    auth_request_id: str | None = None
    merchant_subscription_id: str | None = None
    notification_details: PgNotificationData | None = None
    subscription_details: PgSubsData | None = None
    transaction_details: PgTxData | None = None

class PgPayS2SCallbackResponse(BaseSchema):
    merchant_id: str
    transaction_id: str 
    merchant_transaction_id: str 
    amount: int
    state: str 
    response_code: str 
    payment_instrument: PaymentInstrumentPay | None = None

class PgPayApiSchema(BaseSchema):
    merchant_id: str
    merchant_transaction_id: str
    merchant_user_id: str
    amount: int
    redirect_url: str
    redirect_mode: REDIRECT_MODE
    callback_url: str
    mobile_number: str | None = None
    payment_instrument: PayInstrument

class PgPAYAPISchema(BaseSchema):
    merchant_id: str
    merchant_transaction_id: str
    merchant_user_id: str
    amount: int
    callback_url: str
    mobile_number: str | None = None
    device_context: DeviceContext | None = None
    payment_instrument: PaymentInstrumentPay | None = None

class PaymentLinkRequest(BaseSchema):
    amount: int
    currency: str = "INR"
    accept_partial: bool = False
    first_min_partial_amount: int | None = None
    expire_by: int
    reference_id: str
    description: str | None = None
    customer: Customer
    callback_url: str| None = None
    callback_method: str = "get"
    notify: Notify
    reminder_enable: bool = True
    notes: dict