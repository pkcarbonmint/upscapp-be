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
  const maxSlices = Math.min(1000, Math.ceil(timeWindowTo.diff(timeWindowFrom, 'minutes') / SLICE_DURATION_MINUTES));
  
  while (currentTime.isBefore(timeWindowTo) && sliceCount < maxSlices) {
    const dayOfWeek = currentTime.day();
    const isRestricted = dayOfWeek === constraints.catchupDay || dayOfWeek === constraints.testDay;
    
    if (!isRestricted) {
      // Calculate this day's working hours
      const dayStart = currentTime.startOf('day');
      const dayEnd = dayStart.add(constraints.workingHoursPerDay, 'hours');
      
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
    const dayEnd = dayStart.add(constraints.workingHoursPerDay, 'hours');
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
  
  // 4. Simple round-robin assignment
  let sliceIndex = 0;
  let subjectIndex = 0;
  let iterations = 0;
  const maxIterations = timeSlices.length * 2; // Safety limit
  
  while (sliceIndex < timeSlices.length && iterations < maxIterations) {
    const subject = subjectRequirements[subjectIndex];
    
    if (subject.allocatedSlices < subject.requiredSlices) {
      timeSlices[sliceIndex].subjectCode = subject.subjectCode;
      subject.allocatedSlices++;
      sliceIndex++;
    }
    
    subjectIndex = (subjectIndex + 1) % subjectRequirements.length;
    iterations++;
  }
  
  // 5. Group consecutive slices into blocks
  let i = 0;
  while (i < timeSlices.length) {
    const slice = timeSlices[i];
    if (!slice.subjectCode) {
      i++;
      continue;
    }
    
    const blockStartTime = slice.startTime;
    let blockEndTime = slice.endTime;
    let j = i + 1;
    
    // Find consecutive slices of same subject within the same day
    while (j < timeSlices.length && 
           timeSlices[j].subjectCode === slice.subjectCode &&
           timeSlices[j].startTime.format('YYYY-MM-DD') === slice.startTime.format('YYYY-MM-DD')) {
      blockEndTime = timeSlices[j].endTime;
      j++;
    }
    
    // Ensure block doesn't exceed time window
    if (blockEndTime.isAfter(timeWindowTo)) {
      blockEndTime = timeWindowTo;
    }
    
    blockSlots.push({
      cycleType: constraints.cycleType,
      subject: subjectMap[slice.subjectCode],
      from: blockStartTime,
      to: blockEndTime
    });
    
    i = j;
  }

  // Step 6: SCHEDULE OPTIMIZATION - Balance workload across days
  // const optimizedSlots = balanceWorkloadAcrossDays(blockSlots, constraints);

  // Step 7: Handle overflow beyond 'to' date
  const maxDailyMinutes = constraints.workingHoursPerDay * 60;
  const finalSlots = blockSlots.map(block => {
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

