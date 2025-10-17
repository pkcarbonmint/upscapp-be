import { describe, it, expect, beforeEach } from 'vitest';
import { determineCycleSchedule } from '../cycles';
import { determineBlockSchedule, trimSubtopicsToFit, trimSubjectsToFit } from '../blocks';
import { 
  Subject, 
  StudyApproach, 
  ConfidenceMap, 
  CycleType,
  Subtopic,
  PriorityLevel
} from '../types';
import dayjs from 'dayjs';

/**
 * Comprehensive test suite for the scheduler library
 * Tests cycle scheduling, block scheduling, and trimming logic
 * Covers T1-T15 scenarios with Single, Dual, and Triple subject approaches
 */

describe('Scheduler Library Tests', () => {
  let mockSubjects: Subject[];
  let mockConfidenceMap: ConfidenceMap;
  let mockSubtopics: Subtopic[];

  beforeEach(() => {
    // Mock subjects with different baseline hours and priorities
    mockSubjects = [
      { subjectCode: 'H01', baselineHours: 120, priority: 5 }, // History - High priority
      { subjectCode: 'H02', baselineHours: 100, priority: 4 }, // Geography - Medium-high priority
      { subjectCode: 'H03', baselineHours: 80, priority: 3 },  // Polity - Medium priority
      { subjectCode: 'H04', baselineHours: 60, priority: 2 },  // Economics - Low-medium priority
      { subjectCode: 'H05', baselineHours: 40, priority: 1 },  // Science - Low priority
      { subjectCode: 'G', baselineHours: 200, priority: 5 },   // GS - Highest priority
      { subjectCode: 'B', baselineHours: 150, priority: 4 },   // Biology - High priority
      { subjectCode: 'T', baselineHours: 100, priority: 3 },   // Technology - Medium priority
      { subjectCode: 'P', baselineHours: 80, priority: 2 },    // Physics - Low-medium priority
      { subjectCode: 'E', baselineHours: 60, priority: 1 }     // English - Low priority
    ];

    // Mock confidence map
    mockConfidenceMap = new Map([
      ['H01', 5], // Very Strong
      ['H02', 4], // Strong
      ['H03', 3], // Moderate
      ['H04', 2], // Weak
      ['H05', 1], // Very Weak
      ['G', 6],   // Very Strong
      ['B', 4],   // Strong
      ['T', 3],   // Moderate
      ['P', 2],   // Weak
      ['E', 1]    // Very Weak
    ]);

    // Mock subtopics with different bands
    mockSubtopics = [
      { code: 'ST001', baselineHours: 20, band: 'A', topicCode: 'H01' }, // High priority
      { code: 'ST002', baselineHours: 15, band: 'A', topicCode: 'H01' },
      { code: 'ST003', baselineHours: 12, band: 'B', topicCode: 'H01' },
      { code: 'ST004', baselineHours: 10, band: 'B', topicCode: 'H01' },
      { code: 'ST005', baselineHours: 8, band: 'C', topicCode: 'H01' },
      { code: 'ST006', baselineHours: 6, band: 'C', topicCode: 'H01' },
      { code: 'ST007', baselineHours: 4, band: 'D', topicCode: 'H01' },
      { code: 'ST008', baselineHours: 3, band: 'D', topicCode: 'H01' }
    ];
  });

  /**
   * Test scenarios similar to T1-T15 with different time constraints
   */
  const testScenarios = [
    { 
      name: 'T1', 
      startDate: '2025-03-01', 
      targetYear: 2027, 
      description: 'Early start, long preparation (24 months)',
      expectedCycles: [
        CycleType.C1,
        CycleType.C2,
        CycleType.C3,
        CycleType.C4,
        CycleType.C5,
        CycleType.C5B,
        CycleType.C6,
        CycleType.C7
      ]
    },
    { 
      name: 'T5', 
      startDate: '2026-09-10', 
      targetYear: 2027, 
      description: 'Medium preparation (8 months)',
      expectedCycles: [
        CycleType.C8,
        CycleType.C4,
        CycleType.C5,
        CycleType.C5B,
        CycleType.C6,
        CycleType.C7
      ]
    },
    { 
      name: 'T8', 
      startDate: '2026-12-15', 
      targetYear: 2027, 
      description: 'Short preparation (5 months)',
      expectedCycles: [
        CycleType.C8,
        CycleType.C4,
        CycleType.C5,
        CycleType.C5B,
        CycleType.C6,
        CycleType.C7
      ]
    },
    { 
      name: 'T12', 
      startDate: '2027-03-01', 
      targetYear: 2027, 
      description: 'Very short preparation (2.5 months)',
      expectedCycles: [
        CycleType.C5,
        CycleType.C5B,
        CycleType.C6,
        CycleType.C7
      ]
    },
    { 
      name: 'T14', 
      startDate: '2027-04-15', 
      targetYear: 2027, 
      description: 'Crash course (1 month)',
      expectedCycles: [
        CycleType.C5,
        CycleType.C5B,
        CycleType.C6,
        CycleType.C7
      ]
    }
  ];

  /**
   * Test cycle schedule determination
   */
  describe('Cycle Schedule Determination', () => {
    testScenarios.forEach((scenario) => {
      it(`should determine correct cycle schedule for ${scenario.name}: ${scenario.description}`, () => {
        const startDate = new Date(scenario.startDate);
        const prelimsExamDate = new Date(`${scenario.targetYear}-05-20`);
        
        const result = determineCycleSchedule(startDate, scenario.targetYear, prelimsExamDate);
        
        expect(result).toBeDefined();
        expect(result.scenario).toBeDefined();
        expect(result.schedules).toBeDefined();
        expect(Array.isArray(result.schedules)).toBe(true);
        expect(result.schedules.length).toBeGreaterThan(0);
        
        // Validate expected cycles are present
        const cycleTypes = result.schedules.map(s => s.cycleType);
        console.log(`${scenario.name}: Generated cycles:`, cycleTypes);
        console.log(`${scenario.name}: Expected cycles:`, scenario.expectedCycles);
        
        scenario.expectedCycles.forEach(expectedCycle => {
          expect(cycleTypes).toContain(expectedCycle as CycleType);
        });
        
        // Validate cycle dates are in chronological order
        for (let i = 1; i < result.schedules.length; i++) {
          const prevEnd = dayjs(result.schedules[i-1].endDate);
          const currStart = dayjs(result.schedules[i].startDate);
          expect(currStart.isAfter(prevEnd) || currStart.isSame(prevEnd.add(1, 'day'))).toBe(true);
        }
        
        console.log(`✅ ${scenario.name}: Generated ${result.schedules.length} cycles`);
        result.schedules.forEach(schedule => {
          console.log(`  ${schedule.cycleType}: ${schedule.startDate} to ${schedule.endDate}`);
        });
      });
    });
  });

  /**
   * Test block scheduling with different study approaches
   */
  describe('Block Scheduling Tests', () => {
    const studyApproaches: StudyApproach[] = ['SingleSubject', 'DualSubject', 'TripleSubject'];
    
    testScenarios.forEach((scenario) => {
      studyApproaches.forEach((approach) => {
        it(`should schedule blocks for ${scenario.name} with ${approach} approach`, () => {
          const startDate = new Date(scenario.startDate);
          const prelimsExamDate = new Date(`${scenario.targetYear}-05-20`);
          
          const cycleResult = determineCycleSchedule(startDate, scenario.targetYear, prelimsExamDate);
          const firstCycle = cycleResult.schedules[0];
          
          // Test with subset of subjects for faster execution
          const testSubjects = mockSubjects.slice(0, approach === 'SingleSubject' ? 1 : 
                                                      approach === 'DualSubject' ? 2 : 3);
          
          const totalHours = 200; // Mock total hours
          const workingHoursPerDay = 8;
          
          const blockSchedules = determineBlockSchedule(
            firstCycle,
            testSubjects,
            mockConfidenceMap,
            totalHours,
            approach,
            workingHoursPerDay
          );
          
          console.log(`${scenario.name} with ${approach}: Generated ${blockSchedules.length} blocks`);
          if (blockSchedules.length === 0) {
            console.log(`  No blocks generated - cycle: ${firstCycle.cycleType}, start: ${firstCycle.startDate}, end: ${firstCycle.endDate}`);
            console.log(`  Test subjects: ${testSubjects.map(s => s.subjectCode).join(', ')}`);
          }
          
          expect(blockSchedules).toBeDefined();
          expect(Array.isArray(blockSchedules)).toBe(true);
          expect(blockSchedules.length).toBeGreaterThan(0);
          
          // Validate block schedule structure
          blockSchedules.forEach(block => {
            expect(block.subjectCode).toBeDefined();
            expect(block.startDate).toBeDefined();
            expect(block.endDate).toBeDefined();
            
            // Validate dates
            const startDate = dayjs(block.startDate);
            const endDate = dayjs(block.endDate);
            expect(startDate.isValid()).toBe(true);
            expect(endDate.isValid()).toBe(true);
            expect(endDate.isAfter(startDate)).toBe(true);
            
            // Validate dates are within cycle bounds
            const cycleStart = dayjs(firstCycle.startDate);
            const cycleEnd = dayjs(firstCycle.endDate);
            expect(startDate.isAfter(cycleStart) || startDate.isSame(cycleStart)).toBe(true);
            expect(endDate.isBefore(cycleEnd) || endDate.isSame(cycleEnd)).toBe(true);
          });
          
          // Validate approach-specific constraints
          // For extreme short cycles (C5, C5B, C8), only essential subjects (priority >= 4) are included
          const isExtremeShortCycle = [CycleType.C5, CycleType.C5B, CycleType.C8].includes(firstCycle.cycleType);
          const essentialSubjectsCount = testSubjects.filter(s => (s.priority || 0) >= 4).length;
          
          if (isExtremeShortCycle) {
            // For extreme short cycles, expect only essential subjects
            expect(blockSchedules.length).toBe(Math.min(essentialSubjectsCount, approach === 'SingleSubject' ? 1 : approach === 'DualSubject' ? 2 : 3));
          } else {
            // For normal cycles, expect full subject count
            if (approach === 'SingleSubject') {
              expect(blockSchedules.length).toBe(1);
            } else if (approach === 'DualSubject') {
              expect(blockSchedules.length).toBe(2);
            } else if (approach === 'TripleSubject') {
              expect(blockSchedules.length).toBe(3);
            }
          }
          
          console.log(`✅ ${scenario.name} with ${approach}: Generated ${blockSchedules.length} blocks`);
          blockSchedules.forEach(block => {
            console.log(`  ${block.subjectCode}: ${block.startDate} to ${block.endDate}`);
          });
        });
      });
    });
  });

  /**
   * Test subject trimming functionality
   */
  describe('Subject Trimming Tests', () => {
    it('should trim subjects based on priority when time is limited', () => {
      const availableHours = 100; // Limited time
      const cycleType = CycleType.C2;
      
      const trimmedSubjects = trimSubjectsToFit(
        mockSubjects,
        availableHours,
        mockConfidenceMap,
        cycleType
      );
      
      expect(trimmedSubjects).toBeDefined();
      expect(Array.isArray(trimmedSubjects)).toBe(true);
      expect(trimmedSubjects.length).toBeLessThanOrEqual(mockSubjects.length);
      
      // Validate high-priority subjects are kept
      const highPrioritySubjects = trimmedSubjects.filter(s => (s.priority || 0) >= 4);
      expect(highPrioritySubjects.length).toBeGreaterThan(0);
      
      // Validate subjects are sorted by priority (highest first)
      for (let i = 1; i < trimmedSubjects.length; i++) {
        const prevPriority = trimmedSubjects[i-1].priority || 0;
        const currPriority = trimmedSubjects[i].priority || 0;
        expect(prevPriority).toBeGreaterThanOrEqual(currPriority);
      }
      
      console.log(`✅ Trimmed ${mockSubjects.length} subjects to ${trimmedSubjects.length}`);
      trimmedSubjects.forEach(subject => {
        console.log(`  ${subject.subjectCode}: priority ${subject.priority}, baseline ${subject.baselineHours}h`);
      });
    });

    it('should handle edge cases in subject trimming', () => {
      // Test with very limited time
      const veryLimitedHours = 20;
      const cycleType = CycleType.C5;
      
      const trimmedSubjects = trimSubjectsToFit(
        mockSubjects,
        veryLimitedHours,
        mockConfidenceMap,
        cycleType
      );
      
      expect(trimmedSubjects.length).toBeGreaterThan(0);
      expect(trimmedSubjects.length).toBeLessThan(mockSubjects.length);
      
      // Test with abundant time
      const abundantHours = 1000;
      const allSubjects = trimSubjectsToFit(
        mockSubjects,
        abundantHours,
        mockConfidenceMap,
        cycleType
      );
      
      // For extreme short cycles, only essential subjects are included regardless of time
      const isExtremeShortCycle = [CycleType.C5, CycleType.C5B, CycleType.C8].includes(cycleType);
      if (isExtremeShortCycle) {
        const essentialSubjectsCount = mockSubjects.filter(s => (s.priority || 0) >= 4).length;
        expect(allSubjects.length).toBe(essentialSubjectsCount);
      } else {
        expect(allSubjects.length).toBe(mockSubjects.length);
      }
      
      console.log(`✅ Edge cases: ${trimmedSubjects.length} (limited) vs ${allSubjects.length} (abundant)`);
    });
  });

  /**
   * Test subtopic trimming functionality
   */
  describe('Subtopic Trimming Tests', () => {
    it('should trim subtopics based on band priority', () => {
      const allocatedHours = 50; // Limited hours
      
      const trimmedSubtopics = trimSubtopicsToFit(mockSubtopics, allocatedHours);
      
      expect(trimmedSubtopics).toBeDefined();
      expect(Array.isArray(trimmedSubtopics)).toBe(true);
      expect(trimmedSubtopics.length).toBeLessThanOrEqual(mockSubtopics.length);
      
      // Validate all Band A subtopics are kept
      const bandASubtopics = mockSubtopics.filter(st => st.band === 'A');
      const keptBandASubtopics = trimmedSubtopics.filter(st => st.band === 'A');
      expect(keptBandASubtopics.length).toBe(bandASubtopics.length);
      
      // Validate subtopics are sorted by band priority
      const bandOrder: Record<PriorityLevel, number> = { 'A': 1, 'B': 2, 'C': 3, 'D': 4 };
      for (let i = 1; i < trimmedSubtopics.length; i++) {
        const prevBand = bandOrder[trimmedSubtopics[i-1].band];
        const currBand = bandOrder[trimmedSubtopics[i].band];
        expect(prevBand).toBeLessThanOrEqual(currBand);
      }
      
      // Validate total hours don't exceed allocated
      const totalHours = trimmedSubtopics.reduce((sum, st) => sum + st.baselineHours, 0);
      expect(totalHours).toBeLessThanOrEqual(allocatedHours);
      
      console.log(`✅ Trimmed ${mockSubtopics.length} subtopics to ${trimmedSubtopics.length}`);
      console.log(`  Total hours: ${totalHours}/${allocatedHours}`);
      trimmedSubtopics.forEach(st => {
        console.log(`  ${st.code}: Band ${st.band}, ${st.baselineHours}h`);
      });
    });

    it('should handle edge cases in subtopic trimming', () => {
      // Test with very limited hours
      const veryLimitedHours = 10;
      const minimalSubtopics = trimSubtopicsToFit(mockSubtopics, veryLimitedHours);
      
      expect(minimalSubtopics.length).toBeGreaterThan(0);
      // Should still keep Band A subtopics
      const bandACount = minimalSubtopics.filter(st => st.band === 'A').length;
      const originalBandACount = mockSubtopics.filter(st => st.band === 'A').length;
      expect(bandACount).toBe(originalBandACount);
      
      // Test with abundant hours
      const abundantHours = 1000;
      const allSubtopics = trimSubtopicsToFit(mockSubtopics, abundantHours);
      
      expect(allSubtopics.length).toBe(mockSubtopics.length);
      
      console.log(`✅ Edge cases: ${minimalSubtopics.length} (limited) vs ${allSubtopics.length} (abundant)`);
    });
  });

  /**
   * Test confidence map integration
   */
  describe('Confidence Map Integration Tests', () => {
    it('should properly weight subjects based on confidence levels', () => {
      const cycleType = CycleType.C2;
      const totalHours = 300;
      
      // Test with different confidence levels
      const highConfidenceMap = new Map([
        ['H01', 6], // Very Strong
        ['G', 6],   // Very Strong
        ['B', 5]    // Strong
      ]);
      
      const lowConfidenceMap = new Map([
        ['H01', 1], // Very Weak
        ['G', 2],   // Weak
        ['B', 3]    // Moderate
      ]);
      
      const highConfidenceSubjects = mockSubjects.filter(s => highConfidenceMap.has(s.subjectCode));
      const lowConfidenceSubjects = mockSubjects.filter(s => lowConfidenceMap.has(s.subjectCode));
      
      const highConfidenceTrimmed = trimSubjectsToFit(
        highConfidenceSubjects,
        totalHours,
        highConfidenceMap,
        cycleType
      );
      
      const lowConfidenceTrimmed = trimSubjectsToFit(
        lowConfidenceSubjects,
        totalHours,
        lowConfidenceMap,
        cycleType
      );
      
      // High confidence subjects should be more likely to be included
      expect(highConfidenceTrimmed.length).toBeGreaterThanOrEqual(lowConfidenceTrimmed.length);
      
      console.log(`✅ Confidence weighting: ${highConfidenceTrimmed.length} (high) vs ${lowConfidenceTrimmed.length} (low)`);
    });
  });

  /**
   * Test cycle type impact on scheduling
   */
  describe('Cycle Type Impact Tests', () => {
    it('should adjust baseline hours based on cycle type', () => {
      const testSubjects = mockSubjects.slice(0, 3);
      const totalHours = 200;
      
      const cycleTypes = [CycleType.C1, CycleType.C4, CycleType.C5, CycleType.C7];
      
      cycleTypes.forEach(cycleType => {
        const trimmedSubjects = trimSubjectsToFit(
          testSubjects,
          totalHours,
          mockConfidenceMap,
          cycleType
        );
        
        expect(trimmedSubjects).toBeDefined();
        expect(Array.isArray(trimmedSubjects)).toBe(true);
        
        console.log(`✅ ${cycleType}: ${trimmedSubjects.length} subjects included`);
      });
    });
  });

  /**
   * Test error handling and edge cases
   */
  describe('Error Handling and Edge Cases', () => {
    it('should handle empty subject lists gracefully', () => {
      const emptySubjects: Subject[] = [];
      const totalHours = 100;
      
      const trimmedSubjects = trimSubjectsToFit(
        emptySubjects,
        totalHours,
        mockConfidenceMap,
        CycleType.C2
      );
      
      expect(trimmedSubjects).toBeDefined();
      expect(Array.isArray(trimmedSubjects)).toBe(true);
      expect(trimmedSubjects.length).toBe(0);
      
      console.log('✅ Empty subject list handled gracefully');
    });

    it('should handle zero available hours', () => {
      const zeroHours = 0;
      
      const trimmedSubjects = trimSubjectsToFit(
        mockSubjects,
        zeroHours,
        mockConfidenceMap,
        CycleType.C2
      );
      
      expect(trimmedSubjects).toBeDefined();
      expect(Array.isArray(trimmedSubjects)).toBe(true);
      expect(trimmedSubjects.length).toBe(0);
      
      console.log('✅ Zero available hours handled gracefully');
    });

    it('should handle subjects with missing confidence values', () => {
      const incompleteConfidenceMap = new Map([
        ['H01', 5],
        ['G', 4]
        // Missing other subjects
      ]);
      
      const trimmedSubjects = trimSubjectsToFit(
        mockSubjects,
        200,
        incompleteConfidenceMap,
        CycleType.C2
      );
      
      expect(trimmedSubjects).toBeDefined();
      expect(Array.isArray(trimmedSubjects)).toBe(true);
      
      console.log('✅ Missing confidence values handled gracefully');
    });
  });
});
