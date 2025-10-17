import { Block, WeeklyPlan, DailyPlan, StudentIntake } from '../types/models';
import { CycleType, Logger } from '../types/Types';
import { Subject, getTopicEstimatedHours } from '../types/Subjects';
import { ResourceService } from '../services/ResourceService';
import { SubjectLoader } from '../services/SubjectLoader';
import { createPlanForOneWeek } from './OneWeekPlan';
import { makeLogger } from '../services/Log';
import { selectBestArchetype } from '../services/ArchetypeSelector';
import dayjs from 'dayjs';
import assert from 'assert';
import { Config } from './engine-types';

// Task ratios are now handled by intake.getTaskTypeRatios(cycleType)
const bandOrder: Record<string, number> = { 'A': 1, 'B': 2, 'C': 3, 'D': 4 };
type BlockSansResources = Omit<Block, 'block_resources'>;

/**
 * Get resources for a subject based on cycle type
 * @param subjectCode Subject code (e.g., H01)
 * @param cycleType Type of cycle (Foundation, Revision, etc.)
 * @param blockDurationWeeks Duration of the block in weeks
 * @returns Resource object with all resource types
 */
async function getBlockResources(
  subjectCode: string,
  cycleType: CycleType,
  blockDurationWeeks: number
): Promise<any> {
  try {
    if (cycleType === 'C1') {
      // For C1 cycles, use NCERT materials
      return await ResourceService.suggestResourcesForBlock(
        [subjectCode],
        cycleType,
        blockDurationWeeks
      );
    } else {
      // For other cycles, use regular resources
      return await ResourceService.getResourcesForSubject(subjectCode);
    }
  } catch (error) {
    console.warn(`Failed to load resources for subject ${subjectCode}:`, error);
    return {
      primary_books: [],
      supplementary_materials: [],
      practice_resources: [],
      video_content: [],
      current_affairs_sources: [],
      revision_materials: [],
      expert_recommendations: []
    };
  }
}

/**
 * Calculate weighted baseline for a subject
 */
function calculateWeightedBaseline(
  subject: Subject,
  confidenceMap: Map<string, number>,
  cycleType: CycleType
): number {
  const confidenceMultiplier = confidenceMap.get(subject.subjectCode) || 1.0;
  const subjBaselineHoursFactorForCycle = determineSubjBaselineFactorForCycle(cycleType);
  return subject.baselineHours * subjBaselineHoursFactorForCycle * confidenceMultiplier;
}

/**
 * Calculate total weighted baseline for all subjects
 */
function calculateTotalWeightedBaseline(
  subjects: Subject[],
  confidenceMap: Map<string, number>,
  cycleType: CycleType
): number {
  return subjects.reduce((sum, subject) =>
    sum + calculateWeightedBaseline(subject, confidenceMap, cycleType), 0);
}

/**
 * Block processor function for converting subjects into blocks
 */
