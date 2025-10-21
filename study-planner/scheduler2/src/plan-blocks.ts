import type { Dayjs } from "dayjs";
import { ActiveBlock, BlockAllocConstraints, BlockSlot, S2Subject, S2WeekDay, SubjectCode, SubjectWithAllocation } from "./types";
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
export function planBlocks(
  timeWindowFrom: Dayjs,
  timeWindowTo: Dayjs,
  subjects: S2Subject[],
  constraints: BlockAllocConstraints
): BlockSlot[] {
  const availableDays = timeWindowTo.diff(timeWindowFrom, 'day');
  const numCatchupDays = countCatchupDays(timeWindowFrom, timeWindowTo, constraints.catchupDay);
  const numTestDays = countTestDays(timeWindowFrom, timeWindowTo, constraints.testDay);
  const availableHours = availableDays * constraints.workingHoursPerDay - numCatchupDays * constraints.workingHoursPerDay - numTestDays * constraints.workingHoursPerDay;
  const availableMinutes = availableHours * 60;
  const subjectMap = subjects.reduce((acc, subject) => {
    acc[subject.subjectCode] = subject;
    return acc;
  }, {} as Record<SubjectCode, S2Subject>);

  // Split the available calendar time among the subjects, in the order provided.
  // If we have to prioritize optional subject, it should be first in the list.
  const blockSlots: BlockSlot[] = [];

  // Step 1: Calculate proportional allocation
  // relativeAllocationWeights are already fractions that sum to 1, so no normalization needed
  const normalizedAllocation: Record<SubjectCode, number> = constraints.relativeAllocationWeights;

  // Step 4: TIME SCALING BASED ON AVAILABLE CALENDAR TIME
  const totalBaselineTime = subjects.reduce((sum, subject) => sum + subject.baselineMinutes, 0);
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
  // Step 2: Initialize tracking structures
  const activeBlocks: ActiveBlock[] = [];
  const remainingTime = new Map<SubjectCode, number>();
  subjects.forEach(subject => {
    const allocatedTime = availableMinutes * scaledAllocation.get(subject.subjectCode)!;
    remainingTime.set(subject.subjectCode, allocatedTime);
  });

  // Step 3: Main allocation loop
  let currentTime = timeWindowFrom;
  while (hasRemainingTime(remainingTime)) {
    if (activeBlocks.length < constraints.numParallel) {
      // Start new block for highest priority subject with remaining time
      const currentSubjectCode = findNextSubjectWithTime(remainingTime);
      if (currentSubjectCode) {
        const subject = subjects.find(s => s.subjectCode === currentSubjectCode);
        if (subject) {
          const subjectWithAllocation: SubjectWithAllocation = {
            ...subject,
            allocation: availableMinutes * scaledAllocation.get(subject.subjectCode)!
          };
          const blockDuration = calculateOptimalBlockDuration(subjectWithAllocation, availableMinutes, scaledAllocation, constraints);

          // Find next available time slot respecting calendar constraints
          const nextAvailableSlot = findNextAvailableTimeSlot(currentTime, blockDuration, constraints);
          if (nextAvailableSlot) {
            const blockEndTime = nextAvailableSlot.add(blockDuration, 'minutes');

            activeBlocks.push({
              subject: subjectMap[currentSubjectCode],
              startTime: nextAvailableSlot,
              endTime: blockEndTime,
              duration: blockDuration
            });

            remainingTime.set(currentSubjectCode,
              remainingTime.get(currentSubjectCode)! - blockDuration);

            // Update currentTime to the end of this block
            currentTime = blockEndTime;
          } else {
            // No available time slot found, break the loop
            break;
          }
        }
      }
    } else if (activeBlocks.length > 0) {
      // Complete earliest ending block
      const completedBlock = findEarliestEndingBlock(activeBlocks);
      blockSlots.push({
        cycleType: constraints.cycleType,
        subject: completedBlock.subject,
        from: completedBlock.startTime,
        to: completedBlock.endTime
      });
      activeBlocks.splice(activeBlocks.indexOf(completedBlock), 1);
      currentTime = completedBlock.endTime;
    } else {
      // No active blocks and no remaining time, break the loop
      break;
    }
  }
  // Step 4: Complete remaining active blocks
  activeBlocks.forEach(block => {
    blockSlots.push({
      cycleType: constraints.cycleType,
      subject: block.subject,
      from: block.startTime,
      to: block.endTime
    });
  });

  // Step 6: SCHEDULE OPTIMIZATION - Balance workload across days
  const optimizedSlots = balanceWorkloadAcrossDays(blockSlots, constraints);

  // Step 7: Handle overflow beyond 'to' date
  const maxDailyMinutes = constraints.workingHoursPerDay * 60;
  const finalSlots = optimizedSlots.map(block => {
    if (block.to.isAfter(timeWindowTo)) {
      const overflowMinutes = block.to.diff(timeWindowTo, 'minutes');
      // If overflow is less than one day's work, cap it to 'to' date
      if (overflowMinutes <= maxDailyMinutes) {
        return {
          cycleType: constraints.cycleType,
          subject: block.subject,
          from: block.from,
          to: timeWindowTo
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

function hasRemainingTime(remainingTime: Map<SubjectCode, number>): boolean {
  return Array.from(remainingTime.values()).some(time => time > 0);
}

function findNextSubjectWithTime(remainingTime: Map<SubjectCode, number>): SubjectCode | null {
  for (const [subjectCode, time] of remainingTime.entries()) {
    if (time > 0) {
      return subjectCode;
    }
  }
  return null;
}

function calculateOptimalBlockDuration(
  subject: SubjectWithAllocation,
  availableMinutes: number,
  scaledAllocation: Map<SubjectCode, number>,
  constraints: BlockAllocConstraints
): number {
  // Calculate base duration based on proportional allocation
  const baseDuration = Math.floor(availableMinutes * scaledAllocation.get(subject.subjectCode)!);

  // Apply subject complexity factor (more topics = longer blocks)
  const complexityFactor = Math.min(1.5, Math.max(0.5, subject.topics.length / 10));
  const complexityAdjustedDuration = Math.floor(baseDuration * complexityFactor);

  // Apply constraints
  const dayMaxMinutes = constraints.workingHoursPerDay * 60; // Convert hours to minutes
  const dayMinMinutes = Math.min(30, dayMaxMinutes * 0.1); // At least 10% of day or 30 minutes

  // Ensure duration is within constraints - never exceed daily working hours
  const constrainedDuration = Math.max(
    dayMinMinutes,
    Math.min(dayMaxMinutes, complexityAdjustedDuration)
  );

  // Final safety check - ensure it never exceeds daily working hours
  return Math.min(constrainedDuration, dayMaxMinutes);
}

function findEarliestEndingBlock(activeBlocks: ActiveBlock[]): ActiveBlock {
  if (activeBlocks.length === 0) {
    throw new Error('Cannot find earliest ending block from empty array');
  }
  return activeBlocks.reduce((acc, block) => {
    if (block.endTime.isBefore(acc.endTime)) {
      return block;
    }
    return acc;
  }, activeBlocks[0]);
}

function findNextAvailableTimeSlot(
  startTime: Dayjs,
  durationMinutes: number,
  constraints: BlockAllocConstraints
): Dayjs | null {
  let currentTime = startTime;
  const endTime = startTime.add(30, 'days'); // Reasonable search window

  while (currentTime.isBefore(endTime)) {
    // Check if current time is on a catchup day or test day
    if (isRestrictedDay(currentTime, constraints)) {
      currentTime = currentTime.add(1, 'day').startOf('day');
      continue;
    }

    // Check if we can fit the block within working hours
    const dayStart = currentTime.startOf('day');
    const dayEnd = dayStart.add(constraints.workingHoursPerDay, 'hours');

    // If the block duration exceeds working hours, it's invalid
    if (durationMinutes > constraints.workingHoursPerDay * 60) {
      return null;
    }

    // If we're past working hours for the day, move to next day
    if (currentTime.isAfter(dayEnd.subtract(durationMinutes, 'minutes'))) {
      currentTime = currentTime.add(1, 'day').startOf('day');
      continue;
    }

    // Found available slot
    return currentTime;
  }

  return null; // No available slot found
}

function isRestrictedDay(date: Dayjs, constraints: BlockAllocConstraints): boolean {
  const dayOfWeek = date.day();
  return dayOfWeek === constraints.catchupDay || dayOfWeek === constraints.testDay;
}

function balanceWorkloadAcrossDays(blockSlots: BlockSlot[], constraints: BlockAllocConstraints): BlockSlot[] {
  const maxDailyMinutes = constraints.workingHoursPerDay * 60;
  const optimizedSlots: BlockSlot[] = [];

  // Process blocks in chronological order
  const sortedBlocks = [...blockSlots].sort((a, b) => a.from.diff(b.from));

  for (const block of sortedBlocks) {
    const blockMinutes = block.to.diff(block.from, 'minutes');

    // Find the best day to place this block
    let bestDay = block.from.startOf('day');
    let placed = false;

    // Try to place the block on its original day or later days
    for (let i = 0; i < 30; i++) { // Search up to 30 days ahead
      const candidateDay = bestDay.add(i, 'day');

      // Skip restricted days
      if (isRestrictedDay(candidateDay, constraints)) {
        continue;
      }

      // Check if this day can accommodate the block
      const dayKey = candidateDay.format('YYYY-MM-DD');
      const existingMinutes = optimizedSlots
        .filter(b => b.from.format('YYYY-MM-DD') === dayKey)
        .reduce((sum, b) => sum + b.to.diff(b.from, 'minutes'), 0);

      if (existingMinutes + blockMinutes <= maxDailyMinutes) {
        // Place the block on this day
        const timeShift = candidateDay.diff(block.from.startOf('day'), 'days');
        const shiftedBlock: BlockSlot = {
          cycleType: constraints.cycleType,
          subject: block.subject,
          from: block.from.add(timeShift, 'days'),
          to: block.to.add(timeShift, 'days')
        };
        optimizedSlots.push(shiftedBlock);
        placed = true;
        break;
      }
    }

    // If we couldn't place the block, place it on the original day anyway
    // (This shouldn't happen if the algorithm is working correctly)
    if (!placed) {
      optimizedSlots.push(block);
    }
  }

  return optimizedSlots.sort((a, b) => a.from.diff(b.from));
}

function countCatchupDays(from: Dayjs, to: Dayjs, catchupDay: S2WeekDay) {

  if (to.isBefore(from)) {
    throw new Error('to date must be after from date');
  }

  const days = to.diff(from, 'day');
  // Check how many catchup days are there between from and to
  // use map and filter
  return Array(days).fill(0)
    .map((_, i) => from.add(i, 'day'))
    .filter((date) => date.day() === catchupDay)
    .length;
}

function countTestDays(from: Dayjs, to: Dayjs, testDay: S2WeekDay) {
  if (to.isBefore(from)) {
    throw new Error('to date must be after from date');
  }

  const days = to.diff(from, 'day');
  return Array(days).fill(0)
    .map((_, i) => from.add(i, 'day'))
    .filter((date) => date.day() === testDay)
    .length;
}

