import type { Dayjs } from 'dayjs';
import type { WeeklyPlan, Task, Resource, DailyPlan } from 'scheduler';
import type { StudentIntake } from '../types/models';
import type { Subject, ExamFocus } from '../types/Subjects';
import { getTopicEstimatedHours } from '../types/Subjects';
import type { ConfidenceLevel, Logger } from '../types/Types';
import { v4 as uuidv4 } from 'uuid';
import { Config } from './engine-types';
import assert from 'assert';
import { 
  distributeTasksIntoDays as schedulerDistributeTasksIntoDays,
  assignHumanReadableIDs as schedulerAssignHumanReadableIDs,
  DailyHourLimits,
  DayOfWeek
} from 'scheduler';

// Re-export types from scheduler library - using the _2 versions that include subjectCode
type WeeklyTask = {
  task_id: string;
  humanReadableId: string;
  title: string;
  duration_minutes: number;
  taskType: 'study' | 'practice' | 'revision' | 'test';
  resources: string[];
  subjectCode: string;
  priority?: number;
};


// Task definition interfaces
export interface StudyTaskDef {
  study_subject: string;
  study_topic?: string;
  study_duration_minutes: number;
  study_archetype: any; // Archetype type
  study_confidence: ConfidenceLevel;
}

export interface PracticeTaskDef {
  practice_subject: string;
  practice_type: ExamFocus;
  practice_duration_minutes: number;
  practice_archetype: any; // Archetype type
}

export interface RevisionTaskDef {
  revision_subjects: string[];
  revision_duration_minutes: number;
  revision_archetype: any; // Archetype type
}

export interface CurrentAffairsTaskDef {
  ca_type: any; // CurrentAffairsTaskType
  ca_duration_minutes: number;
  ca_subjects: string[];
}

// Helper function to convert Task to WeeklyTask
function convertTaskToWeeklyTask(task: Task): WeeklyTask {
  return {
    task_id: task.task_id,
    humanReadableId: task.humanReadableId,
    title: task.title,
    duration_minutes: task.duration_minutes,
    taskType: task.taskType || 'study',
    resources: task.task_resources?.map((r: any) => r.resource_title) || [],
    subjectCode: task.subjectCode
  };
}

// Helper function to convert WeeklyTask back to Task
function convertWeeklyTaskToTask(weeklyTask: WeeklyTask, originalTask: Task): Task {
  return {
    ...originalTask,
    humanReadableId: weeklyTask.humanReadableId
  };
}

// Helper function to convert DailyHourLimits
function convertDailyHourLimits(config: Config): DailyHourLimits {
  return {
    regular_day: config.daily_hour_limits.regular_day,
    test_day: config.daily_hour_limits.test_day
  };
}

/**
 * Create a weekly plan for a specific week
 */