async function BlockProcessor(
  params: BlockCreationParams,
  totalWeightedBaseline: number,
  prevBlocks: Promise<BlockSansResources[]>, subject: Subject
): Promise<BlockSansResources[]> {
  const blocks = await prevBlocks;
  const hoursPerDay = parseInt(params.intake.study_strategy.weekly_study_hours, 10) / 7;
  const currentCumulativeWeeks = blocks.reduce((sum, block) => sum + block.duration_weeks, 0);
  const cycleDurationWeeks = params.cycleStartDate && params.cycleEndDate
    ? Math.ceil(dayjs(params.cycleEndDate).diff(dayjs(params.cycleStartDate), 'day') / 7)
    : 0;

  // Check if we have enough time left in the cycle for this subject
  if (cycleDurationWeeks > 0 && currentCumulativeWeeks >= cycleDurationWeeks) {
    console.log(`Skipping subject ${subject.subjectName}: no time left in cycle (cumulativeWeeks=${currentCumulativeWeeks}, cycleDurationWeeks=${cycleDurationWeeks})`);
    return blocks;
  }

  // Process subject subtopics and calculate allocations
  const { adjustedSubtopics, allocatedHours, confidenceMultiplier, weightedBaseline } =
    processSubjectSubtopics(subject, params.subjData, params.confidenceMap, params.cycleType, params.totalHours, totalWeightedBaseline);

  console.log(`Subject ${subject.subjectCode} (${subject.subjectName}): baseline=${subject.baselineHours}, confidence=${confidenceMultiplier}, weighted=${weightedBaseline}, allocated=${allocatedHours} hours`);

  const trimmedSubtopics = trimSubtopicsToFit(adjustedSubtopics, allocatedHours);

  // Calculate block duration in weeks - ensure it fills remaining cycle time
  const remainingWeeks = cycleDurationWeeks - currentCumulativeWeeks;
  const calculatedDurationWeeks = Math.ceil(allocatedHours / (hoursPerDay * 7));
  const blockDurationWeeks = Math.max(calculatedDurationWeeks, Math.max(1, remainingWeeks));

  // Calculate this block's start date
  const cycleStart = new Date(params.cycleStartDate);
  const blockStart = dayjs(cycleStart).add(currentCumulativeWeeks * 7, 'day');
  console.log(`Block ${subject.subjectName}: cumulativeWeeks=${currentCumulativeWeeks}, blockStart=${blockStart.format('YYYY-MM-DD')}, blockDurationWeeks=${blockDurationWeeks}`);

  // Calculate block dates with constraints
  const cycleEnd = dayjs(params.cycleEndDate);
  const { blockStartDate, blockEndDate } = calculateBlockDatesWithConstraints(
    blockStart, blockDurationWeeks, cycleEnd, params.cycleStartDate
  );

  // Handle constrained hours if block exceeds cycle end
  let actualHours = trimmedSubtopics.length > 0
    ? trimmedSubtopics.reduce((sum, st) => sum + st.adjustedHours, 0)
    : allocatedHours;

  if (blockStart.add(blockDurationWeeks * 7 - 1, 'day').isAfter(cycleEnd)) {
    const actualWeeks = Math.ceil(dayjs(blockEndDate).diff(blockStart, 'day') / 7);
    const dailyHours = params.intake.getDailyStudyHours();
    const constrainedHours = actualWeeks * 7 * dailyHours;
    const constrainedSubtopics = trimSubtopicsToFit(adjustedSubtopics, constrainedHours);
    actualHours = constrainedSubtopics.length > 0
      ? constrainedSubtopics.reduce((sum, st) => sum + st.adjustedHours, 0)
      : Math.min(allocatedHours, constrainedHours);
    trimmedSubtopics.splice(0, trimmedSubtopics.length, ...constrainedSubtopics);
  }

  const block: BlockSansResources = {
    block_id: `${params.blockPrefix}-${subject.subjectCode}`,
    block_title: `${subject.subjectName}`,
    cycle_type: params.cycleType,
    cycle_order: params.cycleOrder,
    cycle_name: params.cycleName,
    subjects: [subject.subjectCode],
    duration_weeks: blockDurationWeeks,
    weekly_plan: await createEnhancedWeeklyPlan(blockDurationWeeks, params.cycleType, subject.subjectCode, calculateTopicHours(subject, allocatedHours, params.confidenceMap.get(subject.subjectCode) || 1.0), params.intake),
    block_start_date: blockStartDate,
    block_end_date: blockEndDate,
    block_description: `${params.blockPrefix} block for ${subject.subjectName}`,
    estimated_hours: allocatedHours,
    actual_hours: actualHours,
  };

  return [...blocks, block];
}


/**
 * Process subject subtopics and calculate allocations
 */
function processSubjectSubtopics(
  subject: Subject,
  subjData: any,
  confidenceMap: Map<string, number>,
  cycleType: CycleType,
  totalHours: number,
  totalWeightedBaseline: number
) {
  // Get subtopics for this subject from subjData
  let subjectSubtopics: any[] = [];
  if (subjData && subjData.subtopics) {
    subjectSubtopics = subject.topics.flatMap(topic =>
      subjData.subtopics.subtopics.filter((st: any) => st.topicCode === topic.topicCode)
    );
  } else {
    subjectSubtopics = subject.topics.flatMap(topic => topic.subtopics || []);
  }

  // Apply confidence factors to subtopics
  const adjustedSubtopics = subjectSubtopics
    .map(subtopic => ({
      ...subtopic,
      adjustedHours: Math.ceil(subtopic.baselineHours * (confidenceMap.get(subtopic.code) || 1.0))
    }))
    .sort((a, b) => bandOrder[a.band] - bandOrder[b.band]);

  // Calculate proportional allocation
  const confidenceMultiplier = confidenceMap.get(subject.subjectCode) || 1.0;
  const subjBaselineHoursFactorForCycle = determineSubjBaselineFactorForCycle(cycleType);
  const weightedBaseline = subject.baselineHours * subjBaselineHoursFactorForCycle * confidenceMultiplier;
  const allocatedHours = Math.max(4, Math.floor((totalHours * weightedBaseline) / totalWeightedBaseline));

  return {
    adjustedSubtopics,
    allocatedHours,
    confidenceMultiplier,
    weightedBaseline
  };
}

/**
 * Calculate block dates and handle cycle constraints
 */
