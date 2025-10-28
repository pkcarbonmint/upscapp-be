from enum import Enum
from pydantic import Json
from src.base.schemas import BaseSchema
from src.users.schemas import UserResponse, UserBasicInfo
from src.modules.questions.schemas import *
from datetime import datetime, date


class TEST_STATUS(str, Enum):
    pending = "PENDING"
    ready = "READY"


class TEST_ATTEMPT_MODE(str, Enum):
    exam = "EXAM"
    tutor = "TUTOR"


class TEST_ATTEMPT_STATUS(str, Enum):
    ongoing = "ONGOING"
    paused = "PAUSED"
    submitted = "SUBMITTED"
    completed = "COMPLETED"

class TEST_ASSESSMENT_STATUS(str,Enum): 
    unassigned = "UNASSIGNED"
    assigned = "ASSIGNED"
    in_progress = "IN PROGRESS"
    evaluated = "EVALUATED"
    accepted = "ACCEPTED"
    rejected = "REJECTED"
    withdrawn = "WITHDRAWN"



class TEST_FILTERS(BaseSchema):
    is_active: bool | None = None
    test_status: TEST_STATUS | None = None


class ELIMINATION_TECHINQUE(str, Enum):
    confident = "CONFIDENT"
    fifty_fifty = "50-50"
    one_elimination = "1_ELIMINATION"
    guess = "GUESS"


class TEST_TYPE(str, Enum):
    custom = "CUSTOM"
    totd = "TEST_OF_THE_DAY"
    pyq = "PYQ"
    model = "MODEL"
    current_affairs = "CURRENT_AFFAIRS"


class TEST_SELECT_Q_MODE(str, Enum):
    all = "ALL"
    unused = "UNUSED"
    favorite = "FAVORITE"
    omitted = "OMITTED"
    correct = "CORRECT"
    incorrect = "INCORRECT"


class UserOptions(BaseSchema):
    id: int
    value: str


class TestAttemptMainsFeedback(BaseSchema):
    Intro: float | None = None
    Content: float | None = None
    Conclusion: float | None = None
    Clarity: float | None = None
    FeedBack: str | None = None


"""
Test
"""
class TestSubjectCMS(BaseSchema):
    id: int | None = None
    name: str | None = None
    code: str | None = None
    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "code": self.code
        }


class TestTopicCMS(CMSBaseSchema):
    code: str | None = None
    subjects: list[TestSubjectCMS] | None = None
    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "code": self.code,
            "description": self.description,
            "subjects": [subject.to_dict() for subject in self.subjects] if self.subjects else None
        }




class TestShareInfo(BaseSchema):
    test_id: int
    shared_with_id: int
    shared_by_id: int
    id: int
    shared_with: UserBasicInfo
    shared_by: UserBasicInfo


class TestBase(BaseSchema):
    pass


class TestCreate(TestBase):
    title: str
    exam: ExamCMS
    stage: StageCMS
    paper: PaperCMS
    test_size: int

    subjects: list[SubjectCMS] | None = None
    topics: list[TestTopicCMS] | None = None
    # difficulty_level: DIFFICULTY_LEVEL | None = None
    test_type: TEST_TYPE = TEST_TYPE.custom
    question_mode: TEST_SELECT_Q_MODE = TEST_SELECT_Q_MODE.all
    daily_test_date: date | None = None
    select_exam_year: int | None = None
    is_full_length: bool = False
    is_current_affairs: bool = False
    source: list[SOURCE_TYPE] | None = None
    # include_attempted: bool | None = None

class TestCreateMains(TestBase):
    title: str
    exam: ExamCMS
    stage: StageCMS
    paper: PaperCMS
    test_size: int

    subjects: list[SubjectCMS] | None = None
    topics: list[TestTopicCMS] | None = None
    # difficulty_level: DIFFICULTY_LEVEL | None = None
    test_type: TEST_TYPE = TEST_TYPE.custom
    question_mode: TEST_SELECT_Q_MODE = TEST_SELECT_Q_MODE.all
    is_current_affairs: bool = False


