from pydantic import BaseModel, Field
from enum import Enum
from typing import Dict, List, Optional, Any
from datetime import date


class SubjectLevel(str, Enum):
	very_weak = "very_weak"
	weak = "weak"
	average = "average"
	strong = "strong"
	very_strong = "very_strong"


class StudyPacing(str, Enum):
	weak_first = "weak_first"
	strong_first = "strong_first"


class StudyApproach(str, Enum):
	single_focus = "single_focus"
	dual_focus = "dual_focus"
	triple_focus = "triple_focus"


class IntakeSchema(BaseModel):
	assessments: Dict[str, SubjectLevel]
	weekly_study_hours: int = Field(gt=0)
	study_pacing: StudyPacing
	study_approach: Optional[StudyApproach] = None
	revision_ratio: Optional[float] = Field(None, ge=0.0, le=1.0)
	practice_ratio: Optional[float] = Field(None, ge=0.0, le=1.0)


class GeneratePlanRequest(BaseModel):
	user_id: int
	product_id: int
	offering_id: int
	created_by_id: int
	created_by_name: str
	intake: IntakeSchema


class GeneratePlanFromWizardRequest(BaseModel):
	"""Request to generate a plan directly from the wizard payload.

	Fields mirror `GeneratePlanRequest`, but `wizard` carries the raw UI
	payload which the backend adapts to the engine intake.
	"""
	user_id: int
	product_id: int
	offering_id: int
	created_by_id: int
	created_by_name: str
	wizard: Dict[str, Any]  # Raw wizard data from frontend


class GeneratePlanResponse(BaseModel):
	studyplan_id: int


class MentorFeedback(str, Enum):
	ahead = "ahead"
	on_track = "on_track"
	behind = "behind"


class RebalanceRequest(BaseModel):
	adherence_rate: float = Field(ge=0.0, le=1.0)
	actual_hours_per_day: Optional[float] = Field(None, ge=0.0)
	mentor_feedback: Optional[MentorFeedback] = None
	pending_task_ids: List[int] = Field(default_factory=list)


class HealthCheckResponse(BaseModel):
	haskell_server_available: bool
	status: str


class ChangeSummary(BaseModel):
	extended_block_weeks: int = 0
	added_hours_per_day: float = 0.0
	redistributed_pending_tasks: int = 0
	notes: Optional[str] = None


class BlockSchema(BaseModel):
	block_id: str
	title: str
	cycle_id: Optional[str] = None
	cycle_type: Optional[str] = None  # FoundationCycle, ConsolidationCycle, etc.
	cycle_order: Optional[int] = None
	cycle_name: Optional[str] = None
	subjects: List[str]
	duration_weeks: int
	weekly_plan: Dict[str, Any]
	resources: Dict[str, List[str]]
	block_start_date: Optional[date] = None  # NEW: Block start date
	block_end_date: Optional[date] = None    # NEW: Block end date


class CycleSchema(BaseModel):
	cycle_id: str
	cycle_type: str  # FoundationCycle, ConsolidationCycle, etc.
	cycle_name: str
	cycle_order: int
	cycle_duration: int
	cycle_blocks: List[BlockSchema]
	cycle_start_date: Optional[date] = None  # NEW: Cycle start date
	cycle_end_date: Optional[date] = None    # NEW: Cycle end date

class StudyPlanSchema(BaseModel):
	study_plan_id: str
	user_id: str
	title: str
	cycles: Optional[List[CycleSchema]] = None
	curated_resources: Dict[str, Any]
	effective_season_context: Optional[str] = None
	created_for_target_year: Optional[str] = None


