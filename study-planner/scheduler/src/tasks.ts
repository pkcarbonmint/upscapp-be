import type { Dayjs } from 'dayjs';
import { DailyPlan, DayOfWeek } from './types';

export interface WeeklyTask {
  task_id: string;
  humanReadableId: string;
  title: string;
  duration_minutes: number;
  taskType: 'study' | 'practice' | 'revision' | 'test';
  resources: string[];
  subjectCode: string; // Subject code (e.g., H01, G01, P01) - REQUIRED for proper subject identification
  priority?: number;
}

export interface DayState {
  dayTasks: WeeklyTask[];
  hours: number;
}

export interface DailyHourLimits {
  regular_day: number;
  test_day: number;
}

export interface WeeklyTaskSchedulingInput {
  weekStartDate: Dayjs;
  tasks: WeeklyTask[];
  dailyLimits: DailyHourLimits;
  catchupDayPreference?: DayOfWeek;
  testDayPreference?: DayOfWeek;
}

export interface WeeklyTaskSchedulingResult {
  dailyPlans: DailyPlan[];
  totalScheduledHours: number;
  conflicts: TaskSchedulingConflict[];
}

export interface TaskSchedulingConflict {
  type: 'insufficient_time' | 'task_too_large' | 'day_overload' | 'catchup_day_violation';
  message: string;
  affectedTasks: string[];
  affectedDays: number[];
}

/**
 * Distribute tasks across days of the week
 */
