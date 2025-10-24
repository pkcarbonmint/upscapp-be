import dayjs from 'dayjs';
import { planBlocks, planSubjectTasks } from './src/index';
import * as fs from 'fs';
import * as path from 'path';

// Load real debug data from existing debug files
const debugDir = path.join(__dirname, 'debug');
const debugFiles = fs.readdirSync(debugDir)
  .filter(file => file.startsWith('planBlocks_debug_') && file.endsWith('.json'))
  .sort();

if (debugFiles.length === 0) {
  console.error('No planBlocks debug files found. Please run the actual tests to generate debug data.');
  process.exit(1);
}

const latestDebugFile = debugFiles[debugFiles.length - 1];
const debugFilePath = path.join(debugDir, latestDebugFile);
console.log(`Using debug data from: ${latestDebugFile}`);

const debugData = JSON.parse(fs.readFileSync(debugFilePath, 'utf8'));

// Test planBlocks function directly with the debug data
console.log('Testing planBlocks...');
const { timeWindowFrom, timeWindowTo, subjects, constraints } = debugData;

const from = dayjs(timeWindowFrom);
const to = dayjs(timeWindowTo);

console.log(`Time window: ${from.format('YYYY-MM-DD')} to ${to.format('YYYY-MM-DD')}`);
console.log(`Subjects: ${subjects.length}`);
console.log(`Constraints:`, constraints);

try {
  const blocks = planBlocks(from, to, subjects, constraints);
  console.log(`Generated ${blocks.length} blocks`);
  
  if (blocks.length > 0) {
    console.log('\nFirst few blocks:');
    blocks.slice(0, 3).forEach((block, index) => {
      console.log(`${index + 1}. ${block.subject.subjectCode}: ${block.from.format('YYYY-MM-DD')} to ${block.to.format('YYYY-MM-DD')} (${block.to.diff(block.from, 'minutes')} minutes)`);
    });
  }
} catch (error) {
  console.error('Error in planBlocks:', error instanceof Error ? error.message : String(error));
}

// Now test planSubjectTasks with real subject data from debug file
console.log('\nTesting planSubjectTasks with debug subject data...');

// Look for createTasks debug data
const createTasksFiles = fs.readdirSync(debugDir)
  .filter(file => file.startsWith('createTasks_v2_debug_') && file.endsWith('.json'))
  .sort();

if (createTasksFiles.length > 0) {
  const createTasksFile = createTasksFiles[createTasksFiles.length - 1];
  const createTasksPath = path.join(debugDir, createTasksFile);
  console.log(`Using createTasks debug data from: ${createTasksFile}`);
  
  const createTasksData = JSON.parse(fs.readFileSync(createTasksPath, 'utf8'));
  
  const subject = createTasksData.inputs.subject;
  const taskConstraints = createTasksData.inputs.constraints;
  const taskFrom = dayjs(createTasksData.inputs.from);
  const taskTo = dayjs(createTasksData.inputs.to);
  
  console.log(`Subject: ${subject.subjectCode}`);
  console.log(`Time window: ${taskFrom.format('YYYY-MM-DD')} to ${taskTo.format('YYYY-MM-DD')}`);
  console.log(`Original error: ${createTasksData.errorMessage}`);
  
  try {
    const tasks = planSubjectTasks(taskFrom, taskTo, subject, taskConstraints);
    console.log(`Generated ${tasks.length} tasks`);
    if (tasks.length > 0) {
      console.log('First task:', {
        topicCode: tasks[0].topicCode,
        subjectCode: tasks[0].subjectCode,
        taskType: tasks[0].taskType,
        minutes: tasks[0].minutes,
        date: tasks[0].date.format('YYYY-MM-DD')
      });
    }
  } catch (error) {
    console.error('Error in planSubjectTasks:', error instanceof Error ? error.message : String(error));
  }
} else {
  console.log('No createTasks debug files found for planSubjectTasks test');
}