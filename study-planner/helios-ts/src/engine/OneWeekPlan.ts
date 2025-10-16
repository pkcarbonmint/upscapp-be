import type { WeeklyPlan, DailyPlan, Task, Resource } from '../types/models';
import type { StudentIntake } from '../types/models';
import type { Subject, ExamFocus } from '../types/Subjects';
import { getTopicEstimatedHours } from '../types/Subjects';
import type { ConfidenceLevel, Logger } from '../types/Types';
import { v4 as uuidv4 } from 'uuid';
import { Config } from './engine-types';

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

// Day state for task distribution
interface DayState {
  dayTasks: Task[];
  hours: number;
}

/**
 * Create a weekly plan for a specific week
 */
export async function createPlanForOneWeek(
  blockIndex: number,
  blkSubjects: Subject[],
  studentIntake: StudentIntake,
  archetype: any, // Archetype type
  config: Config,
  weekNum: number,
  blockDurationWeeks: number,
  logger: Logger
): Promise<WeeklyPlan> {
  logger.logDebug('OneWeekPlan', `Creating week ${weekNum}/${blockDurationWeeks} for block ${blockIndex}`);
  
  // 1. Calculate the total time available for each task category this week
  const weeklyTimeSplit = timeSplitInOneWeek(studentIntake, config);
  logger.logDebug('OneWeekPlan', `Week ${weekNum} time split: Study=${weeklyTimeSplit.study}h, Practice=${weeklyTimeSplit.practice}h, Test=${weeklyTimeSplit.test}h, Revision=${weeklyTimeSplit.revision}h`);
  
  // 2. Generate a flat list of all tasks required for the week
  const tasksForWeek = await tasksForOneWeek(
    blkSubjects,
    weeklyTimeSplit,
    studentIntake,
    archetype,
    config,
    weekNum,
    blockDurationWeeks,
    logger
  );

  logger.logDebug('OneWeekPlan', `Week ${weekNum} generated ${tasksForWeek.length} tasks`);

  // 3. Distribute this list of tasks across the 7 days of the week
  const dailyPlans = distributeTasksIntoDays(tasksForWeek, config.daily_hour_limits, logger, studentIntake);
  
  // 4. Assign the simple, human-readable IDs to each task
  const finalDailyPlans = assignHumanReadableIDs(dailyPlans, blockIndex, weekNum);
  
  // Log final week summary
  const totalTasks = finalDailyPlans.reduce((sum, day) => sum + day.tasks.length, 0);
  const totalMinutes = finalDailyPlans.reduce((sum, day) => 
    sum + day.tasks.reduce((daySum, task) => daySum + task.duration_minutes, 0), 0
  );
  const totalHours = Math.round(totalMinutes / 60 * 100) / 100;
  
  logger.logDebug('OneWeekPlan', `Week ${weekNum} final plan: ${totalTasks} tasks, ${totalHours} hours across 7 days`);
  
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
    test: studentWeeklyHours * split.test
  };
}

/**
 * Generate all tasks for a given week
 */
async function tasksForOneWeek(
  blkSubjects: Subject[],
  timeSplit: Record<string, number>,
  studentIntake: StudentIntake,
  archetype: any,
  config: Config,
  weekNum: number,
  blockDurationWeeks: number,
  logger: Logger
): Promise<Task[]> {
  const studyHoursPerSubject = timeSplit.study / blkSubjects.length;
  const practiceHoursPerSubject = timeSplit.practice / blkSubjects.length;
  const testHoursPerSubject = timeSplit.test / blkSubjects.length;
  const revisionHours = timeSplit.revision;
  
  logger.logDebug('OneWeekPlan', `Week ${weekNum} task generation: ${studyHoursPerSubject.toFixed(2)}h study, ${practiceHoursPerSubject.toFixed(2)}h practice, ${testHoursPerSubject.toFixed(2)}h test, ${revisionHours.toFixed(2)}h revision per subject`);
  
  // Create a mock student profile for now
  const studentProfile = createStudentProfile(archetype, studentIntake);

  // Generate study tasks with resources
  const studyTasks = await Promise.all(
    blkSubjects.map(subject => 
      generateStudyTasks(studyHoursPerSubject, studentIntake, archetype, studentProfile, config, subject, weekNum, blockDurationWeeks, logger)
    )
  );
  const flatStudyTasks = studyTasks.flat();
  
  // Generate practice tasks (no resources needed)
  const practiceTasks = await Promise.all(
    blkSubjects.map(subject => generatePracticeTasks(practiceHoursPerSubject, subject, logger))
  );
  const flatPracticeTasks = practiceTasks.flat();
  
  // Generate test tasks (no resources needed)
  const testTasks = await Promise.all(
    blkSubjects.map(subject => generateTestTasks(testHoursPerSubject, subject, logger))
  );
  const flatTestTasks = testTasks.flat();
  
  // Generate revision task (no resources needed)
  const revisionTask = await generateRevisionTask(revisionHours, logger);
  
  // Current affairs are integrated into study tasks, not generated separately
  
  logger.logDebug('OneWeekPlan', `Week ${weekNum} task breakdown: ${flatStudyTasks.length} study, ${flatPracticeTasks.length} practice, ${flatTestTasks.length} test, 1 revision`);
  
  return [...flatStudyTasks, ...flatPracticeTasks, ...flatTestTasks, revisionTask];
}