export function distributeTasksIntoDays(
  input: WeeklyTaskSchedulingInput
): WeeklyTaskSchedulingResult {
  const { tasks, dailyLimits, catchupDayPreference, testDayPreference, weekStartDate } = input;
  
  // Add assertions to catch problems early
  console.assert(tasks.length > 0, 'No tasks provided to distributeTasksIntoDays');
  console.assert(dailyLimits.regular_day > 0, `Invalid regular_day limit: ${dailyLimits.regular_day}`);
  console.assert(dailyLimits.test_day > 0, `Invalid test_day limit: ${dailyLimits.test_day}`);
  console.assert(weekStartDate && weekStartDate.isValid(), 'Invalid weekStartDate provided');
  
  // Assert that no task has 0 minutes duration
  tasks.forEach(task => {
    console.assert(task.duration_minutes > 0, `Task ${task.task_id} has 0 minutes duration - this is invalid`);
  });
  
  // Log input for debugging
  console.log(`📊 distributeTasksIntoDays: ${tasks.length} tasks, regular_day=${dailyLimits.regular_day}h, test_day=${dailyLimits.test_day}h`);
  
  // Validate and cap task durations before processing
  const validatedTasks = validateAndCapTaskDurations(tasks, dailyLimits);
  
  // Set defaults for day preferences
  // Default: Saturday for catchup day, Sunday for test day
  const effectiveCatchupDay = catchupDayPreference ?? DayOfWeek.SATURDAY;
  const effectiveTestDay = testDayPreference ?? DayOfWeek.SUNDAY;
  
  // Convert DailyHourLimits object to array of 7 day limits
  // Monday=0, Tuesday=1, ..., Sunday=6
  const catchupDayIndex = getCatchupDayIndex(effectiveCatchupDay);
  const testDayIndex = getTestDayIndex(effectiveTestDay);
  
  console.log(`🔍 Debug: effectiveCatchupDay=${effectiveCatchupDay}, catchupDayIndex=${catchupDayIndex}`);
  console.log(`🔍 Debug: effectiveTestDay=${effectiveTestDay}, testDayIndex=${testDayIndex}`);
  
  const dayLimitsArray: number[] = Array(7).fill(dailyLimits.regular_day);
  dayLimitsArray[testDayIndex] = dailyLimits.test_day;
  dayLimitsArray[catchupDayIndex] = 0; // Catchup day has 0 hours for non-test tasks
  
  console.log(`🔍 Debug: dayLimitsArray=`, dayLimitsArray);
  
  // Initialize days array (Sunday=0, Monday=1, ..., Saturday=6)
  const initialDays: DayState[] = Array(7).fill(null).map(() => ({
    dayTasks: [],
    hours: 0
  }));

  // Log day limits for debugging
  console.log(`📊 Day limits:`, dayLimitsArray.map((limit, index) => {
    const dayName = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][index];
    return `${dayName}: ${limit}h`;
  }).join(', '));

  // Sort tasks by priority (higher priority first)
  const sortedTasks = [...validatedTasks].sort((a, b) => (b.priority || 0) - (a.priority || 0));

  // Log task details for debugging
  console.log(`📋 Tasks to distribute:`, sortedTasks.map(t => `${t.task_id}: ${t.duration_minutes}min (${t.taskType})`));
  
  // Distribute tasks
  let totalTaskHours = 0;
  const finalDays = sortedTasks.reduce((days, task) => {
    console.assert(task.duration_minutes > 0, `Task ${task.task_id} has zero duration: ${task.duration_minutes}min`);
    console.assert(task.duration_minutes <= Math.max(...dayLimitsArray) * 60, `Task ${task.task_id} duration ${task.duration_minutes}min exceeds max daily capacity`);
    
    totalTaskHours += task.duration_minutes / 60;
    return distributeTaskToDay(dayLimitsArray, days, task, effectiveCatchupDay, effectiveTestDay);
  }, initialDays);
  
  // Ensure all tasks were distributed
  console.assert(totalTaskHours > 0, `No task hours to distribute: ${totalTaskHours}`);
  console.log(`📋 Total task hours to distribute: ${totalTaskHours.toFixed(2)}h`);

  // Convert to DailyPlan format
  // Use 1-based day numbering in the day field (Monday=1, Tuesday=2, ..., Sunday=7) but 0-based array indexing
  const dailyPlans: DailyPlan[] = Array(7).fill(null).map((_, dayNum) => ({
    day: dayNum + 1, // Use 1-based day numbering (Monday=1, Tuesday=2, ..., Sunday=7)
    date: weekStartDate.add(dayNum, 'day'),
    tasks: finalDays[dayNum].dayTasks
  }));

  // Calculate total scheduled hours
  const totalScheduledHours = finalDays.reduce((sum, day) => sum + day.hours, 0);

  // Add final validation assertions
  console.log(`📊 Final distribution summary:`);
  let totalAllocatedHours = 0;
  let totalAvailableHours = 0;
  
  finalDays.forEach((day, index) => {
    const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][index];
    const dayLimit = dayLimitsArray[index];
    const dayAllocated = day.hours;
    const dayAvailable = dayLimit;
    
    totalAllocatedHours += dayAllocated;
    totalAvailableHours += dayAvailable;
    
    console.log(`  ${dayName}: ${dayAllocated.toFixed(2)}h/${dayAvailable}h (${day.dayTasks.length} tasks)`);
    
    // Check for day overload - cumulative time validation
    console.assert(dayAllocated <= dayAvailable, `${dayName} exceeds limit: ${dayAllocated}h > ${dayAvailable}h`);
    
    // Calculate cumulative task time to ensure it matches day allocation
    const cumulativeTaskMinutes = day.dayTasks.reduce((sum, task) => sum + task.duration_minutes, 0);
    const cumulativeTaskHours = cumulativeTaskMinutes / 60;
    
    // Assert that cumulative task time equals day allocation (within 0.01 hour tolerance)
    console.assert(
      Math.abs(cumulativeTaskHours - dayAllocated) < 0.01,
      `${dayName} cumulative task time mismatch: tasks=${cumulativeTaskHours.toFixed(2)}h, allocated=${dayAllocated.toFixed(2)}h`
    );
    
    // Assert that cumulative task time does not exceed daily limit
    console.assert(
      cumulativeTaskHours <= dayAvailable,
      `${dayName} cumulative task time exceeds daily limit: ${cumulativeTaskHours.toFixed(2)}h > ${dayAvailable}h`
    );
    
    // Check for invalid task durations
    console.assert(day.dayTasks.every(task => task.duration_minutes > 0), `${dayName} has tasks with zero duration`);
    
    // Check for holes in allocation (except catchup day)
    const catchupDayIdx2 = getCatchupDayIndex(effectiveCatchupDay);
    const testDayIdx2 = getTestDayIndex(effectiveTestDay);
    const isCatchupDay = index === catchupDayIdx2;
    const isTestDay = index === testDayIdx2;
    
    if (!isCatchupDay && !isTestDay) {
      // For regular days, check if allocation is reasonable (not too low)
      const minExpectedAllocation = dayAvailable * 0.5; // At least 50% of available time should be used
      console.assert(dayAllocated >= minExpectedAllocation, 
        `${dayName} has insufficient allocation: ${dayAllocated}h < ${minExpectedAllocation}h (${(minExpectedAllocation/dayAvailable*100).toFixed(1)}% of available)`);
    }
  });
  
  // Check total allocation efficiency
  const allocationEfficiency = totalAllocatedHours / totalAvailableHours;
  console.log(`📈 Total allocation: ${totalAllocatedHours.toFixed(2)}h/${totalAvailableHours.toFixed(2)}h (${(allocationEfficiency*100).toFixed(1)}%)`);
  
  // Ensure reasonable allocation efficiency (at least 70% of available time should be used)
  console.assert(allocationEfficiency >= 0.7, 
    `Low allocation efficiency: ${(allocationEfficiency*100).toFixed(1)}% < 70%. Total allocated: ${totalAllocatedHours}h, Total available: ${totalAvailableHours}h`);
  
  // Check for specific holes in the schedule
  const catchupDayIdx = getCatchupDayIndex(effectiveCatchupDay);
  const testDayIdx = getTestDayIndex(effectiveTestDay);
  
  // Check for consecutive days with low allocation (potential holes)
  for (let i = 0; i < finalDays.length - 1; i++) {
    const currentDay = finalDays[i];
    const nextDay = finalDays[i + 1];
    const currentLimit = dayLimitsArray[i];
    const nextLimit = dayLimitsArray[i + 1];
    
    const currentEfficiency = currentDay.hours / currentLimit;
    const nextEfficiency = nextDay.hours / nextLimit;
    
    // Check for consecutive low-efficiency days (potential holes)
    if (currentEfficiency < 0.3 && nextEfficiency < 0.3 && i !== catchupDayIdx && i !== testDayIdx) {
      console.warn(`⚠️  Potential hole detected: ${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][i]} (${(currentEfficiency*100).toFixed(1)}%) and ${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][i+1]} (${(nextEfficiency*100).toFixed(1)}%) have low allocation`);
    }
  }
  
  // Check for days with zero tasks (except catchup day)
  finalDays.forEach((day, index) => {
    const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][index];
    const isCatchupDay = index === catchupDayIdx;
    
    if (!isCatchupDay && day.dayTasks.length === 0) {
      console.assert(false, `${dayName} has no tasks allocated - this creates a hole in the schedule`);
    }
  });
  
  // Enhanced hole detection - check for days with very low allocation (potential holes)
  finalDays.forEach((day, index) => {
    const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][index];
    const dayLimit = dayLimitsArray[index];
    const dayAllocated = day.hours;
    const isCatchupDay = index === catchupDayIdx;
    const isTestDay = index === testDayIdx;
    
    // For regular days, ensure minimum allocation to prevent holes
    if (!isCatchupDay && !isTestDay) {
      const minHoursThreshold = Math.max(1.0, dayLimit * 0.2); // At least 1 hour or 20% of day limit
      console.assert(
        dayAllocated >= minHoursThreshold,
        `HOLE DETECTED: ${dayName} has insufficient work (${dayAllocated.toFixed(2)}h < ${minHoursThreshold.toFixed(2)}h) - this creates a gap in the schedule`
      );
      
      // Additional check for very low task count
      console.assert(
        day.dayTasks.length >= 1,
        `HOLE DETECTED: ${dayName} has no tasks (${day.dayTasks.length} tasks) - this creates a gap in the schedule`
      );
    }
  });
  
  // Check for conflicts
  const conflicts = detectSchedulingConflicts(finalDays, dayLimitsArray, effectiveCatchupDay, effectiveTestDay);
  
  // Log conflicts for debugging
  if (conflicts.length > 0) {
    console.warn(`⚠️  Scheduling conflicts detected:`, conflicts.map(c => c.message));
  }

  return {
    dailyPlans,
    totalScheduledHours,
    conflicts
  };
}

