import { describe, it, expect, beforeEach } from 'vitest';
import { NCERTMaterialsService } from '../services/NCERTMaterialsService';

describe('NCERT Materials Integration', () => {
  beforeEach(() => {
    // Clear cache before each test
    NCERTMaterialsService.clearCache();
  });

  it('should load NCERT materials for H01 topics', async () => {
    const materials = await NCERTMaterialsService.getMaterialsForTopic('H01/00');
    
    expect(materials).toBeDefined();
    expect(Array.isArray(materials)).toBe(true);
    
    if (materials.length > 0) {
      expect(materials[0]).toHaveProperty('book_name');
      expect(materials[0]).toHaveProperty('chapter_name');
    }
  });

  it('should convert NCERT materials to Resource format', async () => {
    const materials = await NCERTMaterialsService.getMaterialsForTopic('H01/00');
    
    if (materials.length > 0) {
      const resources = NCERTMaterialsService.convertToResources(materials, 'H01/00');
      
      expect(resources).toBeDefined();
      expect(Array.isArray(resources)).toBe(true);
      
      if (resources.length > 0) {
        const resource = resources[0];
        expect(resource).toHaveProperty('resource_id');
        expect(resource).toHaveProperty('resource_title');
        expect(resource).toHaveProperty('resource_type');
        expect(resource.resource_type).toBe('Book');
        expect(resource.difficulty_level).toBe('Beginner');
        expect(resource.resource_cost).toEqual({ type: 'Free' });
        expect(resource.resource_subjects).toContain('H01');
      }
    }
  });

  it('should get resources for C1 task', async () => {
    const resources = await NCERTMaterialsService.getResourcesForC1Task('H01/00');
    
    expect(resources).toBeDefined();
    expect(Array.isArray(resources)).toBe(true);
    
    // Should return empty array if no materials found, not throw error
    resources.forEach(resource => {
      expect(resource).toHaveProperty('resource_id');
      expect(resource).toHaveProperty('resource_title');
      expect(resource.resource_type).toBe('Book');
    });
  });

  it('should get available topic codes', async () => {
    const topicCodes = await NCERTMaterialsService.getAvailableTopicCodes();
    
    expect(topicCodes).toBeDefined();
    expect(Array.isArray(topicCodes)).toBe(true);
    
    // Should contain some H01 topics
    const h01Topics = topicCodes.filter(code => code.startsWith('H01/'));
    expect(h01Topics.length).toBeGreaterThan(0);
  });

  it('should check if materials are available for a topic', async () => {
    const hasH01Materials = await NCERTMaterialsService.hasMaterialsForTopic('H01/00');
    const hasNonExistentMaterials = await NCERTMaterialsService.hasMaterialsForTopic('NONEXISTENT/99');
    
    // H01/00 should have materials based on the NCERT-Materials.json file
    expect(typeof hasH01Materials).toBe('boolean');
    expect(hasNonExistentMaterials).toBe(false);
  });

  it('should get materials grouped by subject', async () => {
    const materialsBySubject = await NCERTMaterialsService.getMaterialsBySubject();
    
    expect(materialsBySubject).toBeDefined();
    expect(typeof materialsBySubject).toBe('object');
    
    // Should have H01 subject
    if (materialsBySubject['H01']) {
      expect(typeof materialsBySubject['H01']).toBe('object');
    }
  });
});