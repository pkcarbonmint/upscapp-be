/**
 * Functional Block Planning Logic for Helios-ts
 * 
 * This module implements a clean, functional approach to block planning that:
 * - Ensures continuous time coverage (no calendar holes)
 * - Handles all subjects uniformly (no special optional/GS logic)
 * - Uses composable pure functions
 * - Dynamically allocates time based on availability
 */

import dayjs from 'dayjs';
import { Subject } from '../types/Subjects';
import { StudentIntake, Block, WeeklyPlan } from '../types/models';
import { Logger } from '../types/Types';
import { createPlanForOneWeek } from './OneWeekPlan';
import { Config } from './engine-types';

// ============================================================================
// Core Types
// ============================================================================

export interface TimeCalculation {
  totalDays: number;
  dailyHours: number;
  totalHours: number;
  weeklyHours: number;
}

export interface SubjectPriority {
  subjectCode: string;
  subjectName: string;
  baselineHours: number;
  confidenceMultiplier: number; // 0.5-2.0 based on weak/strong
  priorityWeight: number; // calculated weight
}

export interface TimeAllocation {
  subjectCode: string;
  subjectName: string;
  allocatedHours: number;
  allocatedDays: number;
}

export interface ContinuousBlock {
  subjectCode: string;
  subjectName: string;
  startDate: dayjs.Dayjs;
  endDate: dayjs.Dayjs;
  dailyHours: number;
  totalHours: number;
  subjects: Subject[]; // All subjects in this block
}

export interface TaskRatios {
  study: number;      // 0.0 - 1.0
  practice: number;   // 0.0 - 1.0  
  revision: number;   // 0.0 - 1.0
  test: number;       // 0.0 - 1.0
}

// ============================================================================
// Configuration Constants
// ============================================================================

// Task ratios moved to intake.getTaskTypeRatios() method

const CONFIDENCE_MULTIPLIERS = {
  'Weak': 1.5,      // Need more time for weak subjects
  'Moderate': 1.0,  // Standard time
  'Strong': 0.7     // Less time needed for strong subjects
};

const MIN_SUBJECT_HOURS = 4; // Minimum hours per subject
const MIN_BLOCK_DAYS = 1;    // Minimum days per block

// ============================================================================
// Step 1: Calculate Available Time
// ============================================================================

export function calculateAvailableTime(
  startDate: dayjs.Dayjs, 
  endDate: dayjs.Dayjs, 
  dailyHours: number
): TimeCalculation {
  const totalDays = endDate.diff(startDate, 'day') + 1; // Include end date
  const totalHours = totalDays * dailyHours;
  const weeklyHours = dailyHours * 7;
  
  return {
    totalDays,
    dailyHours,
    totalHours,
    weeklyHours
  };
}

// ============================================================================
// Step 2: Determine Subject Priorities
// ============================================================================

function getConfidenceMultiplier(
  subjectCode: string, 
  confidenceMap: Map<string, number>
): number {
  const confidence = confidenceMap.get(subjectCode);
  if (!confidence) return CONFIDENCE_MULTIPLIERS['Moderate'];
  
  // Map numeric confidence to multiplier
  if (confidence <= 0.3) return CONFIDENCE_MULTIPLIERS['Weak'];
  if (confidence >= 0.7) return CONFIDENCE_MULTIPLIERS['Strong'];
  return CONFIDENCE_MULTIPLIERS['Moderate'];
}

export function calculateSubjectPriorities(
  subjects: Subject[],
  confidenceMap: Map<string, number>
): SubjectPriority[] {
  return subjects.map(subject => {
    const confidenceMultiplier = getConfidenceMultiplier(subject.subjectCode, confidenceMap);
    const priorityWeight = subject.baselineHours * confidenceMultiplier;
    
    return {
      subjectCode: subject.subjectCode,
      subjectName: subject.subjectName,
      baselineHours: subject.baselineHours,
      confidenceMultiplier,
      priorityWeight
    };
  });
}

