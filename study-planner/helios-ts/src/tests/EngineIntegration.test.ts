import { describe, it, expect } from 'vitest';
import { generateInitialPlan } from '../engine/Engine';
import { StudentIntake, Archetype, createStudentIntake } from '../types/models';
import { ConfidenceLevel, TimeCommitment, SubjectApproach, StudyPacing } from '../types/Types';
import { loadAllSubjects } from '../services/SubjectLoader';
import dayjs from 'dayjs';

describe('Engine Integration Tests', () => {
  // Helper to create base student data
  const createBaseStudentData = () => ({
    personal_details: {
      full_name: 'Test Student',
      email: 'test@example.com',
      phone_number: '+911234567890',
      present_location: 'Delhi, India',
      student_archetype: 'Full-Time Professional',
      graduation_stream: 'Engineering',
      college_university: 'Test University',
      year_of_passing: 2023
    },
    preparation_background: {
      preparing_since: '6 months',
      number_of_attempts: '0',
      highest_stage_per_attempt: 'N/A'
    }
  });

  // Test configuration
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
      test: 0.05
    }
  };

  // Test archetype
  const mockArchetype: Archetype = {
    archetype: 'The Full-Time Professional',
    description: 'Full-time student with 40+ hours per week',
    weeklyHoursMin: 35,
    weeklyHoursMax: 50,
    timeCommitment: 'FullTime' as TimeCommitment,
    defaultApproach: 'DualSubject' as SubjectApproach,
    defaultPacing: 'Balanced' as StudyPacing
  };

  describe('Complete Engine Workflow', () => {
    it('should generate a complete study plan with real subjects', async () => {
      // Load real subjects
      const allSubjects = loadAllSubjects();
      expect(allSubjects.length).toBeGreaterThan(0);
      
      // Create a realistic student intake
      const studentIntake: StudentIntake = createStudentIntake({
        subject_approach: 'DualSubject',
        subject_confidence: {
          'H01': 'Moderate' as ConfidenceLevel,
          'P01': 'Weak' as ConfidenceLevel,
          'G01': 'Strong' as ConfidenceLevel,
          'E01': 'Moderate' as ConfidenceLevel
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
        start_date: '2024-01-01',
        // Now required fields
        personal_details: {
          full_name: 'Test Student',
          email: 'test@example.com',
          phone_number: '+911234567890',
          present_location: 'Delhi, India',
          student_archetype: 'Full-Time Professional',
          graduation_stream: 'Engineering',
          college_university: 'Test University',
          year_of_passing: 2023
        },
        preparation_background: {
          preparing_since: '6 months',
          number_of_attempts: '0',
          highest_stage_per_attempt: 'N/A'
        }
      });

      // Generate the study plan
      const result = await generateInitialPlan(
        'test-user-123',
        mockConfig,
        mockArchetype,
        studentIntake
      );

      // Verify the plan structure
      expect(result.plan).toBeDefined();
      expect(result.logs).toBeDefined();
      expect(Array.isArray(result.logs)).toBe(true);

      // Verify plan properties
      expect(result.plan.study_plan_id).toBeDefined();
      expect(result.plan.user_id).toBe('test-user-123');
      expect(result.plan.plan_title).toBeDefined();
      expect(result.plan.curated_resources).toBeDefined();
      expect(result.plan.effective_season_context).toBeDefined();
      expect(result.plan.created_for_target_year).toBe('2026');
      expect(result.plan.timelineAnalysis).toBeDefined();
      expect(result.plan.milestones).toBeDefined();

      // Verify timeline analysis
      expect(result.plan.timelineAnalysis?.currentYear).toBeDefined();
      expect(result.plan.timelineAnalysis?.targetYear).toBe(2026);
      expect(result.plan.timelineAnalysis?.weeksAvailable).toBeGreaterThan(0);
      expect(result.plan.timelineAnalysis?.cycleCount).toBeGreaterThan(0);

      // Verify cycles are generated
      expect(result.plan.cycles).toBeDefined();
      expect(Array.isArray(result.plan.cycles)).toBe(true);
      expect(result.plan.cycles!.length).toBeGreaterThan(0);

      // Verify blocks are generated within cycles
      const allBlocks = result.plan.cycles!.flatMap(cycle => cycle.cycleBlocks);
      expect(allBlocks.length).toBeGreaterThan(0);

      // Verify blocks have proper structure
      allBlocks.forEach(block => {
        expect(block.block_id).toBeDefined();
        expect(block.block_title).toBeDefined();
        expect(block.subjects).toBeDefined();
        expect(Array.isArray(block.subjects)).toBe(true);
        expect(block.duration_weeks).toBeGreaterThan(0);
        expect(block.weekly_plan).toBeDefined();
        expect(Array.isArray(block.weekly_plan)).toBe(true);
        expect(block.block_resources).toBeDefined();
        expect(block.cycle_id).toBeDefined();
        expect(block.cycle_type).toBeDefined();
        expect(block.cycle_order).toBeDefined();
        expect(block.cycle_name).toBeDefined();
      });

      // Verify logs contain expected information
      const logMessages = result.logs.map(log => log.logMessage);
      expect(logMessages.some(msg => msg.includes('Starting initial plan generation'))).toBe(true);
      expect(logMessages.some(msg => msg.includes('Sequencing subjects'))).toBe(true);
      expect(logMessages.some(msg => msg.includes('Planning study structure'))).toBe(true);
      expect(logMessages.some(msg => msg.includes('Plan generation complete'))).toBe(true);

      console.log(`✅ Generated plan with ${result.plan.cycles!.length} cycles and ${allBlocks.length} blocks`);
      console.log(`✅ Timeline: ${result.plan.timelineAnalysis?.weeksAvailable} weeks available, ${result.plan.timelineAnalysis?.cycleCount} cycles`);
    });

    it('should handle different target years correctly', async () => {
      const currentYear = dayjs().year();
      const nextYear = currentYear + 1;
      const yearAfterNext = currentYear + 2;

      // Test with next year (should be comprehensive study)
      const intakeNextYear: StudentIntake = createStudentIntake({
        subject_approach: 'DualSubject',
        subject_confidence: {
          'H01': 'Moderate' as ConfidenceLevel,
          'P01': 'Moderate' as ConfidenceLevel
        },
        study_strategy: {
          study_focus_combo: 'OneGSPlusOptional',
          weekly_study_hours: '40',
          time_distribution: 'balanced',
          study_approach: 'Balanced' as StudyPacing,
          revision_strategy: 'regular',
          test_frequency: 'weekly',
          seasonal_windows: [],
          catch_up_day_preference: 'sunday'
        },
        target_year: nextYear.toString(),
        start_date: '2024-01-01',
        personal_details: {
          full_name: 'Test Student Next Year',
          email: 'test@example.com',
          phone_number: '+911234567890',
          present_location: 'Delhi, India',
          student_archetype: 'Full-Time Professional',
          graduation_stream: 'Engineering',
          college_university: 'Test University',
          year_of_passing: 2023
        },
        preparation_background: {
          preparing_since: '6 months',
          number_of_attempts: '0',
          highest_stage_per_attempt: 'N/A'
        }
      });

      const resultNextYear = await generateInitialPlan(
        'test-user-next-year',
        mockConfig,
        mockArchetype,
        intakeNextYear
      );

      expect(resultNextYear.plan.effective_season_context).toBe('ComprehensiveStudy');
      expect(resultNextYear.plan.timelineAnalysis?.targetYear).toBe(nextYear);

      // Test with year after next (should also be comprehensive study)
      const intakeYearAfterNext: StudentIntake = createStudentIntake({
        ...intakeNextYear,
        target_year: yearAfterNext.toString()
      });

      const resultYearAfterNext = await generateInitialPlan(
        'test-user-year-after-next',
        mockConfig,
        mockArchetype,
        intakeYearAfterNext
      );

      expect(resultYearAfterNext.plan.effective_season_context).toBe('ComprehensiveStudy');
      expect(resultYearAfterNext.plan.timelineAnalysis?.targetYear).toBe(yearAfterNext);
      expect(resultYearAfterNext.plan.timelineAnalysis?.weeksAvailable).toBeGreaterThan(
        resultNextYear.plan.timelineAnalysis?.weeksAvailable || 0
      );
    });

    it('should handle different archetypes correctly', async () => {
      const partTimeArchetype: Archetype = {
        archetype: 'The Working Professional',
        description: 'Working professional with limited study time',
        weeklyHoursMin: 15,
        weeklyHoursMax: 25,
        timeCommitment: 'PartTime' as TimeCommitment,
        defaultApproach: 'SingleSubject' as SubjectApproach,
        defaultPacing: 'Balanced' as StudyPacing
      };

      const studentIntake: StudentIntake = createStudentIntake({
        subject_approach: 'SingleSubject',
        subject_confidence: {
          'H01': 'Moderate' as ConfidenceLevel,
          'P01': 'Moderate' as ConfidenceLevel
        },
        study_strategy: {
          study_focus_combo: 'OneGS',
          weekly_study_hours: '20', // Within part-time limits
          time_distribution: 'balanced',
          study_approach: 'Balanced' as StudyPacing,
          revision_strategy: 'regular',
          test_frequency: 'weekly',
          seasonal_windows: [],
          catch_up_day_preference: 'sunday'
        },
        target_year: '2026',
        start_date: '2024-01-01',
        ...createBaseStudentData()
      });

      const result = await generateInitialPlan(
        'test-user-part-time',
        mockConfig,
        partTimeArchetype,
        studentIntake
      );

      expect(result.plan).toBeDefined();
      expect(result.plan.plan_title).toContain('Working professional with limited study time');
      
      // Check that no adjustment was made (hours are within limits)
      const adjustmentLogs = result.logs.filter(log => 
        log.logMessage.includes('Study hours adjusted')
      );
      expect(adjustmentLogs.length).toBe(0);
    });

    it('should adjust study hours when they exceed archetype limits', async () => {
      const studentIntake: StudentIntake = createStudentIntake({
        subject_approach: 'DualSubject',
        subject_confidence: {
          'H01': 'Moderate' as ConfidenceLevel,
          'P01': 'Moderate' as ConfidenceLevel
        },
        study_strategy: {
          study_focus_combo: 'OneGSPlusOptional',
          weekly_study_hours: '60', // Above archetype max of 50
          time_distribution: 'balanced',
          study_approach: 'Balanced' as StudyPacing,
          revision_strategy: 'regular',
          test_frequency: 'weekly',
          seasonal_windows: [],
          catch_up_day_preference: 'sunday'
        },
        target_year: '2026',
        start_date: '2024-01-01',
        ...createBaseStudentData()
      });

      const result = await generateInitialPlan(
        'test-user-high-hours',
        mockConfig,
        mockArchetype,
        studentIntake
      );

      // Check that an adjustment was logged
      const adjustmentLogs = result.logs.filter(log => 
        log.logMessage.includes('Study hours adjusted')
      );
      expect(adjustmentLogs.length).toBeGreaterThan(0);
      expect(adjustmentLogs[0].logMessage).toContain('60');
      expect(adjustmentLogs[0].logMessage).toContain('50');
    });

    it('should generate different cycle counts based on available time', async () => {
      const shortTermIntake: StudentIntake = createStudentIntake({
        subject_approach: 'DualSubject',
        subject_confidence: {
          'H01': 'Moderate' as ConfidenceLevel,
          'P01': 'Moderate' as ConfidenceLevel
        },
        study_strategy: {
          study_focus_combo: 'OneGSPlusOptional',
          weekly_study_hours: '40',
          time_distribution: 'balanced',
          study_approach: 'Balanced' as StudyPacing,
          revision_strategy: 'regular',
          test_frequency: 'weekly',
          seasonal_windows: [],
          catch_up_day_preference: 'sunday'
        },
        target_year: '2025', // Short term
        start_date: '2024-01-01',
        ...createBaseStudentData()
      });

      const longTermIntake: StudentIntake = createStudentIntake({
        ...shortTermIntake,
        target_year: '2027' // Long term
      });

      const shortTermResult = await generateInitialPlan(
        'test-user-short-term',
        mockConfig,
        mockArchetype,
        shortTermIntake
      );

      const longTermResult = await generateInitialPlan(
        'test-user-long-term',
        mockConfig,
        mockArchetype,
        longTermIntake
      );

      // Long term should have more cycles
      expect(longTermResult.plan.timelineAnalysis?.cycleCount).toBeGreaterThanOrEqual(
        shortTermResult.plan.timelineAnalysis?.cycleCount || 0
      );

      // Long term should have more weeks available
      expect(longTermResult.plan.timelineAnalysis?.weeksAvailable).toBeGreaterThan(
        shortTermResult.plan.timelineAnalysis?.weeksAvailable || 0
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle missing target year gracefully', async () => {
      const intakeWithoutTargetYear: StudentIntake = createStudentIntake({
        subject_confidence: {
          'H01': 'Moderate' as ConfidenceLevel
        },
        study_strategy: {
          study_focus_combo: 'OneGSPlusOptional',
          weekly_study_hours: '40',
          time_distribution: 'balanced',
          study_approach: 'Balanced' as StudyPacing,
          revision_strategy: 'regular',
          test_frequency: 'weekly',
          seasonal_windows: [],
          catch_up_day_preference: 'sunday'
        },
        target_year: undefined,
        start_date: '2024-01-01',
        ...createBaseStudentData()
      } as any);

      const result = await generateInitialPlan(
        'test-user-no-target-year',
        mockConfig,
        mockArchetype,
        intakeWithoutTargetYear
      );

      expect(result.plan).toBeDefined();
      expect(result.plan.effective_season_context).toBe('ComprehensiveStudy');
      expect(result.plan.created_for_target_year).toBeUndefined();
    });

    it('should handle empty subject confidence gracefully', async () => {
      const intakeWithoutConfidence: StudentIntake = createStudentIntake({
        subject_approach: 'DualSubject',
        subject_confidence: {},
        study_strategy: {
          study_focus_combo: 'OneGSPlusOptional',
          weekly_study_hours: '40',
          time_distribution: 'balanced',
          study_approach: 'Balanced' as StudyPacing,
          revision_strategy: 'regular',
          test_frequency: 'weekly',
          seasonal_windows: [],
          catch_up_day_preference: 'sunday'
        },
        target_year: '2026',
        start_date: '2024-01-01',
        ...createBaseStudentData()
      });

      const result = await generateInitialPlan(
        'test-user-no-confidence',
        mockConfig,
        mockArchetype,
        intakeWithoutConfidence
      );

      expect(result.plan).toBeDefined();
      expect(result.plan.cycles).toBeDefined();
      expect(result.plan.cycles!.length).toBeGreaterThan(0);
    });
  });
});
