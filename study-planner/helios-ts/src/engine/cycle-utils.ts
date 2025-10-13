import { Block, WeeklyPlan, DailyPlan, StudentIntake, createStudentIntake } from '../types/models';
import { CycleType } from '../types/Types';
import { Subject, getTopicEstimatedHours } from '../types/Subjects';
import { ResourceService } from '../services/ResourceService';
import { SubjectLoader } from '../services/SubjectLoader';
import { createPlanForOneWeek, Config } from './OneWeekPlan';
import { makeLogger } from '../services/Log';
import dayjs from 'dayjs';
import assert from 'assert';

// Task ratios are now handled by intake.getTaskTypeRatios(cycleType)
const bandOrder: Record<string, number> = { 'A': 1, 'B': 2, 'C': 3, 'D': 4 };

/**
 * Create blocks for subjects with confidence factors applied and trimming
 */
export async function createBlocksForSubjects(
  intake: StudentIntake,
  subjects: Subject[],
  totalHours: number,
  confidenceMap: Map<string, number>,
  blockPrefix: string,
  cycleType: CycleType,
  cycleOrder: number,
  cycleName: string,
  cycleStartDate: string,
  cycleEndDate: string,
  subjData: any,
): Promise<Block[]> {
  const subjectApproach = intake.subject_approach;
  const hoursPerDay = parseInt(intake.study_strategy.weekly_study_hours, 10) / 7; 
  // If parallel approach requested, use our continuous parallel logic
  if (subjectApproach === 'DualSubject' || subjectApproach === 'TripleSubject') {
    const numberOfParallelSubjects = subjectApproach === 'DualSubject' ? 2 : 3;
    return await createContinuousParallelBlocks(
      subjects,
      numberOfParallelSubjects,
      totalHours,
      confidenceMap,
      blockPrefix,
      cycleType,
      cycleOrder,
      cycleName,
      cycleStartDate,
      cycleEndDate,
      intake,
      subjData
    );
  }

  // Track cumulative weeks for date calculation (existing sequential logic)
  let cumulativeWeeks = 0;
  console.log("===================================================")
  console.log(`******
    Creating blocks for cycle type: 
    ${cycleType} 
    period: ${cycleStartDate} to ${cycleEndDate}`);

  // Calculate total weighted baseline hours for proportional allocation
  const totalWeightedBaseline = subjects.reduce((sum, subject) => {
    const confidenceMultiplier = confidenceMap.get(subject.subjectCode) || 1.0;
    return sum + (subject.baselineHours * confidenceMultiplier);
  }, 0);

  console.log(`Total weighted baseline hours: ${totalWeightedBaseline}, Total available hours: ${totalHours}`);
  
  // Calculate cycle duration in weeks for validation
  let cycleDurationWeeks = 0;
  if (cycleStartDate && cycleEndDate) {
    const start = dayjs(cycleStartDate);
    const end = dayjs(cycleEndDate);
    cycleDurationWeeks = Math.ceil(end.diff(start, 'day') / 7);
    console.log(`Cycle duration: ${cycleDurationWeeks} weeks (${cycleDurationWeeks * 7} days)`);
  }
  
  
  const blocks: Block[] = [];
  for (const subject of subjects) {
    // Check if we have enough time left in the cycle for this subject
    if (cycleDurationWeeks > 0 && cumulativeWeeks >= cycleDurationWeeks) {
      console.log(`Skipping subject ${subject.subjectName}: no time left in cycle (cumulativeWeeks=${cumulativeWeeks}, cycleDurationWeeks=${cycleDurationWeeks})`);
      continue;
    }
    // Get subtopics for this subject from subjData
    let subjectSubtopics: any[] = [];

    if (subjData && subjData.subtopics) {
      // Get all subtopics for this subject's topics
      subjectSubtopics = subject.topics.flatMap(topic =>
        subjData.subtopics.subtopics.filter((st: any) => st.topicCode === topic.topicCode)
      );
    } else {
      // Fallback to embedded subtopics (if any)
      subjectSubtopics = subject.topics.flatMap(topic => topic.subtopics || []);
    }

    // Apply confidence factors to subtopics
    const adjustedSubtopics = subjectSubtopics
      .map(subtopic => ({
        ...subtopic,
        adjustedHours: Math.ceil(subtopic.baselineHours * (confidenceMap.get(subtopic.code) || 1.0))
      }))
      .sort((a, b) => {
        // Sort by band only (A=1, B=2, C=3, D=4)
        return bandOrder[a.band] - bandOrder[b.band];
      });

    // Calculate proportional allocation based on baseline hours and confidence
    const confidenceMultiplier = confidenceMap.get(subject.subjectCode) || 1.0;
    const weightedBaseline = subject.baselineHours * confidenceMultiplier;
    
    // Allocate this subject's proportional share
    const allocatedHours = Math.max(4, Math.floor(
      (totalHours * weightedBaseline) / totalWeightedBaseline
    ));
    
    console.log(`Subject ${subject.subjectCode} (${subject.subjectName}): baseline=${subject.baselineHours}, confidence=${confidenceMultiplier}, weighted=${weightedBaseline}, allocated=${allocatedHours} hours`);
    const trimmedSubtopics = trimSubtopicsToFit(adjustedSubtopics, allocatedHours);

    // Calculate block duration in weeks
    const blockDurationWeeks = Math.ceil(allocatedHours / (hoursPerDay * 7)); // 8 hours/day, 7 days/week

    // Calculate block dates if cycle start date is provided
    let blockStartDate: string | undefined;
    let blockEndDate: string | undefined;
    let actualHours = trimmedSubtopics.length > 0
      ? trimmedSubtopics.reduce((sum, st) => sum + st.adjustedHours, 0)
      : allocatedHours;

    if (cycleStartDate) {
      const cycleStart = new Date(cycleStartDate);

      // Check if we have enough time left in the cycle for this block
      if (cycleDurationWeeks > 0 && cumulativeWeeks >= cycleDurationWeeks) {
        console.log(`Skipping subject ${subject.subjectName}: no time left in cycle (cumulativeWeeks=${cumulativeWeeks}, cycleDurationWeeks=${cycleDurationWeeks})`);
        continue;
      }

      // Calculate this block's start date
      const blockStart = dayjs(cycleStart).add(cumulativeWeeks * 7, 'day');
      console.log(`Block ${subject.subjectName}: cumulativeWeeks=${cumulativeWeeks}, blockStart=${blockStart.format('YYYY-MM-DD')}, blockDurationWeeks=${blockDurationWeeks}`);

      // Calculate desired end date based on allocated hours
      const desiredBlockEnd = blockStart.add(blockDurationWeeks * 7 - 1, 'day');

      // If cycle end date is provided, ensure block doesn't exceed it
      let blockEnd = desiredBlockEnd;
      if (cycleEndDate) {
        const cycleEnd = dayjs(cycleEndDate);
        
        // If block start is after cycle end, this indicates a scheduling logic error
        
        if (desiredBlockEnd.isAfter(cycleEnd)) {
          // Block would exceed cycle end date, constrain it
          blockEnd = cycleEnd;

          // Recalculate actual hours based on constrained duration
          const actualWeeks = Math.ceil(blockEnd.diff(blockStart, 'day') / 7);
          const dailyHours = intake.getDailyStudyHours();
          const constrainedHours = actualWeeks * 7 * dailyHours;

          // Re-trim subtopics to fit constrained hours
          const constrainedSubtopics = trimSubtopicsToFit(adjustedSubtopics, constrainedHours);
          actualHours = constrainedSubtopics.length > 0
            ? constrainedSubtopics.reduce((sum, st) => sum + st.adjustedHours, 0)
            : Math.min(allocatedHours, constrainedHours);

          // Update trimmedSubtopics to use constrained version
          trimmedSubtopics.splice(0, trimmedSubtopics.length, ...constrainedSubtopics);
        }
      }

      blockEndDate = blockEnd.format('YYYY-MM-DD');
      const newStartDate = blockEnd.subtract(blockDurationWeeks * 7 - 1, 'day');
      // Not valid: dayjs.max does not exist. Use workaround for min/max of dayjs objects.
      const newStartDate2 = dayjs(newStartDate).isAfter(dayjs(cycleStartDate))
        ? dayjs(newStartDate)
        : dayjs(cycleStartDate);
      assert(newStartDate2.isBefore(cycleEndDate));
      blockStartDate = newStartDate2.format('YYYY-MM-DD');


      // Update cumulative weeks for next block based on actual duration
      const actualWeeks = Math.ceil(blockEnd.diff(blockStart, 'day') / 7);
      cumulativeWeeks += actualWeeks;
      console.log(`After block ${subject.subjectName}: actualWeeks=${actualWeeks}, total cumulativeWeeks=${cumulativeWeeks}, cycleDurationWeeks=${cycleDurationWeeks}`);
    }

    // Get resources for this subject
    let blockResources;
    try {
      if (cycleType === 'C1') {
        // For C1 cycles, use NCERT materials
        blockResources = await ResourceService.suggestResourcesForBlock(
          [subject.subjectCode], 
          cycleType,
          blockDurationWeeks
        );
      } else {
        // For other cycles, use regular resources
        blockResources = await ResourceService.getResourcesForSubject(subject.subjectCode);
      }
    } catch (error) {
      console.warn(`Failed to load resources for subject ${subject.subjectCode}:`, error);
      blockResources = {
        primary_books: [],
        supplementary_materials: [],
        practice_resources: [],
        video_content: [],
        current_affairs_sources: [],
        revision_materials: [],
        expert_recommendations: []
      };
    }

    const block: Block = {
      block_id: `${blockPrefix}-${subject.subjectCode}`,
      block_title: `${subject.subjectName}`,
      cycle_type: cycleType,
      cycle_order: cycleOrder,
      cycle_name: cycleName,
      subjects: [subject.subjectCode],
      duration_weeks: blockDurationWeeks,
      weekly_plan: await createEnhancedWeeklyPlan(blockDurationWeeks, cycleType, subject.subjectCode, calculateTopicHours(subject, allocatedHours, confidenceMap.get(subject.subjectCode) || 1.0), intake),
      block_resources: blockResources,
      block_start_date: blockStartDate,
      block_end_date: blockEndDate,
      block_description: `${blockPrefix} block for ${subject.subjectName}`,
      estimated_hours: allocatedHours,
      actual_hours: actualHours
    };

    // Only add block if it's not null (wasn't skipped)
    if (block) {
      blocks.push(block);
    }

  }

  const cycleStart = dayjs(cycleStartDate);
  const cycleEnd = dayjs(cycleEndDate);
  const rescheduledBlocks = rescheduleOutofBoundsBlocks(cycleStart, cycleEnd, blocks);
  if (rescheduledBlocks.length > 0) {
    // console.log(`❌ cycle type: ${cycleType} # rescheduledBlocks: ${rescheduledBlocks.length}`);
    // throw new Error(`Excess blocks were not able to be rescheduled: ${rescheduledBlocks.map((block) => block.block_title).join(', ')}`);
  }
  return rescheduledBlocks
    .filter(block => !isBlockOutOfBounds(cycleStart, cycleEnd)(block)) // Keep blocks that are NOT out of bounds
    .filter(block => block && block.actual_hours && block.actual_hours > 0)
    // sort by block_start_date
    .sort((a, b) => dayjs(a.block_start_date).diff(dayjs(b.block_start_date)));
    ;
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

const rescheduleOutofBoundsBlocks = (cycleStart: dayjs.Dayjs, cycleEnd: dayjs.Dayjs, _blocks: Block[]): Block[] => {
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
      
      // const afterStart = dayjs(block.block_start_date).format('YYYY-MM-DD');
      // const afterEnd = dayjs(block.block_end_date).format('YYYY-MM-DD');
      
      // console.log(`Block ${block.block_title} moved from ${beforeStart} - ${beforeEnd} to ${afterStart} - ${afterEnd}`);
      
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
  
  topicsWithBaseline.forEach(({topic, weightedHours}) => {
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
  // Create config from cycle type ratios
  const config = createConfigFromCycleType(cycleType, intake);
  
  // Convert topic hours to subject format for OneWeekPlan.ts
  const subject = SubjectLoader.getSubjectByCode(subjectCode);
  if (!subject) {
    console.warn(`Subject ${subjectCode} not found, falling back to basic plan`);
    return createBasicWeeklyPlan(durationWeeks, subjectCode);
  }
  
  // Create mock student intake for OneWeekPlan.ts
  const mockStudentIntake = createStudentIntake({
    subject_confidence: { [subjectCode]: 'Moderate' as const },
    study_strategy: {
      study_focus_combo: 'GSPlusOptionalPlusCSAT' as const,
      weekly_study_hours: '50',
      time_distribution: 'Balanced',
      study_approach: 'Balanced' as const,
      revision_strategy: 'Weekly',
      test_frequency: 'Weekly',
      seasonal_windows: ['Foundation', 'Revision', 'Intensive'],
      catch_up_day_preference: 'Saturday'
    },
    start_date: new Date().toISOString().split('T')[0]
  });
  
  // Create mock archetype with cycle type information
  const mockArchetype = {
    archetype: cycleType, // Pass the actual cycle type (e.g., 'C1')
    timeCommitment: 'FullTime' as const,
    weeklyHoursMin: 40,
    weeklyHoursMax: 60,
    description: `${cycleType} study approach`,
    defaultPacing: 'Balanced' as const,
    defaultApproach: 'SingleSubject' as const
  };
  
  // Create logger
  const logger = makeLogger([]);
  
  // Generate weeks using OneWeekPlan.ts
  const weeklyPlans: WeeklyPlan[] = [];
  for (let week = 1; week <= durationWeeks; week++) {
    try {
      const weekPlan = await createPlanForOneWeek(
        0, // blockIndex
        [subject],
        mockStudentIntake,
        mockArchetype,
        config,
        week,
        durationWeeks,
        logger
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
}

/**
 * Create config from cycle type with appropriate task ratios
 */
function createConfigFromCycleType(cycleType: CycleType, intake: StudentIntake): Config {
  
  const ratio = intake.getTaskTypeRatios(cycleType);
  
  return {
    daily_hour_limits: {
      regular_day: intake.getDailyStudyHours(),
      catch_up_day: 0, // Catchup day should be empty - for student to catch up on missed work
      test_day: Math.max(6, Math.floor(intake.getDailyStudyHours() * 0.75)) // 75% of daily hours for test days
    },
    task_effort_split: ratio
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
          title2: `${subjectCode} - Study Session`,
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

// Legacy function removed - using createEnhancedWeeklyPlan instead

// Legacy function removed - using OneWeekPlan.ts for task generation

/**
 * Create blocks with continuous parallel execution
 * Always maintains the specified number of active parallel subjects
 */
async function createContinuousParallelBlocks(
  subjects: Subject[],
  numberOfParallelSubjects: number,
  totalHours: number,
  confidenceMap: Map<string, number>,
  blockPrefix: string,
  cycleType: CycleType,
  cycleOrder: number,
  cycleName: string,
  cycleStartDate: string,
  cycleEndDate: string,
  intake: StudentIntake,
  subjData?: any
): Promise<Block[]> {
  
  console.log(`Creating ${numberOfParallelSubjects} parallel subject blocks for ${subjects.length} subjects`);
  
  const parallelBlocks: Block[] = [];
  const activeBlockEndDates: Array<{endDate: dayjs.Dayjs, subject: Subject}> = [];
  
  // Initialize with first N blocks (all start on same date)
  const initialBlocks = subjects.slice(0, numberOfParallelSubjects);
  const cycleStart = dayjs(cycleStartDate);
  
  // Calculate total weighted baseline hours for parallel allocation too
  const totalWeightedBaseline = subjects.reduce((sum, subject) => {
    const confidenceMultiplier = confidenceMap.get(subject.subjectCode) || 1.0;
    return sum + (subject.baselineHours * confidenceMultiplier);
  }, 0);
  
  for (let i = 0; i < initialBlocks.length; i++) {
    const subject = initialBlocks[i];
    const confidenceMultiplier = confidenceMap.get(subject.subjectCode) || 1.0;
    const weightedBaseline = subject.baselineHours * confidenceMultiplier;
    const allocatedHours = Math.max(4, Math.floor(
      (totalHours * weightedBaseline) / totalWeightedBaseline
    ));
    
    // Create single subject block using existing logic
    const block = await createSingleSubjectBlock(
      subject,
      cycleStartDate,
      allocatedHours,
      confidenceMap,
      subjData,
      blockPrefix,
      cycleType,
      cycleOrder,
      cycleName,
      cycleEndDate,
      intake
    );
    
    parallelBlocks.push(block);
    activeBlockEndDates.push({
      endDate: dayjs(block.block_end_date!),
      subject
    });
  }
  
  // Schedule remaining subjects: as soon as ANY block ends, start the next one
  const remainingSubjects = subjects.slice(numberOfParallelSubjects);
  for (const subject of remainingSubjects) {
    // Find the earliest ending block
    const earliestEnding = activeBlockEndDates.reduce((earliest, current) => 
      current.endDate.isBefore(earliest.endDate) ? current : earliest
    );
    
    const confidenceMultiplier = confidenceMap.get(subject.subjectCode) || 1.0;
    const weightedBaseline = subject.baselineHours * confidenceMultiplier;
    const allocatedHours = Math.max(4, Math.floor(
      (totalHours * weightedBaseline) / totalWeightedBaseline
    ));
    
    // Create block starting when earliest block ends
    const nextStartDate = earliestEnding.endDate.add(1, 'day').format('YYYY-MM-DD');
    const block = await createSingleSubjectBlock(
      subject,
      nextStartDate,
      allocatedHours,
      confidenceMap,
      subjData,
      blockPrefix,
      cycleType,
      cycleOrder,
      cycleName,
      cycleEndDate,
      intake
    );
    
    parallelBlocks.push(block);
    
    // Update the active blocks list: replace ending block with new one
    const endDateIndex = activeBlockEndDates.indexOf(earliestEnding);
    activeBlockEndDates[endDateIndex] = {
      endDate: dayjs(block.block_end_date!),
      subject
    };
  }
  
  // Apply same rescheduling logic as sequential version
  const cycleEnd = dayjs(cycleEndDate);
  const rescheduledBlocks = rescheduleOutofBoundsBlocks(cycleStart, cycleEnd, parallelBlocks);
  
  return rescheduledBlocks
    .filter(block => !isBlockOutOfBounds(cycleStart, cycleEnd)(block))
    .filter(block => block && block.actual_hours && block.actual_hours > 0)
    .sort((a, b) => dayjs(a.block_start_date).diff(dayjs(b.block_start_date)));
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
  intake: StudentIntake
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

  // Get resources (lines 118-132)
  let blockResources;
  try {
    if (cycleType === 'C1') {
      // For C1 cycles, use NCERT materials
      blockResources = await ResourceService.suggestResourcesForBlock(
        [subject.subjectCode], 
        cycleType,
        blockDurationWeeks
      );
    } else {
      // For other cycles, use regular resources
      blockResources = await ResourceService.getResourcesForSubject(subject.subjectCode);
    }
  } catch (error) {
    console.warn(`Failed to load resources for subject ${subject.subjectCode}:`, error);
    blockResources = {
      primary_books: [],
      supplementary_materials: [],
      practice_resources: [],
      video_content: [],
      current_affairs_sources: [],
      revision_materials: [],
      expert_recommendations: []
    };
  }

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
