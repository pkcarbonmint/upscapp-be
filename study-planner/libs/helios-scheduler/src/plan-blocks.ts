import type { Dayjs } from "dayjs";
import { BlockAllocConstraints, BlockSlot, S2Subject, S2WeekDay } from "./types";
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
  // @ts-ignore
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
/*
        // write the time window, subjects, constraints, and blocks to a file
        // and exit if exitOnFail is true
        const debugData = {
          timestamp: new Date().toISOString(),
          errorMessage: `No blocks allocated for day ${date.format('YYYY-MM-DD')}`,
            timeWindowFrom: timeWindowFrom.format('YYYY-MM-DD HH:mm:ss'),
            timeWindowTo: timeWindowTo.format('YYYY-MM-DD HH:mm:ss'),
            subjects,
            constraints,
            generatedBlocks: blocks,
            problematicDay: {
              date: date.format('YYYY-MM-DD'),
              dayOfWeek: date.format('dddd'),
              isCatchupDay: isCatchupDay(date, constraints.catchupDay),
              isTestDay: isTestDay(date, constraints.testDay),
              blocksOnDay: blocksOnTheDay.length,
              totalMinutes: totalMinutes
            }
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
        console.log(`Debug data written to: ${debugFile}`);
        if (exitOnFail) {
          process.exit(1);
        }
*/

        throw new Error(`No blocks allocated for day ${date.format('YYYY-MM-DD')}.`);
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
  isExcessTimePhase: boolean;
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
    subjectRemainingTime: initializeSubjectRemainingTime(subjects),
    isExcessTimePhase: false
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
    // All subjects complete - but continue until we reach the end of time window
    // to ensure all days are covered. Reset remaining time proportionally.
    const remainingDays = timeWindowTo.diff(earliestTrack.date, 'day');
    
    if (remainingDays > 0) {
      state.isExcessTimePhase = true;
      // Distribute remaining time proportionally among subjects
      const extraTimePerSubject = (remainingDays * constraints.workingMinutesPerDay) / subjects.length;
      subjects.forEach(subject => {
        state.subjectRemainingTime.set(subject.subjectCode, extraTimePerSubject);
      });
    } else {
      // We've reached the end of the time window
      return state;
    }
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
    state.isExcessTimePhase,
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
    isExcessTimePhase: state.isExcessTimePhase,
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
  isExcessTimePhase: boolean,
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
    metadata: {
      isExcessTime: isExcessTimePhase
    }
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
  const isExcessTimePhase = false;
  let currentSlot = allocateNextSlot(partialMinutes, isExcessTimePhase, timeWindowFrom, workingMinutesPerDayPerTrack, currentSubject);
  while (currentSlot.to.isBefore(timeWindowTo)) {
    partialMinutes = currentSlot.partialMinutes;
    currentSubject = scaledSubjects[currentSubjectIndex];
    currentSubjectIndex = (currentSubjectIndex + 1) % scaledSubjects.length;
    currentSlot = allocateNextSlot(partialMinutes, isExcessTimePhase, currentTrack.date, workingMinutesPerDayPerTrack, currentSubject);
    currentTrack = selectTrack(trackCursors);
    slots.push(currentSlot);
  }
  return slots;

  function allocateNextSlot(
    partialMinutes: number, 
    isExcessTimePhase: boolean,
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
      metadata: {
        isExcessTime: isExcessTimePhase
      }
    };
  }

  function selectTrack(trackCursors: TrackCursor[]): TrackCursor {
    // find minimum date in the track cursors
    return trackCursors.reduce((min, cursor) => {
      return cursor.date.isBefore(min.date) ? cursor : min;
    }, trackCursors[0]);
  }

}


