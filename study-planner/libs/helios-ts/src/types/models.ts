
import { TaskEffortSplit } from "../engine/engine-types";
import {
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
} from "./Types";
import dayjs from 'dayjs';
export type { WeeklyPlan, DailyPlan, Resource } from 'old-scheduler';
import type { Resource, WeeklyPlan, } from 'old-scheduler';

// From src/Types/Student.hs

// Interface for study plan calculations
export interface StudyPlanCalculator {
  getDailyStudyHours(weeklyHours: string): number;
  getWeeklyStudyHours(weeklyHours: string): number;
  getPrelimsExamDate(targetYear: string, coachingInstitute?: string): Date;
  getMainsExamDate(targetYear: string, coachingInstitute?: string): Date;
  getC4StartDate(targetYear: string): Date;
  getC5StartDate(targetYear: string): Date;
  getC6StartDate(prelimsDate: Date): Date;
  getC7StartDate(targetYear: string): Date;
  getGSOptionalRatio(studyApproach: StudyPacing): { gs: number; optional: number };
  getTaskTypeRatios(cycleType: CycleType, timeDistribution?: string): { study: number; practice: number; revision: number; };
  getTaskEffortSplit(cycleType: CycleType, intake: StudentIntake): TaskEffortSplit;
  getConfidenceFactor(level: ConfidenceLevel): number;
  getFoundationCycleEndDate(targetYear: string): Date;
  getPrelimsRevisionPeriod(targetYear: string): { start: Date; end: Date };
  getMainsRevisionPeriod(targetYear: string): { start: Date; end: Date };
  getTargetYear(targetYear?: string): number;
  getTestDurationMinutes(cycleType: CycleType): number;
}

const BASE_TASK_RATIOS: Record<CycleType, TaskEffortSplit> = {
  'C1': { study: 1.0, practice: 0, revision: 0, gs_optional_ratio: 1 },
  'C2': { study: 0.6, practice: 0.2, revision: 0.2, gs_optional_ratio: 1 },
  'C3': { study: 0.7, practice: 0.1, revision: 0.2, gs_optional_ratio: 1 },
  'C4': { study: 0.2, practice: 0.4, revision: 0.4, gs_optional_ratio: 1 },
  'C5': { study: 0.1, practice: 0.5, revision: 0.5, gs_optional_ratio: 1 },
  'C5.b': { study: 0.1, practice: 0.5, revision: 0.4, gs_optional_ratio: 1 },
  'C6': { study: 0.2, practice: 0.3, revision: 0.5, gs_optional_ratio: 1 },
  'C7': { study: 0.1, practice: 0.4, revision: 0.5, gs_optional_ratio: 1  },
  'C8': { study: 0.8, practice: 0.1, revision: 0.1, gs_optional_ratio: 1 }
};

function getTaskEffortSplit(cycleType: CycleType, intake: StudentIntake): TaskEffortSplit {
  // Get base ratios for the cycle type
  let baseRatios = BASE_TASK_RATIOS[cycleType];
  switch(cycleType) {
    case CycleType.C1:
    case CycleType.C2:
    case CycleType.C3:
    case CycleType.C6:
    case CycleType.C7:
        // If optional first, 60% optional else 50:50
      return (intake.study_strategy.optional_first_preference) ?
         {
          ...baseRatios,
          gs_optional_ratio: 40/60
        }
      : baseRatios;

    // GS ONLY
    case CycleType.C4:
    case CycleType.C5:
    case CycleType.C5B:
      return (intake.study_strategy.optional_first_preference) ?
         {
          ...baseRatios,
          gs_optional_ratio: 99.99/100 // i.e. no optional
        }
      : baseRatios;
    case CycleType.C8:
      return baseRatios;
    default:
      throw new Error(`Unknown cycle type: ${cycleType}`);
  }


}

// Implementation of study plan calculations
export class StudyPlanCalculatorImpl implements StudyPlanCalculator {
  // Constants moved from hardcoded values
  private readonly DEFAULT_TARGET_YEAR = '2026';
  private readonly DEFAULT_WEEKLY_HOURS = 56;
  
  // Exam date constants
  private readonly PRELIMS_EXAM_DATE_2026 = '05-28';
  private readonly PRELIMS_EXAM_DATE_DEFAULT = '05-20';
  private readonly MAINS_EXAM_DATE_DEFAULT = '08-20';
  
