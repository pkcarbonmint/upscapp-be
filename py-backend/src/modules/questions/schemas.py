from datetime import date, datetime
from enum import Enum
from typing import Optional, List, Any
from pydantic import Field, ConfigDict, Json
from src.base.schemas import BaseSchema
from src.users.schemas import UserBasicInfo
from src.external.cms.schemas import *

class QReportUserInfo(BaseSchema):
    id: int
    full_name: str | None = None
    photo: str | None = None
    phone_number: str | None = None

class QUESTION_TYPE(str, Enum):
    mcq = "MCQ"
    sq = "SQ"
    cq = "CQ"


class QuestionReportBase(BaseSchema):
    pass


class QuestionReportCreate(QuestionReportBase):
    question_id: int
    reason: str
    remarks: str | None = None


class QuestionReportUpdate(QuestionReportBase):
    reason: str | None = None
    remarks: str | None = None
    is_resolved: bool | None = None


class QuestionReportResponse(QuestionReportCreate):
    reported_by_id: int
    reported_by: UserBasicInfo | None = None

class QuestionBase(BaseSchema):
    pass


class QuestionCreate(QuestionBase):
    tenant_id: int | None = None
    question_type: QUESTION_TYPE
    question: str
    max_marks: float | None = None
    negative_marks: float | None = None

    # for mcq
    options: list[OptionCMS] | None = None
    explanation: str | None = None
    is_multi: bool | None = None
    question_form: QUESTION_FORM | None = None
    # for sq
    model_solution: str | None = None
    # for cq
    context: str | None = None

    # common
    cms_id: int
    q_num: int | None = 1

    exam: ExamCMS | None = None
    paper: PaperCMS | None = None
    subject: SubjectCMS | None = None
    topic: TopicCMS | None = None
    source: list[SourceCMS] | None = None
    difficulty_level: DIFFICULTY_LEVEL | None = None
    reference_material: str | None = None
    publishing_status: PUBLISHING_STATUS | None = PUBLISHING_STATUS.draft
    is_private: bool = False
    is_deleted: bool = False
    is_current_affairs: bool | None = False
    current_affairs_topic: CurrentAffairsTopicCMS | None = None
    category: str | None = None


class QuestionUpdate(QuestionBase):
    options: list[OptionCMS] | None = None

class QuestionUpdateV2(QuestionCreate):
    tenant_id: int | None = None
    question_type: QUESTION_TYPE | None = None
    question: str | None = None
    max_marks: float | None = None
    negative_marks: float | None = None

    # for mcq
    options: list[OptionCMS] | None = None
    explanation: str | None = None
    is_multi: bool | None = None
    question_form: QUESTION_FORM | None = None
    # for sq
    model_solution: str | None = None
    # for cq
    context: str | None = None

    # common
    q_num: int | None = 1

    exam: ExamCMS | None = None
    paper: PaperCMS | None = None
    subject: SubjectCMS | None = None
    topic: TopicCMS | None = None
    source: list[SourceCMS] | None = None
    difficulty_level: DIFFICULTY_LEVEL | None = None
    reference_material: str | None = None
    publishing_status: PUBLISHING_STATUS | None = PUBLISHING_STATUS.draft
    is_private: bool = False
    is_deleted: bool = False
    is_current_affairs: bool | None = False
    current_affairs_topic: CurrentAffairsTopicCMS | None = None
    

class QuestionResponse(QuestionCreate):
    id: int
    # reports: list[QuestionReportResponse] | None = None

class QuestionReportV2Response(QuestionReportCreate):
    id:int
    reported_by_id: int
    is_resolved: bool | None = None
    created_at: datetime | None = None
    reported_by: QReportUserInfo | None = None
    question: QuestionResponse | None = None

class ReportFilters(BaseSchema):
    question_id: int | None = None
    user_id:int | None = None
    user_name: str | None = None
    user_phno: str | None = None
    reported_date: date | None = None
    exam_ids: list[int] | None = None
    stage_ids: list[int] | None = None
    paper_ids: list[int] | None = None
    subject_ids: list[int] | None = None
    topic_ids: list[int] | None = None
    is_resolved: bool | None = None
    offset:int | None = None
    limit: int | None = None

class ReportFiltersResponse(BaseSchema):
    QuestionReport:QuestionReportV2Response

