/**
 * Configuration service to manage data source selection
 * This allows for gradual migration from JSON to DynamoDB
 */

import type { Subject } from '../types/Subjects';
import type { PrepModeConfigFile } from '../types/config';
import type { Archetype } from '../types/models';

// JSON-based loaders (existing)
import { SubjectLoader as JSONSubjectLoader, loadSubtopics as loadSubtopicsFromJSON } from './SubjectLoader';
import { getPrepModeProgression as getPrepModeProgressionFromJSON } from '../engine/PrepModeEngine';

// DynamoDB-based loaders (new)
import { 
  DynamoDBSubjectLoader, 
  loadSubtopics as loadSubtopicsFromDynamoDB,
  loadPrepModeConfig,
  loadArchetypes
} from './DynamoDBSubjectLoader';
import { getPrepModeProgression as getPrepModeProgressionFromDynamoDB } from '../engine/DynamoDBPrepModeEngine';

// Configuration
export type DataSource = 'json' | 'dynamodb';

const DATA_SOURCE: DataSource = (process.env.DATA_SOURCE as DataSource) || 'json';

export class ConfigService {
  /**
   * Get the current data source
   */
  static getDataSource(): DataSource {
    return DATA_SOURCE;
  }

  /**
   * Load all subjects using the configured data source
   */
  static async loadAllSubjects(): Promise<Subject[]> {
    if (DATA_SOURCE === 'dynamodb') {
      return await DynamoDBSubjectLoader.loadAllSubjects();
    } else {
      return JSONSubjectLoader.loadAllSubjects();
    }
  }

  /**
   * Load subtopics using the configured data source
   */
  static async loadSubtopics(subjects: Subject[]) {
    if (DATA_SOURCE === 'dynamodb') {
      return await loadSubtopicsFromDynamoDB(subjects);
    } else {
      return loadSubtopicsFromJSON(subjects);
    }
  }

  /**
   * Get subjects by category using the configured data source
   */
  static async getSubjectsByCategory(category: 'Macro' | 'Micro'): Promise<Subject[]> {
    if (DATA_SOURCE === 'dynamodb') {
      return await DynamoDBSubjectLoader.getSubjectsByCategory(category);
    } else {
      return JSONSubjectLoader.getSubjectsByCategory(category);
    }
  }

  /**
   * Get subjects by exam focus using the configured data source
   */
  static async getSubjectsByExamFocus(examFocus: 'PrelimsOnly' | 'MainsOnly' | 'BothExams'): Promise<Subject[]> {
    if (DATA_SOURCE === 'dynamodb') {
      return await DynamoDBSubjectLoader.getSubjectsByExamFocus(examFocus);
    } else {
      return JSONSubjectLoader.getSubjectsByExamFocus(examFocus);
    }
  }

  /**
   * Get a specific subject by code using the configured data source
   */
  static async getSubjectByCode(subjectCode: string): Promise<Subject | undefined> {
    if (DATA_SOURCE === 'dynamodb') {
      return await DynamoDBSubjectLoader.getSubjectByCode(subjectCode);
    } else {
      return JSONSubjectLoader.getSubjectByCode(subjectCode);
    }
  }

  /**
   * Get subjects with current affairs using the configured data source
   */
  static async getSubjectsWithCurrentAffairs(): Promise<Subject[]> {
    if (DATA_SOURCE === 'dynamodb') {
      return await DynamoDBSubjectLoader.getSubjectsWithCurrentAffairs();
    } else {
      return JSONSubjectLoader.getSubjectsWithCurrentAffairs();
    }
  }

  /**
   * Get prep mode progression using the configured data source
   */
  static async getPrepModeProgression(
    planDate: any,
    targetYearStr: string | undefined,
    archetype: Archetype,
    weeklyHours: number
  ) {
    if (DATA_SOURCE === 'dynamodb') {
      return await getPrepModeProgressionFromDynamoDB(planDate, targetYearStr, archetype, weeklyHours);
    } else {
      return getPrepModeProgressionFromJSON(planDate, targetYearStr, archetype, weeklyHours);
    }
  }

  /**
   * Load prep mode configuration (only available for DynamoDB)
   */
  static async loadPrepModeConfig(): Promise<PrepModeConfigFile | null> {
    if (DATA_SOURCE === 'dynamodb') {
      return await loadPrepModeConfig();
    } else {
      console.warn('Prep mode config loading is only available with DynamoDB data source');
      return null;
    }
  }

  /**
   * Load archetypes (only available for DynamoDB)
   */
  static async loadArchetypes(): Promise<Archetype[] | null> {
    if (DATA_SOURCE === 'dynamodb') {
      return await loadArchetypes();
    } else {
      console.warn('Archetypes loading is only available with DynamoDB data source');
      return null;
    }
  }

  /**
   * Check if DynamoDB is available
   */
  static async isDynamoDBAvailable(): Promise<boolean> {
    try {
      if (DATA_SOURCE === 'dynamodb') {
        // Try to load a small amount of data to test connectivity
        await DynamoDBSubjectLoader.loadAllSubjects();
        return true;
      }
      return false;
    } catch (error) {
      console.warn('DynamoDB is not available:', error);
      return false;
    }
  }

  /**
   * Get health status of the current data source
   */
  static async getHealthStatus(): Promise<{
    dataSource: DataSource;
    isHealthy: boolean;
    error?: string;
  }> {
    try {
      if (DATA_SOURCE === 'dynamodb') {
        await DynamoDBSubjectLoader.loadAllSubjects();
        return { dataSource: 'dynamodb', isHealthy: true };
      } else {
        JSONSubjectLoader.loadAllSubjects();
        return { dataSource: 'json', isHealthy: true };
      }
    } catch (error) {
      return {
        dataSource: DATA_SOURCE,
        isHealthy: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}