// ============================================================================
// Step 3: Allocate Time Proportionally
// ============================================================================

export function allocateTimeProportionally(
  priorities: SubjectPriority[],
  totalHours: number
): TimeAllocation[] {
  const totalWeight = priorities.reduce((sum, p) => sum + p.priorityWeight, 0);
  
  if (totalWeight === 0) {
    // Equal allocation if no weights
    const hoursPerSubject = Math.max(MIN_SUBJECT_HOURS, totalHours / priorities.length);
    return priorities.map(p => ({
      subjectCode: p.subjectCode,
      subjectName: p.subjectName,
      allocatedHours: hoursPerSubject,
      allocatedDays: Math.ceil(hoursPerSubject / 8) // Assume 8 hours max per day
    }));
  }
  
  // Proportional allocation
  let allocations = priorities.map(priority => {
    const proportionalHours = (totalHours * priority.priorityWeight) / totalWeight;
    const allocatedHours = Math.max(MIN_SUBJECT_HOURS, proportionalHours);
    
    return {
      subjectCode: priority.subjectCode,
      subjectName: priority.subjectName,
      allocatedHours,
      allocatedDays: Math.ceil(allocatedHours / 8)
    };
  });
  
  // Adjust if total exceeds available time
  const totalAllocated = allocations.reduce((sum, a) => sum + a.allocatedHours, 0);
  if (totalAllocated > totalHours) {
    const scaleFactor = totalHours / totalAllocated;
    allocations = allocations.map(a => ({
      ...a,
      allocatedHours: Math.max(MIN_SUBJECT_HOURS, a.allocatedHours * scaleFactor),
      allocatedDays: Math.ceil(a.allocatedHours * scaleFactor / 8)
    }));
  }
  
  return allocations;
}

// ============================================================================
// Step 4: Create Continuous Blocks
// ============================================================================

export function createContinuousBlocks(
  allocations: TimeAllocation[],
  subjects: Subject[],
  startDate: dayjs.Dayjs,
  dailyHours: number
): ContinuousBlock[] {
  const blocks: ContinuousBlock[] = [];
  let currentDate = startDate;
  
  for (const allocation of allocations) {
    const subject = subjects.find(s => s.subjectCode === allocation.subjectCode);
    if (!subject) continue;
    
    const blockDays = Math.max(MIN_BLOCK_DAYS, Math.ceil(allocation.allocatedHours / dailyHours));
    const endDate = currentDate.add(blockDays - 1, 'day');
    
    blocks.push({
      subjectCode: allocation.subjectCode,
      subjectName: allocation.subjectName,
      startDate: currentDate,
      endDate: endDate,
      dailyHours: Math.min(dailyHours, allocation.allocatedHours / blockDays),
      totalHours: allocation.allocatedHours,
      subjects: [subject]
    });
    
    currentDate = endDate.add(1, 'day');
  }
  
  return blocks;
}

// ============================================================================
// Step 5: Fill Time Gaps
// ============================================================================

export function fillTimeGaps(
  blocks: ContinuousBlock[],
  endDate: dayjs.Dayjs,
  subjects: Subject[],
  dailyHours: number
): ContinuousBlock[] {
  if (blocks.length === 0) return [];
  
  const sortedBlocks = [...blocks].sort((a, b) => a.startDate.diff(b.startDate));
  const result: ContinuousBlock[] = [];
  
  for (let i = 0; i < sortedBlocks.length; i++) {
    result.push(sortedBlocks[i]);
    
    const currentBlock = sortedBlocks[i];
    const nextBlock = sortedBlocks[i + 1];
    
    // Check for gap between current and next block
    if (nextBlock) {
      const gapStart = currentBlock.endDate.add(1, 'day');
      const gapEnd = nextBlock.startDate.subtract(1, 'day');
      
      if (gapStart.isBefore(gapEnd) || gapStart.isSame(gapEnd)) {
        const gapFiller = createGapFillerBlock(gapStart, gapEnd, subjects, dailyHours);
        result.push(gapFiller);
      }
    }
  }
  
  // Fill gap at the end if needed
  const lastBlock = sortedBlocks[sortedBlocks.length - 1];
  if (lastBlock.endDate.isBefore(endDate)) {
    const finalGapStart = lastBlock.endDate.add(1, 'day');
    const finalGapFiller = createGapFillerBlock(finalGapStart, endDate, subjects, dailyHours);
    result.push(finalGapFiller);
  }
  
  return result.sort((a, b) => a.startDate.diff(b.startDate));
}

