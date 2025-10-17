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
  PrioritizedItem,
  bandOrder
} from "./types";

// return a set of block schedules for a given cycle schedule
export function determineBlockSchedule(
  cycleSchedule: CycleSchedule,
  subjects: Subject[],
  confidenceMap: ConfidenceMap,
  totalHours: number,
  studyApproach: StudyApproach,
  workingHoursPerDay: number = 8
): BlockSchedule[] {
  const cycleStart = dayjs(cycleSchedule.startDate);
  const cycleEnd = dayjs(cycleSchedule.endDate);
  
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
    totalAvailableHours: totalHours,
    workingHoursPerDay
  };
  
  // Trim subjects to fit available time if needed
  const totalAvailableHours = totalHours;
  const trimmedSubjects = trimSubjectsToFit(subjects, totalAvailableHours, confidenceMap, cycleSchedule.cycleType);
  
  console.log(`Debug: Cycle ${cycleSchedule.cycleType}, subjects: ${subjects.length} -> trimmed: ${trimmedSubjects.length}`);
  console.log(`Debug: Available hours: ${totalAvailableHours}, cycle duration: ${cycleEnd.diff(cycleStart, 'day')} days`);
  
  // Update input with trimmed subjects
  const trimmedInput = { ...input, subjects: trimmedSubjects };
  
  // Schedule subjects based on approach (sequential is just parallel with 1 subject)
  const result = scheduleParallel(trimmedInput, confidenceMap);
  
  // Convert to BlockSchedule format
  return result.scheduledSubjects.map(scheduled => ({
    subjectCode: scheduled.subject.subjectCode,
    startDate: scheduled.startDate.format('YYYY-MM-DD'),
    endDate: scheduled.endDate.format('YYYY-MM-DD')
  }));
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
  const { subjects, config, timeWindow, totalAvailableHours, workingHoursPerDay } = input;
  const { cycleType, maxParallelSubjects } = config;
  const { start, end } = timeWindow;
  
  const subjectAllocations = calculateSubjectAllocations(subjects, totalAvailableHours, confidenceMap, cycleType);
  
  // For extreme short cycles, adjust allocations to fit within cycle duration
  const isExtremeShortCycle = [CycleType.C5, CycleType.C5B, CycleType.C8].includes(cycleType);
  if (isExtremeShortCycle) {
    const cycleDurationDays = end.diff(start, 'day');
    const maxHoursPerSubject = Math.floor((cycleDurationDays * workingHoursPerDay) / subjects.length);
    
    console.log(`Debug allocation adjustment: cycleDurationDays=${cycleDurationDays}, maxHoursPerSubject=${maxHoursPerSubject}, subjects.length=${subjects.length}`);
    
    // Adjust allocations to fit within cycle duration
    subjects.forEach(subject => {
      const currentAllocation = subjectAllocations.get(subject.subjectCode) || 4;
      const adjustedAllocation = Math.min(currentAllocation, maxHoursPerSubject);
      subjectAllocations.set(subject.subjectCode, Math.max(1, adjustedAllocation));
      console.log(`Debug ${subject.subjectCode}: ${currentAllocation} -> ${adjustedAllocation} hours`);
    });
  }
  
  const initialSchedules = subjects.slice(0, maxParallelSubjects).map(subject => {
    const allocatedHours = subjectAllocations.get(subject.subjectCode) || 4;
    
    // For extreme short cycles, calculate duration more conservatively
    let durationWeeks: number;
    if (isExtremeShortCycle) {
      const cycleDurationDays = end.diff(start, 'day');
      const maxDurationDays = Math.floor(cycleDurationDays * 0.9); // Use 90% of cycle duration
      durationWeeks = Math.max(1, Math.floor(maxDurationDays / 7));
    } else {
      durationWeeks = Math.ceil(allocatedHours / (workingHoursPerDay * 7));
    }
    
    const endDate = start.add(durationWeeks * 7 - 1, 'day');
    return createScheduledSubject(subject, start, endDate, durationWeeks, allocatedHours, config.studyApproach);
  });
  
  const validInitialSchedules = initialSchedules.filter(schedule => !schedule.endDate.isAfter(end));
  const invalidInitialSubjects = initialSchedules.filter(schedule => schedule.endDate.isAfter(end)).map(s => s.subject);
  const initialConflicts = invalidInitialSubjects.map(subject => createTimeConflict(subject.subjectCode, 'error'));
  
  console.log(`Debug scheduleParallel: ${subjects.length} subjects, ${validInitialSchedules.length} valid initial schedules, ${invalidInitialSubjects.length} invalid initial subjects`);
  
  const allSchedules = subjects.slice(maxParallelSubjects).reduce((acc, subject) => {
    const allocatedHours = subjectAllocations.get(subject.subjectCode) || 4;
    const durationWeeks = Math.ceil(allocatedHours / (workingHoursPerDay * 7));
    const earliestEnding = acc.activeSchedules.reduce((earliest: ScheduledSubject, current: ScheduledSubject) => current.endDate.isBefore(earliest.endDate) ? current : earliest);
    const startDate = earliestEnding.endDate.add(1, 'day');
    const endDate = startDate.add(durationWeeks * 7 - 1, 'day');
    
    if (endDate.isAfter(end)) {
      return { ...acc, unscheduledSubjects: [...acc.unscheduledSubjects, subject], conflicts: [...acc.conflicts, createTimeConflict(subject.subjectCode, 'warning')] };
    }
    
    const scheduled = createScheduledSubject(subject, startDate, endDate, durationWeeks, allocatedHours, config.studyApproach);
    const updatedActiveSchedules = acc.activeSchedules.map((active: ScheduledSubject) => active === earliestEnding ? scheduled : active);
    return { ...acc, scheduledSubjects: [...acc.scheduledSubjects, scheduled], activeSchedules: updatedActiveSchedules };
  }, { scheduledSubjects: validInitialSchedules, unscheduledSubjects: invalidInitialSubjects, conflicts: initialConflicts, activeSchedules: validInitialSchedules } as any);
  
  return { scheduledSubjects: allSchedules.scheduledSubjects, unscheduledSubjects: allSchedules.unscheduledSubjects, conflicts: allSchedules.conflicts };
}

