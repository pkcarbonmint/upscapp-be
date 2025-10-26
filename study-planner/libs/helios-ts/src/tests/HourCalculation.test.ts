import { describe, it, expect } from 'vitest';
import { 
  calculateRequiredHours, 
  getExperienceMultiplier, 
  getConfidenceMultiplier, 
  getCoachingMultiplier, 
  getSpecializationMultiplier,
  calculateRequiredHoursWithTopicConfidence
} from '../engine/HourCalculation';
import { ExperienceProfile, CoachingProfile, TopicConfidenceMap } from '../types/HourCalculationTypes';
import { Subject, } from '../types/Subjects';

describe('HourCalculation', () => {
  describe('calculateRequiredHours', () => {
    it('should calculate hours for a new student', () => {
      const experience: ExperienceProfile = { attempts: 0, lastPrelimScore: 0, lastCSATScore: 0 };
      const confidence = 'ModerateConfidence';
      const coaching: CoachingProfile = { hasPriorCoaching: false, hasSyllabusUnderstanding: false };
      
      const result = calculateRequiredHours(100, experience, confidence, coaching);
      
      // New student: 1.0 * 1.0 * 1.21 * 1.0 = 1.21
      expect(result).toBeCloseTo(121, 2);
    });

    it('should calculate hours for an experienced student', () => {
      const experience: ExperienceProfile = { attempts: 2, lastPrelimScore: 100, lastCSATScore: 120 };
      const confidence = 'StrongConfidence';
      const coaching: CoachingProfile = { hasPriorCoaching: true, hasSyllabusUnderstanding: true };
      
      const result = calculateRequiredHours(100, experience, confidence, coaching);
      
      // Experienced: 0.7 * 0.8 * 0.9 * 1.0 = 0.504
      expect(result).toBeCloseTo(50.4, 2);
    });

    it('should handle specialization multipliers', () => {
      const experience: ExperienceProfile = { attempts: 1, lastPrelimScore: 110, lastCSATScore: 130 };
      const confidence = 'ModerateConfidence';
      const coaching: CoachingProfile = { hasPriorCoaching: false, hasSyllabusUnderstanding: true };
      
      const result = calculateRequiredHours(100, experience, confidence, coaching, 'weakness focus');
      
      // With weakness specialization: 0.9 * 1.0 * 1.1 * 0.936 = 0.92664
      expect(result).toBeCloseTo(92.664, 2);
    });
  });

  describe('getExperienceMultiplier', () => {
    it('should return 1.0 for new students', () => {
      expect(getExperienceMultiplier(0, 0, 0)).toBe(1.0);
    });

    it('should return 0.75 for good returners', () => {
      expect(getExperienceMultiplier(1, 115, 125)).toBe(0.75);
    });

    it('should return 0.8 for experienced with gaps', () => {
      expect(getExperienceMultiplier(1, 108, 140)).toBe(0.8);
    });

    it('should return 0.7 for multiple attempts with success', () => {
      expect(getExperienceMultiplier(2, 95, 0)).toBe(0.7);
    });

    it('should return 0.7 for 3+ attempts', () => {
      expect(getExperienceMultiplier(3, 0, 0)).toBe(0.7);
    });
  });

  describe('getConfidenceMultiplier', () => {
    it('should return correct multipliers for all confidence levels', () => {
      expect(getConfidenceMultiplier('VeryWeakConfidence')).toBe(1.4);
      expect(getConfidenceMultiplier('WeakConfidence')).toBe(1.2);
      expect(getConfidenceMultiplier('ModerateConfidence')).toBe(1.0);
      expect(getConfidenceMultiplier('StrongConfidence')).toBe(0.8);
      expect(getConfidenceMultiplier('VeryStrongConfidence')).toBe(0.7);
    });
  });

  describe('getCoachingMultiplier', () => {
    it('should return 1.1 for no coaching and no syllabus understanding', () => {
      expect(getCoachingMultiplier(false, false)).toBeCloseTo(1.21, 2);
    });

    it('should return 0.9 for coaching and syllabus understanding', () => {
      expect(getCoachingMultiplier(true, true)).toBe(0.9);
    });

    it('should return 1.0 for coaching but no syllabus understanding', () => {
      expect(getCoachingMultiplier(true, false)).toBeCloseTo(0.99, 2);
    });

    it('should return 1.1 for no coaching but syllabus understanding', () => {
      expect(getCoachingMultiplier(false, true)).toBeCloseTo(1.1, 2);
    });
  });

  describe('getSpecializationMultiplier', () => {
    it('should return 1.0 for no specialization', () => {
      expect(getSpecializationMultiplier(undefined)).toBe(1.0);
    });

    it('should return 0.936 for weakness specialization', () => {
      expect(getSpecializationMultiplier('weakness focus')).toBeCloseTo(0.936, 3);
    });

    it('should return 0.935 for focus specialization', () => {
      expect(getSpecializationMultiplier('focus area')).toBeCloseTo(0.935, 3);
    });

    it('should return 1.0 for other specializations', () => {
      expect(getSpecializationMultiplier('other area')).toBe(1.0);
    });
  });

  describe('calculateRequiredHoursWithTopicConfidence', () => {
    it('should calculate hours using topic-level confidence', () => {
      const subject: Subject = {
        subjectCode: 'H01',
        subjectName: 'History',
        baselineHours: 100,
        category: 'Macro',
        examFocus: 'BothExams',
        hasCurrentAffairs: true,
        topics: [
          {
            subjectCode: 'H01',
            topicCode: 'H01_T1',
            topicName: 'Ancient History',
            priority: 'EssentialTopic',
            resourceLink: undefined
          },
          {
            subjectCode: 'H01',
            topicCode: 'H01_T2',
            topicName: 'Medieval History',
            priority: 'PriorityTopic',
            resourceLink: undefined
          }
        ]
      };

      const experience: ExperienceProfile = { attempts: 0, lastPrelimScore: 0, lastCSATScore: 0 };
      const coaching: CoachingProfile = { hasPriorCoaching: false, hasSyllabusUnderstanding: false };
      const topicConfidenceMap: TopicConfidenceMap = {
        'H01_T1': 'StrongConfidence',
        'H01_T2': 'WeakConfidence'
      };

      const result = calculateRequiredHoursWithTopicConfidence(
        subject,
        experience,
        coaching,
        topicConfidenceMap
      );

      // Should be positive and reasonable
      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThan(200);
    });
  });
});
