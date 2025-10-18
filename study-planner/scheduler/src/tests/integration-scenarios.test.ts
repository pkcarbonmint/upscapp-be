import { describe, it, expect, beforeEach } from 'vitest';
import { determineCycleSchedule } from '../cycles';
import { 
  determineBlockSchedule
} from '../blocks';
import { 
  Subject, 
  StudyApproach, 
  ConfidenceMap, 
  CycleType,
  CycleSchedule
} from '../types';

/**
 * Integration and Real-World Scenario Tests
 * Tests complete workflows and realistic UPSC preparation scenarios
 */

describe('Integration and Real-World Scenario Tests', () => {
  let realisticSubjects: Subject[];
  let realisticConfidenceMap: ConfidenceMap;

  beforeEach(() => {
    // Realistic UPSC subjects with actual baseline hours
    realisticSubjects = [
      // GS Subjects
      { subjectCode: 'HISTORY', baselineHours: 200, priority: 5, subjectType: 'GS', isOptional: false },
      { subjectCode: 'GEOGRAPHY', baselineHours: 180, priority: 5, subjectType: 'GS', isOptional: false },
      { subjectCode: 'POLITY', baselineHours: 150, priority: 4, subjectType: 'GS', isOptional: false },
      { subjectCode: 'ECONOMICS', baselineHours: 120, priority: 4, subjectType: 'GS', isOptional: false },
      { subjectCode: 'SCIENCE', baselineHours: 100, priority: 3, subjectType: 'GS', isOptional: false },
      { subjectCode: 'ENVIRONMENT', baselineHours: 80, priority: 3, subjectType: 'GS', isOptional: false },
      { subjectCode: 'CURRENT_AFFAIRS', baselineHours: 60, priority: 5, subjectType: 'GS', isOptional: false },
      
      // Optional Subject
      { subjectCode: 'PUBLIC_ADMIN', baselineHours: 300, priority: 5, subjectType: 'Optional', isOptional: true }
    ];

    // Realistic confidence levels
    realisticConfidenceMap = new Map([
      ['HISTORY', 4], // Good
      ['GEOGRAPHY', 3], // Average
      ['POLITY', 5], // Excellent
      ['ECONOMICS', 2], // Weak
      ['SCIENCE', 3], // Average
      ['ENVIRONMENT', 4], // Good
      ['CURRENT_AFFAIRS', 5], // Excellent
      ['PUBLIC_ADMIN', 4] // Good
    ]);
  });

  describe('Complete UPSC Preparation Workflow', () => {
    it('should handle typical 12-month UPSC preparation timeline', () => {
      const startDate = new Date('2025-01-01');
      const targetYear = 2026;
      const prelimsExamDate = new Date('2026-05-26');
      
      // Step 1: Determine cycle schedule
      const result = determineCycleSchedule(startDate, targetYear, prelimsExamDate);
      const cycles = result.schedules;
      expect(cycles.length).toBeGreaterThan(0);
      
      // Step 2: Schedule blocks for each cycle
      const cycleResults = cycles.map(cycle => {
        const totalHours = 200; // Realistic hours per cycle
        const studyApproach = 'Balanced' as StudyApproach;
        const gsOptionalRatio = { gs: 0.67, optional: 0.33 };
        
        const blocks = determineBlockSchedule(
          cycle,
          realisticSubjects,
          realisticConfidenceMap,
          totalHours,
          studyApproach,
          8,
          gsOptionalRatio
        );
        
        return {
          cycleType: cycle.cycleType,
          blocksCount: blocks.length,
          blocks
        };
      });
      
      // Verify all cycles have reasonable block counts
      cycleResults.forEach(result => {
        expect(result.blocksCount).toBeGreaterThan(0);
        expect(result.blocksCount).toBeLessThanOrEqual(realisticSubjects.length);
      });
      
      console.log(`✅ Complete workflow: ${cycles.length} cycles scheduled successfully`);
      cycleResults.forEach(result => {
        console.log(`  ${result.cycleType}: ${result.blocksCount} blocks`);
      });
    });

    it('should handle crash course preparation (3 months)', () => {
      const startDate = new Date('2025-03-01');
      const targetYear = 2025;
      const prelimsExamDate = new Date('2025-05-26');
      
      const result = determineCycleSchedule(startDate, targetYear, prelimsExamDate);
      const cycles = result.schedules;
      
      // Crash course should have fewer, more intensive cycles
      const crashCourseResults = cycles.map(cycle => {
        const totalHours = 150; // Reduced hours for crash course
        const studyApproach = 'StrongFirst' as StudyApproach; // Focus on strong subjects
        const gsOptionalRatio = { gs: 0.8, optional: 0.2 }; // More GS focus
        
        const blocks = determineBlockSchedule(
          cycle,
          realisticSubjects,
          realisticConfidenceMap,
          totalHours,
          studyApproach,
          10, // More hours per day
          gsOptionalRatio
        );
        
        return {
          cycleType: cycle.cycleType,
          blocksCount: blocks.length,
          totalHours
        };
      });
      
      // Verify crash course characteristics
      expect(crashCourseResults.length).toBeLessThanOrEqual(4); // Fewer cycles
      crashCourseResults.forEach(result => {
        expect(result.blocksCount).toBeGreaterThan(0);
      });
      
      console.log(`✅ Crash course: ${cycles.length} intensive cycles`);
    });
  });

  describe('Study Approach Variations', () => {
    it('should handle different study approaches consistently', () => {
      const cycleSchedule: CycleSchedule = {
        cycleType: CycleType.C1,
        startDate: '2025-03-01',
        endDate: '2025-05-31',
        priority: 'mandatory' as const
      };
      
      const studyApproaches: StudyApproach[] = ['SingleSubject', 'DualSubject', 'TripleSubject', 'Balanced'];
      const gsOptionalRatio = { gs: 0.67, optional: 0.33 };
      
      const results = studyApproaches.map(approach => {
        const blocks = determineBlockSchedule(
          cycleSchedule,
          realisticSubjects,
          realisticConfidenceMap,
          200,
          approach,
          8,
          gsOptionalRatio
        );
        
        return {
          approach,
          blocksCount: blocks.length,
          gsBlocks: blocks.filter(b => {
            const subject = realisticSubjects.find(s => s.subjectCode === b.subjectCode);
            return subject && !subject.isOptional;
          }).length,
          optionalBlocks: blocks.filter(b => {
            const subject = realisticSubjects.find(s => s.subjectCode === b.subjectCode);
            return subject && subject.isOptional;
          }).length
        };
      });
      
      // All approaches should respect GS:Optional ratio
      results.forEach(result => {
        expect(result.blocksCount).toBeGreaterThan(0);
        expect(result.gsBlocks).toBeGreaterThan(0);
        expect(result.optionalBlocks).toBeGreaterThan(0);
      });
      
      console.log(`✅ Study approaches tested: ${results.length} approaches`);
      results.forEach(result => {
        console.log(`  ${result.approach}: ${result.gsBlocks}GS + ${result.optionalBlocks}OPT`);
      });
    });
  });

  describe('Confidence-Based Scheduling', () => {
    it('should prioritize subjects based on confidence levels', () => {
      const cycleSchedule: CycleSchedule = {
        cycleType: CycleType.C1,
        startDate: '2025-03-01',
        endDate: '2025-05-31',
        priority: 'mandatory' as const
      };
      
      // Test with limited hours to see prioritization
      const limitedHours = 100;
      const blocks = determineBlockSchedule(
        cycleSchedule,
        realisticSubjects,
        realisticConfidenceMap,
        limitedHours,
        'Balanced',
        8
      );
      
      // High confidence subjects should be prioritized
      const scheduledSubjects = blocks.map(b => {
        const subject = realisticSubjects.find(s => s.subjectCode === b.subjectCode);
        return {
          subjectCode: b.subjectCode,
          confidence: realisticConfidenceMap.get(b.subjectCode) || 0,
          priority: subject?.priority || 0
        };
      });
      
      // High confidence subjects should be included
      const highConfidenceSubjects = scheduledSubjects.filter(s => s.confidence >= 4);
      expect(highConfidenceSubjects.length).toBeGreaterThan(0);
      
      console.log(`✅ Confidence-based scheduling: ${blocks.length} subjects scheduled`);
      scheduledSubjects.forEach(s => {
        console.log(`  ${s.subjectCode}: confidence ${s.confidence}, priority ${s.priority}`);
      });
    });
  });

  describe('GS:Optional Ratio Consistency', () => {
    it('should maintain consistent ratios across different scenarios', () => {
      const scenarios = [
        { name: 'Balanced Preparation', hours: 200, ratio: { gs: 0.67, optional: 0.33 } },
        { name: 'GS Focus', hours: 200, ratio: { gs: 0.8, optional: 0.2 } },
        { name: 'Optional Focus', hours: 200, ratio: { gs: 0.5, optional: 0.5 } },
        { name: 'Crash Course', hours: 100, ratio: { gs: 0.9, optional: 0.1 } }
      ];
      
      const cycleSchedule: CycleSchedule = {
        cycleType: CycleType.C1,
        startDate: '2025-03-01',
        endDate: '2025-05-31',
        priority: 'mandatory' as const
      };
      
      const results = scenarios.map(scenario => {
        const blocks = determineBlockSchedule(
          cycleSchedule,
          realisticSubjects,
          realisticConfidenceMap,
          scenario.hours,
          'Balanced',
          8,
          scenario.ratio
        );
        
        const gsBlocks = blocks.filter(b => {
          const subject = realisticSubjects.find(s => s.subjectCode === b.subjectCode);
          return subject && !subject.isOptional;
        }).length;
        
        const optionalBlocks = blocks.filter(b => {
          const subject = realisticSubjects.find(s => s.subjectCode === b.subjectCode);
          return subject && subject.isOptional;
        }).length;
        
        const totalBlocks = gsBlocks + optionalBlocks;
        const actualGSRatio = totalBlocks > 0 ? gsBlocks / totalBlocks : 0;
        const actualOptionalRatio = totalBlocks > 0 ? optionalBlocks / totalBlocks : 0;
        
        return {
          scenario: scenario.name,
          expectedGS: scenario.ratio.gs,
          actualGS: actualGSRatio,
          expectedOptional: scenario.ratio.optional,
          actualOptional: actualOptionalRatio,
          totalBlocks
        };
      });
      
      // Verify ratios are maintained within reasonable tolerance
      results.forEach(result => {
        expect(result.totalBlocks).toBeGreaterThan(0);
        expect(Math.abs(result.actualGS - result.expectedGS)).toBeLessThanOrEqual(0.4); // 40% tolerance
        expect(Math.abs(result.actualOptional - result.expectedOptional)).toBeLessThanOrEqual(0.4); // 40% tolerance
      });
      
      console.log(`✅ GS:Optional ratio consistency across ${scenarios.length} scenarios`);
      results.forEach(result => {
        console.log(`  ${result.scenario}: GS ${result.actualGS.toFixed(2)}/${result.expectedGS}, OPT ${result.actualOptional.toFixed(2)}/${result.expectedOptional}`);
      });
    });
  });

  describe('Edge Case Scenarios', () => {
    it('should handle student changing optional subject mid-preparation', () => {
      const cycleSchedule: CycleSchedule = {
        cycleType: CycleType.C1,
        startDate: '2025-03-01',
        endDate: '2025-05-31',
        priority: 'mandatory' as const
      };
      
      // Initial subjects with Public Administration
      const initialSubjects = [...realisticSubjects];
      
      // Schedule initial blocks
      const initialBlocks = determineBlockSchedule(
        cycleSchedule,
        initialSubjects,
        realisticConfidenceMap,
        200,
        'Balanced',
        8,
        { gs: 0.67, optional: 0.33 }
      );
      
      // Change optional subject to Sociology
      const updatedSubjects = initialSubjects.map(subject => 
        subject.subjectCode === 'PUBLIC_ADMIN' 
          ? { ...subject, subjectCode: 'SOCIOLOGY', baselineHours: 280 }
          : subject
      );
      
      const updatedConfidenceMap = new Map(realisticConfidenceMap);
      updatedConfidenceMap.set('SOCIOLOGY', 3);
      
      // Schedule with new optional subject
      const updatedBlocks = determineBlockSchedule(
        cycleSchedule,
        updatedSubjects,
        updatedConfidenceMap,
        200,
        'Balanced',
        8,
        { gs: 0.67, optional: 0.33 }
      );
      
      // Both should work without errors
      expect(initialBlocks).toBeDefined();
      expect(updatedBlocks).toBeDefined();
      
      console.log(`✅ Optional subject change: ${initialBlocks.length} -> ${updatedBlocks.length} blocks`);
    });

    it('should handle mid-cycle schedule adjustments', () => {
      const cycleSchedule: CycleSchedule = {
        cycleType: CycleType.C1,
        startDate: '2025-03-01',
        endDate: '2025-05-31',
        priority: 'mandatory' as const
      };
      
      // Initial schedule
      const initialBlocks = determineBlockSchedule(
        cycleSchedule,
        realisticSubjects,
        realisticConfidenceMap,
        200,
        'Balanced',
        8
      );
      
      // Adjust hours mid-cycle (student increases study time)
      const adjustedBlocks = determineBlockSchedule(
        cycleSchedule,
        realisticSubjects,
        realisticConfidenceMap,
        300, // Increased hours
        'Balanced',
        8
      );
      
      // More hours should allow more subjects or longer durations
      expect(adjustedBlocks.length).toBeGreaterThanOrEqual(initialBlocks.length);
      
      console.log(`✅ Mid-cycle adjustment: ${initialBlocks.length} -> ${adjustedBlocks.length} blocks`);
    });
  });
});
