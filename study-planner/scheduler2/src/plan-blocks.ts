import type { Dayjs } from "dayjs";
import { BlockAllocConstraints, BlockSlot, S2Subject, S2WeekDay, SubjectCode } from "./types";
import * as fs from 'fs';
import * as path from 'path';
/*
 * PSEUDO CODE FOR TIME DISTRIBUTION AMONG SUBJECTS
 * 
 * 1. CALCULATE PROPORTIONAL TIME ALLOCATION
 *    - For each subject, calculate its proportional share based on relativeAllocation
 *    - Normalize relativeAllocation values to ensure they sum to 1.0
 *    - Allocate time proportionally: subjectTime = availableMinutes * normalizedRelativeAllocation[subjectCode]
 * 
 * 2. CREATE TIME BLOCKS WITH PARALLEL CONSTRAINT
 *    - Initialize activeBlocks array (max size = numParallel)
 *    - Initialize remainingTime map for each subject
 *    - Sort subjects by priority (order in input array)
 * 
 * 3. BLOCK ALLOCATION ALGORITHM:
 *    WHILE (any subject has remaining time > 0):
 *      a. Find next available time slot in calendar
 *      b. IF (activeBlocks.length < numParallel):
 *           - Start new block for highest priority subject with remaining time
 *           - Add to activeBlocks with start time and estimated end time
 *      c. ELSE:
 *           - Find earliest ending block in activeBlocks
 *           - Complete that block and remove from activeBlocks
 *           - Start new block for next priority subject
 * 
 * 4. TIME SCALING BASED ON AVAILABLE CALENDAR TIME:
 *    - Calculate total baseline time needed = sum of all subjects' baselineMinutes
 *    - Calculate scaling factor = availableMinutes / totalBaselineTime
 *    - IF (scaling factor >= 1.0):
 *        - Use full allocated time for each subject
 *        - Distribute extra time proportionally among subjects
 *    - ELSE (scaling factor < 1.0):
 *        - Scale down each subject's time proportionally
 *        - Prioritize essential topics/subtopics when scaling down
 * 
 * 5. BLOCK DURATION CALCULATION:
 *    - Calculate optimal block duration per subject based on:
 *      * Subject complexity (more complex = longer blocks)
 *      * Available calendar time (more time = longer blocks)
 *      * Working hours per day constraint
 *    - Ensure no single block exceeds dayMaxMinutes
 *    - Ensure minimum block duration >= dayMinMinutes
 * 
 * 6. SCHEDULE OPTIMIZATION:
 *    - Avoid scheduling blocks on catchupDay and testDay
 *    - Distribute blocks evenly across available days
 *    - Ensure no day exceeds workingHoursPerDay limit
 *    - Balance workload across the time period
 * 
 * 7. OUTPUT GENERATION:
 *    - Create BlockSlot objects with from/to times
 *    - Associate each block with its subject
 *    - Return ordered list of blocks respecting parallel constraint
 * 
 */
type BlockSlotWithPartialMinutes = BlockSlot & {
  partialMinutes: number;
}
export function planBlocks(
  timeWindowFrom: Dayjs,
  timeWindowTo: Dayjs,
  subjects: S2Subject[],
  constraints: BlockAllocConstraints
): BlockSlot[] {
  
  // Input validation
  if (timeWindowTo.isBefore(timeWindowFrom)) {
    throw new Error('to date must be after from date');
  }
  
  if (subjects.length === 0) {
    return [];
  }

  // Calculate available time
// Calculate available time - EXCLUDE catchup and test days
const numAvailableDays = timeWindowTo.diff(timeWindowFrom, 'day');
const availableMinutes = Array.from({ length: numAvailableDays }, (_, index) => timeWindowFrom.add(index, 'day'))
  .filter(date => !isCatchupDay(date, constraints.catchupDay) && !isTestDay(date, constraints.testDay))
  .length * constraints.workingMinutesPerDay;
    
  const totalBaselineTime = subjects.reduce((sum, subject) => sum + subject.baselineMinutes, 0);
  if (totalBaselineTime === 0) {
    return [];
  }

  // SCALING STRATEGY: Scale subjects based on available time
  const scalingFactor = availableMinutes / totalBaselineTime;
  const scaledSubjects = subjects.map(subject => ({
    ...subject,
    baselineMinutes: subject.baselineMinutes * scalingFactor
  }));

  // Functional implementation with scaling
  const blocks = generateBlocksWithScaling(timeWindowFrom, timeWindowTo, scaledSubjects, constraints);

  verifyBlocks(  timeWindowFrom,
    timeWindowTo  ,
    scaledSubjects,
    constraints,
    blocks);
  return blocks;
} 


