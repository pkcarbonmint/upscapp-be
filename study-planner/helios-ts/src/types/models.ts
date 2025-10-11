
import type {
  ConfidenceLevel,
  SubjectCode,
  SubjectCombo,
  StudyPacing,
  TimeCommitment,
  SubjectApproach,
  // @ts-ignore
  BudgetPreference,
  // @ts-ignore
  LearningStyle,
  EffectiveStudySeason,
  CycleType,
  CurrentAffairsTaskType,
  DifficultyLevel
} from "./Types";

// From src/Types/Student.hs

export interface Archetype {
  archetype: string;
  timeCommitment: TimeCommitment;
  weeklyHoursMin: number;
  weeklyHoursMax: number;
  description: string;
  defaultPacing: StudyPacing;
  defaultApproach: SubjectApproach;
  specialFocus?: string[];
}

export interface StudyStrategy {
  study_focus_combo: SubjectCombo;
  weekly_study_hours: string;
  time_distribution: string;
  study_approach: StudyPacing;
  revision_strategy: string;
  test_frequency: string;
  seasonal_windows: string[];
  catch_up_day_preference: string;
}

export interface StudentIntake {
  subject_confidence: Record<SubjectCode, ConfidenceLevel>;
  study_strategy: StudyStrategy;
  subject_approach?: SubjectApproach;
  target_year?: string;
  start_date: string;
  personal_details?: PersonalDetails;
  preparation_background?: PreparationBackground;
  coaching_details?: CoachingDetails;
  optional_subject?: OptionalSubjectDetails;
  test_experience?: TestExperience;
  syllabus_awareness?: SyllabusAwareness;
}

export interface PersonalDetails {
  full_name: string;
  email: string;
  phone_number: string;
  present_location: string;
  student_archetype: string;
  graduation_stream: string;
  college_university: string;
  year_of_passing: number;
}

export interface PreparationBackground {
  preparing_since: string;
  number_of_attempts: string;
  highest_stage_per_attempt: string;
  last_attempt_gs_prelims_score: number;
  last_attempt_csat_score: number;
  wrote_mains_in_last_attempt: string;
  mains_paper_marks: string;
}

export interface CoachingDetails {
  prior_coaching: string;
  coaching_institute_name: string;
  prior_mentorship: string;
  programme_mentor_name: string;
  place_of_preparation: string;
}

export interface OptionalSubjectDetails {
  optional_subject_name: string;
  optional_status: string;
  optional_taken_from: string;
}

export interface TestExperience {
  test_series_attempted: string[];
  csat_self_assessment: string;
  csat_weak_areas: string[];
}

export interface SyllabusAwareness {
  gs_syllabus_understanding: string;
  optional_syllabus_understanding: string;
  pyq_awareness_and_use: string;
}

// From src/Types/Planning.hs

export interface Task {
  task_id: string; // UUID
  humanReadableId: string;
  title2: string;
  duration_minutes: number;
  details_link?: string;
  currentAffairsType?: CurrentAffairsTaskType;
  task_resources?: Resource[];
  topicCode?: string; // Track which topic this task belongs to
  taskType?: 'study' | 'practice' | 'revision' | 'test'; // Task category
}

export interface DailyPlan {
  day: number;
  tasks: Task[];
}

export interface WeeklyPlan {
  week: number;
  daily_plans: DailyPlan[];
}

export interface Block {
  block_id: string; // UUID
  block_title: string;
  cycle_id?: string; // UUID
  cycle_type?: CycleType;
  cycle_order?: number;
  cycle_name?: string;
  subjects: string[];
  duration_weeks: number;
  weekly_plan: WeeklyPlan[];
  block_resources: BlockResources;
  block_start_date?: string; // Date
  block_end_date?: string; // Date
  block_description?: string;
  estimated_hours?: number;
  actual_hours?: number;
}

export interface StudyPlan {
  targeted_year: number;
  start_date: Date;
  study_plan_id: string; // UUID
  user_id: string;
  plan_title: string;
  curated_resources: PlanResources;
  effective_season_context?: EffectiveStudySeason;
  created_for_target_year?: string;
  timelineAnalysis?: TimelineAnalysis;
  cycles: StudyCycle[];
  timelineUtilization?: number;
  milestones?: MajorMilestones;
  scenario?: string; // Determined scenario code (S1, S2, S3, etc.)
}

export interface StudyCycle {
  cycleId: string; // UUID
  cycleType: CycleType;
  cycleIntensity: CycleIntensity;
  cycleDuration: number;
  cycleStartWeek: number;
  cycleOrder: number;
  cycleName: string;
  cycleBlocks: Block[];
  cycleDescription: string;
  cycleStartDate: string; //Date
  cycleEndDate: string; //Date
}

export type CycleIntensity =
  | "Relaxed"
  | "Moderate"
  | "Intensive";

export interface TimelineAnalysis {
  currentYear: number;
  targetYear: number;
  weeksAvailable: number;
  cycleCount: number;
  cycleDistribution: [CycleType, number][];
}

export interface MajorMilestones {
  foundationToPrelimsDate?: string;
  prelimsToMainsDate?: string;
}

// From src/PlanReview.hs

export interface PlanReviewResult {
  review_id: string; // UUID
  plan_id: string; // UUID
  overall_score: number;
  is_executable: boolean;
  validation_issues: ValidationIssue[];
  fix_suggestions: FixSuggestion[];
  summary: string;
  detailed_feedback: Record<ReviewCategory, string[]>;
}

export interface ValidationIssue {
  issue_id: string; // UUID
  severity: IssueSeverity;
  category: ReviewCategory;
  title: string;
  description: string;
  affected_blocks: string[]; // UUID[]
  recommended_action: string;
}

export type IssueSeverity = "Critical" | "High" | "Medium" | "Low";

