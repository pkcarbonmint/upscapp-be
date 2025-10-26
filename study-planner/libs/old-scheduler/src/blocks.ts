import dayjs from 'dayjs';
import {
  BlockSchedule,
  CycleSchedule,
  CycleType,
  Subject,
  StudyApproach,
  SchedulingInput,
  SchedulingResult,
  ScheduledSubject,
  SchedulingConflict,
  ConfidenceMap,
  Subtopic,
  AdjustedSubtopic,
  PrioritizedItem,
  bandOrder,
  GSOptionalRatio,
  DailyHourLimitsInput,
  DayPreferences,
  WeeklySubjectAllocations,
  TaskEffortSplit,
  DetermineBlockScheduleResult
} from "./types";


const MAX_STRETCH_FACTOR = 2.0; // Don't stretch more than 2x
const MIN_STRETCH_FACTOR = 0.5;  // Don't compress more than 50%

// return a set of block schedules for a given cycle schedule

export function determineBlockSchedule(
  cycleSchedule: CycleSchedule,
  subjects: Subject[],
  confidenceMap: ConfidenceMap,
  capacityHours: number|undefined, // calculate based on dates and working hours per day if not provided
  studyApproach: StudyApproach,
  workingHoursPerDay: number = 8,
  gsOptionalRatio?: GSOptionalRatio,
  dailyHourLimits?: DailyHourLimitsInput,
  dayPreferences?: DayPreferences,
  taskEffortSplit?: TaskEffortSplit,
  _weeklyStudyHours?: number
): DetermineBlockScheduleResult {
  // If no weekly allocation parameters provided, reject
  if (!dailyHourLimits || !dayPreferences) {
    throw new Error('dailyHourLimits and dayPreferences are required');
  }
  const cycleStart = dayjs(cycleSchedule.startDate);
  const cycleEnd = dayjs(cycleSchedule.endDate);
  const requiredCapacityHours = capacityHours || cycleEnd.diff(cycleStart, 'day') * workingHoursPerDay;
  // Create scheduling input
  const input: SchedulingInput = {
    subjects,
    config: {
      studyApproach,
      cycleType: cycleSchedule.cycleType,
      maxParallelSubjects: getParallelCapacity(studyApproach),
      allowOverlap: false
    },
    timeWindow: { start: cycleStart, end: cycleEnd },
    totalAvailableHours: requiredCapacityHours,
    workingHoursPerDay,
    gsOptionalRatio // Pass the GS:Optional ratio to the scheduler
  };

  // Use GS:Optional ratio allocations if provided, otherwise fall back to trimSubjectsToFit
  let trimmedSubjects: Subject[];
  if (gsOptionalRatio) {
    // Calculate subject allocations respecting GS:Optional ratio
    const subjectAllocations = calculateSubjectAllocations(
      subjects,
      requiredCapacityHours,
      confidenceMap,
      cycleSchedule.cycleType,
      gsOptionalRatio
    );

    // Filter subjects based on allocations
    trimmedSubjects = subjects.filter(subject => {
      const allocatedHours = subjectAllocations.get(subject.subjectCode) || 0;
      return allocatedHours > 0;
    });
  } else {
    // Fall back to original logic
    trimmedSubjects = trimSubjectsToFit(subjects, requiredCapacityHours, confidenceMap, cycleSchedule.cycleType);
  }

  console.log(`Debug: Cycle ${cycleSchedule.cycleType}, subjects: ${subjects.length} -> trimmed: ${trimmedSubjects.length}`);
  console.log(`Debug: Required capacity hours: ${requiredCapacityHours}, cycle duration: ${cycleEnd.diff(cycleStart, 'day')} days`);

  // Update input with trimmed subjects
  const trimmedInput = { ...input, subjects: trimmedSubjects };

  // Schedule subjects based on approach (sequential is just parallel with 1 subject)
  const result = scheduleParallel(trimmedInput, confidenceMap);

  // Convert to BlockSchedule format
  const blockSchedules: BlockSchedule[] = result.scheduledSubjects.map(scheduled => ({
    subjectCode: scheduled.subject.subjectCode,
    startDate: scheduled.startDate.format('YYYY-MM-DD'),
    endDate: scheduled.endDate.format('YYYY-MM-DD'),
    allocatedHours: scheduled.allocatedHours
  }));

  // Build weekly subject allocations across calendar weeks
  const weeklySubjectAllocations: WeeklySubjectAllocations = {};
  const weekStart = (d: dayjs.Dayjs) => d.startOf('week'); // Sunday as week start

  // Helper to split task effort (use provided split or default)
  const defaultSplit = { study: 0.6, practice: 0.2, revision: 0.15, test: 0.05 };
  const split = taskEffortSplit || defaultSplit;

  // weeklyStudyHours currently not used directly; allocations are bounded by day capacities and remaining subject hours

  for (const scheduled of result.scheduledSubjects) {
    let cursor = scheduled.startDate.startOf('day');
    const end = scheduled.endDate.startOf('day');
    let remainingHours = scheduled.allocatedHours; // subject-level remaining hours to place across days
    while (cursor.isBefore(end) || cursor.isSame(end, 'day')) {
      const wkStart = weekStart(cursor);
      const weekKey = wkStart.format('YYYY-MM-DD');
      const dayNum = cursor.day(); // 0..6

      const testDayNum = {
        Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6
      } as any;
      const isTestDay = dayNum === testDayNum[dayPreferences.testDay as any];
      const dayCapacity = isTestDay ? dailyHourLimits.test_day : dailyHourLimits.regular_day;

      const sliceHours = Math.min(dayCapacity, Math.max(0, remainingHours)); // cap by day capacity and remaining subject hours
      if (sliceHours > 0) {
        weeklySubjectAllocations[weekKey] ||= {};
        const subjKey = scheduled.subject.subjectCode;
        weeklySubjectAllocations[weekKey][subjKey] ||= {
          totalHours: 0,
          byTaskType: { study: 0, practice: 0, revision: 0, test: 0 },
          byDay: {},
          sourceBlocks: []
        };
        const alloc = weeklySubjectAllocations[weekKey][subjKey];
        alloc.totalHours += sliceHours;
        alloc.byTaskType.study += sliceHours * split.study;
        alloc.byTaskType.practice += sliceHours * split.practice;
        alloc.byTaskType.revision += sliceHours * split.revision;
        alloc.byTaskType.test += sliceHours * split.test;
        alloc.byDay[dayNum] ||= { hours: 0, byTaskType: { study: 0, practice: 0, revision: 0, test: 0 } };
        alloc.byDay[dayNum].hours += sliceHours;
        alloc.byDay[dayNum].byTaskType.study += sliceHours * split.study;
        alloc.byDay[dayNum].byTaskType.practice += sliceHours * split.practice;
        alloc.byDay[dayNum].byTaskType.revision += sliceHours * split.revision;
        alloc.byDay[dayNum].byTaskType.test += sliceHours * split.test;
        if (!alloc.sourceBlocks.includes(scheduled.subject.subjectCode)) {
          alloc.sourceBlocks.push(scheduled.subject.subjectCode);
        }
      }

      cursor = cursor.add(1, 'day');
      remainingHours -= sliceHours;
    }
  }

  return { blockSchedules, weeklySubjectAllocations };
}