function createGapFillerBlock(
  startDate: dayjs.Dayjs,
  endDate: dayjs.Dayjs,
  subjects: Subject[],
  dailyHours: number
): ContinuousBlock {
  // Use revision for gap filling - review all subjects
  const days = endDate.diff(startDate, 'day') + 1;
  const totalHours = days * dailyHours;
  
  return {
    subjectCode: 'REVISION',
    subjectName: 'Comprehensive Revision',
    startDate,
    endDate,
    dailyHours,
    totalHours,
    subjects
  };
}

// ============================================================================
// Step 6: Convert to Block Format
// ============================================================================

export async function convertToBlocks(
  continuousBlocks: ContinuousBlock[],
  cycleName: string,
  intake: StudentIntake,
  config: Config,
  logger: Logger
): Promise<Block[]> {
  const blocks: Block[] = [];
  
  for (let i = 0; i < continuousBlocks.length; i++) {
    const continuousBlock = continuousBlocks[i];
    const blockDurationWeeks = Math.ceil(continuousBlock.endDate.diff(continuousBlock.startDate, 'day') / 7);
    
    // Generate weekly plans for this block
    const weeklyPlans: WeeklyPlan[] = [];
    
    for (let week = 1; week <= blockDurationWeeks; week++) {
      const weeklyPlan = await createPlanForOneWeek(
        i, // block index
        continuousBlock.subjects,
        intake,
        { archetype: 'Functional' }, // Simplified archetype
        config,
        week,
        blockDurationWeeks,
        logger
      );
      weeklyPlans.push(weeklyPlan);
    }
    
    const block: Block = {
      block_id: `${cycleName.replace(/\s+/g, '')}_${continuousBlock.subjectCode}_${i + 1}`,
      block_title: `${continuousBlock.subjectName} Block`,
      block_description: `Study block for ${continuousBlock.subjectName} (${continuousBlock.totalHours} hours over ${blockDurationWeeks} weeks)`,
      subjects: continuousBlock.subjects.map(s => s.subjectCode),
      duration_weeks: blockDurationWeeks,
      block_start_date: continuousBlock.startDate.format('YYYY-MM-DD'),
      block_end_date: continuousBlock.endDate.format('YYYY-MM-DD'),
      estimated_hours: continuousBlock.totalHours,
      weekly_plan: weeklyPlans,
      block_resources: {
        primary_books: [],
        supplementary_materials: [],
        practice_resources: [],
        video_content: [],
        current_affairs_sources: [],
        revision_materials: [],
        expert_recommendations: []
      }
    };
    
    blocks.push(block);
  }
  
  return blocks;
}

// ============================================================================
// Main Pipeline Function
// ============================================================================