function calculateBlockDatesWithConstraints(
  blockStart: dayjs.Dayjs,
  blockDurationWeeks: number,
  cycleEnd: dayjs.Dayjs,
  cycleStartDate: string
) {
  const desiredBlockEnd = blockStart.add(blockDurationWeeks * 7 - 1, 'day');
  let blockEnd = desiredBlockEnd;

  if (desiredBlockEnd.isAfter(cycleEnd)) {
    blockEnd = cycleEnd;
  }

  const newStartDate = blockEnd.subtract(blockDurationWeeks * 7 - 1, 'day');
  const newStartDate2 = dayjs(newStartDate).isAfter(dayjs(cycleStartDate))
    ? dayjs(newStartDate)
    : dayjs(cycleStartDate);

  assert(newStartDate2.isBefore(cycleEnd.format('YYYY-MM-DD')));

  return {
    blockStartDate: newStartDate2.format('YYYY-MM-DD'),
    blockEndDate: blockEnd.format('YYYY-MM-DD')
  };
}

/**
 * Determine baseline hours for a subject based on cycle type
 * @param baselineHours Original baseline hours for the subject
 * @param cycleType Type of cycle (Foundation, Revision, etc.)
 * @returns Adjusted baseline hours
 */
function determineSubjBaselineFactorForCycle(cycleType: CycleType): number {
  switch (cycleType) {
    case CycleType.C1: return 1.0;
    case CycleType.C2: return 1.0;
    case CycleType.C3: return 1.0;
    case CycleType.C4: return 0.8;
    case CycleType.C5: return 0.6;
    case CycleType.C5B: return 0.6;
    case CycleType.C6: return 0.8;
    case CycleType.C7: return 0.6;
    case CycleType.C8: return 1.0;
    default:
      // Use original baseline hours for all other cycle types
      return 1.0;
  }
}


export type BlockCreationParams = {
  intake: StudentIntake;
  subjects: Subject[];
  totalHours: number;
  confidenceMap: Map<string, number>;
  blockPrefix: string;
  cycleType: CycleType;
  cycleOrder: number;
  cycleName: string;
  cycleStartDate: string;
  cycleEndDate: string;
  subjData: any;
  logger: Logger;
};

/**
 * Create blocks for subjects with confidence factors applied and trimming
 */
export async function createBlocksForSubjects(params: BlockCreationParams): Promise<Block[]> {
  const { intake, subjects, confidenceMap, cycleType, cycleStartDate, cycleEndDate } = params;
  const cycleStartDayJs = dayjs(cycleStartDate);
  const cycleEndDayJs = dayjs(cycleEndDate);
  const subjectApproach = intake.subject_approach;

  if (subjectApproach === 'DualSubject' || subjectApproach === 'TripleSubject') {
    return await createContinuousParallelBlocks(subjectApproach === 'DualSubject' ? 2 : 3, params);
  }

  // Calculate total weighted baseline hours for proportional allocation
  const totalWeightedBaseline = calculateTotalWeightedBaseline(subjects, confidenceMap, cycleType);
  const init = Promise.resolve([] as BlockSansResources[]);
  const sansResources: BlockSansResources[] = await subjects.reduce(
    (blocksPromise, subject) => BlockProcessor(params, totalWeightedBaseline, blocksPromise, subject),
    init);

  const withResources: Block[] = await Promise.all(sansResources.map(async block => ({
    ...block,
    block_resources: await getBlockResources(block.subjects[0], params.cycleType, block.duration_weeks)
  })));
  return withResources
    .map(block => rescheduleOutofBoundsSingleBlock(cycleStartDayJs, cycleEndDayJs, block))
    .filter(block => !isBlockOutOfBounds(cycleStartDayJs, cycleEndDayJs)(block))
    .filter(block => block && block.actual_hours && block.actual_hours > 0)
    .sort((a, b) => dayjs(a.block_start_date).diff(dayjs(b.block_start_date)));
}

function isBlockOutOfBounds(cycleStart: dayjs.Dayjs, cycleEnd: dayjs.Dayjs) {
  return (block: Block): boolean => {
    const blockStart = dayjs(block.block_start_date);
    const blockEnd = dayjs(block.block_end_date);

    // Block is out of bounds if:
    // 1. Starts before cycle start
    // 2. Starts after cycle end
    // 3. Ends after cycle end
    // 4. Has invalid dates (end before start)
    return blockStart.isBefore(cycleStart) ||
      blockStart.isAfter(cycleEnd) ||
      blockEnd.isAfter(cycleEnd) ||
      blockEnd.isBefore(blockStart);
  };
}


