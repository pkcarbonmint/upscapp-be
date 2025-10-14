import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';
import type { ExamFocus, LoadSubtopicsResult, Subject, SubtopicBand, TopicPriority } from '../types/Subjects';
import type { PrepModeConfigFile } from '../types/config';
import type { Archetype } from '../types/models';

// Configuration
const AWS_REGION = process.env.AWS_REGION || 'us-east-1';
const TABLE_PREFIX = process.env.TABLE_PREFIX || '';

// Table names
const TABLES = {
  subjects: `${TABLE_PREFIX}upsc-subjects`,
  topics: `${TABLE_PREFIX}upsc-topics`,
  subtopics: `${TABLE_PREFIX}upsc-subtopics`,
  prepModes: `${TABLE_PREFIX}prep-modes`,
  archetypes: `${TABLE_PREFIX}archetypes`,
  config: `${TABLE_PREFIX}study-planner-config`
};

// Initialize DynamoDB client
const dynamoClient = new DynamoDBClient({ region: AWS_REGION });
const docClient = DynamoDBDocumentClient.from(dynamoClient);

// Cache for loaded data
let subjectsCache: Subject[] | null = null;
let prepModeConfigCache: PrepModeConfigFile | null = null;
let archetypesCache: Archetype[] | null = null;

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
 * Load subtopics from DynamoDB and calculate baseline hours
 */
export async function loadSubtopics(subjects: Subject[]): Promise<LoadSubtopicsResult> {
  // Create a map of topic code to subject 
  const topicCodeToSubject = new Map<string, Subject>();
  subjects.forEach(subject => {
    subject.topics.forEach(topic => {
      topicCodeToSubject.set(topic.topicCode, subject);
    });
  });

  // Load all subtopics from DynamoDB
  const scanCommand = new ScanCommand({
    TableName: TABLES.subtopics
  });

  const response = await docClient.send(scanCommand);
  const subtopicsData = response.Items || [];

  const subtopics = subtopicsData
    .map((row) => {
      const band = decodeSubtopicBand(row.priority_band);
      const subject = topicCodeToSubject.get(row.topic_code);
      if (!subject) {
        return undefined;
      }
      return {
        subject,
        name: row.subtopic_name,
        topicCode: row.topic_code,
        code: row.subtopic_id,
        band,
        focus: decodeExamFocus(row.exam),
        baselineHours: 0
      };
    })
    .filter(st => st !== undefined);

  // Calculate baseline hours for each subtopic
  for (const subject of subjects) {
    const subtopicsForSubject = subtopics.filter(st => st.subject.subjectCode === subject.subjectCode);
    const numSubtopicsInBandA = subtopicsForSubject.filter(st => st.band === 'A').length;
    const numSubtopicsInBandB = subtopicsForSubject.filter(st => st.band === 'B').length;
    const numSubtopicsInBandC = subtopicsForSubject.filter(st => st.band === 'C').length;
    const numSubtopicsInBandD = subtopicsForSubject.filter(st => st.band === 'D').length;
    
    const hoursPerSubtopicInBandA = numSubtopicsInBandA > 0 ? subject.baselineHours * 0.5 / numSubtopicsInBandA : 0;
    const hoursPerSubtopicInBandB = numSubtopicsInBandB > 0 ? subject.baselineHours * 0.3 / numSubtopicsInBandB : 0;
    const hoursPerSubtopicInBandC = numSubtopicsInBandC > 0 ? subject.baselineHours * 0.15 / numSubtopicsInBandC : 0;
    const hoursPerSubtopicInBandD = numSubtopicsInBandD > 0 ? subject.baselineHours * 0.05 / numSubtopicsInBandD : 0;
    
    subtopicsForSubject.forEach(st => {
      st.baselineHours = st.band === 'A' ? hoursPerSubtopicInBandA : 
                         st.band === 'B' ? hoursPerSubtopicInBandB : 
                         st.band === 'C' ? hoursPerSubtopicInBandC : 
                         hoursPerSubtopicInBandD;
    });
  }

  return {
    subtopics,
    getBandD: (topicCode: string) => subtopics.filter(st => st.topicCode === topicCode).filter(st => st.band == 'D'),
    getBandC: (topicCode: string) => subtopics.filter(st => st.topicCode === topicCode).filter(st => st.band == 'C'),
    getBandB: (topicCode: string) => subtopics.filter(st => st.topicCode === topicCode).filter(st => st.band == 'B'),
    getBandA: (topicCode: string) => subtopics.filter(st => st.topicCode === topicCode).filter(st => st.band == 'A'),
  };
}

/**
 * DynamoDB-based Subject loader service
 */
