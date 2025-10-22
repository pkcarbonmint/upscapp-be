import { describe, it, expect } from 'vitest';
import { 
  CycleType, 
  StudyApproach, 
  DayOfWeek,
  type CycleSchedule,
  type Subject,
  type ConfidenceMap,
  type DailyHourLimitsInput,
  type DayPreferences,
  type TaskEffortSplit,
  type DetermineBlockScheduleResult,
  type BlockSchedule
} from '../types';
import dayjs from 'dayjs';
import { determineBlockSchedule } from '../blocks';

describe('determineBlockSchedule', () => {
  // Local test data - self-contained JSON structure
  const testData = {
    cycleSchedule: {
      cycleType: CycleType.C1,
      startDate: "2025-03-01",
      endDate: "2025-05-31",
      priority: 'mandatory' as const
    },
    subjects: [
      {
        subjectCode: "H01",
        baselineHours: 200,
        priority: 5,
        subjectType: 'GS' as const,
        isOptional: false
      },
      {
        subjectCode: "H02", 
        baselineHours: 180,
        priority: 4,
        subjectType: 'GS' as const,
        isOptional: false
      },
      {
        subjectCode: "G",
        baselineHours: 150,
        priority: 3,
        subjectType: 'GS' as const,
        isOptional: false
      },
      {
        subjectCode: "OPT-AGR",
        baselineHours: 300,
        priority: 5,
        subjectType: 'Optional' as const,
        isOptional: true,
        optionalSubjectName: "Agriculture"
      }
    ],
    confidenceMap: new Map([
      ["H01", 5], // VeryStrong
      ["H02", 4], // Strong
      ["G", 3],   // Moderate
      ["OPT-AGR", 4] // Strong
    ]),
    dailyHourLimits: {
      regular_day: 8,
      test_day: 6
    },
    dayPreferences: {
      testDay: DayOfWeek.SUNDAY,
      catchupDay: DayOfWeek.SATURDAY
    },
    taskEffortSplit: {
      study: 0.6,
      practice: 0.2,
      revision: 0.2,
      test: 0.0,
      review: 0.0
    }
  };

  it('should generate block schedules with weekly subject allocations', () => {
    const cycleSchedule: CycleSchedule = testData.cycleSchedule;
    const subjects: Subject[] = testData.subjects;
    const confidenceMap: ConfidenceMap = testData.confidenceMap;
    const dailyHourLimits: DailyHourLimitsInput = testData.dailyHourLimits;
    const dayPreferences: DayPreferences = testData.dayPreferences;
    const taskEffortSplit: TaskEffortSplit = testData.taskEffortSplit;

    // Calculate total hours available
    const workingHoursPerDay = dailyHourLimits.regular_day;
    const totalHours = dayjs(cycleSchedule.endDate).diff(dayjs(cycleSchedule.startDate), "day") * workingHoursPerDay;
    
    const gsOptionalRatio = { gs: 0.67, optional: 0.33 };
    const studyApproach: StudyApproach = 'Balanced'; // Use Sequential to ensure blocks fill the cycle

    const result: DetermineBlockScheduleResult = determineBlockSchedule(
      cycleSchedule,
      subjects,
      confidenceMap,
      totalHours,
      studyApproach,
      workingHoursPerDay,
      gsOptionalRatio,
      dailyHourLimits,
      dayPreferences,
      taskEffortSplit
    );

    // Verify block schedules
    expect(result.blockSchedules).toBeDefined();
    expect(result.blockSchedules.length).toBeGreaterThan(0);
    
    // Verify that at least one block extends to the cycle end date
    const lastDateOfCycle = dayjs(cycleSchedule.endDate);
    const blocksThatExtendUntilLastDate = result.blockSchedules.filter(
      block => dayjs(block.endDate).isSame(lastDateOfCycle, 'day')
    );
    expect(blocksThatExtendUntilLastDate.length).toBeGreaterThan(0);

    // Verify weekly subject allocations
    expect(result.weeklySubjectAllocations).toBeDefined();
    
    // Check that we have allocations for multiple weeks
    const weekKeys = Object.keys(result.weeklySubjectAllocations);
    expect(weekKeys.length).toBeGreaterThan(0);

    // Verify that subjects appear in weekly allocations
    const subjectCodes = subjects.map(s => s.subjectCode);
    weekKeys.forEach(weekKey => {
      const weekAllocations = result.weeklySubjectAllocations[weekKey];
      const allocatedSubjects = Object.keys(weekAllocations);
      
      // At least some subjects should be allocated in each week
      expect(allocatedSubjects.length).toBeGreaterThan(0);
      
      // Verify allocation structure
      allocatedSubjects.forEach(subjectCode => {
        const allocation = weekAllocations[subjectCode];
        expect(allocation.totalHours).toBeGreaterThan(0);
        expect(allocation.byTaskType).toBeDefined();
        expect(allocation.byDay).toBeDefined();
        expect(allocation.sourceBlocks).toBeDefined();
        expect(Array.isArray(allocation.sourceBlocks)).toBe(true);
      });
    });

    console.log('Block Schedules:', result.blockSchedules);
    console.log('Weekly Allocations Sample:', 
      Object.keys(result.weeklySubjectAllocations).slice(0, 2).map(weekKey => ({
        week: weekKey,
        subjects: Object.keys(result.weeklySubjectAllocations[weekKey])
      }))
    );
  });

  it('should handle overlapping subjects in the same calendar week', () => {
    // Create a scenario where multiple subjects overlap in the same week
    const overlappingCycleSchedule: CycleSchedule = {
      cycleType: CycleType.C2,
      startDate: "2025-06-15", // Start mid-week
      endDate: "2025-06-29",   // End exactly when blocks fill
      priority: 'mandatory'
    };

    const overlappingSubjects: Subject[] = [
      {
        subjectCode: "H01",
        baselineHours: 60,
        priority: 5,
        subjectType: 'GS',
        isOptional: false
      },
      {
        subjectCode: "H02",
        baselineHours: 50,
        priority: 4,
        subjectType: 'GS', 
        isOptional: false
      },
      {
        subjectCode: "OPT-AGR",
        baselineHours: 70,
        priority: 5,
        subjectType: 'Optional',
        isOptional: true,
        optionalSubjectName: "Agriculture"
      }
    ];

    const workingHoursPerDay = 8;
    const totalHours = dayjs(overlappingCycleSchedule.endDate).diff(
      dayjs(overlappingCycleSchedule.startDate), "day"
    ) * workingHoursPerDay;

    const result: DetermineBlockScheduleResult = determineBlockSchedule(
      overlappingCycleSchedule,
      overlappingSubjects,
      testData.confidenceMap,
      totalHours,
      'Balanced', // Use Sequential to ensure blocks fill the cycle
      workingHoursPerDay,
      { gs: 0.67, optional: 0.33 },
      testData.dailyHourLimits,
      testData.dayPreferences,
      testData.taskEffortSplit
    );

    // Verify that multiple subjects appear in the same calendar week
    const weekKeys = Object.keys(result.weeklySubjectAllocations);
    expect(weekKeys.length).toBeGreaterThan(0);

    // Check for overlapping subjects in the same week
    let foundOverlappingWeek = false;
    weekKeys.forEach(weekKey => {
      const weekAllocations = result.weeklySubjectAllocations[weekKey];
      const allocatedSubjects = Object.keys(weekAllocations);
      
      if (allocatedSubjects.length > 1) {
        foundOverlappingWeek = true;
        console.log(`Week ${weekKey} has overlapping subjects:`, allocatedSubjects);
        
        // Verify each subject has reasonable allocation
        allocatedSubjects.forEach(subjectCode => {
          const allocation = weekAllocations[subjectCode];
          expect(allocation.totalHours).toBeGreaterThan(0);
          expect(allocation.sourceBlocks).toContain(subjectCode);
        });
      }
    });

    expect(foundOverlappingWeek).toBe(true);
  });

  it('should throw error when required parameters are missing', () => {
    const cycleSchedule: CycleSchedule = testData.cycleSchedule;
    const subjects: Subject[] = testData.subjects;
    const confidenceMap: ConfidenceMap = testData.confidenceMap;
    const totalHours = 1000;
    const studyApproach: StudyApproach = 'DualSubject';

    // Should throw error when dailyHourLimits is missing
    expect(() => {
      determineBlockSchedule(
        cycleSchedule,
        subjects,
        confidenceMap,
        totalHours,
        studyApproach,
        8,
        { gs: 0.67, optional: 0.33 }
        // Missing dailyHourLimits and dayPreferences
      );
    }).toThrow('dailyHourLimits and dayPreferences are required');

    // Should throw error when dayPreferences is missing
    expect(() => {
      determineBlockSchedule(
        cycleSchedule,
        subjects,
        confidenceMap,
        totalHours,
        studyApproach,
        8,
        { gs: 0.67, optional: 0.33 },
        testData.dailyHourLimits
        // Missing dayPreferences
      );
    }).toThrow('dailyHourLimits and dayPreferences are required');
  });

  it('should stretch the block schedule to fill the cycle', () => {
    const cycleSchedule: CycleSchedule = testData.cycleSchedule;
    const subjects: Subject[] = testData.subjects;
    const confidenceMap: ConfidenceMap = testData.confidenceMap;
    const studyApproach: StudyApproach = 'Balanced';
    const totalHours = 200;

    const result: DetermineBlockScheduleResult = determineBlockSchedule(
      cycleSchedule,
      subjects,
      confidenceMap,
      totalHours,
      studyApproach,
      8,
      { gs: 0.67, optional: 0.33 },
      testData.dailyHourLimits,
      testData.dayPreferences,
      testData.taskEffortSplit
    );
    
    console.log('Result:', result.blockSchedules.map(block => ([block.subjectCode,block.allocatedHours, block.startDate,block.endDate])));
    expect(result.blockSchedules).toBeDefined();
    expect(result.blockSchedules.length).toBeGreaterThan(0);

    // Verify that the block schedules stretch to fill the cycle
    const lastBlockEndDate = result.blockSchedules.reduce((latest: BlockSchedule, current: BlockSchedule) => dayjs(current.endDate).isAfter(dayjs(latest.endDate)) ? current : latest).endDate;
    expect(dayjs(lastBlockEndDate).isSame(dayjs(cycleSchedule.endDate), 'day')).toBe(true);
  });

  
  it('should stretch the block schedule to fill the cycle - multiple parallel subjects', () => {
    const cycleSchedule: CycleSchedule = testData.cycleSchedule;
    const subjects: Subject[] = testData.subjects;
    const confidenceMap: ConfidenceMap = testData.confidenceMap;
    const studyApproach: StudyApproach = 'Balanced';
    const totalHours = 200;

    const result: DetermineBlockScheduleResult = determineBlockSchedule(
      cycleSchedule,
      subjects,
      confidenceMap,
      totalHours,
      studyApproach,
      8,
      { gs: 0.67, optional: 0.33 },
      testData.dailyHourLimits,
      testData.dayPreferences,
      testData.taskEffortSplit
    );
    
    console.log('Result:', result.blockSchedules.map(block => ([block.subjectCode,block.allocatedHours, block.startDate,block.endDate])));
    console.log('total allocated hours in blocks: ', result.blockSchedules.reduce((sum, block) => sum + block.allocatedHours, 0));
    expect(result.blockSchedules).toBeDefined();
    expect(result.blockSchedules.length).toBeGreaterThan(0);

    // Verify that the block schedules stretch to fill the cycle
    const lastBlockEndDate = result.blockSchedules.reduce((latest: BlockSchedule, current: BlockSchedule) => dayjs(current.endDate).isAfter(dayjs(latest.endDate)) ? current : latest).endDate;
    expect(dayjs(lastBlockEndDate).isSame(dayjs(cycleSchedule.endDate), 'day')).toBe(true);
  });  
});
