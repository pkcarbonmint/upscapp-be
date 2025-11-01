import type { ExamFocus, LoadSubtopicsResult, Subject, Subtopic, SubtopicBand, TopicPriority } from '../types/Subjects';
import subjectsData from '../config/upsc_subjects.json';
import subtopicsData from '../config/subtopics.json';
import optionalSubjectsData from '../config/optional_subjects.json';

const isOptional = (_: any) => false; // TODO

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

/**
 * Convert optional subject JSON to Subject type
 */
function mapOptionalSubjectToSubject(optionalSubject: any): Subject {
  return {
    subjectCode: optionalSubject.code,
    subjectName: optionalSubject.name,
    baselineHours: optionalSubject.baseline_hours,
    category: optionalSubject.category === 'Literature' ? 'Micro' : 'Macro',
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

export async function loadSubtopics(subjects: Subject[]): Promise<LoadSubtopicsResult> {
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

  // to assign baseline hours to each sub topic:
  // For each subject:
    // First count the number of subtopics in each band
    // calcuate hours/subtopic in each band (50% for A, 30% for B, 15% for C, 5% for D)
    // Filter subtopics list by subjectCode
    // Assign baseline hours to each subtopic based on the band and the number of subtopics in that band
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
 * Subject loader service that provides access to all available subjects
 * This replaces the Haskell EmbeddedSubjects module functionality
 */
export class SubjectLoader {
  private static subjects: Subject[] | null = null;
  private static selectedOptionalSubject: string | null = null;
  private static optionalSubjectsCache: Map<string, Subject> = new Map();

  /**
   * Load all subjects from the embedded JSON data
   * This function is pure and provides the definitive list of subjects for the application
   * @param optionalSubjectCode - Optional subject code to include in the subjects list
   */
  static loadAllSubjects(optionalSubjectCode?: string): Subject[] {
    // Check if we need to reload subjects (different optional subject or first load)
    if (this.subjects === null || this.selectedOptionalSubject !== optionalSubjectCode) {
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

        // Add the selected optional subject if provided
        if (optionalSubjectCode) {
          const optionalSubjectData = optionalSubjectsData.subjects.find(
            subject => subject.code === optionalSubjectCode
          );
          
          if (optionalSubjectData) {
            const optionalSubject = mapOptionalSubjectToSubject(optionalSubjectData);
            this.subjects.push(optionalSubject);
            console.log(`✅ Added optional subject: ${optionalSubject.subjectName} (${optionalSubject.subjectCode})`);
          } else {
            console.warn(`⚠️ Optional subject ${optionalSubjectCode} not found in optional_subjects.json`);
          }
        }

        this.selectedOptionalSubject = optionalSubjectCode || null;

      } catch (error) {
        console.error('❌ Failed to load subjects from embedded data:', error);
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
   * Uses cached subjects if available, otherwise loads without optional subject
   * For optional subjects, tries to load from optional_subjects.json if not in cache
   */
  static getSubjectByCode(subjectCode: string): Subject | undefined {
    // If we have cached subjects, use them (they may include optional subject)
    if (this.subjects !== null) {
      const cachedSubject = this.subjects.find(subject => subject.subjectCode === subjectCode);
      if (cachedSubject) {
        return cachedSubject;
      }
    }
    
    // For optional subjects, check the dedicated cache first
    if (subjectCode.startsWith('OPT-')) {
      if (this.optionalSubjectsCache.has(subjectCode)) {
        return this.optionalSubjectsCache.get(subjectCode);
      }
      
      // Load from optional_subjects.json if not in cache
      const optionalSubjectData = optionalSubjectsData.subjects.find(
        subject => subject.code === subjectCode
      );
      
      if (optionalSubjectData) {
        const optionalSubject = mapOptionalSubjectToSubject(optionalSubjectData);
        console.log(`✅ Loaded optional subject on-demand: ${optionalSubject.subjectName} (${optionalSubject.subjectCode})`);
        
        // Add to dedicated optional subjects cache
        this.optionalSubjectsCache.set(subjectCode, optionalSubject);
        
        return optionalSubject;
      }
    }
    
    // Otherwise, load subjects without optional subject
    return this.loadAllSubjects().find(subject => subject.subjectCode === subjectCode);
  }

  /**
   * Get subjects that have current affairs components
   */
  static getSubjectsWithCurrentAffairs(): Subject[] {
    return this.loadAllSubjects().filter(subject => subject.hasCurrentAffairs);
  }

  /**
   * Get optional subjects (OPT or Micro category)
   */
  static getOptionalSubjects(): Subject[] {
    return this.loadAllSubjects().filter(isOptional);
  }

  /**
   * Get GS subjects (non-optional)
   */
  static getGSSubjects(): Subject[] {
    return this.loadAllSubjects().filter(subject => !isOptional(subject));
  }

  /**
   * Clear the subjects cache to force reload
   */
  static clearCache(): void {
    this.subjects = null;
    this.selectedOptionalSubject = null;
    this.optionalSubjectsCache.clear();
  }
}

/**
 * Convenience function to load all subjects
 * This is the main entry point for subject loading
 * @param optionalSubjectCode - Optional subject code to include in the subjects list
 */
export async function loadAllSubjects(optionalSubjectCode?: string): Promise<Subject[]> {
  return orderSubjects(SubjectLoader.loadAllSubjects(optionalSubjectCode));
}

function orderSubjects(subjects: Subject[]): Subject[] {
  const preferredSubjCodeSequence = subjectsData.preferred_subject_code_sequence;
  // put the subjects in the preferred sequence
  // if the subject is not in the preferred sequence, leave it alone (maintain relative order at the end)
  return subjects.sort((a, b) => {
    const aIndex = preferredSubjCodeSequence.indexOf(a.subjectCode);
    const bIndex = preferredSubjCodeSequence.indexOf(b.subjectCode);
    
    // If both are not in preferred sequence, maintain their relative order
    if (aIndex === -1 && bIndex === -1) {
      return 0;
    }
    // If only one is in preferred sequence, it comes first
    if (aIndex === -1) {
      return 1; // a comes after b
    }
    if (bIndex === -1) {
      return -1; // a comes before b
    }
    // Both are in preferred sequence, sort by their index
    return aIndex - bIndex;
  });

}