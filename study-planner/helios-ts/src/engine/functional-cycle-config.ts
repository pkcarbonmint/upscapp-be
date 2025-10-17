/**
 * Simplified Cycle Configuration using Functional Block Planning
 * 
 * This replaces the complex cycle-config.ts with a cleaner, functional approach
 * that removes archetype, prepmode, and seasonal concepts.
 */

import { CycleIntensity, StudentIntake } from '../types/models';
import { CycleType, Logger } from '../types/Types';
import { Subject } from '../types/Subjects';
import { Block } from '../types/models';
import dayjs from 'dayjs';
import { createFunctionalBlocks } from './functional-block-planner';
import { Config } from './engine-types';

export interface SimpleCycleConfig {
  cycleType: CycleType;
  cycleOrder: number;
  cycleName: string;
  cycleDescription: string;
  cycleIntensity: CycleIntensity;
  subjectFilter: (subjects: Subject[]) => Subject[];
  blockCreator: (
    intake: StudentIntake,
    filteredSubjects: Subject[],
    startDate: dayjs.Dayjs,
    endDate: dayjs.Dayjs,
    confidenceMap: Map<string, number>,
    config: SimpleCycleConfig,
    engineConfig: Config,
    logger: Logger
  ) => Promise<Block[]>;
}

// ============================================================================
// Block Creator Functions
// ============================================================================

async function createFunctionalBlocksWrapper(
  intake: StudentIntake,
  filteredSubjects: Subject[],
  startDate: dayjs.Dayjs,
  endDate: dayjs.Dayjs,
  confidenceMap: Map<string, number>,
  config: SimpleCycleConfig,
  engineConfig: Config,
  logger: Logger
): Promise<Block[]> {
  const dailyHours = intake.getDailyStudyHours();
  
  return await createFunctionalBlocks(
    filteredSubjects,
    startDate,
    endDate,
    dailyHours,
    confidenceMap,
    config.cycleName,
    intake,
    engineConfig,
    logger
  );
}

// ============================================================================
// Cycle Configuration Constants
// ============================================================================

const C1_CONFIG: SimpleCycleConfig = {
  cycleType: CycleType.C1,
  cycleOrder: 1,
  cycleName: 'NCERT Foundation Cycle',
  cycleDescription: 'NCERT-based foundation building phase focusing on basic concepts',
  cycleIntensity: CycleIntensity.Foundation,
  subjectFilter: (subjects) => subjects.filter(s => 
    s.examFocus === 'BothExams' // NCERT foundation subjects are relevant for both exams
  ),
  blockCreator: createFunctionalBlocksWrapper
};

const C2_CONFIG: SimpleCycleConfig = {
  cycleType: CycleType.C2,
  cycleOrder: 2,
  cycleName: 'UPSC Foundation Cycle',
  cycleDescription: 'Foundation building phase with comprehensive subject coverage',
  cycleIntensity: CycleIntensity.Foundation,
  subjectFilter: (subjects) => subjects, // Include all subjects
  blockCreator: createFunctionalBlocksWrapper
};

const C3_CONFIG: SimpleCycleConfig = {
  cycleType: CycleType.C3,
  cycleOrder: 3,
  cycleName: 'Mains Foundation Cycle',
  cycleDescription: 'Mains-specific foundation building phase preparing for answer writing',
  cycleIntensity: CycleIntensity.Foundation,
  subjectFilter: (subjects) => subjects.filter(s =>
    s.examFocus === 'MainsOnly' || s.examFocus === 'BothExams'
  ),
  blockCreator: createFunctionalBlocksWrapper
};

const C4_CONFIG: SimpleCycleConfig = {
  cycleType: CycleType.C4,
  cycleOrder: 4,
  cycleName: 'Prelims Reading Cycle',
  cycleDescription: 'Intensive reading phase for prelims preparation',
  cycleIntensity: CycleIntensity.Foundation,
  subjectFilter: (subjects) => subjects.filter(s => 
    s.examFocus === 'PrelimsOnly' || s.examFocus === 'BothExams'
  ),
  blockCreator: createFunctionalBlocksWrapper
};

const C5_CONFIG: SimpleCycleConfig = {
  cycleType: CycleType.C5,
  cycleOrder: 5,
  cycleName: 'Prelims Revision Cycle',
  cycleDescription: 'Intensive revision phase for prelims preparation',
  cycleIntensity: CycleIntensity.Revision,
  subjectFilter: (subjects) => subjects.filter(s =>
    s.examFocus === 'PrelimsOnly' || s.examFocus === 'BothExams'
  ),
  blockCreator: createFunctionalBlocksWrapper
};

const C5B_CONFIG: SimpleCycleConfig = {
  cycleType: CycleType.C5B,
  cycleOrder: 6,
  cycleName: 'Prelims Rapid Revision Cycle',
  cycleDescription: 'Intensive rapid revision phase for prelims preparation',
  cycleIntensity: CycleIntensity.PreExam,
  subjectFilter: (subjects) => subjects.filter(s =>
    s.examFocus === 'PrelimsOnly' || s.examFocus === 'BothExams'
  ),
  blockCreator: createFunctionalBlocksWrapper
};