const exitOnFail = false;
function verifyBlocks(  timeWindowFrom: Dayjs,
  timeWindowTo: Dayjs,
  subjects: S2Subject[],
  constraints: BlockAllocConstraints
, blocks: BlockSlot[]): void {

  const duration = timeWindowTo.diff(timeWindowFrom, 'day');
  let failureDates: Dayjs[] = []
  Array.from({ length: duration }, (_, index) => timeWindowFrom.add(index, 'day'))
  .filter(date => !isCatchupDay(date, constraints.catchupDay) && !isTestDay(date, constraints.testDay))
  .forEach(date => {
    const blocksOnTheDay = blocks.filter(block => {
      const blockStart = block.from.startOf('day');
      const blockEnd = block.to.startOf('day');
      const currentDay = date.startOf('day');
      return !currentDay.isBefore(blockStart) && !currentDay.isAfter(blockEnd);
    });
    // const blocksOnTheDay = blocks.filter(block => block.from.isSame(date, 'day'));
    const totalMinutes = blocksOnTheDay.reduce((sum, block) => sum + block.to.diff(block.from, 'minutes'), 0);
    if (totalMinutes === 0) {
      const failureCount = failureDates.length;
      if (failureCount < 3) {
        failureDates.push(date);
        return;
      }
      if (!exitOnFail) {
        throw new Error(`No blocks allocated for dates: ${failureDates.map(date => date.format('YYYY-MM-DD')).join(', ')}`);
      }
        // write the time window, subjects, constraints, and blocks to a file
        // and exit if exitOnFail is true
        const debugData = {
          timestamp: new Date().toISOString(),
          errorMessage: `No blocks allocated for day ${date.format('YYYY-MM-DD')}`,
            timeWindowFrom: timeWindowFrom.format('YYYY-MM-DD HH:mm:ss'),
            timeWindowTo: timeWindowTo.format('YYYY-MM-DD HH:mm:ss'),
            subjects,
            constraints,
          }

        // Write debug data to file
        const debugDir = path.join(__dirname, '..', 'debug');
        if (!fs.existsSync(debugDir)) {
          fs.mkdirSync(debugDir, { recursive: true });
        }
        
        const debugFile = path.join(debugDir, `planBlocks_debug_${Date.now()}.json`);
        fs.writeFileSync(debugFile, JSON.stringify(debugData, null, 2));
        
        console.log(`Debug data written to: ${debugFile}`);
        console.log(`No blocks allocated for dates: ${failureDates.map(date => date.format('YYYY-MM-DD')).join(', ')}`);
        console.log(`Total blocks generated: ${blocks.length}`);
        console.log(`Blocks on this day: ${blocksOnTheDay.length}`);

        if (exitOnFail) {
          process.exit(1);
        }
        throw new Error(`No blocks allocated for day ${date.format('YYYY-MM-DD')}. Debug data saved to: ${debugFile}`);
    }
  });
}



// State type for scaling approach
type BlockGenerationState = {
  trackCursors: TrackCursor[];
  subjectIndex: number;
  slots: BlockSlot[];
  iterationCount: number;
  subjectRemainingTime: Map<string, number>;
};

type TrackCursor = {
  date: Dayjs;
  timeAvailableOnTheDayInMinutes: number;
};

// Main functional algorithm with scaling
function generateBlocksWithScaling(
  timeWindowFrom: Dayjs,
  timeWindowTo: Dayjs,
  subjects: S2Subject[],
  constraints: BlockAllocConstraints
): BlockSlot[] {
  
  const workingMinutesPerDayPerTrack = constraints.workingMinutesPerDay / constraints.numParallel;
  
  // Initialize state with scaled subject time
  const initialState: BlockGenerationState = {
    trackCursors: initializeTrackCursors(timeWindowFrom, constraints.numParallel, workingMinutesPerDayPerTrack),
    subjectIndex: 0,
    slots: [],
    iterationCount: 0,
    subjectRemainingTime: initializeSubjectRemainingTime(subjects)
  };
  
  // Generate blocks using functional approach with scaling
  const finalState = generateBlocksRecursiveWithScaling(
    initialState,
    timeWindowFrom,
    timeWindowTo,
    subjects,
    constraints,
    workingMinutesPerDayPerTrack
  );
  
  return finalState.slots;
}

