from pydantic import ConfigDict, EmailStr, PlainSerializer
from src.base.schemas import BaseSchema, PhoneNumber
from src.base.schemas import BaseSchema
from enum import Enum
from datetime import datetime, date, time
from typing import Annotated, List, Optional, Union
from src.external.cms.schemas import ExamCMS,StageCMS,PaperCMS,SubjectCMS,TopicCMS
from src.modules.tests.schemas import TEST_ASSESSMENT_STATUS, TEST_ATTEMPT_MODE, TEST_ATTEMPT_STATUS

class TASK_TYPE(str, Enum):
    target = "TARGET"
    catchup = "CATCH UP"
    revise = "REVISE"
    reading = "READING"
    test = "TEST"
    mentor_meeting = "MENTOR MEETING"
    online_meeting = "ONLINE MEETING"
    offline_meeting = "OFFLINE MEETING"
    online_test = "ONLINE TEST"
    offline_test = "OFFLINE TEST"
    study_hall = "STUDY HALL"
    # class = "CLASS"
    misc = "MISC"
    mentorship = "MENTORSHIP"
    
class TASK_STATUS(str,Enum):
    open = "OPEN"
    closed = "CLOSED"
    inprogess = "IN PROGRESS"

class STUDYPLAN_STATUS(str,Enum):
    draft = "DRAFT"
    published = "PUBLISHED"

class STUDYPLANUSER_STATUS(str, Enum):
    active = "ACTIVE"
    inactive = "INACTIVE"
    open = "OPEN"
    closed = "CLOSED"
    inprogess = "IN PROGRESS"
    completed = "COMPLETED"

class TASKUSER_STATUS(str,Enum):
    open = "OPEN"
    closed = "CLOSED"
    inprogess = "IN PROGRESS"
    completed = "COMPLETED"

class SubjectArea(str,Enum):
    gs_prelims = "GS Prelims"
    gs_mains = "GS Mains"
    gs_currentaffairs = "GS Current Affairs"
    csat = "CSAT"
    optional = "Optional"

class MaterialSchema(BaseSchema):
    id:int 
    material: str  | None = None
    material_type: str | None = None
    name:str  | None = None
    material_link: str  | None = None
    creation_type: str
    file_name: str  | None = None
    file_type: str  | None = None
    publishing_status: str  | None = None
    review_status: str  | None = None
   
class UserInfo(BaseSchema):
    id:int
    name: str
    photo: str | None = None

class StudyPlanCreate(BaseSchema):
    name: str
    offering_id:int
    batch_id: int | None = None
    product_id: int
    created_by_id: int
    created_by: UserInfo
    remarks: str | None = None
    status: STUDYPLAN_STATUS 

class StudyPlanUpdate(BaseSchema):
    name: str  | None = None
    last_updated_by:UserInfo | None = None
    remarks: str | None = None
    is_deleted: bool | None = None
    status: STUDYPLAN_STATUS   | None = None

class StudyPlanResponse(StudyPlanCreate):
    id:int | None = None
    is_deleted: bool

    '''
    The meeting type.

    1 - An instant meeting.
    2 - A scheduled meeting.
    3 - A recurring meeting with no fixed time.
    8 - A recurring meeting with fixed time.
    10 - A screen share only meeting.
    '''

class MentorshipMeetings(BaseSchema):
    uuid: str | None = None
    id: int | None = None
    host_id: str | None = None
    host_email: str | None = None
    topic: str | None = None
    type: int | None = None
    status: str | None = None
    start_time: datetime | None = None
    duration: int | None = None
    timezone: str | None = None
    agenda: Optional[str]
    created_at: datetime | None = None
    start_url: str | None = None #URL to start the meeting. This URL should only be used by the host of the meeting and should not be shared with anyone other than the host of the meeting, since anyone with this URL will be able to log in to the Zoom Client as the host of the meeting.
    join_url: str | None = None #URL for participants to join the meeting. This URL should only be shared with users that you would like to invite for the meeting.
    password: str | None = None
    encrypted_password: Optional[str]


class PlanTaskBase(BaseSchema):
    name: str
    task_type: TASK_TYPE
    task_seq_id: int = 0
    studyplan_id: int
    papers: list[PaperCMS] | None = []
    subjects: list[SubjectCMS] | None = []
    topics: list[TopicCMS] | None = []
    subject_area: SubjectArea
    test_id: int | None = None
    study_materials: list[dict] | None = []
    planned_time: int | None = None
    planned_completion_date: date | None = None
    actual_completion_date: date | None = None
    target_marks: int | None = None
    links: list[str] | None = []
    mentorship_meetings: list[MentorshipMeetings] | None = []
    reference_materials: list[str] | None = []
    current_affairs_type: dict | None = None  # e.g., {"type": "CAReading"}
    created_by_id: int
    created_by: UserInfo
    status: TASK_STATUS
    remarks: str | None = None

class PlanTaskCreate(PlanTaskBase):
    pass

