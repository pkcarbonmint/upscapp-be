/**
 * Helios TypeScript Study Plan Engine
 * 
 * This is the main entry point for the Helios study plan generation engine.
 * It provides a clean API for generating, rebalancing, and reviewing study plans.
 */

// Core Engine Functions
export {
  rebalancePlan,
  rebalanceStudyPlan,
  reviewPlan,
  validatePlan
} from './engine/Engine';

export {  generatePlan, generateInitialPlan } from './engine/NewEngine-generate-plan';

export { CalendarDocxService } from './services/CalendarDocxService';
export { CalendarIcsService } from './services/CalendarIcsService';

// Configuration and Types
export type { Config } from './engine/engine-types';
export type { 
  StudyPlan, 
  Block, 
  StudyCycle, 
  TimelineAnalysis, 
  MajorMilestones, 
  Archetype,
  StudentIntake,

  StudyStrategy,
  PersonalDetails,
} from './types/models';

export { createStudentIntake } from './types/models';

export type { 
  ConfidenceLevel, 
  StudyPacing, 
  TimeCommitment, 
  SubjectApproach,
  EffectiveStudySeason,
  Logger,
  SubjectCode
} from './types/Types';

export type { 
  ExperienceProfile, 
  CoachingProfile, 
  TopicConfidenceMap 
} from './types/HourCalculationTypes';

export type { Subject, Topic } from './types/Subjects';

// API Types
export type { Status, PlanGenerationResponse, PlanReviewRequest } from './types/API';

// Model Types
export type { UIWizardData, PlanReviewResult } from './types/models';
export type { Resource, BlockResources, PlanResources, ResourceTimeline, BudgetSummary } from './types/models';

// Resource Types (for UI consumption)
export type { SubjectResourcesFile, StudyMaterial } from './resources/types';
export { default as ResourceLoader, initResourceLoader, loadSubjectResources, loadStudyMaterials } from './resources/resourceIndex';

// Telegram Types
export type { BotRequest, BotResponse } from './types/telegram';

// Services
export { SubjectLoader, loadAllSubjects } from './services/SubjectLoader';
export { makeLogger } from './services/Log';
export { transformUIToStudentIntake } from './services/DataTransform';
export { selectBestArchetype } from './services/ArchetypeSelector';
export { handleConversation } from './services/TelegramBot';
export { ResourceService } from './services/ResourceService';

// Configuration
export { getAllOptionalSubjects, getOptionalSubjectByCode } from './config';

// Client
export { heliosClient, api } from './services/helios';

// Import for internal use
import { generateInitialPlan } from './engine/Engine';
import type { Archetype, StudentIntake } from './types/models';

// Default Configuration
export const DEFAULT_CONFIG = {
  block_duration_clamp: {
    min_weeks: 2,
    max_weeks: 8
  },
  daily_hour_limits: {
    regular_day: 8,
    catch_up_day: 10,
    test_day: 6
  },
  task_effort_split: {
    study: 0.6,
    revision: 0.2,
    practice: 0.15,
    test: 0.05,
    gs_optional_ratio: 1
  }
} as const;

// Version Information
export const VERSION = '1.0.0';
export const ENGINE_NAME = 'Helios TypeScript Study Plan Engine';


/**
 * Quick start function for generating a basic study plan
 */
export async function quickStart(
  userId: string,
  archetype: Archetype,
  intake: StudentIntake,
  config = DEFAULT_CONFIG
) {
  console.log(`🎯 Generating study plan for user: ${userId}`);
  const result = await generateInitialPlan(userId, config, archetype, intake);
  console.log(`✅ Study plan generated with ${result.plan.cycles?.length || 0} cycles`);
  return result;
}

// Export DocumentService for Word document generation
export { DocumentService } from './services/DocumentService';

// Note: PDFService and HighFidelityPDFService are NOT exported to prevent frontend bundling
// They use Node.js-only dependencies (Puppeteer, fs, etc.) that would break browser builds