const rescheduleOutofBoundsSingleBlock = (cycleStart: dayjs.Dayjs, cycleEnd: dayjs.Dayjs, block: Block): Block => {
  if (!isBlockOutOfBounds(cycleStart, cycleEnd)(block)) {
    return block;
  }

  let currentStart = cycleStart;

  // Try original duration first (convert weeks to days)
  const originalDurationDays = block.duration_weeks * 7;
  let newEndDate = currentStart.add(originalDurationDays - 1, 'day');
  const originalEstimatedHours = block.estimated_hours || 0;
  const originalActualHours = block.actual_hours || 0;

  // If the new end date would exceed cycle end, try reducing duration iteratively
  if (newEndDate.isAfter(cycleEnd)) {
    let currentDurationDays = originalDurationDays;
    const reductionFactor = 0.7; // 30% reduction per attempt
    const maxAttempts = 3; // Maximum 3 reduction attempts

    let attempts = 0;
    while (newEndDate.isAfter(cycleEnd) && attempts < maxAttempts) {
      currentDurationDays = Math.max(1, Math.floor(currentDurationDays * reductionFactor)); // Minimum 1 day
      newEndDate = currentStart.add(currentDurationDays - 1, 'day');
      attempts++;
      // @ts-ignore
      const currentDurationWeeks = Math.ceil(currentDurationDays / 7);
      // console.log(`Block ${block.block_title} duration reduced to ${currentDurationDays} days (${currentDurationWeeks} weeks, ${Math.round((currentDurationDays / originalDurationDays) * 100)}% of original) - attempt ${attempts}/${maxAttempts}`);
    }

    // Update block properties with final reduced values
    const finalReductionFactor = currentDurationDays / originalDurationDays;
    block.duration_weeks = Math.ceil(currentDurationDays / 7); // Convert back to weeks for display
    block.estimated_hours = Math.floor(originalEstimatedHours * finalReductionFactor);
    block.actual_hours = Math.floor(originalActualHours * finalReductionFactor);

    // If still exceeds cycle end after all attempts, force it to fit within cycle dates
    if (newEndDate.isAfter(cycleEnd)) {
      // console.log(`⚠️  Block ${block.block_title} still exceeds cycle end after ${maxAttempts} reduction attempts. Forcing to fit within cycle dates.`);

      // If currentStart is after cycleEnd, the block cannot be scheduled
      if (currentStart.isAfter(cycleEnd)) {
        // console.log(`⚠️  Block ${block.block_title} cannot be scheduled - start date ${currentStart.format('YYYY-MM-DD')} is after cycle end ${cycleEnd.format('YYYY-MM-DD')}. Marking for removal.`);
        // Mark block for removal by setting invalid dates
        block.block_start_date = cycleEnd.add(1, 'day').format('YYYY-MM-DD');
        block.block_end_date = cycleEnd.add(1, 'day').format('YYYY-MM-DD');
        return block;
      }

      // Force the block to end exactly at cycle end date
      newEndDate = cycleEnd;
      const forcedDurationDays = Math.max(1, cycleEnd.diff(currentStart, 'day') + 1); // +1 to include both start and end days

      // Update block properties to match the forced duration
      block.duration_weeks = Math.ceil(forcedDurationDays / 7); // Convert back to weeks for display
      block.estimated_hours = Math.floor(originalEstimatedHours * (forcedDurationDays / originalDurationDays));
      block.actual_hours = Math.floor(originalActualHours * (forcedDurationDays / originalDurationDays));

      // console.log(`Block ${block.block_title} forced to ${forcedDurationDays} days (${block.duration_weeks} weeks) to fit within cycle dates`);
    }
  }

  // Update block dates
  block.block_start_date = currentStart.format('YYYY-MM-DD');
  block.block_end_date = newEndDate.format('YYYY-MM-DD');

  // Move to next available slot
  currentStart = newEndDate.add(1, 'day');
  return block;
};

