from datetime import date
from enum import Enum
from typing import Annotated, Optional
from src.base.schemas import BaseSchema
from pydantic import BaseModel, Field, PlainSerializer

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

class CATEGORY(str,Enum):
    internal = "INTERNAL"
    external = "EXTERNAL"
    daily_test = "DAILY_TEST"

class REVIEW_STATUS(str,Enum):
    not_reviewed = "NOT_REVIEWED"
    sent_for_review = "SENT_FOR_REVIEW"
    assigned_to_reviewer = "ASSIGNED_TO_REVIEWER"
    review_passed = "REVIEW_PASSED"
    review_failed = "REVIEW_FAILED"

class PUBLISHING_STATUS(str, Enum):
    draft = "DRAFT"
    published = "PUBLISHED"
    unpublished = "UNPUBLISHED"
    archived = "ARCHIVED"

class REVIEW_TYPE(str,Enum):
    mcq = "MCQ"
    cq = "CQ"
    sq = "SQ"
    issue = "ISSUE"
    material = "MATERIAL"
    govt_scheme = "GOVERNMENT_SCHEME"


class SOURCE_TYPE(str, Enum):
    upsc = "UPSC"
    state_psc = "STATE PSC"
    ugc = "UGC"
    institute = "INSTITUTE"
    program = "PROGRAM"
    others = "OTHERS"

class MATERIAL_TYPE(str, Enum):
    gist = "GIST"
    mains_monthly_q_bank = "Mains Monthly Question Bank"
    prelims_monthly_q_bank = "Prelims Monthly Question Bank"
    prelims_connect = "Prelims Connect"
    gist_pfs = "GIST PFS", #free
    gist_mains = "GIST Mains",
    single_isse_dtp ="Single Issue DTP", #free
    single_pfs_dtp  ="Single PFS DTP", #free
    mains_questions ="Mains Questions ",
    prelims_questions ="Prelims Questions",
    vam  ="Value Addition Material", #free
    data ="Data", #free
    example ="Example", #free
    case_Study ="Case Study", #free
    events="Event in News" #free
    govt_scheme = "Government Schemes"
    generic = "Generic"
    pyq_mains = "PYQ Mains"

class FILE_TYPE(str,Enum):
    audio = "AUDIO"
    video = "VIDEO" 
    image = "IMAGE"
    docx = "DOCX"
    pdf = "PDF"
    doc = "DOC"
    xlsx = "XLSX"
    xls = "XLS"
    csv = "CSV"

class PERIODICITY(str,Enum):
    daily = "DAILY"
    weekly = "WEEKLY" 
    monthly = "MONTHLY"
    quarterly = "QUARTERLY"
    halfyearly = "HALF-YEARLY"
    yearly = "YEARLY"

class CREATION_TYPE(str,Enum):
    generated = "GENERATED"
    uploaded = "UPLOADED"
    typed = "TYPED"

class REVIEW_GROUP_TYPE(str,Enum):
    prelims = "Prelims"
    mains = "Mains"
    issue = "Issue"
    material = "Material"
    govtscheme = "GovernmentScheme"

class SCHEME_TYPE(str,Enum):
    central_sector = "Central Sector"
    centrally_sponsored = "Centrally Sponsored"
    state_scheme = "State Scheme"

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

class CurrentAffairsTopicCMS(BaseSchema):
    id: int | None = None
    name: str | None = None
    code: str | None = None


class OptionCMSCreate(BaseSchema):
    value: str
    is_correct: bool
   
class OptionCMS(BaseSchema):
    id:int
    value: str
    is_correct: bool
    attempts_percent: float | None = 0.0

class SourceCMSCreate(BaseSchema):
    year: int | None = None
    name: str | None = None
    source_type: SOURCE_TYPE | None = None

class SourceCMS(SourceCMSCreate):
    id: int 

class UserBasicInfo(BaseSchema):
    id: int | None = None
    full_name: str | None = None
    photo: str | None = None

class ReportCMS(BaseSchema):
    id: int
    reason: str | None = None
    remarks: str | None = None
    reported_by_id: int
    reported_by: UserBasicInfo