// Initialize subject remaining time with scaled time
function initializeSubjectRemainingTime(subjects: S2Subject[]): Map<string, number> {
  return new Map(subjects.map(subject => [subject.subjectCode, subject.baselineMinutes]));
}

// Initialize track cursors functionally
function initializeTrackCursors(
  startDate: Dayjs, 
  numParallel: number, 
  workingMinutesPerDayPerTrack: number
): TrackCursor[] {
  return Array.from({ length: numParallel }, (_, index) => ({
    date: startDate.add(index, 'day'),
    timeAvailableOnTheDayInMinutes: workingMinutesPerDayPerTrack
  }));
}

// Recursive function with scaling (no extra rounds)
function generateBlocksRecursiveWithScaling(
  state: BlockGenerationState,
  timeWindowFrom: Dayjs,
  timeWindowTo: Dayjs,
  subjects: S2Subject[],
  constraints: BlockAllocConstraints,
  workingMinutesPerDayPerTrack: number
): BlockGenerationState {
  
  // Safety check
  if (state.iterationCount > 1000) {
    throw new Error('Infinite loop detected in planBlocks');
  }
  
  // Find earliest available track
  const earliestTrack = findEarliestTrack(state.trackCursors);
  
  // Check termination condition - stop when we exceed time window
  if (earliestTrack.date.isAfter(timeWindowTo) || earliestTrack.date.isSame(timeWindowTo)) {
    return state;
  }
  
  // Check if all subjects are complete
  const totalRemainingTime = Array.from(state.subjectRemainingTime.values()).reduce((sum, time) => sum + time, 0);
  
  if (totalRemainingTime <= 0) {
    // All subjects complete - stop (no extra rounds in scaling strategy)
    return state;
  }
  
  // Find next subject with remaining time
  let currentSubjectIndex = state.subjectIndex;
  let currentSubject = subjects[currentSubjectIndex];
  let remainingTime = state.subjectRemainingTime.get(currentSubject.subjectCode) || 0;
  
  // Skip subjects that are complete
  while (remainingTime <= 0) {
    currentSubjectIndex = (currentSubjectIndex + 1) % subjects.length;
    currentSubject = subjects[currentSubjectIndex];
    remainingTime = state.subjectRemainingTime.get(currentSubject.subjectCode) || 0;
  }
  
  // Allocate slot for this subject (with remaining time)
  const newSlot = allocateNextSlot(
    0, 
    earliestTrack.date, 
    workingMinutesPerDayPerTrack, 
    currentSubject,
    constraints
  );
  
  // Calculate how much time was actually allocated
  const allocatedMinutes = newSlot.to.diff(newSlot.from, 'minutes');
  const newRemainingTime = Math.max(0, remainingTime - allocatedMinutes);
  
  // Update subject remaining time
  const updatedSubjectRemainingTime = new Map(state.subjectRemainingTime);
  updatedSubjectRemainingTime.set(currentSubject.subjectCode, newRemainingTime);
  
  // Update track cursors
  const updatedTrackCursors = updateTrackCursor(
    state.trackCursors,
    earliestTrack,
    newSlot.to,
    workingMinutesPerDayPerTrack
  );
  
  // Create new state
  const newState: BlockGenerationState = {
    trackCursors: updatedTrackCursors,
    subjectIndex: (currentSubjectIndex + 1) % subjects.length,
    slots: [...state.slots, newSlot],
    iterationCount: state.iterationCount + 1,
    subjectRemainingTime: updatedSubjectRemainingTime
  };
  
  // Recursive call
  return generateBlocksRecursiveWithScaling(
    newState,
    timeWindowFrom,
    timeWindowTo,
    subjects,
    constraints,
    workingMinutesPerDayPerTrack
  );
}

// Helper functions (same as before)
function findEarliestTrack(trackCursors: TrackCursor[]): TrackCursor {
  return trackCursors.reduce((earliest, current) => 
    current.date.isBefore(earliest.date) ? current : earliest
  );
}

function updateTrackCursor(
  trackCursors: TrackCursor[],
  trackToUpdate: TrackCursor,
  newDate: Dayjs,
  workingMinutesPerDayPerTrack: number
): TrackCursor[] {
  return trackCursors.map(track => 
    track === trackToUpdate 
      ? { date: newDate, timeAvailableOnTheDayInMinutes: workingMinutesPerDayPerTrack }
      : track
  );
}

