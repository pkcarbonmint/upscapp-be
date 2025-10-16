import { describe, it, expect } from 'vitest';
import { 
  generateInitialPlan,
  rebalancePlan,
  rebalanceStudyPlan,
  reviewPlan,
  validatePlan
} from '../engine/Engine';
import { StudentIntake, Archetype, createStudentIntake } from '../types/models';
import { ConfidenceLevel, TimeCommitment, SubjectApproach, StudyPacing } from '../types/Types';
import { TopicConfidenceMap } from '../types/HourCalculationTypes';


const dummyStuff = {
	preparation_background: {
		preparing_since: '6 months',
		number_of_attempts: '0', // Required - including "0" for freshers
		highest_stage_per_attempt: 'N/A', // Required - "N/A" for freshers
	},
	personal_details: {
		full_name: 'John Doe',
		email: 'john.doe@example.com',
		phone_number: '+91-9876543210',
		present_location: 'Delhi',
		student_archetype: 'General',
		graduation_stream: 'Engineering',
		college_university: 'IIT Delhi',
		year_of_passing: 2023
	},

}

describe('Engine', () => {
  const mockStudentIntake: StudentIntake = createStudentIntake({
    ...dummyStuff,
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
      study_approach: 'WeakFirst',
      revision_strategy: 'regular',
      test_frequency: 'weekly',
      seasonal_windows: [],
      catch_up_day_preference: 'sunday'
    },
    target_year: '2025',
    start_date: '2024-01-01'
  });

  const mockArchetype: Archetype = {
    archetype: 'The Full-Time Professional',
    description: 'Full-time student with 40+ hours per week',
    weeklyHoursMin: 35,
    weeklyHoursMax: 50,
    timeCommitment: 'FullTime' as TimeCommitment,
    defaultApproach: 'DualSubject' as SubjectApproach,
    defaultPacing: 'Balanced' as StudyPacing
  };

  const mockConfig = {
    block_duration_clamp: {
      min_weeks: 2,
      max_weeks: 8
    },
    daily_hour_limits: {
      regular_day: 8,
      catch_up_day: 10,
      test_day: 6
    },
    task_effort_split: {
      study: 0.6,
      revision: 0.2,
      practice: 0.15,
      test: 0.05,
      gs_optional_ratio: 1
    }
  };

  describe('generateInitialPlan', () => {
    it('should generate a complete study plan', async () => {
      const result = await generateInitialPlan(
        'user-123',
        mockConfig,
        mockArchetype,
        mockStudentIntake
      );
      
      expect(result.plan).toBeDefined();
      expect(result.logs).toBeDefined();
      expect(Array.isArray(result.logs)).toBe(true);
      
      // Check plan structure
      expect(result.plan.study_plan_id).toBeDefined();
      expect(result.plan.user_id).toBe('user-123');
      expect(result.plan.plan_title).toBeDefined();
      expect(result.plan.curated_resources).toBeDefined();
      expect(result.plan.effective_season_context).toBeDefined();
      expect(result.plan.created_for_target_year).toBe('2025');
      expect(result.plan.timelineAnalysis).toBeDefined();
      expect(result.plan.milestones).toBeDefined();
    });

    it('should adjust study hours based on archetype constraints', async () => {
      const intakeWithHighHours = {
        ...mockStudentIntake,
        study_strategy: {
          ...mockStudentIntake.study_strategy,
          weekly_study_hours: '60' // Above archetype max of 50
        }
      };
      
      const result = await generateInitialPlan(
        'user-123',
        mockConfig,
        mockArchetype,
        intakeWithHighHours
      );
      
      // Should have logged an adjustment
      const adjustmentLog = result.logs.find(log => 
        log.logMessage.includes('Study hours adjusted')
      );
      expect(adjustmentLog).toBeDefined();
    });

    it('should handle missing target year', async () => {
      const intakeWithoutTargetYear = {
        ...mockStudentIntake,
        target_year: undefined
      };
      
      const result = await generateInitialPlan(
        'user-123',
        mockConfig,
        mockArchetype,
        intakeWithoutTargetYear as any
      );
      
      expect(result.plan).toBeDefined();
      expect(result.plan.created_for_target_year).toBeUndefined();
      expect(result.plan.effective_season_context).toBe('ComprehensiveStudy');
    });

    it('should generate timeline analysis', async () => {
      const result = await generateInitialPlan(
        'user-123',
        mockConfig,
        mockArchetype,
        mockStudentIntake
      );
      
      expect(result.plan.timelineAnalysis).toBeDefined();
      expect(result.plan.timelineAnalysis?.currentYear).toBeDefined();
      expect(result.plan.timelineAnalysis?.targetYear).toBe(2025);
      expect(result.plan.timelineAnalysis?.weeksAvailable).toBeGreaterThan(0);
      expect(result.plan.timelineAnalysis?.cycleCount).toBeGreaterThan(0);
    });

    it('should calculate milestones for target year', async () => {
      const result = await generateInitialPlan(
        'user-123',
        mockConfig,
        mockArchetype,
        mockStudentIntake
      );
      
      expect(result.plan.milestones).toBeDefined();
      if (result.plan.milestones) {
        expect(result.plan.milestones.foundationToPrelimsDate).toBeDefined();
        expect(result.plan.milestones.prelimsToMainsDate).toBeDefined();
      }
    });
  });

  describe('rebalancePlan', () => {
    it('should return the same plan for now (placeholder)', async () => {
      const mockPlan = {
        study_plan_id: 'plan-123',
        user_id: 'user-123',
        plan_title: 'Test Plan',
        curated_resources: {} as any,
        created_for_target_year: '2025'
      };
      
      const mockPerformanceData = {};
      
      const result = await rebalancePlan(
        'user-123',
        mockConfig,
        mockArchetype,
        mockPlan as any,
        mockPerformanceData as any
      );
      
      expect(result).toBeDefined();
      // Currently returns the same plan (placeholder implementation)
      expect(result.study_plan_id).toBe(mockPlan.study_plan_id);
    });
  });

  describe('rebalanceStudyPlan', () => {
    it('should rebalance plan based on feedback', async () => {
      const mockPlan = {
        study_plan_id: 'plan-123',
        user_id: 'user-123',
        plan_title: 'Test Plan',
        curated_resources: {} as any,
        created_for_target_year: '2025',
        cycles: [
          {
            cycleId: 'cycle-1',
            cycleName: 'Foundation Cycle',
            cycleType: 'FoundationCycle',
            cycleOrder: 1,
            cycleIntensity: 'Moderate',
            cycleDuration: 12,
            cycleStartWeek: 0,
            cycleBlocks: [
              {
                block_id: 'block-1',
                block_title: 'Test Block',
                subjects: ['H01'],
                duration_weeks: 4,
                weekly_plan: [],
                block_resources: {} as any
              }
            ],
            cycleDescription: 'Test cycle'
          }
        ]
      };
      
      const mockFeedback = {
        subjectiveFeeling: 'FellBehind' as const
      };
      
      const mockTopicConfidenceMap: TopicConfidenceMap = {
        'H01_T1': 'WeakConfidence'
      };
      
      const result = await rebalanceStudyPlan(
        'user-123',
        mockConfig,
        mockPlan as any,
        2, // startWeek
        mockFeedback,
        mockTopicConfidenceMap
      );
      
      expect(result).toBeDefined();
      expect(result.study_plan_id).toBe(mockPlan.study_plan_id);
      expect(result.cycles).toBeDefined();
    });
  });

  describe('reviewPlan', () => {
    it('should review plan and return results', async () => {
      const mockPlan = {
        study_plan_id: 'plan-123',
        user_id: 'user-123',
        plan_title: 'Test Plan',
        curated_resources: {} as any,
        created_for_target_year: '2025'
      };
      
      const result = await reviewPlan(
        'user-123',
        mockConfig,
        mockPlan as any,
        mockStudentIntake
      );
      
      expect(result).toBeDefined();
      expect(result.review_id).toBeDefined();
      expect(result.plan_id).toBe('plan-123');
      expect(result.overall_score).toBeGreaterThan(0);
      expect(result.is_executable).toBe(true);
      expect(result.validation_issues).toBeDefined();
      expect(Array.isArray(result.validation_issues)).toBe(true);
      expect(result.fix_suggestions).toBeDefined();
      expect(Array.isArray(result.fix_suggestions)).toBe(true);
      expect(result.summary).toBeDefined();
      expect(result.detailed_feedback).toBeDefined();
    });
  });

  describe('validatePlan', () => {
    it('should validate plan and return boolean', async () => {
      const mockPlan = {
        study_plan_id: 'plan-123',
        user_id: 'user-123',
        plan_title: 'Test Plan',
        curated_resources: {} as any,
        created_for_target_year: '2025'
      };
      
      const result = await validatePlan(
        'user-123',
        mockConfig,
        mockPlan as any,
        mockStudentIntake
      );
      
      expect(typeof result).toBe('boolean');
      expect(result).toBe(true); // Currently always returns true (placeholder)
    });
  });
});