class MCQSchema(BaseSchema):
    id: int
    tenant: TenantCMS
    exam: ExamCMS
    paper: PaperCMS
    subject: SubjectCMS  | None = None
    topic: TopicCMS  | None = None
    question: str
    options: list[OptionCMS]
    reference_material: str | None = None
    is_multi: bool  | None = False
    explanation: str | None = None
    question_form: QUESTION_FORM | None = None
    source: list[SourceCMS] | None = None
    reports: list[ReportCMS] | None = None
    is_private: bool
    is_deleted: bool
    publishing_status: PUBLISHING_STATUS | None = None
    review_status: REVIEW_STATUS
    max_marks: float | None = None
    negative_marks: float | None = None
    is_current_affairs: bool | None = None
    current_affairs_topic: CurrentAffairsTopicCMS | None = None
    source_file: str | None = None
    source_issue: int | None = None
    value_addition: str | None = None
    category: CATEGORY | None = None


class MCQCreate(BaseModel):
    tenant: int  
    exam : int
    paper : int
    subject : int | None = None
    topic : int | None = None
    question : str
    options : list[OptionCMSCreate]
    maxMarks: float | None = None
    negativeMarks: float | None = None
    isCurrentAffairs: bool | None = None
    current_affairs_topic: int | None = None
    referenceMaterial: str | None = None
    isMulti: bool  | None = False
    explanation :str | None = None
    questionForm : QUESTION_FORM
    publishingStatus : PUBLISHING_STATUS | None = None
    reviewStatus: REVIEW_STATUS
    source: list[SourceCMSCreate] | None = None
    sourceFileName: str | None = None
    sourceIssue: int | None = None
    valueAddition: str | None = None
    isDeleted : bool
    isPrivate : bool
    category: CATEGORY | None = None

class SQSchema(BaseSchema):
    id: int  | None = None
    tenant: TenantCMS
    exam: ExamCMS
    paper: PaperCMS
    subject: SubjectCMS
    topic: TopicCMS
    question: str
    reference_material: str | None = None
    model_solution: str | None = None
    max_marks: float | None = None
    negative_marks: float | None = None
    source: list[SourceCMS] | None = None
    reports: list[ReportCMS] | None = None
    is_private: bool
    is_deleted: bool
    publishing_status: PUBLISHING_STATUS | None = None
    review_status: REVIEW_STATUS
    material_why: str | None = None
    approach: str | None = None
    value_addition: str | None = None
    source_file_name: str | None = None
    category: CATEGORY | None = None

class SQCreate(BaseSchema):
    tenant: int
    exam: int
    paper: int | None = None
    subject: int | None = None
    topic: int | None = None
    question: str
    reference_material: str | None = None
    model_solution: str | None = None
    max_marks: float | None = None
    negative_marks: float | None = None
    source: list[SourceCMSCreate] | None = None
    is_private: bool
    is_deleted: bool
    publishing_status: PUBLISHING_STATUS | None = None
    review_status: REVIEW_STATUS
    material_why: str | None = None
    approach: str | None = None
    value_addition: str | None = None
    source_file_name: str | None = None
    category: CATEGORY | None = None


class CQQuestionsCreate(BaseSchema):
    question: str
    options: list[OptionCMSCreate]
    is_multi: bool
    explanation: str | None = None
    question_form: QUESTION_FORM | None = None
    max_marks: float | None = None
    negative_marks: float | None = None
    value_addition: str | None = None
    

class CQQuestionsSchema(CQQuestionsCreate):
    id: int  | None = None
    reports: list[ReportCMS] | None = None

class CQSchema(BaseSchema):
    id: int  | None = None
    tenant: TenantCMS
    exam: ExamCMS
    paper: PaperCMS
    subject: SubjectCMS
    topic: TopicCMS
    context: str
    questions: list[CQQuestionsSchema]
    reference_material: str | None = None
    max_marks: float | None = None
    negative_marks: float | None = None
    source: list[SourceCMS] | None = None
    is_private: bool
    is_deleted: bool
    publishing_status: PUBLISHING_STATUS | None = None
    review_status: REVIEW_STATUS
    source_file: str | None = None
    source_issue: dict | None = None
    value_addition: str | None = None
    category: CATEGORY | None = None