class PlanTaskUpdate(BaseSchema):
    name: str  | None = None
    task_seq_id: int  | None = None
    task_type: str  | None = None
    studyplan_id: int  | None = None
    papers: list[PaperCMS] | None = []
    subjects: list[SubjectCMS] | None = []
    topics: list[TopicCMS] | None = []
    subject_area: SubjectArea  | None = None
    test_id: int | None = None
    study_materials: list[MaterialSchema] | None = []
    planned_time: int | None = None
    planned_completion_date: date | None = None
    actual_completion_date: date | None = None
    target_marks: int | None = None
    links: list[str] | None = []
    mentorship_meetings: list[MentorshipMeetings] | None = []
    reference_materials: list[str] | None = []
    current_affairs_type: dict | None = None
    last_updated_by:UserInfo | None = None
    remarks: str | None = None
    is_deleted: bool | None = None
    status: TASK_STATUS  | None = None


class PlanTaskResponse(PlanTaskBase):
    id: int | None = None
    is_deleted: bool

class PlanTaskCopy(BaseSchema):
    product_id:int
    studyplan_id:int
    
class StudyPlanUserCreate(BaseSchema):
    studyplan_id: int
    student_id: int
    enrollment_id: int 
    purchase_id: int
    product_id: int 
    status: STUDYPLANUSER_STATUS

class StudyPlanUserUpdate(BaseSchema):
    status: STUDYPLANUSER_STATUS | None = None
    is_deleted: bool | None = None

class StudyPlanUserResponse(StudyPlanUserCreate):
    id:int | None = None
    is_deleted: bool

class PlanTaskUserCreate(BaseSchema):
    plantask_id: int
    student_id: int
    studyplan_id: int
    purchase_id: int
    planned_completion_date: date | None = None
    actual_completion_date: date | None = None
    student_remarks: list[dict] | None = [] 
    teacher_remarks: list[dict] | None = [] 
    status: TASK_STATUS

class PlanTaskUserUpdate(BaseSchema):
    student_remarks: list[dict] | None = [] 
    teacher_remarks: list[dict] | None = [] 
    planned_completion_date: date | None = None
    actual_completion_date: date | None = None
    status: TASK_STATUS | None = None
    is_deleted: bool | None = None
    

class PlanTaskUserResponse(PlanTaskUserCreate):
    id:int | None = None
    is_deleted: bool | None = None

class PlanTaskWithUsersSchema(BaseSchema):
    id: int | None = None
    is_deleted: bool
    name: str
    task_type: TASK_TYPE
    task_seq_id: int = 0
    studyplan_id: int
    papers: list[PaperCMS] | None = []
    subjects: list[SubjectCMS] | None = []
    topics: list[TopicCMS] | None = []
    subject_area: SubjectArea
    test_id: int | None = None
    study_materials: list[dict] | None = []
    planned_time: int | None = None
    planned_completion_date: date | None = None
    actual_completion_date: date | None = None
    target_marks: int | None = None
    links: list[str] | None = []
    reference_materials: list[str] | None = []
    current_affairs_type: dict | None = None
    created_by_id: int
    created_by: UserInfo
    status: TASK_STATUS
    remarks: str | None = None
    plantaskusers: list[PlanTaskUserResponse]

class PlanTaskDate(BaseSchema):
    from_date: date | None = None
    till_date: date | None = None
    studyplan_id: int | None = None

class PlanTaskByProd(BaseSchema):
    prod_ids: list[int] | None = None
    from_date: date | None = None
    till_date: date | None = None

class PlanTaskByPur(BaseSchema):
    pur_ids:list[int] | None = None
    from_date: date | None = None
    till_date: date | None = None

class PurchasePlantaskCreate(BaseSchema):
    purchase_id:int
    studyplan_id:int
    student_id:int

class PurchaseStudyplanCreate(BaseSchema):
    studyplan_id:int
    product_id: int 

class AssignPlantaskUser(BaseSchema):
    plantask_id:int
    studyplan_id:int

class StudentPurchaseSchema(BaseSchema):
    student_id: int
    purchase_id:int

class AssigntasktoSelectStudents(BaseSchema):
    plantask_id:int
    studyplan_id:int
    student_purchases: list[StudentPurchaseSchema]
    # student_ids: list[int]

class TasksNewTests(BaseSchema):
    student_id:int
    offset: int
    limit: int
    exam_id:int
    stage_ids:list[int] = []
    paper_ids: list[int] = []
    subject_ids: list[int] = []
    topic_ids: list[int] = []
    
class StudentTasksTests(BaseSchema):
    student_id:int
    offset: int
    limit: int
    exam_id:int
    stage_ids:list[int] = []
    paper_ids: list[int] = []
    subject_ids: list[int] = []
    topic_ids: list[int] = []
    task_status: str | None = None
    
class TasksAttemptTests(BaseSchema):
    student_id:int
    offset: int
    limit: int
    exam_id:int
    stage_ids:list[int] = []
    paper_ids: list[int] = []
    subject_ids: list[int] = []
    topic_ids: list[int] = []
    test_attempt_mode:TEST_ATTEMPT_MODE | None = None
    attempt_status: TEST_ATTEMPT_STATUS | None = None
    is_evaluated: bool | None = None

class GenerateCATasksRequest(BaseSchema):
    studyplan_id: int
    start_date: date
    end_date: date
    daily_ca_minutes: int | None = 30  # Default 30 minutes
    cycle_type: str | None = None  # Optional: C2, C3, C4, C5, C6
    exclude_weekdays: list[int] | None = []  # 0=Monday, 6=Sunday
    created_by_id: int
    created_by: UserInfo
