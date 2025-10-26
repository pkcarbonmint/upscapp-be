import type { 
  Resource, 
} from '../types/models';

/**
 * Study material entry from study-materials.json
 */
export interface StudyMaterial {
  subjectCode: string;
  topicCode?: string;
  basics: string[];
  textbooks: string[];
  value_addition: string[];
  rapid_revision_practice: string[];
}

/**
 * Subject-specific resource file structure
 */
export interface SubjectResourcesFile {
  subject_info: {
    code: string;
    name: string;
    category: string;
    exam_focus: string;
    has_current_affairs: boolean;
    baseline_hours: number;
    resource_count: number;
  };
  topic_resources: Record<string, {
    topic_name: string;
    priority: string;
    resources: {
      study: string[];
      revision: string[];
      practice: string[];
      expert: string[];
    };
  }>;
  resources: Record<string, Resource>;
  subject_level_resources: {
    primary_books: string[];
    supplementary_materials: string[];
    practice_resources: string[];
    video_content: string[];
    current_affairs_sources: string[];
    revision_materials: string[];
    expert_recommendations: string[];
  };
}

/**
 * Master resource index structure
 */
export interface ResourceIndex {
  metadata: {
    version: string;
    created_date: string;
    description: string;
    total_subjects: number;
    last_updated: string;
  };
  subject_file_mapping: Record<string, {
    file_name: string;
    subject_name: string;
    category: string;
    resource_count: number;
  }>;
  resource_id_mapping: Record<string, {
    subject_codes: string[];
    topics: string[];
    primary_type: string;
  }>;
  quick_topic_lookup: Record<string, {
    subject_code: string;
    topic_name: string;
    resource_count: number;
  }>;
  subject_categories: Record<string, {
    subjects: string[];
    resource_count: number;
    exam_focus: string;
  }>;
  resource_stats: {
    total_resources: number;
    total_topics: number;
    resources_by_type: Record<string, number>;
    resources_by_difficulty: Record<string, number>;
    resources_by_cost: Record<string, number>;
  };
}