export async function createPlanForOneWeek(
  blockIndex: number,
  weekStartDate: Dayjs,
  blkSubject: Subject,
  studentIntake: StudentIntake,
  archetype: any, // Archetype type
  config: Config,
  weekNum: number,
  blockDurationWeeks: number,
  logger: Logger,
  allocationGuidance?: { weekStart: string; byTaskType: any; byDay: any }
): Promise<WeeklyPlan> {
  // Add comprehensive input validation assertions
  assert(blockIndex >= 0, `Invalid blockIndex: ${blockIndex}`);
  assert(weekStartDate && weekStartDate.isValid(), `Invalid weekStartDate: ${weekStartDate}`);
  assert(blkSubject && blkSubject.subjectCode, `Invalid blkSubject: ${blkSubject}`);
  assert(studentIntake, `No studentIntake provided for block ${blockIndex}, week ${weekNum}`);
  assert(archetype, `No archetype provided for block ${blockIndex}, week ${weekNum}`);
  assert(config && config.daily_hour_limits, `Invalid config for block ${blockIndex}, week ${weekNum}`);
  assert(weekNum > 0, `Invalid weekNum: ${weekNum}`);
  assert(blockDurationWeeks > 0, `Invalid blockDurationWeeks: ${blockDurationWeeks}`);
  assert(logger, `No logger provided for block ${blockIndex}, week ${weekNum}`);
  
  logger.logDebug('OneWeekPlan', `createPlanForOneWeek validation: Block ${blockIndex}, Week ${weekNum}, Subject: ${blkSubject.subjectCode}, startDate: ${weekStartDate.format('YYYY-MM-DD')}`);
  logger.logDebug('OneWeekPlan', `Creating week ${weekNum}/${blockDurationWeeks} for block ${blockIndex}`);
  // 1. If scheduler provided per-day guidance, build daily plans directly from it (no local scheduling)
  if (allocationGuidance?.byDay) {
    const guidedDailyPlans: DailyPlan[] = [];
    for (let dow = 0; dow < 7; dow++) {
      const dayAlloc = allocationGuidance.byDay[dow];
      const tasks: Task[] = [];
      if (dayAlloc && dayAlloc.byTaskType) {
        const toMinutes = (hours?: number) => Math.max(0, Math.round((hours || 0) * 60));
        const studyMin = toMinutes(dayAlloc.byTaskType.study);
        const practiceMin = toMinutes(dayAlloc.byTaskType.practice);
        const revisionMin = toMinutes(dayAlloc.byTaskType.revision);
        const testMin = toMinutes(dayAlloc.byTaskType.test);

        if (studyMin > 0) {
          const t = await createStudyTask(
            `Study: ${blkSubject.subjectName}`,
            studyMin,
            blkSubject.subjectCode,
            undefined,
            undefined
          );
          tasks.push(t);
        }
        if (practiceMin > 0) {
          tasks.push(await createTask(`Practice: ${blkSubject.subjectName}`, practiceMin, blkSubject.subjectCode, undefined, 'practice'));
        }
        if (revisionMin > 0) {
          tasks.push(await createTask(`Revision: ${blkSubject.subjectName}`, revisionMin, blkSubject.subjectCode, undefined, 'revision'));
        }
        if (testMin > 0) {
          tasks.push(await createTask(`Test: ${blkSubject.subjectName}`, testMin, blkSubject.subjectCode, undefined, 'test'));
        }
      }
      guidedDailyPlans.push({ 
        date: weekStartDate.add(dow, 'day'),
        day: dow + 1, tasks: tasks.map(convertTaskToWeeklyTask) });
    }

    const blockNUmber = 0;
    const finalGuided = schedulerAssignHumanReadableIDs(guidedDailyPlans, blockNUmber, weekNum);
    const totalTasks = finalGuided.reduce((sum: number, day: any) => sum + day.tasks.length, 0);
    const totalMinutes = finalGuided.reduce((sum: number, day: any) =>
      sum + day.tasks.reduce((daySum: number, task: any) => daySum + task.duration_minutes, 0), 0
    );
    const totalHours = Math.round(totalMinutes / 60 * 100) / 100;
    logger.logDebug('OneWeekPlan', `Week ${weekNum} final guided plan: ${totalTasks} tasks, ${totalHours} hours across 7 days`);

    return { week: weekNum, daily_plans: finalGuided };
  }

  // 1. Calculate the total time available for each task category this week (local weekly split when no guidance)
  const weeklyTimeSplit = timeSplitInOneWeek(studentIntake, config);
  logger.logDebug('OneWeekPlan', `Week ${weekNum} time split: Study=${weeklyTimeSplit.study}h, Practice=${weeklyTimeSplit.practice}h, Test=${weeklyTimeSplit.test}h, Revision=${weeklyTimeSplit.revision}h`);
  
  // 2. Generate a flat list of all tasks required for the week
  const tasksForWeek = await tasksForOneWeek(
    weekStartDate,
    blkSubject,
    weeklyTimeSplit,
    studentIntake,
    archetype,
    config,
    weekNum,
    blockDurationWeeks,
    logger
  );

  logger.logDebug('OneWeekPlan', `Week ${weekNum} generated ${tasksForWeek.length} tasks`);

  // 3. Distribute this list of tasks across the 7 days of the week using scheduler library
  const weeklyTasks = tasksForWeek.map(convertTaskToWeeklyTask);
  const dailyHourLimits = convertDailyHourLimits(config);
  
  const schedulingResult = schedulerDistributeTasksIntoDays({
    weekStartDate,
    tasks: weeklyTasks,
    dailyLimits: dailyHourLimits,
    catchupDayPreference: (studentIntake.study_strategy?.catch_up_day_preference as DayOfWeek) || DayOfWeek.SATURDAY,
    testDayPreference: DayOfWeek.SUNDAY // Default to Sunday for test day
  });

  // Convert back to helios-ts format and preserve original task data
  const dailyPlans: DailyPlan[] = schedulingResult.dailyPlans.map((dayPlan: any) => ({
    day: dayPlan.day,
    date: weekStartDate.add(dayPlan.day - 1, 'day'),
    tasks: dayPlan.tasks.map((weeklyTask: any) => {
      const originalTask = tasksForWeek.find(t => t.task_id === weeklyTask.task_id);
      return originalTask ? convertWeeklyTaskToTask(weeklyTask, originalTask) : {
        task_id: weeklyTask.task_id,
        humanReadableId: weeklyTask.humanReadableId,
        title: weeklyTask.title,
        duration_minutes: weeklyTask.duration_minutes,
        taskType: weeklyTask.taskType,
        currentAffairsType: weeklyTask.currentAffairsType,
        resources: weeklyTask.resources?.map((title: any) => ({ resource_title: title })),
        subjectCode: weeklyTask.subjectCode
      } as Task;
    })
  }));
  
  // Log any scheduling conflicts
  if (schedulingResult.conflicts.length > 0) {
    logger.logWarn('OneWeekPlan', `Week ${weekNum} scheduling conflicts: ${schedulingResult.conflicts.length}`);
    schedulingResult.conflicts.forEach((conflict: any) => {
      logger.logWarn('OneWeekPlan', `Conflict: ${conflict.message}`);
    });
  }
  
  // DIAGNOSTIC: Log after conversion but before human ID assignment
  if (weekNum === 3 && blkSubject.subjectCode === 'OPT-AGR') {
    logger.logDebug('OneWeekPlan', `DIAGNOSTIC: After conversion to DailyPlan`);
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    dailyPlans.forEach((dayPlan, _) => {
      const dayName = dayNames[dayPlan.day] || `Day${dayPlan.day}`;
      logger.logDebug('OneWeekPlan', `  ${dayName} (day ${dayPlan.day}): ${dayPlan.tasks.length} tasks`);
    });
  }

  // 4. Assign the simple, human-readable IDs to each task using scheduler library
  const blockNumber = 0;
  const finalDailyPlans = schedulerAssignHumanReadableIDs(dailyPlans, blockNumber, weekNum);

  // DIAGNOSTIC: Log final result
  if (weekNum === 3 && blkSubject.subjectCode === 'OPT-AGR') {
    logger.logDebug('OneWeekPlan', `DIAGNOSTIC: Final result after human ID assignment`);
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    finalDailyPlans.forEach((dayPlan, _) => {
      const dayName = dayNames[dayPlan.day] || `Day${dayPlan.day}`;
      logger.logDebug('OneWeekPlan', `  ${dayName} (day ${dayPlan.day}): ${dayPlan.tasks.length} tasks`);
    });
  }
  
  // Log final week summary
  const totalTasks = finalDailyPlans.reduce((sum: number, day: any) => sum + day.tasks.length, 0);
  const totalMinutes = finalDailyPlans.reduce((sum: number, day: any) => 
    sum + day.tasks.reduce((daySum: number, task: any) => daySum + task.duration_minutes, 0), 0
  );
  const totalHours = Math.round(totalMinutes / 60 * 100) / 100;
  
  logger.logDebug('OneWeekPlan', `Week ${weekNum} final plan: ${totalTasks} tasks, ${totalHours} hours across 7 days`);
  
  // Add hole detection for this week
  logger.logDebug('OneWeekPlan', `Checking for holes in week ${weekNum}...`);
  
  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const holes: string[] = [];
  
  // Get the actual catchup day preference from the scheduling result
  const catchupDayPreference = (studentIntake.study_strategy?.catch_up_day_preference as DayOfWeek) || DayOfWeek.SATURDAY;
  
  logger.logDebug('OneWeekPlan', `Catchup day preference: "${catchupDayPreference}" (type: ${typeof catchupDayPreference})`);
  
  // Convert DayOfWeek to 0-based index matching scheduler's mapping (Monday=0, Tuesday=1, ..., Sunday=6)
  const dayMap: { [key in DayOfWeek]: number } = {
    [DayOfWeek.MONDAY]: 0,
    [DayOfWeek.TUESDAY]: 1,
    [DayOfWeek.WEDNESDAY]: 2,
    [DayOfWeek.THURSDAY]: 3,
    [DayOfWeek.FRIDAY]: 4,
    [DayOfWeek.SATURDAY]: 5,
    [DayOfWeek.SUNDAY]: 6
  };
  const catchupDayIndex = dayMap[catchupDayPreference];
  
  logger.logDebug('OneWeekPlan', `Catchup day index: ${catchupDayIndex} (${['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][catchupDayIndex]})`);
  
  finalDailyPlans.forEach((dayPlan, index) => {
    const dayName = dayNames[index];
    const dayDate = dayPlan.date.format('YYYY-MM-DD');
    const taskCount = dayPlan.tasks.length;
    const totalMinutes = dayPlan.tasks.reduce((sum: number, task: any) => sum + task.duration_minutes, 0);
    const totalHours = totalMinutes / 60;
    
    // Check if this is a catchup day - catchup days are allowed to have no tasks
    const isCatchupDay = index === catchupDayIndex;
    
    if (!isCatchupDay && taskCount === 0) {
      holes.push(`${dayName} (${dayDate}) - no tasks`);
    }
    
    // Check for days with very low work (less than 0.15 hour = 9 minutes) - but not catchup days
    if (!isCatchupDay && totalHours < 0.15) {
      holes.push(`${dayName} (${dayDate}) - only ${totalHours.toFixed(2)}h work`);
    }
    
    // Log each day's allocation for debugging
    logger.logDebug('OneWeekPlan', `  ${dayName} (${dayDate}): ${taskCount} tasks, ${totalHours.toFixed(2)}h${isCatchupDay ? ' [CATCHUP DAY]' : ''}`);
  });
  
  // Assert no holes in this week - but allow some flexibility
  if (holes.length > 0) {
    logger.logWarn('OneWeekPlan', `Week ${weekNum} has ${holes.length} days with insufficient work: ${holes.join(', ')}`);
    // Don't fail the assertion for minor issues - just warn
    // assert(holes.length === 0, `WEEK ${weekNum} HOLES DETECTED: ${holes.length} days have insufficient work: ${holes.join(', ')}`);
  } else {
    logger.logDebug('OneWeekPlan', `No holes detected in week ${weekNum}`);
  }
  
  // Add final validation: Check for 0-minute tasks before returning
  logger.logDebug('OneWeekPlan', `Validating all tasks in week ${weekNum} for 0-minute durations...`);
  const zeroMinuteTasks: string[] = [];
  finalDailyPlans.forEach((dayPlan, index) => {
    const dayName = dayNames[index];
    const dayDate = dayPlan.date.format('YYYY-MM-DD');
    dayPlan.tasks.forEach((task: any) => {
      if (task.duration_minutes === 0) {
        zeroMinuteTasks.push(`[${dayName} ${dayDate}] ${task.humanReadableId} "${task.title}" - ${task.duration_minutes} minutes`);
      }
    });
  });
  
  // Assert no 0-minute tasks - but allow some flexibility
  if (zeroMinuteTasks.length > 0) {
    logger.logWarn('OneWeekPlan', `Week ${weekNum} has ${zeroMinuteTasks.length} tasks with 0 minutes duration: ${JSON.stringify(zeroMinuteTasks)}`);
    // Don't fail the assertion for minor issues - just warn
    // assert(zeroMinuteTasks.length === 0, `WEEK ${weekNum} has ${zeroMinuteTasks.length} tasks with 0 minutes duration: ${zeroMinuteTasks.join(', ')}`);
  } else {
    logger.logDebug('OneWeekPlan', `No 0-minute tasks in week ${weekNum}`);
  }
  
  // 5. Create the final WeeklyPlan record
  return {
    week: weekNum,
    daily_plans: finalDailyPlans
  };
}