// @ts-ignore 
const rescheduleOutofBoundsBlocksOld = (cycleStart: dayjs.Dayjs, cycleEnd: dayjs.Dayjs, _blocks: Block[]): Block[] => {
  const blocks = _blocks;
  let excessBlocks: Block[] = [];
  let numAttempts = 0;

  for (
    excessBlocks = blocks.filter(isBlockOutOfBounds(cycleStart, cycleEnd));
    excessBlocks.length > 0 && numAttempts < 5;
    excessBlocks = blocks.filter(isBlockOutOfBounds(cycleStart, cycleEnd)), numAttempts++
  ) {
    // console.log(`# excess: ${excessBlocks.length}, numAttempts: ${numAttempts}`);

    // Schedule excess blocks sequentially after the last valid block
    let currentStart = cycleStart;

    for (const block of excessBlocks) {
      // const beforeStart = dayjs(block.block_start_date).format('YYYY-MM-DD');
      // const beforeEnd = dayjs(block.block_end_date).format('YYYY-MM-DD');

      // Try original duration first (convert weeks to days)
      const originalDurationDays = block.duration_weeks * 7;
      let newEndDate = currentStart.add(originalDurationDays - 1, 'day');
      const originalEstimatedHours = block.estimated_hours || 0;
      const originalActualHours = block.actual_hours || 0;

      // If the new end date would exceed cycle end, try reducing duration iteratively
      if (newEndDate.isAfter(cycleEnd)) {
        let currentDurationDays = originalDurationDays;
        const reductionFactor = 0.7; // 30% reduction per attempt
        const maxAttempts = 3; // Maximum 3 reduction attempts

        let attempts = 0;
        while (newEndDate.isAfter(cycleEnd) && attempts < maxAttempts) {
          currentDurationDays = Math.max(1, Math.floor(currentDurationDays * reductionFactor)); // Minimum 1 day
          newEndDate = currentStart.add(currentDurationDays - 1, 'day');
          attempts++;
          // @ts-ignore
          const currentDurationWeeks = Math.ceil(currentDurationDays / 7);
          // console.log(`Block ${block.block_title} duration reduced to ${currentDurationDays} days (${currentDurationWeeks} weeks, ${Math.round((currentDurationDays / originalDurationDays) * 100)}% of original) - attempt ${attempts}/${maxAttempts}`);
        }

        // Update block properties with final reduced values
        const finalReductionFactor = currentDurationDays / originalDurationDays;
        block.duration_weeks = Math.ceil(currentDurationDays / 7); // Convert back to weeks for display
        block.estimated_hours = Math.floor(originalEstimatedHours * finalReductionFactor);
        block.actual_hours = Math.floor(originalActualHours * finalReductionFactor);

        // If still exceeds cycle end after all attempts, force it to fit within cycle dates
        if (newEndDate.isAfter(cycleEnd)) {
          // console.log(`⚠️  Block ${block.block_title} still exceeds cycle end after ${maxAttempts} reduction attempts. Forcing to fit within cycle dates.`);

          // If currentStart is after cycleEnd, the block cannot be scheduled
          if (currentStart.isAfter(cycleEnd)) {
            // console.log(`⚠️  Block ${block.block_title} cannot be scheduled - start date ${currentStart.format('YYYY-MM-DD')} is after cycle end ${cycleEnd.format('YYYY-MM-DD')}. Marking for removal.`);
            // Mark block for removal by setting invalid dates
            block.block_start_date = cycleEnd.add(1, 'day').format('YYYY-MM-DD');
            block.block_end_date = cycleEnd.add(1, 'day').format('YYYY-MM-DD');
            continue;
          }

          // Force the block to end exactly at cycle end date
          newEndDate = cycleEnd;
          const forcedDurationDays = Math.max(1, cycleEnd.diff(currentStart, 'day') + 1); // +1 to include both start and end days

          // Update block properties to match the forced duration
          block.duration_weeks = Math.ceil(forcedDurationDays / 7); // Convert back to weeks for display
          block.estimated_hours = Math.floor(originalEstimatedHours * (forcedDurationDays / originalDurationDays));
          block.actual_hours = Math.floor(originalActualHours * (forcedDurationDays / originalDurationDays));

          // console.log(`Block ${block.block_title} forced to ${forcedDurationDays} days (${block.duration_weeks} weeks) to fit within cycle dates`);
        }
      }

      // Update block dates
      block.block_start_date = currentStart.format('YYYY-MM-DD');
      block.block_end_date = newEndDate.format('YYYY-MM-DD');

      // Move to next available slot
      currentStart = newEndDate.add(1, 'day');
    }
  }

  return blocks;
};


/**
 * Trim subtopics to fit within allocated hours, starting from D5 down to B1
 */
export function trimSubtopicsToFit(subtopics: any[], allocatedHours: number): any[] {
  let currentHours = 0;
  const result: any[] = [];

  // Keep all Band A subtopics
  const bandASubtopics = subtopics.filter(st => st.band === 'A');
  currentHours += bandASubtopics.reduce((sum, st) => sum + st.adjustedHours, 0);
  result.push(...bandASubtopics);

  // Add other bands in order until we hit the limit
  const otherSubtopics = subtopics.filter(st => st.band !== 'A');

  for (const subtopic of otherSubtopics) {
    if (currentHours + subtopic.adjustedHours <= allocatedHours) {
      result.push(subtopic);
      currentHours += subtopic.adjustedHours;
    } else {
      break;
    }
  }

  return result;
}

/**
 * Adjust total hours to fit within cycle constraints
 */
export function adjustHoursForCycleConstraint(
  _subjects: Subject[],
  totalHours: number,
  cycleEndDate: string,
  cycleStartDate: string,
  dailyHours: number = 8
): number {
  const cycleDurationDays = dayjs(cycleEndDate).diff(dayjs(cycleStartDate), 'day');
  const maxPossibleHours = cycleDurationDays * dailyHours;

  if (totalHours > maxPossibleHours) {
    const reductionFactor = maxPossibleHours / totalHours;
    return Math.floor(totalHours * reductionFactor);
  }

  return totalHours;
}

