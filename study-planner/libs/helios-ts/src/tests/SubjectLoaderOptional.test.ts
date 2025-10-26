import { describe, it, expect, beforeEach } from 'vitest';
import { SubjectLoader, loadAllSubjects } from '../services/SubjectLoader';

describe('SubjectLoader with Optional Subjects', () => {
  beforeEach(() => {
    // Clear cache before each test
    SubjectLoader.clearCache();
  });

  it('should load all subjects without optional subject', async () => {
    const subjects = await loadAllSubjects();
    
    expect(subjects).toBeDefined();
    expect(subjects.length).toBeGreaterThan(0);
    
    // Check that no optional subjects are present
    const optionalSubjects = subjects.filter(s => s.subjectCode.startsWith('OPT-'));
    expect(optionalSubjects.length).toBe(0);
  });

  it('should add OPT-SOC to subjects list when specified', async () => {
    const subjects = await loadAllSubjects('OPT-SOC');
    
    expect(subjects).toBeDefined();
    expect(subjects.length).toBeGreaterThan(0);
    
    // Check that OPT-SOC is present
    const sociologySubject = subjects.find(s => s.subjectCode === 'OPT-SOC');
    expect(sociologySubject).toBeDefined();
    expect(sociologySubject?.subjectName).toBe('Sociology');
    expect(sociologySubject?.baselineHours).toBe(180);
    expect(sociologySubject?.examFocus).toBe('MainsOnly');
    expect(sociologySubject?.topics).toHaveLength(2);
    expect(sociologySubject?.topics[0].topicName).toBe('Sociology - Paper 1');
    expect(sociologySubject?.topics[1].topicName).toBe('Sociology - Paper 2');
  });

  it('should add OPT-AGR to subjects list when specified', async () => {
    const subjects = await loadAllSubjects('OPT-AGR');
    
    expect(subjects).toBeDefined();
    
    // Check that OPT-AGR is present
    const agricultureSubject = subjects.find(s => s.subjectCode === 'OPT-AGR');
    expect(agricultureSubject).toBeDefined();
    expect(agricultureSubject?.subjectName).toBe('Agriculture');
    expect(agricultureSubject?.baselineHours).toBe(200);
    expect(agricultureSubject?.examFocus).toBe('MainsOnly');
    expect(agricultureSubject?.topics).toHaveLength(2);
  });

  it('should handle non-existent optional subject gracefully', async () => {
    const subjects = await loadAllSubjects('OPT-NONEXISTENT');
    
    expect(subjects).toBeDefined();
    expect(subjects.length).toBeGreaterThan(0);
    
    // Check that no optional subjects are present
    const optionalSubjects = subjects.filter(s => s.subjectCode.startsWith('OPT-'));
    expect(optionalSubjects.length).toBe(0);
  });

  it('should cache subjects correctly', async () => {
    // First call
    const subjects1 = await loadAllSubjects('OPT-SOC');
    const sociologySubject1 = subjects1.find(s => s.subjectCode === 'OPT-SOC');
    
    // Second call should return cached data
    const subjects2 = await loadAllSubjects('OPT-SOC');
    const sociologySubject2 = subjects2.find(s => s.subjectCode === 'OPT-SOC');
    
    expect(sociologySubject1).toBeDefined();
    expect(sociologySubject2).toBeDefined();
    expect(sociologySubject1?.subjectName).toBe(sociologySubject2?.subjectName);
  });

  it('should reload subjects when optional subject changes', async () => {
    // Load with OPT-SOC
    const subjects1 = await loadAllSubjects('OPT-SOC');
    const sociologySubject = subjects1.find(s => s.subjectCode === 'OPT-SOC');
    expect(sociologySubject).toBeDefined();
    
    // Load with OPT-AGR
    const subjects2 = await loadAllSubjects('OPT-AGR');
    const agricultureSubject = subjects2.find(s => s.subjectCode === 'OPT-AGR');
    const sociologySubject2 = subjects2.find(s => s.subjectCode === 'OPT-SOC');
    
    expect(agricultureSubject).toBeDefined();
    expect(sociologySubject2).toBeUndefined(); // Should not be present anymore
  });
});