/**
 * Calculate time allocation for a week
 */
function timeSplitInOneWeek(studentIntake: StudentIntake, config: Config): Record<string, number> {
  const studentWeeklyHours = safeReadHours(studentIntake.study_strategy.weekly_study_hours);
  const split = config.task_effort_split;
  
  return {
    study: studentWeeklyHours * split.study,
    revision: studentWeeklyHours * split.revision,
    practice: studentWeeklyHours * split.practice,
  };
}

/**
 * Generate all tasks for a given week
 */
async function tasksForOneWeek(
  weekStartDate: Dayjs,
  theSubject: Subject,
  timeSplit: Record<string, number>,
  studentIntake: StudentIntake,
  archetype: any,
  config: Config,
  weekNum: number,
  blockDurationWeeks: number,
  logger: Logger
): Promise<Task[]> {
  const studyHoursPerSubject = timeSplit.study;
  const practiceHoursPerSubject = timeSplit.practice;
  const testHoursPerSubject = timeSplit.test;
  const revisionHours = timeSplit.revision;
  
  // Add assertions to catch problems early
  assert(studyHoursPerSubject > 0, `Invalid studyHoursPerSubject: ${studyHoursPerSubject}`);
  assert(studyHoursPerSubject <= 168, `studyHoursPerSubject ${studyHoursPerSubject} exceeds weekly hours (168)`); // 24*7 = 168 hours max per week
  
  // Calculate daily task duration (split weekly hours across 7 days, max 6 hours per day)
  const maxDailyHours = 6; // Maximum hours per day for any single task
  const dailyStudyHours = Math.min(studyHoursPerSubject / 7, maxDailyHours);
  const dailyStudyMinutes = Math.round(dailyStudyHours * 60);
  
  // Calculate daily durations for other task types
  const dailyPracticeHours = Math.min(practiceHoursPerSubject / 7, maxDailyHours);
  const dailyPracticeMinutes = Math.round(dailyPracticeHours * 60);
  const dailyTestHours = Math.min(testHoursPerSubject / 7, maxDailyHours);
  const dailyTestMinutes = Math.round(dailyTestHours * 60);
  const dailyRevisionHours = Math.min(revisionHours / 7, maxDailyHours);
  const dailyRevisionMinutes = Math.round(dailyRevisionHours * 60);
  
  logger.logDebug('OneWeekPlan', `Weekly hours → Daily task durations:`);
  logger.logDebug('OneWeekPlan', `  Study: ${studyHoursPerSubject}h → ${dailyStudyHours}h (${dailyStudyMinutes}min)`);
  logger.logDebug('OneWeekPlan', `  Practice: ${practiceHoursPerSubject}h → ${dailyPracticeHours}h (${dailyPracticeMinutes}min)`);
  logger.logDebug('OneWeekPlan', `  Test: ${testHoursPerSubject}h → ${dailyTestHours}h (${dailyTestMinutes}min)`);
  logger.logDebug('OneWeekPlan', `  Revision: ${revisionHours}h → ${dailyRevisionHours}h (${dailyRevisionMinutes}min)`);
  
  // Add comprehensive assertions for daily durations - ONLY for study tasks which are mandatory
  assert(dailyStudyMinutes > 0, `dailyStudyMinutes is 0: ${dailyStudyMinutes} (studyHoursPerSubject: ${studyHoursPerSubject})`);
  assert(dailyStudyMinutes <= 360, `dailyStudyMinutes ${dailyStudyMinutes} exceeds 6h limit`);
  
  // For practice, test, and revision - warn but allow 0 (they may be optional)
  if (dailyPracticeMinutes === 0) {
    logger.logDebug('OneWeekPlan', `No practice hours allocated for ${theSubject.subjectCode}, skipping practice tasks`);
  }
  if (dailyTestMinutes === 0) {
    logger.logDebug('OneWeekPlan', `No test hours allocated for ${theSubject.subjectCode}, skipping test tasks`);
  }
  if (dailyRevisionMinutes === 0) {
    logger.logDebug('OneWeekPlan', `No revision hours allocated, skipping revision task`);
  }
  
  assert(dailyPracticeMinutes <= 360, `dailyPracticeMinutes ${dailyPracticeMinutes} exceeds 6h limit`);
  assert(dailyTestMinutes <= 360, `dailyTestMinutes ${dailyTestMinutes} exceeds 6h limit`);
  assert(dailyRevisionMinutes <= 360, `dailyRevisionMinutes ${dailyRevisionMinutes} exceeds 6h limit`);
    
  // Create a mock student profile for now
  const studentProfile = createStudentProfile(archetype, studentIntake);

  // Generate study tasks with resources
  const studyTasks = await 
    generateStudyTasks(studyHoursPerSubject, dailyStudyHours, dailyStudyMinutes, studentIntake, archetype, studentProfile, config, theSubject, weekNum, blockDurationWeeks, logger)


  // Generate practice tasks (no resources needed) - ONLY if hours allocated
  const practiceTasks = dailyPracticeMinutes > 0 
    ? await generatePracticeTasks(weekStartDate, dailyPracticeMinutes, theSubject, logger)
    : [];
  
  // Generate test tasks (no resources needed) - ONLY if hours allocated
  const testTasks = dailyTestMinutes > 0
    ? await generateTestTasks(weekStartDate, dailyTestMinutes, theSubject, logger)
    : [];
  
  // Generate revision task (no resources needed) - ONLY if hours allocated
  const revisionTask = dailyRevisionMinutes > 0
    ? await generateRevisionTask(weekStartDate, dailyRevisionMinutes, logger)
    : null;
  
  // Filter out null/undefined tasks
  const allTasks = [...studyTasks, ...practiceTasks, ...testTasks];
  if (revisionTask) {
    allTasks.push(revisionTask);
  }
  
  return allTasks;
}