/**
 * Calculate topic-level hours within a subject based on topic priorities
 * @param subject Subject with topics
 * @param subjectAllocatedHours Total hours allocated to this subject
 * @param confidenceMultiplier Confidence adjustment (1.0 = neutral)
 * @returns Map of topicCode -> allocated hours
 */
function calculateTopicHours(
  subject: Subject,
  subjectAllocatedHours: number,
  confidenceMultiplier: number
): Map<string, number> {
  const topicHoursMap = new Map<string, number>();

  // Step 1: Get estimated hours for each topic based on priority
  const topicsWithBaseline = subject.topics.map(topic => {
    const estimatedHours = getTopicEstimatedHours(topic); // 10/6/3/1 by priority
    return {
      topic,
      baselineHours: estimatedHours,
      weightedHours: estimatedHours * confidenceMultiplier
    };
  });

  // Step 2: Calculate proportional allocation
  const totalWeightedHours = topicsWithBaseline.reduce((sum, t) => sum + t.weightedHours, 0);

  topicsWithBaseline.forEach(({ topic, weightedHours }) => {
    const allocatedHours = Math.max(1, Math.floor(
      (subjectAllocatedHours * weightedHours) / totalWeightedHours
    ));
    topicHoursMap.set(topic.topicCode, allocatedHours);
  });

  return topicHoursMap;
}

/**
 * Create enhanced weekly plan using OneWeekPlan.ts for better task variety
 * @param durationWeeks Duration in weeks
 * @param cycleType Type of cycle (Foundation, Revision, etc.)
 * @param subjectCode Subject code (e.g., H01)
 * @param topicHoursMap Map of topicCode -> allocated hours
 * @returns WeeklyPlan array with diverse task types
 */
async function createEnhancedWeeklyPlan(
  durationWeeks: number,
  cycleType: CycleType,
  subjectCode: string,
  _topicHoursMap: Map<string, number>,
  intake: StudentIntake
): Promise<WeeklyPlan[]> {

  // Convert topic hours to subject format for OneWeekPlan.ts
  const subject = SubjectLoader.getSubjectByCode(subjectCode);
  if (!subject) {
    return Promise.reject(new Error(`Subject ${subjectCode} not found`));
  }

  // Generate weeks using OneWeekPlan.ts
  const weeklyPlans: WeeklyPlan[] = [];
  for (let week = 1; week <= durationWeeks; week++) {
    try {
      const weekPlan = await createPlanForOneWeek(
        0, // blockIndex
        [subject],
        intake,
        await getArchetype(),
        createConfigFromCycleType(cycleType, intake),
        week,
        durationWeeks,
        makeLogger([])
      );
      weeklyPlans.push(weekPlan);
    } catch (error) {
      console.warn(`Failed to generate week ${week} with OneWeekPlan.ts, falling back to basic plan:`, error);
      // Fallback to basic plan for this week
      const basicWeek = createBasicWeeklyPlan(1, subjectCode)[0];
      basicWeek.week = week;
      weeklyPlans.push(basicWeek);
    }
  }

  return weeklyPlans;


  // Create archetype using the dedicated selector function
  async function getArchetype() {
    const baseArchetype = await selectBestArchetype(intake);
    // Enhance archetype with cycle type information
    const archetype = {
      ...baseArchetype,
      archetype: cycleType // Override with the actual cycle type (e.g., 'C1')
    };
    return archetype;
  };
}

/**
 * Create config from cycle type with appropriate task ratios
 */
function createConfigFromCycleType(cycleType: CycleType, intake: StudentIntake): Config {

  const taskEffortSplit = intake.getTaskEffortSplit(cycleType, intake);

  return {
    daily_hour_limits: {
      regular_day: intake.getDailyStudyHours(),
      catch_up_day: 0, // Catchup day should be empty - for student to catch up on missed work
      test_day: Math.max(6, Math.floor(intake.getDailyStudyHours() * 0.75)) // 75% of daily hours for test days
    },
    task_effort_split: taskEffortSplit,
    block_duration_clamp: {
      min_weeks: 2,
      max_weeks: 8
    }
  };
}

/**
 * Fallback basic weekly plan creation
 */
function createBasicWeeklyPlan(durationWeeks: number, subjectCode: string): WeeklyPlan[] {
  const weeklyPlans: WeeklyPlan[] = [];

  for (let week = 1; week <= durationWeeks; week++) {
    const daily_plans: DailyPlan[] = [];

    for (let day = 1; day <= 7; day++) {
      daily_plans.push({
        day,
        tasks: [{
          task_id: `study-${subjectCode}-w${week}-d${day}`,
          humanReadableId: `Study ${subjectCode} W${week}D${day}`,
          title: `${subjectCode} - Study Session`,
          duration_minutes: 240, // 4 hours default
          topicCode: subjectCode,
          taskType: 'study'
        }]
      });
    }

    weeklyPlans.push({
      week,
      daily_plans
    });
  }

  return weeklyPlans;
}

