import type { Dayjs } from "dayjs";

export enum Weekday {
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
  dayMaxMinutes: number;
  dayMinMinutes: number;
  catchupDay: Weekday; // day to catch up on work
  testDay: Weekday; // day to take a test
  testMinutes: number; // time needed to take a test
  taskEffortSplit: Record<S2SlotType, number>;
};

export type S2Slot = {
  date: Dayjs;
  type: S2SlotType;
  minutes: number;
};

export type S2Subject = {
  code: string;
  name: string;
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