class CQSchemaCreate(BaseSchema):
    tenant: int  
    exam : int
    paper : int
    subject : int | None = None
    topic : int | None = None
    context: str
    questions: list[CQQuestionsCreate] | None = None
    maxMarks: float | None = None
    negativeMarks: float | None = None
    referenceMaterial: str | None = None
    publishingStatus : PUBLISHING_STATUS | None = None
    reviewStatus: REVIEW_STATUS
    source: list[SourceCMSCreate] | None = None
    isPrivate : bool
    isDeleted : bool
    sourceFileName: str | None = None
    sourceIssue: int | None = None
    valueAddition: str | None = None
    isCurrentAffairs: bool | None = None
    currentAffairsTopic: int | None = None
    category: CATEGORY | None = None

class LinkedIssue(BaseSchema):
    id: int  | None = None
    name: str
    exams: list[ExamCMS]
    stages: list[StageCMS]  | None = None
    papers: list[PaperCMS]  | None = None
    subjects: list[SubjectCMS]  | None = None
    topics: list[TopicCMS]  | None = None
    current_affairs_topics: list[CurrentAffairsTopicCMS]  | None = None
    issue_date: Optional[Annotated[date, PlainSerializer(lambda dt: dt.isoformat())]]
    creator: UserBasicInfo
    creatorId: int
    review_status: REVIEW_STATUS
    publishing_status: PUBLISHING_STATUS
   
class IssueEventSchema(BaseSchema):
    id: int
    date: Optional[Annotated[date, PlainSerializer(lambda dt: dt.isoformat())]]
    event: str
    links: Optional[str]  | None = None
    linked_issue: LinkedIssue| None = None

class IssueEventCreate(BaseSchema):
    # id: int
    event_date: Optional[Annotated[date, PlainSerializer(lambda dt: dt.isoformat())]]
    event: str
    links: Optional[str]  | None = None

class IssueExampleSchema(BaseSchema):
    id: int
    details: str
    linked_issue: LinkedIssue| None = None

class IssueExampleCreate(BaseSchema):
    # id: int
    details: str

class IssueDataSchema(BaseSchema):
    id:int
    details: str
    linked_issue: LinkedIssue| None = None

class IssueDataCreate(BaseSchema):
    # id:int
    details: str

class IssueCaseStudyCreate(BaseSchema):
    # id:int
    details: str

class IssueCaseStudySchema(BaseSchema):
    id:int
    details: str
    linked_issue: LinkedIssue| None = None

class PrelimsFactSheetSchema(BaseSchema):
    id:int
    nature_of_p_f_s: str | None = None
    exams: list[ExamCMS] | None = None
    stages: list[StageCMS]  | None = None
    papers: list[PaperCMS]  | None = None
    subjects: list[SubjectCMS]  | None = None
    topics: list[TopicCMS]  | None = None
    # current_affairs_topics: list[CurrentAffairsTopicCMS]  | None = None
    why_in_news: str | None = None
    highlights: str| None = None
    creator: UserBasicInfo | None = None
    creatorId: int | None = None
    linked_issue: LinkedIssue| None = None

class PrelimsFactSheetCreate(BaseSchema):
    exams: list[int]
    stages: list[int]  | None = None
    papers: list[int]  | None = None
    subjects: list[int]  | None = None
    topics: list[int]  | None = None
    nature_of_p_f_s: str  | None = None
    why_in_news: str| None = None
    highlights: str| None = None
    # creator: UserBasicInfo| None = None
    # creatorId: int| None = None
    # linked_issue: LinkedIssue| None = None
    publishing_status: PUBLISHING_STATUS = PUBLISHING_STATUS.draft