/**
 * Distribute a single task to the best available day
 */
function distributeTaskToDay(
  dayLimits: number[],
  days: DayState[],
  task: WeeklyTask,
  catchupDayPreference: DayOfWeek,
  testDayPreference: DayOfWeek
): DayState[] {
  const taskHours = task.duration_minutes / 60;
  
  // Add assertions
  console.assert(taskHours > 0, `Task ${task.task_id} has zero hours: ${taskHours}`);
  console.assert(taskHours <= Math.max(...dayLimits), `Task ${task.task_id} hours ${taskHours} exceeds max daily limit ${Math.max(...dayLimits)}`);
  
  const bestDayIndex = findBestSlot(days, dayLimits, task, catchupDayPreference, testDayPreference);
  
  // Ensure task was allocated to a valid day
  console.assert(bestDayIndex >= 0 && bestDayIndex < 7, `Task ${task.task_id} could not be allocated to any day`);
  
  if (bestDayIndex === -1) {
    // If no slot found, try to split the task across multiple days
    return splitTaskAcrossDays(days, task, dayLimits, task.duration_minutes / 60, catchupDayPreference, testDayPreference);
  }

  const newDays = [...days];
  const targetDay = newDays[bestDayIndex];
  const dayLimit = dayLimits[bestDayIndex];
  const newTotalHours = targetDay.hours + (task.duration_minutes / 60);
  
  // Assert that adding this task won't exceed the daily limit
  console.assert(
    newTotalHours <= dayLimit,
    `Adding task ${task.task_id} to day ${bestDayIndex} would exceed limit: ${newTotalHours.toFixed(2)}h > ${dayLimit}h (current: ${targetDay.hours.toFixed(2)}h + task: ${(task.duration_minutes/60).toFixed(2)}h)`
  );
  
  newDays[bestDayIndex] = {
    dayTasks: [...targetDay.dayTasks, task],
    hours: newTotalHours
  };

  return newDays;
}

