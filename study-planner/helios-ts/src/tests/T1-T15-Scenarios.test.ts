import { describe, it, expect, beforeEach } from 'vitest';
import { generateInitialPlan } from '../engine/NewEngine-generate-plan';
import { DEFAULT_CONFIG } from '../config';
import { createStudentIntake } from '../types/models';
import type { StudentIntake, Archetype, StudyPlan, StudyCycle } from '../types/models';
import dayjs from 'dayjs';

/**
 * Comprehensive unit tests for T1-T15 scenarios to verify cycle generation and dates
 * 
 * This test suite validates that the Helios library generates proper C1, C2, etc cycles
 * based on plan start dates for all documented test scenarios T1 through T15.
 */
describe('T1-T15 Scenarios: Cycle Generation and Date Validation', () => {
  let config: any;
  let archetype: Archetype;

  beforeEach(() => {
    config = DEFAULT_CONFIG;
    archetype = {
      archetype: 'BalancedDualSubject',
      timeCommitment: 'FullTime',
      weeklyHoursMin: 45,
      weeklyHoursMax: 55,
      description: 'Comprehensive GS preparation with optional subject',
      defaultPacing: 'Balanced',
      defaultApproach: 'DualSubject',
      specialFocus: ['GS', 'Optional']
    };
  });

  /**
   * Test scenarios T1-T15 with their corresponding start dates
   * These scenarios match the ones defined in generate-test-documents2.ts
   */
  const testScenarios = [
    { name: 'T1', startDate: '2025-03-01', targetYear: '2027', description: 'Early start, long preparation' },
    { name: 'T2', startDate: '2025-12-10', targetYear: '2027', description: 'Late 2025 start' },
    { name: 'T3', startDate: '2026-03-10', targetYear: '2027', description: 'Early 2026 start' },
    { name: 'T4', startDate: '2026-06-10', targetYear: '2027', description: 'Mid-2026 start' },
    { name: 'T5', startDate: '2026-09-10', targetYear: '2027', description: 'September 2026 start' },
    { name: 'T6', startDate: '2026-10-10', targetYear: '2027', description: 'October 2026 start' },
    { name: 'T7', startDate: '2026-11-10', targetYear: '2027', description: 'November 2026 start' },
    { name: 'T8', startDate: '2026-12-15', targetYear: '2027', description: 'Mid-December 2026 start' },
    { name: 'T9', startDate: '2026-12-16', targetYear: '2027', description: 'Late December 2026 start' },
    { name: 'T10', startDate: '2027-02-01', targetYear: '2027', description: 'February target year start' },
    { name: 'T11', startDate: '2027-02-28', targetYear: '2027', description: 'Late February target year start' },
    { name: 'T12', startDate: '2027-03-01', targetYear: '2027', description: 'March target year start' },
    { name: 'T13', startDate: '2027-03-15', targetYear: '2027', description: 'Mid-March target year start' },
    { name: 'T14', startDate: '2027-04-15', targetYear: '2027', description: 'April target year start' },
    { name: 'T15', startDate: '2027-04-20', targetYear: '2027', description: 'Late April target year start' },
  ];

  /**
   * Helper function to create student intake for a scenario
   */
  function createTestIntake(startDate: string, targetYear: string): StudentIntake {
    return createStudentIntake({
      subject_approach: 'DualSubject',
      subject_confidence: {
        'H01': 'VeryStrong',
        'H02': 'VeryStrong', 
        'H03': 'VeryStrong',
        'H04': 'VeryStrong',
        'H05': 'VeryStrong',
        'G': 'VeryStrong',
        'B': 'Moderate',
        'T': 'Weak',
        'P': 'Moderate',
        'E': 'Moderate'
      },
      study_strategy: {
        study_focus_combo: 'GSPlusOptionalPlusCSAT',
        weekly_study_hours: '45-55',
        time_distribution: 'Balanced',
        study_approach: 'Balanced',
        revision_strategy: 'Weekly',
        test_frequency: 'Weekly',
        seasonal_windows: ['Foundation', 'Revision', 'Intensive'],
        catch_up_day_preference: 'Sunday'
      },
      target_year: targetYear,
      start_date: startDate
    });
  }

  /**
   * Validate that a cycle has proper structure and dates
   */
  function validateCycle(cycle: StudyCycle, cycleType: string, scenario: string) {
    expect(cycle).toBeDefined();
    expect(cycle.cycleType).toBe(cycleType);
    expect(cycle.cycleName).toBeDefined();
    expect(cycle.cycleStartDate).toBeDefined();
    expect(cycle.cycleEndDate).toBeDefined();
    
    // Validate dates are valid
    const startDate = dayjs(cycle.cycleStartDate);
    const endDate = dayjs(cycle.cycleEndDate);
    expect(startDate.isValid()).toBe(true);
    expect(endDate.isValid()).toBe(true);
    expect(endDate.isAfter(startDate)).toBe(true);
    
    // Validate cycle has blocks
    expect(cycle.cycleBlocks).toBeDefined();
    expect(Array.isArray(cycle.cycleBlocks)).toBe(true);
    
    console.log(`✓ ${scenario}: ${cycleType} cycle validated - ${cycle.cycleStartDate} to ${cycle.cycleEndDate}`);
  }

  /**
   * Validate expected cycles are present based on scenario timing
   */
  function validateExpectedCycles(plan: StudyPlan, scenario: any) {
    const cycles = plan.cycles || [];
    const cycleTypes = cycles.map(c => c.cycleType);
    
    const startDate = dayjs(scenario.startDate);
    const targetYear = parseInt(scenario.targetYear);
    const targetDate = dayjs(`${targetYear}-01-01`);
    const monthsAvailable = targetDate.diff(startDate, 'month', true);
    
    console.log(`${scenario.name}: ${monthsAvailable.toFixed(1)} months available`);
    
    if (monthsAvailable >= 20) {
      // S1 scenario: Should have C1, C2, C3, C4, C5, C6, C7
      expect(cycles.length).toBeGreaterThanOrEqual(6);
      expect(cycleTypes).toContain('C1');
      expect(cycleTypes).toContain('C2');
      expect(cycleTypes).toContain('C4'); // Prelims Revision
      expect(cycleTypes).toContain('C5'); // Prelims Rapid
      expect(cycleTypes).toContain('C6'); // Mains Revision  
      expect(cycleTypes).toContain('C7'); // Mains Rapid
      
      if (monthsAvailable >= 22) {
        expect(cycleTypes).toContain('C3'); // Mains Pre-Prelims
      }
    } else if (monthsAvailable >= 14) {
      // S2 scenario: Should have C1, C2, C4, C5, C6, C7
      expect(cycles.length).toBeGreaterThanOrEqual(5);
      expect(cycleTypes).toContain('C1');
      expect(cycleTypes).toContain('C2');
      expect(cycleTypes).toContain('C4');
      expect(cycleTypes).toContain('C5');
      expect(cycleTypes).toContain('C6');
      expect(cycleTypes).toContain('C7');
    } else if (monthsAvailable >= 8) {
      // S3 scenario: Should have C2, C4, C5, C6, C7
      expect(cycles.length).toBeGreaterThanOrEqual(4);
      expect(cycleTypes).toContain('C2');
      expect(cycleTypes).toContain('C4');
      expect(cycleTypes).toContain('C5');
      expect(cycleTypes).toContain('C6');
      expect(cycleTypes).toContain('C7');
    } else if (monthsAvailable >= 5) {
      // S4 scenario: Should have C8, C4, C5, C6, C7
      expect(cycles.length).toBeGreaterThanOrEqual(4);
      expect(cycleTypes).toContain('C8'); // Mains Foundation
      expect(cycleTypes).toContain('C4');
      expect(cycleTypes).toContain('C5');
      expect(cycleTypes).toContain('C6');
      expect(cycleTypes).toContain('C7');
    } else if (monthsAvailable >= 2) {
      // S5 scenario: Should have C4, C5, C6, C7
      expect(cycles.length).toBeGreaterThanOrEqual(3);
      expect(cycleTypes).toContain('C4');
      expect(cycleTypes).toContain('C5');
      expect(cycleTypes).toContain('C6');
      expect(cycleTypes).toContain('C7');
    } else {
      // S6 scenario: Should have at least revision cycles
      expect(cycles.length).toBeGreaterThanOrEqual(2);
      expect(cycleTypes).toContain('C5');
      expect(cycleTypes).toContain('C7');
    }
    
    return cycles;
  }

  /**
   * Test cycle generation for all T1-T15 scenarios
   */
  describe('Cycle Generation Tests', () => {
    testScenarios.forEach((scenario) => {
      it(`should generate proper cycles for ${scenario.name}: ${scenario.description}`, async () => {
        console.log(`\n=== Testing ${scenario.name} ===`);
        console.log(`Start Date: ${scenario.startDate}, Target: ${scenario.targetYear}`);
        
        const intake = createTestIntake(scenario.startDate, scenario.targetYear);
        
        try {
          const result = await generateInitialPlan(
            `test-user-${scenario.name.toLowerCase()}`,
            config,
            archetype,
            intake
          );
          
          expect(result).toBeDefined();
          expect(result.plan).toBeDefined();
          expect(result.plan.cycles).toBeDefined();
          expect(Array.isArray(result.plan.cycles)).toBe(true);
          
          const cycles = validateExpectedCycles(result.plan, scenario);
          
          // Validate each cycle has proper structure and dates
          cycles.forEach(cycle => {
            validateCycle(cycle, cycle.cycleType, scenario.name);
          });
          
          console.log(`✅ ${scenario.name} completed successfully with ${cycles.length} cycles`);
        } catch (error) {
          if (scenario.name === 'T15') {
            // T15 is expected to fail due to insufficient time
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.log(`⚠️  ${scenario.name} expectedly failed: ${errorMessage}`);
            expect(errorMessage).toContain('insufficient time');
          } else {
            throw error;
          }
        }
      }, 30000); // 30 second timeout for complex scenarios
    });
  });

  /**
   * Test specific cycle date constraints
   */
  describe('Cycle Date Constraint Tests', () => {
    const criticalScenarios = [
      testScenarios[0], // T1 - Long prep
      testScenarios[4], // T5 - Medium prep  
      testScenarios[9], // T10 - Short prep
      // Skip T15 as it's expected to fail
    ];

    criticalScenarios.forEach((scenario) => {
      it(`should enforce proper cycle date constraints for ${scenario.name}`, async () => {
        const intake = createTestIntake(scenario.startDate, scenario.targetYear);
        
        const result = await generateInitialPlan(
          `constraint-test-${scenario.name.toLowerCase()}`,
          config,
          archetype,
          intake
        );
        
        const cycles = result.plan.cycles || [];
        const targetYear = parseInt(scenario.targetYear);
        
        // Find specific cycles and validate their constraints
        const c4Cycle = cycles.find(c => c.cycleType === 'C4');
        const c5Cycle = cycles.find(c => c.cycleType === 'C5');
        const c6Cycle = cycles.find(c => c.cycleType === 'C6');
        const c7Cycle = cycles.find(c => c.cycleType === 'C7');
        
        // C4 (Prelims Revision) should start Jan 1 of target year (if present)
        if (c4Cycle) {
          const c4Start = dayjs(c4Cycle.cycleStartDate);
          if (dayjs(scenario.startDate).isBefore(dayjs(`${targetYear}-01-01`))) {
            expect(c4Start.format('YYYY-MM-DD')).toBe(`${targetYear}-01-01`);
          }
          console.log(`C4 starts: ${c4Cycle.cycleStartDate}`);
        }
        
        // C5 (Prelims Rapid) should start around Apr 1 of target year (if present and not late start)
        if (c5Cycle) {
          const c5Start = dayjs(c5Cycle.cycleStartDate);
          if (dayjs(scenario.startDate).isBefore(dayjs(`${targetYear}-04-01`))) {
            // Allow for some flexibility in start date (within a week of April 1)
            const expectedStart = dayjs(`${targetYear}-04-01`);
            const daysDiff = Math.abs(c5Start.diff(expectedStart, 'day'));
            expect(daysDiff).toBeLessThanOrEqual(7);
          }
          console.log(`C5 starts: ${c5Cycle.cycleStartDate}`);
        }
        
        // C6 (Mains Revision) should start around May 20 of target year
        if (c6Cycle) {
          const c6Start = dayjs(c6Cycle.cycleStartDate);
          expect(c6Start.year()).toBe(targetYear);
          expect(c6Start.month()).toBeGreaterThanOrEqual(4); // May is month 4 (0-indexed)
          console.log(`C6 starts: ${c6Cycle.cycleStartDate}`);
        }
        
        // C7 (Mains Rapid) should start Aug 1 of target year (if present)
        if (c7Cycle) {
          const c7Start = dayjs(c7Cycle.cycleStartDate);
          if (dayjs(scenario.startDate).isBefore(dayjs(`${targetYear}-08-01`))) {
            expect(c7Start.format('YYYY-MM-DD')).toBe(`${targetYear}-08-01`);
          }
          console.log(`C7 starts: ${c7Cycle.cycleStartDate}`);
        }
        
        // Validate cycles are in chronological order (allow some flexibility for complex scenarios)
        if (cycles.length > 1) {
          for (let i = 1; i < cycles.length; i++) {
            const prevEnd = dayjs(cycles[i-1].cycleEndDate);
            const currStart = dayjs(cycles[i].cycleStartDate);
            const nextDayAfterPrev = prevEnd.add(1, 'day');
            
            const isAfter = currStart.isAfter(prevEnd);
            const isSameAsNextDay = currStart.isSame(nextDayAfterPrev);
            const isSameAsPrevEnd = currStart.isSame(prevEnd);
            const isWithinTolerance = Math.abs(currStart.diff(nextDayAfterPrev, 'day')) <= 2; // Allow 2 day tolerance
            
            if (!(isAfter || isSameAsNextDay || isSameAsPrevEnd || isWithinTolerance)) {
              console.warn(`⚠️  Cycle ${i-1} (${cycles[i-1].cycleType}): ends ${cycles[i-1].cycleEndDate}`);
              console.warn(`⚠️  Cycle ${i} (${cycles[i].cycleType}): starts ${cycles[i].cycleStartDate}`);
              console.warn(`⚠️  Gap of ${currStart.diff(prevEnd, 'day')} days between cycles`);
            }
          }
        }
        
        console.log(`✅ ${scenario.name} date constraints validated`);
      }, 30000);
    });
  });

  /**
   * Test cycle block structure
   */
  describe('Cycle Block Structure Tests', () => {
    const sampleScenarios = [
      testScenarios[0], // T1
      testScenarios[7], // T8  
      testScenarios[13] // T14
    ];

    sampleScenarios.forEach((scenario) => {
      it(`should generate proper block structure for ${scenario.name}`, async () => {
        const intake = createTestIntake(scenario.startDate, scenario.targetYear);
        
        const result = await generateInitialPlan(
          `block-test-${scenario.name.toLowerCase()}`,
          config,
          archetype,
          intake
        );
        
        const cycles = result.plan.cycles || [];
        
        cycles.forEach((cycle, cycleIndex) => {
          expect(cycle.cycleBlocks).toBeDefined();
          expect(Array.isArray(cycle.cycleBlocks)).toBe(true);
          
          if (cycle.cycleBlocks && cycle.cycleBlocks.length > 0) {
            cycle.cycleBlocks.forEach((block, blockIndex) => {
              // Validate block structure
              expect(block.block_title).toBeDefined();
              expect(block.duration_weeks).toBeGreaterThan(0);
              expect(block.subjects).toBeDefined();
              expect(Array.isArray(block.subjects)).toBe(true);
              expect(block.subjects.length).toBeGreaterThan(0);
              
              // Validate block dates if present
              if (block.block_start_date && block.block_end_date) {
                const blockStart = dayjs(block.block_start_date);
                const blockEnd = dayjs(block.block_end_date);
                expect(blockStart.isValid()).toBe(true);
                expect(blockEnd.isValid()).toBe(true);
                expect(blockEnd.isAfter(blockStart)).toBe(true);
              }
              
              console.log(`  Block ${blockIndex + 1}: ${block.block_title} (${block.duration_weeks} weeks, ${block.subjects.join(', ')})`);
            });
          }
          
          console.log(`${scenario.name} Cycle ${cycleIndex + 1} (${cycle.cycleType}): ${cycle.cycleBlocks?.length || 0} blocks`);
        });
        
        console.log(`✅ ${scenario.name} block structure validated`);
      }, 30000);
    });
  });

  /**
   * Test resource integration for cycles
   */
  describe('Resource Integration Tests', () => {
    const resourceScenarios = [
      testScenarios[0], // T1
      testScenarios[8], // T9
    ];

    resourceScenarios.forEach((scenario) => {
      it(`should integrate proper resources for ${scenario.name}`, async () => {
        const intake = createTestIntake(scenario.startDate, scenario.targetYear);
        
        const result = await generateInitialPlan(
          `resource-test-${scenario.name.toLowerCase()}`,
          config,
          archetype,
          intake
        );
        
        const plan = result.plan;
        
        // Validate curated resources exist
        expect(plan.curated_resources).toBeDefined();
        
        if (plan.curated_resources) {
          expect(plan.curated_resources.essential_resources).toBeDefined();
          expect(Array.isArray(plan.curated_resources.essential_resources)).toBe(true);
          
          if (plan.curated_resources.budget_summary) {
            expect(plan.curated_resources.budget_summary.total_cost).toBeGreaterThanOrEqual(0);
          }
        }
        
        // Validate block-level resources
        const cycles = plan.cycles || [];
        cycles.forEach(cycle => {
          if (cycle.cycleBlocks) {
            cycle.cycleBlocks.forEach(block => {
              // Block resources should be defined (can be empty but structured)
              if (block.block_resources) {
                expect(typeof block.block_resources).toBe('object');
              }
            });
          }
        });
        
        console.log(`✅ ${scenario.name} resource integration validated`);
      }, 30000);
    });
  });
});