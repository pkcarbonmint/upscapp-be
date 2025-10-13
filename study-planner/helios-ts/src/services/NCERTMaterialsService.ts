import { Resource } from '../types/models';

/**
 * NCERT Material structure from NCERT-Materials.json
 */
export interface NCERTMaterial {
  book_name: string;
  chapter_name: string;
}

/**
 * NCERT Materials mapping indexed by topic code
 */
export type NCERTMaterialsMap = Record<string, NCERTMaterial[]>;

/**
 * Service for managing NCERT materials for foundation cycle (C1) tasks
 */
export class NCERTMaterialsService {
  private static materialsCache: NCERTMaterialsMap | null = null;

  /**
   * Load NCERT materials from the JSON file
   */
  private static async loadNCERTMaterials(): Promise<NCERTMaterialsMap> {
    if (this.materialsCache) {
      return this.materialsCache;
    }

    try {
      // Dynamic import to load the NCERT materials JSON file
      const materialsModule = await import('../../NCERT-Materials.json');
      this.materialsCache = materialsModule.default || materialsModule;
      return this.materialsCache;
    } catch (error) {
      console.warn('Failed to load NCERT-Materials.json:', error);
      return {};
    }
  }

  /**
   * Get NCERT materials for a specific topic code
   */
  static async getMaterialsForTopic(topicCode: string): Promise<NCERTMaterial[]> {
    const materials = await this.loadNCERTMaterials();
    return materials[topicCode] || [];
  }

  /**
   * Get NCERT materials for multiple topic codes
   */
  static async getMaterialsForTopics(topicCodes: string[]): Promise<Record<string, NCERTMaterial[]>> {
    const materials = await this.loadNCERTMaterials();
    const result: Record<string, NCERTMaterial[]> = {};
    
    for (const topicCode of topicCodes) {
      result[topicCode] = materials[topicCode] || [];
    }
    
    return result;
  }

  /**
   * Convert NCERT materials to Resource format for task integration
   */
  static convertToResources(materials: NCERTMaterial[], topicCode: string): Resource[] {
    return materials.map((material, index) => ({
      resource_id: `ncert-${topicCode.replace('/', '-')}-${index}`,
      resource_title: `${material.book_name} - ${material.chapter_name}`,
      resource_type: 'Book',
      resource_url: '', // NCERT materials typically don't have URLs
      resource_description: `NCERT foundation material for ${topicCode}: ${material.chapter_name}`,
      resource_subjects: [topicCode.split('/')[0]], // Extract subject code from topic code
      difficulty_level: 'Beginner',
      estimated_hours: 2, // Default estimation for NCERT chapters
      resource_priority: 'Essential',
      resource_cost: { type: 'Free' }
    }));
  }

  /**
   * Get resources for C1 (NCERT Foundation) cycle tasks
   */
  static async getResourcesForC1Task(topicCode: string): Promise<Resource[]> {
    const materials = await this.getMaterialsForTopic(topicCode);
    return this.convertToResources(materials, topicCode);
  }

  /**
   * Get all available topic codes that have NCERT materials
   */
  static async getAvailableTopicCodes(): Promise<string[]> {
    const materials = await this.loadNCERTMaterials();
    return Object.keys(materials);
  }

  /**
   * Check if NCERT materials are available for a topic code
   */
  static async hasMaterialsForTopic(topicCode: string): Promise<boolean> {
    const materials = await this.getMaterialsForTopic(topicCode);
    return materials.length > 0;
  }

  /**
   * Get NCERT materials grouped by subject
   */
  static async getMaterialsBySubject(): Promise<Record<string, Record<string, NCERTMaterial[]>>> {
    const materials = await this.loadNCERTMaterials();
    const result: Record<string, Record<string, NCERTMaterial[]>> = {};
    
    for (const [topicCode, topicMaterials] of Object.entries(materials)) {
      const subjectCode = topicCode.split('/')[0];
      if (!result[subjectCode]) {
        result[subjectCode] = {};
      }
      result[subjectCode][topicCode] = topicMaterials;
    }
    
    return result;
  }

  /**
   * Clear the materials cache (useful for testing)
   */
  static clearCache(): void {
    this.materialsCache = null;
  }
}