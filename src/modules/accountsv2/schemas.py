from src.base.schemas import BaseSchema
from datetime import date

class SubsTxsSchema(BaseSchema):
    start_date:date| None = None
    end_date:date| None = None
    plan_id:int| None = None
    plan_name:str| None = None
    user_id:int| None = None
    user_name:str| None = None
    phone_no:str| None = None
    payment_mode:str| None = None
    status:str|None = None
    limit:int | None = None
    offset:int | None = None
