
import { StudyPlan, StudentIntake, PlanReviewResult, UIWizardData, LogEntry } from './models';
import { BotRequest, BotResponse } from './telegram';

// Data type for POST body
export interface Echo {
  content: string;
}

// Data type for GET response
export interface Status {
  message: string;
}

// Data type for plan review request
export interface PlanReviewRequest {
  plan: StudyPlan;
  student_intake: StudentIntake;
}

// Data type for plan generation response with logs
export interface PlanGenerationResponse {
  generatedPlan: StudyPlan;
  executionLogs: LogEntry[];
}

export interface AppAPI {
  getRoot(): Promise<string>;
  getStatus(): Promise<Status>;
  getHealth(): Promise<Status>;
  generatePlan(data: UIWizardData): Promise<PlanGenerationResponse>;
  reviewPlan(data: PlanReviewRequest): Promise<PlanReviewResult>;
  conversation(data: BotRequest): Promise<BotResponse>;
}
