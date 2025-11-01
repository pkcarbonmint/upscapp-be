import type { Dayjs } from "dayjs";
import { BlockAllocConstraints, BlockSlot, S2Subject, S2WeekDay } from "./types";

export function planBlocks(
  cycleFrom: Dayjs,
  cycleTo: Dayjs,
  subjects: S2Subject[],
  constraints: BlockAllocConstraints
): BlockSlot[] {

  // Input validation
  if (cycleTo.isBefore(cycleFrom)) {
    throw new Error('to date must be after from date');
  }

  if (subjects.length === 0) {
    return [];
  }

  // Calculate available time
  // Calculate available time - EXCLUDE catchup and test days
  const numAvailableDays = cycleTo.diff(cycleFrom, 'day');
  const availableMinutes = Array.from({ length: numAvailableDays }, (_, index) => cycleFrom.add(index, 'day'))
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
  const blocks = generateBlocksWithScaling(cycleFrom, cycleTo, scaledSubjects, constraints);

  verifyBlocks(cycleFrom,
    cycleTo,
    scaledSubjects,
    constraints,
    blocks);

  // Assert that no subject has overlapping blocks
  verifyNoOverlappingBlocksForSameSubject(blocks);

  // Validate all block constraints
  verifyBlockConstraints(blocks, cycleFrom, cycleTo, constraints);

  return blocks;
}


