import { Block, StudentIntake } from '../types/models';
import { CycleType, Logger } from '../types/Types';
import { Subject } from '../types/Subjects';
import { ResourceService } from '../services/ResourceService';
import dayjs from 'dayjs';
import {
  determineBlockSchedule,
  CycleType as SchedulerCycleType,
  trimSubtopicsToFit as schedulerTrimSubtopicsToFit,
  DayOfWeek
} from 'scheduler';
import type {
  Subject as SchedulerSubject,
  StudyApproach,
  ConfidenceMap as SchedulerConfidenceMap,
  CycleSchedule as SchedulerCycleSchedule,
  DetermineBlockScheduleResult,
  DailyHourLimitsInput,
  DayPreferences,
} from 'scheduler';
import { S2Task } from 'scheduler2';
import { mapFromS2Tasks } from './s2-mapper';

// Task ratios are now handled by intake.getTaskTypeRatios(cycleType)
const bandOrder: Record<string, number> = { 'A': 1, 'B': 2, 'C': 3, 'D': 4 };

/**
 * Check if a subject is optional
 */
export function isOptional(subject: Subject): boolean {
  return subject.subjectCode.startsWith('OPT-') || subject.subjectCode === 'OPT' || subject.category === 'Optional';
}

/**
 * Convert helios-ts Subject to scheduler library Subject
 */
function convertToSchedulerSubject(subject: Subject): SchedulerSubject {
  const subjectIsOptional = isOptional(subject);
  return {
    subjectCode: subject.subjectCode,
    baselineHours: subject.baselineHours,
    priority: 3, // Default priority
    subjectType: subjectIsOptional ? 'Optional' : 'GS',
    isOptional: subjectIsOptional,
    optionalSubjectName: subjectIsOptional ? subject.subjectName : undefined
  };
}

/**
 * Convert helios-ts CycleType to scheduler library CycleType
 */
export function convertToSchedulerCycleType(cycleType: CycleType): SchedulerCycleType {
  switch (cycleType) {
    case CycleType.C1: return SchedulerCycleType.C1;
    case CycleType.C2: return SchedulerCycleType.C2;
    case CycleType.C3: return SchedulerCycleType.C3;
    case CycleType.C4: return SchedulerCycleType.C4;
    case CycleType.C5: return SchedulerCycleType.C5;
    case CycleType.C5B: return SchedulerCycleType.C5B;
    case CycleType.C6: return SchedulerCycleType.C6;
    case CycleType.C7: return SchedulerCycleType.C7;
    case CycleType.C8: return SchedulerCycleType.C8;
    default: return SchedulerCycleType.C1;
  }
}

/**
 * Convert helios-ts subject approach to scheduler library StudyApproach
 */
export function convertToSchedulerStudyApproach(subjectApproach: string): StudyApproach {
  switch (subjectApproach) {
    case 'SingleSubject': return 'SingleSubject';
    case 'DualSubject': return 'DualSubject';
    case 'TripleSubject': return 'TripleSubject';
    default: return 'SingleSubject';
  }
}

/**
 * Convert helios-ts confidence map to scheduler library ConfidenceMap
 */
function convertToSchedulerConfidenceMap(confidenceMap: Map<string, number>): SchedulerConfidenceMap {
  return new Map(confidenceMap);
}

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
 * Helper function to safely read hours from text
 * Handles range formats like "45-55" by using the midpoint
 */
function safeReadHours(text: string): number {
  // Handle range format like "45-55"
  if (text.includes('-')) {
    const [min, max] = text.split('-').map(s => parseInt(s.trim(), 10));
    if (!isNaN(min) && !isNaN(max)) {
      return Math.round((min + max) / 2); // Use midpoint
    }
  }

  const parsed = parseInt(text, 10);
  return isNaN(parsed) ? 40 : parsed; // Default fallback
}

/**
 * Calculate allocated hours from weeklySubjectAllocations data
 */
