import { Block, WeeklyPlan, DailyPlan, StudentIntake } from '../types/models';
import { CycleType, Logger } from '../types/Types';
import { Subject, getTopicEstimatedHours } from '../types/Subjects';
import { ResourceService } from '../services/ResourceService';
import { SubjectLoader } from '../services/SubjectLoader';
import { createPlanForOneWeek } from './OneWeekPlan';
import { makeLogger } from '../services/Log';
import { selectBestArchetype } from '../services/ArchetypeSelector';
import dayjs from 'dayjs';
import { Config } from './engine-types';
import { 
  determineBlockSchedule,
  CycleType as SchedulerCycleType, 
  trimSubtopicsToFit as schedulerTrimSubtopicsToFit
} from 'scheduler';
import type { 
  Subject as SchedulerSubject,
  StudyApproach,
  ConfidenceMap as SchedulerConfidenceMap,
  CycleSchedule as SchedulerCycleSchedule
} from 'scheduler';

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
function convertToSchedulerCycleType(cycleType: CycleType): SchedulerCycleType {
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
function convertToSchedulerStudyApproach(subjectApproach: string): StudyApproach {
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
  const blockSchedules = determineBlockSchedule(
    cycleSchedule,
    schedulerSubjects,
    schedulerConfidenceMap,
    totalHours,
    studyApproach,
    intake.getDailyStudyHours(),
    gsOptionalRatio
  );
  
  // Map block schedules to actual blocks
  const blocks = await Promise.all(
    blockSchedules.map(async (schedule: { subjectCode: string; startDate: string; endDate: string }, index: number) => {
      const subject = subjects.find(s => s.subjectCode === schedule.subjectCode);
      if (!subject) {
        throw new Error(`Subject ${schedule.subjectCode} not found`);
      }
      
      // Calculate allocated hours based on baseline hours and confidence
      const confidenceMultiplier = confidenceMap.get(schedule.subjectCode) || 1.0;
      const baselineFactor = determineSubjBaselineFactorForCycle(cycleType);
      const allocatedHours = Math.floor(subject.baselineHours * baselineFactor * confidenceMultiplier);
      
      return await createBlockFromSchedule(schedule, subject, params, index, allocatedHours);
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
  allocatedHours: number
): Promise<Block> {
  const { intake, confidenceMap, cycleType, cycleOrder, cycleName, subjData } = params;
  
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
  
  // Create block object
    const block: Block = {
    block_id: `${cycleName.replace(/\s+Cycle$/, '')}-${subject.subjectCode}-${index}`,
      block_title: `${subject.subjectName}`,
      cycle_type: cycleType,
      cycle_order: cycleOrder,
      cycle_name: cycleName,
      subjects: [subject.subjectCode],
    duration_weeks: durationWeeks,
    weekly_plan: await createEnhancedWeeklyPlan(durationWeeks, cycleType, subject.subjectCode, calculateTopicHours(subject, calculatedHours, confidenceMap.get(subject.subjectCode) || 1.0), intake),
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

