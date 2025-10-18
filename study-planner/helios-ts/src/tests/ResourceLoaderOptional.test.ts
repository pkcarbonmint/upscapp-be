import { describe, it, expect, beforeEach } from 'vitest';
import ResourceLoader from '../resources/resourceIndex';

describe('ResourceLoader Optional Subjects', () => {
  beforeEach(() => {
    // Clear cache before each test
    ResourceLoader.clearCache();
  });

  it('should load study materials for OPT-SOC', async () => {
    const materials = await ResourceLoader.loadStudyMaterials('OPT-SOC');
    
    expect(materials).toBeDefined();
    expect(materials.length).toBeGreaterThan(0);
    expect(materials[0].subjectCode).toBe('OPT-SOC');
  });

  it('should load subject resources for OPT-SOC', async () => {
    const resources = await ResourceLoader.loadSubjectResources('OPT-SOC');
    
    expect(resources).not.toBeNull();
    expect(resources?.subject_info.code).toBe('OPT-SOC');
    expect(resources?.subject_info.name).toBe('Sociology');
  });

  it('should handle non-existent optional subjects gracefully', async () => {
    const materials = await ResourceLoader.loadStudyMaterials('OPT-NONEXISTENT');
    
    expect(materials).toEqual([]);
  });

  it('should still work with regular subjects', async () => {
    const materials = await ResourceLoader.loadStudyMaterials('H01');
    
    // This should work with existing subjects
    expect(Array.isArray(materials)).toBe(true);
  });
});