class CuratedQuestion(BaseSchema):
    id: int  # cms q id
    q_type: QUESTION_TYPE


class TestCurateCreate(BaseSchema):
    title: str
    exam: ExamCMS
    stage: StageCMS
    paper: PaperCMS
    test_size: int
    subjects: list[SubjectCMS] | None = None
    topics: list[TestTopicCMS] | None = None
    test_type: TEST_TYPE | None = None
    source: list[SOURCE_TYPE] | None = None
    is_full_length: bool = False
    # for daily test
    is_daily_test: bool = False
    daily_test_date: date = None
    # for pyq test
    select_exam_year: int | None = None
    # for current affairs test
    is_current_affairs: bool = False
    questions: list[CuratedQuestion] | None = None


class TestCurateUpdate(BaseSchema):
    title: str
    exam: ExamCMS
    stage: StageCMS
    paper: PaperCMS
    test_size: int
    subjects: list[SubjectCMS] | None = None
    topics: list[TestTopicCMS] | None = None
    test_type: TEST_TYPE | None = None
    source: list[SOURCE_TYPE] | None = None
    is_full_length: bool = False
    # for daily test
    is_daily_test: bool = False
    daily_test_date: date = None
    questions: list[CuratedQuestion] | None = None

class TestCurateMainsUpdate(BaseSchema):
    title: str
    exam: ExamCMS
    stage: StageCMS
    paper: PaperCMS
    test_size: int
    subjects: list[SubjectCMS] | None = None
    topics: list[TestTopicCMS] | None = None
    test_type: TEST_TYPE | None = None
    source: list[SOURCE_TYPE] | None = None
    is_full_length: bool = False
    # for daily test
    is_daily_test: bool = False
    daily_test_date: date = None
    # for pyq test
    select_exam_year: int | None = None
    # for current affairs test
    is_current_affairs: bool = False
    questions: list[CuratedQuestion] | None = None


class TestCurate(TestCreate): #pyq
    questions: list[CuratedQuestion] | None = None

class TestCurateMains(TestBase):
    title: str
    exam: ExamCMS
    stage: StageCMS
    paper: PaperCMS
    test_size: int

    subjects: list[SubjectCMS] | None = None
    topics: list[TestTopicCMS] | None = None
    test_type: TEST_TYPE = TEST_TYPE.custom
    question_mode: TEST_SELECT_Q_MODE = TEST_SELECT_Q_MODE.all
    is_full_length: bool = False
    # for daily test
    is_daily_test: bool = False
    daily_test_date: date = None
    # for pyq test
    select_exam_year: int | None = None
    # for current affairs test
    is_current_affairs: bool = False
    source: list[SOURCE_TYPE] | None = None

    questions: list[CuratedQuestion] | None = None


class TestUpdate(TestCreate):
    created_by_id: int | None = None
    tenant_id: int | None = None

    test_download_url: str | None = None

    test_status: TEST_STATUS | None = None
    is_recommended: bool | None = None
    is_active: bool | None = None

    questions_count: int | None = None
    max_duration: float | None = None
    max_marks: float | None = None

    attempts_count: int | None = 0
    avg_score: float | None = None
    max_score: float | None = None


class TestResponse(BaseSchema):
    id: int
    title: str
    exam: ExamCMS
    stage: StageCMS
    paper: PaperCMS
    test_size: int

    subjects: list[SubjectCMS] | None = None
    topics: list[TestTopicCMS] | None = None
    test_type: TEST_TYPE | None = None
    question_mode: TEST_SELECT_Q_MODE | None = None
    is_daily_test: bool | None = None
    daily_test_date: date | None = None
    is_current_affairs: bool | None = None
    is_full_length: bool | None = None
    select_exam_year: int | None = None
    source: list[SOURCE_TYPE] | None = None
    created_by_id: int | None = None
    tenant_id: int | None = None

    test_download_url: str | None = None

    test_status: TEST_STATUS | None = None
    is_recommended: bool | None = None
    is_active: bool | None = None

    questions_count: int | None = None
    max_duration: float | None = None
    max_marks: float | None = None

    attempts_count: int | None = 0
    avg_score: float | None = None
    max_score: float | None = None
    test_status: TEST_STATUS
    created_by: UserBasicInfo | None = None

    # questions: list[QuestionResponse] | None = None
    shares: list[TestShareInfo] | None = None

