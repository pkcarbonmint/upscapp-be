import { Config } from '../engine/engine-types';
import { Subject, TopicPriority } from '../types/Subjects';
import optionalSubjectsData from './optional_subjects.json';

/**
 * Default configuration for the Helios engine
 * This mirrors the Haskell Config module functionality
 */
export const DEFAULT_CONFIG: Config = {
  block_duration_clamp: {
    min_weeks: 2,
    max_weeks: 8
  },
  daily_hour_limits: {
    regular_day: 8,
    catch_up_day: 10,
    test_day: 6
  },
  task_effort_split: {
    study: 0.6,
    revision: 0.2,
    practice: 0.15,
    gs_optional_ratio: 1
  }
};

/**
 * Convert optional subject JSON to Subject type
 */
function mapOptionalSubjectToSubject(optionalSubject: any): Subject {
  return {
    subjectCode: optionalSubject.code,
    subjectName: optionalSubject.name,
    baselineHours: optionalSubject.baseline_hours,
    category: "Optional",
    examFocus: 'MainsOnly',
    hasCurrentAffairs: false,
    topics: [
      {
        subjectCode: optionalSubject.code,
        topicCode: `${optionalSubject.code}/01`,
        topicName: `${optionalSubject.name} - Paper 1`,
        priority: 'EssentialTopic' as TopicPriority,
        subtopics: []
      },
      {
        subjectCode: optionalSubject.code,
        topicCode: `${optionalSubject.code}/02`,
        topicName: `${optionalSubject.name} - Paper 2`,
        priority: 'EssentialTopic' as TopicPriority,
        subtopics: []
      }
    ]
  };
}

/**
 * Get all optional subjects as a flat array
 */
export async function getAllOptionalSubjects(): Promise<Subject[]> {
  const allOptionalSubjects = optionalSubjectsData.subjects;
  return allOptionalSubjects.map(mapOptionalSubjectToSubject);
}

/**
 * Get optional subject by code
 */
export async function getOptionalSubjectByCode(code: string): Promise<Subject | undefined> {
  const allOptSubjects = await getAllOptionalSubjects();
  return allOptSubjects.find(subject => subject.subjectCode === code);
}

