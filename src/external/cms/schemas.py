from src.base.schemas import BaseSchema
from enum import Enum
from pydantic import Field
# from src.users.schemas import UserBasicInfo


class QUESTION_TYPE(str, Enum):
    mcq = "MCQ"
    sq = "SQ"
    cq = "CQ"


class DIFFICULTY_LEVEL(str, Enum):
    easy = "EASY"
    medium = "MEDIUM"
    difficult = "DIFFICULT"


class QUESTION_FORM(str, Enum):
    single_statement = "SINGLE STATEMENT/SINGLE ANSWERED BASED"
    list_form = "LIST BASED"
    matching_pair = "MATCHING/PAIR BASED"
    two_statements = "TWO STATEMENTS BASED"
    three_statements = "THREE STATEMENTS BASED"
    four_statements = "FOUR STATEMENTS BASED"
    other_form = "OTHER FORM"


class PUBLISHING_STATUS(str, Enum):
    draft = "DRAFT"
    published = "PUBLISHED"


class SOURCE_TYPE(str, Enum):
    upsc = "UPSC"
    state_psc = "STATE PSC"
    ugc = "UGC"
    institute = "INSTITUTE"
    program = "PROGRAM"
    others = "OTHERS"


class CMSBaseSchema(BaseSchema):
    id: int | None = None
    name: str | None = None
    description: str | None = None


class TenantCMS(CMSBaseSchema):
    domain: str | None = None
    tenant_id: int | None = None


class ExamCMS(CMSBaseSchema):
    pass


class StageCMS(CMSBaseSchema):
    # exam: ExamCMS | None = None
    stage_seq: int | None = None


class Benchmark(BaseSchema):
    stage: StageCMS | None = None
    averageMarksPercentage: float | None = None
    aspirationalMarksPercentage: float | None = None


class SubjectCMS(CMSBaseSchema):
    code: str | None = None
    is_optional_subject: bool | None = None
    is_language: bool | None = None
    benchmark: list[Benchmark] | None = None


class TopicCMS(CMSBaseSchema):
    code: str | None = None
    # subjects: list[SubjectCMS] | None = None


class CurrentAffairsTopicCMS(BaseSchema):
    id: int | None = None
    name: str | None = None
    code: str | None = None


class PaperType(str, Enum):
    objective = "OBJECTIVE"
    subjective = "SUBJECTIVE"
    interview = "INTERVIEW"

    @classmethod
    def _missing_(cls, value):
        value = value.lower()
        for member in cls:
            if member.lower() == value:
                return member
        return None


class PaperSubjectType(str, Enum):
    LanguageOptional = "LANGUAGE OPTIONAL"
    SubjectOptional = "SUBJECT OPTIONAL"
    SingleSubject = "SINGLE SUBJECT"
    MultiSubject = "MULTI SUBJECT"

    @classmethod
    def _missing_(cls, value):
        value = value.lower()
        for member in cls:
            if "".join(member.lower().split(" ")) == value:
                return member
        return None


class PaperCMS(CMSBaseSchema):
    # exam: ExamCMS | None = None
    # stage: StageCMS | None = None
    paper_type: PaperType | None = None
    duration: int | None = None
    number_of_questions: int | None = None
    max_marks: int | None = None
    max_marks_per_question: float | None = None
    negative_marks_per_question: float | None = None
    # subjects: list[SubjectCMS] | None = None
    subject_type: PaperSubjectType | None = None
    averageMarksPercentage: float | None = None
    aspirationalMarksPercentage: float | None = None


class OptionCMS(BaseSchema):
    id: int
    value: str
    is_correct: bool
    attempts_percent: float | None = 0.0


class SourceCMS(BaseSchema):
    id: int | None = None
    year: int | None = None
    name: str | None = None
    source_type: SOURCE_TYPE | None = None


class UserBasicInfo(BaseSchema):
    id: int
    full_name: str | None = None
    location: str | None = None
    about_me: str | None = None
    photo: str | None = None
    
class ReportCMS(BaseSchema):
    id: int
    reason: str | None = None
    remarks: str | None = None
    reported_by_id: int
    reported_by: UserBasicInfo


class ReportCMSCreate(BaseSchema):
    reason: str | None = None
    remarks: str | None = None
    reportedById: int
    reportedBy: UserBasicInfo


class QBaseCMS(BaseSchema):
    id: int = Field(alias="cms_id")
    tenant: TenantCMS
    exam: ExamCMS
    paper: PaperCMS
    subject: SubjectCMS
    topic: TopicCMS
    # difficulty_level: DIFFICULTY_LEVEL | None = None
    reference_material: str | None = None
    publishing_status: PUBLISHING_STATUS | None = None
    is_private: bool
    is_deleted: bool
    source: list[SourceCMS] | None = None


class MCQSchema(BaseSchema):
    question: str
    options: list[OptionCMS]
    is_multi: bool
    explanation: str | None = None
    question_form: QUESTION_FORM | None = None
    max_marks: float | None = None
    negative_marks: float | None = None
    reports: list[ReportCMS] | None = None
    is_current_affairs: bool | None = None
    current_affairs_topic: CurrentAffairsTopicCMS | None = None


class ObjectiveQuestionCMS(QBaseCMS, MCQSchema):
    pass


class SubjectiveQuestionCMS(QBaseCMS):
    question: str
    model_solution: str | None = None
    max_marks: float | None = None
    negative_marks: float | None = None
    reports: list[ReportCMS] | None = None


class CQSchema(MCQSchema):
    id: int


class ContextQuestionCMS(QBaseCMS):
    context: str
    questions: list[CQSchema]


# changes to be made
class FetchQuestionsSchema(BaseSchema):
    q_type: QUESTION_TYPE
    tenant_id: int
    exam_id: int | None = None
    paper_id: int
    subject_ids: list[int] | None = None
    topic_ids: list[int] | None = None
    # difficulty_level: DIFFICULTY_LEVEL | None = None
    test_size: int
    source: list[SOURCE_TYPE] | None = None
    select_year: int | None = None
    exclude_ids: list[int] | None = None
    randomize: bool | None = True
    category: str | None = None
    is_external: bool | None = None
    is_published: bool | None = None


class FullLengthQFetchSchema(BaseSchema):
    tenant_id: int
    exam_id: int | None = None
    paper_id: int


class CurrentAffairsQSchema(BaseSchema):
    q_type: QUESTION_TYPE
    tenant_id: int
    exam_id: int | None = None
    # stage_id: int | None = None
    paper_id: int
    topic_ids: list[int] | None = None
    test_size: int | None = 10000
    exclude_ids: list[int] | None = None
    category: str | None = None
    is_external: bool | None = None
    is_published: bool | None = None
    # randomize: bool | None = True
