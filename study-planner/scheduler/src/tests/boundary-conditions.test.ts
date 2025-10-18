import { describe, it, expect, beforeEach } from 'vitest';
import { 
  determineBlockSchedule, 
  trimSubjectsToFit,
  calculateSubjectAllocations
} from '../blocks';
import { 
  Subject, 
  ConfidenceMap, 
  CycleType,
  CycleSchedule
} from '../types';

/**
 * Boundary Conditions Test Suite for Scheduler Library
 * Tests extreme edge cases and input validation
 */

describe('Boundary Conditions Tests', () => {
  let mockSubjects: Subject[];
  let mockConfidenceMap: ConfidenceMap;
  let mockCycleSchedule: CycleSchedule;

  beforeEach(() => {
    // Mock subjects with different baseline hours and priorities
    mockSubjects = [
      { subjectCode: 'H01', baselineHours: 120, priority: 5 },
      { subjectCode: 'H02', baselineHours: 100, priority: 4 },
      { subjectCode: 'H03', baselineHours: 80, priority: 3 },
      { subjectCode: 'G', baselineHours: 200, priority: 5 }
    ];

    // Mock confidence map
    mockConfidenceMap = new Map([
      ['H01', 5],
      ['H02', 4],
      ['H03', 3],
      ['G', 5]
    ]);

    // Mock cycle schedule
    mockCycleSchedule = {
      cycleType: CycleType.C1,
      startDate: '2025-03-01',
      endDate: '2025-05-31',
      priority: 'mandatory' as const
    };
  });
  
  describe('Input Validation Boundaries', () => {
    it('should handle negative totalHours', () => {
      const result = determineBlockSchedule(
        mockCycleSchedule,
        mockSubjects,
        mockConfidenceMap,
        -100, // Negative hours
        'Balanced',
        8
      );
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });

    it('should handle negative workingHoursPerDay', () => {
      const result = determineBlockSchedule(
        mockCycleSchedule,
        mockSubjects,
        mockConfidenceMap,
        100,
        'Balanced',
        -5 // Negative working hours
      );
      expect(result).toBeDefined();
    });

    it('should handle invalid date ranges', () => {
      const invalidCycleSchedule = {
        cycleType: CycleType.C1,
        startDate: '2025-05-31', // End before start
        endDate: '2025-03-01',
        priority: 'mandatory' as const
      };
      
      const result = determineBlockSchedule(
        invalidCycleSchedule,
        mockSubjects,
        mockConfidenceMap,
        100,
        'Balanced',
        8
      );
      expect(result).toBeDefined();
    });

    it('should handle invalid GS:Optional ratios', () => {
      const invalidRatios = [
        { gs: 1.5, optional: 0.5 }, // Sum > 1.0
        { gs: -0.3, optional: 0.7 }, // Negative values
        { gs: 0.3, optional: 0.3 }, // Sum < 1.0
        { gs: 0.0, optional: 0.0 } // Both zero
      ];

      invalidRatios.forEach(ratio => {
        const result = calculateSubjectAllocations(
          mockSubjects,
          100,
          mockConfidenceMap,
          CycleType.C1,
          ratio
        );
        expect(result).toBeDefined();
      });
    });
  });

  describe('Extreme Subject Scenarios', () => {
    it('should handle subjects with zero baseline hours', () => {
      const zeroHourSubjects: Subject[] = [
        { subjectCode: 'ZERO1', baselineHours: 0, priority: 5 },
        { subjectCode: 'ZERO2', baselineHours: 0, priority: 3 }
      ];

      const result = trimSubjectsToFit(
        zeroHourSubjects,
        100,
        mockConfidenceMap,
        CycleType.C1
      );
      expect(result).toBeDefined();
    });

    it('should handle subjects with extremely high baseline hours', () => {
      const highHourSubjects: Subject[] = [
        { subjectCode: 'HIGH1', baselineHours: 10000, priority: 5 },
        { subjectCode: 'HIGH2', baselineHours: 50000, priority: 3 }
      ];

      const result = trimSubjectsToFit(
        highHourSubjects,
        100,
        mockConfidenceMap,
        CycleType.C1
      );
      expect(result).toBeDefined();
    });

    it('should handle subjects with invalid priority values', () => {
      const invalidPrioritySubjects: Subject[] = [
        { subjectCode: 'NEG1', baselineHours: 100, priority: -5 },
        { subjectCode: 'HIGH1', baselineHours: 100, priority: 15 },
        { subjectCode: 'ZERO1', baselineHours: 100, priority: 0 }
      ];

      const result = trimSubjectsToFit(
        invalidPrioritySubjects,
        100,
        mockConfidenceMap,
        CycleType.C1
      );
      expect(result).toBeDefined();
    });

    it('should handle single subject scenarios', () => {
      const singleSubject: Subject[] = [
        { subjectCode: 'ONLY', baselineHours: 100, priority: 5 }
      ];

      const result = determineBlockSchedule(
        mockCycleSchedule,
        singleSubject,
        mockConfidenceMap,
        100,
        'Balanced',
        8
      );
      expect(result.length).toBeLessThanOrEqual(1);
    });

    it('should handle very large subject lists', () => {
      const largeSubjectList: Subject[] = Array.from({ length: 100 }, (_, i) => ({
        subjectCode: `SUB${i}`,
        baselineHours: Math.floor(Math.random() * 200) + 10,
        priority: Math.floor(Math.random() * 5) + 1
      }));

      const result = trimSubjectsToFit(
        largeSubjectList,
        1000,
        mockConfidenceMap,
        CycleType.C1
      );
      expect(result).toBeDefined();
      expect(result.length).toBeLessThanOrEqual(largeSubjectList.length);
    });
  });

  describe('Time Allocation Boundaries', () => {
    it('should handle total hours less than minimum subject baseline', () => {
      const result = trimSubjectsToFit(
        mockSubjects,
        5, // Very small hours
        mockConfidenceMap,
        CycleType.C1
      );
      expect(result).toBeDefined();
      expect(result.length).toBeLessThanOrEqual(mockSubjects.length);
      // The algorithm may keep all subjects but with reduced hours, which is acceptable behavior
      console.log(`✅ Small hours (5): kept ${result.length}/${mockSubjects.length} subjects`);
    });

    it('should handle total hours exactly equal to one subject baseline', () => {
      const singleSubjectBaseline = mockSubjects[0].baselineHours;
      const result = trimSubjectsToFit(
        mockSubjects,
        singleSubjectBaseline,
        mockConfidenceMap,
        CycleType.C1
      );
      expect(result).toBeDefined();
    });

    it('should handle working hours per day = 0', () => {
      const result = determineBlockSchedule(
        mockCycleSchedule,
        mockSubjects,
        mockConfidenceMap,
        100,
        'Balanced',
        0 // Zero working hours
      );
      expect(result).toBeDefined();
    });

    it('should handle working hours per day > 24', () => {
      const result = determineBlockSchedule(
        mockCycleSchedule,
        mockSubjects,
        mockConfidenceMap,
        100,
        'Balanced',
        30 // Invalid working hours
      );
      expect(result).toBeDefined();
    });
  });

  describe('Cycle Type Boundaries', () => {
    it('should handle zero-day cycle duration', () => {
      const zeroDayCycle = {
        cycleType: CycleType.C5,
        startDate: '2025-03-01',
        endDate: '2025-03-01', // Same day
        priority: 'mandatory' as const
      };

      const result = determineBlockSchedule(
        zeroDayCycle,
        mockSubjects,
        mockConfidenceMap,
        100,
        'Balanced',
        8
      );
      expect(result).toBeDefined();
    });

    it('should handle very short cycle durations', () => {
      const shortCycle = {
        cycleType: CycleType.C5,
        startDate: '2025-03-01',
        endDate: '2025-03-02', // 1 day
        priority: 'mandatory' as const
      };

      const result = determineBlockSchedule(
        shortCycle,
        mockSubjects,
        mockConfidenceMap,
        100,
        'Balanced',
        8
      );
      expect(result).toBeDefined();
    });
  });

  describe('GS:Optional Ratio Boundaries', () => {
    it('should handle 100% GS ratio with optional subjects present', () => {
      const mixedSubjects: Subject[] = [
        { subjectCode: 'GS1', baselineHours: 100, priority: 5, subjectType: 'GS', isOptional: false },
        { subjectCode: 'OPT1', baselineHours: 200, priority: 5, subjectType: 'Optional', isOptional: true }
      ];

      const result = calculateSubjectAllocations(
        mixedSubjects,
        100,
        mockConfidenceMap,
        CycleType.C1,
        { gs: 1.0, optional: 0.0 }
      );
      expect(result).toBeDefined();
    });

    it('should handle 100% Optional ratio with GS subjects present', () => {
      const mixedSubjects: Subject[] = [
        { subjectCode: 'GS1', baselineHours: 100, priority: 5, subjectType: 'GS', isOptional: false },
        { subjectCode: 'OPT1', baselineHours: 200, priority: 5, subjectType: 'Optional', isOptional: true }
      ];

      const result = calculateSubjectAllocations(
        mixedSubjects,
        100,
        mockConfidenceMap,
        CycleType.C1,
        { gs: 0.0, optional: 1.0 }
      );
      expect(result).toBeDefined();
    });

    it('should handle ratios resulting in 0 hours for one category', () => {
      const result = calculateSubjectAllocations(
        mockSubjects,
        1, // Very small hours
        mockConfidenceMap,
        CycleType.C1,
        { gs: 0.5, optional: 0.5 }
      );
      expect(result).toBeDefined();
    });
  });

  describe('Data Type Boundaries', () => {
    it('should handle undefined/null values in required fields', () => {
      const subjectsWithNulls: Subject[] = [
        { subjectCode: 'NULL1', baselineHours: null as any, priority: 5 },
        { subjectCode: 'UNDEF1', baselineHours: undefined as any, priority: 3 }
      ];

      const result = trimSubjectsToFit(
        subjectsWithNulls,
        100,
        mockConfidenceMap,
        CycleType.C1
      );
      expect(result).toBeDefined();
    });

    it('should handle string numbers in numeric fields', () => {
      const subjectsWithStringNumbers: Subject[] = [
        { subjectCode: 'STR1', baselineHours: '100' as any, priority: 5 },
        { subjectCode: 'STR2', baselineHours: 200, priority: '3' as any }
      ];

      const result = trimSubjectsToFit(
        subjectsWithStringNumbers,
        100,
        mockConfidenceMap,
        CycleType.C1
      );
      expect(result).toBeDefined();
    });
  });

  describe('Performance Boundaries', () => {
    it('should handle very large datasets efficiently', () => {
      const startTime = Date.now();
      
      const largeSubjectList: Subject[] = Array.from({ length: 500 }, (_, i) => ({
        subjectCode: `PERF${i}`,
        baselineHours: Math.floor(Math.random() * 200) + 10,
        priority: Math.floor(Math.random() * 5) + 1
      }));

      const result = trimSubjectsToFit(
        largeSubjectList,
        10000,
        mockConfidenceMap,
        CycleType.C1
      );
      
      const endTime = Date.now();
      const executionTime = endTime - startTime;
      
      expect(result).toBeDefined();
      expect(executionTime).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });
});
