import dayjs from 'dayjs';
import { planSubjectTasks } from './src/index';

// Simple test data
const testSubject = {
  subjectCode: 'TEST',
  subjectNname: 'Test Subject',
  examFocus: 'BothExams' as const,
  baselineMinutes: 1000,
  topics: [
    {
      code: 'T1',
      subtopics: [
        { code: 'ST1', name: 'Test Subtopic 1', priorityLevel: 1, isEssential: true, baselineMinutes: 60 }
      ]
    }
  ]
};

const testStart = dayjs('2024-01-01');
const testEnd = testStart.add(7, 'days');

const constraints = {
  cycleType: 0, // C1
  dayMaxMinutes: 480,
  dayMinMinutes: 240,
  catchupDay: 0, // Sunday
  testDay: 6,    // Saturday
  testMinutes: 120,
  taskEffortSplit: {
    0: 0.6,  // STUDY
    1: 0.2,  // PRACTICE
    2: 0.2,  // REVISION
    3: 0,    // TEST
    4: 0     // CATCHUP
  }
};

console.log('Testing planSubjectTasks...');
console.log('Subject:', testSubject.subjectCode);
console.log('Time window:', testStart.format('YYYY-MM-DD'), 'to', testEnd.format('YYYY-MM-DD'));
console.log('Constraints:', constraints);

try {
  const tasks = planSubjectTasks(testStart, testEnd, testSubject, constraints);
  console.log('Generated tasks:', tasks.length);
  console.log('Tasks:', tasks);
} catch (error) {
  console.error('Error:', error instanceof Error ? error.message : String(error));
  console.error('Stack:', error instanceof Error ? error.stack : '');
}