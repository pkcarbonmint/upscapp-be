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
  
  // Set defaults for day preferences
  // Default: Saturday for catchup day, Sunday for test day
  const effectiveCatchupDay = catchupDayPreference ?? DayOfWeek.SATURDAY;
  const effectiveTestDay = testDayPreference ?? DayOfWeek.SUNDAY;
  
  // Initialize days array (Sunday=0, Monday=1, ..., Saturday=6)
  const initialDays: DayState[] = Array(7).fill(null).map(() => ({
    dayTasks: [],
    hours: 0
  }));

  // Set day limits based on catchup and test day preferences
  const dayLimits = Array(7).fill(dailyLimits.regular_day);
  
  const catchupDayIndex = getCatchupDayIndex(effectiveCatchupDay);
  const testDayIndex = getTestDayIndex(effectiveTestDay);
  
  if (catchupDayIndex === testDayIndex) {
    // If catchup day and test day are the same, allow test tasks on that day
    dayLimits[catchupDayIndex] = dailyLimits.test_day;
  } else {
    // Set catchup day to 0 hours to prevent non-test tasks
    dayLimits[catchupDayIndex] = 0;
    // Set test day to test day hours
    dayLimits[testDayIndex] = dailyLimits.test_day;
  }

  // Sort tasks by priority (higher priority first)
  const sortedTasks = [...tasks].sort((a, b) => (b.priority || 0) - (a.priority || 0));

  // Distribute tasks
  const finalDays = sortedTasks.reduce((days, task) => 
    distributeTaskToDay(dayLimits, days, task, effectiveCatchupDay, effectiveTestDay), 
    initialDays
  );

  // Convert to DailyPlan format
  // Use 1-based day numbering in the day field (Monday=1, Tuesday=2, ..., Sunday=7) but 0-based array indexing
  const dailyPlans: DailyPlan[] = Array(7).fill(null).map((_, dayNum) => ({
    day: dayNum + 1, // Use 1-based day numbering (Monday=1, Tuesday=2, ..., Sunday=7)
    date: weekStartDate.add(dayNum, 'day'),
    tasks: finalDays[dayNum].dayTasks
  }));

  // Calculate total scheduled hours
  const totalScheduledHours = finalDays.reduce((sum, day) => sum + day.hours, 0);

  // Check for conflicts
  const conflicts = detectSchedulingConflicts(finalDays, dayLimits, effectiveCatchupDay, effectiveTestDay);

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
  const bestDayIndex = findBestSlot(days, dayLimits, task, catchupDayPreference, testDayPreference);
  
  if (bestDayIndex === -1) {
    // If no slot found, try to split the task across multiple days
    return splitTaskAcrossDays(days, task, dayLimits, task.duration_minutes / 60, catchupDayPreference, testDayPreference);
  }

  const newDays = [...days];
  const targetDay = newDays[bestDayIndex];
  
  newDays[bestDayIndex] = {
    dayTasks: [...targetDay.dayTasks, task],
    hours: targetDay.hours + (task.duration_minutes / 60)
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
      
      const proportionalHours = Math.min(
        Math.ceil((daySpaces[i] / daySpaces.reduce((sum, space) => sum + space, 0)) * taskHours),
        remainingHours
      );
      
      if (proportionalHours > 0) {
        newDays[i] = {
          dayTasks: [...newDays[i].dayTasks, { ...task, duration_minutes: proportionalHours * 60 }],
          hours: newDays[i].hours + proportionalHours
        };
        remainingHours -= proportionalHours;
      }
    }
  }
  
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
    // Check for day overload
    if (day.hours > dayLimits[index]) {
      conflicts.push({
        type: 'day_overload',
        message: `Day ${index + 1} exceeds hour limit (${day.hours}/${dayLimits[index]})`,
        affectedTasks: day.dayTasks.map(task => task.task_id),
        affectedDays: [index + 1]
      });
    }
    
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

// Re-export types and enums
export { DayOfWeek } from './types';