/**
 * Schedule information for a subject block
 */
type SubjectSchedule = {
  subject: Subject;
  startDate: string;
  endDate: string;
  durationWeeks: number;
  allocatedHours: number;
};

/**
 * Create blocks with continuous parallel execution
 * Always maintains the specified number of active parallel subjects
 * Ensures continuous coverage throughout the entire cycle duration
 */
async function createContinuousParallelBlocks(
  numberOfParallelSubjects: number,
  params: BlockCreationParams
): Promise<Block[]> {
  const { subjects, totalHours, confidenceMap, cycleType, cycleStartDate, cycleEndDate, logger } = params;
  logger.logInfo('CycleUtils', `Creating ${numberOfParallelSubjects} parallel subject blocks for ${subjects.length} subjects`);

  // Phase 1: Pure scheduling logic
  const subjectSchedules = scheduleParallelSubjects(
    subjects,
    numberOfParallelSubjects,
    totalHours,
    confidenceMap,
    cycleType,
    cycleStartDate,
    cycleEndDate
  );

  // Phase 2: Block creation from schedules
  const blocks = await Promise.all(
    subjectSchedules.map(schedule => createBlockFromSchedule(schedule, params))
  );

  // Phase 3: Validation and sorting
  const cycleStart = dayjs(cycleStartDate);
  const cycleEnd = dayjs(cycleEndDate);
  return blocks
    .map(block => rescheduleOutofBoundsSingleBlock(cycleStart, cycleEnd, block))
    .filter(block => !isBlockOutOfBounds(cycleStart, cycleEnd)(block))
    .filter(block => block && block.actual_hours && block.actual_hours > 0)
    .sort((a, b) => dayjs(a.block_start_date).diff(dayjs(b.block_start_date)));
}

/**
 * Pure scheduling logic - creates schedule data structure
 */
function scheduleParallelSubjects(
  subjects: Subject[],
  numberOfParallelSubjects: number,
  totalHours: number,
  confidenceMap: Map<string, number>,
  cycleType: CycleType,
  cycleStartDate: string,
  cycleEndDate: string
): SubjectSchedule[] {
  const subjectAllocations = calculateSubjectAllocations(subjects, totalHours, confidenceMap, cycleType);
  const schedules: SubjectSchedule[] = [];
  const activeSchedules: SubjectSchedule[] = [];

  // Schedule initial parallel subjects
  const initialSubjects = subjects.slice(0, numberOfParallelSubjects);
  for (const subject of initialSubjects) {
    const allocatedHours = subjectAllocations.get(subject.subjectCode) || 4;
    const durationWeeks = Math.ceil(allocatedHours / (8 * 7));
    const endDate = dayjs(cycleStartDate).add(durationWeeks * 7 - 1, 'day').format('YYYY-MM-DD');
    
    const schedule: SubjectSchedule = {
      subject,
      startDate: cycleStartDate,
      endDate,
      durationWeeks,
      allocatedHours
    };
    
    schedules.push(schedule);
    activeSchedules.push(schedule);
  }

  // Schedule remaining subjects
  const remainingSubjects = subjects.slice(numberOfParallelSubjects);
  for (const subject of remainingSubjects) {
    const allocatedHours = subjectAllocations.get(subject.subjectCode) || 4;
    const durationWeeks = Math.ceil(allocatedHours / (8 * 7));
    
    // Find earliest ending schedule
    const earliestEnding = activeSchedules.reduce((earliest, current) =>
      dayjs(current.endDate).isBefore(dayjs(earliest.endDate)) ? current : earliest
    );
    
    const startDate = dayjs(earliestEnding.endDate).add(1, 'day').format('YYYY-MM-DD');
    const endDate = dayjs(startDate).add(durationWeeks * 7 - 1, 'day').format('YYYY-MM-DD');
    
    const schedule: SubjectSchedule = {
      subject,
      startDate,
      endDate,
      durationWeeks,
      allocatedHours
    };
    
    schedules.push(schedule);
    
    // Replace the ending schedule with the new one
    const index = activeSchedules.indexOf(earliestEnding);
    activeSchedules[index] = schedule;
  }

  return schedules;
}

/**
 * Create block from schedule data
 */
async function createBlockFromSchedule(
  schedule: SubjectSchedule,
  params: BlockCreationParams
): Promise<Block> {
  return createSingleSubjectBlock(
    schedule.subject,
    schedule.startDate,
    schedule.allocatedHours,
    params.confidenceMap,
    params.subjData,
    params.blockPrefix,
    params.cycleType,
    params.cycleOrder,
    params.cycleName,
    params.cycleEndDate,
    params.intake,
    params.logger
  );
}