class TestV2Response(BaseSchema):
    id: int
    title: str
    exam: ExamCMS
    stage: StageCMS
    paper: PaperCMS
    test_size: int

    subjects: list[SubjectCMS] | None = None
    topics: list[TestTopicCMS] | None = None
    test_type: TEST_TYPE | None = None
    question_mode: TEST_SELECT_Q_MODE | None = None
    is_daily_test: bool | None = None
    daily_test_date: date | None = None
    is_current_affairs: bool | None = None
    is_full_length: bool | None = None
    select_exam_year: int | None = None
    source: list[SOURCE_TYPE] | None = None
    created_by_id: int | None = None
    tenant_id: int | None = None

    test_download_url: str | None = None

    test_status: TEST_STATUS | None = None
    is_recommended: bool | None = None
    is_active: bool | None = None

    questions_count: int | None = None
    max_duration: float | None = None
    max_marks: float | None = None

    attempts_count: int | None = 0
    avg_score: float | None = None
    max_score: float | None = None
    test_status: TEST_STATUS
    created_by: UserBasicInfo | None = None

    created_at: datetime  | None = None

    # questions: list[QuestionResponse] | None = None
    shares: list[TestShareInfo] | None = None

class TestListResponse(BaseSchema):
    Test:TestResponse

class MyTestResponse(TestResponse):
    # test: TestResponse
    attempts_by_me: int
    shared_with_me: bool

class AdminTestResp(BaseSchema):
    total_count: int
    tests: list[TestResponse] | None = None

class TestCurateAddQuestionResponse(TestResponse, QuestionResponse):
    pass

class PlanTestResp(BaseSchema):
    offering_category: str | None = None
    offering_sub_type:  str | None = None
    offering_name: str | None = None
    offering_photo: str | None = None
    prod_code:  str | None = None
    prod_name:  str | None = None
    plantask_id: int | None = None
    task_planned_completion_date: date | None = None
    task_status: str | None = None
    plantaskuser_id: int | None = None
    taskuser_planned_completion_date: date | None = None
    taskuser_status: str | None = None
    Test:TestV2Response


"""
Test Question
"""


class TestQuestionBase(BaseSchema):
    pass


class TestQuestionCreate(TestQuestionBase):
    test_id: int
    question_id: int
    duration: float | None = None
    max_marks: float | None = None
    negative_marks: float | None = None
    tq_order: int | None = None


class TestQuestionUpdate(TestQuestionBase):
    correct_attempts_percent: float | None = None
    attempts_count: int | None = None


class TQEvaluationMains(BaseSchema):
    marks_obtained: float | None = None
    micro_comment: str | None = None
    test_evaluation_id: int | None = None


class TestQuestionResponse(TestQuestionCreate):
    question: QuestionResponse | None = None
    correct_attempts_percent: float | None = None
    attempts_count: int | None = None
    attempts_percent: float | None = None
    is_reported: bool = False


class TestQuestionOrder(BaseSchema):
    question_id: int
    tq_order: int


"""
Test Attempt
"""


class TestAttemptBase(BaseSchema):
    pass


class TestAttemptCreate(BaseSchema):
    test_id: int
    attempted_by_id: int
    plantask_id:int | None = None
    product_id: int | None = None
    is_qbank_attempt: bool | None = None
    test_attempt_mode: TEST_ATTEMPT_MODE | None = TEST_ATTEMPT_MODE.exam
    with_omr_sheet: bool | None = None
    record_elimination: bool | None = None