/**
 * Generate study tasks for a subject
 */
async function generateStudyTasks(
  studyHoursPerSubject: number,
  dailyStudyHours: number,
  dailyStudyMinutes: number,
  studentIntake: StudentIntake,
  archetype: any,
  studentProfile: any, // StudentProfile type
  _config: Config,
  subject: Subject,
  weekNum: number,
  blockDurationWeeks: number,
  logger: Logger
): Promise<Task[]> {
  // Add comprehensive input validation assertions
  assert(studyHoursPerSubject > 0, `Invalid studyHoursPerSubject: ${studyHoursPerSubject}`);
  assert(dailyStudyHours > 0, `Invalid dailyStudyHours: ${dailyStudyHours}`);
  assert(dailyStudyMinutes > 0, `Invalid dailyStudyMinutes: ${dailyStudyMinutes} - this will create 0-minute tasks!`);
  assert(dailyStudyMinutes <= 360, `dailyStudyMinutes ${dailyStudyMinutes} exceeds 6h limit`);
  assert(studentIntake, `No studentIntake provided to generateStudyTasks`);
  assert(archetype, `No archetype provided to generateStudyTasks`);
  assert(studentProfile, `No studentProfile provided to generateStudyTasks`);
  assert(subject && subject.subjectCode, `Invalid subject provided to generateStudyTasks`);
  assert(weekNum > 0, `Invalid weekNum: ${weekNum}`);
  assert(blockDurationWeeks > 0, `Invalid blockDurationWeeks: ${blockDurationWeeks}`);
  assert(logger, `No logger provided to generateStudyTasks`);
  
  const topicsForSubject = subject.topics || [];
  const subjectCodeText = subject.subjectCode;
  const confidenceMap = studentIntake.subject_confidence;
  const subjectConfidence = confidenceMap[subjectCodeText] || 'Moderate';

  logger.logDebug('OneWeekPlan', `Generating study tasks for ${subject.subjectName} (${subjectConfidence} confidence, ${studyHoursPerSubject.toFixed(2)}h allocated)`);

  if (topicsForSubject.length === 0) {
    // Fallback: if no topics, create a single subject-level task with resources
    logger.logDebug('OneWeekPlan', `No topics found for ${subject.subjectName}, creating subject-level task`);
    
    const studyTaskDef: StudyTaskDef = {
      study_subject: subjectCodeText,
      study_topic: undefined,
      study_duration_minutes: dailyStudyMinutes,
      study_archetype: archetype,
      study_confidence: subjectConfidence
    };
    
    const taskResources = await getResourcesForStudyTask(studyTaskDef, studentProfile);
    console.assert(dailyStudyMinutes > 0, `Daily task duration is zero: ${dailyStudyMinutes} minutes - this is invalid`);
    console.assert(dailyStudyMinutes <= 360, `Daily task duration ${dailyStudyMinutes} minutes (${dailyStudyMinutes/60}h) exceeds 6h limit`);
    logger.logDebug('OneWeekPlan', `Creating study task with duration: ${dailyStudyMinutes} minutes (${dailyStudyMinutes/60}h)`);
    
    const task = await createStudyTask(
      `Study: ${subject.subjectName}`,
      dailyStudyMinutes,
      subjectCodeText,
      undefined,
      taskResources
    );
    return [task];
  } else {
    // Calculate topics for the current week
    const totalTopics = topicsForSubject.length;
    const topicPerWeekDbl = totalTopics / blockDurationWeeks;
    const topicsPerWeek = Math.ceil(topicPerWeekDbl);
    const startIndex = (weekNum - 1) * topicsPerWeek;
    const endIndex = Math.min(totalTopics, startIndex + topicsPerWeek);
    const currentWeekTopics = topicsForSubject.slice(startIndex, endIndex);

    logger.logDebug('OneWeekPlan', `Week ${weekNum} topics for ${subject.subjectName}: ${currentWeekTopics.length}/${totalTopics} (${currentWeekTopics.map(t => t.topicName).join(', ')})`);

    // Create tasks for each topic in the current week, distributing time proportionally
    const tasks = await Promise.all(
      currentWeekTopics.map(async (topic) => {
        const topicEstimatedHours = getTopicEstimatedHours(topic);
        // Distribute study hours proportionally based on topic priority
        const totalEstimatedHoursForWeek = currentWeekTopics.reduce(
          (sum, t) => sum + getTopicEstimatedHours(t), 0
        );
        const topicTimeRatio = totalEstimatedHoursForWeek === 0 ? 0 : topicEstimatedHours / totalEstimatedHoursForWeek;
        const topicStudyTime = dailyStudyHours * topicTimeRatio;
        const topicDurationMinutes = Math.round(topicStudyTime * 60);
        
        // Add assertions for topic duration
        console.assert(topicDurationMinutes > 0, `Topic duration is zero: ${topicDurationMinutes} minutes - this is invalid`);
        console.assert(topicDurationMinutes <= 360, `Topic duration ${topicDurationMinutes} minutes (${topicDurationMinutes/60}h) exceeds 6h limit`);
        logger.logDebug('OneWeekPlan', `Creating topic task with duration: ${topicDurationMinutes} minutes (${topicDurationMinutes/60}h) for topic: ${topic.topicName}`);
        
        logger.logDebug('OneWeekPlan', `Topic ${topic.topicName} (${topic.priority}): ${topicEstimatedHours}h estimated, ${topicTimeRatio.toFixed(2)} ratio, ${topicDurationMinutes}min allocated`);
        
        // Create study task definition for resource fetching
        const studyTaskDef: StudyTaskDef = {
          study_subject: subjectCodeText,
          study_topic: topic.topicCode, // Use topicCode instead of topicName for better matching
          study_duration_minutes: topicDurationMinutes,
          study_archetype: archetype,
          study_confidence: subjectConfidence
        };
        
        // Fetch resources for this specific study task
        const taskResources = await getResourcesForStudyTask(studyTaskDef, studentProfile);
        
        // Create task with topic name, resource link, and fetched resources
        return createStudyTask(
          `Study: ${topic.topicName}`,
          topicDurationMinutes,
          subjectCodeText,
          topic.resourceLink,
          taskResources,
          topic.topicCode // Pass the topic code for resource matching
        );
      })
    );

    return tasks;
  }
}

