import type { Dayjs } from "dayjs";


export type Break = {
  from: Dayjs;
  to: Dayjs;
}

export type PlannerConstraints = {
  optionalSubjectCode: string;
  confidenceMap: Record<SubjectCode, number>;
  optionalFirst: boolean;
  catchupDay: S2WeekDay;
  testDay: S2WeekDay;
  workingHoursPerDay: number;
  breaks: Break[]; // not used for now
  testMinutes: number; // Amount of time to allocate for taking tests
}

export type PlanningContext = {
  optionalSubject: S2Subject;
  startDate: Dayjs;
  targetYear: number;
  prelimsExamDate: Dayjs;
  mainsExamDate: Dayjs;
  constraints: PlannerConstraints;
  subjects: S2Subject[];
  relativeAllocationWeights: Record<SubjectCode, number>; //this should be based on relative baseline time
}

export interface ScenarioResult {
  scenario: 'S1' | 'S2' | 'S3' | 'S4' | 'S4A' | 'S5' | 'S6' | 'S7' | 'S8'; // Updated to include S4A
  totalTimeAvailable: number;
  schedules: CycleSchedule[];
}

export enum CycleType {
  C1 = "C1", // NCERT Foundation Cycle
  C2 = "C2", // Comprehensive Foundation Cycle
  C3 = "C3", // Mains Revision Pre-Prelims Cycle
  C4 = "C4", // Prelims Reading Cycle
  C5 = "C5", // Prelims Revision Cycle
  C5B = "C5.b", // Prelims Rapid Revision Cycle
  C6 = "C6", // Mains Revision Cycle
  C7 = "C7", // Mains Rapid Revision Cycle
  C8 = "C8" // Mains Foundation Cycle
}

export type SubjectCode = string;

export interface CycleSchedule {
  cycleType: CycleType;
  startDate: string;
  endDate: string;
}
export type BlockAllocConstraints = {
  cycleType: CycleType;
  relativeAllocationWeights: Record<SubjectCode, number>; //this should be based on relative baseline time
  numParallel: number;
  workingMinutesPerDay: number;
  catchupDay: S2WeekDay;
  testDay: S2WeekDay;
  testMinutes: number; // time needed to take a test
}

export type BlockSlot = {
  cycleType: CycleType;
  subject: S2Subject;
  from: Dayjs; to: Dayjs;
  numParallel: number;
  minutesPerDay: number;
}

export type SubjectWithAllocation = S2Subject & { allocation: number };

export type ActiveBlock = {
  subject: S2Subject;
  startTime: Dayjs;
  endTime: Dayjs;
  duration: number;
};

export enum S2WeekDay {
  Sunday = 0,
  Monday = 1,
  Tuesday = 2,
  Wednesday = 3,
  Thursday = 4,
  Friday = 5,
  Saturday = 6,
};

export enum S2SlotType {
  STUDY = 0,
  REVISION = 1,
  PRACTICE = 2,
  TEST = 3,
  CATCHUP = 4,
}

export type S2Constraints = {
  cycleType: CycleType;
  dayMaxMinutes: number;
  dayMinMinutes: number;
  catchupDay: S2WeekDay; // day to catch up on work
  testDay: S2WeekDay; // day to take a test
  testMinutes: number; // time needed to take a test
  taskEffortSplit: Record<S2SlotType, number>;
};

export type S2Slot = {
  date: Dayjs;
  type: S2SlotType;
  minutes: number;
};

export type S2ExamFocus = 'PrelimsOnly' | 'MainsOnly' | 'BothExams';

export type S2Subject = {
  subjectCode: string;
  subjectNname: string;
  examFocus: S2ExamFocus;
  topics: S2Topic[];
  baselineMinutes: number;
}

export type S2Topic = {
  code: string;
  subtopics: S2Subtopic[];
  baselineMinutes?: number;
};

export type S2Subtopic = {
  code: string;
  name: string;
  baselineMinutes?: number;
  isEssential: boolean;
  priorityLevel: number;
};

export type S2TopicWithMinutes = S2Topic & {
  baselineMinutes: number;
};

export type S2Task = {
  topicCode?: string;
  subjectCode: string;
  taskType: S2SlotType;
  minutes: number;
  date: Dayjs;
};