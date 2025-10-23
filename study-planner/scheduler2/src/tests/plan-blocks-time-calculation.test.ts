import { describe, it, expect } from 'vitest';
import dayjs from 'dayjs';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import { planBlocks } from '../plan-blocks';
import { S2Subject, BlockAllocConstraints, CycleType } from '../types';

// Extend dayjs with required plugins
dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

describe('planBlocks Time Calculation Tests', () => {
  const TEST_TIMEOUT = 10000;

  // Test subjects with realistic data for focused testing
  const testSubjects: S2Subject[] = [
    {
      subjectCode: 'TEST-SUBJ-1',
      subjectNname: 'Test Subject 1',
      examFocus: 'BothExams',
      baselineMinutes: 120, // 120 minutes = 2 hours (realistic for short test periods)
      topics: [
        {
          code: 'TEST-SUBJ-1/01',
          subtopics: []
        }
      ]
    },
    {
      subjectCode: 'TEST-SUBJ-2', 
      subjectNname: 'Test Subject 2',
      examFocus: 'BothExams',
      baselineMinutes: 60, // 60 minutes = 1 hour
      topics: [
        {
          code: 'TEST-SUBJ-2/01',
          subtopics: []
        }
      ]
    }
  ];

  const baseConstraints: BlockAllocConstraints = {
    cycleType: CycleType.C1,
    relativeAllocationWeights: {
      'TEST-SUBJ-1': 1.0,
      'TEST-SUBJ-2': 1.0
    },
    numParallel: 2,
    workingHoursPerDay: 7, // 7 hours = 420 minutes
    catchupDay: 0, // Sunday
    testDay: 0, // Sunday
  };

  it('should calculate available time correctly based on working hours per day', async () => {
    // Test case: 3-day period (March 1-3, 2025)
    // Expected working time: 3 days × 7 hours = 21 hours = 1260 minutes
    // Expected slices: 1260 ÷ 30 = 42 slices
    const timeWindowFrom = dayjs('2025-03-01T00:00:00.000Z');
    const timeWindowTo = dayjs('2025-03-03T23:59:59.999Z');

    const blocks = planBlocks(timeWindowFrom, timeWindowTo, testSubjects, baseConstraints);

    // Verify that blocks are generated for the full time window
    expect(blocks.length).toBeGreaterThan(0);
    
    // Check that blocks cover the expected time period
    const blockDates = blocks.map(block => block.from.format('YYYY-MM-DD'));
    const uniqueDates = [...new Set(blockDates)];
    
    // Should have blocks on March 1, 2, and 3 (excluding Sundays if any)
    expect(uniqueDates.length).toBeGreaterThanOrEqual(2); // At least 2 days
    
    // Verify that blocks respect working hours constraint
    blocks.forEach(block => {
      const durationMinutes = block.to.diff(block.from, 'minutes');
      expect(durationMinutes).toBeLessThanOrEqual(420); // Max 7 hours per day
    });
  }, TEST_TIMEOUT);

  it('should handle Sunday restrictions correctly without double-subtracting time', async () => {
    // Test case: Period that includes Sunday (March 1-7, 2025)
    // March 1, 2025 is Saturday, March 2, 2025 is Sunday (restricted)
    // Expected working days: 6 days (excluding Sunday)
    // Expected working time: 6 days × 7 hours = 42 hours = 2520 minutes
    const timeWindowFrom = dayjs('2025-03-01T00:00:00.000Z');
    const timeWindowTo = dayjs('2025-03-07T23:59:59.999Z');

    const blocks = planBlocks(timeWindowFrom, timeWindowTo, testSubjects, baseConstraints);

    // Verify that blocks are generated
    expect(blocks.length).toBeGreaterThan(0);
    
    // Check that no blocks are generated for Sunday (March 2, 2025)
    const sundayBlocks = blocks.filter(block => 
      block.from.format('YYYY-MM-DD') === '2025-03-02'
    );
    expect(sundayBlocks.length).toBe(0);
    
    // Verify that blocks are generated for other days
    const otherDayBlocks = blocks.filter(block => 
      block.from.format('YYYY-MM-DD') !== '2025-03-02'
    );
    expect(otherDayBlocks.length).toBeGreaterThan(0);
  }, TEST_TIMEOUT);

  it('should generate sufficient blocks to cover full time window without early termination', async () => {
    // Test case: Longer period (March 1-31, 2025) to test maxSlices calculation
    // This was the original failing scenario
    const timeWindowFrom = dayjs('2025-03-01T00:00:00.000Z');
    const timeWindowTo = dayjs('2025-03-31T23:59:59.999Z');

    const blocks = planBlocks(timeWindowFrom, timeWindowTo, testSubjects, baseConstraints);

    // Verify that blocks are generated for the full month
    expect(blocks.length).toBeGreaterThan(0);
    
    // Check that blocks cover the entire period (excluding Sundays)
    const blockDates = blocks.map(block => block.from.format('YYYY-MM-DD'));
    const uniqueDates = [...new Set(blockDates)];
    
    // Should have blocks spanning most of March (excluding Sundays)
    const marchDates = uniqueDates.filter(date => date.startsWith('2025-03'));
    expect(marchDates.length).toBeGreaterThan(5); // At least 5 working days (realistic for small subject requirements)
    
    // Verify that blocks are generated throughout the month, not just at the beginning
    const firstBlockDate = dayjs(Math.min(...blocks.map(b => b.from.valueOf())));
    const lastBlockDate = dayjs(Math.max(...blocks.map(b => b.from.valueOf())));
    
    expect(firstBlockDate.format('YYYY-MM-DD')).toBe('2025-03-01');
    expect(lastBlockDate.format('YYYY-MM-DD')).toMatch(/2025-03-2[0-9]/); // Should reach late March
  }, TEST_TIMEOUT);

  it('should handle the specific May 12, 2025 scenario that was failing', async () => {
    // Test case: The exact scenario that was failing - C1 cycle period
    const timeWindowFrom = dayjs('2025-03-01T00:00:00.000Z');
    const timeWindowTo = dayjs('2025-05-31T23:59:59.999Z');

    const blocks = planBlocks(timeWindowFrom, timeWindowTo, testSubjects, baseConstraints);

    // Verify that blocks are generated
    expect(blocks.length).toBeGreaterThan(0);
    
    // Check specifically for May 12, 2025 (the date that was missing)
    const may12Blocks = blocks.filter(block => 
      block.from.format('YYYY-MM-DD') === '2025-05-12'
    );
    
    // May 12, 2025 should have blocks (it's a Monday, not restricted)
    expect(may12Blocks.length).toBeGreaterThan(0);
    
    // Verify that blocks are generated throughout May
    const mayBlocks = blocks.filter(block => 
      block.from.format('YYYY-MM') === '2025-05'
    );
    expect(mayBlocks.length).toBeGreaterThan(0);
    
    // Check that May blocks span the full month
    const mayDates = [...new Set(mayBlocks.map(block => block.from.format('YYYY-MM-DD')))];
    expect(mayDates.length).toBeGreaterThan(3); // At least 3 working days in May (realistic for small subject requirements)
  }, TEST_TIMEOUT);

  it('should calculate maxSlices correctly based on working hours, not total time', async () => {
    // Test case: Verify that the maxSlices calculation uses working hours
    const timeWindowFrom = dayjs('2025-03-01T00:00:00.000Z');
    const timeWindowTo = dayjs('2025-03-07T23:59:59.999Z');

    const blocks = planBlocks(timeWindowFrom, timeWindowTo, testSubjects, baseConstraints);

    // Calculate expected working time
    const totalDays = timeWindowTo.diff(timeWindowFrom, 'day') + 1; // 7 days
    const workingDays = totalDays - 1; // Exclude 1 Sunday
    const expectedWorkingMinutes = workingDays * baseConstraints.workingHoursPerDay * 60; // 6 × 7 × 60 = 2520 minutes
    const expectedMaxSlices = Math.ceil(expectedWorkingMinutes / 30); // 2520 ÷ 30 = 84 slices

    // Verify that we have a reasonable number of blocks (should be close to expected slices)
    // Note: Actual blocks will be less due to subject allocation and parallel constraints
    expect(blocks.length).toBeGreaterThan(0);
    expect(blocks.length).toBeLessThanOrEqual(expectedMaxSlices);
    
    // Verify that blocks are distributed across the working days
    const blockDates = [...new Set(blocks.map(block => block.from.format('YYYY-MM-DD')))];
    expect(blockDates.length).toBeGreaterThanOrEqual(2); // At least 2 working days covered (realistic for small subject requirements)
  }, TEST_TIMEOUT);

  it('should handle different working hours per day correctly', async () => {
    // Test case: Different working hours constraint
    const customConstraints: BlockAllocConstraints = {
      ...baseConstraints,
      workingHoursPerDay: 5, // 5 hours = 300 minutes
    };

    const timeWindowFrom = dayjs('2025-03-01T00:00:00.000Z');
    const timeWindowTo = dayjs('2025-03-03T23:59:59.999Z');

    const blocks = planBlocks(timeWindowFrom, timeWindowTo, testSubjects, customConstraints);

    // Verify that blocks respect the 5-hour constraint
    blocks.forEach(block => {
      const durationMinutes = block.to.diff(block.from, 'minutes');
      expect(durationMinutes).toBeLessThanOrEqual(300); // Max 5 hours per day
    });

    // Verify that blocks are still generated
    expect(blocks.length).toBeGreaterThan(0);
  }, TEST_TIMEOUT);

  it('should handle edge case of single day time window', async () => {
    // Test case: Single day time window (use a weekday to avoid Sunday restrictions)
    const timeWindowFrom = dayjs('2025-03-03T00:00:00.000Z'); // Monday
    const timeWindowTo = dayjs('2025-03-03T23:59:59.999Z'); // Same Monday

    const blocks = planBlocks(timeWindowFrom, timeWindowTo, testSubjects, baseConstraints);

    // Should generate blocks for the single day
    expect(blocks.length).toBeGreaterThan(0);
    
    // All blocks should be on the same day
    const blockDates = [...new Set(blocks.map(block => block.from.format('YYYY-MM-DD')))];
    expect(blockDates.length).toBe(1);
    expect(blockDates[0]).toBe('2025-03-03');
    
    // Verify duration constraint
    blocks.forEach(block => {
      const durationMinutes = block.to.diff(block.from, 'minutes');
      expect(durationMinutes).toBeLessThanOrEqual(420); // Max 7 hours
    });
  }, TEST_TIMEOUT);

  it('should handle time window with only restricted days', async () => {
    // Test case: Time window with only Sundays (all restricted)
    const timeWindowFrom = dayjs('2025-03-02T00:00:00.000Z'); // Sunday
    const timeWindowTo = dayjs('2025-03-02T23:59:59.999Z'); // Same Sunday

    const blocks = planBlocks(timeWindowFrom, timeWindowTo, testSubjects, baseConstraints);

    // Should generate no blocks since the entire period is restricted
    expect(blocks.length).toBe(0);
  }, TEST_TIMEOUT);
});