/**
 * Calculate weighted baseline for a subject
 */
function calculateWeightedBaseline(
  subject: Subject,
  confidenceMap: ConfidenceMap,
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
  confidenceMap: ConfidenceMap,
  cycleType: CycleType
): number {
  return subjects.reduce((sum, subject) =>
    sum + calculateWeightedBaseline(subject, confidenceMap, cycleType), 0);
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

/**
 * Get parallel capacity based on study approach
 */
function getParallelCapacity(studyApproach: StudyApproach): number {
  return studyApproach === 'DualSubject' ? 2 : studyApproach === 'TripleSubject' ? 3 : 1;
}


/**
 * Parallel scheduling - maintains specified number of parallel subjects
 * Also handles sequential scheduling when maxParallelSubjects = 1
 */
function scheduleParallel(input: SchedulingInput, confidenceMap: ConfidenceMap): SchedulingResult {
  const { subjects, config, timeWindow, totalAvailableHours, workingHoursPerDay, gsOptionalRatio } = input;
  const { cycleType, maxParallelSubjects } = config;
  const { start, end } = timeWindow;

  const subjectAllocations = calculateSubjectAllocations(subjects, totalAvailableHours, confidenceMap, cycleType, gsOptionalRatio);

  // For extreme short cycles, adjust allocations to fit within cycle duration
  const isExtremeShortCycle = [CycleType.C5, CycleType.C5B, CycleType.C8].includes(cycleType);
  if (isExtremeShortCycle) {
    const cycleDurationDays = end.diff(start, 'day');
    const maxHoursPerSubject = Math.floor((cycleDurationDays * workingHoursPerDay) / subjects.length);

    console.log(`Debug allocation adjustment: cycleDurationDays=${cycleDurationDays}, maxHoursPerSubject=${maxHoursPerSubject}, subjects.length=${subjects.length}`);

    // Adjust allocations to fit within cycle duration
    subjects.forEach(subject => {
      const currentAllocation = getHoursForSubject(subjectAllocations, subject.subjectCode);
      const adjustedAllocation = Math.min(currentAllocation, maxHoursPerSubject);
      subjectAllocations.set(subject.subjectCode, Math.max(1, adjustedAllocation));
      console.log(`Debug ${subject.subjectCode}: ${currentAllocation} -> ${adjustedAllocation} hours`);
    });
  }

  // Always respect the parallel capacity limit, regardless of GS:Optional ratio
  // When GS:Optional ratio is provided, we still need to respect maxParallelSubjects
  const subjectsToScheduleInitially = subjects
    .filter(subject => (subjectAllocations.get(subject.subjectCode) || 0) > 0)
    .slice(0, maxParallelSubjects);

  // Handle remaining subjects sequentially
  const subjectsToScheduleSequentially = subjects
    .filter(subject => (subjectAllocations.get(subject.subjectCode) || 0) > 0)
    .slice(maxParallelSubjects);

  // Check if all subjects can fit in the cycle duration
  const cycleDurationDays = end.diff(start, 'day');
  const totalAllocatedHours = Array.from(subjectAllocations.values()).reduce((sum, hours) => sum + hours, 0);
  const totalAvailableHoursInCycle = cycleDurationDays * workingHoursPerDay;
  // stretch factor applies to all subjects
  const stretchFactor = totalAvailableHoursInCycle / totalAllocatedHours;
  console.log(`Calculating stretch factor: ${totalAvailableHoursInCycle} / ${totalAllocatedHours}`);
  console.log(`Debug: Stretch factor: ${stretchFactor.toFixed(2)}`);
  if (stretchFactor > MAX_STRETCH_FACTOR) {
    console.warn(`Warning: Stretch factor ${stretchFactor.toFixed(2)} exceeds maximum ${MAX_STRETCH_FACTOR}. Consider adding more subjects or reducing cycle duration.`);
    // Could add buffer subjects here instead
  }
  if (stretchFactor < MIN_STRETCH_FACTOR) {
    console.warn(`Warning: Stretch factor ${stretchFactor.toFixed(2)} below minimum ${MIN_STRETCH_FACTOR}. Cycle may be too short.`);
  }
  if (stretchFactor > 1.0) {
    // Stretch to fill cycle
    for (const [subjectCode, currentAllocation] of subjectAllocations.entries()) {
      const adjustedAllocation = Math.round(currentAllocation * stretchFactor);
      subjectAllocations.set(subjectCode, adjustedAllocation);
      console.log(`Debug: ${subjectCode} stretched from ${currentAllocation}h to ${adjustedAllocation}h`);
    }
  } else if (stretchFactor < 1.0) {
    // Scale down if cycle is too short
    for (const [subjectCode, currentAllocation] of subjectAllocations.entries()) {
      const adjustedAllocation = Math.max(4, Math.floor(currentAllocation * stretchFactor));
      subjectAllocations.set(subjectCode, adjustedAllocation);
      console.log(`Debug: ${subjectCode} scaled down from ${currentAllocation}h to ${adjustedAllocation}h`);
    }
  }

  // Validate that total allocated hours now matches available hours
  const finalTotalAllocatedHours = Array.from(subjectAllocations.values()).reduce((sum, hours) => sum + hours, 0);
  const finalRequiredDays = Math.ceil(finalTotalAllocatedHours / workingHoursPerDay);

  console.log(`Debug: Final validation - Allocated: ${finalTotalAllocatedHours}h, Required days: ${finalRequiredDays}, Available days: ${cycleDurationDays}`);
  console.log(`Debug: Stretch factor was: ${stretchFactor.toFixed(3)}`);

  // Assert that we now fit within the cycle
  if (finalRequiredDays > cycleDurationDays) {
    const excessDays = finalRequiredDays - cycleDurationDays;
    const excessHours = excessDays * workingHoursPerDay;
    
    console.warn(`Warning: After stretching, need ${finalRequiredDays} days but only have ${cycleDurationDays} days. Trimming last subject by ${excessDays} days (${excessHours}h).`);
    
    // Find the last subject and reduce its allocation
    const lastSubjectCode = Array.from(subjectAllocations.keys()).pop();
    if (lastSubjectCode) {
      const currentAllocation = subjectAllocations.get(lastSubjectCode) || 0;
      const adjustedAllocation = Math.max(4, currentAllocation - excessHours);
      subjectAllocations.set(lastSubjectCode, adjustedAllocation);
      console.log(`[Debug]: Last subject ${lastSubjectCode} trimmed from ${currentAllocation}h to ${adjustedAllocation}h`);
    }
  }
  const initialSchedules = subjectsToScheduleInitially.map(subject => {
    const allocatedHours = subjectAllocations.get(subject.subjectCode);
    if (!allocatedHours) {
      throw new Error(`Error: No allocated hours for subject ${subject.subjectCode}`);
    }
    
    // Calculate duration based on allocated hours
    const durationDays = Math.max(1, Math.ceil(allocatedHours / workingHoursPerDay));
  
    const endDate = start.add(durationDays - 1, 'day');
    const durationWeeks = Math.ceil(durationDays / 7);
    return createScheduledSubject(subject, start, endDate, durationWeeks, allocatedHours, config.studyApproach);
  });
  const validInitialSchedules = initialSchedules.filter(schedule => !schedule.endDate.isAfter(end));
  const invalidInitialSubjects = initialSchedules.filter(schedule => schedule.endDate.isAfter(end)).map(s => s.subject);
  const initialConflicts = invalidInitialSubjects.map(subject => createTimeConflict(subject.subjectCode, 'error'));
  const init = { 
    scheduledSubjects: validInitialSchedules,
    unscheduledSubjects: invalidInitialSubjects,
    conflicts: initialConflicts,
    activeSchedules: validInitialSchedules
  } as any;
  const allSchedules = subjectsToScheduleSequentially.reduce((acc, subject) => {
    const allocatedHours = getHoursForSubject(subjectAllocations, subject.subjectCode);
    const durationDays = Math.max(1, Math.ceil(allocatedHours / workingHoursPerDay));
    const durationWeeks = Math.ceil(durationDays / 7);

    // Handle case where activeSchedules is empty
    if (acc.activeSchedules.length === 0) {
      const startDate = start;
      const endDate = startDate.add(durationDays - 1, 'day');

      if (endDate.isAfter(end)) {
        return { ...acc, unscheduledSubjects: [...acc.unscheduledSubjects, subject], conflicts: [...acc.conflicts, createTimeConflict(subject.subjectCode, 'warning')] };
      }

      const scheduled = createScheduledSubject(subject, startDate, endDate, durationWeeks, allocatedHours, config.studyApproach);
      return { ...acc, scheduledSubjects: [...acc.scheduledSubjects, scheduled], activeSchedules: [scheduled] };
    }

    const earliestEnding = acc.activeSchedules.reduce((earliest: ScheduledSubject, current: ScheduledSubject) => current.endDate.isBefore(earliest.endDate) ? current : earliest);
    const startDate = earliestEnding.endDate.add(1, 'day');
    const endDate = startDate.add(durationDays - 1, 'day');

    // Ensure we don't exceed the cycle end date
    if (endDate.isAfter(end)) {
      // Try to fit the subject by reducing duration if possible
      const maxDurationDays = end.diff(startDate, 'day') + 1;
      if (maxDurationDays >= 7) { // Minimum 1 week
        const adjustedEndDate = startDate.add(maxDurationDays - 1, 'day');
        const scheduled = createScheduledSubject(subject, startDate, adjustedEndDate, Math.ceil(maxDurationDays / 7), allocatedHours, config.studyApproach);
        const updatedActiveSchedules = acc.activeSchedules.map((active: ScheduledSubject) => active === earliestEnding ? scheduled : active);
        return { ...acc, scheduledSubjects: [...acc.scheduledSubjects, scheduled], activeSchedules: updatedActiveSchedules };
      }
    }

    if (endDate.isAfter(end)) {
      return { ...acc, unscheduledSubjects: [...acc.unscheduledSubjects, subject], conflicts: [...acc.conflicts, createTimeConflict(subject.subjectCode, 'warning')] };
    }

    const actualDurationDays = endDate.diff(startDate, 'day') + 1;
    const scheduled = createScheduledSubject(subject, startDate, endDate, actualDurationDays, allocatedHours, config.studyApproach);
    const updatedActiveSchedules = acc.activeSchedules.map((active: ScheduledSubject) => active === earliestEnding ? scheduled : active);
    return { ...acc, scheduledSubjects: [...acc.scheduledSubjects, scheduled], activeSchedules: updatedActiveSchedules };
  }, init);

  // Cap all end dates at cycle end date
  const cappedSchedules = allSchedules.scheduledSubjects.map((schedule: any) => {
    const cappedEndDate = schedule.endDate.isAfter(end) ? end : schedule.endDate;
    console.log(`${end.format('YYYY-MM-DD')} vs ${schedule.endDate.format('YYYY-MM-DD')}`);
    if (schedule.endDate.isAfter(end)) {
      console.log(`Debug: Capped ${schedule.subject.subjectCode} end date from ${schedule.endDate.format('YYYY-MM-DD')} to ${cappedEndDate.format('YYYY-MM-DD')}`);
    } else {
      console.log(`Debug: ${schedule.subject.subjectCode} end date is at/before cycle end ${cappedEndDate.format('YYYY-MM-DD')}`);
    }

    return {
      ...schedule,
      endDate: cappedEndDate
    };
  });

  const lastBlockEndDate = cappedSchedules.reduce((latest: ScheduledSubject, current: ScheduledSubject) => current.endDate.isAfter(latest.endDate) ? current : latest).endDate;
  const cycleEndDate = dayjs(timeWindow.end);
  if (lastBlockEndDate.isAfter(cycleEndDate)) {
    throw new Error(`Error: Last block end date ${lastBlockEndDate.format('YYYY-MM-DD')} is after cycle end date ${cycleEndDate.format('YYYY-MM-DD')}`);
  } else if (lastBlockEndDate.isBefore(cycleEndDate)) {
    throw new Error(`Error: Last block end date ${lastBlockEndDate.format('YYYY-MM-DD')} is before cycle end date ${cycleEndDate.format('YYYY-MM-DD')}`);
  }

  return {
    scheduledSubjects: cappedSchedules,
    unscheduledSubjects: allSchedules.unscheduledSubjects,
    conflicts: allSchedules.conflicts
  };
}
function getHoursForSubject(subjectAllocations: Map<string, number>, subjectCode: string): number {
  const hours = subjectAllocations.get(subjectCode);
  if (!hours) {
    throw new Error(`Error: No allocated hours for subject ${subjectCode}`);
  }
  return hours;
}

/**
 * Create a scheduled subject object
 */
function createScheduledSubject(
  subject: Subject,
  startDate: any,
  endDate: any,
  durationDays: number,
  allocatedHours: number,
  studyApproach: StudyApproach
): ScheduledSubject {
  return { subject, startDate, endDate, durationDays, allocatedHours, studyApproach };
}

/**
 * Create a time conflict object
 */
function createTimeConflict(subjectCode: string, severity: 'error' | 'warning'): SchedulingConflict {
  return {
    type: 'insufficient_time',
    items: [subjectCode],
    description: `Not enough time remaining for ${subjectCode}`,
    severity
  };
}

/**
 * Trim subtopics to fit within allocated hours, starting from D5 down to B1
 */
export function trimSubtopicsToFit(subtopics: Subtopic[], allocatedHours: number): AdjustedSubtopic[] {
  const adjustedSubtopics = subtopics
    .map(subtopic => ({
      ...subtopic,
      adjustedHours: Math.ceil(subtopic.baselineHours)
    }))
    .sort((a, b) => bandOrder[a.band] - bandOrder[b.band]);

  // Keep all Band A subtopics
  const bandASubtopics = adjustedSubtopics.filter(st => st.band === 'A');
  const bandAHours = bandASubtopics.reduce((sum, st) => sum + st.adjustedHours, 0);

  // Add other bands in order until we hit the limit
  const otherSubtopics = adjustedSubtopics.filter(st => st.band !== 'A');
  const remainingHours = allocatedHours - bandAHours;

  const includedOtherSubtopics = otherSubtopics.reduce((acc, subtopic) => {
    const currentTotal = acc.reduce((sum, st) => sum + st.adjustedHours, 0);
    return currentTotal + subtopic.adjustedHours <= remainingHours
      ? [...acc, subtopic]
      : acc;
  }, [] as AdjustedSubtopic[]);

  return [...bandASubtopics, ...includedOtherSubtopics];
}

/**
 * Trim subjects to fit within available time based on priority
 * For extreme short cases, include only essential topics regardless of time constraints
 */
export function trimSubjectsToFit(
  subjects: Subject[],
  availableHours: number,
  confidenceMap: ConfidenceMap,
  cycleType: CycleType
): Subject[] {
  // Sort subjects by priority (higher priority first)
  const sortedSubjects = subjects.sort((a, b) => (b.priority || 0) - (a.priority || 0));

  // For extreme short cycles (C5, C5B, C8), include only essential topics
  const isExtremeShortCycle = [CycleType.C5, CycleType.C5B, CycleType.C8].includes(cycleType);

  if (isExtremeShortCycle) {
    // Include only highest priority subjects (priority >= 4) regardless of time
    return sortedSubjects.filter(subject => (subject.priority || 0) >= 4);
  }

  return sortedSubjects.reduce((acc, subject) => {
    const confidenceMultiplier = confidenceMap.get(subject.subjectCode) || 1.0;
    const baselineFactor = determineSubjBaselineFactorForCycle(cycleType);
    const weightedBaseline = subject.baselineHours * baselineFactor * confidenceMultiplier;
    const minHours = Math.max(1, Math.floor(weightedBaseline * 0.001)); // Extremely small minimum for very short cycles

    const currentTotal = acc.reduce((sum, subj) => {
      const subjConfidence = confidenceMap.get(subj.subjectCode) || 1.0;
      const subjBaselineFactor = determineSubjBaselineFactorForCycle(cycleType);
      const subjWeightedBaseline = subj.baselineHours * subjBaselineFactor * subjConfidence;
      return sum + Math.max(1, Math.floor(subjWeightedBaseline * 0.001));
    }, 0);

    return currentTotal + minHours <= availableHours ? [...acc, subject] : acc;
  }, [] as Subject[]);
}

/**
 * Calculate actual hours after trimming
 */
export function calculateActualHours(
  items: PrioritizedItem[]
): number {
  return items.reduce((sum, item) => sum + item.adjustedHours, 0);
}

/**
 * Get default GS:Optional ratio based on cycle type
 */
export function getDefaultGSOptionalRatio(cycleType: CycleType): GSOptionalRatio {
  switch (cycleType) {
    case CycleType.C4:
    case CycleType.C5:
    case CycleType.C5B:
      // Prelims cycles: GS only (no optional)
      return { gs: 1.0, optional: 0.0 };
    case CycleType.C1:
    case CycleType.C2:
    case CycleType.C3:
    case CycleType.C6:
    case CycleType.C7:
      // Foundation and Mains cycles: balanced approach
      return { gs: 0.67, optional: 0.33 };
    case CycleType.C8:
      // Mains Foundation: more GS focus
      return { gs: 0.8, optional: 0.2 };
    default:
      return { gs: 0.67, optional: 0.33 };
  }
}

/**
 * Create optional subject from basic information
 * Since we don't have topic breakdown for optional subjects, we create a simplified structure
 */
export function createOptionalSubject(
  subjectCode: string,
  subjectName: string,
  baselineHours: number,
  priority: number = 3
): Subject {
  return {
    subjectCode,
    baselineHours,
    priority,
    subjectType: 'Optional',
    isOptional: true,
    optionalSubjectName: subjectName
  };
}

/**
 * Validate GS:Optional ratio
 */
export function validateGSOptionalRatio(ratio: GSOptionalRatio): boolean {
  const total = ratio.gs + ratio.optional;
  return total <= 1.0 && ratio.gs >= 0 && ratio.optional >= 0;
}

/**
 * Calculate subject allocations based on proportional hours with GS:Optional ratio
 */
export function calculateSubjectAllocations(
  subjects: Subject[],
  totalHours: number,
  confidenceMap: ConfidenceMap,
  cycleType: CycleType,
  gsOptionalRatio?: GSOptionalRatio
): Map<string, number> {
  // If no GS:Optional ratio specified, use proportional allocation
  if (!gsOptionalRatio) {
    return calculateProportionalAllocations(subjects, totalHours, confidenceMap, cycleType);
  }

  // Separate GS and Optional subjects
  const gsSubjects = subjects.filter(s => s.subjectType === 'GS' || (!s.subjectType && !s.isOptional));
  const optionalSubjects = subjects.filter(s => s.subjectType === 'Optional' || s.isOptional);
  const otherSubjects = subjects.filter(s => s.subjectType === 'CSAT' || (!s.subjectType && !s.isOptional && !s.isOptional));

  // Calculate hours for each category
  const gsHours = Math.floor(totalHours * gsOptionalRatio.gs);
  const optionalHours = Math.floor(totalHours * gsOptionalRatio.optional);
  const otherHours = totalHours - gsHours - optionalHours;

  const allocations = new Map<string, number>();

  // Allocate GS subjects
  if (gsSubjects.length > 0) {
    const gsAllocations = calculateProportionalAllocations(gsSubjects, gsHours, confidenceMap, cycleType);
    gsAllocations.forEach((hours, code) => allocations.set(code, hours));
  }

  // Allocate Optional subjects
  if (optionalSubjects.length > 0) {
    const optionalAllocations = calculateProportionalAllocations(optionalSubjects, optionalHours, confidenceMap, cycleType);
    optionalAllocations.forEach((hours, code) => allocations.set(code, hours));
  }

  // Allocate other subjects (CSAT, etc.)
  if (otherSubjects.length > 0) {
    const otherAllocations = calculateProportionalAllocations(otherSubjects, otherHours, confidenceMap, cycleType);
    otherAllocations.forEach((hours, code) => allocations.set(code, hours));
  }

  return allocations;
}

/**
 * Calculate proportional allocations (original logic)
 */
function calculateProportionalAllocations(
  subjects: Subject[],
  totalHours: number,
  confidenceMap: ConfidenceMap,
  cycleType: CycleType
): Map<string, number> {
  const totalWeightedBaseline = calculateTotalWeightedBaseline(subjects, confidenceMap, cycleType);

  return subjects.reduce((map, subject) => {
    const weightedBaseline = calculateWeightedBaseline(subject, confidenceMap, cycleType);
    const allocatedHours = Math.max(4, Math.floor(
      (totalHours * weightedBaseline) / totalWeightedBaseline
    ));
    map.set(subject.subjectCode, allocatedHours);
    return map;
  }, new Map<string, number>());
}