class TestAttemptUpdate(BaseSchema):
    status: TEST_ATTEMPT_STATUS | None = None
    test_attempt_mode: TEST_ATTEMPT_MODE | None = None
    in_app_answering: bool | None = None
    record_elimination: bool | None = None
    answer_upload_url: str | None = None
    score: float | None = None
    time_elapsed: float | None = None
    correct: int | None = None
    incorrect: int | None = None
    unattempted: int | None = None
    macro_comment: TestAttemptMainsFeedback | None = None

class TestAttemptReviewerUpdate(BaseSchema):
    score: float | None = None
    unattempted: int | None = None
    macro_comment: TestAttemptMainsFeedback | None = None


class TestEvaluationMains(BaseSchema):
    evaluation_upload_url: str | None = None
    re_evaluation_upload_url: str | None = None
    unattempted: int | None = None
    macro_comment: TestAttemptMainsFeedback | None = None
    test_evaluation_id: int | None = None
    

class TestAttemptResponse(TestAttemptCreate, TestAttemptUpdate):
    id: int
    evaluation_upload_url: str | None = None
    re_evaluation_upload_url: str | None = None
    re_evaluation_requested: bool | None = None
    re_evaluation_reason: str | None = None
    test: TestResponse
    created_at: datetime | None = None
    updated_at: datetime | None = None

class TestAttempV2tResponse(TestAttemptCreate, TestAttemptUpdate):
    id: int
    is_physical_test_attempt: bool | None = None
    evaluation_upload_url: str | None = None
    re_evaluation_upload_url: str | None = None
    re_evaluation_requested: bool | None = None
    re_evaluation_reason: str | None = None
    test_evaluation_status:  str | None = None
    test: TestResponse
    created_at: datetime | None = None
    updated_at: datetime | None = None



class TestStatusTestAttemptResponse(BaseSchema):
    test_type: TEST_TYPE | None = None
    TestAttempt: TestAttemptResponse | None = None

class TestCustomResponse(BaseSchema):
    Test: TestV2Response
    TestAttempt: TestAttemptResponse | None = None

class PlanTestTAResp(BaseSchema):
    offering_category: str | None = None
    offering_sub_type:  str | None = None
    offering_name: str | None = None
    offering_photo: str | None = None
    prod_code:  str | None = None
    prod_name:  str | None = None
    plantask_id: int | None = None
    Test:TestV2Response | None = None
    task_planned_completion_date: date | None = None
    task_status: str | None = None
    plantaskuser_id: int | None = None
    taskuser_planned_completion_date: date | None = None
    taskuser_status: str | None = None
    TestAttempt:TestAttemptResponse | None = None

class PlanTaskTestTaken(BaseSchema):
    Test: TestV2Response
    attempts_count: int

"""
Test Question Attempt
"""


class TestQuestionAttemptBase(BaseSchema):
    pass


class TestQuestionAttemptCreate(TestQuestionAttemptBase):
    test_attempt_id: int
    test_id: int
    question_id: int
    attempted_by_id: int
    time_elapsed: float | None = None
    answer_text: str | None = None
    selected_options: list[OptionCMS] | None = None
    elimination_technique: ELIMINATION_TECHINQUE | None = None


class TestQuestionAttemptUpdate(TestQuestionAttemptBase):
    time_elapsed: float | None = None
    answer_text: str | None = None
    selected_options: list[OptionCMS] | None = None
    is_correct_attempt: bool | None = None
    marks_obtained: float | None = None
    is_starred: bool | None = None
    # micro_comments: str | None = None
    elimination_technique: ELIMINATION_TECHINQUE | None = None


class TestQuestionAttemptResponse(TestQuestionAttemptUpdate):
    test_attempt_id: int | None = None
    test_id: int | None = None
    question_id: int | None = None
    attempted_by_id: int | None = None

