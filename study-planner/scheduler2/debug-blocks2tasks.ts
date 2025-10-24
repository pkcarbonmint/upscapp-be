import dayjs from 'dayjs';
import { planMain, planBlocks, planSubjectTasks } from './src/index';

// Load T1 context data
const t1ContextData = require('./src/tests/t1-context.json');

// Convert JSON data to PlanningContext
const context = {
  optionalSubject: {
    subjectCode: t1ContextData.optionalSubject.subjectCode,
    subjectNname: t1ContextData.optionalSubject.subjectNname,
    examFocus: t1ContextData.optionalSubject.examFocus,
    baselineMinutes: t1ContextData.optionalSubject.baselineMinutes,
    topics: t1ContextData.optionalSubject.topics.map((topic: any) => ({
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
    catchupDay: t1ContextData.constraints.catchupDay,
    testDay: t1ContextData.constraints.testDay,
    workingHoursPerDay: t1ContextData.constraints.workingHoursPerDay,
    breaks: t1ContextData.constraints.breaks || [],
    testMinutes: t1ContextData.constraints.testMinutes
  },
  subjects: t1ContextData.subjects.map((subject: any) => ({
    subjectCode: subject.subjectCode,
    subjectNname: subject.subjectNname,
    examFocus: subject.examFocus,
    baselineMinutes: subject.baselineMinutes,
    topics: subject.topics.map((topic: any) => ({
      code: topic.code,
      subtopics: topic.subtopics || []
    }))
  })),
  relativeAllocationWeights: t1ContextData.relativeAllocationWeights
};

console.log('Testing planMain...');
const result = planMain(context);
console.log('Result:', {
  cycles: result.cycles.length,
  blocks: result.blocks.length,
  tasks: result.tasks.length
});

if (result.blocks.length > 0) {
  console.log('\nTesting blocks2Tasks with first block...');
  const firstBlock = result.blocks[0];
  console.log('First block:', {
    subject: firstBlock.subject.subjectCode,
    cycleType: firstBlock.cycleType,
    from: firstBlock.from.format('YYYY-MM-DD'),
    to: firstBlock.to.format('YYYY-MM-DD')
  });
  
  // Test planSubjectTasks with this block
  const taskConstraints = {
    cycleType: firstBlock.cycleType,
    dayMaxMinutes: context.constraints.workingHoursPerDay * 60 * 1.1,
    dayMinMinutes: context.constraints.workingHoursPerDay * 60 * 0.9,
    catchupDay: context.constraints.catchupDay,
    testDay: context.constraints.testDay,
    testMinutes: context.constraints.testMinutes,
    taskEffortSplit: {
      0: 1.0,  // STUDY
      1: 0,    // PRACTICE
      2: 0,    // REVISION
      3: 0,    // TEST
      4: 0     // CATCHUP
    }
  };
  
  console.log('Task constraints:', taskConstraints);
  
  try {
    const tasks = planSubjectTasks(firstBlock.from, firstBlock.to, firstBlock.subject, taskConstraints);
    console.log('Generated tasks:', tasks.length);
    if (tasks.length > 0) {
      console.log('First task:', tasks[0]);
    }
  } catch (error) {
    console.error('Error in planSubjectTasks:', error instanceof Error ? error.message : String(error));
  }
}