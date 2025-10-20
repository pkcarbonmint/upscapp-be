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

export enum SlotType {
  STUDY = 0,
  REVISION = 1,
  PRACTICE = 2,
  TEST = 3,
  CATCHUP = 4,
}

export type Constraints = {
  dayMaxMinutes: number;
  dayMinMinutes: number;
  catchupDay: Weekday; // day to catch up on work
  testDay: Weekday; // day to take a test
  testMinutes: number; // time needed to take a test
  taskEffortSplit: Record<SlotType, number>;
};

export type Slot = {
  date: Dayjs;
  type: SlotType;
  minutes: number;
};

export type Subject = {
  code: string;
  name: string;
  topics: Topic[];
  baselineMinutes: number;
}

export type Topic = {
  code: string;
  subtopics: Subtopic[];
  baselineMinutes?: number;
};

export type Subtopic = {
  code: string;
  name: string;
  baselineMinutes?: number;
  isEssential: boolean;
  priorityLevel: number;
};

export type TopicWithMinutes = Topic & {
  baselineMinutes: number;
};

export type Task = {
  topicCode?: string;
  subjectCode: string;
  taskType: SlotType;
  minutes: number;
  date: Dayjs;
};