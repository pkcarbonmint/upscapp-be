// Subject and Topic types ported from Haskell Types.Subjects

export interface CompletionStatus {
  topicProgress: number; // Percentage complete
  qualityScore: number;  // Based on practice tests/feedback
  isBlockingTopic: boolean; // Dependencies for future topics
  importanceLevel: TopicPriority;
}

export interface Subject {
  subjectName: string;
  subjectCode: string;
  baselineHours: number;
  category: string;
  examFocus: ExamFocus;
  hasCurrentAffairs: boolean;
  topics: Topic[];
}

export interface Topic {
  subjectCode: string;
  topicName: string;
  topicCode: string;
  resourceLink?: string;
  priority: TopicPriority;
  description?: string;
  subtopics?: Subtopic[];
}

export type SubtopicBand = 'A' | 'B' | 'C' | 'D' ;
export interface Subtopic {
  name: string;
  topicCode: string;
  code: string;
  band: SubtopicBand;
  focus: ExamFocus;
  baselineHours: number;
}

export interface SubjectFile {
  domain: DomainInfo;
  subjects: Subject[];
}

export interface DomainInfo {
  name: string;
  version: string;
  last_updated: string;
  source_authority: string;
}

export type ExamFocus = 'PrelimsOnly' | 'MainsOnly' | 'BothExams';

export type TopicPriority = 'EssentialTopic' | 'PriorityTopic' | 'SupplementaryTopic' | 'PeripheralTopic';

/**
 * Calculate the estimated hours for a topic based on its priority.
 * These are baseline values and can be adjusted by other multipliers.
 */
export function getTopicEstimatedHours(topic: Topic): number {
  switch (topic.priority) {
    case 'EssentialTopic':
      return 10;
    case 'PriorityTopic':
      return 6;
    case 'SupplementaryTopic':
      return 3;
    case 'PeripheralTopic':
      return 1;
    default:
      return 3;
  }
}

export type SubjData = {
  subjects: Subject[];
  subtopics: LoadSubtopicsResult;
}

export type LoadSubtopicsResult = {
  subtopics: Subtopic[];
  getBandD: (topicCode: string) => Subtopic[];
  getBandC: (topicCode: string) => Subtopic[];
  getBandB: (topicCode: string) => Subtopic[];
  getBandA: (topicCode: string) => Subtopic[];
};