export type ReviewCategory =
  | "TimeManagement"
  | "BlockStructure"
  | "ArchetypeAlignment"
  | "SubjectProgression"
  | "ResourceQuality"
  | "WorkloadBalance";

export interface FixSuggestion {
  fix_id: string; // UUID
  related_issue_id: string; // UUID
  fix_title: string;
  fix_description: string;
  confidence_score: number;
  estimated_impact: string;
  auto_applicable: boolean;
}

// From src/DataTransform.hs

export interface UIWizardData {
  personal_and_academic_details: UIPersonalDetails;
  preparation_background: UIPreparationBackground;
  coaching_and_mentorship: UICoachingDetails;
  optional_subject_details: UIOptionalDetails;
  test_series_and_csat: UITestExperience;
  syllabus_and_pyq_awareness: UISyllabusAwareness;
  subject_confidence: UISubjectConfidence;
  study_strategy: UIStudyStrategy;
  start_date?: string;
}

export interface UIPersonalDetails {
  full_name: string;
  email: string;
  phone_number: string;
  present_location: string;
  current_status: string;
  graduation_stream: string;
  college_university: string;
  year_of_passing: number;
}

export interface UIPreparationBackground {
  preparing_since: string;
  target_year: string;
  number_of_attempts: string;
  highest_stage_per_attempt: string;
  last_attempt_gs_prelims_score: number;
  last_attempt_csat_score: number;
  wrote_mains_in_last_attempt: string;
  mains_paper_marks: string;
}

export interface UICoachingDetails {
  prior_coaching: string;
  coaching_institute_name: string;
  prior_mentorship: string;
  programme_mentor_name: string;
  place_of_preparation: string;
}

export interface UIOptionalDetails {
  optional_subject: string;
  optional_status: string;
  optional_taken_from: string;
}

export interface UITestExperience {
  test_series_attempted: string[];
  csat_self_assessment: string;
  csat_weak_areas: string[];
}

export interface UISyllabusAwareness {
  gs_syllabus_understanding: string;
  optional_syllabus_understanding: string;
  pyq_awareness_and_use: string;
}

export interface UISubjectConfidence {
  prelims_confidence: UIPrelimsConfidence;
  mains_gs1_confidence: UIMainsGS1Confidence;
  mains_gs2_confidence: UIMainsGS2Confidence;
  mains_gs3_confidence: UIMainsGS3Confidence;
  mains_gs4_optional_confidence: UIMainsGS4Confidence;
}

export interface UIPrelimsConfidence {
  prelims_current_events: string;
  prelims_history_of_india: string;
  prelims_indian_world_geography: string;
  prelims_polity_governance: string;
  prelims_economy_social_development: string;
  prelims_environment_ecology: string;
  prelims_science_technology: string;
  prelims_csat: string;
}

export interface UIMainsGS1Confidence {
  gs1_essay: string;
  gs1_indian_culture: string;
  gs1_modern_history: string;
  gs1_world_history: string;
  gs1_post_independence_india: string;
  gs1_indian_society: string;
  gs1_indian_world_geography: string;
}

export interface UIMainsGS2Confidence {
  gs2_constitution: string;
  gs2_polity: string;
  gs2_governance: string;
  gs2_social_justice: string;
  gs2_international_relations: string;
}

export interface UIMainsGS3Confidence {
  gs3_economy: string;
  gs3_agriculture: string;
  gs3_environment: string;
  gs3_science_technology: string;
  gs3_disaster_management: string;
  gs3_internal_security: string;
}

export interface UIMainsGS4Confidence {
  gs4_ethics_integrity_aptitude: string;
  gs4_optional_subject_paper1: string;
  gs4_optional_subject_paper2: string;
}

export interface UIStudyStrategy {
  study_focus_combo: SubjectCombo;
  weekly_study_hours: string;
  time_distribution: string;
  study_approach: string;
  revision_strategy: string;
  test_frequency: string;
  seasonal_windows: string[];
  catch_up_day_preference: string;
}

// From src/Types/Logging.hs

export type LogLevel = "Debug" | "Info" | "Warn" | "Error";

export interface LogEntry {
  logLevel: LogLevel;
  logSource: string;
  logMessage: string;
}

// From src/Types/Resource.hs

export interface Resource {
  resource_id: string; // UUID
  resource_title: string;
  resource_type: ResourceType;
  resource_url?: string;
  resource_description: string;
  resource_subjects: string[];
  difficulty_level: DifficultyLevel;
  estimated_hours: number;
  resource_priority: ResourcePriority;
  resource_cost: ResourceCost;
}

export type ResourceType =
  | "Book"
  | "VideoLecture"
  | "OnlineCourse"
  | "PracticePaper"
  | "CurrentAffairsSource"
  | "RevisionNotes"
  | "MockTest";

export type ResourcePriority = "Essential" | "Recommended" | "Optional";

export type ResourceCost =
  | { type: "Free" }
  | { type: "Paid", amount: number }
  | { type: "Subscription", plan: string };

export interface BlockResources {
  primary_books: Resource[];
  supplementary_materials: Resource[];
  practice_resources: Resource[];
  video_content: Resource[];
  current_affairs_sources: Resource[];
  revision_materials: Resource[];
  expert_recommendations: Resource[];
}

export interface PlanResources {
  essential_resources: Resource[];
  recommended_timeline: ResourceTimeline;
  budget_summary: BudgetSummary;
  alternative_options: Resource[];
}

export interface ResourceTimeline {
  immediate_needs: Resource[];
  mid_term_needs: Resource[];
  long_term_needs: Resource[];
}

export interface BudgetSummary {
  total_cost: number;
  essential_cost: number;
  optional_cost: number;
  free_alternatives: number;
  subscription_cost: number;
}