/**
 * Find the best available slot for a task
 */
function findBestSlot(
  days: DayState[],
  limits: number[],
  task: WeeklyTask,
  catchupDayPreference: DayOfWeek,
  testDayPreference: DayOfWeek
): number {
  const catchupDayIndex = getCatchupDayIndex(catchupDayPreference);
  const testDayIndex = getTestDayIndex(testDayPreference);
  
  // Find all available slots
  const availableSlots: { index: number; availableSpace: number; currentHours: number }[] = [];
  
  for (let i = 0; i < days.length; i++) {
    // Check catchup day restrictions
    const isCatchupDay = i === catchupDayIndex;
    
    // If it's a catchup day and test day are different, no tasks allowed on catchup day
    if (isCatchupDay && catchupDayIndex !== testDayIndex) {
      continue; // Skip catchup day completely when it's different from test day
    }
    
    // If it's a catchup day and test day are the same, only allow test tasks
    if (isCatchupDay && catchupDayIndex === testDayIndex && task.taskType !== 'test') {
      continue; // Skip catchup day for non-test tasks even when it's also test day
    }
    
    const availableSpace = limits[i] - days[i].hours;
    if (availableSpace >= (task.duration_minutes / 60)) {
      availableSlots.push({
        index: i,
        availableSpace,
        currentHours: days[i].hours
      });
    }
  }
  
  if (availableSlots.length === 0) {
    return -1; // No suitable slot found
  }
  
  // For test tasks, check if there's already a test task for the same subject on the test day
  if (task.taskType === 'test' && testDayIndex !== -1) {
    const testDaySlot = availableSlots.find(slot => slot.index === testDayIndex);
    if (testDaySlot) {
      // Check if there's already a test task for the same subject on the test day
      const existingTestTasks = days[testDayIndex].dayTasks.filter(t => t.taskType === 'test');
      const hasSameSubjectTest = existingTestTasks.some(existingTask => {
        return existingTask.subjectCode === task.subjectCode;
      });
      
      // If no test task for same subject exists on test day, use it
      if (!hasSameSubjectTest) {
        return testDaySlot.index;
      }
    }
  }
  
  // For all tasks (including test tasks that can't go to test day), find the day with the least current hours
  // But ensure catchup day gets some tasks if other days are getting too full
  const bestSlot = availableSlots.reduce((best, current) => {
    const isCurrentCatchupDay = current.index === catchupDayIndex;
    const isBestCatchupDay = best.index === catchupDayIndex;
    
    // If current is catchup day and best is not, prefer catchup day if other days are getting full
    if (isCurrentCatchupDay && !isBestCatchupDay) {
      const otherDaysAverageHours = days
        .filter((_, dayIndex) => dayIndex !== catchupDayIndex)
        .reduce((sum, day) => sum + day.hours, 0) / 6;
      
      // If other days average more than 5 hours, use catchup day
      if (otherDaysAverageHours > 5) {
        return current;
      }
    }
    
    // Otherwise, use the day with least hours
    if (current.currentHours < best.currentHours) {
      return current;
    }
    return best;
  });
  
  return bestSlot.index;
}

