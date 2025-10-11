from enum import Enum
from pydantic import Json
from src.base.schemas import BaseSchema
from src.users.schemas import UserResponse, UserBasicInfo
from src.modules.questions.schemas import *
from datetime import datetime, date

class ReportIn(BaseSchema):
    stage_id: int
    paper_id: int
    from_date: date
    till_date: date

class TestSpecificReportIn(BaseSchema):
    test_id: int
    test_attempt_id: int

class AggMainsReportIn(BaseSchema):
    user_id:int
    from_date: date
    till_date: date

class BatchSpecificReport(BaseSchema):
    # user_id:int
    batch_id:int
    product_id: int