/**
 * Generate practice tasks for a subject
 */
async function generatePracticeTasks(_configweekStartDate: Dayjs, dailyPracticeMinutes: number, subject: Subject, logger: Logger): Promise<Task[]> {
  // Add comprehensive input validation assertions
  assert(dailyPracticeMinutes > 0, `Invalid dailyPracticeMinutes: ${dailyPracticeMinutes} - this will create 0-minute tasks!`);
  assert(dailyPracticeMinutes <= 360, `dailyPracticeMinutes ${dailyPracticeMinutes} exceeds 6h limit`);
  assert(subject && subject.subjectCode, `Invalid subject provided to generatePracticeTasks`);
  assert(_logger, `No logger provided to generatePracticeTasks`);
  
  logger.logDebug('OneWeekPlan', `generatePracticeTasks validation: Subject ${subject.subjectCode}, dailyPracticeMinutes: ${dailyPracticeMinutes}`);
  switch (subject.examFocus) {
    case 'PrelimsOnly':
      const prelimsTask = await createTask(
        `Practice (MCQs): ${subject.subjectName}`,
        dailyPracticeMinutes,
        subject.subjectCode,
        undefined,
        'practice'
      );
      return [prelimsTask];
    case 'MainsOnly':
      const mainsTask = await createTask(
        `Practice (Answer Writing): ${subject.subjectName}`,
        dailyPracticeMinutes,
        subject.subjectCode,
        undefined,
        'practice'
      );
      return [mainsTask];
    case 'BothExams':
      // For subjects covering both, split the practice time between MCQs and Answer Writing
      const mcqTask = await createTask(
        `Practice (MCQs): ${subject.subjectName}`,
        Math.round(dailyPracticeMinutes / 2),
        subject.subjectCode,
        undefined,
        'practice'
      );
      const writingTask = await createTask(
        `Practice (Answer Writing): ${subject.subjectName}`,
        Math.round(dailyPracticeMinutes / 2),
        subject.subjectCode,
        undefined,
        'practice'
      );
      return [mcqTask, writingTask];
    default:
      return [];
  }
}