/**
 * Split a task across multiple days when it doesn't fit in a single day
 */
function splitTaskAcrossDays(
  days: DayState[],
  task: WeeklyTask,
  dayLimits: number[],
  taskHours: number,
  catchupDayPreference: DayOfWeek,
  testDayPreference: DayOfWeek
): DayState[] {
  // Add assertions
  console.assert(taskHours > 0, `splitTaskAcrossDays: Task ${task.task_id} has zero hours: ${taskHours}`);
  console.assert(taskHours <= Math.max(...dayLimits), `splitTaskAcrossDays: Task ${task.task_id} hours ${taskHours} exceeds max daily limit`);
  
  const catchupDayIndex = getCatchupDayIndex(catchupDayPreference);
  const testDayIndex = getTestDayIndex(testDayPreference);
  
  // Calculate available space for each day
  const daySpaces = days.map((day, index) => {
    // Check catchup day restrictions
    const isCatchupDay = index === catchupDayIndex;
    
    // If it's a catchup day and test day are different, no tasks allowed on catchup day
    if (isCatchupDay && catchupDayIndex !== testDayIndex) {
      return 0; // No space for any tasks on catchup day when it's different from test day
    }
    
    // If it's a catchup day and test day are the same, only allow test tasks
    if (isCatchupDay && catchupDayIndex === testDayIndex && task.taskType !== 'test') {
      return 0; // No space for non-test tasks on catchup day even when it's also test day
    }
    
    return dayLimits[index] - day.hours;
  });
  
  const totalAvailableSpace = daySpaces.reduce((sum, space) => sum + space, 0);
  
  if (totalAvailableSpace >= taskHours) {
    return distributeTaskProportionally(days, task, taskHours, daySpaces, catchupDayPreference, testDayPreference);
  } else {
    // If even total space is insufficient, add to day with most space (emergency fallback)
    // But respect catchup day constraints
    const availableDays = daySpaces
      .map((space, index) => ({ index, space }))
      .filter(({ space }) => space > 0);
    
    if (availableDays.length === 0) {
      // If no available days, force to the day with most space (emergency fallback)
      const dayWithMostSpace = days.reduce((best, day, index) => 
        dayLimits[index] - day.hours > dayLimits[best] - days[best].hours ? index : best, 0
      );
      
      const newDays = [...days];
      const targetDay = newDays[dayWithMostSpace];
      newDays[dayWithMostSpace] = {
        dayTasks: [...targetDay.dayTasks, task],
        hours: targetDay.hours + taskHours
      };
      return newDays;
    }
    
    const bestDayIndex = availableDays.reduce((best, current) => 
      current.space > best.space ? current : best
    ).index;
    
    const newDays = [...days];
    const targetDay = newDays[bestDayIndex];
    newDays[bestDayIndex] = {
      dayTasks: [...targetDay.dayTasks, task],
      hours: targetDay.hours + taskHours
    };
    return newDays;
  }
}

