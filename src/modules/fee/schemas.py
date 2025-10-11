from datetime import date

from src.base.schemas import BaseSchema


class WalkinFilterSchema(BaseSchema):
    from_date: date | None = None
    till_date: date | None = None
    by_branch:bool  | None = None
    by_offering:bool  | None = None
    by_counsellor:bool  | None = None
    by_probability:bool  | None = None
    by_district:bool  | None = None
    by_parent_occ:bool  | None = None
    by_college:bool  | None = None
    by_uni:bool  | None = None
    by_spec:bool  | None = None
    by_source:bool  | None = None
    by_date:bool  | None = None
    branch_name: str | None = None
    # batch_id:int | None = None
    offering_name: str| None = None
    by_reason: bool
    by_competitor: bool

class AdmissionFilterSchema(BaseSchema):
    from_date: date  | None = None
    till_date: date  | None = None
    by_branch:bool  | None = None
    by_offering:bool  | None = None
    by_counsellor:bool  | None = None
    by_probability:bool | None = None
    by_district:bool  | None = None
    by_parent_occ:bool  | None = None
    by_college:bool  | None = None
    by_uni:bool  | None = None
    by_spec:bool  | None = None
    by_source:bool  | None = None
    by_batch:bool  | None = None
    by_date:bool  | None = None
    branch_id: int | None = None
    batch_id:int | None = None
    offering_id:int| None = None


class AvgDaysFilterSchema(BaseSchema):
    from_date: date  | None = None
    till_date: date  | None = None
    branch_id: int | None = None
    offering_id :int  | None = None
    batch_id: int  | None = None

class FeeFollowupSchema(BaseSchema):
    from_date: date | None = None
    till_date: date | None = None
    branch_id: int | None = None
    batch_id:int | None = None
    offering_id:int| None = None
    limit: int | None = None
    offset: int | None = None
    student_name: str | None = None
    student_phoneno: str | None = None
    installment_date: date | None = None
    legal_entity: str | None = None

class DueCountSchema(BaseSchema):
    from_date: date | None = None
    till_date: date | None = None
    branch_id: int | None = None
    batch_id:int | None = None
    offering_id:int| None = None
    student_name: str | None = None
    student_phoneno: str | None = None
    installment_date: date | None = None
    legal_entity: str | None = None

class DayReportSchema(BaseSchema):
    from_date: date
    till_date: date
    branch_ids:list[int] | None = None
    offering_id:int | None = None
    batch_id:int| None = None
    get_collection_count:bool | None = None
    legal_entity: str | None = None
    payment_mode: str | None = None
    limit: int | None = None
    offset: int | None = None
    include_incomplete_txs: bool | None = None
    is_online_branch: bool | None = None
    plan_name: str | None = None