// Functional allocateNextSlot (same as before)
function allocateNextSlot(
  partialMinutes: number, 
  from: Dayjs, 
  minutesPerDay: number, 
  subject: S2Subject,
  constraints: BlockAllocConstraints
): BlockSlot {
  const requiredMinutes = subject.baselineMinutes;
  if (partialMinutes < 0 || partialMinutes > requiredMinutes) {
    throw new Error(`Invalid partialMinutes: ${partialMinutes}`);
  }
  const pendingMins = requiredMinutes - partialMinutes;
  
  const getAvailableMinutes = (date: Dayjs): number => {
    if (isCatchupDay(date, constraints.catchupDay)) {
      return 0;
    }
    if (isTestDay(date, constraints.testDay)) {
      return Math.max(0, minutesPerDay - constraints.testMinutes);
    }
    return minutesPerDay;
  };
  
  const findEndDate = (
    currentDate: Dayjs, 
    remainingMinutes: number, 
    currentPartialMinutes: number
  ): { endDate: Dayjs; finalPartialMinutes: number } => {
    
    if (remainingMinutes <= 0) {
      return { endDate: currentDate, finalPartialMinutes: currentPartialMinutes };
    }
    
    const nextDate = currentDate.add(1, 'day');
    const availableMinutes = getAvailableMinutes(nextDate);
    
    if (availableMinutes === 0) {
      return findEndDate(nextDate, remainingMinutes, currentPartialMinutes);
    }
    
    const newRemainingMinutes = remainingMinutes - availableMinutes;
    const newPartialMinutes = newRemainingMinutes < 0 ? -newRemainingMinutes : 0;
    
    return findEndDate(nextDate, newRemainingMinutes, newPartialMinutes);
  };
  
  const { endDate, } = findEndDate(from, pendingMins, partialMinutes);
  
  const slot: BlockSlot = {
    cycleType: constraints.cycleType,
    subject: subject,
    from: from,
    to: endDate,
    numParallel: constraints.numParallel,
    minutesPerDay: constraints.workingMinutesPerDay,
  };
  return slot;
}

// Helper functions for day checking
function isCatchupDay(date: Dayjs, catchupDay: S2WeekDay): boolean {
  return date.day() === catchupDay;
}

function isTestDay(date: Dayjs, testDay: S2WeekDay): boolean {
  return date.day() === testDay;
}