/**
 * Generate study tasks for a subject
 */
async function generateStudyTasks(
  studyHoursPerSubject: number,
  studentIntake: StudentIntake,
  archetype: any,
  studentProfile: any, // StudentProfile type
  _config: Config,
  subject: Subject,
  weekNum: number,
  blockDurationWeeks: number,
  logger: Logger
): Promise<Task[]> {
  const topicsForSubject = subject.topics;
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
      study_duration_minutes: Math.round(studyHoursPerSubject * 60),
      study_archetype: archetype,
      study_confidence: subjectConfidence
    };
    
    const taskResources = await getResourcesForStudyTask(studyTaskDef, studentProfile);
    const task = await createStudyTask(
      `Study: ${subject.subjectName}`,
      Math.round(studyHoursPerSubject * 60),
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
        const topicStudyTime = studyHoursPerSubject * topicTimeRatio;
        const topicDurationMinutes = Math.round(topicStudyTime * 60);
        
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
async function generatePracticeTasks(practiceHoursPerSubject: number, subject: Subject, _logger: Logger): Promise<Task[]> {
  switch (subject.examFocus) {
    case 'PrelimsOnly':
      const prelimsTask = await createTask(
        `Practice (MCQs): ${subject.subjectName}`,
        Math.round(practiceHoursPerSubject * 60),
        undefined,
        'practice'
      );
      return [prelimsTask];
    case 'MainsOnly':
      const mainsTask = await createTask(
        `Practice (Answer Writing): ${subject.subjectName}`,
        Math.round(practiceHoursPerSubject * 60),
        undefined,
        'practice'
      );
      return [mainsTask];
    case 'BothExams':
      // For subjects covering both, split the practice time between MCQs and Answer Writing
      const mcqTask = await createTask(
        `Practice (MCQs): ${subject.subjectName}`,
        Math.round(practiceHoursPerSubject * 60 / 2),
        undefined,
        'practice'
      );
      const writingTask = await createTask(
        `Practice (Answer Writing): ${subject.subjectName}`,
        Math.round(practiceHoursPerSubject * 60 / 2),
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
async function generateTestTasks(testHoursPerSubject: number, subject: Subject, _logger: Logger): Promise<Task[]> {
  switch (subject.examFocus) {
    case 'PrelimsOnly': {

        const prelimsTestTask = await createTask(
            `Test (MCQs): ${subject.subjectName}`,
            Math.round(testHoursPerSubject * 60),
            undefined,
            'test'
        );
        return [prelimsTestTask];
    }
    case 'MainsOnly': {

        const mainsTestTask = await createTask(
            `Test (Mains): ${subject.subjectName}`,
            Math.round(testHoursPerSubject * 60),
            undefined,
            'test'
        );
        return [mainsTestTask];
    }
    case 'BothExams': {

        // For subjects covering both, split the test time between MCQs and Mains
        const mcqTestTask = await createTask(
            `Test (MCQs): ${subject.subjectName}`,
            Math.round(testHoursPerSubject * 60 / 2),
            undefined,
            'test'
        );
        const mainsTestTask = await createTask(
            `Test (Mains): ${subject.subjectName}`,
            Math.round(testHoursPerSubject * 60 / 2),
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
async function generateRevisionTask(revisionHours: number, _logger: Logger): Promise<Task> {
  return createTask('Weekly Revision', Math.round(revisionHours * 60), undefined, 'revision');
}

/**
 * Create a study task with resources
 */
async function createStudyTask(
  title: string,
  durationMinutes: number,
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
  resourceLink?: string,
  taskType: 'practice' | 'revision' | 'test' = 'practice'
): Promise<Task> {
  const taskId = `task-${uuidv4()}`;
  return {
    task_id: taskId,
    humanReadableId: '', // Will be set later
    title: title,
    duration_minutes: durationMinutes,
    details_link: resourceLink,
    currentAffairsType: undefined, // Not a CA task
    task_resources: undefined, // No resources for non-study tasks
    taskType: taskType
  };
}

/**
 * Distribute tasks into 7 days using greedy bin-packing
 */
function distributeTasksIntoDays(tasks: Task[], dailyLimits: Config['daily_hour_limits'], _logger: Logger, studentIntake?: StudentIntake): DailyPlan[] {
  // Initialize 7 days, each with 0 hours used
  const initialDays: DayState[] = Array(7).fill(null).map(() => ({ dayTasks: [], hours: 0 }));
  
  // Sort tasks from longest to shortest for efficient packing
  const sortedTasks = [...tasks].sort((a, b) => b.duration_minutes - a.duration_minutes);
  
  // Distribute tasks
  const finalDays = sortedTasks.reduce((days, task) => 
    distributeTaskToDay(dailyLimits, days, task, studentIntake), initialDays
  );
  
  // Convert to DailyPlan format
  return finalDays.map((dayState, dayNum) => ({
    day: dayNum + 1,
    tasks: dayState.dayTasks
  }));
}

/**
 * Distribute a single task to the best available day
 */
function distributeTaskToDay(dailyLimits: Config['daily_hour_limits'], days: DayState[], task: Task, studentIntake?: StudentIntake): DayState[] {
  const taskHours = task.duration_minutes / 60.0;
  
  // Determine catchup day based on student preference
  const catchupDayIndex = getCatchupDayIndex(studentIntake);
  const testDayIndex = getTestDayIndex(studentIntake);
  
  const dayLimits = Array(7).fill(dailyLimits.regular_day);
  dayLimits[catchupDayIndex] = 0; // Catchup day should be empty - for student to catch up on missed work
  dayLimits[testDayIndex] = dailyLimits.test_day;
  
  // Debug logging for catchup day assignment
  if (studentIntake?.study_strategy?.catch_up_day_preference === 'Saturday') {
  }
  
  // Find the day with the most available space that can fit the task
  const findBestSlot = (days: DayState[], limits: number[], dayIndex: number): { index: number; space: number } | null => {
    if (dayIndex >= days.length) return null;
    
    const day = days[dayIndex];
    const limit = limits[dayIndex];
    const availableSpace = limit - day.hours;
    
    if (availableSpace >= taskHours) {
      const nextResult = findBestSlot(days, limits, dayIndex + 1);
      if (!nextResult) {
        return { index: dayIndex, space: availableSpace };
      }
      return availableSpace > nextResult.space 
        ? { index: dayIndex, space: availableSpace }
        : nextResult;
    }
    
    return findBestSlot(days, limits, dayIndex + 1);
  };
  
  const bestSlot = findBestSlot(days, dayLimits, 0);
  
  if (bestSlot) {
    // Place task in the best available slot
    const newDays = [...days];
    const targetDay = newDays[bestSlot.index];
    newDays[bestSlot.index] = {
      dayTasks: [...targetDay.dayTasks, task],
      hours: targetDay.hours + taskHours
    };
    return newDays;
  } else {
    // If no slot found, split the task across multiple days
    return splitTaskAcrossDays(days, task, dayLimits, taskHours);
  }
}

/**
 * Split a large task across multiple days when it doesn't fit in any single day
 */
function splitTaskAcrossDays(days: DayState[], task: Task, dayLimits: number[], taskHours: number): DayState[] {
  const daySpaces = days.map((day, index) => dayLimits[index] - day.hours);
  const totalAvailableSpace = daySpaces.reduce((sum, space) => sum + space, 0);
  
  if (totalAvailableSpace >= taskHours) {
    return distributeTaskProportionally(days, task, dayLimits, taskHours, daySpaces);
  } else {
    // If even total space is insufficient, add to day with most space (emergency fallback)
    const bestDayIndex = daySpaces.indexOf(Math.max(...daySpaces));
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
 * Distribute task proportionally across days with available space
 */
function distributeTaskProportionally(
  days: DayState[],
  task: Task,
  _dayLimits: number[],
  taskHours: number,
  daySpaces: number[]
): DayState[] {
  const availableDays = daySpaces
    .map((space, index) => ({ index, space }))
    .filter(({ space }) => space > 0);
  
  const totalSpace = availableDays.reduce((sum, { space }) => sum + space, 0);
  const originalMinutes = task.duration_minutes;
  
  // Calculate how much to allocate to each available day
  const allocations = availableDays.map(({ index, space }) => ({
    dayIdx: index,
    allocHours: Math.min(space, (taskHours * space) / totalSpace)
  }));
  
  // Ensure total allocated time equals original task time
  const totalAllocated = allocations.reduce((sum, { allocHours }) => sum + allocHours, 0);
  const adjustmentFactor = totalAllocated > 0 ? originalMinutes / (totalAllocated * 60) : 1.0;
  
  // Apply allocations to days
  let newDays = [...days];
  allocations.forEach(({ dayIdx, allocHours }) => {
    const adjustedHours = allocHours * adjustmentFactor;
    const subTaskMinutes = Math.round(adjustedHours * 60);
    const subTask = { ...task, duration_minutes: subTaskMinutes };
    
    const targetDay = newDays[dayIdx];
    newDays[dayIdx] = {
      dayTasks: [...targetDay.dayTasks, subTask],
      hours: targetDay.hours + adjustedHours
    };
  });
  
  return newDays;
}

/**
 * Assign human-readable IDs to all tasks in a week
 */
function assignHumanReadableIDs(dailyPlans: DailyPlan[], blockIndex: number, weekNum: number): DailyPlan[] {
  let counter = 1;
  
  return dailyPlans.map(dayPlan => ({
    ...dayPlan,
    tasks: dayPlan.tasks.map(task => ({
      ...task,
      humanReadableId: `b${blockIndex}w${weekNum}t${counter++}`
    }))
  }));
}

/**
 * Helper function to safely read hours from text
 */
function safeReadHours(text: string): number {
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
 * Get catchup day index based on student preference
 * @param studentIntake Student intake with catchup day preference
 * @returns Day index (0-6, where 0=Monday, 6=Sunday)
 */
function getCatchupDayIndex(studentIntake?: StudentIntake): number {
  if (!studentIntake?.study_strategy?.catch_up_day_preference) {
    return 5; // Default to Saturday (day 6, index 5)
  }
  
  const preference = studentIntake.study_strategy.catch_up_day_preference.toLowerCase();
  
  switch (preference) {
    case 'monday': return 0;
    case 'tuesday': return 1;
    case 'wednesday': return 2;
    case 'thursday': return 3;
    case 'friday': return 4;
    case 'saturday': return 5;
    case 'sunday': return 6;
    default: return 5; // Default to Saturday
  }
}

/**
 * Get test day index based on student preference
 * @param studentIntake Student intake with test frequency preference
 * @returns Day index (0-6, where 0=Monday, 6=Sunday)
 */
function getTestDayIndex(studentIntake?: StudentIntake): number {
  if (!studentIntake?.study_strategy?.test_frequency) {
    return 6; // Default to Sunday (day 7, index 6)
  }
  
  // const frequency = studentIntake.study_strategy.test_frequency.toLowerCase();
  
  // Get catchup day to avoid conflict
  const catchupDayIndex = getCatchupDayIndex(studentIntake);
  
  // Choose a different day for test day to avoid conflict with catchup day
  if (catchupDayIndex === 5) { // If Saturday is catchup day
    return 6; // Use Sunday for test day
  } else if (catchupDayIndex === 6) { // If Sunday is catchup day
    return 5; // Use Saturday for test day
  } else {
    return 6; // Default to Sunday
  }
}
