import { describe, it, expect } from 'vitest';
import { 
  planBlocks,
  planBlocksWithRebalancing
} from '../engine/BlockPlanner';
import { Archetype, StudentIntake } from '../types/models';
import { Subject } from '../types/Subjects';
import { ConfidenceLevel, Logger } from '../types/Types';
import { TopicConfidenceMap } from '../types/HourCalculationTypes';
import { makeLogger } from '../services/Log';

describe('BlockPlanner', () => {
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
        },
        {
          subjectCode: 'H01',
          topicCode: 'H01_T2',
          topicName: 'Medieval History',
          priority: 'PriorityTopic'
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

  const mockStudentIntake: StudentIntake = {
    subject_confidence: {
      'H01': 'Strong' as ConfidenceLevel,
      'G01': 'Moderate' as ConfidenceLevel,
      'P01': 'Weak' as ConfidenceLevel
    },
    study_strategy: {
      study_focus_combo: 'OneGSPlusOptional',
      weekly_study_hours: '40',
      time_distribution: 'balanced',
      study_approach: 'WeakFirst',
      revision_strategy: 'regular',
      test_frequency: 'weekly',
      seasonal_windows: [],
      catch_up_day_preference: 'sunday'
    },
    target_year: '2025',
    start_date: '2024-01-01'
  };

  const mockArchetype: Archetype = {
    archetype: 'The Full-Time Professional',
    description: 'Full-time student with 40+ hours per week',
    weeklyHoursMin: 35,
    weeklyHoursMax: 50,
    timeCommitment: 'FullTime',
    defaultApproach: 'DualSubject',
    defaultPacing: 'Balanced'
  };

  const mockConfig = {
    block_duration_clamp: {
      min_weeks: 2,
      max_weeks: 8
    }
  };

  const mockLogger: Logger = makeLogger();
  
  describe('planBlocks', () => {
    it('should create blocks from subjects', async () => {
      const result = await planBlocks(mockConfig, mockLogger, mockStudentIntake, mockArchetype, mockSubjects);
      
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      
      // Each block should have required properties
      result.forEach(block => {
        expect(block.block_id).toBeDefined();
        expect(block.block_title).toBeDefined();
        expect(block.subjects).toBeDefined();
        expect(Array.isArray(block.subjects)).toBe(true);
        expect(block.duration_weeks).toBeGreaterThan(0);
        expect(block.weekly_plan).toBeDefined();
        expect(Array.isArray(block.weekly_plan)).toBe(true);
        expect(block.block_resources).toBeDefined();
      });
    });

    it('should respect chunk size based on subject approach', async () => {
      const result = await planBlocks(mockConfig, mockLogger, mockStudentIntake, mockArchetype, mockSubjects);
      
      // With DualSubject approach, blocks should contain 2 subjects each
      result.forEach(block => {
        expect(block.subjects.length).toBeLessThanOrEqual(2);
      });
    });

    it('should handle empty subject list', async () => {
      const result = await planBlocks(mockConfig, mockLogger, mockStudentIntake, mockArchetype, []);
      
      expect(result).toHaveLength(0);
    });

    it('should create blocks with proper duration constraints', async () => {
      const result = await planBlocks(mockConfig, mockLogger, mockStudentIntake, mockArchetype, mockSubjects);
      
      result.forEach(block => {
        expect(block.duration_weeks).toBeGreaterThanOrEqual(mockConfig.block_duration_clamp.min_weeks);
        expect(block.duration_weeks).toBeLessThanOrEqual(mockConfig.block_duration_clamp.max_weeks);
      });
    });
  });

  describe('planBlocksWithRebalancing', () => {
    const mockFeedback = {
      subjectiveFeeling: 'FellBehind' as const
    };

    const mockTopicConfidenceMap: TopicConfidenceMap = {
      'H01_T1': 'StrongConfidence',
      'H01_T2': 'WeakConfidence',
      'G01_T1': 'ModerateConfidence',
      'P01_T1': 'VeryWeakConfidence'
    };

    it('should create rebalanced blocks', async () => {
      const result = await planBlocksWithRebalancing(
        mockConfig,
        mockLogger,
        mockStudentIntake,
        mockArchetype,
        mockSubjects,
        mockFeedback,
        mockTopicConfidenceMap
      );
      
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      
      // Each block should have required properties
      result.forEach(block => {
        expect(block.block_id).toBeDefined();
        expect(block.block_title).toBeDefined();
        expect(block.subjects).toBeDefined();
        expect(Array.isArray(block.subjects)).toBe(true);
        expect(block.duration_weeks).toBeGreaterThan(0);
        expect(block.weekly_plan).toBeDefined();
        expect(Array.isArray(block.weekly_plan)).toBe(true);
        expect(block.block_resources).toBeDefined();
      });
    });

    it('should adjust duration limits based on feedback', async () => {
      const result = await planBlocksWithRebalancing(
        mockConfig,
        mockLogger,
        mockStudentIntake,
        mockArchetype,
        mockSubjects,
        mockFeedback,
        mockTopicConfidenceMap
      );
      
      // For 'FellBehind' feedback, durations should be shorter
      result.forEach(block => {
        expect(block.duration_weeks).toBeGreaterThanOrEqual(1); // Adjusted min
        expect(block.duration_weeks).toBeLessThanOrEqual(5);    // Adjusted max (8-3)
      });
    });

    it('should handle different feedback types', async () => {
      const onTrackFeedback = { subjectiveFeeling: 'OnTrack' as const };
      const gotAheadFeedback = { subjectiveFeeling: 'GotAhead' as const };
      
      const onTrackResult = await planBlocksWithRebalancing(
        mockConfig,
        mockLogger,
        mockStudentIntake,
        mockArchetype,
        mockSubjects,
        onTrackFeedback,
        mockTopicConfidenceMap
      );
      
      const gotAheadResult = await planBlocksWithRebalancing(
        mockConfig,
        mockLogger,
        mockStudentIntake,
        mockArchetype,
        mockSubjects,
        gotAheadFeedback,
        mockTopicConfidenceMap
      );
      
      expect(onTrackResult).toBeDefined();
      expect(gotAheadResult).toBeDefined();
      
      // GotAhead should allow longer blocks
      const maxOnTrack = Math.max(...onTrackResult.map(b => b.duration_weeks));
      const maxGotAhead = Math.max(...gotAheadResult.map(b => b.duration_weeks));
      
      expect(maxGotAhead).toBeGreaterThanOrEqual(maxOnTrack);
    });

    it('should use topic-level confidence for calculations', async () => {
      const result = await planBlocksWithRebalancing(
        mockConfig,
        mockLogger,
        mockStudentIntake,
        mockArchetype,
        mockSubjects,
        mockFeedback,
        mockTopicConfidenceMap
      );
      
      // Should create blocks successfully using topic-level confidence
      expect(result.length).toBeGreaterThan(0);
      
      // Each block should have reasonable duration based on topic confidence
      result.forEach(block => {
        expect(block.duration_weeks).toBeGreaterThan(0);
        expect(block.duration_weeks).toBeLessThanOrEqual(10); // Reasonable upper bound
      });
    });
  });
});
