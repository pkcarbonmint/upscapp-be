/**
 * Functional Study Plan Engine
 * 
 * This is a simplified, functional replacement for the complex Engine.ts
 * that removes archetype, prepmode, and seasonal concepts while ensuring
 * continuous time coverage and clear subject handling.
 */

import dayjs from 'dayjs';
import { StudentIntake, StudyPlan, StudyCycle } from '../types/models';
import { CycleType, Logger } from '../types/Types';
import { Subject } from '../types/Subjects';
import { Config } from './engine-types';
import { getSimpleCycleConfig, selectOptimalCycles, calculateCycleDuration } from './functional-cycle-config';
import { SubjectLoader } from '../services/SubjectLoader';
import { makeLogger } from '../services/Log';

// ============================================================================
// Main Engine Function
// ============================================================================

export async function generateFunctionalPlan(
  userId: string,
  config: Config,
  intake: StudentIntake,
  logger?: Logger
): Promise<{ success: boolean; plan: StudyPlan; message: string }> {
  
  const log = logger || makeLogger('FunctionalEngine', 'info');
  
  try {
    log.logInfo('FunctionalEngine', `Generating functional plan for user ${userId}`);
    
    // 1. Load subjects and create confidence map
    const { subjects, confidenceMap } = await loadSubjectsAndConfidence(intake, log);
    
    // 2. Determine study period and cycles
    const { startDate, targetYear, selectedCycles } = determineStudyPeriod(intake, log);
    
    // 3. Generate cycles with continuous blocks
    const cycles = await generateCycles(
      selectedCycles,
      subjects,
      confidenceMap,
      startDate,
      targetYear,
      intake,
      config,
      log
    );
    
    // 4. Create final study plan
    const studyPlan = createStudyPlan(userId, cycles, intake, startDate, targetYear);
    
    log.logInfo('FunctionalEngine', `Successfully generated plan with ${cycles.length} cycles`);
    
    return {
      success: true,
      plan: studyPlan,
      message: `Generated functional study plan with ${cycles.length} cycles covering ${subjects.length} subjects`
    };
    
  } catch (error) {
    log.logWarn('FunctionalEngine', `Error generating plan: ${error}`);
    return {
      success: false,
      plan: createEmptyPlan(userId),
      message: `Failed to generate plan: ${error}`
    };
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

async function loadSubjectsAndConfidence(
  intake: StudentIntake,
  logger: Logger
): Promise<{ subjects: Subject[]; confidenceMap: Map<string, number> }> {
  
  const subjects = SubjectLoader.loadAllSubjects();
  
  // Create confidence map from intake
  const confidenceMap = new Map<string, number>();
  
  // Add subject confidence levels
  if (intake.subject_confidence) {
    for (const [subjectCode, confidenceLevel] of Object.entries(intake.subject_confidence)) {
      const numericConfidence = mapConfidenceToNumeric(confidenceLevel);
      confidenceMap.set(subjectCode, numericConfidence);
    }
  }
  
  // Set default confidence for subjects not specified
  for (const subject of subjects) {
    if (!confidenceMap.has(subject.subjectCode)) {
      confidenceMap.set(subject.subjectCode, 0.5); // Default moderate confidence
    }
  }
  
  logger.logDebug('FunctionalEngine', `Loaded ${subjects.length} subjects with confidence mapping`);
  
  return { subjects, confidenceMap };
}

function mapConfidenceToNumeric(confidenceLevel: string): number {
  switch (confidenceLevel.toLowerCase()) {
    case 'weak':
    case 'low':
      return 0.2;
    case 'moderate':
    case 'medium':
      return 0.5;
    case 'strong':
    case 'high':
      return 0.8;
    default:
      return 0.5;
  }
}

function determineStudyPeriod(
  intake: StudentIntake,
  logger: Logger
): { startDate: dayjs.Dayjs; targetYear: number; selectedCycles: CycleType[] } {
  
  const startDate = dayjs(); // Start from today
  const targetYear = intake.getTargetYear();
  
  // Select optimal cycles based on available time
  const selectedCycles = selectOptimalCycles(startDate, targetYear, intake);
  
  logger.logDebug('FunctionalEngine', 
    `Study period: ${startDate.format('YYYY-MM-DD')} to target year ${targetYear}, selected cycles: ${selectedCycles.join(', ')}`
  );
  
  return { startDate, targetYear, selectedCycles };
}

async function generateCycles(
  selectedCycles: CycleType[],
  subjects: Subject[],
  confidenceMap: Map<string, number>,
  startDate: dayjs.Dayjs,
  targetYear: number,
  intake: StudentIntake,
  config: Config,
  logger: Logger
): Promise<StudyCycle[]> {
  
  const cycles: StudyCycle[] = [];
  let currentDate = startDate;
  
  // Calculate total available time until target year
  const targetEndDate = dayjs(`${targetYear}-12-31`);
  const totalWeeks = targetEndDate.diff(startDate, 'week');
  
  for (let i = 0; i < selectedCycles.length; i++) {
    const cycleType = selectedCycles[i];
    const cycleConfig = getSimpleCycleConfig(cycleType);
    
    // Calculate this cycle's duration
    const cycleDuration = calculateCycleDuration(cycleType, totalWeeks, selectedCycles);
    const cycleEndDate = currentDate.add(cycleDuration, 'week');
    
    logger.logDebug('FunctionalEngine', 
      `Generating cycle ${cycleType}: ${currentDate.format('YYYY-MM-DD')} to ${cycleEndDate.format('YYYY-MM-DD')} (${cycleDuration} weeks)`
    );
    
    // Filter subjects for this cycle
    const cycleSubjects = cycleConfig.subjectFilter(subjects);
    
    if (cycleSubjects.length === 0) {
      logger.logWarning('FunctionalEngine', `No subjects found for cycle ${cycleType}, skipping`);
      continue;
    }
    
    // Generate blocks for this cycle
    const blocks = await cycleConfig.blockCreator(
      intake,
      cycleSubjects,
      currentDate,
      cycleEndDate,
      confidenceMap,
      cycleConfig,
      config,
      logger
    );
    
    // Create cycle object
    const cycle: StudyCycle = {
      cycleId: `${cycleType}_${targetYear}`,
      cycleName: cycleConfig.cycleName,
      cycleDescription: cycleConfig.cycleDescription,
      cycleType: cycleType,
      cycleOrder: cycleConfig.cycleOrder,
      cycleStartDate: currentDate.format('YYYY-MM-DD'),
      cycleEndDate: cycleEndDate.format('YYYY-MM-DD'),
      cycleDurationWeeks: cycleDuration,
      cycleIntensity: cycleConfig.cycleIntensity,
      cycleBlocks: blocks,
      cycleSubjects: cycleSubjects.map(s => s.subjectCode)
    };
    
    cycles.push(cycle);
    currentDate = cycleEndDate.add(1, 'day');
    
    logger.logDebug('FunctionalEngine', 
      `Generated cycle ${cycleType} with ${blocks.length} blocks covering ${cycleSubjects.length} subjects`
    );
  }
  
  return cycles;
}

function createStudyPlan(
  userId: string,
  cycles: StudyCycle[],
  intake: StudentIntake,
  startDate: dayjs.Dayjs,
  targetYear: number
): StudyPlan {
  
  const totalBlocks = cycles.reduce((sum, cycle) => sum + cycle.cycleBlocks.length, 0);
  const totalWeeks = cycles.reduce((sum, cycle) => sum + cycle.cycleDurationWeeks, 0);
  
  return {
    planId: `functional_plan_${userId}_${Date.now()}`,
    planName: `Functional Study Plan for ${targetYear}`,
    planDescription: `Comprehensive study plan generated using functional block planning approach`,
    planStartDate: startDate.format('YYYY-MM-DD'),
    planEndDate: cycles.length > 0 ? cycles[cycles.length - 1].cycleEndDate : startDate.format('YYYY-MM-DD'),
    planDurationWeeks: totalWeeks,
    planTargetYear: targetYear.toString(),
    cycles: cycles,
    effective_season_context: 'ComprehensiveStudy', // Simplified - no complex seasonal logic
    planSummary: {
      totalCycles: cycles.length,
      totalBlocks: totalBlocks,
      totalWeeks: totalWeeks,
      subjectsCount: new Set(cycles.flatMap(c => c.cycleSubjects)).size,
      approachType: intake.subject_approach || 'DualSubject'
    }
  };
}

function createEmptyPlan(userId: string): StudyPlan {
  return {
    planId: `empty_plan_${userId}`,
    planName: 'Empty Plan',
    planDescription: 'Plan generation failed',
    planStartDate: dayjs().format('YYYY-MM-DD'),
    planEndDate: dayjs().format('YYYY-MM-DD'),
    planDurationWeeks: 0,
    planTargetYear: '2026',
    cycles: [],
    effective_season_context: 'ComprehensiveStudy',
    planSummary: {
      totalCycles: 0,
      totalBlocks: 0,
      totalWeeks: 0,
      subjectsCount: 0,
      approachType: 'DualSubject'
    }
  };
}

// ============================================================================
// Rebalancing Function (Simplified)
// ============================================================================

export async function rebalanceFunctionalPlan(
  originalPlan: StudyPlan,
  feedback: any,
  topicConfidenceMap: Map<string, number>,
  config: Config,
  intake: StudentIntake,
  logger?: Logger
): Promise<{ success: boolean; plan: StudyPlan; message: string }> {
  
  const log = logger || makeLogger('FunctionalEngine', 'info');
  
  try {
    log.logInfo('FunctionalEngine', 'Rebalancing functional plan based on feedback');
    
    // For now, regenerate the entire plan with updated confidence
    // In a more sophisticated version, we could update only affected cycles
    const result = await generateFunctionalPlan(
      originalPlan.planId.split('_')[2] || 'unknown', // Extract user ID
      config,
      intake,
      log
    );
    
    if (result.success) {
      result.plan.planId = `rebalanced_${result.plan.planId}`;
      result.plan.planName = `Rebalanced ${result.plan.planName}`;
      result.message = `Successfully rebalanced plan: ${result.message}`;
    }
    
    return result;
    
  } catch (error) {
    log.logError('FunctionalEngine', `Error rebalancing plan: ${error}`);
    return {
      success: false,
      plan: originalPlan,
      message: `Failed to rebalance plan: ${error}`
    };
  }
}

// ============================================================================
// Validation Functions
// ============================================================================

export function validateFunctionalPlan(plan: StudyPlan): { isValid: boolean; issues: string[] } {
  const issues: string[] = [];
  
  // Check for continuous coverage
  for (const cycle of plan.cycles) {
    const blocks = cycle.cycleBlocks;
    if (blocks.length === 0) {
      issues.push(`Cycle ${cycle.cycleName} has no blocks`);
      continue;
    }
    
    // Check for gaps between blocks within cycle
    const sortedBlocks = [...blocks].sort((a, b) => 
      dayjs(a.blockStartDate).diff(dayjs(b.blockStartDate))
    );
    
    for (let i = 0; i < sortedBlocks.length - 1; i++) {
      const currentEnd = dayjs(sortedBlocks[i].blockEndDate);
      const nextStart = dayjs(sortedBlocks[i + 1].blockStartDate);
      
      if (nextStart.diff(currentEnd, 'day') > 1) {
        issues.push(`Gap found between blocks in cycle ${cycle.cycleName}`);
      }
    }
  }
  
  // Check for gaps between cycles
  const sortedCycles = [...plan.cycles].sort((a, b) => 
    dayjs(a.cycleStartDate).diff(dayjs(b.cycleStartDate))
  );
  
  for (let i = 0; i < sortedCycles.length - 1; i++) {
    const currentEnd = dayjs(sortedCycles[i].cycleEndDate);
    const nextStart = dayjs(sortedCycles[i + 1].cycleStartDate);
    
    if (nextStart.diff(currentEnd, 'day') > 1) {
      issues.push(`Gap found between cycles ${sortedCycles[i].cycleName} and ${sortedCycles[i + 1].cycleName}`);
    }
  }
  
  return {
    isValid: issues.length === 0,
    issues
  };
}