class TestQAttempt(BaseSchema):
    time_elapsed: float
    answer_text: str | None = None # for sq
    selected_options: list[OptionCMS] | None = None


"""
Test Share
"""


class TestShareBase(BaseSchema):
    pass


class TestShareCreate(TestShareBase):
    test_id: int
    shared_with_id: int
    shared_by_id: int


class TestShareUpdate(TestShareBase):
    pass


class TestShareResponse(TestShareCreate):
    id: int
    shared_with: UserResponse
    shared_by: UserResponse


"""
Test Result & Analysis 
"""


class ComparativeAnalysis(BaseSchema):
    rank: int
    percentile: float


class AggregateAnalysis(BaseSchema):
    avg_score: float
    max_score: float
    attempts_count: int


class TestAttemptResult(TestAttemptResponse, ComparativeAnalysis):
    # test attempt results
    # comparative aggregates
    pass


class QuestionWiseReport(QuestionResponse, TestQuestionAttemptResponse):
    correct_percentage: float | None = None


class QuestionFavoriteCreate(BaseSchema):
    question_id: int
    is_favorite: bool


class QuestionFavoriteUpdate(QuestionFavoriteCreate):
    pass


class QuestionFavoriteResponse(QuestionFavoriteCreate):
    marked_by_id: int
    question: QuestionResponse

class TestEvaluationCreate(BaseSchema):
    pass 

class TestEvaluationUpdate(BaseSchema):
    pass

class TestAttemptAssign(BaseSchema):
    evaluator_id: int

class TestAttemptEvalStart(BaseSchema):
    test_evaluation_id: int

class TestReviewSchema(BaseSchema):
    test_evaluation_id: int
    reviewer_id: int | None = None
    status: TEST_ASSESSMENT_STATUS | None = None
    comments: str | None = None

class TestAttemptReEval(BaseSchema):
    re_evaluation_reason:str

class TestEvalAnnotationUpdate(BaseSchema):
    evaluation_annotation: str | None = None
    re_evaluation_annotation: str | None = None

class TestEvalAnnoResultResp(BaseSchema):
    id:int
    status: str | None = None
    created_at: datetime | None = None
    evaluation_annotation: str | None = None
    re_evaluation_annotation: str | None = None

class MainsSubmitSchema(BaseSchema):
    time_elapsed: float
    unattempted: int
    answer_url: str | None = None

class TestEvaluationQSchema(BaseSchema):
    micro_comment: str | None = None
    marks_obtained: float | None = None
    question_id: int

class TestCustomByStatus(BaseSchema):
    paper_ids: list[int] | None = None
    subject_ids:list[int] | None = None
    topic_ids:list[int] | None = None
    test_attempt_mode:TEST_ATTEMPT_MODE | None = None
    offset: int
    limit:int
    status: list[TEST_ATTEMPT_STATUS] | None = None
    # assesment_status: TEST_ASSESSMENT_STATUS | None = None
    is_evaluated: bool | None = None

class TestNewCustom(BaseSchema):
    paper_ids: list[int] | None = None
    subject_ids:list[int] | None = None
    topic_ids:list[int] | None = None
    test_attempt_mode:TEST_ATTEMPT_MODE | None = None
    offset: int
    limit:int
    # status: list[TEST_ATTEMPT_STATUS] | None = None
    # assesment_status: TEST_ASSESSMENT_STATUS | None = None
    is_evaluated: bool | None = None


class TestAttemptV2Result(TestAttempV2tResponse, ComparativeAnalysis):
    annotations: list[TestEvalAnnoResultResp]

class UploadTestAttempt(BaseSchema):
    test_id:int
    attempted_by_id:int
    product_id: int | None = None
    plantask_id: int | None = None
    is_physical_test_attempt: bool | None = None
    answer_upload_url: str
    submitted_date: date | None = None
    status: TEST_ATTEMPT_STATUS
    test_evaluation_status: TEST_ASSESSMENT_STATUS