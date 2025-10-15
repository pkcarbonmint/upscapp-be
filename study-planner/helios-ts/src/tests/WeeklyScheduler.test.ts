import { describe, it, expect } from 'vitest';
import { 
  scheduleWeeksInAllBlocks,
  scheduleWeeksInAllCycles
} from '../engine/WeeklyScheduler';
import { Block, StudyCycle } from '../types/models';
import { StudentIntake, createStudentIntake } from '../types/models';
import { Logger } from '../types/Types';
import { makeLogger } from '../services/Log';

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

describe('WeeklyScheduler', () => {
  const mockStudentIntake: StudentIntake = createStudentIntake({
    ...dummyStuff,
    subject_confidence: {
      'H01': 'Strong'
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
    subject_approach: 'DualSubject',
    target_year: '2025',
    start_date: '2024-01-01'
  });

  const mockArchetype = {
    archetype: 'The Full-Time Professional',
    description: 'Full-time student with 40+ hours per week',
    weeklyHoursMin: 35,
    weeklyHoursMax: 50,
    timeCommitment: 'FullTime',
    defaultApproach: 'DualSubject',
    defaultPacing: 'Balanced'
  };

  const mockConfig = {
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

  const mockLogger: Logger = makeLogger();

  const mockBlocks: Block[] = [
    {
      block_id: 'block-1',
      block_title: 'History Block',
      subjects: ['H01'],
      duration_weeks: 4,
      weekly_plan: [],
      block_resources: {
        primary_books: [],
        supplementary_materials: [],
        practice_resources: [],
        video_content: [],
        current_affairs_sources: [],
        revision_materials: [],
        expert_recommendations: []
      }
    }
  ];

  const mockCycles: StudyCycle[] = [
    {
      cycleId: 'cycle-1',
      cycleName: 'Foundation Cycle',
      cycleType: 'C2',
      cycleOrder: 1,
      cycleIntensity: 'Moderate',
      cycleDuration: 12,
      cycleStartWeek: 0,
      cycleBlocks: mockBlocks,
      cycleDescription: 'Foundation cycle covering all essential subjects',
      cycleStartDate: '2024-01-01',
      cycleEndDate: '2024-01-12'
    }
  ];

  describe('scheduleWeeksInAllBlocks', () => {
    it('should schedule weeks for all blocks', async () => {
      const result = await scheduleWeeksInAllBlocks(
        mockBlocks,
        mockStudentIntake,
        mockArchetype,
        mockConfig,
        mockLogger
      );
      
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(mockBlocks.length);
      
      // Each block should have weekly plans
      result.forEach(block => {
        expect(block.weekly_plan).toBeDefined();
        expect(Array.isArray(block.weekly_plan)).toBe(true);
        expect(block.weekly_plan.length).toBe(block.duration_weeks);
        
        // Each weekly plan should have daily plans
        block.weekly_plan.forEach(weeklyPlan => {
          expect(weeklyPlan.week).toBeGreaterThan(0);
          expect(weeklyPlan.daily_plans).toBeDefined();
          expect(Array.isArray(weeklyPlan.daily_plans)).toBe(true);
          expect(weeklyPlan.daily_plans.length).toBe(7); // 7 days in a week
          
          // Each daily plan should have tasks
          weeklyPlan.daily_plans.forEach(dailyPlan => {
            expect(dailyPlan.day).toBeGreaterThan(0);
            expect(dailyPlan.day).toBeLessThanOrEqual(7);
            expect(dailyPlan.tasks).toBeDefined();
            expect(Array.isArray(dailyPlan.tasks)).toBe(true);
          });
        });
      });
    });

    it('should handle empty blocks list', async () => {
      const result = await scheduleWeeksInAllBlocks(
        [],
        mockStudentIntake,
        mockArchetype,
        mockConfig,
        mockLogger
      );
      
      expect(result).toHaveLength(0);
    });

    it('should preserve block properties', async () => {
      const result = await scheduleWeeksInAllBlocks(
        mockBlocks,
        mockStudentIntake,
        mockArchetype,
        mockConfig,
        mockLogger
      );
      
      result.forEach((block, index) => {
        expect(block.block_id).toBe(mockBlocks[index].block_id);
        expect(block.block_title).toBe(mockBlocks[index].block_title);
        expect(block.subjects).toEqual(mockBlocks[index].subjects);
        expect(block.duration_weeks).toBe(mockBlocks[index].duration_weeks);
        expect(block.block_resources).toBeDefined();
      });
    });
  });

  describe('scheduleWeeksInAllCycles', () => {
    it('should schedule weeks for all cycles', async () => {
      const result = await scheduleWeeksInAllCycles(
        mockCycles,
        mockStudentIntake,
        mockArchetype,
        mockConfig,
        mockLogger
      );
      
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(mockCycles.length);
      
      // Each cycle should have scheduled blocks
      result.forEach(cycle => {
        expect(cycle.cycleBlocks).toBeDefined();
        expect(Array.isArray(cycle.cycleBlocks)).toBe(true);
        
        // Each block in the cycle should have weekly plans
        cycle.cycleBlocks.forEach(block => {
          expect(block.weekly_plan).toBeDefined();
          expect(Array.isArray(block.weekly_plan)).toBe(true);
          expect(block.weekly_plan.length).toBe(block.duration_weeks);
        });
      });
    });

    it('should preserve cycle structure', async () => {
      const result = await scheduleWeeksInAllCycles(
        mockCycles,
        mockStudentIntake,
        mockArchetype,
        mockConfig,
        mockLogger
      );
      
      result.forEach((cycle, index) => {
        expect(cycle.cycleId).toBe(mockCycles[index].cycleId);
        expect(cycle.cycleName).toBe(mockCycles[index].cycleName);
        expect(cycle.cycleType).toBe(mockCycles[index].cycleType);
        expect(cycle.cycleOrder).toBe(mockCycles[index].cycleOrder);
        expect(cycle.cycleIntensity).toBe(mockCycles[index].cycleIntensity);
        expect(cycle.cycleDuration).toBe(mockCycles[index].cycleDuration);
        expect(cycle.cycleDescription).toBe(mockCycles[index].cycleDescription);
      });
    });

    it('should handle empty cycles list', async () => {
      const result = await scheduleWeeksInAllCycles(
        [],
        mockStudentIntake,
        mockArchetype,
        mockConfig,
        mockLogger
      );
      
      expect(result).toHaveLength(0);
    });

    it('should schedule blocks within cycles', async () => {
      const result = await scheduleWeeksInAllCycles(
        mockCycles,
        mockStudentIntake,
        mockArchetype,
        mockConfig,
        mockLogger
      );
      
      result.forEach(cycle => {
        cycle.cycleBlocks.forEach(block => {
          // Each block should have the correct number of weekly plans
          expect(block.weekly_plan.length).toBe(block.duration_weeks);
          
          // Each weekly plan should have 7 daily plans
          block.weekly_plan.forEach(weeklyPlan => {
            expect(weeklyPlan.daily_plans.length).toBe(7);
          });
        });
      });
    });
  });
});
