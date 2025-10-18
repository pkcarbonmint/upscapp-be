import type { SubjectResourcesFile, StudyMaterial } from './types';
import type { Subject } from '../types/Subjects';
import { loadAllSubjects } from '../services/SubjectLoader';

/**
 * Resource loading strategy using dynamic imports for optimal code splitting
 */
class ResourceLoader {
  private static cache = new Map<string, any>();
  private static studyMaterialsCache: StudyMaterial[] | null = null;
  private static knownSubjects: string[] = [];
  private static initialized = false;

  /**
   * Initialize resource loader with provided subjects or load them automatically
   * Prefer passing subjects to avoid duplicate loading
   */
  static async init(subjects?: Subject[]): Promise<void> {
    if (this.initialized) return;
    
    // Use provided subjects or load them automatically
    const subjectsToUse = subjects || await loadAllSubjects();
    this.knownSubjects = subjectsToUse.map(subject => subject.subjectCode);
    
    // Load study materials from the JSON file
    try {
      const studyMaterialsModule = await import('./data/study-materials.json');
      this.studyMaterialsCache = studyMaterialsModule.default as StudyMaterial[];
    } catch (error) {
      console.warn('Failed to load study materials:', error);
      this.studyMaterialsCache = [];
    }
    
    this.initialized = true;
  }

  /**
   * Load study materials for a specific subject
   */
  static async loadStudyMaterials(subjectCode: string): Promise<StudyMaterial[]> {
    await this.init();
    
    // Handle optional subjects with dynamic imports
    if (subjectCode.startsWith('OPT-')) {
      return await this.loadOptionalSubjectMaterials(subjectCode);
    }
    
    if (!this.studyMaterialsCache) {
      return [];
    }
    
    return this.studyMaterialsCache.filter(material => material.subjectCode === subjectCode);
  }

