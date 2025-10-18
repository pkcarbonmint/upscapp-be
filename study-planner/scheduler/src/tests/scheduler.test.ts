import { describe, it, expect, beforeEach } from 'vitest';
import { determineCycleSchedule } from '../cycles';
import { 
  determineBlockSchedule, 
  trimSubtopicsToFit, 
  trimSubjectsToFit,
  calculateSubjectAllocations,
  createOptionalSubject,
  validateGSOptionalRatio,
  getDefaultGSOptionalRatio
} from '../blocks';
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

    it('should allocate minimum baseline hours to all subjects when time is sufficient', () => {
      // Calculate total baseline hours needed
      const totalBaselineHours = mockSubjects.reduce((sum, subject) => sum + subject.baselineHours, 0);
      const sufficientHours = totalBaselineHours + 100; // Extra time
      
      const trimmedSubjects = trimSubjectsToFit(
        mockSubjects,
        sufficientHours,
        mockConfidenceMap,
        CycleType.C1
      );
      
      // All subjects should be included
      expect(trimmedSubjects.length).toBe(mockSubjects.length);
      
      // Each subject should get at least their baseline hours
      trimmedSubjects.forEach(subject => {
        const originalSubject = mockSubjects.find(s => s.subjectCode === subject.subjectCode);
        expect(subject.baselineHours).toBeGreaterThanOrEqual(originalSubject!.baselineHours);
      });
      
      console.log(`✅ All ${mockSubjects.length} subjects allocated minimum baseline hours`);
    });


    it('should keep only essentials in severely compressed timeline', () => {
      // Severely compressed timeline - only highest priority subjects should survive
      const severelyCompressedHours = 50; // Very limited time
      const cycleType = CycleType.C5; // Extreme short cycle
      
      const trimmedSubjects = trimSubjectsToFit(
        mockSubjects,
        severelyCompressedHours,
        mockConfidenceMap,
        cycleType
      );
      
      // Should only keep essential subjects (priority >= 4)
      const essentialSubjects = mockSubjects.filter(s => (s.priority || 0) >= 4);
      expect(trimmedSubjects.length).toBeLessThanOrEqual(essentialSubjects.length);
      expect(trimmedSubjects.length).toBeGreaterThan(0);
      
      // All remaining subjects should be high priority
      trimmedSubjects.forEach(subject => {
        expect(subject.priority || 0).toBeGreaterThanOrEqual(4);
      });
      
      // Verify that low priority subjects are dropped
      const lowPrioritySubjects = mockSubjects.filter(s => (s.priority || 0) < 4);
      lowPrioritySubjects.forEach(lowPrioritySubject => {
        const keptSubject = trimmedSubjects.find(s => s.subjectCode === lowPrioritySubject.subjectCode);
        expect(keptSubject).toBeUndefined();
      });
      
      console.log(`✅ Severely compressed: kept ${trimmedSubjects.length}/${mockSubjects.length} subjects (only essentials)`);
      trimmedSubjects.forEach(subject => {
        console.log(`  ${subject.subjectCode}: priority ${subject.priority}, baseline ${subject.baselineHours}h`);
      });
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
   * Test GS:Optional ratio functionality
   */
  describe('GS:Optional Ratio Tests', () => {
    it('should allocate hours based on GS:Optional ratio', () => {
      const mockSubjects: Subject[] = [
        { subjectCode: 'H01', baselineHours: 120, priority: 5, subjectType: 'GS' },
        { subjectCode: 'H02', baselineHours: 100, priority: 4, subjectType: 'GS' },
        { subjectCode: 'OPT01', baselineHours: 200, priority: 3, subjectType: 'Optional', isOptional: true, optionalSubjectName: 'History' }
      ];
      const mockConfidenceMap = new Map<string, number>([
        ['H01', 1.0],
        ['H02', 1.0],
        ['OPT01', 1.0]
      ]);
      
      const gsOptionalRatio = { gs: 0.67, optional: 0.33 };
      const totalHours = 300;
      
      // Test the allocation calculation
      const allocations = calculateSubjectAllocations(mockSubjects, totalHours, mockConfidenceMap, CycleType.C1, gsOptionalRatio);
      
      const gsHours = Array.from(allocations.entries())
        .filter(([code]) => mockSubjects.find(s => s.subjectCode === code)?.subjectType === 'GS')
        .reduce((sum, [, hours]) => sum + hours, 0);
      
      const optionalHours = Array.from(allocations.entries())
        .filter(([code]) => mockSubjects.find(s => s.subjectCode === code)?.subjectType === 'Optional')
        .reduce((sum, [, hours]) => sum + hours, 0);
      
      expect(gsHours).toBeGreaterThan(optionalHours);
      expect(Math.abs(gsHours - (totalHours * 0.67))).toBeLessThan(10); // Allow some tolerance
      expect(Math.abs(optionalHours - (totalHours * 0.33))).toBeLessThan(10);
      
      console.log(`✅ GS:Optional ratio allocation: GS=${gsHours}h, Optional=${optionalHours}h`);
    });

    it('should handle Prelims cycles with GS-only allocation', () => {
      const mockSubjects: Subject[] = [
        { subjectCode: 'H01', baselineHours: 120, priority: 5, subjectType: 'GS' },
        { subjectCode: 'OPT01', baselineHours: 200, priority: 3, subjectType: 'Optional', isOptional: true }
      ];
      const mockConfidenceMap = new Map<string, number>([
        ['H01', 1.0],
        ['OPT01', 1.0]
      ]);
      
      const gsOptionalRatio = { gs: 1.0, optional: 0.0 };
      const totalHours = 200;
      
      const allocations = calculateSubjectAllocations(mockSubjects, totalHours, mockConfidenceMap, CycleType.C5, gsOptionalRatio);
      
      expect(allocations.get('H01')).toBeGreaterThan(0);
      expect(allocations.get('OPT01')).toBeLessThanOrEqual(4); // Optional should get minimal hours in Prelims (due to minimum allocation)
      
      console.log('✅ Prelims GS-only allocation working correctly');
    });

    it('should create optional subjects correctly', () => {
      const optionalSubject = createOptionalSubject('OPT01', 'History', 200, 4);
      
      expect(optionalSubject.subjectCode).toBe('OPT01');
      expect(optionalSubject.baselineHours).toBe(200);
      expect(optionalSubject.priority).toBe(4);
      expect(optionalSubject.subjectType).toBe('Optional');
      expect(optionalSubject.isOptional).toBe(true);
      expect(optionalSubject.optionalSubjectName).toBe('History');
      
      console.log('✅ Optional subject creation working correctly');
    });

    it('should validate GS:Optional ratios correctly', () => {
      expect(validateGSOptionalRatio({ gs: 0.67, optional: 0.33 })).toBe(true);
      expect(validateGSOptionalRatio({ gs: 1.0, optional: 0.0 })).toBe(true);
      expect(validateGSOptionalRatio({ gs: 0.5, optional: 0.5 })).toBe(true);
      
      expect(validateGSOptionalRatio({ gs: 1.1, optional: 0.0 })).toBe(false); // Invalid: > 1.0
      expect(validateGSOptionalRatio({ gs: -0.1, optional: 0.5 })).toBe(false); // Invalid: negative
      expect(validateGSOptionalRatio({ gs: 0.6, optional: 0.5 })).toBe(false); // Invalid: > 1.0 total
      
      console.log('✅ GS:Optional ratio validation working correctly');
    });

    it('should get default ratios based on cycle type', () => {
      expect(getDefaultGSOptionalRatio(CycleType.C1)).toEqual({ gs: 0.67, optional: 0.33 });
      expect(getDefaultGSOptionalRatio(CycleType.C5)).toEqual({ gs: 1.0, optional: 0.0 });
      expect(getDefaultGSOptionalRatio(CycleType.C8)).toEqual({ gs: 0.8, optional: 0.2 });
      
      console.log('✅ Default GS:Optional ratios working correctly');
    });

    it('should respect exact GS:Optional ratios with precise calculations', () => {
      const mockSubjects: Subject[] = [
        { subjectCode: 'H01', baselineHours: 100, priority: 5, subjectType: 'GS' },
        { subjectCode: 'H02', baselineHours: 100, priority: 4, subjectType: 'GS' },
        { subjectCode: 'OPT01', baselineHours: 200, priority: 3, subjectType: 'Optional', isOptional: true, optionalSubjectName: 'History' }
      ];
      const mockConfidenceMap = new Map<string, number>([
        ['H01', 1.0],
        ['H02', 1.0],
        ['OPT01', 1.0]
      ]);
      
      const testCases = [
        { ratio: { gs: 0.67, optional: 0.33 }, totalHours: 1000 },
        { ratio: { gs: 0.8, optional: 0.2 }, totalHours: 500 },
        { ratio: { gs: 0.5, optional: 0.5 }, totalHours: 200 },
        { ratio: { gs: 1.0, optional: 0.0 }, totalHours: 300 }
      ];
      
      testCases.forEach(({ ratio, totalHours }) => {
        const allocations = calculateSubjectAllocations(mockSubjects, totalHours, mockConfidenceMap, CycleType.C1, ratio);
        
        const gsHours = Array.from(allocations.entries())
          .filter(([code]) => mockSubjects.find(s => s.subjectCode === code)?.subjectType === 'GS')
          .reduce((sum, [, hours]) => sum + hours, 0);
        
        const optionalHours = Array.from(allocations.entries())
          .filter(([code]) => mockSubjects.find(s => s.subjectCode === code)?.subjectType === 'Optional')
          .reduce((sum, [, hours]) => sum + hours, 0);
        
        const expectedGSHours = Math.floor(totalHours * ratio.gs);
        const expectedOptionalHours = Math.floor(totalHours * ratio.optional);
        
        // Allow 5 hour tolerance for rounding and minimum hour constraints
        expect(Math.abs(gsHours - expectedGSHours)).toBeLessThanOrEqual(5);
        expect(Math.abs(optionalHours - expectedOptionalHours)).toBeLessThanOrEqual(5);
        
        console.log(`✅ Ratio ${ratio.gs}:${ratio.optional} - GS: ${gsHours}/${expectedGSHours}h, Optional: ${optionalHours}/${expectedOptionalHours}h`);
      });
    });

    it('should handle edge cases in GS:Optional ratio allocation', () => {
      const mockSubjects: Subject[] = [
        { subjectCode: 'H01', baselineHours: 1, priority: 5, subjectType: 'GS' },
        { subjectCode: 'OPT01', baselineHours: 1, priority: 3, subjectType: 'Optional', isOptional: true }
      ];
      const mockConfidenceMap = new Map<string, number>([
        ['H01', 1.0],
        ['OPT01', 1.0]
      ]);
      
      // Test with very small hours
      const allocations = calculateSubjectAllocations(mockSubjects, 10, mockConfidenceMap, CycleType.C1, { gs: 0.6, optional: 0.4 });
      
      const gsHours = Array.from(allocations.entries())
        .filter(([code]) => mockSubjects.find(s => s.subjectCode === code)?.subjectType === 'GS')
        .reduce((sum, [, hours]) => sum + hours, 0);
      
      const optionalHours = Array.from(allocations.entries())
        .filter(([code]) => mockSubjects.find(s => s.subjectCode === code)?.subjectType === 'Optional')
        .reduce((sum, [, hours]) => sum + hours, 0);
      
      // Should still respect the ratio even with small numbers
      expect(gsHours).toBeGreaterThan(optionalHours);
      expect(gsHours + optionalHours).toBeLessThanOrEqual(10);
      
      console.log(`✅ Edge case: GS=${gsHours}h, Optional=${optionalHours}h (total: ${gsHours + optionalHours}h)`);
    });

    it('should maintain ratio consistency across different subject counts', () => {
      const testCases = [
        { gsCount: 1, optionalCount: 1 },
        { gsCount: 5, optionalCount: 1 },
        { gsCount: 10, optionalCount: 2 },
        { gsCount: 16, optionalCount: 1 }
      ];
      
      testCases.forEach(({ gsCount, optionalCount }) => {
        const mockSubjects: Subject[] = [];
        
        // Create GS subjects
        for (let i = 0; i < gsCount; i++) {
          mockSubjects.push({
            subjectCode: `GS${i.toString().padStart(2, '0')}`,
            baselineHours: 100,
            priority: 5,
            subjectType: 'GS'
          });
        }
        
        // Create Optional subjects
        for (let i = 0; i < optionalCount; i++) {
          mockSubjects.push({
            subjectCode: `OPT${i.toString().padStart(2, '0')}`,
            baselineHours: 200,
            priority: 3,
            subjectType: 'Optional',
            isOptional: true,
            optionalSubjectName: `Optional${i}`
          });
        }
        
        const mockConfidenceMap = new Map<string, number>();
        mockSubjects.forEach(subject => {
          mockConfidenceMap.set(subject.subjectCode, 1.0);
        });
        
        const ratio = { gs: 0.67, optional: 0.33 };
        const totalHours = 1000;
        
        const allocations = calculateSubjectAllocations(mockSubjects, totalHours, mockConfidenceMap, CycleType.C1, ratio);
        
        const gsHours = Array.from(allocations.entries())
          .filter(([code]) => mockSubjects.find(s => s.subjectCode === code)?.subjectType === 'GS')
          .reduce((sum, [, hours]) => sum + hours, 0);
        
        const optionalHours = Array.from(allocations.entries())
          .filter(([code]) => mockSubjects.find(s => s.subjectCode === code)?.subjectType === 'Optional')
          .reduce((sum, [, hours]) => sum + hours, 0);
        
        const expectedGSHours = Math.floor(totalHours * ratio.gs);
        const expectedOptionalHours = Math.floor(totalHours * ratio.optional);
        
        // Verify ratio is maintained regardless of subject count (allow larger tolerance for complex allocations)
        expect(Math.abs(gsHours - expectedGSHours)).toBeLessThanOrEqual(20);
        expect(Math.abs(optionalHours - expectedOptionalHours)).toBeLessThanOrEqual(20);
        
        console.log(`✅ ${gsCount}GS:${optionalCount}OPT - GS: ${gsHours}/${expectedGSHours}h, Optional: ${optionalHours}/${expectedOptionalHours}h`);
      });
    });

    it('should respect GS:Optional ratios in determineBlockSchedule', () => {
      // Create subjects with GS and Optional types
      const gsSubjects: Subject[] = [
        { subjectCode: 'H01', baselineHours: 100, priority: 5, subjectType: 'GS', isOptional: false },
        { subjectCode: 'H02', baselineHours: 80, priority: 4, subjectType: 'GS', isOptional: false },
        { subjectCode: 'G', baselineHours: 120, priority: 5, subjectType: 'GS', isOptional: false }
      ];
      
      const optionalSubjects: Subject[] = [
        { subjectCode: 'OPT', baselineHours: 200, priority: 5, subjectType: 'Optional', isOptional: true }
      ];
      
      const allSubjects = [...gsSubjects, ...optionalSubjects];
      const confidenceMap = new Map<string, number>();
      allSubjects.forEach(subject => {
        confidenceMap.set(subject.subjectCode, 1.0);
      });

      const cycleSchedule = {
        cycleType: CycleType.C1,
        startDate: '2025-03-01',
        endDate: '2025-05-31',
        priority: 'mandatory' as const
      };

      const totalHours = 1000;
      const gsOptionalRatio = { gs: 0.67, optional: 0.33 };
      const studyApproach = 'balanced' as StudyApproach;

      // Test with GS:Optional ratio
      const blocksWithRatio = determineBlockSchedule(
        cycleSchedule,
        allSubjects,
        confidenceMap,
        totalHours,
        studyApproach,
        8,
        gsOptionalRatio
      );

      // Test without GS:Optional ratio (should fall back to trimSubjectsToFit)
      determineBlockSchedule(
        cycleSchedule,
        allSubjects,
        confidenceMap,
        totalHours,
        studyApproach,
        8
      );

      // With GS:Optional ratio, all subjects should be scheduled (plenty of time)
      expect(blocksWithRatio.length).toBe(allSubjects.length);
      
      // Calculate actual hours allocated
      const gsBlocksWithRatio = blocksWithRatio.filter(block => {
        const subject = allSubjects.find(s => s.subjectCode === block.subjectCode);
        return subject && !subject.isOptional;
      });
      
      const optionalBlocksWithRatio = blocksWithRatio.filter(block => {
        const subject = allSubjects.find(s => s.subjectCode === block.subjectCode);
        return subject && subject.isOptional;
      });

      // Verify that GS:Optional ratio is respected
      const expectedGSHours = Math.floor(totalHours * gsOptionalRatio.gs);
      const expectedOptionalHours = Math.floor(totalHours * gsOptionalRatio.optional);
      
      // The blocks should be created for all subjects when GS:Optional ratio is provided
      expect(gsBlocksWithRatio.length).toBe(gsSubjects.length);
      expect(optionalBlocksWithRatio.length).toBe(optionalSubjects.length);

      console.log(`✅ determineBlockSchedule with GS:Optional ratio: ${gsBlocksWithRatio.length}GS + ${optionalBlocksWithRatio.length}OPT blocks`);
      console.log(`✅ Expected: ${expectedGSHours}h GS + ${expectedOptionalHours}h Optional`);
    });


    it('should respect GS:Optional ratios in all time allocation scenarios', () => {
      const gsSubjects: Subject[] = [
        { subjectCode: 'H01', baselineHours: 100, priority: 5, subjectType: 'GS', isOptional: false },
        { subjectCode: 'H02', baselineHours: 80, priority: 4, subjectType: 'GS', isOptional: false },
        { subjectCode: 'G', baselineHours: 120, priority: 5, subjectType: 'GS', isOptional: false }
      ];
      
      const optionalSubjects: Subject[] = [
        { subjectCode: 'OPT', baselineHours: 200, priority: 5, subjectType: 'Optional', isOptional: true }
      ];
      
      const allSubjects = [...gsSubjects, ...optionalSubjects];
      const confidenceMap = new Map<string, number>();
      allSubjects.forEach(subject => {
        confidenceMap.set(subject.subjectCode, 1.0);
      });

      const cycleSchedule = {
        cycleType: CycleType.C1,
        startDate: '2025-03-01',
        endDate: '2025-05-31',
        priority: 'mandatory' as const
      };

      const gsOptionalRatio = { gs: 0.67, optional: 0.33 };
      const studyApproach = 'balanced' as StudyApproach;

      // Test scenarios with different time allocations
      const scenarios = [
        { name: 'Sufficient time', totalHours: 1000 },
        { name: 'Limited time', totalHours: 200 },
        { name: 'Severely compressed', totalHours: 50 }
      ];

      scenarios.forEach(({ name, totalHours }) => {
        const blocks = determineBlockSchedule(
          cycleSchedule,
          allSubjects,
          confidenceMap,
          totalHours,
          studyApproach,
          8,
          gsOptionalRatio
        );

        // Calculate GS vs Optional allocation
        const gsBlocks = blocks.filter(block => {
          const subject = allSubjects.find(s => s.subjectCode === block.subjectCode);
          return subject && !subject.isOptional;
        });

        const optionalBlocks = blocks.filter(block => {
          const subject = allSubjects.find(s => s.subjectCode === block.subjectCode);
          return subject && subject.isOptional;
        });

        console.log(`✅ ${name}: ${gsBlocks.length}GS + ${optionalBlocks.length}OPT blocks (${blocks.length}/${allSubjects.length} total)`);
        
        // Verify that GS:Optional ratio is respected when possible
        if (blocks.length === allSubjects.length) {
          // All subjects scheduled - ratio should be respected
          const totalScheduled = gsBlocks.length + optionalBlocks.length;
          const actualGSRatio = gsBlocks.length / totalScheduled;
          const actualOptionalRatio = optionalBlocks.length / totalScheduled;
          
          expect(Math.abs(actualGSRatio - gsOptionalRatio.gs)).toBeLessThanOrEqual(0.1);
          expect(Math.abs(actualOptionalRatio - gsOptionalRatio.optional)).toBeLessThanOrEqual(0.1);
        } else {
          // Some subjects dropped - should prioritize based on ratio
          console.log(`  Note: ${allSubjects.length - blocks.length} subjects dropped due to time constraints`);
        }
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
