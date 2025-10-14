/**
 * Configuration service to manage data source selection
 * This allows for gradual migration from JSON to DynamoDB
 */

import type { Subject } from '../types/Subjects';
import type { PrepModeConfigFile } from '../types/config';
import type { Archetype } from '../types/models';

// JSON-based loaders (existing) - keeping for potential fallback
// import { NCERTMaterialsService as JSONNCERTMaterialsService } from './NCERTMaterialsService';

// DynamoDB-based loaders (new)
import { 
  DynamoDBSubjectLoader, 
  loadSubtopics as loadSubtopicsFromDynamoDB,
  loadPrepModeConfig,
  loadArchetypes
} from './DynamoDBSubjectLoader';
import { getPrepModeProgression as getPrepModeProgressionFromDynamoDB } from '../engine/DynamoDBPrepModeEngine';
import { DynamoDBNCERTMaterialsService } from './DynamoDBNCERTMaterialsService';

// Configuration
export type DataSource = 'json' | 'dynamodb';

const DATA_SOURCE: DataSource = (process.env.DATA_SOURCE as DataSource) || 'dynamodb';

export class ConfigService {
  /**
   * Get the current data source
   */
  static getDataSource(): DataSource {
    return DATA_SOURCE;
  }

  /**
   * Load all subjects using DynamoDB
   */
  static async loadAllSubjects(): Promise<Subject[]> {
    return await DynamoDBSubjectLoader.loadAllSubjects();
  }

  /**
   * Load subtopics using DynamoDB
   */
  static async loadSubtopics(subjects: Subject[]) {
    return await loadSubtopicsFromDynamoDB(subjects);
  }

  /**
   * Get subjects by category using DynamoDB
   */
  static async getSubjectsByCategory(category: 'Macro' | 'Micro'): Promise<Subject[]> {
    return await DynamoDBSubjectLoader.getSubjectsByCategory(category);
  }

  /**
   * Get subjects by exam focus using DynamoDB
   */
  static async getSubjectsByExamFocus(examFocus: 'PrelimsOnly' | 'MainsOnly' | 'BothExams'): Promise<Subject[]> {
    return await DynamoDBSubjectLoader.getSubjectsByExamFocus(examFocus);
  }

  /**
   * Get a specific subject by code using DynamoDB
   */
  static async getSubjectByCode(subjectCode: string): Promise<Subject | undefined> {
    return await DynamoDBSubjectLoader.getSubjectByCode(subjectCode);
  }

  /**
   * Get subjects with current affairs using DynamoDB
   */
  static async getSubjectsWithCurrentAffairs(): Promise<Subject[]> {
    return await DynamoDBSubjectLoader.getSubjectsWithCurrentAffairs();
  }

  /**
   * Get prep mode progression using DynamoDB
   */
  static async getPrepModeProgression(
    planDate: any,
    targetYearStr: string | undefined,
    archetype: Archetype,
    weeklyHours: number
  ) {
    return await getPrepModeProgressionFromDynamoDB(planDate, targetYearStr, archetype, weeklyHours);
  }

  /**
   * Load prep mode configuration from DynamoDB
   */
  static async loadPrepModeConfig(): Promise<PrepModeConfigFile> {
    return await loadPrepModeConfig();
  }

  /**
   * Load archetypes from DynamoDB
   */
  static async loadArchetypes(): Promise<Archetype[]> {
    return await loadArchetypes();
  }

  /**
   * Check if DynamoDB is available
   */
  static async isDynamoDBAvailable(): Promise<boolean> {
    try {
      await DynamoDBSubjectLoader.loadAllSubjects();
      return true;
    } catch (error) {
      console.warn('DynamoDB is not available:', error);
      return false;
    }
  }

  /**
   * Get NCERT materials for a topic using DynamoDB
   */
  static async getNCERTMaterialsForTopic(topicCode: string) {
    return await DynamoDBNCERTMaterialsService.getMaterialsForTopic(topicCode);
  }

  /**
   * Get NCERT materials for multiple topics using DynamoDB
   */
  static async getNCERTMaterialsForTopics(topicCodes: string[]) {
    return await DynamoDBNCERTMaterialsService.getMaterialsForTopics(topicCodes);
  }

  /**
   * Get NCERT resources for C1 task using DynamoDB
   */
  static async getNCERTResourcesForC1Task(topicCode: string) {
    return await DynamoDBNCERTMaterialsService.getResourcesForC1Task(topicCode);
  }

  /**
   * Get available topic codes with NCERT materials using DynamoDB
   */
  static async getAvailableNCERTTopicCodes() {
    return await DynamoDBNCERTMaterialsService.getAvailableTopicCodes();
  }

  /**
   * Check if NCERT materials are available for a topic using DynamoDB
   */
  static async hasNCERTMaterialsForTopic(topicCode: string) {
    return await DynamoDBNCERTMaterialsService.hasMaterialsForTopic(topicCode);
  }

  /**
   * Get NCERT materials by subject using DynamoDB
   */
  static async getNCERTMaterialsBySubject() {
    return await DynamoDBNCERTMaterialsService.getMaterialsBySubject();
  }

  /**
   * Get health status of DynamoDB data source
   */
  static async getHealthStatus(): Promise<{
    dataSource: DataSource;
    isHealthy: boolean;
    error?: string;
  }> {
    try {
      await DynamoDBSubjectLoader.loadAllSubjects();
      return { dataSource: 'dynamodb', isHealthy: true };
    } catch (error) {
      return {
        dataSource: DATA_SOURCE,
        isHealthy: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}