const exitOnFail = false;
function verifyBlocks(timeWindowFrom: Dayjs,
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

/**
 * Validates that no subject has overlapping blocks.
 * Two blocks overlap if their date ranges intersect (they share at least one day).
 * Throws an error if any overlapping blocks are found for the same subject.
 */
function verifyNoOverlappingBlocksForSameSubject(blocks: BlockSlot[]): void {
  // Group blocks by subject
  const blocksBySubject = new Map<string, BlockSlot[]>();
  blocks.forEach(block => {
    const subjectCode = block.subject.subjectCode;
    if (!blocksBySubject.has(subjectCode)) {
      blocksBySubject.set(subjectCode, []);
    }
    blocksBySubject.get(subjectCode)!.push(block);
  });

  // Check each subject's blocks for overlaps
  const overlappingBlocks: Array<{ subjectCode: string; block1: BlockSlot; block2: BlockSlot }> = [];

  blocksBySubject.forEach((subjectBlocks, subjectCode) => {
    // Compare each pair of blocks for this subject
    for (let i = 0; i < subjectBlocks.length; i++) {
      for (let j = i + 1; j < subjectBlocks.length; j++) {
        const block1 = subjectBlocks[i];
        const block2 = subjectBlocks[j];

        if (blocksOverlap(block1, block2)) {
          overlappingBlocks.push({ subjectCode, block1, block2 });
        }
      }
    }
  });

  if (overlappingBlocks.length > 0) {
    const errorDetails = overlappingBlocks.map(({ subjectCode, block1, block2 }) => {
      return `Subject ${subjectCode}: Block 1 (${block1.from.format('YYYY-MM-DD')} to ${block1.to.format('YYYY-MM-DD')}) overlaps with Block 2 (${block2.from.format('YYYY-MM-DD')} to ${block2.to.format('YYYY-MM-DD')})`;
    }).join('\n');

    throw new Error(
      `Found ${overlappingBlocks.length} overlapping block(s) for the same subject:\n${errorDetails}\n\n` +
      `This should never happen. A subject should not have multiple active blocks at the same time.`
    );
  }
}

/**
 * Check if two blocks overlap in time.
 * Two blocks overlap if their date ranges intersect.
 */
function blocksOverlap(block1: BlockSlot, block2: BlockSlot): boolean {
  const block1Start = block1.from.startOf('day');
  const block1End = block1.to.startOf('day');
  const block2Start = block2.from.startOf('day');
  const block2End = block2.to.startOf('day');

  // Blocks overlap if: block1Start < block2End AND block2Start < block1End
  // Using startOf('day') makes the comparison day-based (end dates are exclusive)
  return block1Start.isBefore(block2End) && block2Start.isBefore(block1End);
}

/**
 * Comprehensive validation of block constraints.
 * Throws errors if any of the following are violated:
 * 1. No more than numParallel blocks at the same time
 * 2. Never two different subjects overlapping
 * 3. Never more time in a day than allowed by the constraints
 * 4. No day with 0 work, other than catchup days and test days
 */
function verifyBlockConstraints(
  blocks: BlockSlot[],
  timeWindowFrom: Dayjs,
  timeWindowTo: Dayjs,
  constraints: BlockAllocConstraints
): void {
  const duration = timeWindowTo.diff(timeWindowFrom, 'day');
  const daysWithViolations: string[] = [];

  // Iterate through each day in the time window
  for (let i = 0; i < duration; i++) {
    const date = timeWindowFrom.add(i, 'day');
    const dateKey = date.format('YYYY-MM-DD');
    const dayOfWeek = date.day();

    // Skip catchup days and test days for some validations
    const isCatchupDay = dayOfWeek === constraints.catchupDay;
    const isTestDay = dayOfWeek === constraints.testDay;

    // Get all blocks active on this day
    const blocksOnDay = blocks.filter(block => {
      const blockStart = block.from.startOf('day');
      const blockEnd = block.to.startOf('day');
      const currentDay = date.startOf('day');
      // Block is active if: blockStart <= currentDay < blockEnd
      return (blockStart.isBefore(currentDay) || blockStart.isSame(currentDay)) &&
        blockEnd.isAfter(currentDay);
    });

    // 1. Check: No more than numParallel blocks at the same time
    if (blocksOnDay.length > constraints.numParallel) {
      const subjects = blocksOnDay.map(b => b.subject.subjectCode).join(', ');
      throw new Error(
        `Violation 1: Found ${blocksOnDay.length} blocks on ${dateKey} (max allowed: ${constraints.numParallel}). ` +
        `Subjects: ${subjects}`
      );
    }

    // 2. Check: Never two blocks for the same subject overlapping
    // (Different subjects CAN overlap - that's parallel execution)
    const subjectCounts = new Map<string, number>();
    blocksOnDay.forEach(block => {
      const count = subjectCounts.get(block.subject.subjectCode) || 0;
      subjectCounts.set(block.subject.subjectCode, count + 1);
    });
    const duplicateSubjects = Array.from(subjectCounts.entries())
      .filter(([_, count]) => count > 1);

    if (duplicateSubjects.length > 0) {
      const duplicates = duplicateSubjects
        .map(([subject, count]) => `${subject} (${count} blocks)`);
      throw new Error(
        `Violation 2: Found overlapping blocks for the same subject on ${dateKey}. ` +
        `Duplicates: ${duplicates.join(', ')}`
      );
    }

    // 3. Check: Never more time in a day than allowed by constraints
    // Calculate total minutes allocated on this day
    let totalMinutesOnDay = 0;
    blocksOnDay.forEach(block => {
      // If a block is active on this day, it contributes its minutesPerDay allocation
      // (not calendar minutes, which diff would give us)
      // The block allocation logic already handles day-by-day allocation using minutesPerDay
      totalMinutesOnDay += block.minutesPerDay;
    });

    // Account for test day minutes
    const maxAllowedMinutes = constraints.workingMinutesPerDay;

    if (!isCatchupDay && totalMinutesOnDay > maxAllowedMinutes) {
      throw new Error(
        `Violation 3: Total minutes (${totalMinutesOnDay}) on ${dateKey} exceeds maximum allowed (${maxAllowedMinutes}). ` +
        `Day type: ${isTestDay ? 'Test day' : 'Regular day'}`
      );
    }

    // 4. Check: No day with 0 work, other than catchup days and test days
    if (!isCatchupDay && !isTestDay && blocksOnDay.length === 0) {
      daysWithViolations.push(dateKey);
    }
  }

  if (daysWithViolations.length > 0) {
    throw new Error(
      `Violation 4: Found ${daysWithViolations.length} day(s) with 0 work allocated (excluding catchup/test days): ` +
      `${daysWithViolations.slice(0, 10).join(', ')}${daysWithViolations.length > 10 ? '...' : ''}`
    );
  }
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
  cycleFrom: Dayjs,
  cycleTo: Dayjs,
  subjects: S2Subject[],
  constraints: BlockAllocConstraints
): BlockSlot[] {

  const workingMinutesPerDayPerTrack = constraints.workingMinutesPerDay / constraints.numParallel;

  // Initialize state with scaled subject time
  const initialState: BlockGenerationState = {
    trackCursors: initializeTrackCursors(cycleFrom, constraints.numParallel, workingMinutesPerDayPerTrack),
    subjectIndex: 0,
    slots: [],
    iterationCount: 0,
    subjectRemainingTime: initializeSubjectRemainingTime(subjects),
  };

  // Initially populate all parallel tracks with different subjects starting on the same day
  // This ensures each track gets a different subject assigned on the first day
  const initialSlotsState = initializeParallelTracks(
    initialState,
    subjects,
    constraints,
    workingMinutesPerDayPerTrack
  );

  // Generate remaining blocks using functional approach with scaling
  const finalState = generateBlocksRecursiveWithScaling(
    initialSlotsState,
    cycleFrom,
    cycleTo,
    subjects,
    constraints,
    workingMinutesPerDayPerTrack
  );

  const blocks = finalState.slots;

  return blocks;
}

// Initialize subject remaining time with scaled time
function initializeSubjectRemainingTime(subjects: S2Subject[]): Map<string, number> {
  return new Map(subjects.map(subject => [subject.subjectCode, subject.baselineMinutes]));
}

/**
 * Initialize all parallel tracks with different subjects on the first day.
 * Each track gets assigned a different subject starting from the same day.
 */
function initializeParallelTracks(
  initialState: BlockGenerationState,
  subjects: S2Subject[],
  constraints: BlockAllocConstraints,
  workingMinutesPerDayPerTrack: number
): BlockGenerationState {
  let state = { ...initialState };
  let subjectIndex = 0;

  // Assign a different subject to each parallel track, starting on the same day
  for (let trackIndex = 0; trackIndex < state.trackCursors.length; trackIndex++) {
    const track = state.trackCursors[trackIndex];

    // Find next available subject (one that isn't already active and has remaining time)
    let foundSubject = false;
    let attempts = 0;
    const maxAttempts = subjects.length;

    while (!foundSubject && attempts < maxAttempts) {
      const currentSubject = subjects[subjectIndex % subjects.length];
      const remainingTime = state.subjectRemainingTime.get(currentSubject.subjectCode) || 0;

      // Check if this subject is already active or has no remaining time
      if (remainingTime > 0 && !isSubjectActiveOnDate(state.slots, currentSubject.subjectCode, track.date)) {
        // Assign this subject to this track
        const newSlot = allocateNextSlot(
          0,
          track.date,
          workingMinutesPerDayPerTrack,
          currentSubject,
          constraints
        );

        const allocatedMinutes = newSlot.to.diff(newSlot.from, 'minutes');
        const newRemainingTime = Math.max(0, remainingTime - allocatedMinutes);

        // Update state
        const updatedSubjectRemainingTime = new Map(state.subjectRemainingTime);
        updatedSubjectRemainingTime.set(currentSubject.subjectCode, newRemainingTime);

        const updatedTrackCursors = updateTrackCursor(
          state.trackCursors,
          track,
          newSlot.to,
          workingMinutesPerDayPerTrack
        );

        state = {
          ...state,
          trackCursors: updatedTrackCursors,
          slots: [...state.slots, newSlot],
          subjectRemainingTime: updatedSubjectRemainingTime,
          subjectIndex: (subjectIndex + 1) % subjects.length
        };

        foundSubject = true;
      }

      subjectIndex++;
      attempts++;
    }

    // If we couldn't find a subject for this track, that's okay - some tracks may remain unassigned
    if (!foundSubject) {
      break;
    }
  }

  return state;
}

// Initialize track cursors functionally
// All parallel tracks should start on the same day, each tracking a different subject
function initializeTrackCursors(
  startDate: Dayjs,
  numParallel: number,
  workingMinutesPerDayPerTrack: number
): TrackCursor[] {
  return Array.from({ length: numParallel }, () => ({
    date: startDate,
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
    return state;
  }

  // Find next subject with remaining time that is not already active on another track
  let currentSubjectIndex = state.subjectIndex;
  let currentSubject = subjects[currentSubjectIndex];
  let remainingTime = state.subjectRemainingTime.get(currentSubject.subjectCode) || 0;
  let attempts = 0;
  const maxAttempts = subjects.length * 2; // Prevent infinite loop

  // Skip subjects that are complete or already active on the earliest track's date
  while ((remainingTime <= 0 || isSubjectActiveOnDate(state.slots, currentSubject.subjectCode, earliestTrack.date)) && attempts < maxAttempts) {
    currentSubjectIndex = (currentSubjectIndex + 1) % subjects.length;
    currentSubject = subjects[currentSubjectIndex];
    remainingTime = state.subjectRemainingTime.get(currentSubject.subjectCode) || 0;
    attempts++;
  }

  // If we couldn't find any available subject, advance the track cursor and try again
  if (attempts >= maxAttempts || remainingTime <= 0 || isSubjectActiveOnDate(state.slots, currentSubject.subjectCode, earliestTrack.date)) {
    // All subjects are either complete or active on this date - advance the earliest track cursor
    const updatedTrackCursors = updateTrackCursor(
      state.trackCursors,
      earliestTrack,
      earliestTrack.date.add(1, 'day'),
      workingMinutesPerDayPerTrack
    );

    return generateBlocksRecursiveWithScaling(
      {
        ...state,
        trackCursors: updatedTrackCursors,
        iterationCount: state.iterationCount + 1
      },
      timeWindowFrom,
      timeWindowTo,
      subjects,
      constraints,
      workingMinutesPerDayPerTrack
    );
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

/**
 * Check if a subject already has an active block that includes the given date.
 * A subject is considered active on a date if it has a block where from <= date < to
 */
function isSubjectActiveOnDate(blocks: BlockSlot[], subjectCode: string, date: Dayjs): boolean {
  return blocks.some(block => {
    if (block.subject.subjectCode !== subjectCode) {
      return false;
    }
    // Check if date is within the block's range (from inclusive, to exclusive)
    const dateStart = date.startOf('day');
    const blockFrom = block.from.startOf('day');
    const blockTo = block.to.startOf('day');

    // Subject is active if: blockFrom <= dateStart < blockTo
    return (blockFrom.isBefore(dateStart) || blockFrom.isSame(dateStart)) &&
      blockTo.isAfter(dateStart);
  });
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
    id: subject.subjectCode + randomId(),
    cycleType: constraints.cycleType,
    subject: subject,
    from: from,
    to: endDate,
    numParallel: constraints.numParallel,
    minutesPerDay: minutesPerDay, // Use the per-track minutes, not total daily minutes
    metadata: {
    }
  };
  return slot;
}


function randomId(): string {
  return Math.random().toString(36).substring(2, 15);
}
// Helper functions for day checking
function isCatchupDay(date: Dayjs, catchupDay: S2WeekDay): boolean {
  return date.day() === catchupDay;
}

function isTestDay(date: Dayjs, testDay: S2WeekDay): boolean {
  return date.day() === testDay;
}



