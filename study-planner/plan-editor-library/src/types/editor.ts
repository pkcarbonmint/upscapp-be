// TypeScript types for the Plan Editor Library
// Based on the Haskell Types.Planning module

export interface Task {
  task_id: string;
  humanReadableId: string;
  title2: string;
  duration_minutes: number;
  details_link?: string;
  currentAffairsType?: CurrentAffairsTaskType;
  task_resources?: Resource[];
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
  block_id: string;
  block_title: string;
  cycle_id?: string;
  cycle_type?: CycleType;
  cycle_order?: number;
  cycle_name?: string;
  subjects: string[];
  duration_weeks: number;
  weekly_plan: WeeklyPlan[];
  block_resources: BlockResources;
  block_start_date?: string;
  block_end_date?: string;
}

export interface StudyCycle {
  cycleId: string;
  cycleType: CycleType;
  cycleIntensity: CycleIntensity;
  cycleDuration: number; // duration in weeks
  cycleStartWeek: number; // absolute week number from plan start
  cycleOrder: number;
  cycleName: string;
  cycleBlocks: Block[];
  cycleDescription: string;
  cycleStartDate?: string;
  cycleEndDate?: string;
}

export interface StudyPlan {
  study_plan_id: string;
  user_id: string;
  plan_title: string;
  curated_resources: PlanResources;
  effective_season_context?: EffectiveStudySeason;
  created_for_target_year?: string;
  timelineAnalysis?: TimelineAnalysis;
  cycles?: StudyCycle[];
  timelineUtilization?: number;
  milestones?: MajorMilestones;
}

// Enums
export enum CycleType {
  FoundationCycle = "FoundationCycle",
  ConsolidationCycle = "ConsolidationCycle", 
  RevisionCycle = "RevisionCycle",
  IntensiveCycle = "IntensiveCycle",
  PrelimsCycle = "PrelimsCycle",
  MainsCycle = "MainsCycle"
}

export enum CycleIntensity {
  Relaxed = "Relaxed",
  Moderate = "Moderate",
  Intensive = "Intensive"
}

// Supporting types
export interface Resource {
  resource_id: string;
  title: string;
  url?: string;
  type: string;
}

export interface BlockResources {
  resources: Resource[];
}

export interface PlanResources {
  resources: Resource[];
}

export interface TimelineAnalysis {
  currentYear: number;
  targetYear: number;
  weeksAvailable: number;
  cycleCount: number;
  cycleDistribution: Array<[CycleType, number]>;
}

export interface MajorMilestones {
  foundationToPrelimsDate?: string;
  prelimsToMainsDate?: string;
}

export interface CurrentAffairsTaskType {
  type: string;
}

export interface EffectiveStudySeason {
  season: string;
}

// Editor-specific types
export interface PlanEditorState {
  plan: StudyPlan;
  selectedCycle?: string;
  selectedBlock?: string;
  selectedWeek?: number;
  isDirty: boolean;
  lastSaved?: Date;
  validationErrors: ValidationError[];
}

export interface ValidationError {
  path: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
}

export interface DragDropItem {
  type: 'cycle' | 'block' | 'week' | 'task';
  id: string;
  data: any;
  sourceIndex: number;
  targetIndex?: number;
}

export interface PlanEditorProps {
  initialPlan: StudyPlan;
  onChange: (plan: StudyPlan) => void;
  onSave?: (plan: StudyPlan) => Promise<void>;
  onValidate?: (plan: StudyPlan) => Promise<ValidationError[]>;
  readOnly?: boolean;
  showTimeline?: boolean;
  autoSave?: boolean;
  autoSaveInterval?: number; // milliseconds
}

export interface EditorSession {
  sessionId: string;
  planData: StudyPlan;
  lastSaved: Date;
  userId: string;
  planId?: string;
}