/**
 * Calculate subject allocations based on proportional hours
 */
function calculateSubjectAllocations(
  subjects: Subject[],
  totalHours: number,
  confidenceMap: Map<string, number>,
  cycleType: CycleType
): Map<string, number> {
  const totalWeightedBaseline = calculateTotalWeightedBaseline(subjects, confidenceMap, cycleType);
  
  return subjects.reduce((map, subject) => {
    const confidenceMultiplier = confidenceMap.get(subject.subjectCode) || 1.0;
    const weightedBaseline = subject.baselineHours * confidenceMultiplier;
    const allocatedHours = Math.max(4, Math.floor(
      (totalHours * weightedBaseline) / totalWeightedBaseline
    ));
    map.set(subject.subjectCode, allocatedHours);
    return map;
  }, new Map<string, number>());
}


/**
 * Create a single subject block using existing block creation logic
 */
async function createSingleSubjectBlock(
  subject: Subject,
  startDate: string,
  allocatedHours: number,
  confidenceMap: Map<string, number>,
  subjData: any,
  blockPrefix: string,
  cycleType: CycleType,
  cycleOrder: number,
  cycleName: string,
  cycleEndDate: string,
  intake: StudentIntake,
  // @ts-ignore
  logger: Logger
): Promise<Block> {

  // Get subtopics for this subject (from existing logic lines 32-43)
  let subjectSubtopics: any[] = [];
  if (subjData && subjData.subtopics) {
    subjectSubtopics = subject.topics.flatMap(topic =>
      subjData.subtopics.subtopics.filter((st: any) => st.topicCode === topic.topicCode)
    );
  } else {
    subjectSubtopics = subject.topics.flatMap(topic => topic.subtopics || []);
  }

  // Apply confidence factors and trim (lines 44-58)
  const adjustedSubtopics = subjectSubtopics
    .map(subtopic => ({
      ...subtopic,
      adjustedHours: Math.ceil(subtopic.baselineHours * (confidenceMap.get(subtopic.code) || 1.0))
    }))
    .sort((a, b) => {
      const bandOrder: Record<string, number> = { 'A': 1, 'B': 2, 'C': 3, 'D': 4 };
      return bandOrder[a.band] - bandOrder[b.band];
    });

  const trimmedSubtopics = trimSubtopicsToFit(adjustedSubtopics, allocatedHours);

  // Calculate block duration and dates (lines 60-115)
  const blockDurationWeeks = Math.ceil(allocatedHours / (8 * 7));
  const blockStart = dayjs(startDate);
  const desiredBlockEnd = blockStart.add(blockDurationWeeks * 7 - 1, 'day');

  // Ensure block doesn't exceed cycle end date
  let blockEnd = desiredBlockEnd;
  if (desiredBlockEnd.isAfter(dayjs(cycleEndDate))) {
    blockEnd = dayjs(cycleEndDate);

    // Recalculate actual hours based on constrained duration
    const actualWeeks = Math.ceil(blockEnd.diff(blockStart, 'day') / 7);
    const dailyHours = intake.getDailyStudyHours();
    const constrainedHours = actualWeeks * 7 * dailyHours;
    const constrainedSubtopics = trimSubtopicsToFit(adjustedSubtopics, constrainedHours);

    trimmedSubtopics.splice(0, trimmedSubtopics.length, ...constrainedSubtopics);
  }

  // Calculate actual hours
  const actualHours = trimmedSubtopics.length > 0
    ? trimmedSubtopics.reduce((sum, st) => sum + st.adjustedHours, 0)
    : allocatedHours;

  // Get resources for this subject
  const blockResources = await getBlockResources(subject.subjectCode, cycleType, blockDurationWeeks);

  // Create block object using simplified weekly plan to avoid memory issues
  const block: Block = {
    block_id: `${blockPrefix}-${subject.subjectCode}`,
    block_title: `${subject.subjectName}`,
    cycle_type: cycleType,
    cycle_order: cycleOrder,
    cycle_name: cycleName,
    subjects: [subject.subjectCode],
    duration_weeks: blockDurationWeeks,
    weekly_plan: await createEnhancedWeeklyPlan(blockDurationWeeks, cycleType, subject.subjectCode, calculateTopicHours(subject, allocatedHours, 1.0), intake),
    block_resources: blockResources,
    block_start_date: blockStart.format('YYYY-MM-DD'),
    block_end_date: blockEnd.format('YYYY-MM-DD'),
    block_description: `${blockPrefix} block for ${subject.subjectName}`,
    estimated_hours: allocatedHours,
    actual_hours: actualHours
  };

  return block;
}
