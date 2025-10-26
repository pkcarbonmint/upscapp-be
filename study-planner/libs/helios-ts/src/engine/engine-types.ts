export interface TaskEffortSplit {
  study: number;
  revision: number;
  practice: number;
  gs_optional_ratio: number;
}

// Configuration interface
export interface Config {
  block_duration_clamp: {
    min_weeks: number;
    max_weeks: number;
  };
  daily_hour_limits: {
    regular_day: number;
    catch_up_day: number;
    test_day: number;
  };
  task_effort_split: TaskEffortSplit;
}

// Feedback types
export interface MonthlyFeedback {
  subjectiveFeeling: 'FellBehind' | 'OnTrack' | 'GotAhead';
  // Add other feedback fields as needed
}

export interface PerformanceData {
  // Add performance data fields as needed
}

export interface PlanReviewResult {
  review_id: string;
  plan_id: string;
  overall_score: number;
  is_executable: boolean;
  validation_issues: any[];
  fix_suggestions: any[];
  summary: string;
  detailed_feedback: Record<string, string[]>;
}

// Archetype adjustment interface
export interface ArchetypeAdjustment {
  originalHours: number;
  adjustedHours: number;
  adjustmentReason: string;
}