  // Confidence factors
  private readonly CONFIDENCE_FACTORS: Record<ConfidenceLevel, number> = {
    'VeryStrong': 0.7,
    'Strong': 0.8,
    'Moderate': 1.0,
    'Weak': 1.2,
    'VeryWeak': 1.3,
    'NotStarted': 1.3
  };
  
  // Task type ratios for different cycles

  getDailyStudyHours(weeklyHours: string): number {
    // Handle ranges like "45-55" by taking the average
    if (weeklyHours.includes('-')) {
      const [min, max] = weeklyHours.split('-').map(h => parseInt(h.trim()));
      if (!isNaN(min) && !isNaN(max)) {
        const averageHours = (min + max) / 2;
        return Math.round(averageHours / 7);
      }
    }
    
    // Handle single numbers
    const hours = parseInt(weeklyHours) || this.DEFAULT_WEEKLY_HOURS;
    return Math.round(hours / 7);
  }

  getWeeklyStudyHours(weeklyHours: string): number {
    // Handle ranges like "45-55" by taking the average
    if (weeklyHours.includes('-')) {
      const [min, max] = weeklyHours.split('-').map(h => parseInt(h.trim()));
      if (!isNaN(min) && !isNaN(max)) {
        return Math.round((min + max) / 2);
      }
    }
    
    // Handle single numbers
    return parseInt(weeklyHours) || this.DEFAULT_WEEKLY_HOURS;
  }

  getPrelimsExamDate(targetYear: string): Date {
    const year = parseInt(targetYear || this.DEFAULT_TARGET_YEAR);
    // Default based on year
    if (year === 2026) {
      return new Date(`${year}-${this.PRELIMS_EXAM_DATE_2026}`);
    }
    return new Date(`${year}-${this.PRELIMS_EXAM_DATE_DEFAULT}`);
  }

  getMainsExamDate(targetYear: string): Date {
    const year = parseInt(targetYear || this.DEFAULT_TARGET_YEAR);

    
    return new Date(`${year}-${this.MAINS_EXAM_DATE_DEFAULT}`);
  }

  getC4StartDate(targetYear: string): Date {
    const year = parseInt(targetYear || this.DEFAULT_TARGET_YEAR);
    return new Date(`${year}-01-01`);
  }

  getC5StartDate(targetYear: string): Date {
    const year = parseInt(targetYear || this.DEFAULT_TARGET_YEAR);
    return new Date(`${year}-04-01`);
  }

  getC6StartDate(prelimsDate: Date): Date {
    return dayjs(prelimsDate).add(1, 'day').toDate();
  }

  getC7StartDate(targetYear: string): Date {
    const year = parseInt(targetYear || this.DEFAULT_TARGET_YEAR);
    return new Date(`${year}-08-01`);
  }

  getGSOptionalRatio(studyApproach: StudyPacing): { gs: number; optional: number } {
    switch (studyApproach) {
      case 'WeakFirst':
        return { gs: 0.8, optional: 0.2 }; // More focus on GS for weak students
      case 'StrongFirst':
        return { gs: 0.5, optional: 0.5 }; // Balanced approach
      case 'Balanced':
      default:
        return { gs: 0.67, optional: 0.33 }; // Standard 6:3 ratio
    }
  }

  getTaskTypeRatios(cycleType: CycleType, timeDistribution?: string): TaskEffortSplit {
    let ratios = BASE_TASK_RATIOS[cycleType];

    // Adjust based on time_distribution preference
    if (timeDistribution === 'PracticeHeavy') {
      ratios = {
        ...ratios,
        practice: Math.min(0.6, ratios.practice + 0.2),
        study: Math.max(0.1, ratios.study - 0.1),
        gs_optional_ratio: 1
      };
    } else if (timeDistribution === 'RevisionHeavy') {
      ratios = {
        ...ratios,
        revision: Math.min(0.6, ratios.revision + 0.2),
        study: Math.max(0.1, ratios.study - 0.1),
        gs_optional_ratio: 1
      };
    }

    return ratios;
  }

  getTaskEffortSplit(cycleType: CycleType, intake: StudentIntake): TaskEffortSplit {
    return getTaskEffortSplit(cycleType, intake);
  }

  getConfidenceFactor(level: ConfidenceLevel): number {
    return this.CONFIDENCE_FACTORS[level];
  }

  getFoundationCycleEndDate(targetYear: string): Date {
    const year = parseInt(targetYear || this.DEFAULT_TARGET_YEAR);
    return new Date(`${year - 1}-12-31`);
  }

  getPrelimsRevisionPeriod(targetYear: string): { start: Date; end: Date } {
    const year = parseInt(targetYear || this.DEFAULT_TARGET_YEAR);
    return {
      start: new Date(`${year}-01-01`),
      end: new Date(`${year}-03-31`)
    };
  }