export function planBlocks_v2(
  timeWindowFrom: Dayjs,
  timeWindowTo: Dayjs,
  subjects: S2Subject[],
  constraints: BlockAllocConstraints
): BlockSlot[] {
  if (timeWindowTo.isBefore(timeWindowFrom)) {
    throw new Error('to date must be after from date');
  }
  const numParallel = constraints.numParallel;
  const numAvailableDays = timeWindowTo.diff(timeWindowFrom, 'day');
  const availableMinutes = numAvailableDays * constraints.workingMinutesPerDay;

  // Step 4: TIME SCALING BASED ON AVAILABLE CALENDAR TIME
  const totalBaselineTime = subjects.reduce((sum, subject) => sum + subject.baselineMinutes, 0);
  if (totalBaselineTime === 0) {
    return []; // No blocks to allocate if no time is needed
  }
  const scalingFactor = availableMinutes / totalBaselineTime;
  const scaledSubjects = subjects.map(subject => ({
    ...subject,
    baselineMinutes: subject.baselineMinutes * scalingFactor
  }));

  const numTracks = numParallel;
  let slots: BlockSlot[] = [];
  let partialMinutes = 0;
  let currentSubjectIndex = 0;
  let currentSubject: S2Subject = scaledSubjects[currentSubjectIndex];
  const workingMinutesPerDayPerTrack = constraints.workingMinutesPerDay / numTracks;
  const trackCursors: TrackCursor[] = Array(numTracks).fill(timeWindowFrom);
  let currentTrack: TrackCursor = selectTrack(trackCursors);
  let currentSlot = allocateNextSlot(partialMinutes, timeWindowFrom, workingMinutesPerDayPerTrack, currentSubject);
  while (currentSlot.to.isBefore(timeWindowTo)) {
    partialMinutes = currentSlot.partialMinutes;
    currentSubject = scaledSubjects[currentSubjectIndex];
    currentSubjectIndex = (currentSubjectIndex + 1) % scaledSubjects.length;
    currentSlot = allocateNextSlot(partialMinutes, currentTrack.date, workingMinutesPerDayPerTrack, currentSubject);
    currentTrack = selectTrack(trackCursors);
    slots.push(currentSlot);
  }
  return slots;

  function allocateNextSlot(
    partialMinutes: number, 
    from: Dayjs, 
    minutesPerDay: number, 
    subject: S2Subject
  ): BlockSlotWithPartialMinutes {
    const requiredMinutes = subject.baselineMinutes;
    if (partialMinutes < 0 || partialMinutes > requiredMinutes) {
      throw new Error(`Invalid partialMinutes: ${partialMinutes}`);
    }
    const pendingMins = requiredMinutes - partialMinutes;
    
    // Helper function to calculate available minutes for a given date
    const getAvailableMinutes = (date: Dayjs): number => {
      if (isCatchupDay(date, constraints.catchupDay)) {
        return 0;
      }
      if (isTestDay(date, constraints.testDay)) {
        return Math.max(0, minutesPerDay - constraints.testMinutes);
      }
      return minutesPerDay;
    };
    
    // Recursive function to find the end date
    const findEndDate = (
      currentDate: Dayjs, 
      remainingMinutes: number, 
      currentPartialMinutes: number
    ): { endDate: Dayjs; finalPartialMinutes: number } => {
      
      if (remainingMinutes <= 0) {
        return { endDate: currentDate, finalPartialMinutes: currentPartialMinutes };
      }
      
      const nextDate = currentDate.add(1, 'day');
      const availableMinutes = getAvailableMinutes(nextDate);
      
      if (availableMinutes === 0) {
        // Skip this day (catchup day), continue to next
        return findEndDate(nextDate, remainingMinutes, currentPartialMinutes);
      }
      
      const newRemainingMinutes = remainingMinutes - availableMinutes;
      const newPartialMinutes = newRemainingMinutes < 0 ? -newRemainingMinutes : 0;
      
      return findEndDate(nextDate, newRemainingMinutes, newPartialMinutes);
    };
    
    const { endDate, finalPartialMinutes } = findEndDate(from, pendingMins, partialMinutes);
    
    return {
      cycleType: constraints.cycleType,
      subject: subject,
      from: from,
      to: endDate,
      numParallel: numParallel,
      partialMinutes: finalPartialMinutes,
      minutesPerDay: minutesPerDay,
    };
  }

  // @ts-ignore
  function allocateNextSlot0(partialMinutes: number, from: Dayjs, minutesPerDay: number, subject: S2Subject): BlockSlotWithPartialMinutes {
    let requiredMinutes = subject.baselineMinutes;
    let pendingMins = requiredMinutes - partialMinutes;
    let nextDate = from;

    while (pendingMins > 0) {
      nextDate = nextDate.add(1, 'day');
      if (isCatchupDay(nextDate, constraints.catchupDay)) {
        continue;
      }
      const availableMinsInDay = isTestDay(nextDate, constraints.testDay) ?
        (minutesPerDay - constraints.testMinutes)
        : minutesPerDay;
      pendingMins -= availableMinsInDay > 0 ? availableMinsInDay : 0;
      if (pendingMins < 0) {
        partialMinutes = - pendingMins;
      }
    }
    return {
      cycleType: constraints.cycleType,
      subject: subject,
      from: from,
      to: nextDate,
      numParallel: numParallel,
      partialMinutes: partialMinutes,
      minutesPerDay: minutesPerDay,
    }
  }

  function selectTrack(trackCursors: TrackCursor[]): TrackCursor {
    // find minimum date in the track cursors
    return trackCursors.reduce((min, cursor) => {
      return cursor.date.isBefore(min.date) ? cursor : min;
    }, trackCursors[0]);
  }

  // let subjectCursor = 0;
  // const tracks = Array(numParallel).fill(0).map((_, track) => {
  //   const subject = scaledSubjects[subjectCursor];

  //   subjectCursor = (subjectCursor + 1) % scaledSubjects.length;
  // });

  // const numRounds = Math.ceil(availableMinutes / SLICE_DURATION_MINUTES); // round robin allocation until we run out of time
  // let remainingTimeMinutes = availableMinutes;
  // const blockSlots: BlockSlot[] = Array(numRounds).fill(0).map((_, i) => {// round robin loop
  //   return subjects.map((subject) => {
  //     const baselineMinutes = subject.baselineMinutes;
  //     // take as many slices as possible until we run out of time or we run out of slices
  //     const slicesTaken = Math.ceil(baselineMinutes / SLICE_DURATION_MINUTES);
  //     remainingTimeMinutes -= slicesTaken * SLICE_DURATION_MINUTES;
  //     return allocateSlots();
  //   })
  //     .flat();
  // })
  //   .flat();
  // return blockSlots.filter(slot => slot.length > 0);


  // // const scaledAllocation: Map<SubjectCode, number> = makeScaledAllocation(normalizedAllocation, scalingFactor);
  // // const timeSlices = availableMinutes / SLICE_DURATION_MINUTES;

  // // let remainingTimeMinutes = availableMinutes;



  // // allocateSlots(timeWindowFrom, timeWindowTo, minutes);


  // function makeNormalizedAllocation(constraints: BlockAllocConstraints): Record<SubjectCode, number> {
  //   const rawWeights = constraints.relativeAllocationWeights;
  //   const totalWeight = Object.values(rawWeights).reduce((sum, weight) => sum + weight, 0);
  //   const normalizedAllocation: Record<SubjectCode, number> = {};
  //   for (const [subjectCode, weight] of Object.entries(rawWeights)) {
  //     normalizedAllocation[subjectCode] = weight / totalWeight;
  //   }
  //   return normalizedAllocation;
  // }
  // function makeScaledAllocation(normalizedAllocation: Record<SubjectCode, number>, scalingFactor: number): Map<SubjectCode, number> {
  //   const scaledAllocation: Map<SubjectCode, number> = new Map();
  //   if (scalingFactor >= 1.0) {
  //     // More time available - use full allocation
  //     for (const [subjectCode, weight] of Object.entries(normalizedAllocation)) {
  //       scaledAllocation.set(subjectCode, weight);
  //     }
  //   } else {
  //     // Less time available - scale down proportionally
  //     for (const [subjectCode, weight] of Object.entries(normalizedAllocation)) {
  //       scaledAllocation.set(subjectCode, weight * scalingFactor);
  //     }
  //   }
  //   return scaledAllocation;
  // }

  // function makeSubjectMap(subjects: S2Subject[]): Record<SubjectCode, S2Subject> {
  //   return subjects.reduce((acc, subject) => {
  //     acc[subject.subjectCode] = subject;
  //     return acc;
  //   }, {} as Record<SubjectCode, S2Subject>);
  // }

  // throw new Error('implementation in progress');
}


