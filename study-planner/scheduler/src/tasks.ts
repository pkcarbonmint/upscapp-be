import { DayOfWeek } from './types';

export interface WeeklyTask {
  task_id: string;
  humanReadableId: string;
  title: string;
  duration_minutes: number;
  taskType: 'study' | 'practice' | 'revision' | 'test';
  resources: string[];
  priority?: number;
}

export interface DayState {
  dayTasks: WeeklyTask[];
  hours: number;
}

export interface DailyPlan {
  day: number;
  tasks: WeeklyTask[];
}

export interface DailyHourLimits {
  regular_day: number;
  test_day: number;
}

export interface WeeklyTaskSchedulingInput {
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
  const { tasks, dailyLimits, catchupDayPreference, testDayPreference } = input;
  
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
    // Set catchup day to 0 hours (empty for catchup)
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
  // Map from standard JavaScript day numbering (Sunday=0) to dailyPlans indexing (Monday=0)
  const dayIndexMap = [1, 2, 3, 4, 5, 6, 0]; // [Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday]
  const dailyPlans: DailyPlan[] = dayIndexMap.map((dayNum) => ({
    day: dayIndexMap.indexOf(dayNum) + 1,
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
    const isCatchupDay = (catchupDayIndex === testDayIndex && i === catchupDayIndex) ||
                        (catchupDayIndex !== testDayIndex && i === catchupDayIndex);
    const isTestTask = task.taskType === 'test';
    
    if (isCatchupDay && !isTestTask) {
      continue; // Skip catchup days for non-test tasks
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
  
  // For test tasks, prioritize the test day
  if (task.taskType === 'test' && testDayIndex !== -1) {
    const testDaySlot = availableSlots.find(slot => slot.index === testDayIndex);
    if (testDaySlot) {
      return testDaySlot.index;
    }
  }
  
  // For non-test tasks, find the day with the least current hours (most balanced distribution)
  const bestSlot = availableSlots.reduce((best, current) => {
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
  const isTestTask = task.taskType === 'test';
  
  // Filter out catchup days for non-test tasks
  const daySpaces = days.map((day, index) => {
    const isCatchupDay = (catchupDayIndex === testDayIndex && index === catchupDayIndex) || 
                        (catchupDayIndex !== testDayIndex && index === catchupDayIndex);
    
    if (isCatchupDay && !isTestTask) {
      return 0; // No space for non-test tasks on catchup days
    }
    
    return dayLimits[index] - day.hours;
  });
  
  const totalAvailableSpace = daySpaces.reduce((sum, space) => sum + space, 0);
  
  if (totalAvailableSpace >= taskHours) {
    return distributeTaskProportionally(days, task, taskHours, daySpaces);
  } else {
    // If even total space is insufficient, add to day with most space (emergency fallback)
    // But respect catchup day constraints
    const availableDays = daySpaces
      .map((space, index) => ({ index, space }))
      .filter(({ space }) => space > 0);
    
    if (availableDays.length === 0) {
      // If no available days, force to test day if it's a test task
      if (isTestTask) {
        const newDays = [...days];
        const targetDay = newDays[testDayIndex];
        newDays[testDayIndex] = {
          dayTasks: [...targetDay.dayTasks, task],
          hours: targetDay.hours + taskHours
        };
        return newDays;
      }
      // For non-test tasks, this shouldn't happen as we should have caught this earlier
      return days;
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
  daySpaces: number[]
): DayState[] {
  const newDays = [...days];
  let remainingHours = taskHours;
  
  // Distribute hours proportionally
  for (let i = 0; i < days.length && remainingHours > 0; i++) {
    if (daySpaces[i] > 0) {
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
    const isCatchupDay = (catchupDayIndex === testDayIndex && index === catchupDayIndex) ||
                        (catchupDayIndex !== testDayIndex && index === catchupDayIndex);
    
    if (isCatchupDay) {
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
  });
  
  return conflicts;
}

/**
 * Get catchup day index (0-based)
 */
function getCatchupDayIndex(preference: DayOfWeek): number {
  // Standard JavaScript day numbering (Sunday = 0, Monday = 1, ..., Saturday = 6)
  const dayMap: { [key in DayOfWeek]: number } = {
    [DayOfWeek.SUNDAY]: 0,
    [DayOfWeek.MONDAY]: 1,
    [DayOfWeek.TUESDAY]: 2,
    [DayOfWeek.WEDNESDAY]: 3,
    [DayOfWeek.THURSDAY]: 4,
    [DayOfWeek.FRIDAY]: 5,
    [DayOfWeek.SATURDAY]: 6
  };
  return dayMap[preference];
}

/**
 * Get test day index (0-based)
 */
function getTestDayIndex(preference: DayOfWeek): number {
  // Standard JavaScript day numbering (Sunday = 0, Monday = 1, ..., Saturday = 6)
  const dayMap: { [key in DayOfWeek]: number } = {
    [DayOfWeek.SUNDAY]: 0,
    [DayOfWeek.MONDAY]: 1,
    [DayOfWeek.TUESDAY]: 2,
    [DayOfWeek.WEDNESDAY]: 3,
    [DayOfWeek.THURSDAY]: 4,
    [DayOfWeek.FRIDAY]: 5,
    [DayOfWeek.SATURDAY]: 6
  };
  return dayMap[preference];
}

/**
 * Assign human-readable IDs to all tasks in a week
 */
export function assignHumanReadableIDs(dailyPlans: DailyPlan[], blockNumber: number, weekNumber: number): DailyPlan[] {
  let taskCounter = 1;
  
  return dailyPlans.map(day => ({
    ...day,
    tasks: day.tasks.map(task => ({
      ...task,
      humanReadableId: `b${blockNumber}w${weekNumber}t${taskCounter++}`
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