function calculateAllocatedHoursFromWeeklyAllocations(
  subjectCode: string,
  startDate: string,
  endDate: string,
  weeklySubjectAllocations: any,
  subject: Subject,
  confidenceMap: Map<string, number>,
  cycleType: CycleType
): number {
  // Calculate the number of weeks in this block
  const start = dayjs(startDate);
  const end = dayjs(endDate);
  const weeksInBlock = Math.ceil(end.diff(start, 'week', true));

  let totalAllocatedHours = 0;

  // Sum up hours from all weeks in this block for this subject
  for (let weekOffset = 0; weekOffset < weeksInBlock; weekOffset++) {
    const weekStart = start.add(weekOffset, 'week').format('YYYY-MM-DD');
    const weekAllocations = weeklySubjectAllocations[weekStart];

    if (weekAllocations && weekAllocations[subjectCode]) {
      const subjectAllocation = weekAllocations[subjectCode];
      totalAllocatedHours += subjectAllocation.totalHours;
    }
  }

  // Fallback to original calculation if no weekly allocations found
  if (totalAllocatedHours === 0) {
    const confidenceMultiplier = confidenceMap.get(subjectCode) || 1.0;
    const baselineFactor = determineSubjBaselineFactorForCycle(cycleType);
    totalAllocatedHours = Math.floor(subject.baselineHours * baselineFactor * confidenceMultiplier);
  }

  return Math.max(1, totalAllocatedHours); // Ensure at least 1 hour
}

/**
 * Create blocks for subjects using the new scheduler library
 */
export async function createBlocksForSubjects(params: BlockCreationParams): Promise<Block[]> {
  const { intake, subjects, confidenceMap, cycleType, cycleStartDate, cycleEndDate, totalHours } = params;

  // Convert to scheduler library formats
  const schedulerSubjects = subjects.map(convertToSchedulerSubject);
  const schedulerConfidenceMap = convertToSchedulerConfidenceMap(confidenceMap);
  const schedulerCycleType = convertToSchedulerCycleType(cycleType);
  const studyApproach = convertToSchedulerStudyApproach(intake.subject_approach);

  // Get GS:Optional ratio from intake
  const gsOptionalRatio = intake.getGSOptionalRatio ? intake.getGSOptionalRatio() : { gs: 0.67, optional: 0.33 };

  // Create cycle schedule for the scheduler library
  const cycleSchedule: SchedulerCycleSchedule = {
    cycleType: schedulerCycleType,
    startDate: cycleStartDate,
    endDate: cycleEndDate,
    priority: 'mandatory'
  };

  // Use the scheduler library to determine block schedule with GS:Optional ratio
  const dailyHourLimits: DailyHourLimitsInput = {
    regular_day: intake.getDailyStudyHours(),
    test_day: intake.getDailyStudyHours() // Use same hours for test day
  };

  const dayPreferences: DayPreferences = {
    testDay: DayOfWeek.SUNDAY,
    catchupDay: (intake.study_strategy?.catch_up_day_preference as DayOfWeek) || DayOfWeek.SATURDAY
  };

  // Get task effort split and weekly study hours from intake
  const { study, revision, practice } = intake.getTaskEffortSplit(cycleType, intake);
  // Convert to scheduler's split shape (no gs_optional_ratio, add review=0)
  const schedulerTaskEffortSplit = { study, revision, practice, review: 0, test: 0 } as const;
  const weeklyStudyHours = safeReadHours(intake.study_strategy.weekly_study_hours);

  const result: DetermineBlockScheduleResult = determineBlockSchedule(
    cycleSchedule,
    schedulerSubjects,
    schedulerConfidenceMap,
    totalHours,
    studyApproach,
    intake.getDailyStudyHours(),
    gsOptionalRatio,
    dailyHourLimits,
    dayPreferences,
    schedulerTaskEffortSplit,
    weeklyStudyHours
  );
  const { blockSchedules, weeklySubjectAllocations } = result;

  // Map block schedules to actual blocks using weeklySubjectAllocations
  const blocks = await Promise.all(
    blockSchedules.map(async (schedule: { subjectCode: string; startDate: string; endDate: string }, index: number) => {
      const subject = subjects.find(s => s.subjectCode === schedule.subjectCode);
      if (!subject) {
        throw new Error(`Subject ${schedule.subjectCode} not found`);
      }

      // Use weeklySubjectAllocations to get precise hour allocation
      const allocatedHours = calculateAllocatedHoursFromWeeklyAllocations(
        schedule.subjectCode,
        schedule.startDate,
        schedule.endDate,
        weeklySubjectAllocations,
        subject,
        confidenceMap,
        cycleType
      );

      return await createBlockFromSchedule(
        schedule,
        subject,
        params,
        index,
        allocatedHours,
        weeklySubjectAllocations
      );
    })
  );

  return blocks.filter((block: Block) => block && block.actual_hours && block.actual_hours > 0);
}