class IssueCreate(BaseSchema):
    name: str
    exams: list[int]
    stages: list[int]  | None = None
    papers: list[int]  | None = None
    subjects: list[int]  | None = None
    topics: list[int]  | None = None
    current_affairs_topics: list[int]  | None = None
    issue_date: Optional[Annotated[date, PlainSerializer(lambda dt: dt.isoformat())]]
    context: Optional[str]   | None = None
    synopsis: Optional[str]   | None = None
    event_in_news: list[int]  | None = None
    example: int | None = None
    data: int | None = None
    case_study: int | None = None
    prelims_fact_sheet: int | None = None
    # issue_details: Optional[str]   | None = None
    # conclusion: Optional[str]   | None = None
    attachments: Optional[str]   | None = None
    links: Optional[str]   | None = None
    review_status: REVIEW_STATUS = REVIEW_STATUS.not_reviewed
    publishing_status: PUBLISHING_STATUS = PUBLISHING_STATUS.draft
    # parent_issue: int | None = None


class IssueSchema(BaseSchema):
    id: int  | None = None
    name: str
    exams: list[ExamCMS]
    stages: list[StageCMS]  | None = None
    papers: list[PaperCMS]  | None = None
    subjects: list[SubjectCMS]  | None = None
    topics: list[TopicCMS]  | None = None
    current_affairs_topics: list[CurrentAffairsTopicCMS]  | None = None
    issue_date: Optional[Annotated[date, PlainSerializer(lambda dt: dt.isoformat())]]
    context: Optional[str]  | None = None
    synopsis: Optional[str]   | None = None
    event_in_news: list[IssueEventSchema]  | None = None
    example: IssueExampleSchema | None = None
    data: IssueDataSchema | None = None
    case_study: IssueCaseStudySchema | None = None
    prelims_fact_sheet: PrelimsFactSheetSchema | None = None
    # issue_details: Optional[str]
    # conclusion: Optional[str]
    attachments: Optional[str]  | None = None
    links: Optional[str]   | None = None
    creator: UserBasicInfo
    creator_id: int
    review_status: REVIEW_STATUS
    publishing_status: PUBLISHING_STATUS
    # parent_issue: dict | None = None

class GovernmentSchemeSchema(BaseSchema):
    scheme_name: str
    exams: list[ExamCMS]
    stages: list[StageCMS]
    papers: list[PaperCMS]
    subjects: list[SubjectCMS]
    topics: list[TopicCMS]
    current_affairs_topics: list[CurrentAffairsTopicCMS]  | None = None
    objective: str | None = None
    name_of_ministry: str | None = None
    scheme_type: SCHEME_TYPE | None = None
    key_features: str | None = None
    links: str | None = None
    attachments: str | None = None
    beneficiaries: str | None = None
    creator: UserBasicInfo
    creator_id: int
    publishing_status: PUBLISHING_STATUS
    review_status: REVIEW_STATUS
    

class GovernmentSchemeCreate(BaseSchema):
    scheme_name: str
    exams: list[int]
    stages: list[int]  | None = []
    papers: list[int]  | None = []
    subjects: list[int]  | None = []
    topics: list[int]  | None = []
    current_affairs_topics: list[int]  | None = []
    objective: str | None = None
    name_of_ministry: str | None = None
    scheme_type: SCHEME_TYPE | None = None
    key_features: str | None = None
    links: str | None = None
    attachments: str | None = None
    beneficiaries: str | None = None
    review_status: REVIEW_STATUS = REVIEW_STATUS.not_reviewed
    publishing_status: PUBLISHING_STATUS = PUBLISHING_STATUS.draft

class MaterialSchema(BaseSchema):
    id:int 
    name: str| None = None
    material: str
    material_link: str | None = None
    material_type: MATERIAL_TYPE 
    file_name: str | None = None
    file_type: FILE_TYPE 
    periodicity: PERIODICITY 
    period: str
    exams: list[ExamCMS]
    stages: list[StageCMS]
    papers: list[PaperCMS]
    subjects: list[SubjectCMS]
    topics: list[TopicCMS]
    current_affairs_topics: list[CurrentAffairsTopicCMS]  | None = None
    multiple_choice_questions: list[MCQSchema] | None = []
    context_questions: list[CQSchema]
    subjective_questions: list[SQSchema]
    issues: list[IssueSchema]
    case_studies: list[IssueCaseStudySchema] | None = []
    event_in_news: list[IssueEventSchema] | None = []
    issue_data: list[IssueDataSchema] | None = []
    issue_examples: list[IssueExampleSchema] | None = []
    prelims_fact_sheets: list[PrelimsFactSheetSchema] | None = []
    government_schemes: list[GovernmentSchemeSchema] | None = []
    key_words: str
    publishing_status: PUBLISHING_STATUS
    review_status: REVIEW_STATUS
    parent_material: dict | None = None
    reference_materials: list[dict] | None = []
    creation_type: str
    creator: UserBasicInfo
    creator_id: int


