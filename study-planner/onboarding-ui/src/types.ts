// TypeScript interfaces matching the Elm models

export interface IWFBackground {
  fullName: string;
  email: string;
  phoneNumber: string;
  phoneVerified?: boolean;
  presentLocation: string;
  graduationStream: string;
  collegeUniversity: string;
  yearOfPassing: number;
  about: string;
}

export interface IWFTargetYear {
  targetYear: string;
  startDate?: string;
}

export interface Performance {
  history: string;
  polity: string;
  economy: string;
  geography: string;
  environment: string;
  scienceTech: string;
}

export type StudyPreference = 'WeakSubjectsFirst' | 'StrongSubjectsFirst' | 'Balanced';
export type SubjectApproach = 'SingleSubject' | 'DualSubject' | 'TripleSubject';

export interface IWFStudyCommitment {
  timeCommitment: number | null;
  performance: Performance;
  studyPreference: StudyPreference;
  subjectApproach: SubjectApproach;
  // New UPSC fields
  upscOptionalSubject?: string;
  optionalFirst?: boolean;
  weeklyTestDayPreference?: string;
}

// Import helios-ts types for confidence assessment
import type { ConfidenceLevel, SubjectCode } from 'helios-ts';

// Use helios-ts confidence level mapping for confidence assessment
export type IWFConfidenceLevelAssessment = Record<SubjectCode, ConfidenceLevel>;

export interface BlockHours {
  studyHours: number;
  revisionHours: number;
  practiceHours: number;
  testHours: number;
}

export interface BlockResourceSummary {
  oneLine: string;
  extraLine: string | null;
}

export interface Block {
  block_id: string;
  block_title: string;
  cycle_id?: string;
  cycle_type?: string;
  cycle_order?: number;
  cycle_name?: string;
  subjects: string[];
  duration_weeks: number;
  weekly_plan: WeeklyPlan[];
  block_resources: BlockResources;
  block_start_date?: string;  // ISO 8601 date string
  block_end_date?: string;    // ISO 8601 date string
}

export interface StudyCycle {
  cycleId: string;
  cycleType: string;
  cycleIntensity: string;
  cycleDuration: number;
  cycleStartWeek: number;
  cycleOrder: number;
  cycleName: string;
  cycleBlocks: Block[];
  cycleDescription: string;
  cycleStartDate?: string;    // ISO 8601 date string
  cycleEndDate?: string;      // ISO 8601 date string
}

export interface WeeklyPlan {
  week: number;
  daily_plans: DailyPlan[];
}

export interface DailyPlan {
  day: number;
  tasks: Task[];
}

export interface Task {
  task_id: string;
  humanReadableId: string;
  title2: string;
  duration_minutes: number;
  details_link?: string;
  currentAffairsType?: string;
  task_resources?: Resource[];
}

export interface Resource {
  resource_id: string;
  title: string;
  type: string;
  url?: string;
}

export interface BlockResources {
  primary_books: Resource[];
  supplementary_materials: Resource[];
  practice_resources: Resource[];
  video_content: Resource[];
  current_affairs_sources: Resource[];
  revision_materials: Resource[];
  expert_recommendations: Resource[];
}

export interface BlockPreview {
  blockId: string;
  title: string;
  subjects: string[];
  durationWeeks: number;
  dateRange: string;
  hours: BlockHours;
  resources: BlockResourceSummary;
  cycleId: string | null;
  cycleType: string | null;
  cycleOrder: number | null;
  cycleName: string | null;
  blockStartDate?: string;    // NEW: ISO 8601 date string
  blockEndDate?: string;      // NEW: ISO 8601 date string
}

export interface MajorMilestones {
  foundationToPrelimsDate: string | null;
  prelimsToMainsDate: string | null;
}

export interface IWFPreview {
  raw_helios_data: any;
  milestones: MajorMilestones;
  studyPlanId: string | null;
}

// OTP Verification interface
export interface IWFOTPVerification {
  phoneNumber: string;
  otpCode: string;
  verificationId?: string; // Firebase verification ID
  isVerified: boolean;
  attempts: number;
  lastSentAt?: string; // ISO timestamp
}

export interface IWFPayment {}

export interface IWFFinal {
  submitted: boolean;
  message: string | null;
  studentId: string | null;
}

export interface IntakeWizardFormData {
  background: IWFBackground;
  otpVerification?: IWFOTPVerification;
  targetYear: IWFTargetYear;
  commitment: IWFStudyCommitment;
  confidenceLevel: IWFConfidenceLevelAssessment;
  preview: IWFPreview;
  payment: IWFPayment;
  final: IWFFinal;
}

// Alias for compatibility
export type FormData = IntakeWizardFormData;

export type Step = 'Background' | 'OTPVerification' | 'TargetYear' | 'Commitment' | 'ConfidenceLevel' | 'Preview' | 'Payment' | 'Final';

// Base step sequence without OTP
const baseStepSequence: Step[] = [
  'Background',
  'Commitment', 
  'ConfidenceLevel',
  'TargetYear',
  'Preview',
  'Payment',
  'Final'
];

// Step sequence with OTP
const stepSequenceWithOTP: Step[] = [
  'Background',
  'OTPVerification',
  'Commitment', 
  'ConfidenceLevel',
  'TargetYear',
  'Preview',
  'Payment',
  'Final'
];

// Function to get step sequence based on feature flags
export const getStepSequence = (enableOTP: boolean = false): Step[] => {
  return enableOTP ? stepSequenceWithOTP : baseStepSequence;
};

// Default export for backward compatibility
export const stepSequence: Step[] = baseStepSequence;