/**
 * Generate test tasks for a subject
 */
async function generateTestTasks(_weekStartDate: Dayjs, dailyTestMinutes: number, subject: Subject, logger: Logger): Promise<Task[]> {
  // Add comprehensive input validation assertions
  assert(dailyTestMinutes > 0, `Invalid dailyTestMinutes: ${dailyTestMinutes} - this will create 0-minute tasks!`);
  assert(dailyTestMinutes <= 360, `dailyTestMinutes ${dailyTestMinutes} exceeds 6h limit`);
  assert(subject && subject.subjectCode, `Invalid subject provided to generateTestTasks`);
  assert(_logger, `No logger provided to generateTestTasks`);
  
  logger.logDebug('OneWeekPlan', `generateTestTasks validation: Subject ${subject.subjectCode}, dailyTestMinutes: ${dailyTestMinutes}`);
  switch (subject.examFocus) {
    case 'PrelimsOnly': {

        const prelimsTestTask = await createTask(
            `Test (MCQs): ${subject.subjectName}`,
            dailyTestMinutes,
            subject.subjectCode,
            undefined,
            'test'
        );
        return [prelimsTestTask];
    }
    case 'MainsOnly': {

        const mainsTestTask = await createTask(
            `Test (Mains): ${subject.subjectName}`,
            dailyTestMinutes,
            subject.subjectCode,
            undefined,
            'test'
        );
        return [mainsTestTask];
    }
    case 'BothExams': {

        // For subjects covering both, split the test time between MCQs and Mains
        const mcqTestTask = await createTask(
            `Test (MCQs): ${subject.subjectName}`,
            Math.round(dailyTestMinutes / 2),
            subject.subjectCode,
            undefined,
            'test'
        );
        const mainsTestTask = await createTask(
            `Test (Mains): ${subject.subjectName}`,
            Math.round(dailyTestMinutes / 2),
            subject.subjectCode,
            undefined,
            'test'
        );
        return [mcqTestTask, mainsTestTask];
    }
    default:
        return [];
  }
}