/**
 * Distribute task proportionally across available days
 */
function distributeTaskProportionally(
  days: DayState[],
  task: WeeklyTask,
  taskHours: number,
  daySpaces: number[],
  catchupDayPreference?: DayOfWeek,
  testDayPreference?: DayOfWeek
): DayState[] {
  // Add assertions
  console.assert(taskHours > 0, `distributeTaskProportionally: Task ${task.task_id} has zero hours: ${taskHours}`);
  console.assert(daySpaces.length === 7, `distributeTaskProportionally: Invalid daySpaces length: ${daySpaces.length}`);
  console.assert(daySpaces.every(space => space >= 0), `distributeTaskProportionally: Negative day spaces detected`);
  
  const newDays = [...days];
  let remainingHours = taskHours;
  
  // Distribute hours proportionally
  for (let i = 0; i < days.length && remainingHours > 0; i++) {
    if (daySpaces[i] > 0) {
      // Check catchup day restrictions
      if (catchupDayPreference && testDayPreference) {
        const catchupDayIndex = getCatchupDayIndex(catchupDayPreference);
        const testDayIndex = getTestDayIndex(testDayPreference);
        const isCatchupDay = i === catchupDayIndex;
        
        // If it's a catchup day and test day are different, no tasks allowed on catchup day
        if (isCatchupDay && catchupDayIndex !== testDayIndex) {
          continue; // Skip catchup day completely when it's different from test day
        }
        
        // If it's a catchup day and test day are the same, only allow test tasks
        if (isCatchupDay && catchupDayIndex === testDayIndex && task.taskType !== 'test') {
          continue; // Skip catchup day for non-test tasks even when it's also test day
        }
      }
      
      const totalAvailableSpace = daySpaces.reduce((sum, space) => sum + space, 0);
      const proportionalHours = Math.min(
        Math.ceil((daySpaces[i] / totalAvailableSpace) * taskHours),
        remainingHours,
        daySpaces[i] // Respect daily capacity
      );
      
      // Ensure minimum 30 minutes (0.5 hours) for any task slice
      const minHours = 0.5;
      const finalHours = Math.max(minHours, proportionalHours);
      
      if (finalHours > 0 && finalHours <= daySpaces[i]) {
        const newTotalHours = newDays[i].hours + finalHours;
        
        // Assert that adding this task slice won't exceed the daily limit
        console.assert(
          newTotalHours <= daySpaces[i],
          `Adding task slice ${task.task_id} to day ${i} would exceed limit: ${newTotalHours.toFixed(2)}h > ${daySpaces[i]}h (current: ${newDays[i].hours.toFixed(2)}h + slice: ${finalHours.toFixed(2)}h)`
        );
        
        newDays[i] = {
          dayTasks: [...newDays[i].dayTasks, { ...task, duration_minutes: Math.round(finalHours * 60) }],
          hours: newTotalHours
        };
        remainingHours -= finalHours;
      }
    }
  }
  
  // Ensure task was properly distributed
  const totalDistributed = taskHours - remainingHours;
  console.assert(totalDistributed > 0, `Task ${task.task_id} was not distributed across any days`);
  console.assert(Math.abs(totalDistributed - taskHours) < 0.1, `Task ${task.task_id} distribution mismatch: expected ${taskHours}h, got ${totalDistributed}h`);
  
  return newDays;
}

/**
 * Detect scheduling conflicts
 */
