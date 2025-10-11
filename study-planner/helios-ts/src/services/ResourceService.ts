import { Resource, BlockResources } from '../types/models';
import ResourceLoader from '../resources/resourceIndex';
import type { SubjectResourcesFile } from '../resources/types';

export interface ResourceQuery {
  subjects?: string[];
  topics?: string[];
  taskTypes?: string[];
  difficulty?: string;
  priority?: string;
  cost?: 'free' | 'budget' | 'premium';
  estimatedHoursMax?: number;
}

// Resource interfaces moved to ./resources/types.ts for reusability

/**
 * Resource Service for managing and querying the UPSC resources database
 */
export class ResourceService {

  /**
   * Preload resources for multiple subjects (useful for dashboards with known subjects)
   */
  static async preloadSubjectsResources(subjectCodes: string[]): Promise<Map<string, SubjectResourcesFile>> {
    return ResourceLoader.preloadResources(subjectCodes);
  }

  /**
   * Get available subject codes efficiently
   */
  static async getAvailableSubjects(): Promise<string[]> {
    return ResourceLoader.getAvailableSubjects();
  }

  /**
   * Clear resource cache (useful for testing or memory management)
   */
  static clearCache(): void {
    ResourceLoader.clearCache();
  }

  /**
   * Load subject-specific resource file using dynamic imports
   */
  private static async loadSubjectResourceFile(subjectCode: string): Promise<SubjectResourcesFile | null> {
    try {
      return await ResourceLoader.loadSubjectResources(subjectCode);
    } catch (error) {
      console.warn(`❌ Failed to load resource file for subject ${subjectCode}:`, error);
      return null;
    }
  }

  /**
   * Get resources for a specific subject
   */
  static async getResourcesForSubject(subjectCode: string): Promise<BlockResources> {
    const subjectFile = await this.loadSubjectResourceFile(subjectCode);
    
    if (!subjectFile) {
      return {
        primary_books: [],
        supplementary_materials: [],
        practice_resources: [],
        video_content: [],
        current_affairs_sources: [],
        revision_materials: [],
        expert_recommendations: []
      };
    }

    const subjectResources = subjectFile.subject_level_resources;
    
    return {
      primary_books: this.getResourcesByIds(subjectResources.primary_books, subjectFile),
      video_content: this.getResourcesByIds(subjectResources.video_content, subjectFile),
      practice_resources: this.getResourcesByIds(subjectResources.practice_resources, subjectFile),
      current_affairs_sources: this.getResourcesByIds(subjectResources.current_affairs_sources, subjectFile),
      revision_materials: this.getResourcesByIds(subjectResources.revision_materials, subjectFile),
      expert_recommendations: this.getResourcesByIds(subjectResources.expert_recommendations, subjectFile),
      supplementary_materials: this.getResourcesByIds(subjectResources.supplementary_materials, subjectFile)
    };
  }

  /**
   * Get resources for a specific topic
   */
  static async getResourcesForTopic(topicCode: string): Promise<{
    study: Resource[];
    revision: Resource[];
    practice: Resource[];
    expert: Resource[];
  }> {
    // Extract subject code from topic code (e.g., H01/02 -> H01)
    const subjectCode = topicCode.split('/')[0];
    const subjectFile = await this.loadSubjectResourceFile(subjectCode);
    
    if (!subjectFile || !subjectFile.topic_resources[topicCode]) {
      return { study: [], revision: [], practice: [], expert: [] };
    }

    const topicResources = subjectFile.topic_resources[topicCode].resources;
    
    return {
      study: this.getResourcesByIds(topicResources.study || [], subjectFile),
      revision: this.getResourcesByIds(topicResources.revision || [], subjectFile),
      practice: this.getResourcesByIds(topicResources.practice || [], subjectFile),
      expert: this.getResourcesByIds(topicResources.expert || [], subjectFile)
    };
  }

  /**
   * Get resources for specific task types
   */
  static async getResourcesForTaskType(taskType: string, subjectCode?: string): Promise<Resource[]> {
    const results: Resource[] = [];
    
    if (subjectCode) {
      const subjectFile = await this.loadSubjectResourceFile(subjectCode);
      if (subjectFile) {
        const allResourceIds: string[] = [];
        
        // Collect resources by task type from all topics
        Object.values(subjectFile.topic_resources).forEach(topic => {
          allResourceIds.push(...topic.resources[taskType as keyof typeof topic.resources] || []);
        });
        
        return this.getResourcesByIds(allResourceIds, subjectFile);
      }
    } else {
      // Get resources from all subjects for the task type
      const availableSubjects = await this.getAvailableSubjects();
      for (const subjectCode of availableSubjects) {
        const subjectResources = await this.getResourcesForTaskType(taskType, subjectCode);
        results.push(...subjectResources);
      }
    }
    
    return results;
  }

