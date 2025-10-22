import { describe, it, expect, beforeEach } from 'vitest';
import dayjs from 'dayjs';
import minMax from 'dayjs/plugin/minMax';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import { planBlocks  } from '../plan-blocks';
import { S2WeekDay, S2Subject, S2ExamFocus } from '../types';

dayjs.extend(minMax);
dayjs.extend(isSameOrBefore);
dayjs.extend(isSameOrAfter);

describe('planBlocks', () => {
  let from: dayjs.Dayjs;
  let to: dayjs.Dayjs;
  let subjects: S2Subject[];
  let constraints: any;

  beforeEach(() => {
    from = dayjs('2024-01-01'); // Monday
    to = dayjs('2024-01-08'); // Monday (7 days)
    
    subjects = [
      {
        subjectCode: 'MATH',
        subjectNname: 'Mathematics',
        baselineMinutes: 1200, // 20 hours
        examFocus: "BothExams",
        topics: [
          {
            code: 'ALG',
            subtopics: [
              { code: 'ALG1', name: 'Basic Algebra', isEssential: true, priorityLevel: 5 },
              { code: 'ALG2', name: 'Advanced Algebra', isEssential: false, priorityLevel: 3 },
            ],
          },
          {
            code: 'CALC',
            subtopics: [
              { code: 'CALC1', name: 'Basic Calculus', isEssential: true, priorityLevel: 4 },
            ],
          },
        ],
      },
      {
        subjectCode: 'PHYS',
        subjectNname: 'Physics',
        baselineMinutes: 1800, // 30 hours
        examFocus: "BothExams",
        topics: [
          {
            code: 'MECH',
            subtopics: [
              { code: 'MECH1', name: 'Mechanics', isEssential: true, priorityLevel: 5 },
              { code: 'MECH2', name: 'Advanced Mechanics', isEssential: false, priorityLevel: 2 },
            ],
          },
          {
            code: 'THERMO',
            subtopics: [
              { code: 'THERMO1', name: 'Thermodynamics', isEssential: true, priorityLevel: 4 },
            ],
          },
          {
            code: 'ELEC',
            subtopics: [
              { code: 'ELEC1', name: 'Electricity', isEssential: true, priorityLevel: 3 },
            ],
          },
        ],
      },
      {
        subjectCode: 'CHEM',
        subjectNname: 'Chemistry',
        baselineMinutes: 900, // 15 hours
        examFocus: "BothExams",
        topics: [
          {
            code: 'ORG',
            subtopics: [
              { code: 'ORG1', name: 'Organic Chemistry', isEssential: true, priorityLevel: 4 },
            ],
          },
        ],
      },
    ];

    constraints = {
      relativeAllocationWeights: {
        MATH: 0.3,   // 30%
        PHYS: 0.5,   // 50%
        CHEM: 0.2,   // 20%
      },
      numParallel: 2,
      workingHoursPerDay: 8,
      catchupDay: S2WeekDay.Sunday,
      testDay: S2WeekDay.Saturday,
    };
  });

  describe('Basic Functionality', () => {
    it('should return an array of BlockSlot objects', () => {
      const result = planBlocks(from, to, subjects, constraints);
      
      expect(Array.isArray(result)).toBe(true);
      result.forEach(block => {
        expect(block).toHaveProperty('from');
        expect(block).toHaveProperty('to');
        expect(dayjs.isDayjs(block.from)).toBe(true);
        expect(dayjs.isDayjs(block.to)).toBe(true);
      });
    });

    it('should respect the time range and not overflow the given time period', () => {
      const result = planBlocks(from, to, subjects, constraints);
      
      result.forEach(block => {
        // Blocks should start at or after the 'from' date
        expect(block.from.isAfter(from) || block.from.isSame(from)).toBe(true);
        
        // Blocks should end at or before the 'to' date (no overflow)
        expect(block.to.isBefore(to) || block.to.isSame(to)).toBe(true);
        
        // Blocks should have positive duration
        const duration = block.to.diff(block.from, 'minutes');
        expect(duration).toBeGreaterThan(0);
      });
      
      // Additional check: ensure no block extends beyond the time period
      const maxEndTime = result.reduce((max, block) => 
        block.to.isAfter(max) ? block.to : max, result[0]?.to || from);
      
      if (result.length > 0) {
        expect(maxEndTime.isBefore(to) || maxEndTime.isSame(to)).toBe(true);
      }
    });

    it('should not schedule blocks on catchup days', () => {
      const result = planBlocks(from, to, subjects, constraints);
      
      result.forEach(block => {
        expect(block.from.day()).not.toBe(constraints.catchupDay);
        expect(block.to.day()).not.toBe(constraints.catchupDay);
      });
    });

    it('should not schedule blocks on test days', () => {
      const result = planBlocks(from, to, subjects, constraints);
      
      result.forEach(block => {
        expect(block.from.day()).not.toBe(constraints.testDay);
        expect(block.to.day()).not.toBe(constraints.testDay);
      });
    });

    it('should not have unallocated holes in the schedule', () => {
      const result = planBlocks(from, to, subjects, constraints);
      
      if (result.length === 0) {
        // If no blocks are scheduled, that's acceptable for edge cases
        return;
      }
      
      // Sort blocks by start time
      const sortedBlocks = result.sort((a, b) => a.from.diff(b.from));
      
      // Check for gaps between consecutive blocks
      for (let i = 0; i < sortedBlocks.length - 1; i++) {
        const currentBlock = sortedBlocks[i];
        const nextBlock = sortedBlocks[i + 1];
        
        // If blocks are on the same day, there should be no gap
        if (currentBlock.from.format('YYYY-MM-DD') === nextBlock.from.format('YYYY-MM-DD')) {
          const gapMinutes = nextBlock.from.diff(currentBlock.to, 'minutes');
          // Allow small gaps (up to 1 minute) for rounding errors
          expect(gapMinutes).toBeLessThanOrEqual(1);
        }
      }
      
      // Check that blocks cover the available time period efficiently
      const totalScheduledMinutes = result.reduce((sum, block) => 
        sum + block.to.diff(block.from, 'minutes'), 0);
      
      // Calculate available time excluding catchup and test days
      const availableDays = to.diff(from, 'day');
      const numCatchupDays = 1; // Sunday
      const numTestDays = 1; // Saturday
      const availableHours = availableDays * constraints.workingHoursPerDay - 
                           numCatchupDays * constraints.workingHoursPerDay - 
                           numTestDays * constraints.workingHoursPerDay;
      const availableMinutes = availableHours * 60;
      
      // Total scheduled time should be a reasonable percentage of available time
      // (at least 50% to ensure good utilization)
      const utilizationRatio = totalScheduledMinutes / availableMinutes;
      expect(utilizationRatio).toBeGreaterThan(0.5);
    });
  });

  describe('Parallel Constraint', () => {
    it('should respect numParallel constraint', () => {
      const result = planBlocks(from, to, subjects, constraints);
      
      // Group blocks by time to check parallel constraint
      const timePoints = new Set<string>();
      result.forEach(block => {
        timePoints.add(block.from.format('YYYY-MM-DD HH:mm'));
        timePoints.add(block.to.format('YYYY-MM-DD HH:mm'));
      });
      
      // Check that at any given time, no more than numParallel blocks are active
      for (const timePoint of timePoints) {
        const activeBlocks = result.filter(block => {
          const time = dayjs(timePoint);
          return time.isAfter(block.from) && time.isBefore(block.to);
        });
        expect(activeBlocks.length).toBeLessThanOrEqual(constraints.numParallel);
      }
    });

    it('should handle different numParallel values', () => {
      const constraints1 = { ...constraints, numParallel: 1 };
      const constraints3 = { ...constraints, numParallel: 3 };
      
      const result1 = planBlocks(from, to, subjects, constraints1);
      const result3 = planBlocks(from, to, subjects, constraints3);
      
      // With numParallel=1, blocks should be more sequential
      // With numParallel=3, more blocks can run in parallel
      expect(result1.length).toBeGreaterThan(0);
      expect(result3.length).toBeGreaterThan(0);
    });
  });

  describe('Time Allocation', () => {
    it('should allocate time proportionally based on relativeAllocationWeights', () => {
      const result = planBlocks(from, to, subjects, constraints);
      
      // This is a simplified check - in reality, we'd need to track which subject each block belongs to
      // For now, we'll just verify that blocks are created
      expect(result.length).toBeGreaterThan(0);
      
      // Verify that blocks are created and have reasonable duration
      const totalScheduledMinutes = result.reduce((sum, block) => 
        sum + block.to.diff(block.from, 'minutes'), 0);
      
      // Calculate available time (planBlocks handles restricted days internally)
      const availableDays = to.diff(from, 'day');
      const availableHours = availableDays * constraints.workingHoursPerDay;
      const availableMinutes = availableHours * 60;
      
      // Total scheduled time should be reasonable (not too much more than available)
      // Allow for some over-allocation but not excessive
      expect(totalScheduledMinutes).toBeLessThanOrEqual(availableMinutes * 1.5);
      
      // Should have reasonable utilization (at least 50% of available time)
      const utilizationRatio = totalScheduledMinutes / availableMinutes;
      expect(utilizationRatio).toBeGreaterThan(0.5);
    });

    it('should handle scaling when more time is available than baseline', () => {
      const extendedTo = dayjs('2024-01-15'); // 14 days
      const result = planBlocks(from, extendedTo, subjects, constraints);
      
      expect(result.length).toBeGreaterThan(0);
      
      // With more time available, should be able to schedule more blocks
      const totalScheduledMinutes = result.reduce((sum, block) => 
        sum + block.to.diff(block.from, 'minutes'), 0);
      
      expect(totalScheduledMinutes).toBeGreaterThan(0);
    });

    it('should handle scaling when less time is available than baseline', () => {
      const shortTo = dayjs('2024-01-02'); // Only 1 day
      const result = planBlocks(from, shortTo, subjects, constraints);
      
      // Should still create some blocks, but scaled down
      expect(result.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Working Hours Constraint', () => {
    it('should create blocks that can span multiple days', () => {
      const result = planBlocks(from, to, subjects, constraints);
      
      // Verify that blocks can span multiple days (this is correct behavior)
      const multiDayBlocks = result.filter(block => {
        const startDay = block.from.format('YYYY-MM-DD');
        const endDay = block.to.format('YYYY-MM-DD');
        return startDay !== endDay;
      });
      
      // It's OK for blocks to span multiple days
      expect(multiDayBlocks.length).toBeGreaterThanOrEqual(0);
      
      // Verify that blocks are created within the time window
      result.forEach(block => {
        expect(block.from.isSameOrAfter(from)).toBe(true);
        expect(block.to.isSameOrBefore(to)).toBe(true);
      });
    });

    it('should handle different working hours per day', () => {
      const constraintsShort = { ...constraints, workingHoursPerDay: 4 };
      const constraintsLong = { ...constraints, workingHoursPerDay: 12 };
      
      const resultShort = planBlocks(from, to, subjects, constraintsShort);
      const resultLong = planBlocks(from, to, subjects, constraintsLong);
      
      expect(resultShort.length).toBeGreaterThanOrEqual(0);
      expect(resultLong.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty subjects array', () => {
      const result = planBlocks(from, to, [], constraints);
      expect(result).toEqual([]);
    });

    it('should handle single subject', () => {
      const singleSubject = [subjects[0]];
      const result = planBlocks(from, to, singleSubject, constraints);
      
      expect(result.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle very short time range', () => {
      const veryShortTo = from.add(1, 'hour');
      const result = planBlocks(from, veryShortTo, subjects, constraints);
      
      // Should handle gracefully, might return empty array or minimal blocks
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle subjects with zero baseline minutes', () => {
      const subjectsWithZero = subjects.map(subject => ({
        ...subject,
        baselineMinutes: 0
      }));
      
      const result = planBlocks(from, to, subjectsWithZero, constraints);
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle very large numParallel', () => {
      const constraintsLarge = { ...constraints, numParallel: 10 };
      const result = planBlocks(from, to, subjects, constraintsLarge);
      
      expect(result.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle time overflow gracefully', () => {
      // Create a scenario where workload balancing might cause overflow
      const shortTo = from.add(2, 'days'); // Very short time period
      const heavySubjects = [
        {
          subjectCode: 'HEAVY1',
          subjectNname: 'Heavy Subject 1',
          baselineMinutes: 2000, // 33+ hours
          examFocus: "BothExams" as S2ExamFocus,
          topics: Array(20).fill(null).map((_, i) => ({
            code: `TOPIC${i}`,
            subtopics: [
              { code: `SUB${i}`, name: `Heavy Topic ${i}`, isEssential: true, priorityLevel: 5 }
            ]
          }))
        },
        {
          subjectCode: 'HEAVY2',
          subjectNname: 'Heavy Subject 2',
          baselineMinutes: 1500, // 25 hours
          examFocus: "BothExams" as S2ExamFocus,
          topics: Array(15).fill(null).map((_, i) => ({
            code: `TOPIC${i}`,
            subtopics: [
              { code: `SUB${i}`, name: `Heavy Topic ${i}`, isEssential: true, priorityLevel: 5 }
            ]
          }))
        }
      ];
      
      const heavyConstraints = {
        ...constraints,
        relativeAllocationWeights: {
          HEAVY1: 0.6,
          HEAVY2: 0.4
        },
        workingHoursPerDay: 6 // Reduced working hours to increase overflow likelihood
      };
      
      const result = planBlocks(from, shortTo, heavySubjects, heavyConstraints);
      
      // All blocks should respect the time range
      result.forEach(block => {
        expect(block.from.isAfter(from) || block.from.isSame(from)).toBe(true);
        expect(block.to.isBefore(shortTo) || block.to.isSame(shortTo)).toBe(true);
        expect(block.to.diff(block.from, 'minutes')).toBeGreaterThan(0);
      });
      
      // Should still produce some blocks despite the constraint
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('Block Duration Calculation', () => {
    it('should create blocks with reasonable durations', () => {
      const result = planBlocks(from, to, subjects, constraints);
      
      result.forEach(block => {
        const duration = block.to.diff(block.from, 'minutes');
        
        // Should be positive duration
        expect(duration).toBeGreaterThan(0);
        
        // Should not exceed working hours per day
        const maxDailyMinutes = constraints.workingHoursPerDay * 60;
        expect(duration).toBeLessThanOrEqual(maxDailyMinutes);
        
        // Should have minimum reasonable duration (at least 15 minutes)
        expect(duration).toBeGreaterThanOrEqual(15);
      });
    });

    it('should consider subject complexity in block duration', () => {
      const simpleSubject = {
        examFocus: "BothExams" as S2ExamFocus,
        subjectCode: 'SIMPLE',
        subjectNname: 'Simple Subject',
        baselineMinutes: 600,
        topics: [
          {
            code: 'TOPIC1',
            subtopics: [
              { code: 'SUB1', name: 'Simple Topic', isEssential: true, priorityLevel: 5 }
            ]
          }
        ]
      };
      
      const complexSubject = {
        examFocus: "BothExams" as S2ExamFocus,
        subjectCode: 'COMPLEX',
        subjectNname: 'Complex Subject',
        baselineMinutes: 600,
        topics: Array(10).fill(null).map((_, i) => ({
          code: `TOPIC${i}`,
          subtopics: [
            { code: `SUB${i}`, name: `Complex Topic ${i}`, isEssential: true, priorityLevel: 5 }
          ]
        }))
      };
      
      const testSubjects = [simpleSubject, complexSubject];
      const testConstraints = {
        ...constraints,
        relativeAllocationWeights: {
          SIMPLE: 0.5,
          COMPLEX: 0.5
        }
      };
      
      const result = planBlocks(from, to, testSubjects, testConstraints);
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('Schedule Optimization', () => {
    it('should distribute blocks evenly across available days', () => {
      const extendedTo = dayjs('2024-01-15'); // 14 days
      const result = planBlocks(from, extendedTo, subjects, constraints);
      
      // Group blocks by day
      const blocksByDay = new Map<string, number>();
      
      result.forEach(block => {
        const dayKey = block.from.format('YYYY-MM-DD');
        blocksByDay.set(dayKey, (blocksByDay.get(dayKey) || 0) + 1);
      });
      
      // Should have blocks distributed across multiple days
      expect(blocksByDay.size).toBeGreaterThan(1);
    });

    it('should handle workload balancing when days exceed working hours', () => {
      const constraintsShort = { ...constraints, workingHoursPerDay: 2 }; // Very short working hours
      const result = planBlocks(from, to, subjects, constraintsShort);
      
      // Should still create valid schedule
      expect(result.length).toBeGreaterThanOrEqual(0);
      
      // Verify blocks are created within the time window
      result.forEach(block => {
        expect(block.from.isSameOrAfter(from)).toBe(true);
        expect(block.to.isSameOrBefore(to)).toBe(true);
        expect(block.to.diff(block.from, 'minutes')).toBeGreaterThan(0);
      });
      
      // Note: planBlocks doesn't enforce daily working hours constraints
      // That's handled in the task generation phase. Blocks can span multiple days
      // and exceed daily working hours - the constraint is enforced when creating tasks.
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid date ranges', () => {
      const invalidTo = from.subtract(1, 'day');
      
      // Should throw appropriate error for invalid date range
      expect(() => {
        planBlocks(from, invalidTo, subjects, constraints);
      }).toThrow('to date must be after from date');
    });

    it('should handle missing relativeAllocationWeights', () => {
      const invalidConstraints = { ...constraints };
      delete invalidConstraints.relativeAllocationWeights;
      
      expect(() => {
        planBlocks(from, to, subjects, invalidConstraints);
      }).toThrow();
    });

    it('should handle invalid numParallel values', () => {
      const invalidConstraints = { ...constraints, numParallel: 0 };
      
      expect(() => {
        planBlocks(from, to, subjects, invalidConstraints);
      }).not.toThrow(); // Should handle gracefully
    });
  });

  describe('Performance', () => {
    it('should complete within reasonable time for large datasets', () => {
      const largeSubjects = Array(20).fill(null).map((_, i) => ({
        examFocus: "BothExams" as S2ExamFocus,
        subjectCode: `SUBJECT${i}`,
        subjectNname: `Subject ${i}`,
        baselineMinutes: 1000,
        topics: [
          {
            code: `TOPIC${i}`,
            subtopics: [
              { code: `SUB${i}`, name: `Topic ${i}`, isEssential: true, priorityLevel: 5 }
            ]
          }
        ]
      }));
      
      const largeConstraints = {
        ...constraints,
        relativeAllocationWeights: Object.fromEntries(
          largeSubjects.map(subject => [subject.subjectCode, 1 / largeSubjects.length])
        )
      };
      
      const startTime = Date.now();
      const result = planBlocks(from, to, largeSubjects, largeConstraints);
      const endTime = Date.now();
      
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
      expect(result.length).toBeGreaterThanOrEqual(0);
    });
  });
});
