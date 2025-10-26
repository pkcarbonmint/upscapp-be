import type { TimeCommitment, StudyPacing, SubjectApproach, PrepMode } from './Types';

// From helios-hs/src/Config.hs

export interface DailyHourLimits {
  regular_day: number;
  catch_up_day: number;
  test_day: number;
}

export interface TaskEffortSplit {
  study: number;
  revision: number;
  practice: number;
  test: number;
}

export interface TimeSplitRatio {
  mains: number;
  prelims: number;
  currentAffairs: number;
}

export interface ConfidenceMultipliers {
  very_weak: number;
  weak: number;
  average: number;
  strong: number;
  very_strong: number;
}

export interface BlockDurationClamp {
  min_weeks: number;
  max_weeks: number;
}

export interface ArchetypeScoringWeights {
  wTimeCommitment: number;
  wWeeklyHours: number;
  wPacing: number;
  wApproach: number;
  wSpecialFocus: number;
}

export interface CurrentAffairsConfig {
  dailyCAMinutes: number;
  monthlyCATestMinutes: number;
  prelimsCAFocus: number;
  mainsCAFocus: number;
  subjectCAAllocationRatio: number;
}

export interface Config {
  daily_hour_limits: DailyHourLimits;
  task_effort_split: TaskEffortSplit;
  currentAffairsSplit: TimeSplitRatio;
  confidence_multipliers: ConfidenceMultipliers;
  block_duration_clamp: BlockDurationClamp;
  archetype_scoring_weights: ArchetypeScoringWeights;
  current_affairs_config: CurrentAffairsConfig;
}

// From helios-hs/src/Types/Config.hs

export interface ArchetypeMetadata {
  metadata_version: string;
  metadata_description: string;
  metadata_last_updated: string;
  metadata_source: string;
}

export interface ArchetypeYAML {
  yaml_name: string;
  yaml_time_commitment: TimeCommitment;
  yaml_weekly_hours_min: number;
  yaml_weekly_hours_max: number;
  yaml_description: string;
  yaml_default_pacing: StudyPacing;
  yaml_default_approach: SubjectApproach;
  yaml_special_focus?: string[];
}

export interface ArchetypeConfig {
  metadata: ArchetypeMetadata;
  archetypes: ArchetypeYAML[];
}

// From helios-hs/src/PrepModeConfig.hs

export interface PrepModeMetadata {
  metadata_version: string;
  metadata_description: string;
  metadata_last_updated: string;
  metadata_source: string;
}

export interface ExamSchedule {
  prelims_month: number;
  prelims_day: number;
  mains_month: number;
  mains_day: number;
}

export interface PrelimThresholds {
  standard_days: number;
  accelerated_days: number;
  crash_days: number;
  minimum_hours_for_crash: number;
  too_late_days: number;
}

export interface MainsThresholds {
  mains_standard_days: number;
  mains_accelerated_days: number;
  mains_crash_days: number;
}

export interface FoundationThresholds {
  longterm_days: number;
  mediumterm_days: number;
}

export interface TimeThresholds {
  prelims: PrelimThresholds;
  mains: MainsThresholds;
  foundation: FoundationThresholds;
}

export interface PrepModeDefinition {
  def_name: PrepMode;
  def_category: string;
  def_base_duration_weeks: number;
  def_intensity_adjustment: number;
  def_description: string;
}

export interface ArchetypeAdjustments {
  part_time_duration_bonus: number;
  full_time_base_daily_hours: number[];
  part_time_base_daily_hours: number[];
  generalist_accelerated_mains_intensity_override: number;
}

export interface ProgressionConditions {
  has_target_year?: boolean;
  sufficient_time?: boolean;
}

export interface ProgressionRule {
  rule_from: PrepMode;
  rule_to?: PrepMode[];
  rule_full_time_progression?: PrepMode[];
  rule_part_time_progression?: PrepMode[];
  rule_conditions?: ProgressionConditions;
}

export interface PrepModeConfigFile {
  config_metadata: PrepModeMetadata;
  exam_schedule: ExamSchedule;
  time_thresholds: TimeThresholds;
  prep_modes: PrepModeDefinition[];
  archetype_adjustments: ArchetypeAdjustments;
  progression_rules: ProgressionRule[];
}