  /**
   * Search resources based on query criteria
   */
  static async searchResources(query: ResourceQuery): Promise<Resource[]> {
    const results: Resource[] = [];
    
    // If subjects are specified, search only those subjects
    const subjectsToSearch = query.subjects || await this.getAvailableSubjects();
    
    for (const subjectCode of subjectsToSearch) {
      const subjectFile = await this.loadSubjectResourceFile(subjectCode);
      if (!subjectFile) continue;
      
      for (const resource of Object.values(subjectFile.resources)) {
        // Apply filters
        if (query.taskTypes && !(resource as any).task_types?.some((taskType: string) => query.taskTypes!.includes(taskType))) {
          continue;
        }
        
        if (query.difficulty && resource.difficulty_level !== query.difficulty) {
          continue;
        }
        
        if (query.priority && resource.resource_priority !== query.priority) {
          continue;
        }
        
        if (query.estimatedHoursMax && resource.estimated_hours > query.estimatedHoursMax) {
          continue;
        }
        
        // Convert to standard Resource format
        const standardResource: Resource = {
          resource_id: resource.resource_id,
          resource_title: resource.resource_title,
          resource_type: resource.resource_type,
          resource_url: resource.resource_url,
          resource_description: resource.resource_description,
          resource_subjects: [subjectCode],
          difficulty_level: resource.difficulty_level,
          estimated_hours: resource.estimated_hours,
          resource_priority: resource.resource_priority,
          resource_cost: resource.resource_cost
        };
        
        results.push(standardResource);
      }
    }
    
    return results;
  }

  /**
   * Get resources by budget tier
   */
  static async getResourcesByBudgetTier(_tier: 'free' | 'budget' | 'premium'): Promise<Resource[]> {
    return await this.searchResources({
      // This would need cost filtering logic based on tier
      // For now, return free resources as example
    });
  }

  /**
   * Get resource statistics
   */
  static async getResourceStats(): Promise<{
    totalResources: number;
    resourcesByType: Record<string, number>;
    resourcesBySubject: Record<string, number>;
    averageCost: number;
  }> {
    
    return {
      totalResources: 0, // Would calculate from actual resources
      resourcesByType: {},
      resourcesBySubject: {},
      averageCost: 0 // Would calculate from actual resources
    };
  }

  /**
   * Helper method to get resources by IDs
   */
  private static getResourcesByIds(ids: string[], subjectFile: SubjectResourcesFile): Resource[] {
    return ids.map(id => {
      const fullResource = subjectFile.resources[id];
      if (!fullResource) return null;
      
      return {
        resource_id: fullResource.resource_id,
        resource_title: fullResource.resource_title,
        resource_type: fullResource.resource_type,
        resource_url: fullResource.resource_url || '',
        resource_description: fullResource.resource_description,
        resource_subjects: [subjectFile.subject_info.code], // Map from subject file
        difficulty_level: fullResource.difficulty_level,
        estimated_hours: fullResource.estimated_hours,
        resource_priority: fullResource.resource_priority,
        resource_cost: fullResource.resource_cost
      };
    }).filter((resource) => resource !== null);
  }

  /**
   * Suggest resources for a block based on subjects/s and requirements
   */
  static async suggestResourcesForBlock(
    subjects: string[], 
    _blockDurationWeeks: number,
    _taskType?: string,
    _budgetTier?: 'free' | 'budget' | 'premium'
  ): Promise<BlockResources> {
    const suggestions: BlockResources = {
      primary_books: [],
      supplementary_materials: [],
      practice_resources: [],
      video_content: [],
      current_affairs_sources: [],
      revision_materials: [],
      expert_recommendations: []
    };

    for (const subjectCode of subjects) {
      const subjectResources = await this.getResourcesForSubject(subjectCode);
      
      // Merge resources from all subjects
      suggestions.primary_books.push(...subjectResources.primary_books);
      suggestions.video_content.push(...subjectResources.video_content);
      suggestions.practice_resources.push(...subjectResources.practice_resources);
      suggestions.current_affairs_sources.push(...subjectResources.current_affairs_sources);
      suggestions.revision_materials.push(...subjectResources.revision_materials);
      suggestions.expert_recommendations.push(...subjectResources.expert_recommendations);
    }

    return suggestions;
  }
}