  /**
   * Load study materials for optional subjects using dynamic imports
   */
  private static async loadOptionalSubjectMaterials(subjectCode: string): Promise<StudyMaterial[]> {
    try {
      // Dynamic import of optional subject study materials
      const materialsModule = await import(`./data/${subjectCode}-study-materials.json`);
      return materialsModule.default as StudyMaterial[];
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.warn(`Failed to load study materials for ${subjectCode}:`, error);
      }
      return [];
    }
  }

  /**
   * Convert study materials to SubjectResourcesFile format for compatibility
   */
  static async loadSubjectResources(subjectCode: string): Promise<SubjectResourcesFile | null> {
    await this.init(); // Auto-initialize if not already done
    
    // Check cache first
    if (this.cache.has(subjectCode)) {
      return this.cache.get(subjectCode);
    }

    // Load study materials for this subject
    const studyMaterials = await this.loadStudyMaterials(subjectCode);
    
    if (studyMaterials.length === 0) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`ℹ️ Subject ${subjectCode} has no study materials`);
      }
      return null;
    }

    // Convert study materials to SubjectResourcesFile format
    const resourceData = await this.convertStudyMaterialsToResources(subjectCode, studyMaterials);
    
    // Cache the result
    this.cache.set(subjectCode, resourceData);
    
    return resourceData;
  }

  /**
   * Get all available subject codes
   */
  static async getAvailableSubjects(): Promise<string[]> {
    await this.init(); // Auto-initialize if not already done
    return [...this.knownSubjects];
  }

  /**
   * Preload resources for multiple subjects (useful for dashboards)
   */
  static async preloadResources(subjectCodes: string[]): Promise<Map<string, SubjectResourcesFile>> {
    await this.init(); // Auto-initialize if not already done
    
    const results = new Map<string, SubjectResourcesFile>();
    
    await Promise.allSettled(
      subjectCodes.map(async (subjectCode) => {
        const resources = await this.loadSubjectResources(subjectCode);
        if (resources) {
          results.set(subjectCode, resources);
        }
      })
    );

    return results;
  }

  /**
   * Convert study materials to SubjectResourcesFile format
   */
  private static async convertStudyMaterialsToResources(subjectCode: string, studyMaterials: StudyMaterial[]): Promise<SubjectResourcesFile> {
    const allSubjects = await loadAllSubjects();
    const subject = allSubjects.find(s => s.subjectCode === subjectCode);
    
    // For optional subjects, extract name from subjectCode if not found in allSubjects
    let subjectName = subject?.subjectName || subjectCode;
    if (subjectCode.startsWith('OPT-') && !subject) {
      // Extract subject name from code (e.g., OPT-SOC -> Sociology)
      const codeMap: Record<string, string> = {
        'OPT-SOC': 'Sociology',
        'OPT-HIS': 'History',
        'OPT-GEO': 'Geography',
        'OPT-POL': 'Political Science',
        'OPT-PUB': 'Public Administration',
        'OPT-ECO': 'Economics',
        'OPT-PSY': 'Psychology',
        'OPT-AGR': 'Agriculture',
        'OPT-ANT': 'Anthropology',
        'OPT-PHI': 'Philosophy'
      };
      subjectName = codeMap[subjectCode] || subjectCode;
    }
    
    // Get subject info
    const subjectInfo = {
      code: subjectCode,
      name: subjectName,
      category: subject?.category || (subjectCode.startsWith('OPT-') ? 'Optional' : 'Macro'),
      exam_focus: subject?.examFocus || (subjectCode.startsWith('OPT-') ? 'Mains' : 'BothExams'),
      has_current_affairs: subject?.hasCurrentAffairs || true,
      baseline_hours: subject?.baselineHours || 50,
      resource_count: studyMaterials.length
    };

    // Convert study materials to resources format
    const resources: Record<string, any> = {};
    const topicResources: Record<string, any> = {};
    const subjectLevelResources = {
      primary_books: [] as string[],
      supplementary_materials: [] as string[],
      practice_resources: [] as string[],
      video_content: [] as string[],
      current_affairs_sources: [] as string[],
      revision_materials: [] as string[],
      expert_recommendations: [] as string[]
    };

    let resourceId = 1;
    
    studyMaterials.forEach((material) => {
      const topicCode = material.topicCode || `${subjectCode}/00`;
      
      // Create topic resources entry
      topicResources[topicCode] = {
        topic_name: material.topicCode ? `Topic ${material.topicCode}` : 'Broad / Overlap',
        priority: 'Essential',
        resources: {
          study: [],
          revision: [],
          practice: [],
          expert: []
        },
        estimated_hours: 10
      };

      // Process basics
      if (material.basics && Array.isArray(material.basics)) {
        material.basics.forEach(basic => {
        const id = `r${resourceId.toString().padStart(3, '0')}`;
        resources[id] = {
          resource_id: id,
          resource_title: basic,
          resource_type: 'Book',
          resource_url: '',
          resource_description: `Foundation material: ${basic}`,
          difficulty_level: 'Beginner',
          estimated_hours: 5,
          resource_priority: 'Essential',
          resource_cost: { type: 'Free' },
          learning_outcomes: ['Basic understanding', 'Foundation knowledge'],
          tags: ['ncert', 'basics', 'foundation']
        };
        topicResources[topicCode].resources.study.push(id);
        subjectLevelResources.primary_books.push(id);
        resourceId++;
        });
      }

      // Process textbooks
      if (material.textbooks && Array.isArray(material.textbooks)) {
        material.textbooks.forEach(textbook => {
        const id = `r${resourceId.toString().padStart(3, '0')}`;
        resources[id] = {
          resource_id: id,
          resource_title: textbook,
          resource_type: 'Book',
          resource_url: '',
          resource_description: `Standard textbook: ${textbook}`,
          difficulty_level: 'Intermediate',
          estimated_hours: 15,
          resource_priority: 'Essential',
          resource_cost: { type: 'Paid', amount: 500 },
          learning_outcomes: ['Comprehensive understanding', 'Detailed knowledge'],
          tags: ['textbook', 'standard', 'comprehensive']
        };
        topicResources[topicCode].resources.study.push(id);
        subjectLevelResources.primary_books.push(id);
        resourceId++;
        });
      }

      // Process value addition
      if (material.value_addition && Array.isArray(material.value_addition)) {
        material.value_addition.forEach(valueAdd => {
          const id = `r${resourceId.toString().padStart(3, '0')}`;
          resources[id] = {
            resource_id: id,
            resource_title: valueAdd,
            resource_type: 'CurrentAffairsSource',
            resource_url: '',
            resource_description: `Value addition material: ${valueAdd}`,
            difficulty_level: 'Intermediate',
            estimated_hours: 3,
            resource_priority: 'Recommended',
            resource_cost: { type: 'Free' },
            learning_outcomes: ['Current affairs knowledge', 'Additional insights'],
            tags: ['value-addition', 'current-affairs', 'supplementary']
          };
          topicResources[topicCode].resources.revision.push(id);
          subjectLevelResources.current_affairs_sources.push(id);
          resourceId++;
        });
      }

      // Process rapid revision and practice
      if (material.rapid_revision_practice && Array.isArray(material.rapid_revision_practice)) {
        material.rapid_revision_practice.forEach(rrp => {
        const id = `r${resourceId.toString().padStart(3, '0')}`;
        resources[id] = {
          resource_id: id,
          resource_title: rrp,
          resource_type: 'MockTest',
          resource_url: '',
          resource_description: `Practice material: ${rrp}`,
          difficulty_level: 'Intermediate',
          estimated_hours: 8,
          resource_priority: 'Recommended',
          resource_cost: { type: 'Paid', amount: 300 },
          learning_outcomes: ['Practice and revision', 'Exam preparation'],
          tags: ['practice', 'revision', 'mock-test']
        };
        topicResources[topicCode].resources.practice.push(id);
        subjectLevelResources.practice_resources.push(id);
        resourceId++;
        });
      }
    });

    return {
      subject_info: subjectInfo,
      topic_resources: topicResources,
      resources,
      subject_level_resources: subjectLevelResources
    };
  }

  /**
   * Clear cache (useful for testing or memory management)
   */
  static clearCache(): void {
    this.cache.clear();
    this.studyMaterialsCache = null;
    this.initialized = false;
    this.knownSubjects = [];
  }
}

export default ResourceLoader;

/**
 * Convenience function for initializing the resource loader
 */
export async function initResourceLoader(subjects?: Subject[]): Promise<void> {
  return ResourceLoader.init(subjects);
}

/**
 * Convenience function for loading subject resources
 */
export async function loadSubjectResources(subjectCode: string): Promise<SubjectResourcesFile | null> {
  return ResourceLoader.loadSubjectResources(subjectCode);
}

/**
 * Convenience function for loading study materials
 */
export async function loadStudyMaterials(subjectCode: string): Promise<StudyMaterial[]> {
  return ResourceLoader.loadStudyMaterials(subjectCode);
}