class MaterialCreate(BaseSchema):
    name: str| None = None
    material: str| None = None
    material_link: str | None = None
    file_name: str | None = None
    material_type: MATERIAL_TYPE 
    file_type: FILE_TYPE 
    periodicity: PERIODICITY | None = None
    period: str | None = None
    exams: list[int]
    stages: list[int]  | None = []
    papers: list[int]  | None = []
    subjects: list[int]  | None = []
    topics: list[int]  | None = []
    current_affairs_topics: list[int]  | None = []
    multiple_choice_questions: list[int] | None = []
    context_questions: list[int] | None = []
    subjective_questions: list[int] | None = []
    issues: list[int] | None = []
    case_studies: list[int] | None = []
    event_in_news: list[int] | None = []
    issue_data: list[int] | None = []
    issue_examples: list[int] | None = []
    prelims_fact_sheets: list[int] | None = []
    government_schemes: list[int] | None = []
    key_words: str| None = None
    publishing_status: PUBLISHING_STATUS
    review_status: REVIEW_STATUS
    parent_material: int | None = None
    reference_materials: list[int] | None = []
    creationType: CREATION_TYPE
    material_data: dict | None = None

class FileRepoSchema(BaseSchema):
    name: str | None = None
    creator: UserBasicInfo
    creator_id: int
    tags: str | None = None
    file: str | None = None
    file_name: str | None = None
    file_type: str | None = None

class FileRepoSchema(BaseSchema):
    name: str | None = None
    tags: str | None = None
    file: str | None = None
    file_name: str | None = None
    file_type: str | None = None

    
class ReviewGroupCreate(BaseSchema):
    name: str
    defaultReviewer: UserBasicInfo  | None = None
    defaultReviewerId: int | None = None
    reviewStatus: REVIEW_STATUS = REVIEW_STATUS.not_reviewed
    type: REVIEW_GROUP_TYPE | None = None
    sourceFileName: str | None = None

class ReviewGroupSchema(BaseSchema):
    id: int
    name: str
    creator: UserBasicInfo
    creatorId: int
    defaultReviewer: UserBasicInfo
    defaultReviewerId: int
    reviewStatus: REVIEW_STATUS
    type: REVIEW_GROUP_TYPE | None = None
    reviewItems: dict # type ReviewItemSchema

class ReviewItemSchema(BaseSchema):
    id: int  | None = None
    multiple_choice_question: MCQSchema | None = None
    context_question: CQSchema 
    subjective_question: SQSchema
    issue: IssueSchema
    review_status: REVIEW_STATUS
    review_group: ReviewGroupSchema
    type: REVIEW_TYPE
    due_date: Optional[Annotated[date, PlainSerializer(lambda dt: dt.isoformat())]]
    reviewer_l1: UserBasicInfo
    reviewer_l2: UserBasicInfo
    seqId: int | None = None
    material: MaterialSchema
    governmentScheme: GovernmentSchemeSchema

class ReviewItemCreate(BaseSchema):
    multiple_choice_question: int | None = None
    context_question: int | None = None
    subjective_question: int | None = None
    issue: int | None = None
    review_status: REVIEW_STATUS = REVIEW_STATUS.not_reviewed
    review_group: int | None = None
    type: REVIEW_TYPE
    due_date: Optional[Annotated[date, PlainSerializer(lambda dt: dt.isoformat())]]  | None = None
    reviewer_l1: UserBasicInfo | None = None
    reviewer_l1_id: int | None = None
    reviewer_l2_id: int | None = None
    reviewer_l2: UserBasicInfo | None = None
    seqId: int | None = None
    material: int | None = None
    government_scheme: int | None = None