export async function createFunctionalBlocks(
  subjects: Subject[],
  startDate: dayjs.Dayjs,
  endDate: dayjs.Dayjs,
  dailyHours: number,
  confidenceMap: Map<string, number>,
  cycleName: string,
  intake: StudentIntake,
  config: Config,
  logger: Logger
): Promise<Block[]> {
  
  logger.logDebug('FunctionalBlockPlanner', `Creating blocks for ${subjects.length} subjects from ${startDate.format('YYYY-MM-DD')} to ${endDate.format('YYYY-MM-DD')}`);
  
  // Step 1: Calculate available time
  const timeCalculation = calculateAvailableTime(startDate, endDate, dailyHours);
  logger.logDebug('FunctionalBlockPlanner', `Available time: ${timeCalculation.totalHours} hours over ${timeCalculation.totalDays} days`);
  
  // Step 2: Determine subject priorities
  const priorities = calculateSubjectPriorities(subjects, confidenceMap);
  logger.logDebug('FunctionalBlockPlanner', `Subject priorities calculated for ${priorities.length} subjects`);
  
  // Step 3: Allocate time proportionally
  const allocations = allocateTimeProportionally(priorities, timeCalculation.totalHours);
  logger.logDebug('FunctionalBlockPlanner', `Time allocated: ${allocations.map(a => `${a.subjectCode}:${a.allocatedHours}h`).join(', ')}`);
  
  // Step 4: Create continuous blocks
  const continuousBlocks = createContinuousBlocks(allocations, subjects, startDate, dailyHours);
  logger.logDebug('FunctionalBlockPlanner', `Created ${continuousBlocks.length} continuous blocks`);
  
  // Step 5: Fill time gaps
  const gapFilledBlocks = fillTimeGaps(continuousBlocks, endDate, subjects, dailyHours);
  logger.logDebug('FunctionalBlockPlanner', `Gap-filled blocks: ${gapFilledBlocks.length} total blocks`);
  
  // Step 6: Convert to Block format
  const blocks = await convertToBlocks(
    gapFilledBlocks,
    cycleName,
    intake,
    config,
    logger
  );
  
  logger.logDebug('FunctionalBlockPlanner', `Generated ${blocks.length} final blocks`);
  
  return blocks;
}

// ============================================================================
// Utility Functions
// ============================================================================

export function validateContinuousCoverage(
  blocks: ContinuousBlock[],
  expectedStart: dayjs.Dayjs,
  expectedEnd: dayjs.Dayjs
): { isValid: boolean; gaps: Array<{ start: dayjs.Dayjs; end: dayjs.Dayjs }> } {
  const sortedBlocks = [...blocks].sort((a, b) => a.startDate.diff(b.startDate));
  const gaps: Array<{ start: dayjs.Dayjs; end: dayjs.Dayjs }> = [];
  
  // Check for gap at the beginning
  if (sortedBlocks.length > 0 && sortedBlocks[0].startDate.isAfter(expectedStart)) {
    gaps.push({
      start: expectedStart,
      end: sortedBlocks[0].startDate.subtract(1, 'day')
    });
  }
  
  // Check for gaps between blocks
  for (let i = 0; i < sortedBlocks.length - 1; i++) {
    const currentEnd = sortedBlocks[i].endDate;
    const nextStart = sortedBlocks[i + 1].startDate;
    
    if (nextStart.diff(currentEnd, 'day') > 1) {
      gaps.push({
        start: currentEnd.add(1, 'day'),
        end: nextStart.subtract(1, 'day')
      });
    }
  }
  
  // Check for gap at the end
  const lastBlock = sortedBlocks[sortedBlocks.length - 1];
  if (lastBlock && lastBlock.endDate.isBefore(expectedEnd)) {
    gaps.push({
      start: lastBlock.endDate.add(1, 'day'),
      end: expectedEnd
    });
  }
  
  return {
    isValid: gaps.length === 0,
    gaps
  };
}

export function getTotalAllocatedHours(blocks: ContinuousBlock[]): number {
  return blocks.reduce((sum, block) => sum + block.totalHours, 0);
}

export function getSubjectCoverage(blocks: ContinuousBlock[]): Map<string, number> {
  const coverage = new Map<string, number>();
  
  for (const block of blocks) {
    for (const subject of block.subjects) {
      const current = coverage.get(subject.subjectCode) || 0;
      coverage.set(subject.subjectCode, current + block.totalHours);
    }
  }
  
  return coverage;
}