function detectSchedulingConflicts(
  days: DayState[],
  dayLimits: number[],
  catchupDayPreference: DayOfWeek,
  testDayPreference: DayOfWeek
): TaskSchedulingConflict[] {
  const conflicts: TaskSchedulingConflict[] = [];
  const catchupDayIndex = getCatchupDayIndex(catchupDayPreference);
  const testDayIndex = getTestDayIndex(testDayPreference);
  
  days.forEach((day, index) => {
    // Calculate cumulative task time
    const cumulativeTaskMinutes = day.dayTasks.reduce((sum, task) => sum + task.duration_minutes, 0);
    const cumulativeTaskHours = cumulativeTaskMinutes / 60;
    
    // Check for day overload
    if (day.hours > dayLimits[index]) {
      conflicts.push({
        type: 'day_overload',
        message: `Day ${index + 1} exceeds hour limit (${day.hours.toFixed(2)}/${dayLimits[index]})`,
        affectedTasks: day.dayTasks.map(task => task.task_id),
        affectedDays: [index + 1]
      });
    }
    
    // Check for cumulative task time exceeding daily limit
    if (cumulativeTaskHours > dayLimits[index]) {
      conflicts.push({
        type: 'day_overload',
        message: `Day ${index + 1} cumulative task time exceeds limit (${cumulativeTaskHours.toFixed(2)}/${dayLimits[index]})`,
        affectedTasks: day.dayTasks.map(task => task.task_id),
        affectedDays: [index + 1]
      });
    }
    
    // Check for mismatch between allocated hours and cumulative task time
    if (Math.abs(cumulativeTaskHours - day.hours) > 0.01) {
      conflicts.push({
        type: 'day_overload',
        message: `Day ${index + 1} task time mismatch: allocated=${day.hours.toFixed(2)}h, cumulative=${cumulativeTaskHours.toFixed(2)}h`,
        affectedTasks: day.dayTasks.map(task => task.task_id),
        affectedDays: [index + 1]
      });
    }
    
    // Check for invalid task durations
    day.dayTasks.forEach(task => {
      if (task.duration_minutes <= 0) {
        conflicts.push({
          type: 'task_too_large',
          message: `Task ${task.task_id} has invalid duration: ${task.duration_minutes} minutes`,
          affectedTasks: [task.task_id],
          affectedDays: [index + 1]
        });
      }
      if (task.duration_minutes > dayLimits[index] * 60) {
        conflicts.push({
          type: 'task_too_large',
          message: `Task ${task.task_id} exceeds daily limit: ${task.duration_minutes} minutes (${dayLimits[index]} hours)`,
          affectedTasks: [task.task_id],
          affectedDays: [index + 1]
        });
      }
    });
    
    // Check for catchup day violations
    const isCatchupDay = index === catchupDayIndex;
    
    if (isCatchupDay) {
      // If catchup day and test day are different, no non-test tasks allowed
      if (catchupDayIndex !== testDayIndex) {
        const nonTestTasks = day.dayTasks.filter(task => task.taskType !== 'test');
        if (nonTestTasks.length > 0) {
        conflicts.push({
          type: 'catchup_day_violation',
          message: `Day ${index + 1} is a catchup day but has non-test tasks scheduled`,
          affectedTasks: nonTestTasks.map(task => task.task_id),
          affectedDays: [index + 1]
        });
        }
      }
      // If catchup day and test day are the same, only test tasks allowed
      else {
        const nonTestTasks = day.dayTasks.filter(task => task.taskType !== 'test');
        if (nonTestTasks.length > 0) {
        conflicts.push({
          type: 'catchup_day_violation',
          message: `Day ${index + 1} is a catchup day but has non-test tasks scheduled`,
          affectedTasks: nonTestTasks.map(task => task.task_id),
          affectedDays: [index + 1]
        });
        }
      }
    }
  });
  
  return conflicts;
}

/**
 * Get catchup day index (0-based)
 */
function getCatchupDayIndex(preference: DayOfWeek): number {
  // Test expects Monday=0, Tuesday=1, ..., Sunday=6
  const dayMap: { [key in DayOfWeek]: number } = {
    [DayOfWeek.MONDAY]: 0,
    [DayOfWeek.TUESDAY]: 1,
    [DayOfWeek.WEDNESDAY]: 2,
    [DayOfWeek.THURSDAY]: 3,
    [DayOfWeek.FRIDAY]: 4,
    [DayOfWeek.SATURDAY]: 5,
    [DayOfWeek.SUNDAY]: 6
  };
  return dayMap[preference];
}

/**
 * Get test day index (0-based)
 */
