from enum import Enum
from datetime import date, datetime
from src.base.schemas import BaseSchema

class EVENT_TYPE(str, Enum):
    USER_CREATE = "user_create"
    USER_UPDATE = "user_update"
    LOGIN = "login"
    LOGOUT = "logout"
    ONLINE_PAYMENT_SUCCESS = "online_payment_success"
    ONLINE_PAYMENT_FAILURE = "online_payment_failure"
    ONLINE_PG_PAYMENT_SUCCESS = "online_pg_payment_success"
    ONLINE_PG_PAYMENT_FAILURE = "online_pg_payment_failure"
    OFFLINE_PAYMENT_SUCCESS = "offline_payment_success"
    OFFLINE_PAYMENT_FAILURE = "offline_payment_failure"
    SUBS_PAYMENT_SUCCESS = "subs_payment_success"
    SUBS_PAYMENT_FAILURE = "subs_payment_failure"
    STUDYPLAN_CREATE = "studyplan_create"
    PLANTASK_CREATE = "plantask_create"
    PLANTASK_UPDATE = "plantask_update"
    STUDYPLAN_UPDATE = "studyplan_update"
    CONTENT_CREATE = "content_create"
    CONTENT_UPDATE = "content_update"
    MATERIAL_VIEW = "material_view"
    AMOUNT_UPDATE = "amount_update"
    ENROLLMENT_UPDATE = "enrollment_update"
    
class EventLogSchema(BaseSchema):
    timestamp: datetime
    event_by_user_id: int
    user_name: str
    user_phone: str
    source_ip: str | None = None
    event_type: str
    event_details: dict | None = None

class EventLogCreate(BaseSchema):
    event_by_user_id: int
    user_name: str
    user_phone: str
    source_ip: str | None = None
    event_type: str
    event_details: dict | None = None

class log_filters(BaseSchema):
    from_date: date | None = None
    till_date: date | None = None
    event_by_user_id: int | None = None
    user_name: str | None = None
    user_phone: str | None = None
    source_ip: str | None = None
    event_type: str | None = None
    limit: int = 10
    offset: int = 0