/**
 * Create a scheduled subject object
 */
function createScheduledSubject(
  subject: Subject,
  startDate: any,
  endDate: any,
  durationWeeks: number,
  allocatedHours: number,
  studyApproach: StudyApproach
): ScheduledSubject {
  return { subject, startDate, endDate, durationWeeks, allocatedHours, studyApproach };
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
export function trimSubtopicsToFit(subtopics: Subtopic[], allocatedHours: number): Subtopic[] {
  const adjustedSubtopics = subtopics
    .map(subtopic => ({
      ...subtopic,
      adjustedHours: Math.ceil(subtopic.baselineHours)
    }))
    .sort((a, b) => bandOrder[a.band] - bandOrder[b.band]);
  
  // Keep all Band A subtopics
  const bandASubtopics = adjustedSubtopics.filter(st => st.band === 'A');
  const bandAHours = bandASubtopics.reduce((sum, st) => sum + (st as any).adjustedHours, 0);
  
  // Add other bands in order until we hit the limit
  const otherSubtopics = adjustedSubtopics.filter(st => st.band !== 'A');
  const remainingHours = allocatedHours - bandAHours;
  
  const includedOtherSubtopics = otherSubtopics.reduce((acc, subtopic) => {
    const currentTotal = acc.reduce((sum, st) => sum + (st as any).adjustedHours, 0);
    return currentTotal + (subtopic as any).adjustedHours <= remainingHours 
      ? [...acc, subtopic] 
      : acc;
  }, [] as Subtopic[]);
  
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
 * Calculate subject allocations based on proportional hours
 */
function calculateSubjectAllocations(
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