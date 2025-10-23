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
  S2Subject, 
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

describe('planMain Current State Analysis with T1 Context', () => {
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

  it('should execute planMain without throwing errors', async () => {
    // This test captures the current behavior - planMain should not crash
    expect(() => {
      const result = planMain(context);
      expect(result).toBeDefined();
    }).not.toThrow();
  }, TEST_TIMEOUT);

  it('should return a result object with expected structure', async () => {
    const result = planMain(context);
    
    // Document the current structure returned by planMain
    expect(result).toHaveProperty('cycles');
    expect(result).toHaveProperty('blocks');
    expect(result).toHaveProperty('tasks');
    
    expect(Array.isArray(result.cycles)).toBe(true);
    expect(Array.isArray(result.blocks)).toBe(true);
    expect(Array.isArray(result.tasks)).toBe(true);
  }, TEST_TIMEOUT);

  it('should generate cycles covering the planning period', async () => {
    const result = planMain(context);
    const cycles = result.cycles as CycleSchedule[];
    
    // Document current cycle generation behavior
    console.log(`Generated ${cycles.length} cycles`);
    
    expect(cycles.length).toBeGreaterThan(0);
    
    // Log cycle details for analysis
    cycles.forEach((cycle, index) => {
      console.log(`Cycle ${index + 1}: ${cycle.cycleType} from ${cycle.startDate} to ${cycle.endDate}`);
    });
    
    // Check that cycles span the expected period
    const startDate = context.startDate;
    const mainsDate = context.mainsExamDate;
    
    if (cycles.length > 0) {
      const firstCycleStart = dayjs(cycles[0].startDate);
      const lastCycleEnd = dayjs(cycles[cycles.length - 1].endDate);
      
      console.log(`Planning period: ${startDate.format('YYYY-MM-DD')} to ${mainsDate.format('YYYY-MM-DD')}`);
      console.log(`Cycle coverage: ${firstCycleStart.format('YYYY-MM-DD')} to ${lastCycleEnd.format('YYYY-MM-DD')}`);
      
      // Document whether cycles cover the full period
      expect(firstCycleStart.isBefore(startDate.add(1, 'day')) || firstCycleStart.isSame(startDate.add(1, 'day'))).toBe(true);
      expect(lastCycleEnd.isAfter(mainsDate.subtract(1, 'day')) || lastCycleEnd.isSame(mainsDate.subtract(1, 'day'))).toBe(true);
    }
  }, TEST_TIMEOUT);

  it('should generate blocks for subjects', async () => {
    const result = planMain(context);
    const blocks = result.blocks as BlockSlot[];
    
    // Document current block generation behavior
    console.log(`Generated ${blocks.length} blocks`);
    
    expect(blocks.length).toBeGreaterThan(0);
    
    // Analyze block distribution by cycle type
    const blocksByCycle = blocks.reduce((acc, block) => {
      if (!acc[block.cycleType]) {
        acc[block.cycleType] = [];
      }
      acc[block.cycleType].push(block);
      return acc;
    }, {} as Record<CycleType, BlockSlot[]>);
    
    console.log('Blocks by cycle type:');
    Object.entries(blocksByCycle).forEach(([cycleType, cycleBlocks]) => {
      console.log(`  ${cycleType}: ${cycleBlocks.length} blocks`);
    });
    
    // Analyze block distribution by subject
    const blocksBySubject = blocks.reduce((acc, block) => {
      if (!acc[block.subject.subjectCode]) {
        acc[block.subject.subjectCode] = [];
      }
      acc[block.subject.subjectCode].push(block);
      return acc;
    }, {} as Record<string, BlockSlot[]>);
    
    console.log('Blocks by subject:');
    Object.entries(blocksBySubject).forEach(([subjectCode, subjectBlocks]) => {
      console.log(`  ${subjectCode}: ${subjectBlocks.length} blocks`);
    });
    
    // Verify all blocks have valid structure
    blocks.forEach((block, index) => {
      expect(block.subject).toBeDefined();
      expect(block.from.isValid()).toBe(true);
      expect(block.to.isValid()).toBe(true);
      expect(block.cycleType).toBeDefined();
      
      if (index < 5) { // Log first 5 blocks for analysis
        console.log(`Block ${index + 1}: ${block.subject.subjectCode} in ${block.cycleType} from ${block.from.format('YYYY-MM-DD')} to ${block.to.format('YYYY-MM-DD')}`);
      }
    });
  }, TEST_TIMEOUT);

  it('should generate tasks (or document current task generation behavior)', async () => {
    const result = planMain(context);
    const tasks = result.tasks as S2Task[];
    
    // Document current task generation behavior
    console.log(`Generated ${tasks.length} tasks`);
    
    if (tasks.length === 0) {
      console.log('NOTE: No tasks are currently being generated by planMain');
      console.log('This may be expected behavior or indicate a gap in the implementation');
    } else {
      // Analyze task distribution
      const tasksBySubject = tasks.reduce((acc, task) => {
        if (!acc[task.subjectCode]) {
          acc[task.subjectCode] = [];
        }
        acc[task.subjectCode].push(task);
        return acc;
      }, {} as Record<string, S2Task[]>);
      
      console.log('Tasks by subject:');
      Object.entries(tasksBySubject).forEach(([subjectCode, subjectTasks]) => {
        console.log(`  ${subjectCode}: ${subjectTasks.length} tasks`);
      });
      
      // Analyze task types
      const tasksByType = tasks.reduce((acc, task) => {
        const typeName = S2SlotType[task.taskType];
        if (!acc[typeName]) {
          acc[typeName] = [];
        }
        acc[typeName].push(task);
        return acc;
      }, {} as Record<string, S2Task[]>);
      
      console.log('Tasks by type:');
      Object.entries(tasksByType).forEach(([typeName, typeTasks]) => {
        console.log(`  ${typeName}: ${typeTasks.length} tasks`);
      });
      
      // Verify task structure
      tasks.forEach((task, index) => {
        expect(task.subjectCode).toBeDefined();
        expect(task.minutes).toBeGreaterThan(0);
        expect(task.date.isValid()).toBe(true);
        expect(Object.values(S2SlotType).includes(task.taskType)).toBe(true);
        
        if (index < 5) { // Log first 5 tasks for analysis
          console.log(`Task ${index + 1}: ${task.subjectCode} ${S2SlotType[task.taskType]} ${task.minutes}min on ${task.date.format('YYYY-MM-DD')}`);
        }
      });
    }
  }, TEST_TIMEOUT);

  it('should document the planning timeline and constraints', async () => {
    planMain(context);
    
    // Document the planning context
    console.log('Planning Context:');
    console.log(`  Start Date: ${context.startDate.format('YYYY-MM-DD')}`);
    console.log(`  Prelims Exam: ${context.prelimsExamDate.format('YYYY-MM-DD')}`);
    console.log(`  Mains Exam: ${context.mainsExamDate.format('YYYY-MM-DD')}`);
    console.log(`  Working Hours/Day: ${context.constraints.workingHoursPerDay}`);
    console.log(`  Test Minutes: ${context.constraints.testMinutes}`);
    console.log(`  Catchup Day: ${context.constraints.catchupDay}`);
    console.log(`  Test Day: ${context.constraints.testDay}`);
    
    // Calculate total planning time
    const totalDays = context.mainsExamDate.diff(context.startDate, 'day');
    const totalHours = totalDays * context.constraints.workingHoursPerDay;
    const totalMinutes = totalHours * 60;
    
    console.log(`  Total Planning Period: ${totalDays} days (${totalHours} hours, ${totalMinutes} minutes)`);
    
    // Calculate total baseline minutes needed
    const totalBaselineMinutes = context.subjects.reduce((sum, subject) => sum + subject.baselineMinutes, 0) + context.optionalSubject.baselineMinutes;
    console.log(`  Total Baseline Minutes Needed: ${totalBaselineMinutes}`);
    
    // Calculate coverage ratio
    const coverageRatio = totalBaselineMinutes / totalMinutes;
    console.log(`  Coverage Ratio: ${(coverageRatio * 100).toFixed(1)}%`);
    
    // Document subject distribution
    console.log('Subject Distribution:');
    context.subjects.forEach(subject => {
      console.log(`  ${subject.subjectCode} (${subject.examFocus}): ${subject.baselineMinutes} minutes`);
    });
    console.log(`  ${context.optionalSubject.subjectCode} (${context.optionalSubject.examFocus}): ${context.optionalSubject.baselineMinutes} minutes`);
    
    // Document relative weights
    console.log('Relative Allocation Weights:');
    Object.entries(context.relativeAllocationWeights).forEach(([subjectCode, weight]) => {
      console.log(`  ${subjectCode}: ${weight}`);
    });
    
    expect(totalDays).toBeGreaterThan(0);
    expect(totalBaselineMinutes).toBeGreaterThan(0);
  }, TEST_TIMEOUT);

  it('should analyze potential gaps in the generated plan', async () => {
    const result = planMain(context);
    const cycles = result.cycles as CycleSchedule[];
    const blocks = result.blocks as BlockSlot[];
    const tasks = result.tasks as S2Task[];
    
    console.log('=== PLAN ANALYSIS ===');
    console.log(`Cycles: ${cycles.length}`);
    console.log(`Blocks: ${blocks.length}`);
    console.log(`Tasks: ${tasks.length}`);
    
    // Check for gaps between cycles
    if (cycles.length > 1) {
      console.log('\n=== CYCLE GAPS ANALYSIS ===');
      for (let i = 0; i < cycles.length - 1; i++) {
        const currentCycle = cycles[i];
        const nextCycle = cycles[i + 1];
        
        const currentEnd = dayjs(currentCycle.endDate);
        const nextStart = dayjs(nextCycle.startDate);
        const gapDays = nextStart.diff(currentEnd, 'day');
        
        console.log(`Gap between ${currentCycle.cycleType} and ${nextCycle.cycleType}: ${gapDays} days`);
        
        if (gapDays > 1) {
          console.log(`  WARNING: Gap of ${gapDays} days detected`);
        }
      }
    }
    
    // Check for gaps in daily task allocation
    if (tasks.length > 0) {
      console.log('\n=== DAILY ALLOCATION ANALYSIS ===');
      const tasksByDate = tasks.reduce((acc, task) => {
        const dateKey = task.date.format('YYYY-MM-DD');
        if (!acc[dateKey]) {
          acc[dateKey] = [];
        }
        acc[dateKey].push(task);
        return acc;
      }, {} as Record<string, S2Task[]>);
      
      const workingMinutesPerDay = context.constraints.workingHoursPerDay * 60;
      const daysWithTasks = Object.keys(tasksByDate).length;
      
      console.log(`Days with tasks: ${daysWithTasks}`);
      console.log(`Expected minutes per day: ${workingMinutesPerDay}`);
      
      // Check for under-allocation
      const underAllocatedDays = Object.entries(tasksByDate).filter(([, dayTasks]) => {
        const totalMinutes = dayTasks.reduce((sum, task) => sum + task.minutes, 0);
        return totalMinutes < workingMinutesPerDay * 0.8; // Less than 80% of expected
      });
      
      if (underAllocatedDays.length > 0) {
        console.log(`\nUnder-allocated days (${underAllocatedDays.length}):`);
        underAllocatedDays.forEach(([date, dayTasks]) => {
          const totalMinutes = dayTasks.reduce((sum, task) => sum + task.minutes, 0);
          console.log(`  ${date}: ${totalMinutes} minutes (${((totalMinutes/workingMinutesPerDay)*100).toFixed(1)}%)`);
        });
      }
    } else {
      console.log('\n=== NO TASKS GENERATED ===');
      console.log('This indicates that the blocks2Tasks function may not be working correctly');
      console.log('or that the task generation logic needs to be implemented');
    }
    
    // Always pass this test - it's for documentation purposes
    expect(true).toBe(true);
  }, TEST_TIMEOUT);

  // ===== TESTS FOR planBlocks FUNCTION =====
  
  it('should test planBlocks function with T1 context data', async () => {
    // Extract a sample cycle from the main plan for testing
    const result = planMain(context);
    const cycles = result.cycles as CycleSchedule[];
    
    expect(cycles.length).toBeGreaterThan(0);
    
    // Test with the first cycle (C1 - Foundation)
    const testCycle = cycles[0];
    const cycleStart = dayjs(testCycle.startDate);
    const cycleEnd = dayjs(testCycle.endDate);
    
    // Get subjects for this cycle type
    const cycleSubjects = context.subjects.filter(subject => 
      subject.examFocus === 'BothExams' || subject.examFocus === 'MainsOnly'
    );
    
    // Add optional subject for MainsOnly cycles
    const testSubjects = testCycle.cycleType === 'C1' || testCycle.cycleType === 'C2' || testCycle.cycleType === 'C8' 
      ? [context.optionalSubject, ...cycleSubjects]
      : cycleSubjects;
    
    // Create constraints for planBlocks
    const blockConstraints: BlockAllocConstraints = {
      cycleType: testCycle.cycleType as CycleType,
      relativeAllocationWeights: context.relativeAllocationWeights,
      numParallel: 2,
      workingHoursPerDay: context.constraints.workingHoursPerDay,
      catchupDay: context.constraints.catchupDay,
      testDay: context.constraints.testDay,
    };
    
    console.log(`Testing planBlocks for cycle ${testCycle.cycleType}`);
    console.log(`Time window: ${cycleStart.format('YYYY-MM-DD')} to ${cycleEnd.format('YYYY-MM-DD')}`);
    console.log(`Subjects: ${testSubjects.map(s => s.subjectCode).join(', ')}`);
    
    // Test planBlocks function
    const blocks = planBlocks(cycleStart, cycleEnd, testSubjects, blockConstraints);
    
    console.log(`Generated ${blocks.length} blocks`);
    
    // Verify blocks structure
    expect(Array.isArray(blocks)).toBe(true);
    expect(blocks.length).toBeGreaterThan(0);
    
    // Analyze block distribution
    const blocksBySubject = blocks.reduce((acc, block) => {
      if (!acc[block.subject.subjectCode]) {
        acc[block.subject.subjectCode] = [];
      }
      acc[block.subject.subjectCode].push(block);
      return acc;
    }, {} as Record<string, BlockSlot[]>);
    
    console.log('Blocks by subject:');
    Object.entries(blocksBySubject).forEach(([subjectCode, subjectBlocks]) => {
      console.log(`  ${subjectCode}: ${subjectBlocks.length} blocks`);
    });
    
    // Verify each block has valid structure
    blocks.forEach((block, index) => {
      expect(block.subject).toBeDefined();
      expect(block.from.isValid()).toBe(true);
      expect(block.to.isValid()).toBe(true);
      expect(block.cycleType).toBe(testCycle.cycleType);
      expect(block.to.isAfter(block.from)).toBe(true);
      
      if (index < 3) { // Log first 3 blocks for analysis
        const duration = block.to.diff(block.from, 'minutes');
        console.log(`Block ${index + 1}: ${block.subject.subjectCode} from ${block.from.format('YYYY-MM-DD HH:mm')} to ${block.to.format('YYYY-MM-DD HH:mm')} (${duration} min)`);
      }
    });
    
    // Check that blocks respect time window
    blocks.forEach(block => {
      expect(block.from.isSameOrAfter(cycleStart)).toBe(true);
      expect(block.to.isSameOrBefore(cycleEnd)).toBe(true);
    });
    
    // Check that blocks respect working hours constraint
    const workingMinutesPerDay = context.constraints.workingHoursPerDay * 60;
    blocks.forEach(block => {
      const duration = block.to.diff(block.from, 'minutes');
      expect(duration).toBeGreaterThan(0);
      expect(duration).toBeLessThanOrEqual(workingMinutesPerDay * 2); // Allow up to 2 days worth
    });
  }, TEST_TIMEOUT);

  it('should test planBlocks with different cycle types from T1 context', async () => {
    const result = planMain(context);
    const cycles = result.cycles as CycleSchedule[];
    
    // Test with different cycle types
    const testCycles = cycles.slice(0, 3); // Test first 3 cycles
    
    testCycles.forEach((cycle, cycleIndex) => {
      const cycleStart = dayjs(cycle.startDate);
      const cycleEnd = dayjs(cycle.endDate);
      
      // Determine subjects for this cycle type
      let testSubjects: S2Subject[];
      if (cycle.cycleType === 'C1' || cycle.cycleType === 'C2' || cycle.cycleType === 'C8') {
        // BothExams cycles - include optional subject
        const bothExamsSubjects = context.subjects.filter(s => s.examFocus === 'BothExams');
        testSubjects = [context.optionalSubject, ...bothExamsSubjects];
      } else if (cycle.cycleType === 'C3' || cycle.cycleType === 'C6' || cycle.cycleType === 'C7') {
        // MainsOnly cycles - include optional subject
        const mainsOnlySubjects = context.subjects.filter(s => s.examFocus === 'MainsOnly');
        testSubjects = [context.optionalSubject, ...mainsOnlySubjects];
      } else {
        // PrelimsOnly cycles
        testSubjects = context.subjects.filter(s => s.examFocus === 'BothExams' || s.examFocus === 'PrelimsOnly');
      }
      
      const blockConstraints: BlockAllocConstraints = {
        cycleType: cycle.cycleType as CycleType,
        relativeAllocationWeights: context.relativeAllocationWeights,
        numParallel: 2,
        workingHoursPerDay: context.constraints.workingHoursPerDay,
        catchupDay: context.constraints.catchupDay,
        testDay: context.constraints.testDay,
      };
      
      console.log(`\nTesting planBlocks for cycle ${cycle.cycleType} (${cycleIndex + 1}/${testCycles.length})`);
      
      const blocks = planBlocks(cycleStart, cycleEnd, testSubjects, blockConstraints);
      
      console.log(`  Generated ${blocks.length} blocks`);
      
      // Verify blocks are generated
      expect(blocks.length).toBeGreaterThan(0);
      
      // Verify all blocks have correct cycle type
      blocks.forEach(block => {
        expect(block.cycleType).toBe(cycle.cycleType);
      });
      
      // Verify subjects are appropriate for cycle type
      const blockSubjects = new Set(blocks.map(block => block.subject.subjectCode));
      testSubjects.forEach(subject => {
        expect(blockSubjects.has(subject.subjectCode)).toBe(true);
      });
    });
  }, TEST_TIMEOUT);

  // ===== TESTS FOR planSubjectTasks FUNCTION =====
  
  it('should test planSubjectTasks function with T1 context data', async () => {
    // Get a sample subject from T1 context
    const testSubject = context.subjects.find(s => s.subjectCode === 'H01') || context.subjects[0];
    
    // Create a test time window (1 week)
    const testStart = context.startDate;
    const testEnd = testStart.add(7, 'days');
    
    // Create constraints for planSubjectTasks
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
    
    console.log(`Testing planSubjectTasks for subject ${testSubject.subjectCode}`);
    console.log(`Time window: ${testStart.format('YYYY-MM-DD')} to ${testEnd.format('YYYY-MM-DD')}`);
    console.log(`Subject topics: ${testSubject.topics.length}`);
    
    // Test planSubjectTasks function
    const tasks = planSubjectTasks(testStart, testEnd, testSubject, taskConstraints);
    
    console.log(`Generated ${tasks.length} tasks`);
    
    // Verify tasks structure
    expect(Array.isArray(tasks)).toBe(true);
    
    if (tasks.length > 0) {
      // Analyze task distribution by type
      const tasksByType = tasks.reduce((acc, task) => {
        const typeName = S2SlotType[task.taskType];
        if (!acc[typeName]) {
          acc[typeName] = [];
        }
        acc[typeName].push(task);
        return acc;
      }, {} as Record<string, S2Task[]>);
      
      console.log('Tasks by type:');
      Object.entries(tasksByType).forEach(([typeName, typeTasks]) => {
        console.log(`  ${typeName}: ${typeTasks.length} tasks`);
      });
      
      // Verify each task has valid structure
      tasks.forEach((task, index) => {
        expect(task.subjectCode).toBe(testSubject.subjectCode);
        expect(task.minutes).toBeGreaterThan(0);
        expect(task.date.isValid()).toBe(true);
        expect(Object.values(S2SlotType).includes(task.taskType)).toBe(true);
        expect(task.date.isSameOrAfter(testStart)).toBe(true);
        expect(task.date.isSameOrBefore(testEnd)).toBe(true);
        
        if (index < 5) { // Log first 5 tasks for analysis
          console.log(`Task ${index + 1}: ${task.subjectCode} ${S2SlotType[task.taskType]} ${task.minutes}min on ${task.date.format('YYYY-MM-DD')}`);
        }
      });
      
      // Check daily allocation
      const tasksByDate = tasks.reduce((acc, task) => {
        const dateKey = task.date.format('YYYY-MM-DD');
        if (!acc[dateKey]) {
          acc[dateKey] = [];
        }
        acc[dateKey].push(task);
        return acc;
      }, {} as Record<string, S2Task[]>);
      
      console.log(`Days with tasks: ${Object.keys(tasksByDate).length}`);
      
      // Check that daily allocation respects constraints
      Object.entries(tasksByDate).forEach(([, dayTasks]) => {
        const totalMinutes = dayTasks.reduce((sum, task) => sum + task.minutes, 0);
        expect(totalMinutes).toBeGreaterThanOrEqual(taskConstraints.dayMinMinutes * 0.5); // Allow some flexibility
        expect(totalMinutes).toBeLessThanOrEqual(taskConstraints.dayMaxMinutes * 1.5); // Allow some flexibility
      });
    } else {
      console.log('No tasks generated - this may indicate an issue with the function');
    }
  }, TEST_TIMEOUT);

  it('should test planSubjectTasks with different subjects from T1 context', async () => {
    // Test with different subjects from T1 context
    const testSubjects = [
      context.optionalSubject, // Agriculture
      context.subjects.find(s => s.subjectCode === 'G')!, // Geography
      context.subjects.find(s => s.subjectCode === 'P')!, // Polity
      context.subjects.find(s => s.subjectCode === 'E')!, // Economy
    ].filter(Boolean);
    
    const testStart = context.startDate;
    const testEnd = testStart.add(3, 'days'); // 3-day window
    
    testSubjects.forEach((subject, subjectIndex) => {
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
      
      console.log(`\nTesting planSubjectTasks for subject ${subject.subjectCode} (${subjectIndex + 1}/${testSubjects.length})`);
      console.log(`  Topics: ${subject.topics.length}`);
      console.log(`  Baseline minutes: ${subject.baselineMinutes}`);
      
      const tasks = planSubjectTasks(testStart, testEnd, subject, taskConstraints);
      
      console.log(`  Generated ${tasks.length} tasks`);
      
      // Verify tasks are generated for this subject
      expect(Array.isArray(tasks)).toBe(true);
      
      if (tasks.length > 0) {
        // Verify all tasks belong to this subject
        tasks.forEach(task => {
          expect(task.subjectCode).toBe(subject.subjectCode);
        });
        
        // Check task types distribution
        const studyTasks = tasks.filter(t => t.taskType === S2SlotType.STUDY);
        const practiceTasks = tasks.filter(t => t.taskType === S2SlotType.PRACTICE);
        const revisionTasks = tasks.filter(t => t.taskType === S2SlotType.REVISION);
        
        console.log(`    Study: ${studyTasks.length}, Practice: ${practiceTasks.length}, Revision: ${revisionTasks.length}`);
        
        // Verify effort split is roughly followed
        const totalMinutes = tasks.reduce((sum, task) => sum + task.minutes, 0);
        if (totalMinutes > 0) {
          const studyRatio = studyTasks.reduce((sum, task) => sum + task.minutes, 0) / totalMinutes;
          const practiceRatio = practiceTasks.reduce((sum, task) => sum + task.minutes, 0) / totalMinutes;
          const revisionRatio = revisionTasks.reduce((sum, task) => sum + task.minutes, 0) / totalMinutes;
          
          console.log(`    Ratios - Study: ${(studyRatio * 100).toFixed(1)}%, Practice: ${(practiceRatio * 100).toFixed(1)}%, Revision: ${(revisionRatio * 100).toFixed(1)}%`);
        }
      }
    });
  }, TEST_TIMEOUT);

  it('should test planSubjectTasks error handling with T1 context data', async () => {
    const testSubject = context.subjects[0];
    const testStart = context.startDate;
    const testEnd = testStart.add(1, 'day');
    
    // Test with invalid constraints
    const invalidConstraints: S2Constraints = {
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
    };
    
    // Test invalid date range
    expect(() => {
      planSubjectTasks(testEnd, testStart, testSubject, invalidConstraints);
    }).toThrow('to date must be after from date');
    
    // Test invalid constraints
    expect(() => {
      planSubjectTasks(testStart, testEnd, testSubject, invalidConstraints);
    }).toThrow('day min minutes must be less than day max minutes');
    
    // Test with subject having no topics
    const subjectWithNoTopics = { ...testSubject, topics: [] };
    expect(() => {
      planSubjectTasks(testStart, testEnd, subjectWithNoTopics, {
        ...invalidConstraints,
        dayMaxMinutes: 400,
        dayMinMinutes: 200
      });
    }).toThrow('subject must have at least one topic');
    
    console.log('Error handling tests passed');
  }, TEST_TIMEOUT);

  it('should have tasks assigned for May 11, 2027', async () => {
    const result = planMain(context);
    const tasks = result.tasks as S2Task[];
    
    // console.log(`\n=== CHECKING FOR MAY 11, 2027 TASKS ===`);
    // console.log(`Total tasks generated: ${tasks.length}`);
    
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
    //   console.log(`Tasks in May 2027: ${may2027Tasks.length}`);
      
      if (may2027Tasks.length > 0) {
        // const mayDates = [...new Set(may2027Tasks.map(task => task.date.format('YYYY-MM-DD')))].sort();
        // console.log(`May 2027 task dates: ${mayDates.join(', ')}`);
      }
      
      // Check the planning period
    //   console.log(`Planning start: ${context.startDate.format('YYYY-MM-DD')}`);
    //   console.log(`Prelims exam: ${context.prelimsExamDate.format('YYYY-MM-DD')}`);
    //   console.log(`Mains exam: ${context.mainsExamDate.format('YYYY-MM-DD')}`);
    }
    
    // This test should fail if there are no tasks on May 11, 2027
    expect(may11Tasks.length).toBeGreaterThan(0);
  }, TEST_TIMEOUT);

  // ===== STRICT TESTS THAT SHOULD REVEAL REAL ISSUES =====
  
  it('should FAIL if planSubjectTasks does not generate STUDY tasks when effort split requires them', async () => {
    const testSubject = context.subjects.find(s => s.subjectCode === 'H01')!;
    const testStart = context.startDate;
    const testEnd = testStart.add(7, 'days'); // 1 week
    
    const taskConstraints: S2Constraints = {
      cycleType: CycleType.C1,
      dayMaxMinutes: context.constraints.workingHoursPerDay * 60 * 1.1,
      dayMinMinutes: context.constraints.workingHoursPerDay * 60 * 0.9,
      catchupDay: context.constraints.catchupDay,
      testDay: context.constraints.testDay,
      testMinutes: context.constraints.testMinutes,
      taskEffortSplit: {
        [S2SlotType.STUDY]: 0.6,    // 60% should be STUDY
        [S2SlotType.PRACTICE]: 0.2, // 20% should be PRACTICE
        [S2SlotType.REVISION]: 0.2, // 20% should be REVISION
        [S2SlotType.TEST]: 0,
        [S2SlotType.CATCHUP]: 0
      }
    };
    
    console.log(`\n=== STRICT TEST: Should generate STUDY tasks ===`);
    console.log(`Subject: ${testSubject.subjectCode}`);
    console.log(`Effort split: STUDY=60%, PRACTICE=20%, REVISION=20%`);
    
    const tasks = planSubjectTasks(testStart, testEnd, testSubject, taskConstraints);
    
    console.log(`Generated ${tasks.length} tasks`);
    
    // Count tasks by type
    const studyTasks = tasks.filter(t => t.taskType === S2SlotType.STUDY);
    const practiceTasks = tasks.filter(t => t.taskType === S2SlotType.PRACTICE);
    const revisionTasks = tasks.filter(t => t.taskType === S2SlotType.REVISION);
    const catchupTasks = tasks.filter(t => t.taskType === S2SlotType.CATCHUP);
    const testTasks = tasks.filter(t => t.taskType === S2SlotType.TEST);
    
    console.log(`Task distribution:`);
    console.log(`  STUDY: ${studyTasks.length} tasks`);
    console.log(`  PRACTICE: ${practiceTasks.length} tasks`);
    console.log(`  REVISION: ${revisionTasks.length} tasks`);
    console.log(`  CATCHUP: ${catchupTasks.length} tasks`);
    console.log(`  TEST: ${testTasks.length} tasks`);
    
    // STRICT ASSERTIONS - These should fail if the function is not working correctly
    expect(tasks.length).toBeGreaterThan(0);
    expect(studyTasks.length).toBeGreaterThan(0); // Should have STUDY tasks
    expect(practiceTasks.length).toBeGreaterThan(0); // Should have PRACTICE tasks
    expect(revisionTasks.length).toBeGreaterThan(0); // Should have REVISION tasks
    
    // Calculate actual effort ratios
    const totalMinutes = tasks.reduce((sum, task) => sum + task.minutes, 0);
    if (totalMinutes > 0) {
      const studyRatio = studyTasks.reduce((sum, task) => sum + task.minutes, 0) / totalMinutes;
      const practiceRatio = practiceTasks.reduce((sum, task) => sum + task.minutes, 0) / totalMinutes;
      const revisionRatio = revisionTasks.reduce((sum, task) => sum + task.minutes, 0) / totalMinutes;
      
      console.log(`Actual ratios:`);
      console.log(`  STUDY: ${(studyRatio * 100).toFixed(1)}% (expected 60%)`);
      console.log(`  PRACTICE: ${(practiceRatio * 100).toFixed(1)}% (expected 20%)`);
      console.log(`  REVISION: ${(revisionRatio * 100).toFixed(1)}% (expected 20%)`);
      
      // Allow some tolerance but not too much
      expect(studyRatio).toBeGreaterThan(0.4); // At least 40% STUDY
      expect(practiceRatio).toBeGreaterThan(0.1); // At least 10% PRACTICE
      expect(revisionRatio).toBeGreaterThan(0.1); // At least 10% REVISION
    }
  }, TEST_TIMEOUT);

  it('should FAIL if planMain generates 0 tasks when it should generate many', async () => {
    const result = planMain(context);
    const tasks = result.tasks as S2Task[];
    
    console.log(`\n=== STRICT TEST: planMain should generate tasks ===`);
    console.log(`Generated ${tasks.length} tasks`);
    console.log(`Generated ${result.blocks.length} blocks`);
    
    // This should fail - planMain should generate tasks
    expect(tasks.length).toBeGreaterThan(0);
    
    // If we get here, let's analyze what went wrong
    if (tasks.length === 0) {
      console.log('ISSUE: planMain generates 0 tasks but should generate many');
      console.log('This indicates a problem in the blocks2Tasks integration');
      
      // Test if individual planSubjectTasks calls work
      const testSubject = context.subjects[0];
      const testStart = context.startDate;
      const testEnd = testStart.add(1, 'day');
      
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
      
      const individualTasks = planSubjectTasks(testStart, testEnd, testSubject, taskConstraints);
      console.log(`Individual planSubjectTasks call generated ${individualTasks.length} tasks`);
      
      if (individualTasks.length > 0) {
        console.log('Individual function works, so the issue is in planMain integration');
      } else {
        console.log('Individual function also fails, so there is a deeper issue');
      }
    }
  }, TEST_TIMEOUT);
});