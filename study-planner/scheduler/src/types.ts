import type { Dayjs } from "dayjs";

export type Content = any;
export type SchedulerInput = any;

export type CycleContent = Content;
export type BlockContent = Content;
export type TaskContent = Content;

export type CycleSchedulerInput = SchedulerInput;
export type BlockSchedulerInput = SchedulerInput;
export type TaskSchedulerInput = SchedulerInput;

export type Slot<T extends Content> = {
  startDate: Dayjs;
  endDate: Dayjs;
  content: T;
};

export type Schedule<T = any> = {
  slots: Slot<T>[];
  startDate: Dayjs;
  endDate: Dayjs;
};

export interface CycleSchedule {
  cycleType: CycleType;
  startDate: string;
  endDate: string;
  priority: 'mandatory' | 'conditional';
}
export interface BlockSchedule {
  subjectCode: string;
  startDate: string;
  endDate: string;
}
export type TaskSchedule = Schedule<TaskContent>;
export type CycleScheduler =
  (startDate: Dayjs, endDate: Dayjs, input: CycleSchedulerInput) => CycleSchedule;
export type BlockScheduler =
  (startDate: Dayjs, endDate: Dayjs, input: BlockSchedulerInput) => BlockSchedule;

export type SubjectCode = string;

export type ConfidenceLevel =
  | "NotStarted"
  | "VeryWeak"
  | "Weak"
  | "Moderate"
  | "Strong"
  | "VeryStrong";

export type ConfidenceLevelNumber = number;
export type Subject = {
  subjectCode: SubjectCode;
  baselineHours: number;
  priority?: number; // Higher number = higher priority
  subjectType?: SubjectType; // NEW: GS, Optional, or CSAT
  isOptional?: boolean; // NEW: true for optional subjects
  optionalSubjectName?: string; // NEW: name of optional subject (e.g., "History", "Geography")
};

export type SubjectType = 'GS' | 'Optional' | 'CSAT';

export type GSOptionalRatio = {
  gs: number; // percentage for GS subjects
  optional: number; // percentage for optional subjects
};

export type Subtopic = {
  code: string;
  baselineHours: number;
  band: PriorityLevel;
  topicCode: string;
};

export type AdjustedSubtopic = Subtopic & {
  adjustedHours: number;
};

export type PriorityLevel = 'A' | 'B' | 'C' | 'D';
export const bandOrder: Record<PriorityLevel, number> = { 'A': 1, 'B': 2, 'C': 3, 'D': 4 };

export type PrioritizedItem = {
  item: Subject | Subtopic;
  priority: PriorityLevel;
  confidence: number;
  adjustedHours: number;
};

export type ConfidenceMap = Map<SubjectCode, ConfidenceLevelNumber>;

// Study approach options
export type StudyApproach = 'SingleSubject' | 'DualSubject' | 'TripleSubject' | 'WeakFirst' | 'StrongFirst' | 'Balanced';

// Cycle types (copied from your existing types)
export enum CycleType {
  C1 = "C1", // NCERT Foundation Cycle
  C2 = "C2", // Comprehensive Foundation Cycle
  C3 = "C3", // Mains Revision Pre-Prelims Cycle
  C4 = "C4", // Prelims Reading Cycle
  C5 = "C5", // Prelims Revision Cycle
  C5B = "C5.b", // Prelims Rapid Revision Cycle
  C6 = "C6", // Mains Revision Cycle
  C7 = "C7", // Mains Rapid Revision Cycle
  C8 = "C8" // Mains Foundation Cycle
}

// Task types for effort splitting
export type TaskType = 'study' | 'revision' | 'practice' | 'test' | 'review';

export type SchedulingConfig = {
  studyApproach: StudyApproach;
  cycleType: CycleType;
  maxParallelSubjects: number;
  allowOverlap: boolean;
};

export type SchedulingInput = {
  subjects: Subject[];
  config: SchedulingConfig;
  timeWindow: { start: Dayjs; end: Dayjs };
  totalAvailableHours: number;
  workingHoursPerDay: number;
  gsOptionalRatio?: GSOptionalRatio; // NEW: GS:Optional ratio (e.g., {gs: 0.67, optional: 0.33})
};