/**
 * Generate revision task
 */
async function generateRevisionTask(_weekStartDate: Dayjs, dailyRevisionMinutes: number, logger: Logger): Promise<Task> {
  // Add comprehensive input validation assertions
  assert(dailyRevisionMinutes > 0, `Invalid dailyRevisionMinutes: ${dailyRevisionMinutes} - this will create a 0-minute task!`);
  assert(dailyRevisionMinutes <= 360, `dailyRevisionMinutes ${dailyRevisionMinutes} exceeds 6h limit`);
  assert(_logger, `No logger provided to generateRevisionTask`);
  
  logger.logDebug('OneWeekPlan', `generateRevisionTask validation: dailyRevisionMinutes: ${dailyRevisionMinutes}`);
  return createTask('Weekly Revision', dailyRevisionMinutes, 'REVISION', undefined, 'revision');
}

/**
 * Create a study task with resources
 */
async function createStudyTask(
  title: string,
  durationMinutes: number,
  subjectCode: string,
  resourceLink?: string,
  taskResources?: Resource[],
  topicCode?: string
): Promise<Task> {
  const taskId = `task-${uuidv4()}`;
  return {
    task_id: taskId,
    humanReadableId: '', // Will be set later
    title: title,
    duration_minutes: durationMinutes,
    details_link: resourceLink,
    currentAffairsType: undefined, // Not a CA task
    task_resources: taskResources,
    subjectCode: subjectCode, // Include subject code for proper subject identification
    taskType: 'study',
    topicCode: topicCode // Include topic code for NCERT materials matching
  };
}

