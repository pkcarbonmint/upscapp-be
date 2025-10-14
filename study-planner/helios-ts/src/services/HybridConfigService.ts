/**
 * Hybrid Configuration Service
 * Uses JSON files for frontend/browser environments and DynamoDB for backend/Node.js environments
 */

import type { Subject } from '../types/Subjects';
// Note: These types are imported for potential future use
// import type { PrepModeConfigFile } from '../types/config';
// import type { Archetype } from '../types/models';

// Environment detection
const isBrowser = typeof window !== 'undefined';
const isNode = typeof process !== 'undefined' && process.versions?.node;

export type DataSource = 'json' | 'dynamodb' | 'api';

export class HybridConfigService {
  private static dataSource: DataSource = HybridConfigService.determineDataSource();

  /**
   * Determine the appropriate data source based on environment
   */
  private static determineDataSource(): DataSource {
    // Check if explicitly set via environment variable
    const envSource = process.env.DATA_SOURCE as DataSource;
    if (envSource) {
      return envSource;
    }

    // Auto-detect based on environment
    if (isBrowser) {
      return 'api'; // Frontend should use API calls
    } else if (isNode) {
      return 'dynamodb'; // Backend should use DynamoDB
    } else {
      return 'json'; // Fallback to JSON
    }
  }

  /**
   * Get the current data source
   */
  static getDataSource(): DataSource {
    return this.dataSource;
  }

  /**
   * Load all subjects using the appropriate method for the environment
   */
  static async loadAllSubjects(): Promise<Subject[]> {
    const source = this.getDataSource();

    switch (source) {
      case 'dynamodb':
        // Use DynamoDB (backend only)
        const { ConfigService } = await import('./ConfigService');
        return await ConfigService.loadAllSubjects();

      case 'json':
        // Use JSON files (fallback)
        const { loadAllSubjects: loadFromJSON } = await import('./JSONSubjectLoader');
        return loadFromJSON();

      case 'api':
        // Use API calls (frontend)
        return await this.loadSubjectsFromAPI();

      default:
        throw new Error(`Unsupported data source: ${source}`);
    }
  }

  /**
   * Load subjects from API endpoint
   */
  private static async loadSubjectsFromAPI(): Promise<Subject[]> {
    const apiUrl = process.env.HELIOS_API_URL || 'http://localhost:8080';
    
    try {
      const response = await fetch(`${apiUrl}/api/subjects`);
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.warn('Failed to load subjects from API, falling back to JSON:', error);
      // Fallback to JSON if API fails
      const { loadAllSubjects: loadFromJSON } = await import('./JSONSubjectLoader');
      return loadFromJSON();
    }
  }

  /**
   * Load subtopics using the appropriate method
   */
  static async loadSubtopics(subjects: Subject[]) {
    const source = this.getDataSource();

    switch (source) {
      case 'dynamodb':
        const { ConfigService } = await import('./ConfigService');
        return await ConfigService.loadSubtopics(subjects);

      case 'json':
      case 'api':
        const { loadSubtopics: loadFromJSON } = await import('./JSONSubjectLoader');
        return loadFromJSON(subjects);

      default:
        throw new Error(`Unsupported data source: ${source}`);
    }
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
   * Get subjects with current affairs
   */
  static async getSubjectsWithCurrentAffairs(): Promise<Subject[]> {
    const subjects = await this.loadAllSubjects();
    return subjects.filter(subject => subject.hasCurrentAffairs);
  }

  /**
   * Get health status
   */
  static async getHealthStatus(): Promise<{
    dataSource: DataSource;
    environment: string;
    isHealthy: boolean;
    error?: string;
  }> {
    const source = this.getDataSource();
    const environment = isBrowser ? 'browser' : isNode ? 'node' : 'unknown';

    try {
      await this.loadAllSubjects();
      return { 
        dataSource: source, 
        environment,
        isHealthy: true 
      };
    } catch (error) {
      return {
        dataSource: source,
        environment,
        isHealthy: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}