export type ScheduledSubject = {
  subject: Subject;
  startDate: Dayjs;
  endDate: Dayjs;
  durationWeeks: number;
  allocatedHours: number;
  studyApproach: StudyApproach;
};

export type SchedulingResult = {
  scheduledSubjects: ScheduledSubject[];
  unscheduledSubjects: Subject[];
  conflicts: SchedulingConflict[];
};

export type SchedulingConflict = any;

export type TaskEffortSplit = {
  [K in TaskType]: number; // percentage allocation
};

export type TaskSchedulingInput = {
  scheduledSubject: ScheduledSubject;
  taskEffortSplit: TaskEffortSplit;
  cycleType: CycleType;
};

export type ScheduledTask = {
  taskType: TaskType;
  subjectCode: string;
  startDate: Dayjs;
  endDate: Dayjs;
  durationHours: number;
  effortPercentage: number;
};

// Weekly task scheduling types
export type WeeklyTask = {
  task_id: string;
  humanReadableId: string;
  title: string;
  duration_minutes: number;
  taskType?: 'study' | 'practice' | 'revision' | 'test';
  currentAffairsType?: any;
  resources?: string[];
};

export type DayState = {
  dayTasks: WeeklyTask[];
  hours: number;
};

export type DailyPlan = {
  day: number;
  tasks: WeeklyTask[];
};

export type WeeklyPlan = {
  week: number;
  daily_plans: DailyPlan[];
};

export type DailyHourLimits = {
  regular_day: number;
  test_day: number;
};

// Day of week enums
export enum DayOfWeek {
  SUNDAY = 'Sunday',
  MONDAY = 'Monday',
  TUESDAY = 'Tuesday',
  WEDNESDAY = 'Wednesday',
  THURSDAY = 'Thursday',
  FRIDAY = 'Friday',
  SATURDAY = 'Saturday'
}

export type WeeklyTaskSchedulingInput = {
  tasks: WeeklyTask[];
  dailyLimits: DailyHourLimits;
  catchupDayPreference?: DayOfWeek;
  testDayPreference?: DayOfWeek;
};

export type WeeklyTaskSchedulingResult = {
  dailyPlans: DailyPlan[];
  totalScheduledHours: number;
  conflicts: TaskSchedulingConflict[];
};

export type TaskSchedulingConflict = {
  type: 'insufficient_time' | 'task_too_large' | 'day_overload' | 'catchup_day_violation';
  message: string;
  affectedTasks: string[];
  affectedDays: number[];
};

// Main scheduling functions
export type SubjectScheduler = (input: SchedulingInput) => SchedulingResult;
export type TaskScheduler = (input: TaskSchedulingInput) => ScheduledTask[];
export type WeeklyTaskScheduler = (input: WeeklyTaskSchedulingInput) => WeeklyTaskSchedulingResult;

// Specific scheduling strategies
export type ParallelSubjectScheduler = SubjectScheduler;
export type SequentialSubjectScheduler = SubjectScheduler;

// Task scheduling strategies
export type ProportionalTaskScheduler = TaskScheduler;
export type PriorityTaskScheduler = TaskScheduler;

export type StudyApproachHandler = {
  canSchedule: (subjects: Subject[], config: SchedulingConfig) => boolean;
  calculateParallelCapacity: (config: SchedulingConfig) => number;
  validateConstraints: (result: SchedulingResult) => SchedulingConflict[];
};

export type StudyApproachHandlers = {
  [K in StudyApproach]: StudyApproachHandler;
};

export type CycleTypeEffects = {
  [K in CycleType]: {
    baselineFactor: number; // multiplier for baseline hours
    taskEffortSplit: TaskEffortSplit;
    minBlockDuration: number;
    maxBlockDuration: number;
  };
};

export interface ScenarioResult {
  scenario: 'S1' | 'S2' | 'S3' | 'S4' | 'S4A' | 'S5' | 'S6' | 'S7' | 'S8'; // Updated to include S4A
  totalTimeAvailable: number;
  schedules: CycleSchedule[];
}