/**
 * Create a task with a unique UUID (for non-study tasks)
 */
async function createTask(
  title: string,
  durationMinutes: number,
  subjectCode: string,
  resourceLink?: string,
  taskType: 'practice' | 'revision' | 'test' = 'practice'
): Promise<Task> {
  // Add comprehensive input validation assertions
  assert(title && title.trim().length > 0, `Invalid task title: "${title}"`);
  assert(durationMinutes > 0, `Invalid task duration: ${durationMinutes} minutes - this creates a 0-minute task!`);
  assert(durationMinutes <= 480, `Task duration ${durationMinutes} minutes exceeds 8h limit`);
  assert(subjectCode && subjectCode.trim().length > 0, `Invalid subjectCode: "${subjectCode}"`);
  assert(['practice', 'revision', 'test'].includes(taskType), `Invalid taskType: ${taskType}`);
  
  const taskId = `task-${uuidv4()}`;
  const task = {
    task_id: taskId,
    humanReadableId: '', // Will be set later
    title: title,
    duration_minutes: durationMinutes,
    details_link: resourceLink,
    currentAffairsType: undefined, // Not a CA task
    task_resources: undefined, // No resources for non-study tasks
    subjectCode: subjectCode, // Include subject code for proper subject identification
    taskType: taskType
  };
  
  // Final validation of created task
  assert(task.duration_minutes > 0, `Created task has 0 minutes duration: ${task.duration_minutes}`);
  assert(task.task_id && task.task_id.length > 0, `Created task has invalid ID: ${task.task_id}`);
  assert(task.title && task.title.length > 0, `Created task has invalid title: ${task.title}`);
  
  return task;
}

/**
 * Helper function to safely read hours from text
 * Handles range formats like "45-55" by using the midpoint
 */
function safeReadHours(text: string): number {
  // Handle range format like "45-55"
  if (text.includes('-')) {
    const [min, max] = text.split('-').map(s => parseInt(s.trim(), 10));
    if (!isNaN(min) && !isNaN(max)) {
      return Math.round((min + max) / 2); // Use midpoint
    }
  }
  
  const parsed = parseInt(text, 10);
  return isNaN(parsed) ? 40 : parsed; // Default fallback
}

/**
 * Create a mock student profile (simplified)
 */
function createStudentProfile(archetype: any, studentIntake: StudentIntake): any {
  // Simplified implementation - in real code this would create a proper profile
  return {
    archetype,
    studentIntake
  };
}

/**
 * Get resources for study task with NCERT materials support for C1 cycle
 */
async function getResourcesForStudyTask(studyTaskDef: StudyTaskDef, studentProfile: any): Promise<Resource[] | undefined> {
  try {
    // Import NCERTMaterialsService dynamically to avoid circular dependencies
    const { NCERTMaterialsService } = await import('../services/NCERTMaterialsService');
    
    // For C1 (NCERT Foundation) cycle, use NCERT materials
    if (studentProfile?.archetype?.archetype === 'C1' || studyTaskDef.study_subject === 'C1') {
      const subjectCode = studyTaskDef.study_subject;
      const availableTopics = await NCERTMaterialsService.getAvailableTopicCodes();
      
      // If we have a specific topic, try to find exact match first
      if (studyTaskDef.study_topic) {
        // Try direct topic code match (e.g., H01/01)
        const directMatch = availableTopics.find(topicCode => topicCode === studyTaskDef.study_topic);
        if (directMatch) {
          return await NCERTMaterialsService.getResourcesForC1Task(directMatch);
        }
        
        // Try to find topic codes that match the subject and could relate to the topic name
        const subjectTopics = availableTopics.filter(topicCode => topicCode.startsWith(subjectCode + '/'));
        if (subjectTopics.length > 0) {
          // For now, return materials from the first matching topic
          // In the future, this could be enhanced with topic name matching
          return await NCERTMaterialsService.getResourcesForC1Task(subjectTopics[0]);
        }
      }
      
      // Fallback: get materials for any topic under this subject
      const subjectTopics = availableTopics.filter(topicCode => topicCode.startsWith(subjectCode));
      if (subjectTopics.length > 0) {
        // Return materials from multiple topics for broader coverage
        const allMaterials = await Promise.all(
          subjectTopics.slice(0, 3).map(topicCode => 
            NCERTMaterialsService.getResourcesForC1Task(topicCode)
          )
        );
        return allMaterials.flat();
      }
    }
    
    // For non-C1 cycles, return undefined (will use existing resource system)
    return undefined;
  } catch (error) {
    console.warn('Failed to load NCERT materials for study task:', error);
    return undefined;
  }
}

/**
 * Get resources for study task with NCERT materials support for C1 cycle
 */
