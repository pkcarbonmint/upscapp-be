
// Core domain types and enumerations used throughout the application.
// These are the fundamental building blocks that don't depend on other domain concepts.

export type Multiplier = number;
export type SubjectCode = string;

export type RebalancingNeed =
  | { type: "NoRebalancingNeeded" }
  | { type: "MinorAdjustmentNeeded"; details: string }
  | { type: "MajorRebalancingNeeded"; details: string }
  | { type: "EmergencyReschedule"; details: string };

// Describes the time commitment of a student.
export type TimeCommitment = "FullTime" | "PartTime";

// Describes the student's preferred pacing for tackling subjects.
export type StudyPacing = "WeakFirst" | "StrongFirst" | "Balanced";

// Describes how many subjects a student wants to focus on at once.
export type SubjectApproach = "SingleSubject" | "DualSubject" | "TripleSubject";

// Describes the specific subject combination strategy a student prefers.
export type SubjectCombo =
  | "OneGS"
  | "OneGSPlusOptional"
  | "GSPlusOptionalPlusCSAT"
  | "DefaultCombo";

// Confidence level for a subject.
export type ConfidenceLevel =
  | "NotStarted"
  | "VeryWeak"
  | "Weak"
  | "Moderate"
  | "Strong"
  | "VeryStrong";

// A map from subject codes (string) to the student's confidence level.
export type SubjectConfidenceMap = Record<SubjectCode, ConfidenceLevel>;

// Difficulty level of resources
export type DifficultyLevel = "Beginner" | "Intermediate" | "Advanced";

// Budget preference for resource selection
export type BudgetPreference = "BudgetFree" | "BudgetLow" | "BudgetMedium" | "BudgetHigh";

// Learning style preference
export type LearningStyle =
  | "Visual"
  | "Auditory"
  | "ReadingWriting"
  | "Kinesthetic"
  | "Mixed";

// Current Affairs task types
export type CurrentAffairsTaskType =
  | { type: "CAReading" }
  | { type: "CAQuiz" }
  | { type: "CACompilation" }
  | { type: "CARevision" }
  | { type: "CASubjectSpecific"; subject: string }
  | { type: "CAWeeklyTest" }
  | { type: "CAMonthlyReview" }
  | { type: "CAAnalysis" }
  | { type: "CAEssayPractice" };

// Study season for exam-specific preparation
export type StudySeason = "PrelimsPrep" | "MainsPrep" | "YearRound";

// Effective study season considering target year context
export type EffectiveStudySeason =
  | "ExclusivePrelims"
  | "ExclusiveMains"
  | "ComprehensiveStudy";

// Study season context with target year awareness
export interface StudySeasonContext {
  baseSeason: StudySeason;
  isTargetYear: boolean;
  targetYear?: number;
  currentYear: number;
}

export type CycleType =
  | "C1" // NCERT Foundation Cycle
  | "C2" // Comprehensive Foundation Cycle
  | "C3" // Mains Revision Pre-Prelims Cycle
  | "C4" // Prelims Revision Cycle
  | "C5" // Prelims Rapid Revision Cycle
  | "C6" // Mains Revision Cycle
  | "C7" // Mains Rapid Revision Cycle
  | "C8" // Mains Foundation Cycle
  ;
// Preparation mode that combines time pressure with exam focus
export type PrepMode =
  // Prelims Preparation Modes
  | "StandardPrelims" // 4+ months: comprehensive coverage, complete syllabus + practice
  | "AcceleratedPrelims" // 1.5-3 months: high-yield topics, crash course, skip low-priority
  | "CrashPrelims" // 1-1.5 months: revision only, mock tests, no new learning
  // Mains Preparation Modes
  | "StandardMains" // 3+ months: full answer writing, essay practice, comprehensive topics
  | "AcceleratedMains" // 2-3 months: focused topics, concentrated answer writing
  | "CrashMains" // 1-2 months: writing practice only, pure answer writing skills
  // Foundation Building Modes
  | "LongtermFoundation" // 2+ years: deep conceptual learning, strong base, multiple revisions
  | "MediumtermFoundation" // 9-18 months: compressed coverage, strategic topic selection
  // Special Modes
  | "InterviewPrep" // Post-Mains interview preparation
  | "TransitionMode" // Block spans exam boundaries (rare edge case)
  | "TooLateMode"; // Below minimum viable preparation threshold (should trigger rejection)

// New interfaces for cycle scheduling
export interface CycleSchedule {
  cycleType: CycleType;
  startDate: string;
  endDate: string;
  durationMonths: number;
  priority: 'mandatory' | 'conditional';
}

export interface ScenarioResult {
  scenario: 'S1' | 'S2' | 'S3' | 'S4' | 'S4A' | 'S5' | 'S6' | 'S7' | 'S8'; // Updated to include S4A
  totalTimeAvailable: number;
  schedules: CycleSchedule[];
}

// Log entry interface
export type LogEntry = {
  logLevel: 'Debug' | 'Info' | 'Warn' | 'Error';
  logSource: string;
  logMessage: string;
}

export type Logger = {
  logInfo: (source: string, message: string) => void;
  logWarn: (source: string, message: string) => void;
  logDebug: (source: string, message: string) => void;
  getLogs: () => LogEntry[];
  clear: () => void;
}
