import type { S2Constraints, S2Subject, S2Subtopic, S2Task, S2Topic, S2ExamFocus } from 'scheduler2';
import type { CycleType, DailyPlan, TaskEffortSplit as S1TaskEffortSplit, Task, WeeklyPlan } from 'scheduler';
import { S2SlotType, S2WeekDay } from 'scheduler2';
import { StudentIntake } from '../types/models';
import { Subject, Subtopic, Topic } from '../types/Subjects';
import dayjs, { Dayjs } from 'dayjs';
import { SubjectLoader } from '../services/SubjectLoader';

const bandOrder: Record<string, number> = { 'A': 1, 'B': 2, 'C': 3, 'D': 4 };

export function mapFromS2Tasks(tasks: S2Task[], blockStartDate?: Dayjs): WeeklyPlan[] {
  const weeklyPlans: WeeklyPlan[] = [];

  if (tasks.length === 0) {
    return weeklyPlans;
  }

  // Group tasks by week
  const tasksByWeek = new Map<number, S2Task[]>();

  tasks.forEach(task => {
    // Calculate week number relative to block start date (like CalendarDocxService does)
    const weekNumber = blockStartDate ? 
      Math.floor(task.date.diff(blockStartDate, 'day') / 7) + 1 :
      task.date.diff(task.date.startOf('year'), 'week') + 1;
    if (!tasksByWeek.has(weekNumber)) {
      tasksByWeek.set(weekNumber, []);
    }
    tasksByWeek.get(weekNumber)!.push(task);
  });

  // Convert each week's tasks to WeeklyPlan
  for (const [weekNumber, weekTasks] of tasksByWeek) {
    // Group tasks by day within the week
    const tasksByDay = new Map<number, S2Task[]>();

    weekTasks.forEach(task => {
      const dayOfWeek = task.date.day(); // 0 = Sunday, 1 = Monday, etc.
      if (!tasksByDay.has(dayOfWeek)) {
        tasksByDay.set(dayOfWeek, []);
      }
      tasksByDay.get(dayOfWeek)!.push(task);
    });

    // Convert to DailyPlan format
    const dailyPlans: DailyPlan[] = [];

    for (const [dayOfWeek, dayTasks] of tasksByDay) {
      const firstTask = dayTasks[0];
      const date = firstTask.date;

    // Convert S2Task to Task format
    const convertedTasks: Task[] = dayTasks.map(task => ({
        task_id: `${task.subjectCode}-${task.topicCode || 'general'}-${task.date.format('YYYY-MM-DD')}-${task.taskType}`,
        humanReadableId: `${task.subjectCode}-${task.topicCode || 'general'}-${task.date.format('YYYY-MM-DD')}-${task.taskType}`,
        title: formatS2TaskTitle(task),
        duration_minutes: task.minutes,
        taskType: task.taskType === S2SlotType.STUDY ? 'study' :
          task.taskType === S2SlotType.PRACTICE ? 'practice' :
            task.taskType === S2SlotType.REVISION ? 'revision' :
              task.taskType === S2SlotType.TEST ? 'test' : 'study',
        subjectCode: task.subjectCode,
        topicCode: task.topicCode
      }));

      dailyPlans.push({
        day: dayOfWeek,
        date: date,
        tasks: convertedTasks
      });
    }

    // Sort daily plans by day of week
    dailyPlans.sort((a, b) => a.day - b.day);

    weeklyPlans.push({
      week: weekNumber,
      daily_plans: dailyPlans
    });
  }

  // Sort weekly plans by week number
  weeklyPlans.sort((a, b) => a.week - b.week);

  return weeklyPlans;
}

// Helper: Format S2 task title for Week/Month views
function formatS2TaskTitle(task: S2Task): string {
  const baseTitle = task.taskType === S2SlotType.STUDY ? 'Study'
    : task.taskType === S2SlotType.PRACTICE ? 'Practice'
    : task.taskType === S2SlotType.REVISION ? 'Revision'
    : task.taskType === S2SlotType.TEST ? 'Test'
    : 'Catchup';

  // For study tasks, show topic name with code in parentheses; do not repeat subject code
  if (task.taskType === S2SlotType.STUDY && task.topicCode) {
    const topicName = getTopicNameFromCode(task.topicCode, task.subjectCode) || task.topicCode;
    return `${baseTitle} - ${topicName} (${task.topicCode})`;
  }

  return baseTitle;
}