export class DynamoDBSubjectLoader {
  /**
   * Load all subjects from DynamoDB
   */
  static async loadAllSubjects(): Promise<Subject[]> {
    if (subjectsCache === null) {
      try {
        // Load subjects
        const subjectsResponse = await docClient.send(new ScanCommand({
          TableName: TABLES.subjects
        }));
        const subjectsData = subjectsResponse.Items || [];

        // Load topics
        const topicsResponse = await docClient.send(new ScanCommand({
          TableName: TABLES.topics
        }));
        const topicsData = topicsResponse.Items || [];

        // Group topics by subject
        const topicsBySubject = new Map<string, any[]>();
        topicsData.forEach(topic => {
          if (!topicsBySubject.has(topic.subject_code)) {
            topicsBySubject.set(topic.subject_code, []);
          }
          topicsBySubject.get(topic.subject_code)!.push(topic);
        });

        // Convert to Subject type
        subjectsCache = subjectsData.map(subjectData => ({
          subjectCode: subjectData.subject_code,
          subjectName: subjectData.subject_name,
          baselineHours: subjectData.baseline_hours,
          category: subjectData.category as 'Macro' | 'Micro',
          examFocus: subjectData.exam_focus as 'PrelimsOnly' | 'MainsOnly' | 'BothExams',
          hasCurrentAffairs: subjectData.has_current_affairs,
          topics: (topicsBySubject.get(subjectData.subject_code) || []).map(topicData => ({
            subjectCode: subjectData.subject_code,
            topicCode: topicData.topic_code,
            topicName: topicData.topic_name,
            priority: mapTopicPriority(topicData.priority),
            resourceLink: undefined,
            subtopics: [] // Subtopics are loaded separately
          }))
        }));

      } catch (error) {
        console.error('❌ Failed to load subjects from DynamoDB:', error);
        throw error;
      }
    }

    return subjectsCache;
  }

  /**
   * Get subjects by category
   */
  static async getSubjectsByCategory(category: 'Macro' | 'Micro'): Promise<Subject[]> {
    const subjects = await this.loadAllSubjects();
    return subjects.filter(subject => subject.category === category);
  }

  /**
   * Get subjects by exam focus
   */
  static async getSubjectsByExamFocus(examFocus: 'PrelimsOnly' | 'MainsOnly' | 'BothExams'): Promise<Subject[]> {
    const subjects = await this.loadAllSubjects();
    return subjects.filter(subject => subject.examFocus === examFocus);
  }

  /**
   * Get a specific subject by code
   */
  static async getSubjectByCode(subjectCode: string): Promise<Subject | undefined> {
    const subjects = await this.loadAllSubjects();
    return subjects.find(subject => subject.subjectCode === subjectCode);
  }

  /**
   * Get subjects that have current affairs components
   */
  static async getSubjectsWithCurrentAffairs(): Promise<Subject[]> {
    const subjects = await this.loadAllSubjects();
    return subjects.filter(subject => subject.hasCurrentAffairs);
  }
}

/**
 * Load prep mode configuration from DynamoDB
 */
export async function loadPrepModeConfig(): Promise<PrepModeConfigFile> {
  if (prepModeConfigCache === null) {
    try {
      // Load all configuration items
      const configResponse = await docClient.send(new ScanCommand({
        TableName: TABLES.config
      }));
      const configItems = configResponse.Items || [];

      // Load prep modes
      const prepModesResponse = await docClient.send(new ScanCommand({
        TableName: TABLES.prepModes
      }));
      const prepModesData = prepModesResponse.Items || [];

      // Build config object
      const config: any = {
        prep_modes: prepModesData.map(mode => ({
          name: mode.mode_name,
          category: mode.category,
          base_duration_weeks: mode.base_duration_weeks,
          intensity_adjustment: mode.intensity_adjustment,
          description: mode.description
        }))
      };

      // Add other config items
      configItems.forEach(item => {
        if (item.config_key === 'prep_modes_metadata') {
          config.metadata = item.config_value;
        } else if (item.config_key === 'exam_schedule') {
          config.exam_schedule = item.config_value;
        } else if (item.config_key === 'time_thresholds') {
          config.time_thresholds = item.config_value;
        } else if (item.config_key === 'archetype_adjustments') {
          config.archetype_adjustments = item.config_value;
        } else if (item.config_key === 'progression_rules') {
          config.progression_rules = item.config_value;
        }
      });

      prepModeConfigCache = config as PrepModeConfigFile;

    } catch (error) {
      console.error('❌ Failed to load prep mode config from DynamoDB:', error);
      throw error;
    }
  }

  return prepModeConfigCache;
}

/**
 * Load archetypes from DynamoDB
 */
export async function loadArchetypes(): Promise<Archetype[]> {
  if (archetypesCache === null) {
    try {
      const response = await docClient.send(new ScanCommand({
        TableName: TABLES.archetypes
      }));
      const archetypesData = response.Items || [];

      archetypesCache = archetypesData.map(archetype => ({
        archetype: archetype.archetype_name,
        timeCommitment: archetype.time_commitment as 'FullTime' | 'PartTime',
        weeklyHoursMin: archetype.weekly_hours_min,
        weeklyHoursMax: archetype.weekly_hours_max,
        description: archetype.description,
        defaultPacing: archetype.default_pacing,
        defaultApproach: archetype.default_approach,
        specialFocus: archetype.special_focus
      }));

    } catch (error) {
      console.error('❌ Failed to load archetypes from DynamoDB:', error);
      throw error;
    }
  }

  return archetypesCache || [];
}

/**
 * Convenience function to load all subjects
 */
export async function loadAllSubjects(): Promise<Subject[]> {
  return DynamoDBSubjectLoader.loadAllSubjects();
}

/**
 * Clear all caches (useful for testing or when data is updated)
 */
export function clearCaches(): void {
  subjectsCache = null;
  prepModeConfigCache = null;
  archetypesCache = null;
}