import type { Dayjs } from "dayjs";
import { BlockAllocConstraints, BlockSlot, S2Subject, SubjectCode } from "./types";
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
  // Validate date range
  if (timeWindowTo.isBefore(timeWindowFrom)) {
    throw new Error('to date must be after from date');
  }
  
  const availableDays = timeWindowTo.diff(timeWindowFrom, 'day');
  const availableHours = availableDays * constraints.workingHoursPerDay;
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
  const subjectSliceGroups: Record<SubjectCode, Array<{startTime: Dayjs, endTime: Dayjs}>> = {};
  
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
