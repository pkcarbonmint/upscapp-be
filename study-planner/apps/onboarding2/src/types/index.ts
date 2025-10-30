// Form Data Types based on existing onboarding app
export interface PersonalInfo {
  fullName: string;
  email: string;
  phoneNumber: string;
  presentLocation: string;
  graduationStream: string;
  collegeUniversity: string;
  yearOfPassing: number;
  about?: string;
}

export interface TargetYear {
  targetYear: string;
  startDate?: Date;
}

export interface Performance {
  history: string;
  polity: string;
  economy: string;
  geography: string;
  environment: string;
  scienceTech: string;
}

export interface Commitment {
  timeCommitment: number;
  performance: Performance;
  studyPreference: string;
  subjectApproach: string;
  upscOptionalSubject: string;
  optionalFirst: boolean;
  subjectOrderingPreference: 'weakest-first' | 'strongest-first' | 'balanced';
  weeklyTestDayPreference: string;
  catchupDayPreference: string;
  testMinutes: number;
}

export interface ConfidenceLevel {
  [key: string]: number;
}

export interface StudyPlanPreview {
  raw_helios_data: any;
  milestones: {
    foundationToPrelimsDate: Date | null;
    prelimsToMainsDate: Date | null;
  };
  studyPlanId: string | null;
}

export interface Payment {
  paymentLink: string | null;
  paymentStatus: 'pending' | 'processing' | 'completed' | 'failed';
  selectedPlan: string;
  amount: number;
}

export interface OnboardingFormData {
  personalInfo: PersonalInfo;
  targetYear: TargetYear;
  commitment: Commitment;
  confidenceLevel: ConfidenceLevel;
  preview: StudyPlanPreview;
  payment: Payment;
}

export type OnboardingStep = 
  | 'personal-info'
  | 'target-year'
  | 'commitment'
  | 'confidence'
  | 'preview'
  | 'payment'
  | 'complete'
  | 'dashboard';

export interface StepProps {
  formData: OnboardingFormData;
  updateFormData: (updates: Partial<OnboardingFormData>) => void;
  onNext: () => void;
  onPrevious: () => void;
  isValid: boolean;
}

// Subject categories for confidence assessment
export interface SubjectCategory {
  name: string;
  subjects: Array<{
    key: string;
    name: string;
  }>;
}

// Time commitment options
export interface TimeCommitmentOption {
  value: number;
  label: string;
  description: string;
}

// Study approach options
export interface StudyApproachOption {
  value: string;
  title: string;
  description: string;
}

// Focus combo options
export interface FocusComboOption {
  value: string;
  label: string;
}