  getMainsRevisionPeriod(targetYear: string): { start: Date; end: Date } {
    const year = parseInt(targetYear || this.DEFAULT_TARGET_YEAR);
    return {
      start: new Date(`${year}-06-01`),
      end: new Date(`${year}-07-31`)
    };
  }

  getTargetYear(targetYear?: string): number {
    return parseInt(targetYear || this.DEFAULT_TARGET_YEAR);
  }

  getTestDurationMinutes(_cycleType: CycleType): number {
    return 3*60; // 3 hours
  }
}

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
  // New UPSC fields
  optional_first_preference?: boolean;
  upsc_optional_subject: string; // code of the optional subject
  weekly_test_day_preference?: string;
}

export interface StudentIntake {
  // All existing fields remain the same
  subject_confidence: Record<SubjectCode, ConfidenceLevel>;
  study_strategy: StudyStrategy;
  subject_approach: SubjectApproach;
  target_year: string;
  start_date: string;
  personal_details: PersonalDetails; // Made required - essential for student identification and contact
  preparation_background: PreparationBackground; // Made required - needed for proper plan generation
  coaching_details?: CoachingDetails; // Keep optional - not all students have coaching
  optional_subject?: OptionalSubjectDetails; // Keep optional - only for students with optional subjects
  test_experience?: TestExperience; // Keep optional - fresher students may not have test experience
  syllabus_awareness?: SyllabusAwareness; // Keep optional - can be assessed later

  // NEW: Calculator instance for all computations
  calculator: StudyPlanCalculator;

  // NEW FUNCTION DECLARATIONS (these will be implemented as getters that call calculator):

  /**
   * Get daily study hours based on weekly_study_hours from study_strategy
   */
  getDailyStudyHours(): number;

  /**
   * Get weekly study hours from study_strategy
   */
  getWeeklyStudyHours(): number;

  /**
   * Get prelims exam date - can be customized based on coaching institute
   */
  getPrelimsExamDate(): Date;

  /**
   * Get mains exam date - can be customized based on coaching institute
   */
  getMainsExamDate(): Date;

  /**
   * Get C4 (Prelims Reading) start date - Jan 1 of target year
   */
  getC4StartDate(): Date;

  /**
   * Get C5 (Prelims Rapid Revision) start date - Apr 1 of target year
   */
  getC5StartDate(): Date;

  /**
   * Get C6 (Mains Revision) start date - After prelims exam
   */
  getC6StartDate(): Date;

  /**
   * Get C7 (Mains Rapid Revision) start date - Aug 1 of target year
   */
  getC7StartDate(): Date;

  /**
   * Get GS:Optional subject ratio based on study approach
   */
  getGSOptionalRatio(): { gs: number; optional: number };

  /**
   * Get task type ratios for different cycle types
   * Move hardcoded ratios from cycle-utils.ts here
   */
  getTaskTypeRatios(cycleType: CycleType): { study: number; practice: number; revision: number; };

  /**
   * Get task effort split based on cycle type and intake properties
   * This combines cycle type with intake-specific adjustments
   * @param cycleType The cycle type (C1, C2, etc.)
   * @returns Task effort split ratios for study, practice, revision, and test
   */
  getTaskEffortSplit(cycleType: CycleType, intake: StudentIntake): TaskEffortSplit;

  /**
   * Get confidence factor for different confidence levels
   * Move hardcoded factors from buildConfidenceMap function
   */
  getConfidenceFactor(level: ConfidenceLevel): number;

  /**
   * Get foundation cycle end date - Dec 31 of year before target year
   */
  getFoundationCycleEndDate(): Date;

  /**
   * Get prelims reading period boundaries
   */
  getPrelimsRevisionPeriod(): { start: Date; end: Date };

  /**
   * Get mains revision period boundaries
   */
  getMainsRevisionPeriod(): { start: Date; end: Date };

  /**
   * Get target year as number
   */
  getTargetYear(): number;

  /**
   * Amount of time to be allocated for tests
   */
  getTestDurationMinutes(cycleType: CycleType): number;
}

