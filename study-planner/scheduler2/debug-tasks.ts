import dayjs from 'dayjs';
import { planSubjectTasks } from './src/index';
import * as fs from 'fs';
import * as path from 'path';

// Load real debug data from existing debug files
const debugDir = path.join(__dirname, 'debug');
const debugFiles = fs.readdirSync(debugDir)
  .filter(file => file.startsWith('createTasks_v2_debug_') && file.endsWith('.json'))
  .sort();

if (debugFiles.length === 0) {
  console.error('No createTasks debug files found. Please run the actual tests to generate debug data.');
  process.exit(1);
}

const latestDebugFile = debugFiles[debugFiles.length - 1];
const debugFilePath = path.join(debugDir, latestDebugFile);
console.log(`Using debug data from: ${latestDebugFile}`);

const debugData = JSON.parse(fs.readFileSync(debugFilePath, 'utf8'));

// Extract real test data from debug file
const testSubject = debugData.inputs.subject;
const testStart = dayjs(debugData.inputs.from);
const testEnd = dayjs(debugData.inputs.to);
const constraints = debugData.inputs.constraints;

console.log('Testing planSubjectTasks with real debug data...');
console.log('Subject:', testSubject.subjectCode);
console.log('Time window:', testStart.format('YYYY-MM-DD'), 'to', testEnd.format('YYYY-MM-DD'));
console.log('Original error:', debugData.errorMessage);
console.log('Constraints:', constraints);

try {
  const tasks = planSubjectTasks(testStart, testEnd, testSubject, constraints);
  console.log('Generated tasks:', tasks.length);
  console.log('Tasks:', tasks);
} catch (error) {
  console.error('Error:', error instanceof Error ? error.message : String(error));
  console.error('Stack:', error instanceof Error ? error.stack : '');
}