const C6_CONFIG: SimpleCycleConfig = {
  cycleType: CycleType.C6,
  cycleOrder: 7,
  cycleName: 'Mains Revision Cycle',
  cycleDescription: 'Intensive revision phase for mains preparation',
  cycleIntensity: CycleIntensity.Revision,
  subjectFilter: (subjects) => subjects.filter(s =>
    s.examFocus === 'MainsOnly' || s.examFocus === 'BothExams'
  ),
  blockCreator: createFunctionalBlocksWrapper
};

const C7_CONFIG: SimpleCycleConfig = {
  cycleType: CycleType.C7,
  cycleOrder: 8,
  cycleName: 'Mains Rapid Revision Cycle',
  cycleDescription: 'Intensive rapid revision phase for mains preparation',
  cycleIntensity: CycleIntensity.PreExam,
  subjectFilter: (subjects) => subjects.filter(s =>
    s.examFocus === 'MainsOnly' || s.examFocus === 'BothExams'
  ),
  blockCreator: createFunctionalBlocksWrapper
};

const C8_CONFIG: SimpleCycleConfig = {
  cycleType: CycleType.C8,
  cycleOrder: 9,
  cycleName: 'Mains Foundation (Late Start) Cycle',
  cycleDescription: 'Mains-focused foundation work for very late starts, bridge to prelims preparation',
  cycleIntensity: CycleIntensity.Foundation,
  subjectFilter: (subjects) => subjects.filter(s =>
    s.examFocus === 'MainsOnly' || s.examFocus === 'BothExams'
  ),
  blockCreator: createFunctionalBlocksWrapper
};

// ============================================================================
// Configuration Getter
// ============================================================================

export function getSimpleCycleConfig(cycleType: CycleType): SimpleCycleConfig {
  switch (cycleType) {
    case CycleType.C1:
      return C1_CONFIG;
    case CycleType.C2:
      return C2_CONFIG;
    case CycleType.C3:
      return C3_CONFIG;
    case CycleType.C4:
      return C4_CONFIG;
    case CycleType.C5:
      return C5_CONFIG;
    case CycleType.C5B:
      return C5B_CONFIG;
    case CycleType.C6:
      return C6_CONFIG;
    case CycleType.C7:
      return C7_CONFIG;
    case CycleType.C8:
      return C8_CONFIG;
    default:
      throw new Error(`Unknown cycle type: ${cycleType}`);
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get all available cycle types in order
 */
export function getAllCycleTypes(): CycleType[] {
  return [
    CycleType.C1,
    CycleType.C2,
    CycleType.C3,
    CycleType.C4,
    CycleType.C5,
    CycleType.C5B,
    CycleType.C6,
    CycleType.C7,
    CycleType.C8
  ];
}

/**
 * Determine appropriate cycles based on time available and target year
 */
export function selectOptimalCycles(
  startDate: dayjs.Dayjs,
  intake: StudentIntake
): CycleType[] {
  const prelimsDate = dayjs(intake.getPrelimsExamDate());
  
  const monthsToPrelimsFromStart = prelimsDate.diff(startDate, 'month');
  
  // Simple heuristic for cycle selection based on available time
  if (monthsToPrelimsFromStart >= 18) {
    // Plenty of time - full cycle progression
    return [CycleType.C1, CycleType.C2, CycleType.C3, CycleType.C4, CycleType.C5, CycleType.C6, CycleType.C7];
  } else if (monthsToPrelimsFromStart >= 12) {
    // Moderate time - skip NCERT foundation
    return [CycleType.C2, CycleType.C3, CycleType.C4, CycleType.C5, CycleType.C6, CycleType.C7];
  } else if (monthsToPrelimsFromStart >= 8) {
    // Limited time - focus on essentials
    return [CycleType.C2, CycleType.C4, CycleType.C5, CycleType.C6];
  } else if (monthsToPrelimsFromStart >= 4) {
    // Very limited time - intensive preparation
    return [CycleType.C4, CycleType.C5B, CycleType.C6];
  } else {
    // Emergency preparation - mains focus only
    return [CycleType.C8, CycleType.C6, CycleType.C7];
  }
}

/**
 * Calculate cycle duration based on available time and cycle importance
 */
export function calculateCycleDuration(
  cycleType: CycleType,
  totalAvailableWeeks: number,
  selectedCycles: CycleType[]
): number {
  // Base duration weights for each cycle type
  const cycleWeights = {
    [CycleType.C1]: 3, // NCERT foundation
    [CycleType.C2]: 4, // UPSC foundation  
    [CycleType.C3]: 3, // Mains foundation
    [CycleType.C4]: 3, // Prelims reading
    [CycleType.C5]: 2, // Prelims revision
    [CycleType.C5B]: 1, // Prelims rapid revision
    [CycleType.C6]: 2, // Mains revision
    [CycleType.C7]: 1, // Mains rapid revision
    [CycleType.C8]: 2  // Late start mains foundation
  };
  
  const totalWeight = selectedCycles.reduce((sum, cycle) => sum + cycleWeights[cycle], 0);
  const cycleWeight = cycleWeights[cycleType];
  
  const proportionalWeeks = Math.floor((totalAvailableWeeks * cycleWeight) / totalWeight);
  
  // Ensure minimum and maximum durations
  return Math.max(2, Math.min(20, proportionalWeeks));
}