export function planBlocks_v1(
  timeWindowFrom: Dayjs,
  timeWindowTo: Dayjs,
  subjects: S2Subject[],
  constraints: BlockAllocConstraints
): BlockSlot[] {
  // Validate date range
  if (timeWindowTo.isBefore(timeWindowFrom)) {
    throw new Error('to date must be after from date');
  }

  const availableDays = timeWindowTo.diff(timeWindowFrom, 'day');
  const availableMinutes = availableDays * constraints.workingMinutesPerDay;
  const subjectMap = subjects.reduce((acc, subject) => {
    acc[subject.subjectCode] = subject;
    return acc;
  }, {} as Record<SubjectCode, S2Subject>);

  // Split the available calendar time among the subjects, in the order provided.
  // If we have to prioritize optional subject, it should be first in the list.

  // Step 1: Calculate proportional allocation
  // Normalize relativeAllocationWeights to ensure they sum to 1
  const rawWeights = constraints.relativeAllocationWeights;
  const totalWeight = Object.values(rawWeights).reduce((sum, weight) => sum + weight, 0);
  const normalizedAllocation: Record<SubjectCode, number> = {};
  for (const [subjectCode, weight] of Object.entries(rawWeights)) {
    normalizedAllocation[subjectCode] = weight / totalWeight;
  }

  // Step 4: TIME SCALING BASED ON AVAILABLE CALENDAR TIME
  const totalBaselineTime = subjects.reduce((sum, subject) => sum + subject.baselineMinutes, 0);

  // Handle edge case where all subjects have zero baseline minutes
  if (totalBaselineTime === 0) {
    return []; // No blocks to allocate if no time is needed
  }

  const scalingFactor = availableMinutes / totalBaselineTime;

  // Apply scaling to allocation weights
  const scaledAllocation: Map<SubjectCode, number> = new Map();
  if (scalingFactor >= 1.0) {
    // More time available - use full allocation
    for (const [subjectCode, weight] of Object.entries(normalizedAllocation)) {
      scaledAllocation.set(subjectCode, weight);
    }
  } else {
    // Less time available - scale down proportionally
    for (const [subjectCode, weight] of Object.entries(normalizedAllocation)) {
      scaledAllocation.set(subjectCode, weight * scalingFactor);
    }
  }
  // Step 2: Time Slice Algorithm (Fixed)
  const SLICE_DURATION_MINUTES = 30;
  const blockSlots: BlockSlot[] = [];

  // 1. Generate time slices with safety limits
  const timeSlices: Array<{
    startTime: Dayjs;
    endTime: Dayjs;
    subjectCode: SubjectCode | null;
  }> = [];

  let currentTime = timeWindowFrom;
  let sliceCount = 0;

  // Calculate maxSlices based on working hours, not total time window
  const totalWorkingMinutes = availableMinutes; // This already accounts for working hours per day
  const maxSlices = Math.min(10000, Math.ceil(totalWorkingMinutes / SLICE_DURATION_MINUTES));

  while (currentTime.isBefore(timeWindowTo) && sliceCount < maxSlices) {
    const dayOfWeek = currentTime.day();
    const isRestricted = dayOfWeek === constraints.catchupDay || dayOfWeek === constraints.testDay;

    if (!isRestricted) {
      // Calculate this day's working hours
      const dayStart = currentTime.startOf('day');
      const dayEnd = dayStart.add(constraints.workingMinutesPerDay, 'minutes');

      // Only create slices within this day's working hours
      if (currentTime.isBefore(dayEnd)) {
        const sliceEndTime = currentTime.add(SLICE_DURATION_MINUTES, 'minutes');

        // Don't exceed this day's working hours or the overall time window
        if ((sliceEndTime.isBefore(dayEnd) || sliceEndTime.isSame(dayEnd)) &&
          (sliceEndTime.isBefore(timeWindowTo) || sliceEndTime.isSame(timeWindowTo))) {
          timeSlices.push({
            startTime: currentTime,
            endTime: sliceEndTime,
            subjectCode: null
          });
        }
      }
    }

    currentTime = currentTime.add(SLICE_DURATION_MINUTES, 'minutes');
    sliceCount++;

    // If we've exceeded this day's working hours, move to next day
    const dayStart = currentTime.startOf('day');
    const dayEnd = dayStart.add(constraints.workingMinutesPerDay, 'minutes');
    if (currentTime.isAfter(dayEnd)) {
      currentTime = currentTime.add(1, 'day').startOf('day');
    }
  }

  // 2. Calculate subject requirements
  const subjectRequirements = subjects.map(subject => ({
    subjectCode: subject.subjectCode,
    requiredSlices: Math.ceil(subject.baselineMinutes / SLICE_DURATION_MINUTES),
    allocatedSlices: 0
  }));


  // Handle empty subjects array
  if (subjectRequirements.length === 0) {
    return [];
  }

  // 3. Scale down if needed
  const totalRequiredSlices = subjectRequirements.reduce((sum, req) => sum + req.requiredSlices, 0);
  if (timeSlices.length < totalRequiredSlices) {
    const scalingFactor = timeSlices.length / totalRequiredSlices;
    subjectRequirements.forEach(req => {
      req.requiredSlices = Math.floor(req.requiredSlices * scalingFactor);
    });
  }

  // 4. Parallel assignment with sliding window (numParallel constraint)
  let sliceIndex = 0;
  let iterations = 0;
  const maxIterations = timeSlices.length * 2; // Safety limit

  // Create active subjects pool (max size = numParallel)
  const activeSubjects: typeof subjectRequirements = [];
  let nextSubjectIndex = 0;

  // Initialize active subjects pool
  for (let i = 0; i < Math.min(constraints.numParallel, subjectRequirements.length); i++) {
    if (nextSubjectIndex < subjectRequirements.length) {
      activeSubjects.push(subjectRequirements[nextSubjectIndex]);
      nextSubjectIndex++;
    }
  }

  let activeSubjectIndex = 0;

  while (sliceIndex < timeSlices.length && iterations < maxIterations) {
    // Check if we have any active subjects
    if (activeSubjects.length === 0) {
      break;
    }

    const subject = activeSubjects[activeSubjectIndex];

    if (subject.allocatedSlices < subject.requiredSlices) {
      timeSlices[sliceIndex].subjectCode = subject.subjectCode;
      subject.allocatedSlices++;

      sliceIndex++;
    } else {
      // This subject is done, remove it and add next subject
      activeSubjects.splice(activeSubjectIndex, 1);

      // Add next subject if available, or restart from beginning if all subjects have been processed
      if (nextSubjectIndex < subjectRequirements.length) {
        activeSubjects.push(subjectRequirements[nextSubjectIndex]);
        nextSubjectIndex++;
      } else {
        // All subjects have been processed once, restart round-robin
        // Reset all subjects' allocated slices and restart from the beginning
        subjectRequirements.forEach(req => {
          req.allocatedSlices = 0;
        });
        nextSubjectIndex = 0;

        // Add subjects back to active pool
        for (let i = 0; i < Math.min(constraints.numParallel, subjectRequirements.length); i++) {
          if (nextSubjectIndex < subjectRequirements.length) {
            activeSubjects.push(subjectRequirements[nextSubjectIndex]);
            nextSubjectIndex++;
          }
        }
      }

      // Adjust index if we removed a subject
      if (activeSubjectIndex >= activeSubjects.length) {
        activeSubjectIndex = 0;
      }

      continue; // Don't increment activeSubjectIndex
    }

    // Move to next active subject
    activeSubjectIndex = (activeSubjectIndex + 1) % activeSubjects.length;
    iterations++;
  }

  // 5. Create meaningful blocks from slice allocations
  // Group slices by subject and create continuous blocks
  const subjectSliceGroups: Record<SubjectCode, Array<{ startTime: Dayjs, endTime: Dayjs }>> = {};

  // Group slices by subject
  timeSlices.forEach(slice => {
    if (slice.subjectCode) {
      if (!subjectSliceGroups[slice.subjectCode]) {
        subjectSliceGroups[slice.subjectCode] = [];
      }
      subjectSliceGroups[slice.subjectCode].push({
        startTime: slice.startTime,
        endTime: slice.endTime
      });
    }
  });

  // Create blocks for each subject
  Object.entries(subjectSliceGroups).forEach(([subjectCode, slices]) => {

    // Sort slices by start time
    slices.sort((a, b) => a.startTime.diff(b.startTime));

    // Group consecutive slices into blocks
    let i = 0;
    while (i < slices.length) {
      const blockStartTime = slices[i].startTime;
      let blockEndTime = slices[i].endTime;
      let j = i + 1;

      // Find consecutive slices (allowing small gaps for breaks)
      while (j < slices.length) {
        const gapMinutes = slices[j].startTime.diff(blockEndTime, 'minutes');
        // Allow gaps up to 2 hours (120 minutes) to be considered consecutive
        if (gapMinutes <= 120) {
          blockEndTime = slices[j].endTime;
          j++;
        } else {
          break;
        }
      }

      // Only create blocks that are at least 1 hour long
      const blockDurationMinutes = blockEndTime.diff(blockStartTime, 'minutes');

      if (blockDurationMinutes >= 60) {
        blockSlots.push({
          minutesPerDay: constraints.workingMinutesPerDay,
          cycleType: constraints.cycleType,
          subject: subjectMap[subjectCode],
          from: blockStartTime,
          to: blockEndTime,
          numParallel: constraints.numParallel
        });
      }

      i = j;
    }
  });

  // Step 6: SCHEDULE OPTIMIZATION - Balance workload across days
  // const optimizedSlots = balanceWorkloadAcrossDays(blockSlots, constraints);

  // Step 7: Handle overflow beyond 'to' date
  const maxDailyMinutes = constraints.workingMinutesPerDay;
  const finalSlots: BlockSlot[] = blockSlots.map(block => {
    if (block.to.isAfter(timeWindowTo)) {
      const overflowMinutes = block.to.diff(timeWindowTo, 'minutes');
      // If overflow is less than one day's work, cap it to 'to' date
      if (overflowMinutes <= maxDailyMinutes) {
        return {
          minutesPerDay: constraints.workingMinutesPerDay,
          cycleType: constraints.cycleType,
          subject: block.subject,
          from: block.from,
          to: timeWindowTo,
          numParallel: constraints.numParallel
        };
      }
      // If overflow is more than one day's work, keep the original block
      // (This indicates a more serious scheduling issue)
    }
    return block;
  }).filter(block => {
    // Remove blocks with zero or negative duration
    const duration = block.to.diff(block.from, 'minutes');
    return duration > 0;
  });

  return finalSlots;
}

// Removed unused helper functions to satisfy noUnusedLocals
