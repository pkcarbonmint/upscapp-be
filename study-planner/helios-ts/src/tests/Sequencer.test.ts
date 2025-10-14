import { describe, it, expect } from 'vitest';
import { 
  sequenceSubjectsWithTargetYear,
  performMultiLevelSort,
  performMultiLevelSortWithTopicConfidence,
  filterBySeason
} from '../engine/Sequencer';
import { StudentIntake, createStudentIntake } from '../types/models';
import { Subject } from '../types/Subjects';
import { ConfidenceLevel, StudyPacing } from '../types/Types';
import { TopicConfidenceMap } from '../types/HourCalculationTypes';

describe('Sequencer', () => {
  const mockSubjects: Subject[] = [
    {
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
          priority: 'EssentialTopic'
        }
      ]
    },
    {
      subjectCode: 'G01',
      subjectName: 'Geography',
      baselineHours: 80,
      category: 'Macro',
      examFocus: 'BothExams',
      hasCurrentAffairs: true,
      topics: [
        {
          subjectCode: 'G01',
          topicCode: 'G01_T1',
          topicName: 'Physical Geography',
          priority: 'EssentialTopic'
        }
      ]
    },
    {
      subjectCode: 'P01',
      subjectName: 'Polity',
      baselineHours: 60,
      category: 'Micro',
      examFocus: 'PrelimsOnly',
      hasCurrentAffairs: false,
      topics: [
        {
          subjectCode: 'P01',
          topicCode: 'P01_T1',
          topicName: 'Constitution',
          priority: 'EssentialTopic'
        }
      ]
    }
  ];

  const mockStudentIntake: StudentIntake = createStudentIntake({
    subject_approach: 'DualSubject',
    subject_confidence: {
      'H01': 'Strong' as ConfidenceLevel,
      'G01': 'Moderate' as ConfidenceLevel,
      'P01': 'Weak' as ConfidenceLevel
    },
    study_strategy: {
      study_focus_combo: 'OneGSPlusOptional',
      weekly_study_hours: '40',
      time_distribution: 'balanced',
      study_approach: 'WeakFirst' as StudyPacing,
      revision_strategy: 'regular',
      test_frequency: 'weekly',
      seasonal_windows: [],
      catch_up_day_preference: 'sunday'
    },
    target_year: '2026',
    start_date: '2024-01-01'
  });

  describe('sequenceSubjectsWithTargetYear', () => {
    it('should sequence subjects correctly', async () => {
      const result = await sequenceSubjectsWithTargetYear(mockStudentIntake, mockSubjects);
      
      expect(result.subjects).toHaveLength(3);
      expect(result.warnings).toBeDefined();
      expect(Array.isArray(result.warnings)).toBe(true);
    });

    it('should handle empty subject list', async () => {
      const result = await sequenceSubjectsWithTargetYear(mockStudentIntake, []);
      
      expect(result.subjects).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('should handle missing confidence levels', async () => {
      const intakeWithoutConfidence = {
        ...mockStudentIntake,
        subject_confidence: {}
      };
      
      const result = await sequenceSubjectsWithTargetYear(intakeWithoutConfidence, mockSubjects);
      
      expect(result.subjects).toHaveLength(3);
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('filterBySeason', () => {
    it('should filter for PrelimsSeason', () => {
      const result = filterBySeason(mockSubjects, 'PrelimsSeason');
      
      // Should exclude MainsOnly subjects
      expect(result).toHaveLength(3); // All subjects are BothExams or PrelimsOnly
    });

    it('should filter for MainsSeason', () => {
      const result = filterBySeason(mockSubjects, 'MainsSeason');
      
      // Should exclude PrelimsOnly subjects
      expect(result).toHaveLength(2); // H01 and G01 are BothExams
    });

    it('should return all subjects for BalancedSeason', () => {
      const result = filterBySeason(mockSubjects, 'BalancedSeason');
      
      expect(result).toHaveLength(3);
    });
  });

  describe('performMultiLevelSort', () => {
    it('should sort by confidence first, then category', () => {
      const augmentedSubjects = mockSubjects.map(subject => ({
        subjectDetails: subject,
        studentConfidence: mockStudentIntake.subject_confidence[subject.subjectCode] || 'Moderate'
      }));

      const result = performMultiLevelSort(mockStudentIntake, augmentedSubjects);
      
      // With WeakFirst pacing: Weak (P01) first, then Moderate (G01), then Strong (H01)
      expect(result[0].subjectDetails.subjectCode).toBe('P01'); // Weak confidence
      expect(result[1].subjectDetails.subjectCode).toBe('G01'); // Moderate confidence  
      expect(result[2].subjectDetails.subjectCode).toBe('H01'); // Strong confidence
    });

    it('should sort by confidence for WeakFirst pacing', () => {
      const intakeWithWeakFirst = {
        ...mockStudentIntake,
        study_strategy: {
          ...mockStudentIntake.study_strategy,
          study_approach: 'WeakFirst' as StudyPacing
        }
      };

      const augmentedSubjects = mockSubjects.map(subject => ({
        subjectDetails: subject,
        studentConfidence: mockStudentIntake.subject_confidence[subject.subjectCode] || 'Moderate'
      }));

      const result = performMultiLevelSort(intakeWithWeakFirst, augmentedSubjects);
      
      // With WeakFirst pacing: Weak subjects come first overall
      expect(result[0].studentConfidence).toBe('Weak');    // P01
      expect(result[1].studentConfidence).toBe('Moderate'); // G01
      expect(result[2].studentConfidence).toBe('Strong');   // H01
    });

    it('should sort by confidence for StrongFirst pacing', () => {
      const intakeWithStrongFirst = {
        ...mockStudentIntake,
        study_strategy: {
          ...mockStudentIntake.study_strategy,
          study_approach: 'StrongFirst' as StudyPacing
        }
      };

      const augmentedSubjects = mockSubjects.map(subject => ({
        subjectDetails: subject,
        studentConfidence: mockStudentIntake.subject_confidence[subject.subjectCode] || 'Moderate'
      }));

      const result = performMultiLevelSort(intakeWithStrongFirst, augmentedSubjects);
      
      // With StrongFirst pacing: Strong subjects come first overall
      expect(result[0].studentConfidence).toBe('Strong');   // H01
      expect(result[1].studentConfidence).toBe('Moderate'); // G01
      expect(result[2].studentConfidence).toBe('Weak');     // P01
    });
  });

  describe('performMultiLevelSortWithTopicConfidence', () => {
    it('should sort with topic-level confidence', () => {
      const augmentedSubjects = mockSubjects.map(subject => ({
        subjectDetails: subject,
        studentConfidence: mockStudentIntake.subject_confidence[subject.subjectCode] || 'Moderate'
      }));

      const topicConfidenceMap: TopicConfidenceMap = {
        'H01_T1': 'StrongConfidence',
        'G01_T1': 'WeakConfidence',
        'P01_T1': 'ModerateConfidence'
      };

      const result = performMultiLevelSortWithTopicConfidence(
        mockStudentIntake,
        augmentedSubjects,
        topicConfidenceMap
      );

      expect(result).toHaveLength(3);
      // With WeakFirst pacing: Weak subjects come first overall
      expect(result[0].subjectDetails.subjectCode).toBe('P01'); // Weak confidence
      expect(result[1].subjectDetails.subjectCode).toBe('G01'); // Moderate confidence  
      expect(result[2].subjectDetails.subjectCode).toBe('H01'); // Strong confidence
    });
  });
});
