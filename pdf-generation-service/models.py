"""
Data models for the PDF generation service.
These models mirror the TypeScript interfaces from the original CalendarDoxService.
"""

from typing import List, Dict, Optional, Any, Union
from pydantic import BaseModel, Field
from datetime import datetime
from enum import Enum


class CycleType(str, Enum):
    C1 = "C1"
    C2 = "C2"
    C3 = "C3"
    C4 = "C4"
    C5 = "C5"
    C5B = "C5.b"
    C6 = "C6"
    C7 = "C7"
    C8 = "C8"


class CycleIntensity(str, Enum):
    Foundation = "Foundation"
    Revision = "Revision"
    Rapid = "Rapid"
    PreExam = "PreExam"


class ResourceType(str, Enum):
    Book = "Book"
    VideoLecture = "VideoLecture"
    OnlineCourse = "OnlineCourse"
    PracticePaper = "PracticePaper"
    CurrentAffairsSource = "CurrentAffairsSource"
    RevisionNotes = "RevisionNotes"
    MockTest = "MockTest"


class ResourcePriority(str, Enum):
    Essential = "Essential"
    Recommended = "Recommended"
    Optional = "Optional"


class DifficultyLevel(str, Enum):
    Beginner = "Beginner"
    Intermediate = "Intermediate"
    Advanced = "Advanced"


class Resource(BaseModel):
    resource_id: str
    resource_title: str
    resource_type: ResourceType
    resource_url: Optional[str] = None
    resource_description: str
    resource_subjects: List[str]
    difficulty_level: DifficultyLevel
    estimated_hours: float
    resource_priority: ResourcePriority
    resource_cost: Optional[Dict[str, Any]] = None


class BlockResources(BaseModel):
    primary_books: List[Resource] = []
    supplementary_materials: List[Resource] = []
    practice_resources: List[Resource] = []
    video_content: List[Resource] = []
    current_affairs_sources: List[Resource] = []
    revision_materials: List[Resource] = []
    expert_recommendations: List[Resource] = []


class Task(BaseModel):
    task_id: str
    humanReadableId: str
    title: str
    duration_minutes: int
    details_link: Optional[str] = None
    currentAffairsType: Optional[str] = None
    task_resources: Optional[List[Resource]] = None
    topicCode: Optional[str] = None
    taskType: Optional[str] = None  # 'study' | 'practice' | 'revision' | 'test'


class DailyPlan(BaseModel):
    day: int
    tasks: List[Task]


class WeeklyPlan(BaseModel):
    week: int
    daily_plans: List[DailyPlan]


class Block(BaseModel):
    block_id: str
    block_title: str
    cycle_id: Optional[str] = None
    cycle_type: Optional[CycleType] = None
    cycle_order: Optional[int] = None
    cycle_name: Optional[str] = None
    subjects: List[str]
    duration_weeks: int
    weekly_plan: List[WeeklyPlan]
    block_resources: BlockResources
    block_start_date: Optional[str] = None
    block_end_date: Optional[str] = None
    block_description: Optional[str] = None
    estimated_hours: Optional[float] = None
    actual_hours: Optional[float] = None


class StudyCycle(BaseModel):
    cycleId: str
    cycleType: CycleType
    cycleIntensity: CycleIntensity
    cycleDuration: int
    cycleStartWeek: Optional[int] = None
    cycleOrder: int
    cycleName: str
    cycleBlocks: List[Block]
    cycleDescription: str
    cycleStartDate: str
    cycleEndDate: str


class PlanResources(BaseModel):
    essential_resources: List[Resource] = []
    recommended_timeline: Optional[Dict[str, Any]] = None
    budget_summary: Optional[Dict[str, Any]] = None
    alternative_options: List[Resource] = []


class StudyPlan(BaseModel):
    targeted_year: int
    start_date: Union[str, datetime]
    study_plan_id: str
    user_id: str
    plan_title: str
    curated_resources: PlanResources
    effective_season_context: Optional[str] = None
    created_for_target_year: Optional[str] = None
    timelineAnalysis: Optional[Dict[str, Any]] = None
    cycles: List[StudyCycle]
    timelineUtilization: Optional[float] = None
    milestones: Optional[Dict[str, Any]] = None
    scenario: Optional[str] = None


class PersonalDetails(BaseModel):
    full_name: str
    email: str
    phone_number: str
    present_location: str
    student_archetype: Optional[str] = None
    graduation_stream: Optional[str] = None
    college_university: Optional[str] = None
    year_of_passing: Optional[int] = None


class PreparationBackground(BaseModel):
    preparing_since: Optional[str] = None
    number_of_attempts: Optional[str] = None
    highest_stage_per_attempt: Optional[str] = None
    last_attempt_gs_prelims_score: Optional[float] = None
    last_attempt_csat_score: Optional[float] = None
    wrote_mains_in_last_attempt: Optional[str] = None
    mains_paper_marks: Optional[str] = None


class StudyStrategy(BaseModel):
    study_focus_combo: Optional[str] = None
    weekly_study_hours: Optional[str] = None
    time_distribution: Optional[str] = None
    study_approach: Optional[str] = None
    revision_strategy: Optional[str] = None
    test_frequency: Optional[str] = None
    seasonal_windows: List[str] = []
    catch_up_day_preference: Optional[str] = None
    optional_first_preference: Optional[bool] = None
    upsc_optional_subject: Optional[str] = None
    weekly_test_day_preference: Optional[str] = None


class OptionalSubjectDetails(BaseModel):
    optional_subject_name: Optional[str] = None
    optional_status: Optional[str] = None
    optional_taken_from: Optional[str] = None


class StudentIntake(BaseModel):
    subject_confidence: Dict[str, str] = {}
    study_strategy: StudyStrategy
    subject_approach: Optional[str] = None
    target_year: str
    start_date: str
    personal_details: PersonalDetails
    preparation_background: Optional[PreparationBackground] = None
    coaching_details: Optional[Dict[str, Any]] = None
    optional_subject: Optional[OptionalSubjectDetails] = None
    test_experience: Optional[Dict[str, Any]] = None
    syllabus_awareness: Optional[Dict[str, Any]] = None


class PDFGenerationRequest(BaseModel):
    study_plan: StudyPlan
    student_intake: StudentIntake
    filename: Optional[str] = None


class PDFGenerationResponse(BaseModel):
    success: bool
    message: str
    filename: Optional[str] = None
    file_size: Optional[int] = None
    generation_time: Optional[float] = None