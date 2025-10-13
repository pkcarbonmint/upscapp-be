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

export {
  generateInitialPlan,
} from './engine/NewEngine-generate-plan';

export {
  determineCycleSchedule,
} from './engine/cycle-scheduler';



// Configuration and Types
export type { Config } from './engine/engine-types';
export type { 
  StudyPlan, 
  Block, 
  StudyCycle, 
  TimelineAnalysis, 
  MajorMilestones, 
  Archetype,
  StudentIntake 
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

// Client
export { heliosClient, api } from './services/helios';

// Import for internal use
import { loadAllSubjects, loadSubtopics } from './services/SubjectLoader';
import { generateInitialPlan } from './engine/Engine';
import type { Archetype, StudentIntake } from './types/models';

// Utility Functions
export { 
  sequenceSubjectsWithTargetYear,
  performMultiLevelSort,
  performMultiLevelSortWithTopicConfidence,
  filterBySeason
} from './engine/Sequencer';

export {
  calculateRequiredHours,
  calculateRequiredHoursWithTopicConfidence,
  getExperienceMultiplier,
  getConfidenceMultiplier,
  getCoachingMultiplier,
  getSpecializationMultiplier
} from './engine/HourCalculation';

export {
  planBlocks
} from './engine/BlockPlanner';

export {
  scheduleWeeksInAllBlocks,
  scheduleWeeksInAllCycles
} from './engine/WeeklyScheduler';

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
    test: 0.05
  }
} as const;

// Version Information
export const VERSION = '1.0.0';
export const ENGINE_NAME = 'Helios TypeScript Study Plan Engine';

/**
 * Initialize the engine with default configuration
 * This is a convenience function for quick setup
 */
export function initializeEngine() {
  console.log(`🚀 ${ENGINE_NAME} v${VERSION} initialized`);
  console.log('📚 Available subjects:', loadAllSubjects().length);
  const subjects = loadAllSubjects();
  return {
    config: DEFAULT_CONFIG,
    subjects,
    subtopics: loadSubtopics(subjects),
    version: VERSION
  };
}

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

// Export PDFService for comprehensive PDF generation (structured + visual)
export { PDFService } from './services/PDFService';

// Note: HighFidelityPDFService is NOT exported to prevent frontend bundling
// It uses Puppeteer which is Node.js only and would break browser builds

// Keep DocumentService for Word document generation
export { DocumentService } from './services/DocumentService';