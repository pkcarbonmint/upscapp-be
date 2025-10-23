import { describe, it, expect, beforeEach } from 'vitest';
import dayjs from 'dayjs';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import { planMain } from '../plan-main';
import { planBlocks } from '../plan-blocks';
import { planSubjectTasks } from '../plan-subject';

// Extend dayjs with plugins
dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);
import { 
  PlanningContext, 
  S2WeekDay, 
  CycleType,
  S2SlotType,
  S2Task,
  BlockSlot,
  CycleSchedule,
  BlockAllocConstraints,
  S2Constraints
} from '../types';

// Load test context from JSON file
import t1ContextData from './t1-context.json';

describe('planMain Validation Tests with T1 Context', () => {
  const TEST_TIMEOUT = 30000; // 30 seconds for comprehensive test
  let context: PlanningContext;

  beforeEach(() => {
    // Convert JSON data to PlanningContext
    context = {
      optionalSubject: {
        subjectCode: t1ContextData.optionalSubject.subjectCode,
        subjectNname: t1ContextData.optionalSubject.subjectNname,
        examFocus: t1ContextData.optionalSubject.examFocus as any,
        baselineMinutes: t1ContextData.optionalSubject.baselineMinutes,
        topics: t1ContextData.optionalSubject.topics.map(topic => ({
          code: topic.code,
          subtopics: topic.subtopics || []
        }))
      },
      startDate: dayjs(t1ContextData.startDate),
      targetYear: t1ContextData.targetYear,
      prelimsExamDate: dayjs(t1ContextData.prelimsExamDate),
      mainsExamDate: dayjs(t1ContextData.mainsExamDate),
      constraints: {
        optionalSubjectCode: t1ContextData.constraints.optionalSubjectCode,
        confidenceMap: t1ContextData.constraints.confidenceMap,
        optionalFirst: t1ContextData.constraints.optionalFirst,
        catchupDay: t1ContextData.constraints.catchupDay as S2WeekDay,
        testDay: t1ContextData.constraints.testDay as S2WeekDay,
        workingHoursPerDay: t1ContextData.constraints.workingHoursPerDay,
        breaks: t1ContextData.constraints.breaks || [],
        testMinutes: t1ContextData.constraints.testMinutes
      },
      subjects: t1ContextData.subjects.map(subject => ({
        subjectCode: subject.subjectCode,
        subjectNname: subject.subjectNname,
        examFocus: subject.examFocus as any,
        baselineMinutes: subject.baselineMinutes,
        topics: subject.topics.map(topic => ({
          code: topic.code,
          subtopics: topic.subtopics || []
        }))
      })),
      relativeAllocationWeights: t1ContextData.relativeAllocationWeights
    };
  });

  // ===== VALIDATION TESTS FOR planMain FUNCTION =====
  
  it('should generate a complete study plan with cycles, blocks, and tasks', async () => {
    const result = planMain(context);
    
    // Validate result structure
    expect(result).toBeDefined();
    expect(result.cycles).toBeDefined();
    expect(result.blocks).toBeDefined();
    expect(result.tasks).toBeDefined();
    
    expect(Array.isArray(result.cycles)).toBe(true);
    expect(Array.isArray(result.blocks)).toBe(true);
    expect(Array.isArray(result.tasks)).toBe(true);
    
    // Validate cycles are generated
    expect(result.cycles.length).toBeGreaterThan(0);
    
    // Validate blocks are generated
    expect(result.blocks.length).toBeGreaterThan(0);
    
    // Validate tasks are generated (this should fail currently)
    expect(result.tasks.length).toBeGreaterThan(0);
  }, TEST_TIMEOUT);

  it('should generate cycles that cover the entire planning period without gaps', async () => {
    const result = planMain(context);
    const cycles = result.cycles as CycleSchedule[];
    
    expect(cycles.length).toBeGreaterThan(0);
    
    const startDate = context.startDate;
    const mainsDate = context.mainsExamDate;
    
    // First cycle should start at or near the start date
    const firstCycleStart = dayjs(cycles[0].startDate);
    expect(firstCycleStart.isSameOrAfter(startDate.subtract(1, 'day'))).toBe(true);
    
    // Last cycle should end at or near the mains exam date
    const lastCycleEnd = dayjs(cycles[cycles.length - 1].endDate);
    expect(lastCycleEnd.isSameOrBefore(mainsDate.add(1, 'day'))).toBe(true);
    
    // Check for gaps between cycles (should be minimal)
    for (let i = 0; i < cycles.length - 1; i++) {
      const currentCycle = cycles[i];
      const nextCycle = cycles[i + 1];
      
      const currentEnd = dayjs(currentCycle.endDate);
      const nextStart = dayjs(nextCycle.startDate);
      const gapDays = nextStart.diff(currentEnd, 'day');
      
      // Allow maximum 2 days gap between cycles
      expect(gapDays).toBeLessThanOrEqual(2);
    }
  }, TEST_TIMEOUT);

  it('should generate blocks for all subjects with appropriate allocation', async () => {
    const result = planMain(context);
    const blocks = result.blocks as BlockSlot[];
    
    expect(blocks.length).toBeGreaterThan(0);
    
    // Group blocks by subject
    const blocksBySubject = blocks.reduce((acc, block) => {
      if (!acc[block.subject.subjectCode]) {
        acc[block.subject.subjectCode] = [];
      }
      acc[block.subject.subjectCode].push(block);
      return acc;
    }, {} as Record<string, BlockSlot[]>);
    
    // Validate that all subjects have blocks
    const allSubjects = context.subjects.concat([context.optionalSubject]);
    allSubjects.forEach(subject => {
      expect(blocksBySubject[subject.subjectCode]).toBeDefined();
      expect(blocksBySubject[subject.subjectCode].length).toBeGreaterThan(0);
    });
    
    // Validate block structure
    blocks.forEach(block => {
      expect(block.subject).toBeDefined();
      expect(block.from.isValid()).toBe(true);
      expect(block.to.isValid()).toBe(true);
      expect(block.cycleType).toBeDefined();
      expect(block.to.isAfter(block.from)).toBe(true);
      
      // Validate block duration is reasonable
      const duration = block.to.diff(block.from, 'minutes');
      expect(duration).toBeGreaterThan(0);
      expect(duration).toBeLessThanOrEqual(context.constraints.workingHoursPerDay * 60 * 2); // Max 2 days
    });
  }, TEST_TIMEOUT);

  it('should generate tasks for all blocks with proper task types', async () => {
    const result = planMain(context);
    const tasks = result.tasks as S2Task[];
    
    // Validate tasks are generated
    expect(tasks.length).toBeGreaterThan(0);
    
    // Validate task structure
    tasks.forEach(task => {
      expect(task.subjectCode).toBeDefined();
      expect(task.minutes).toBeGreaterThan(0);
      expect(task.date.isValid()).toBe(true);
      expect(Object.values(S2SlotType).includes(task.taskType)).toBe(true);
    });
    
    // Validate that we have different task types
    const taskTypes = new Set(tasks.map(task => task.taskType));
    expect(taskTypes.size).toBeGreaterThan(1); // Should have multiple task types
    
    // Validate that STUDY tasks are generated (most important)
    const studyTasks = tasks.filter(task => task.taskType === S2SlotType.STUDY);
    expect(studyTasks.length).toBeGreaterThan(0);
    
    // Validate that tasks cover the planning period
    const taskDates = tasks.map(task => task.date);
    const minTaskDate = taskDates.reduce((min, date) => date.isBefore(min) ? date : min);
    const maxTaskDate = taskDates.reduce((max, date) => date.isAfter(max) ? date : max);
    
    expect(minTaskDate.isSameOrAfter(context.startDate)).toBe(true);
    expect(maxTaskDate.isSameOrBefore(context.mainsExamDate)).toBe(true);
  }, TEST_TIMEOUT);

  it('should respect working hours constraints in daily task allocation', async () => {
    const result = planMain(context);
    const tasks = result.tasks as S2Task[];
    
    expect(tasks.length).toBeGreaterThan(0);
    
    // Group tasks by date (across all subjects)
    const tasksByDate = tasks.reduce((acc, task) => {
      const dateKey = task.date.format('YYYY-MM-DD');
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(task);
      return acc;
    }, {} as Record<string, S2Task[]>);
    
    const workingMinutesPerDay = context.constraints.workingHoursPerDay * 60; // 7 hours = 420 minutes
    const tolerance = workingMinutesPerDay * 0.3; // 30% tolerance = 126 minutes (more realistic)
    
    // Validate total daily allocation across all subjects
    Object.entries(tasksByDate).forEach(([_, dayTasks]) => {
      const totalMinutes = dayTasks.reduce((sum, task) => sum + task.minutes, 0);
      
      // Should not exceed working hours significantly
      expect(totalMinutes).toBeLessThanOrEqual(workingMinutesPerDay + tolerance);
      
      // Should not be significantly under-allocated (but allow for restricted days)
      // Only check minimum allocation if there are tasks (skip restricted days)
      if (dayTasks.length > 0) {
        expect(totalMinutes).toBeGreaterThanOrEqual(workingMinutesPerDay * 0.2); // At least 20% utilization (very flexible)
      }
    });
  }, TEST_TIMEOUT);

  it('should allocate time proportionally based on relative weights', async () => {
    const result = planMain(context);
    const tasks = result.tasks as S2Task[];
    
    expect(tasks.length).toBeGreaterThan(0);
    
    // Calculate total minutes per subject
    const minutesPerSubject = tasks.reduce((acc, task) => {
      if (!acc[task.subjectCode]) {
        acc[task.subjectCode] = 0;
      }
      acc[task.subjectCode] += task.minutes;
      return acc;
    }, {} as Record<string, number>);
    
    // Validate that subjects with higher weights get more time
    const subjectsWithWeights = Object.entries(context.relativeAllocationWeights)
      .map(([subjectCode, weight]) => ({
        subjectCode,
        weight,
        allocatedMinutes: minutesPerSubject[subjectCode] || 0
      }))
      .sort((a, b) => b.weight - a.weight);
    
    // Top weighted subjects should have more allocated time
    const topWeighted = subjectsWithWeights.slice(0, 3);
    const bottomWeighted = subjectsWithWeights.slice(-3);
    
    topWeighted.forEach(topSubject => {
      bottomWeighted.forEach(bottomSubject => {
        if (topSubject.allocatedMinutes > 0 && bottomSubject.allocatedMinutes > 0) {
          expect(topSubject.allocatedMinutes).toBeGreaterThanOrEqual(bottomSubject.allocatedMinutes);
        }
      });
    });
  }, TEST_TIMEOUT);

  // ===== VALIDATION TESTS FOR planBlocks FUNCTION =====
  
  it('should generate blocks that respect parallel constraints', async () => {
    const result = planMain(context);
    const cycles = result.cycles as CycleSchedule[];
    
    // Test with first cycle
    const testCycle = cycles[0];
    const cycleStart = dayjs(testCycle.startDate);
    const cycleEnd = dayjs(testCycle.endDate);
    
    const testSubjects = context.subjects.filter(s => s.examFocus === 'BothExams');
    const blockConstraints: BlockAllocConstraints = {
      cycleType: testCycle.cycleType as CycleType,
      relativeAllocationWeights: context.relativeAllocationWeights,
      numParallel: 2,
      workingHoursPerDay: context.constraints.workingHoursPerDay,
      catchupDay: context.constraints.catchupDay,
      testDay: context.constraints.testDay,
    };
    
    const blocks = planBlocks(cycleStart, cycleEnd, testSubjects, blockConstraints);
    
    expect(blocks.length).toBeGreaterThan(0);
    
    // Validate that blocks respect time window
    blocks.forEach(block => {
      expect(block.from.isSameOrAfter(cycleStart)).toBe(true);
      expect(block.to.isSameOrBefore(cycleEnd)).toBe(true);
    });
    
    // Validate that blocks respect working hours
    const workingMinutesPerDay = context.constraints.workingHoursPerDay * 60;
    blocks.forEach(block => {
      const duration = block.to.diff(block.from, 'minutes');
      expect(duration).toBeGreaterThan(0);
      expect(duration).toBeLessThanOrEqual(workingMinutesPerDay * 2); // Allow up to 2 days
    });
  }, TEST_TIMEOUT);

  // ===== VALIDATION TESTS FOR planSubjectTasks FUNCTION =====
  
  it('should generate tasks with correct effort split ratios', async () => {
    const testSubject = context.subjects.find(s => s.subjectCode === 'H01')!;
    const testStart = context.startDate;
    const testEnd = testStart.add(7, 'days');
    
    const taskConstraints: S2Constraints = {
      cycleType: CycleType.C1,
      dayMaxMinutes: context.constraints.workingHoursPerDay * 60 * 1.1,
      dayMinMinutes: context.constraints.workingHoursPerDay * 60 * 0.9,
      catchupDay: context.constraints.catchupDay,
      testDay: context.constraints.testDay,
      testMinutes: context.constraints.testMinutes,
      taskEffortSplit: {
        [S2SlotType.STUDY]: 0.6,
        [S2SlotType.PRACTICE]: 0.2,
        [S2SlotType.REVISION]: 0.2,
        [S2SlotType.TEST]: 0,
        [S2SlotType.CATCHUP]: 0
      }
    };
    
    const tasks = planSubjectTasks(testStart, testEnd, testSubject, taskConstraints);
    
    expect(tasks.length).toBeGreaterThan(0);
    
    // Count tasks by type
    const studyTasks = tasks.filter(t => t.taskType === S2SlotType.STUDY);
    const practiceTasks = tasks.filter(t => t.taskType === S2SlotType.PRACTICE);
    const revisionTasks = tasks.filter(t => t.taskType === S2SlotType.REVISION);
    
    // Validate that STUDY tasks are generated
    expect(studyTasks.length).toBeGreaterThan(0);
    
    // Validate effort split ratios
    const totalMinutes = tasks.reduce((sum, task) => sum + task.minutes, 0);
    if (totalMinutes > 0) {
      const studyRatio = studyTasks.reduce((sum, task) => sum + task.minutes, 0) / totalMinutes;
      const practiceRatio = practiceTasks.reduce((sum, task) => sum + task.minutes, 0) / totalMinutes;
      const revisionRatio = revisionTasks.reduce((sum, task) => sum + task.minutes, 0) / totalMinutes;
      
      // Allow some tolerance but validate ratios are reasonable
      expect(studyRatio).toBeGreaterThan(0.4); // At least 40% STUDY
      expect(studyRatio).toBeLessThan(0.8); // At most 80% STUDY
      
      if (practiceTasks.length > 0) {
        expect(practiceRatio).toBeGreaterThan(0.1); // At least 10% PRACTICE
      }
      
      if (revisionTasks.length > 0) {
        expect(revisionRatio).toBeGreaterThan(0.1); // At least 10% REVISION
      }
    }
  }, TEST_TIMEOUT);

  it('should generate tasks for different subjects with appropriate allocation', async () => {
    const testSubjects = [
      context.optionalSubject,
      context.subjects.find(s => s.subjectCode === 'G')!,
      context.subjects.find(s => s.subjectCode === 'P')!,
    ];
    
    const testStart = context.startDate;
    const testEnd = testStart.add(3, 'days');
    
    testSubjects.forEach(subject => {
      const taskConstraints: S2Constraints = {
        cycleType: CycleType.C1,
        dayMaxMinutes: context.constraints.workingHoursPerDay * 60 * 1.1,
        dayMinMinutes: context.constraints.workingHoursPerDay * 60 * 0.9,
        catchupDay: context.constraints.catchupDay,
        testDay: context.constraints.testDay,
        testMinutes: context.constraints.testMinutes,
        taskEffortSplit: {
          [S2SlotType.STUDY]: 0.7,
          [S2SlotType.PRACTICE]: 0.1,
          [S2SlotType.REVISION]: 0.2,
          [S2SlotType.TEST]: 0,
          [S2SlotType.CATCHUP]: 0
        }
      };
      
      const tasks = planSubjectTasks(testStart, testEnd, subject, taskConstraints);
      
      // Validate tasks are generated
      expect(tasks.length).toBeGreaterThan(0);
      
      // Validate all tasks belong to this subject
      tasks.forEach(task => {
        expect(task.subjectCode).toBe(subject.subjectCode);
      });
      
      // Validate task types
      const taskTypes = new Set(tasks.map(task => task.taskType));
      expect(taskTypes.size).toBeGreaterThan(0);
    });
  }, TEST_TIMEOUT);

  
  it('should have tasks assigned for 2025-05-12', async () => {
    const result = planMain(context);
    const tasks = result.tasks as S2Task[];
    
    expect(tasks.length).toBeGreaterThan(0);
    
    // Check specifically for 2025
    const may12Tasks = tasks.filter(task => 
      task.date.format('YYYY-MM-DD') === '2025-05-12'
    );
    
    // console.log(`Tasks on 2025: ${may12Tasks.length}`);
    
    if (may12Tasks.length > 0) {
    //   console.log('2025 tasks:');
    //   may12Tasks.forEach((task, index) => {
    //     console.log(`  Task ${index + 1}: ${task.subjectCode} ${S2SlotType[task.taskType]} ${task.minutes}min`);
    //   });
    } else {
    //   console.log('No tasks found for 2025-05-12');
      
      // Check what dates are actually generated
    //   const taskDates = [...new Set(tasks.map(task => task.date.format('YYYY-MM-DD')))].sort();
    //   console.log(`Available task dates (first 10): ${taskDates.slice(0, 10).join(', ')}`);
    //   console.log(`Available task dates (last 10): ${taskDates.slice(-10).join(', ')}`);
      
      // Check if there are any tasks in May 2027
    //   const may2025Tasks = tasks.filter(task => 
    //     task.date.format('YYYY-MM') === '2025-05'
    //   );
    //   console.log(`Tasks in 2025-05: ${may2025Tasks.length}`);
      
    //   if (may2025Tasks.length > 0) {
    //     const mayDates = [...new Set(may2025Tasks.map(task => task.date.format('YYYY-MM-DD')))].sort();
    //     console.log(`2025-05 task dates: ${mayDates.join(', ')}`);
    //   }
    }
    
    // This test should fail if there are no tasks on May 11, 2027
    expect(may12Tasks.length).toBeGreaterThan(0);
  }, TEST_TIMEOUT);

  it('should have tasks assigned for May 11, 2027', async () => {
    const result = planMain(context);
    const tasks = result.tasks as S2Task[];
    
    expect(tasks.length).toBeGreaterThan(0);
    
    // Check specifically for May 11, 2027
    const may11Tasks = tasks.filter(task => 
      task.date.format('YYYY-MM-DD') === '2027-05-11'
    );
    
    // console.log(`Tasks on May 11, 2027: ${may11Tasks.length}`);
    
    if (may11Tasks.length > 0) {
    //   console.log('May 11, 2027 tasks:');
    //   may11Tasks.forEach((task, index) => {
    //     console.log(`  Task ${index + 1}: ${task.subjectCode} ${S2SlotType[task.taskType]} ${task.minutes}min`);
    //   });
    } else {
    //   console.log('No tasks found for May 11, 2027');
      
    //   // Check what dates are actually generated
    //   const taskDates = [...new Set(tasks.map(task => task.date.format('YYYY-MM-DD')))].sort();
    //   console.log(`Available task dates (first 10): ${taskDates.slice(0, 10).join(', ')}`);
    //   console.log(`Available task dates (last 10): ${taskDates.slice(-10).join(', ')}`);
      
      // Check if there are any tasks in May 2027
      const may2027Tasks = tasks.filter(task => 
        task.date.format('YYYY-MM') === '2027-05'
      );
      console.log(`Tasks in May 2027: ${may2027Tasks.length}`);
    //   
    //   if (may2027Tasks.length > 0) {
    //     const mayDates = [...new Set(may2027Tasks.map(task => task.date.format('YYYY-MM-DD')))].sort();
    //     console.log(`May 2027 task dates: ${mayDates.join(', ')}`);
    //   }
    }
    
    // This test should fail if there are no tasks on May 11, 2027
    expect(may11Tasks.length).toBeGreaterThan(0);
  }, TEST_TIMEOUT);

  it('should have no gaps in task coverage throughout the planning period', async () => {
    const result = planMain(context);
    const tasks = result.tasks as S2Task[];
    
    expect(tasks.length).toBeGreaterThan(0);
    
    // Get all task dates and sort them
    const taskDates = [...new Set(tasks.map(task => task.date.format('YYYY-MM-DD')))].sort();
    const startDate = context.startDate.format('YYYY-MM-DD');
    const endDate = context.mainsExamDate.format('YYYY-MM-DD');
    
    console.log(`Planning period: ${startDate} to ${endDate}`);
    console.log(`Task dates span: ${taskDates[0]} to ${taskDates[taskDates.length - 1]}`);
    console.log(`Total task dates: ${taskDates.length}`);
    
    // Check for gaps in task coverage
    const gaps: string[] = [];
    let currentDate = dayjs(startDate);
    const endDateObj = dayjs(endDate);
    
    while (currentDate.isBefore(endDateObj) || currentDate.isSame(endDateObj, 'day')) {
      const dateStr = currentDate.format('YYYY-MM-DD');
      
      if (!taskDates.includes(dateStr)) {
        gaps.push(dateStr);
      }
      
      currentDate = currentDate.add(1, 'day');
    }
    
    if (gaps.length > 0) {
      console.log(`Found ${gaps.length} days with no tasks:`);
      console.log(`Gap dates: ${gaps.slice(0, 20).join(', ')}${gaps.length > 20 ? '...' : ''}`);
      
      // Check if May 11-19, 2027 is in the gaps
      const mayGaps = gaps.filter(date => date.startsWith('2027-05-'));
      if (mayGaps.length > 0) {
        console.log(`May 2027 gaps: ${mayGaps.join(', ')}`);
      }
    } else {
      console.log('No gaps found in task coverage');
    }
    
    // Allow some gaps (weekends, holidays, etc.) but not large consecutive gaps
    // Fail if there are more than 5 consecutive days without tasks
    const consecutiveGaps = gaps.reduce((acc, date) => {
      const prevDate = dayjs(date).subtract(1, 'day').format('YYYY-MM-DD');
      if (acc.length > 0 && acc[acc.length - 1] === prevDate) {
        acc.push(date);
      } else {
        acc = [date];
      }
      return acc;
    }, [] as string[]);
    
    const maxConsecutiveGaps = Math.max(...consecutiveGaps.map(gap => gap.length));
    console.log(`Maximum consecutive days without tasks: ${maxConsecutiveGaps}`);
    
    // Fail if there are more than 5 consecutive days without tasks
    expect(maxConsecutiveGaps).toBeLessThanOrEqual(5);
  }, TEST_TIMEOUT);

  it('should handle error conditions properly', async () => {
    const testSubject = context.subjects[0];
    const testStart = context.startDate;
    const testEnd = testStart.add(1, 'day');
    
    // Test invalid date range
    expect(() => {
      planSubjectTasks(testEnd, testStart, testSubject, {
        cycleType: CycleType.C1,
        dayMaxMinutes: 400,
        dayMinMinutes: 200,
        catchupDay: context.constraints.catchupDay,
        testDay: context.constraints.testDay,
        testMinutes: context.constraints.testMinutes,
        taskEffortSplit: {
          [S2SlotType.STUDY]: 0.6,
          [S2SlotType.PRACTICE]: 0.2,
          [S2SlotType.REVISION]: 0.2,
          [S2SlotType.TEST]: 0,
          [S2SlotType.CATCHUP]: 0
        }
      });
    }).toThrow('to date must be after from date');
    
    // Test invalid constraints
    expect(() => {
      planSubjectTasks(testStart, testEnd, testSubject, {
        cycleType: CycleType.C1,
        dayMaxMinutes: 100, // Less than dayMinMinutes
        dayMinMinutes: 200,
        catchupDay: context.constraints.catchupDay,
        testDay: context.constraints.testDay,
        testMinutes: context.constraints.testMinutes,
        taskEffortSplit: {
          [S2SlotType.STUDY]: 0.6,
          [S2SlotType.PRACTICE]: 0.2,
          [S2SlotType.REVISION]: 0.2,
          [S2SlotType.TEST]: 0,
          [S2SlotType.CATCHUP]: 0
        }
      });
    }).toThrow('day min minutes must be less than day max minutes');
    
    // Test with subject having no topics
    const subjectWithNoTopics = { ...testSubject, topics: [] };
    expect(() => {
      planSubjectTasks(testStart, testEnd, subjectWithNoTopics, {
        cycleType: CycleType.C1,
        dayMaxMinutes: 400,
        dayMinMinutes: 200,
        catchupDay: context.constraints.catchupDay,
        testDay: context.constraints.testDay,
        testMinutes: context.constraints.testMinutes,
        taskEffortSplit: {
          [S2SlotType.STUDY]: 0.6,
          [S2SlotType.PRACTICE]: 0.2,
          [S2SlotType.REVISION]: 0.2,
          [S2SlotType.TEST]: 0,
          [S2SlotType.CATCHUP]: 0
        }
      });
    }).toThrow('subject must have at least one topic');
  }, TEST_TIMEOUT);
});
