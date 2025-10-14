import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { Resource } from '../types/models';

// Configuration
const AWS_REGION = process.env.AWS_REGION || 'us-east-1';
const TABLE_PREFIX = process.env.TABLE_PREFIX || '';

// Table names
const NCERT_MATERIALS_TABLE = `${TABLE_PREFIX}ncert-materials`;

// Initialize DynamoDB client
const dynamoClient = new DynamoDBClient({ region: AWS_REGION });
const docClient = DynamoDBDocumentClient.from(dynamoClient);

/**
 * NCERT Material structure for DynamoDB
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
 * DynamoDB-based service for managing NCERT materials for foundation cycle (C1) tasks
 */
export class DynamoDBNCERTMaterialsService {
  private static materialsCache: NCERTMaterialsMap | null = null;

  /**
   * Load NCERT materials from DynamoDB
   */
  private static async loadNCERTMaterials(): Promise<NCERTMaterialsMap> {
    if (this.materialsCache) {
      return this.materialsCache;
    }

    try {
      const response = await docClient.send(new ScanCommand({
        TableName: NCERT_MATERIALS_TABLE
      }));

      const materials: NCERTMaterialsMap = {};
      
      if (response.Items) {
        for (const item of response.Items) {
          const topicCode = item.topic_code;
          if (!materials[topicCode]) {
            materials[topicCode] = [];
          }
          materials[topicCode].push({
            book_name: item.book_name,
            chapter_name: item.chapter_name
          });
        }
      }

      this.materialsCache = materials;
      return materials;
    } catch (error) {
      console.warn('Failed to load NCERT materials from DynamoDB:', error);
      return {};
    }
  }

  /**
   * Get NCERT materials for a specific topic code
   */
  static async getMaterialsForTopic(topicCode: string): Promise<NCERTMaterial[]> {
    try {
      const response = await docClient.send(new QueryCommand({
        TableName: NCERT_MATERIALS_TABLE,
        KeyConditionExpression: 'topic_code = :topicCode',
        ExpressionAttributeValues: {
          ':topicCode': topicCode
        }
      }));

      if (!response.Items) {
        return [];
      }

      return response.Items.map(item => ({
        book_name: item.book_name,
        chapter_name: item.chapter_name
      }));
    } catch (error) {
      console.warn(`Failed to load NCERT materials for topic ${topicCode}:`, error);
      return [];
    }
  }

  /**
   * Get NCERT materials for multiple topic codes
   */
  static async getMaterialsForTopics(topicCodes: string[]): Promise<Record<string, NCERTMaterial[]>> {
    const result: Record<string, NCERTMaterial[]> = {};
    
    // Use Promise.all for parallel queries
    const promises = topicCodes.map(async (topicCode) => {
      const materials = await this.getMaterialsForTopic(topicCode);
      return { topicCode, materials };
    });

    const results = await Promise.all(promises);
    
    for (const { topicCode, materials } of results) {
      result[topicCode] = materials;
    }
    
    return result;
  }

  /**
   * Get NCERT materials for a specific subject
   */
  static async getMaterialsForSubject(subjectCode: string): Promise<Record<string, NCERTMaterial[]>> {
    try {
      const response = await docClient.send(new QueryCommand({
        TableName: NCERT_MATERIALS_TABLE,
        IndexName: 'SubjectIndex',
        KeyConditionExpression: 'subject_code = :subjectCode',
        ExpressionAttributeValues: {
          ':subjectCode': subjectCode
        }
      }));

      const result: Record<string, NCERTMaterial[]> = {};
      
      if (response.Items) {
        for (const item of response.Items) {
          const topicCode = item.topic_code;
          if (!result[topicCode]) {
            result[topicCode] = [];
          }
          result[topicCode].push({
            book_name: item.book_name,
            chapter_name: item.chapter_name
          });
        }
      }

      return result;
    } catch (error) {
      console.warn(`Failed to load NCERT materials for subject ${subjectCode}:`, error);
      return {};
    }
  }

  /**
   * Get NCERT materials for a specific book
   */
  static async getMaterialsForBook(bookName: string): Promise<Record<string, NCERTMaterial[]>> {
    try {
      const response = await docClient.send(new QueryCommand({
        TableName: NCERT_MATERIALS_TABLE,
        IndexName: 'BookIndex',
        KeyConditionExpression: 'book_name = :bookName',
        ExpressionAttributeValues: {
          ':bookName': bookName
        }
      }));

      const result: Record<string, NCERTMaterial[]> = {};
      
      if (response.Items) {
        for (const item of response.Items) {
          const topicCode = item.topic_code;
          if (!result[topicCode]) {
            result[topicCode] = [];
          }
          result[topicCode].push({
            book_name: item.book_name,
            chapter_name: item.chapter_name
          });
        }
      }

      return result;
    } catch (error) {
      console.warn(`Failed to load NCERT materials for book ${bookName}:`, error);
      return {};
    }
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
    try {
      const response = await docClient.send(new ScanCommand({
        TableName: NCERT_MATERIALS_TABLE,
        ProjectionExpression: 'topic_code'
      }));

      if (!response.Items) {
        return [];
      }

      const topicCodes = new Set<string>();
      for (const item of response.Items) {
        topicCodes.add(item.topic_code);
      }

      return Array.from(topicCodes);
    } catch (error) {
      console.warn('Failed to get available topic codes:', error);
      return [];
    }
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
    try {
      const response = await docClient.send(new ScanCommand({
        TableName: NCERT_MATERIALS_TABLE
      }));

      const result: Record<string, Record<string, NCERTMaterial[]>> = {};
      
      if (response.Items) {
        for (const item of response.Items) {
          const topicCode = item.topic_code;
          const subjectCode = topicCode.split('/')[0];
          
          if (!result[subjectCode]) {
            result[subjectCode] = {};
          }
          if (!result[subjectCode][topicCode]) {
            result[subjectCode][topicCode] = [];
          }
          
          result[subjectCode][topicCode].push({
            book_name: item.book_name,
            chapter_name: item.chapter_name
          });
        }
      }

      return result;
    } catch (error) {
      console.warn('Failed to get materials by subject:', error);
      return {};
    }
  }

  /**
   * Get all unique book names
   */
  static async getAvailableBooks(): Promise<string[]> {
    try {
      const response = await docClient.send(new ScanCommand({
        TableName: NCERT_MATERIALS_TABLE,
        ProjectionExpression: 'book_name'
      }));

      if (!response.Items) {
        return [];
      }

      const books = new Set<string>();
      for (const item of response.Items) {
        books.add(item.book_name);
      }

      return Array.from(books);
    } catch (error) {
      console.warn('Failed to get available books:', error);
      return [];
    }
  }

  /**
   * Clear the materials cache (useful for testing)
   */
  static clearCache(): void {
    this.materialsCache = null;
  }
}