class IssueQuestionSchema(BaseSchema):
    id: int  | None = None
    multiple_choice_question: MCQSchema | None = None
    context_question: CQSchema 
    subjective_question: SQSchema
    issue: IssueSchema
    review_status: REVIEW_STATUS
    # review_item: ReviewItemSchema
   
class IssueQuestionCreate(BaseSchema):
    multiple_choice_question: int | None = None
    context_question: int | None = None
    subjective_question: int | None = None
    issue: int 
    review_status: REVIEW_STATUS
    # review_item: int | None = None


class ReviewActivitySchema(BaseSchema):
    id: int  | None = None
    reviewer: UserBasicInfo
    reviewerId: int
    notes: str
    review_status: REVIEW_STATUS
    review_item: ReviewItemSchema

class ReviewActivityCreate(BaseSchema):
    notes: str
    review_status: REVIEW_STATUS
    review_item: int

class PrelimsQSelect(BaseSchema):
    q_type : QUESTION_TYPE
    q_id: int
    
class PrelimsGenerateSchema(BaseSchema):
    qs: list[PrelimsQSelect]
    date: Optional[Annotated[date, PlainSerializer(lambda dt: dt.isoformat())]]
    subject: str | None = None
    topic: str | None = None
    test_id: int | None = None
    handout_no: int | None = None

class MainsGenerateSchema(BaseSchema):
    q_type : QUESTION_TYPE = QUESTION_TYPE.sq
    q_ids: list[int]
    date: Optional[Annotated[date, PlainSerializer(lambda dt: dt.isoformat())]]
    subject: str | None = None
    topic: str | None = None
    test_id: int | None = None
    year: int  | None = None

class MainsBookletGenerateSchema(BaseSchema):
    q_type : QUESTION_TYPE = QUESTION_TYPE.sq
    q_ids: list[int]
    date: Optional[Annotated[date, PlainSerializer(lambda dt: dt.isoformat())]]
    paper: str 
    subjects: list[str] | None = []
    topics: list[str] | None = []
    test_id: int | None = None
    year: int  | None = None


class DailyIssueGenerateSchema(BaseSchema):
    tna_issue_ids: list[int] | None = []
    editorial_issue_ids: list[int] | None = []
    prelims_factsheet_issue_ids: list[int]| None = []
    dcamp_q_ids: list[int]| None = [] # mains
    dcapp_mcq_ids: list[int]| None = [] #prelims
    dcapp_cq_ids: list[int]| None = [] #prelims
    handout_no: int | None = None
    date: str | None = None

class MonthlyIssueSchema(BaseSchema):
    subject: str
    topic: str
    issue_id: int

class MonthlyIssueGenerateSchema(BaseSchema):
    prelims_monthly_schema: list[MonthlyIssueSchema]
    mains_monthly_schema: list[MonthlyIssueSchema]
    month: str | None = None
    year: int | None = None

class PFSSchema(BaseSchema):
    pfs_ids: list[int]

class SingleIssueSchema(BaseSchema):
    issue_ids: list[int]

class GistIssueSchema(BaseSchema):
    issue_ids: list[int]
    month: str | None = None
    year: int | None = None

class OBJECT_TYPE(str, Enum):    
    example = "example"
    data = "data"
    case_study = "caseStudy"
    pfs = "prelimsFactSheet"

class IssueObjects(BaseSchema):
    object_type: OBJECT_TYPE
    issue_ids: list[int]

class EventSchema(BaseSchema):
    issue_id: int
    event_ids: list[int]

class IssueQSchema(BaseSchema):
    issue_id: int
    mcq_ids: list[int] | None = None
    cq_ids: list[int] | None = None
    sq_ids:list[int] | None = None

class MainsSchema(BaseSchema):
    issue_id: int
    mains_ids: list[int]

class PYQMainsSchema(BaseSchema):
    pyq_start_date: int
    pyq_end_date: int
    tenant_id:int
    category:str
    is_external:bool
    exam_ids:list[int] | None = None
    stage_ids:list[int] | None = None
    paper_ids:list[int]