function getTestDayIndex(preference: DayOfWeek): number {
  // Test expects Monday=0, Tuesday=1, ..., Sunday=6
  const dayMap: { [key in DayOfWeek]: number } = {
    [DayOfWeek.MONDAY]: 0,
    [DayOfWeek.TUESDAY]: 1,
    [DayOfWeek.WEDNESDAY]: 2,
    [DayOfWeek.THURSDAY]: 3,
    [DayOfWeek.FRIDAY]: 4,
    [DayOfWeek.SATURDAY]: 5,
    [DayOfWeek.SUNDAY]: 6
  };
  return dayMap[preference];
}

/**
 * Assign human-readable IDs to all tasks in a week
 * Format: {subjectCode}w{weekNumber}t{taskCounter}
 * Example: H01w1t1, G01w1t2, P01w1t3
 */
export function assignHumanReadableIDs(dailyPlans: DailyPlan[], _blockNumber: number, weekNumber: number): DailyPlan[] {
  let taskCounter = 1;
  
  return dailyPlans.map(day => ({
    ...day,
    tasks: day.tasks.map(task => ({
      ...task,
      humanReadableId: `${task.subjectCode}w${weekNumber}t${taskCounter++}`
    }))
  }));
}

/**
 * Create a weekly plan from daily plans
 */
export function createWeeklyPlan(dailyPlans: DailyPlan[], weekNumber: number): {
  week: number;
  daily_plans: DailyPlan[];
  total_hours: number;
  task_count: number;
} {
  const totalHours = dailyPlans.reduce((sum, day) => 
    sum + day.tasks.reduce((daySum, task) => daySum + (task.duration_minutes / 60), 0), 0
  );
  
  const taskCount = dailyPlans.reduce((sum, day) => sum + day.tasks.length, 0);
  
  return {
    week: weekNumber,
    daily_plans: dailyPlans,
    total_hours: totalHours,
    task_count: taskCount
  };
}

/**
 * Validate and cap task durations to respect daily limits
 */
function validateAndCapTaskDurations(tasks: WeeklyTask[], dailyLimits: DailyHourLimits): WeeklyTask[] {
  const maxTaskDurationMinutes = Math.min(
    dailyLimits.regular_day * 60, // Cap at regular day limit
    dailyLimits.test_day * 60     // Cap at test day limit
  );
  
  const minTaskDurationMinutes = 30; // Minimum 30 minutes per task
  
  // Add assertions to catch problems early
  console.assert(maxTaskDurationMinutes > 0, `Invalid daily limits: regular_day=${dailyLimits.regular_day}, test_day=${dailyLimits.test_day}`);
  console.assert(minTaskDurationMinutes > 0, `Invalid minimum task duration: ${minTaskDurationMinutes}`);
  
  return tasks.map(task => {
    let validatedDuration = task.duration_minutes;
    
    // Add assertion for original task duration
    console.assert(
      task.duration_minutes >= 0,
      `Task ${task.task_id} has negative duration: ${task.duration_minutes} minutes`
    );
    console.assert(
      task.duration_minutes > 0,
      `Task ${task.task_id} has 0 minutes duration - this is invalid`
    );
    
    // Ensure minimum duration
    if (validatedDuration < minTaskDurationMinutes) {
      console.warn(`Task ${task.task_id} duration too small (${validatedDuration}min), capping to ${minTaskDurationMinutes}min`);
      validatedDuration = minTaskDurationMinutes;
    }
    
    // Cap at daily limit
    if (validatedDuration > maxTaskDurationMinutes) {
      console.warn(`Task ${task.task_id} duration too large (${validatedDuration}min), capping to ${maxTaskDurationMinutes}min`);
      validatedDuration = maxTaskDurationMinutes;
    }
    
    // Round to nearest 15 minutes for cleaner scheduling
    validatedDuration = Math.round(validatedDuration / 15) * 15;
    
    // Final assertion
    console.assert(
      validatedDuration >= minTaskDurationMinutes && validatedDuration <= maxTaskDurationMinutes,
      `Task ${task.task_id} final duration ${validatedDuration}min is outside valid range [${minTaskDurationMinutes}, ${maxTaskDurationMinutes}]`
    );
    
    return {
      ...task,
      duration_minutes: validatedDuration
    };
  });
}

// Re-export types and enums
export { DayOfWeek } from './types';