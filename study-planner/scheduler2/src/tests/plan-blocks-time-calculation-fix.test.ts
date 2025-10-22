import { describe, it, expect } from 'vitest';
import dayjs from 'dayjs';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import { planBlocks } from '../plan-blocks';
import { S2Subject, BlockAllocConstraints, CycleType } from '../types';

// Extend dayjs with required plugins
dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

describe('planBlocks Time Calculation Fix Tests', () => {
  const TEST_TIMEOUT = 10000;

  // Test subjects with sufficient requirements to generate blocks across the time window
  const testSubjects: S2Subject[] = [
    {
      subjectCode: 'TEST-SUBJ-1',
      subjectName: 'Test Subject 1',
      examFocus: 'BothExams',
      baselineMinutes: 2000, // 2000 minutes = ~33 hours (sufficient for long periods)
      topics: [
        {
          code: 'TEST-SUBJ-1/01',
          subtopics: []
        }
      ]
    },
    {
      subjectCode: 'TEST-SUBJ-2', 
      subjectName: 'Test Subject 2',
      examFocus: 'BothExams',
      baselineMinutes: 1000, // 1000 minutes = ~16.7 hours
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

  it('should generate time slices for the full C1 cycle period (March 1 to May 31, 2025)', async () => {
    // This test specifically validates that the time calculation fix allows
    // the algorithm to generate slices for the entire C1 cycle period
    const timeWindowFrom = dayjs('2025-03-01T00:00:00.000Z');
    const timeWindowTo = dayjs('2025-05-31T23:59:59.999Z');

    const blocks = planBlocks(timeWindowFrom, timeWindowTo, testSubjects, baseConstraints);

    // The key validation: blocks should be generated for the full period
    expect(blocks.length).toBeGreaterThan(0);
    
    // Check that blocks cover the entire time window (excluding Sundays)
    const blockDates = blocks.map(block => block.from.format('YYYY-MM-DD'));
    const uniqueDates = [...new Set(blockDates)];
    
    // Should have blocks spanning March, April, and May
    const marchDates = uniqueDates.filter(date => date.startsWith('2025-03'));
    const aprilDates = uniqueDates.filter(date => date.startsWith('2025-04'));
    const mayDates = uniqueDates.filter(date => date.startsWith('2025-05'));
    
    expect(marchDates.length).toBeGreaterThan(0);
    expect(aprilDates.length).toBeGreaterThan(0);
    expect(mayDates.length).toBeGreaterThan(0);
    
    // Verify that blocks are generated throughout the period, not just at the beginning
    const firstBlockDate = dayjs(Math.min(...blocks.map(b => b.from.valueOf())));
    const lastBlockDate = dayjs(Math.max(...blocks.map(b => b.from.valueOf())));
    
    expect(firstBlockDate.format('YYYY-MM-DD')).toBe('2025-03-01');
    expect(lastBlockDate.format('YYYY-MM-DD')).toMatch(/2025-05-2[0-9]/); // Should reach late May
  }, TEST_TIMEOUT);

  it('should specifically generate blocks for May 12, 2025 (the originally failing date)', async () => {
    // This test validates the specific fix for May 12, 2025
    const timeWindowFrom = dayjs('2025-03-01T00:00:00.000Z');
    const timeWindowTo = dayjs('2025-05-31T23:59:59.999Z');

    const blocks = planBlocks(timeWindowFrom, timeWindowTo, testSubjects, baseConstraints);

    // Check specifically for May 12, 2025 (the date that was missing before the fix)
    const may12Blocks = blocks.filter(block => 
      block.from.format('YYYY-MM-DD') === '2025-05-12'
    );
    
    // May 12, 2025 should have blocks (it's a Monday, not restricted)
    expect(may12Blocks.length).toBeGreaterThan(0);
    
    // Verify that the blocks respect working hours constraint
    may12Blocks.forEach(block => {
      const durationMinutes = block.to.diff(block.from, 'minutes');
      expect(durationMinutes).toBeLessThanOrEqual(420); // Max 7 hours per day
    });
  }, TEST_TIMEOUT);

  it('should handle Sunday restrictions correctly without double-subtracting time', async () => {
    // This test validates that Sunday restrictions are handled correctly
    // without the double-subtraction bug that was causing early termination
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
    
    // Verify that blocks respect working hours constraint
    blocks.forEach(block => {
      const durationMinutes = block.to.diff(block.from, 'minutes');
      expect(durationMinutes).toBeLessThanOrEqual(420); // Max 7 hours per day
    });
  }, TEST_TIMEOUT);

  it('should calculate maxSlices correctly based on working hours, not total time', async () => {
    // This test validates that the maxSlices calculation uses working hours
    // instead of total time window, preventing early termination
    const timeWindowFrom = dayjs('2025-03-01T00:00:00.000Z');
    const timeWindowTo = dayjs('2025-03-07T23:59:59.999Z');

    const blocks = planBlocks(timeWindowFrom, timeWindowTo, testSubjects, baseConstraints);

    // Calculate expected working time
    const totalDays = timeWindowTo.diff(timeWindowFrom, 'day') + 1; // 7 days
    const workingDays = totalDays - 1; // Exclude 1 Sunday
    const expectedWorkingMinutes = workingDays * baseConstraints.workingHoursPerDay * 60; // 6 × 7 × 60 = 2520 minutes
    const expectedMaxSlices = Math.ceil(expectedWorkingMinutes / 30); // 2520 ÷ 30 = 84 slices

    // Verify that we have a reasonable number of blocks
    expect(blocks.length).toBeGreaterThan(0);
    expect(blocks.length).toBeLessThanOrEqual(expectedMaxSlices);
    
    // Verify that blocks are distributed across the working days
    const blockDates = [...new Set(blocks.map(block => block.from.format('YYYY-MM-DD')))];
    expect(blockDates.length).toBeGreaterThanOrEqual(3); // At least 3 working days covered
  }, TEST_TIMEOUT);

  it('should handle different working hours per day correctly', async () => {
    // This test validates that the fix works with different working hours constraints
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
    // This test validates that single-day time windows work correctly
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
    // This test validates that time windows with only restricted days work correctly
    const timeWindowFrom = dayjs('2025-03-02T00:00:00.000Z'); // Sunday
    const timeWindowTo = dayjs('2025-03-02T23:59:59.999Z'); // Same Sunday

    const blocks = planBlocks(timeWindowFrom, timeWindowTo, testSubjects, baseConstraints);

    // Should generate no blocks since the entire period is restricted
    expect(blocks.length).toBe(0);
  }, TEST_TIMEOUT);
});
