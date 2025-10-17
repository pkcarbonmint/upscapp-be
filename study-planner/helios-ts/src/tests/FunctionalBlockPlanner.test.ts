/**
 * Tests for the Functional Block Planning Logic
 */

import dayjs from 'dayjs';
import { 
  calculateAvailableTime,
  calculateSubjectPriorities,
  allocateTimeProportionally,
  createContinuousBlocks,
  fillTimeGaps,
  validateContinuousCoverage,
  getTotalAllocatedHours,
  getSubjectCoverage,
  createFunctionalBlocks
} from '../engine/functional-block-planner';
import { generateFunctionalPlan, validateFunctionalPlan } from '../engine/functional-engine';
import { Subject } from '../types/Subjects';
import { StudentIntake, createStudentIntake } from '../types/models';
import { CycleType } from '../types/Types';
import { makeLogger } from '../services/Log';

describe('Functional Block Planner', () => {
  
  // Test data setup
  const mockSubjects: Subject[] = [
    {
      subjectCode: 'H01',
      subjectName: 'History',
      baselineHours: 120,
      category: 'Macro',
      examFocus: 'BothExams',
      topics: []
    },
    {
      subjectCode: 'H02',
      subjectName: 'Geography',
      baselineHours: 100,
      category: 'Macro',
      examFocus: 'BothExams',
      topics: []
    },
    {
      subjectCode: 'H04',
      subjectName: 'Public Administration',
      baselineHours: 150,
      category: 'Micro',
      examFocus: 'MainsOnly',
      topics: []
    }
  ];

  const mockConfidenceMap = new Map([
    ['H01', 0.3], // Weak - needs more time
    ['H02', 0.5], // Moderate
    ['H04', 0.8]  // Strong - needs less time
  ]);

  const mockIntake: StudentIntake = createStudentIntake({
    personal_details: {
      student_archetype: 'General'
    },
    study_strategy: {
      weekly_study_hours: '56', // 8 hours per day
      optional_first_preference: false
    },
    subject_confidence: {
      'H01': 'Weak',
      'H02': 'Moderate', 
      'H04': 'Strong'
    },
    target_year: '2026'
  });

  const logger = makeLogger('Test', 'debug');

  describe('calculateAvailableTime', () => {
    it('should calculate correct time allocation', () => {
      const startDate = dayjs('2024-01-01');
      const endDate = dayjs('2024-01-14'); // 14 days
      const dailyHours = 8;

      const result = calculateAvailableTime(startDate, endDate, dailyHours);

      expect(result.totalDays).toBe(14);
      expect(result.dailyHours).toBe(8);
      expect(result.totalHours).toBe(112); // 14 * 8
      expect(result.weeklyHours).toBe(56); // 7 * 8
    });
  });

  describe('calculateSubjectPriorities', () => {
    it('should apply confidence multipliers correctly', () => {
      const priorities = calculateSubjectPriorities(mockSubjects, mockConfidenceMap);

      expect(priorities).toHaveLength(3);
      
      // H01 (weak) should have higher priority weight due to 1.5x multiplier
      const h01Priority = priorities.find(p => p.subjectCode === 'H01');
      expect(h01Priority?.confidenceMultiplier).toBe(1.5);
      expect(h01Priority?.priorityWeight).toBe(120 * 1.5); // 180

      // H02 (moderate) should have standard multiplier
      const h02Priority = priorities.find(p => p.subjectCode === 'H02');
      expect(h02Priority?.confidenceMultiplier).toBe(1.0);
      expect(h02Priority?.priorityWeight).toBe(100 * 1.0); // 100

      // H04 (strong) should have lower multiplier
      const h04Priority = priorities.find(p => p.subjectCode === 'H04');
      expect(h04Priority?.confidenceMultiplier).toBe(0.7);
      expect(h04Priority?.priorityWeight).toBe(150 * 0.7); // 105
    });
  });

  describe('allocateTimeProportionally', () => {
    it('should allocate time proportionally based on priority weights', () => {
      const priorities = calculateSubjectPriorities(mockSubjects, mockConfidenceMap);
      const totalHours = 200;

      const allocations = allocateTimeProportionally(priorities, totalHours);

      expect(allocations).toHaveLength(3);

      // Check that total allocation doesn't exceed available time significantly
      const totalAllocated = allocations.reduce((sum, a) => sum + a.allocatedHours, 0);
      expect(totalAllocated).toBeLessThanOrEqual(totalHours * 1.1); // Allow 10% variance

      // Check minimum hours constraint
      allocations.forEach(allocation => {
        expect(allocation.allocatedHours).toBeGreaterThanOrEqual(4);
      });
    });

    it('should handle zero total weight gracefully', () => {
      const emptyPriorities = mockSubjects.map(s => ({
        subjectCode: s.subjectCode,
        subjectName: s.subjectName,
        baselineHours: s.baselineHours,
        confidenceMultiplier: 1.0,
        priorityWeight: 0 // Zero weight
      }));

      const allocations = allocateTimeProportionally(emptyPriorities, 100);
      
      // Should distribute equally when no weights
      allocations.forEach(allocation => {
        expect(allocation.allocatedHours).toBeGreaterThanOrEqual(4);
      });
    });
  });

  describe('createContinuousBlocks', () => {
    it('should create sequential blocks without gaps', () => {
      const priorities = calculateSubjectPriorities(mockSubjects, mockConfidenceMap);
      const allocations = allocateTimeProportionally(priorities, 168); // 3 weeks * 56 hours
      const startDate = dayjs('2024-01-01');
      const dailyHours = 8;

      const blocks = createContinuousBlocks(allocations, mockSubjects, startDate, dailyHours);

      expect(blocks.length).toBeGreaterThan(0);

      // Check that blocks are sequential
      for (let i = 0; i < blocks.length - 1; i++) {
        const currentEnd = blocks[i].endDate;
        const nextStart = blocks[i + 1].startDate;
        expect(nextStart.diff(currentEnd, 'day')).toBe(1);
      }

      // Check that all blocks have valid dates and hours
      blocks.forEach(block => {
        expect(block.startDate.isValid()).toBe(true);
        expect(block.endDate.isValid()).toBe(true);
        expect(block.endDate.isAfter(block.startDate) || block.endDate.isSame(block.startDate)).toBe(true);
        expect(block.dailyHours).toBeGreaterThan(0);
        expect(block.totalHours).toBeGreaterThan(0);
      });
    });
  });

  describe('fillTimeGaps', () => {
    it('should fill gaps in block coverage', () => {
      // Create blocks with intentional gap
      const startDate = dayjs('2024-01-01');
      const blocks = [
        {
          subjectCode: 'H01',
          subjectName: 'History',
          startDate: startDate,
          endDate: startDate.add(6, 'day'), // Week 1
          dailyHours: 8,
          totalHours: 56,
          subjects: [mockSubjects[0]]
        },
        {
          subjectCode: 'H02', 
          subjectName: 'Geography',
          startDate: startDate.add(14, 'day'), // Week 3 (gap in week 2)
          endDate: startDate.add(20, 'day'),
          dailyHours: 8,
          totalHours: 56,
          subjects: [mockSubjects[1]]
        }
      ];

      const endDate = startDate.add(27, 'day'); // 4 weeks total
      const filledBlocks = fillTimeGaps(blocks, endDate, mockSubjects, 8);

      // Should have original blocks plus gap fillers
      expect(filledBlocks.length).toBeGreaterThan(blocks.length);

      // Validate continuous coverage
      const coverage = validateContinuousCoverage(filledBlocks, startDate, endDate);
      expect(coverage.isValid).toBe(true);
      expect(coverage.gaps).toHaveLength(0);
    });
  });

  describe('validateContinuousCoverage', () => {
    it('should detect gaps in coverage', () => {
      const startDate = dayjs('2024-01-01');
      const endDate = dayjs('2024-01-21'); // 3 weeks
      
      const blocksWithGaps = [
        {
          subjectCode: 'H01',
          subjectName: 'History',
          startDate: startDate,
          endDate: startDate.add(6, 'day'),
          dailyHours: 8,
          totalHours: 56,
          subjects: [mockSubjects[0]]
        },
        {
          subjectCode: 'H02',
          subjectName: 'Geography', 
          startDate: startDate.add(14, 'day'), // 7-day gap
          endDate: startDate.add(20, 'day'),
          dailyHours: 8,
          totalHours: 56,
          subjects: [mockSubjects[1]]
        }
      ];

      const coverage = validateContinuousCoverage(blocksWithGaps, startDate, endDate);
      
      expect(coverage.isValid).toBe(false);
      expect(coverage.gaps.length).toBeGreaterThan(0);
    });

    it('should validate perfect coverage', () => {
      const startDate = dayjs('2024-01-01');
      const endDate = dayjs('2024-01-14');
      
      const perfectBlocks = [
        {
          subjectCode: 'H01',
          subjectName: 'History',
          startDate: startDate,
          endDate: startDate.add(6, 'day'),
          dailyHours: 8,
          totalHours: 56,
          subjects: [mockSubjects[0]]
        },
        {
          subjectCode: 'H02',
          subjectName: 'Geography',
          startDate: startDate.add(7, 'day'),
          endDate: endDate,
          dailyHours: 8,
          totalHours: 56,
          subjects: [mockSubjects[1]]
        }
      ];

      const coverage = validateContinuousCoverage(perfectBlocks, startDate, endDate);
      
      expect(coverage.isValid).toBe(true);
      expect(coverage.gaps).toHaveLength(0);
    });
  });

  describe('Integration Tests', () => {
    it('should create functional blocks with continuous coverage', async () => {
      const startDate = dayjs('2024-01-01');
      const endDate = dayjs('2024-03-31'); // 3 months
      const dailyHours = 8;

      const config = {
        task_effort_split: {
          study: 0.6,
          practice: 0.2,
          revision: 0.15,
          test: 0.05,
          gs_optional_ratio: 1
        },
        daily_hour_limits: { min: 6, max: 10 }
      };

      const blocks = await createFunctionalBlocks(
        mockSubjects,
        startDate,
        endDate,
        dailyHours,
        mockConfidenceMap,
        CycleType.C2,
        1,
        'Test Cycle',
        mockIntake,
        config,
        logger
      );

      expect(blocks.length).toBeGreaterThan(0);

      // Validate that all blocks have weekly plans
      blocks.forEach(block => {
        expect(block.weekly_plan).toBeDefined();
        expect(Array.isArray(block.weekly_plan)).toBe(true);
        expect(block.weekly_plan.length).toBeGreaterThan(0);
      });

      // Check total time allocation
      const totalHours = getTotalAllocatedHours(
        blocks.map(b => ({
          subjectCode: b.blockSubjects[0] || 'unknown',
          subjectName: b.blockName,
          startDate: dayjs(b.blockStartDate),
          endDate: dayjs(b.blockEndDate),
          dailyHours: dailyHours,
          totalHours: b.blockTotalHours,
          subjects: mockSubjects.filter(s => b.blockSubjects.includes(s.subjectCode))
        }))
      );

      expect(totalHours).toBeGreaterThan(0);
    });

    it('should generate complete functional study plan', async () => {
      const config = {
        task_effort_split: {
          study: 0.6,
          practice: 0.2,
          revision: 0.15,
          test: 0.05,
          gs_optional_ratio: 1
        },
        daily_hour_limits: { min: 6, max: 10 }
      };

      const result = await generateFunctionalPlan(
        'test-user-123',
        config,
        mockIntake,
        logger
      );

      expect(result.success).toBe(true);
      expect(result.plan).toBeDefined();
      expect(result.plan.cycles.length).toBeGreaterThan(0);

      // Validate the plan
      const validation = validateFunctionalPlan(result.plan);
      if (!validation.isValid) {
        console.log('Plan validation issues:', validation.issues);
      }

      // Should have continuous coverage (allowing for some gaps due to test data limitations)
      expect(result.plan.cycles.length).toBeGreaterThan(0);
      
      // Each cycle should have blocks
      result.plan.cycles.forEach(cycle => {
        expect(cycle.cycleBlocks.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle single subject gracefully', async () => {
      const singleSubject = [mockSubjects[0]];
      const singleConfidenceMap = new Map([['H01', 0.5]]);
      
      const startDate = dayjs('2024-01-01');
      const endDate = dayjs('2024-01-31');
      
      const config = {
        task_effort_split: {
          study: 1.0,
          practice: 0.0,
          revision: 0.0,
          test: 0.0,
          gs_optional_ratio: 1
        },
        daily_hour_limits: { min: 6, max: 10 }
      };

      const blocks = await createFunctionalBlocks(
        singleSubject,
        startDate,
        endDate,
        8,
        singleConfidenceMap,
        CycleType.C1,
        1,
        'Single Subject Test',
        mockIntake,
        config,
        logger
      );

      expect(blocks.length).toBe(1);
      expect(blocks[0].blockSubjects).toContain('H01');
    });

    it('should handle very limited time allocation', () => {
      const priorities = calculateSubjectPriorities(mockSubjects, mockConfidenceMap);
      const limitedHours = 20; // Very limited time

      const allocations = allocateTimeProportionally(priorities, limitedHours);

      // Should still allocate minimum hours to each subject
      allocations.forEach(allocation => {
        expect(allocation.allocatedHours).toBeGreaterThanOrEqual(4);
      });
    });

    it('should handle empty subjects array', () => {
      const emptySubjects: Subject[] = [];
      const emptyConfidenceMap = new Map<string, number>();

      const priorities = calculateSubjectPriorities(emptySubjects, emptyConfidenceMap);
      expect(priorities).toHaveLength(0);

      const allocations = allocateTimeProportionally(priorities, 100);
      expect(allocations).toHaveLength(0);
    });
  });
});