// Helper: Resolve topic name from code using SubjectLoader
function getTopicNameFromCode(topicCode?: string, subjectCode?: string): string | undefined {
  if (!topicCode) return undefined;
  const subject = SubjectLoader.getSubjectByCode(subjectCode || topicCode.split('/')[0]);
  const topic = subject?.topics?.find(t => t.topicCode === topicCode);
  return topic?.topicName;
}


export async function mapToS2Constraints(intake: StudentIntake, cycleType: CycleType): Promise<S2Constraints> {
  const daily_hours = intake.getDailyStudyHours();
  const catchupDay = mapToS2CatchupDay(intake.study_strategy.catch_up_day_preference);
  const taskEffortSplit: S1TaskEffortSplit = {
    ...await intake.getTaskEffortSplit(cycleType, intake),
    review: 0, test: 0, // not used
  }
  const constraints: S2Constraints = {
    cycleType,
    dayMaxMinutes: 1.1 * daily_hours * 60, // 8 hours
    dayMinMinutes: 0.9 * daily_hours * 60, // 4 hours
    catchupDay,
    testDay: mapToS2TestDay("Sunday"),
    testMinutes: intake.getTestDurationMinutes(cycleType),
    taskEffortSplit: mapToS2TaskEffortSplit(taskEffortSplit),
  };
  return constraints;
}

function mapToS2TaskEffortSplit(taskEffortSplit: S1TaskEffortSplit): Record<S2SlotType, number> {
  const map: Record<S2SlotType, number> = {
    [S2SlotType.STUDY]: taskEffortSplit.study,
    [S2SlotType.REVISION]: taskEffortSplit.revision,
    [S2SlotType.PRACTICE]: taskEffortSplit.practice,
    [S2SlotType.TEST]: 0,
    [S2SlotType.CATCHUP]: 8,
  }
  return map;
}

function mapToS2CatchupDay(catchupDayPreference: string): S2WeekDay {
  switch (catchupDayPreference) {
    case 'Sunday': return S2WeekDay.Sunday;
    case 'Monday': return S2WeekDay.Monday;
    case 'Tuesday': return S2WeekDay.Tuesday;
    case 'Wednesday': return S2WeekDay.Wednesday;
    case 'Thursday': return S2WeekDay.Thursday;
    case 'Friday': return S2WeekDay.Friday;
    case 'Saturday': return S2WeekDay.Saturday;
    default: return S2WeekDay.Sunday;
  }
}

function mapToS2TestDay(testDayPreference: string): S2WeekDay {
  switch (testDayPreference) {
    case 'Sunday': return S2WeekDay.Sunday;
    case 'Monday': return S2WeekDay.Monday;
    case 'Tuesday': return S2WeekDay.Tuesday;
    case 'Wednesday': return S2WeekDay.Wednesday;
    case 'Thursday': return S2WeekDay.Thursday;
    case 'Friday': return S2WeekDay.Friday;
    case 'Saturday': return S2WeekDay.Saturday;
    default: return S2WeekDay.Saturday;
  }
}
function mapSubjectToExamFocus(subjectCode: string): S2ExamFocus {
  // Optional subjects are typically for Mains only
  if (subjectCode.startsWith('OPT-')) {
    return 'MainsOnly';
  }
  
  // GS subjects are typically for both exams
  if (subjectCode.startsWith('H') || subjectCode === 'G' || subjectCode === 'B' || 
      subjectCode === 'T' || subjectCode === 'P' || subjectCode === 'E') {
    return 'BothExams';
  }
  
  return 'BothExams'; // Default
}

export function mapToS2Subject(subject: Subject): S2Subject {
  return {
    subjectCode: subject.subjectCode,
    subjectNname: subject.subjectName,
    examFocus: mapSubjectToExamFocus(subject.subjectCode),
    baselineMinutes: subject.baselineHours * 60,
    topics: subject.topics.map(mapToS2Topics),
  };
}

function mapToS2Topics(topics: Topic): S2Topic {
  return {
    code: topics.topicCode,
    subtopics: (topics.subtopics || []).map(mapToS2Subtopics),
  }
}
function mapToS2Subtopics(subtopics: Subtopic): S2Subtopic {
  return {
    code: subtopics.code,
    name: subtopics.code,
    baselineMinutes: (subtopics.baselineHours || 0) * 60,
    isEssential: subtopics.band === 'A',
    priorityLevel: bandOrder[subtopics.band]
  }
}
