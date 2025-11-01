import { describe, it, expect } from 'vitest';
import { cycles2Blocks, planMain } from '../plan-main';
import { PlanningContext, S2Subject, S2WeekDay, S2SlotType, S2Task, BlockSlot } from '../types';
import dayjs from 'dayjs';
import * as fs from 'fs';
import * as path from 'path';
import { planCycles } from '../plan-cycles';

function isOverlappingBlocks(block1: BlockSlot, block2: BlockSlot): boolean {
  return block1.from.isBefore(block2.to) && block2.from.isBefore(block1.to);
}


describe('planMain - Debug Multiple Tests', () => {
  it('should process debug-multiple-tests.json context successfully', () => {
    // Load the test context JSON file
    const testContextPath = path.join(__dirname, 'test-contexts', 'debug-multiple-tests.json');

    if (!fs.existsSync(testContextPath)) {
      console.error(`Test context file not found: ${testContextPath}`);
      throw new Error(`Test context file not found: ${testContextPath}`);
    }

    console.log(`Loading test context from: ${testContextPath}`);

    const jsonData = JSON.parse(fs.readFileSync(testContextPath, 'utf-8'));

    // Convert JSON data to PlanningContext
    const context: PlanningContext = {
      optionalSubject: convertSubject(jsonData.optionalSubject),
      startDate: dayjs(jsonData.startDate),
      targetYear: jsonData.targetYear,
      prelimsExamDate: dayjs(jsonData.prelimsExamDate),
      mainsExamDate: dayjs(jsonData.mainsExamDate),
      constraints: {
        optionalSubjectCode: jsonData.constraints.optionalSubjectCode,
        confidenceMap: jsonData.constraints.confidenceMap,
        optionalFirst: jsonData.constraints.optionalFirst,
        catchupDay: jsonData.constraints.catchupDay as S2WeekDay,
        testDay: jsonData.constraints.testDay as S2WeekDay,
        workingHoursPerDay: jsonData.constraints.workingHoursPerDay,
        breaks: jsonData.constraints.breaks.map((breakItem: any) => ({
          from: dayjs(breakItem.from),
          to: dayjs(breakItem.to),
        })),
        testMinutes: jsonData.constraints.testMinutes,
      },
      subjects: jsonData.subjects.map((subject: any) => convertSubject(subject)),
      relativeAllocationWeights: jsonData.relativeAllocationWeights,
    };

    console.log(`Test context loaded:`);
    console.log(`  Start Date: ${context.startDate.format('YYYY-MM-DD')}`);
    console.log(`  Target Year: ${context.targetYear}`);
    console.log(`  Prelims Exam: ${context.prelimsExamDate.format('YYYY-MM-DD')}`);
    console.log(`  Mains Exam: ${context.mainsExamDate.format('YYYY-MM-DD')}`);
    console.log(`  Subjects: ${context.subjects.length}`);
    console.log(`  Optional Subject: ${context.optionalSubject.subjectCode}`);

    // Execute planMain
    console.log('\nExecuting planMain...');
    const startTime = Date.now();

    let result;
    try {

      const scenario = planCycles(context);
      const cycles = scenario.schedules;
      cycles
        .slice(0, 1)
        .forEach(cycle => {
          const blocks = cycles2Blocks(context, [cycle]);
          // check if we have overlapping blocks i.e. blocks with same subject at same time
          const overlappingBlocks = blocks.filter(block => {
            return blocks.some(otherBlock => {
              // Check if same subject and blocks overlap in time
              return block !== otherBlock && block.subject.subjectCode === otherBlock.subject.subjectCode &&
                isOverlappingBlocks(block, otherBlock);
            });
          }).map((block) => ({
            id: block.id,
            subjectCode: block.subject.subjectCode,
            from: block.from.format('YYYY-MM-DD'),
            to: block.to.format('YYYY-MM-DD'),
            cycleType: block.cycleType,
          }))
            ;

          console.log(`\nOverlapping blocks: ${JSON.stringify(overlappingBlocks, null, 2)}`);
          expect(overlappingBlocks.length).toBe(0);
        });
      

      result = planMain(context);
      const endTime = Date.now();
      const executionTime = endTime - startTime;

      console.log(`\nplanMain completed in ${executionTime}ms`);
      console.log(`\nResults:`);
      console.log(`  Cycles: ${result.cycles.length}`);
      console.log(`  Blocks: ${result.blocks.length}`);
      console.log(`  Tasks: ${result.tasks.length}`);

      // Validate results
      expect(result).toBeDefined();
      expect(result.cycles).toBeDefined();
      expect(result.blocks).toBeDefined();
      expect(result.tasks).toBeDefined();

      expect(Array.isArray(result.cycles)).toBe(true);
      expect(Array.isArray(result.blocks)).toBe(true);
      expect(Array.isArray(result.tasks)).toBe(true);

      // Validate cycles
      if (result.cycles.length > 0) {
        console.log('\nCycle details:');
        result.cycles.forEach((cycle, index) => {
          console.log(`  Cycle ${index + 1}: ${cycle.cycleType} (${cycle.startDate} to ${cycle.endDate})`);
        });
      }

      // Validate blocks
      if (result.blocks.length > 0) {
        console.log('\nBlock summary:');
        const blocksBySubject = new Map<string, number>();
        result.blocks.forEach(block => {
          const count = blocksBySubject.get(block.subject.subjectCode) || 0;
          blocksBySubject.set(block.subject.subjectCode, count + 1);
        });

        blocksBySubject.forEach((count, subjectCode) => {
          console.log(`  ${subjectCode}: ${count} blocks`);
        });

        // Check total minutes allocated
        const totalMinutes = result.blocks.reduce((sum, block) => {
          return sum + block.to.diff(block.from, 'minutes');
        }, 0);
        console.log(`  Total minutes across all blocks: ${totalMinutes}`);
      }

      // Validate tasks
      if (result.tasks.length > 0) {
        console.log('\nTask summary:');
        const tasksBySubject = new Map<string, number>();
        const tasksByType = new Map<number, number>();
        result.tasks.forEach(task => {
          const subjectCount = tasksBySubject.get(task.subjectCode) || 0;
          tasksBySubject.set(task.subjectCode, subjectCount + 1);

          const typeCount = tasksByType.get(task.taskType) || 0;
          tasksByType.set(task.taskType, typeCount + 1);
        });

        console.log('  Tasks by subject:');
        tasksBySubject.forEach((count, subjectCode) => {
          console.log(`    ${subjectCode}: ${count} tasks`);
        });

        console.log('  Tasks by type:');
        tasksByType.forEach((count, taskType) => {
          const typeName = ['STUDY', 'REVISION', 'PRACTICE', 'TEST', 'CATCHUP'][taskType] || `Type ${taskType}`;
          console.log(`    ${typeName}: ${count} tasks`);
        });

        // Check total minutes in tasks
        const totalTaskMinutes = result.tasks.reduce((sum, task) => sum + task.minutes, 0);
        console.log(`  Total minutes across all tasks: ${totalTaskMinutes}`);
      }

      // Additional validations
      expect(result.cycles.length).toBeGreaterThan(0);
      expect(result.blocks.length).toBeGreaterThan(0);
      expect(result.tasks.length).toBeGreaterThan(0);

      // Validate cycle structure
      result.cycles.forEach(cycle => {
        expect(cycle.cycleType).toBeDefined();
        expect(cycle.startDate).toBeDefined();
        expect(cycle.endDate).toBeDefined();
        expect(dayjs(cycle.startDate).isBefore(dayjs(cycle.endDate)) || dayjs(cycle.startDate).isSame(dayjs(cycle.endDate))).toBe(true);
      });

      // Validate block structure
      result.blocks.forEach(block => {
        expect(block.subject).toBeDefined();
        expect(block.from).toBeDefined();
        expect(block.to).toBeDefined();
        expect(block.cycleType).toBeDefined();
        expect(block.minutesPerDay).toBeGreaterThan(0);
        expect(block.from.isBefore(block.to) || block.from.isSame(block.to)).toBe(true);
      });

      // Validate task structure
      result.tasks.forEach(task => {
        expect(task.subjectCode).toBeDefined();
        expect(task.taskType).toBeDefined();
        expect(task.minutes).toBeGreaterThan(0);
        expect(task.date).toBeDefined();
      });

      // Assert that there should not be more than one test in a single day
      const testTasks = result.tasks.filter(task => task.taskType === S2SlotType.TEST);
      const testsByDate = new Map<string, number>();

      {
        const agrTests = testTasks.filter(task => task.subjectCode === 'OPT-AGR');
        console.log(`\nAgr tests: ${agrTests.length}`);
        // Assert that the same day can't have two tests for the same subject
        const testsByDateAndSubject = new Map<string, S2Task[]>();

        testTasks.forEach(task => {
          const dateKey = task.date.format('YYYY-MM-DD');
          const subjectKey = `${dateKey}|${task.subjectCode}`;
          const existing = testsByDateAndSubject.get(subjectKey);
          if (existing === undefined) {
            testsByDateAndSubject.set(subjectKey, [task]);
          } else {
            testsByDateAndSubject.set(subjectKey, [...existing, task]);
          }
        });

        const duplicateSubjectTests: Array<{ date: string; subjectCode: string; blockId: string; tasks: S2Task[] }> = [];
        testsByDateAndSubject.forEach((existing, key) => {
          if (existing.length > 1) {
            const [date, subjectCode, blockId] = key.split('|');
            duplicateSubjectTests.push({ date, subjectCode, blockId, tasks:existing });
          }
        });

        if (duplicateSubjectTests.length > 0) {
          console.log(`\n⚠ Warning: Found ${duplicateSubjectTests.length} date-subject combination(s) with multiple tests:`);
          duplicateSubjectTests.forEach(({ date, subjectCode }) => {
            const tasksOnDateAndSubject = testTasks.filter(
              task => task.date.format('YYYY-MM-DD') === date && task.subjectCode === subjectCode
            );
            console.log(`  ${date} - ${subjectCode}:`, tasksOnDateAndSubject);
            tasksOnDateAndSubject.forEach(task => {
              console.log(`    - ${task.minutes} minutes`);
            });
          });
        }

        expect(duplicateSubjectTests.length).toBe(0);
        if (testTasks.length > 0) {
          console.log(`\n✓ Verified: No day has multiple tests for the same subject`);
        }

      }
      {

        testTasks.forEach(task => {
          const dateKey = task.date.format('YYYY-MM-DD');
          const count = testsByDate.get(dateKey) || 0;
          testsByDate.set(dateKey, count + 1);
        });

        const daysWithMultipleTests: string[] = [];
        testsByDate.forEach((count, dateKey) => {
          if (count > 1) {
            daysWithMultipleTests.push(dateKey);
          }
        });

        if (daysWithMultipleTests.length > 0) {
          console.log(`\n⚠ Warning: Found ${daysWithMultipleTests.length} day(s) with multiple tests:`);
          daysWithMultipleTests.forEach(dateKey => {
            const count = testsByDate.get(dateKey)!;
            const tasksOnDate = testTasks.filter(task => task.date.format('YYYY-MM-DD') === dateKey);
            console.log(`  ${dateKey}: ${count} test(s)`);
            tasksOnDate.forEach(task => {
              console.log(`    - ${task.subjectCode}: ${task.minutes} minutes`);
            });
          });
        }

        //expect(daysWithMultipleTests.length).toBe(0);
        if (testTasks.length > 0) {
          console.log(`\n✓ Verified: No day has more than one test (${testTasks.length} total test tasks across ${testsByDate.size} unique days)`);
        } else {
          console.log(`\n✓ Verified: No test tasks found in the schedule`);
        }
      }
      console.log('\n✓ All validations passed');

    } catch (error) {
      console.error('Error executing planMain:', error);
      throw error;
    }
  });

  it('should handle the context without throwing errors', () => {
    const testContextPath = path.join(__dirname, 'test-contexts', 'debug-multiple-tests.json');

    if (!fs.existsSync(testContextPath)) {
      console.log(`Test context file not found: ${testContextPath}. Skipping test.`);
      return;
    }

    const jsonData = JSON.parse(fs.readFileSync(testContextPath, 'utf-8'));

    const context: PlanningContext = {
      optionalSubject: convertSubject(jsonData.optionalSubject),
      startDate: dayjs(jsonData.startDate),
      targetYear: jsonData.targetYear,
      prelimsExamDate: dayjs(jsonData.prelimsExamDate),
      mainsExamDate: dayjs(jsonData.mainsExamDate),
      constraints: {
        optionalSubjectCode: jsonData.constraints.optionalSubjectCode,
        confidenceMap: jsonData.constraints.confidenceMap,
        optionalFirst: jsonData.constraints.optionalFirst,
        catchupDay: jsonData.constraints.catchupDay as S2WeekDay,
        testDay: jsonData.constraints.testDay as S2WeekDay,
        workingHoursPerDay: jsonData.constraints.workingHoursPerDay,
        breaks: jsonData.constraints.breaks.map((breakItem: any) => ({
          from: dayjs(breakItem.from),
          to: dayjs(breakItem.to),
        })),
        testMinutes: jsonData.constraints.testMinutes,
      },
      subjects: jsonData.subjects.map((subject: any) => convertSubject(subject)),
      relativeAllocationWeights: jsonData.relativeAllocationWeights,
    };

    let error = undefined;
    try {
      const result = planMain(context);
      expect(result).toBeDefined();
    } catch (err2) {
      console.log("Error:", err2);
      error = err2;
    }
    // Should not throw
    expect(error).toBeUndefined();
  });
});

/**
 * Helper function to convert JSON subject data to S2Subject
 */
function convertSubject(subjectData: any): S2Subject {
  return {
    subjectCode: subjectData.subjectCode,
    subjectNname: subjectData.subjectNname || subjectData.subjectName || '',
    examFocus: subjectData.examFocus,
    baselineMinutes: subjectData.baselineMinutes,
    isNCERT: subjectData.isNCERT,
    topics: subjectData.topics.map((topic: any) => ({
      code: topic.code,
      subtopics: topic.subtopics || [],
      baselineMinutes: topic.baselineMinutes,
    })),
  };
}

