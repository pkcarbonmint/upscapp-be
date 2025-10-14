import type { ExamFocus, LoadSubtopicsResult, Subject, Subtopic, SubtopicBand, TopicPriority } from '../types/Subjects';
import subjectsData from '../config/upsc_subjects.json';
import subtopicsData from '../config/subtopics.json';

function mapTopicPriority(priority: string): TopicPriority {
  switch (priority) {
    case 'Essential':
      return 'EssentialTopic';
    case 'Priority':
      return 'PriorityTopic';
    case 'Supplementary':
      return 'SupplementaryTopic';
    case 'Peripheral':
      return 'PeripheralTopic';
    default:
      return 'EssentialTopic';
  }
}

function decodeExamFocus(focus: string): ExamFocus {
  switch (focus) {
    case 'Prelims':
      return 'PrelimsOnly';
    case 'Mains':
      return 'MainsOnly';
    case 'Overlap':
      return 'BothExams';
    default:
      return 'BothExams';
  }
}

function decodeSubtopicBand(band: string): SubtopicBand {
  switch (band) {
    case 'A':
      return 'A';
    case 'B':
      return 'B';
    case 'C':
      return 'C';
    case 'D':
      return 'D';
    default:
      return 'A';
  }
}

export function loadSubtopics(subjects: Subject[]): LoadSubtopicsResult {
  // create a map of topic code to subject 
  const topicCodeToSubject = new Map<string, Subject>();
  subjects.forEach(subject => {
    subject.topics.forEach(topic => {
      topicCodeToSubject.set(topic.topicCode, subject);
    });
  });

  const subtopics = subtopicsData
  .map((row, i) => {
    const band = decodeSubtopicBand(row.priorityBand);
    const subject = topicCodeToSubject.get(row.topicCode);
    if (!subject) {
      return undefined;
    }
    const subtopicCode = `${row.topicCode}-${i}`;
    return ({
      subject,
      name: row.subtopic,
      topicCode: row.topicCode,
      code: subtopicCode,
      band,
      focus: decodeExamFocus(row.exam),
      baselineHours: 0
    });
  }).filter(st => st !== undefined);

  // Calculate baseline hours for each subtopic
  for (const subject of subjects) {
    const subtopicsForSubject = subtopics.filter(st => st.subject.subjectCode === subject.subjectCode);
    const numSubtopicsInBandA = subtopicsForSubject.filter(st => st.band === 'A').length;
    const numSubtopicsInBandB = subtopicsForSubject.filter(st => st.band === 'B').length;
    const numSubtopicsInBandC = subtopicsForSubject.filter(st => st.band === 'C').length;
    const numSubtopicsInBandD = subtopicsForSubject.filter(st => st.band === 'D').length;
    const hoursPerSubtopicInBandA = subject.baselineHours * 0.5 / numSubtopicsInBandA;
    const hoursPerSubtopicInBandB = subject.baselineHours * 0.3 / numSubtopicsInBandB;
    const hoursPerSubtopicInBandC = subject.baselineHours * 0.15 / numSubtopicsInBandC;
    const hoursPerSubtopicInBandD = subject.baselineHours * 0.05 / numSubtopicsInBandD;
    subtopicsForSubject.forEach(st => {
      st.baselineHours = st.band === 'A' ? hoursPerSubtopicInBandA : st.band === 'B' ? hoursPerSubtopicInBandB : st.band === 'C' ? hoursPerSubtopicInBandC : hoursPerSubtopicInBandD;
    });
  }

  return {
    subtopics,
    getBandD: (topicCode: string) => subtopics.filter(st => st.topicCode === topicCode).filter(st => st.band == 'D'),
    getBandC: (topicCode: string) => subtopics.filter(st => st.topicCode === topicCode).filter(st => st.band == 'C'),
    getBandB: (topicCode: string) => subtopics.filter(st => st.topicCode === topicCode).filter(st => st.band == 'B'),
    getBandA: (topicCode: string) => subtopics.filter(st => st.topicCode === topicCode).filter(st => st.band == 'A'),
  }
}

/**
 * JSON-based Subject loader service for frontend use
 */
export class JSONSubjectLoader {
  private static subjects: Subject[] | null = null;

  /**
   * Load all subjects from the embedded JSON data
   */
  static loadAllSubjects(): Subject[] {
    if (this.subjects === null) {
      try {
        // Convert the JSON data to our Subject type
        this.subjects = subjectsData.subjects.map(subjectData => ({
          subjectCode: subjectData.code,
          subjectName: subjectData.name,
          baselineHours: subjectData.baseline_hours,
          category: subjectData.category as 'Macro' | 'Micro',
          examFocus: subjectData.exam_focus as 'PrelimsOnly' | 'MainsOnly' | 'BothExams',
          hasCurrentAffairs: subjectData.has_current_affairs,
          topics: subjectData.topics.map(topicData => ({
            subjectCode: subjectData.code,
            topicCode: topicData.code,
            topicName: topicData.name,
            priority: mapTopicPriority(topicData.priority),
            resourceLink: undefined,
            subtopics: ((topicData as any).subtopics || [])?.map((subtopicData: Subtopic) => ({
              name: subtopicData.name,
              code: subtopicData.code,
              band: decodeSubtopicBand(subtopicData.band),
            }))
          }))
        }));

      } catch (error) {
        console.error('❌ Failed to load subjects from embedded JSON data:', error);
        throw error;
      }
    }

    return this.subjects;
  }

  /**
   * Get subjects by category
   */
  static getSubjectsByCategory(category: 'Macro' | 'Micro'): Subject[] {
    return this.loadAllSubjects().filter(subject => subject.category === category);
  }

  /**
   * Get subjects by exam focus
   */
  static getSubjectsByExamFocus(examFocus: 'PrelimsOnly' | 'MainsOnly' | 'BothExams'): Subject[] {
    return this.loadAllSubjects().filter(subject => subject.examFocus === examFocus);
  }

  /**
   * Get a specific subject by code
   */
  static getSubjectByCode(subjectCode: string): Subject | undefined {
    return this.loadAllSubjects().find(subject => subject.subjectCode === subjectCode);
  }

  /**
   * Get subjects that have current affairs components
   */
  static getSubjectsWithCurrentAffairs(): Subject[] {
    return this.loadAllSubjects().filter(subject => subject.hasCurrentAffairs);
  }
}

/**
 * Convenience function to load all subjects from JSON
 */
export function loadAllSubjects(): Subject[] {
  return JSONSubjectLoader.loadAllSubjects();
}