export type StudentIntakeDataOnly = Omit<StudentIntake, 'calculator' | 'getDailyStudyHours' | 'getWeeklyStudyHours' | 'getPrelimsExamDate' | 'getMainsExamDate' | 'getC4StartDate' | 'getC5StartDate' | 'getC6StartDate' | 'getC7StartDate' | 'getGSOptionalRatio' | 'getTaskTypeRatios' | 'getTaskEffortSplit' | 'getConfidenceFactor' | 'getFoundationCycleEndDate' | 'getPrelimsRevisionPeriod' | 'getMainsRevisionPeriod' | 'getTargetYear' | 'getTestDurationMinutes'>;

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
  preparing_since: string; // Required - how long they've been preparing
  number_of_attempts: string; // Required - including "0" for freshers
  highest_stage_per_attempt: string; // Required - "N/A" for freshers
  last_attempt_gs_prelims_score?: number; // Optional - not applicable for freshers
  last_attempt_csat_score?: number; // Optional - not applicable for freshers  
  wrote_mains_in_last_attempt?: string; // Optional - not applicable for freshers
  mains_paper_marks?: string; // Optional - not applicable for freshers
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
  cycleStartWeek?: number;
  cycleOrder: number;
  cycleName: string;
  cycleBlocks: Block[];
  cycleDescription: string;
  cycleStartDate: string; //Date
  cycleEndDate: string; //Date
}

export enum CycleIntensity {
  Foundation = 'Foundation',
  Revision = 'Revision',
  Rapid = 'Rapid',
  PreExam = 'PreExam'
}


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
  // New UPSC fields
  optional_first_preference: boolean;
  upsc_optional_subject: string;
  weekly_test_day_preference: number; // 0-6, where 0=Monday, 6=Sunday
}

// From src/Types/Logging.hs

export type LogLevel = "Debug" | "Info" | "Warn" | "Error";

export interface LogEntry {
  logLevel: LogLevel;
  logSource: string;
  logMessage: string;
}

// From src/Types/Resource.hs

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

// Helper function to create StudentIntake with calculator
export function createStudentIntake(
  data: StudentIntakeDataOnly,
  calculator?: StudyPlanCalculator
): StudentIntake {
  const calc = calculator || new StudyPlanCalculatorImpl();
  
  return {
    ...data,
    calculator: calc,
    
    // Implement functions as getters that call calculator
    getDailyStudyHours(): number {
      return this.calculator.getDailyStudyHours(this.study_strategy.weekly_study_hours);
    },

    getWeeklyStudyHours(): number {
      return this.calculator.getWeeklyStudyHours(this.study_strategy.weekly_study_hours);
    },

    getPrelimsExamDate(): Date {
      return this.calculator.getPrelimsExamDate(
        this.target_year || '2026',
        this.coaching_details?.coaching_institute_name
      );
    },

    getMainsExamDate(): Date {
      return this.calculator.getMainsExamDate(
        this.target_year || '2026',
        this.coaching_details?.coaching_institute_name
      );
    },

    getC4StartDate(): Date {
      return this.calculator.getC4StartDate(this.target_year || '2026');
    },

    getC5StartDate(): Date {
      return this.calculator.getC5StartDate(this.target_year || '2026');
    },

    getC6StartDate(): Date {
      const prelimsDate = this.getPrelimsExamDate();
      return this.calculator.getC6StartDate(prelimsDate);
    },

    getC7StartDate(): Date {
      return this.calculator.getC7StartDate(this.target_year || '2026');
    },

    getGSOptionalRatio(): { gs: number; optional: number } {
      return this.calculator.getGSOptionalRatio(this.study_strategy.study_approach);
    },

    getTaskTypeRatios(cycleType: CycleType): { study: number; practice: number; revision: number; } {
      return this.calculator.getTaskTypeRatios(cycleType, this.study_strategy.time_distribution);
    },

    getTaskEffortSplit(cycleType: CycleType): TaskEffortSplit {
      return this.calculator.getTaskEffortSplit(cycleType, this);
    },

    getConfidenceFactor(level: ConfidenceLevel): number {
      return this.calculator.getConfidenceFactor(level);
    },

    getFoundationCycleEndDate(): Date {
      return this.calculator.getFoundationCycleEndDate(this.target_year || '2026');
    },

    getPrelimsRevisionPeriod(): { start: Date; end: Date } {
      return this.calculator.getPrelimsRevisionPeriod(this.target_year || '2026');
    },

    getMainsRevisionPeriod(): { start: Date; end: Date } {
      return this.calculator.getMainsRevisionPeriod(this.target_year || '2026');
    },

    getTargetYear(): number {
      return this.calculator.getTargetYear(this.target_year);
    },

    getTestDurationMinutes(cycleType: CycleType): number {
      return this.calculator.getTestDurationMinutes(cycleType);
    },
  };
}
