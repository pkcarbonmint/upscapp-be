import type { WeeklyPlan, DailyPlan, Task, Resource } from '../types/models';
import type { StudentIntake } from '../types/models';
import type { Subject, ExamFocus } from '../types/Subjects';
import { getTopicEstimatedHours } from '../types/Subjects';
import type { ConfidenceLevel, Logger } from '../types/Types';
import { v4 as uuidv4 } from 'uuid';
import { Config } from './engine-types';
import { 
  distributeTasksIntoDays as schedulerDistributeTasksIntoDays,
  assignHumanReadableIDs as schedulerAssignHumanReadableIDs,
  WeeklyTask,
  DailyHourLimits,
  DayOfWeek
} from 'scheduler';

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
    taskType: task.taskType || 'study', // Provide default value since scheduler expects it
    currentAffairsType: task.currentAffairsType,
    resources: task.task_resources?.map((r: any) => r.resource_title) || []
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

  // 3. Distribute this list of tasks across the 7 days of the week using scheduler library
  const weeklyTasks = tasksForWeek.map(convertTaskToWeeklyTask);
  const dailyHourLimits = convertDailyHourLimits(config);
  
  const schedulingResult = schedulerDistributeTasksIntoDays({
    tasks: weeklyTasks,
    dailyLimits: dailyHourLimits,
    catchupDayPreference: (studentIntake.study_strategy?.catch_up_day_preference as DayOfWeek) || DayOfWeek.SATURDAY,
    testDayPreference: DayOfWeek.SUNDAY // Default to Sunday for test day
  });
  
  // Convert back to helios-ts format and preserve original task data
  const dailyPlans: DailyPlan[] = schedulingResult.dailyPlans.map((dayPlan: any) => ({
    day: dayPlan.day,
    tasks: dayPlan.tasks.map((weeklyTask: any) => {
      const originalTask = tasksForWeek.find(t => t.task_id === weeklyTask.task_id);
      return originalTask ? convertWeeklyTaskToTask(weeklyTask, originalTask) : {
        task_id: weeklyTask.task_id,
        humanReadableId: weeklyTask.humanReadableId,
        title: weeklyTask.title,
        duration_minutes: weeklyTask.duration_minutes,
        taskType: weeklyTask.taskType || 'study',
        currentAffairsType: weeklyTask.currentAffairsType,
        task_resources: weeklyTask.resources?.map((title: any) => ({ resource_title: title }))
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
  
  // 4. Assign the simple, human-readable IDs to each task using scheduler library
  // Convert to scheduler format for ID assignment
  const schedulerDailyPlans = dailyPlans.map(dayPlan => ({
    day: dayPlan.day,
    tasks: dayPlan.tasks.map(convertTaskToWeeklyTask)
  }));
  
  const schedulerResult = schedulerAssignHumanReadableIDs(schedulerDailyPlans, blockIndex, weekNum);
  
  // Convert back to helios format
  const finalDailyPlans: DailyPlan[] = schedulerResult.map(dayPlan => ({
    day: dayPlan.day,
    tasks: dayPlan.tasks.map((weeklyTask: any) => {
      const originalTask = tasksForWeek.find(t => t.task_id === weeklyTask.task_id);
      return originalTask ? convertWeeklyTaskToTask(weeklyTask, originalTask) : {
        task_id: weeklyTask.task_id,
        humanReadableId: weeklyTask.humanReadableId,
        title: weeklyTask.title,
        duration_minutes: weeklyTask.duration_minutes,
        taskType: weeklyTask.taskType || 'study',
        currentAffairsType: weeklyTask.currentAffairsType,
        task_resources: weeklyTask.resources?.map((title: any) => ({ resource_title: title }))
      } as Task;
    })
  }));
  
  // Log final week summary
  const totalTasks = finalDailyPlans.reduce((sum: number, day: any) => sum + day.tasks.length, 0);
  const totalMinutes = finalDailyPlans.reduce((sum: number, day: any) => 
    sum + day.tasks.reduce((daySum: number, task: any) => daySum + task.duration_minutes, 0), 0
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