/**
 * Create a block from a schedule item
 */
async function createBlockFromSchedule(
  schedule: { subjectCode: string; startDate: string; endDate: string },
  subject: Subject,
  params: BlockCreationParams,
  index: number,
  allocatedHours: number,
  _weeklySubjectAllocations: any
): Promise<Block> {
  const { confidenceMap, cycleType, cycleOrder, cycleName, subjData } = params;

  // Calculate duration in weeks
  const startDate = dayjs(schedule.startDate);
  const endDate = dayjs(schedule.endDate);
  const durationWeeks = Math.ceil(endDate.diff(startDate, 'day') / 7);

  // Use allocated hours from scheduler library (already calculated with GS:Optional ratio)
  const calculatedHours = allocatedHours;

  // Process subject subtopics and calculate actual hours
  const { adjustedSubtopics } = processSubjectSubtopics(
    subject, subjData, confidenceMap, cycleType, calculatedHours, calculatedHours
  );

  const trimmedSubtopics = schedulerTrimSubtopicsToFit(adjustedSubtopics, calculatedHours);
  const actualHours = trimmedSubtopics.length > 0
    ? trimmedSubtopics.reduce((sum, st) => sum + st.adjustedHours, 0)
    : calculatedHours;

  // Get resources for this subject
  const blockResources = await getBlockResources(subject.subjectCode, cycleType, durationWeeks);
  // TODO: Implement task planning with scheduler2
  // const s2WeeklyPlan: S2Task[] = planSubjectTasks(
  //   dayjs(schedule.startDate),
  //   dayjs(schedule.endDate),
  //   mapToS2Subject(subject),
  //   await mapToS2Constraints(intake, cycleType));
  
  const s2WeeklyPlan: S2Task[] = []; // Placeholder until planSubjectTasks is available

  // Create block object
  const block: Block = {
    block_id: `${cycleName.replace(/\s+Cycle$/, '')}-${subject.subjectCode}-${index}`,
    block_title: `${subject.subjectName}`,
    cycle_type: cycleType,
    cycle_order: cycleOrder,
    cycle_name: cycleName,
    subjects: [subject.subjectCode],
    duration_weeks: durationWeeks,
    weekly_plan: mapFromS2Tasks(s2WeeklyPlan),
    block_resources: blockResources,
    block_start_date: schedule.startDate,
    block_end_date: schedule.endDate,
    block_description: `${cycleName} block for ${subject.subjectName}`,
    estimated_hours: calculatedHours,
    actual_hours: actualHours
  };

  return block;
}

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

/**
 * Create enhanced weekly plan using OneWeekPlan.ts for better task variety
 * @param durationWeeks Duration in weeks
 * @param cycleType Type of cycle (Foundation, Revision, etc.)
 * @param subjectCode Subject code (e.g., H01)
 * @param topicHoursMap Map of topicCode -> allocated hours
 * @returns WeeklyPlan array with diverse task types
 */

/**
 * Create config from cycle type with appropriate task ratios
 */

/**
 * Fallback basic weekly plan creation
 */

