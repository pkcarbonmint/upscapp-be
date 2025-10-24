#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const debugDir = path.join(__dirname, 'debug');

function listDebugFiles() {
  if (!fs.existsSync(debugDir)) {
    console.log('No debug directory found.');
    return;
  }

  const files = fs.readdirSync(debugDir);
  const planBlocksFiles = files.filter(file => file.startsWith('planBlocks_debug_') && file.endsWith('.json'));
  
  console.log(`Found ${planBlocksFiles.length} planBlocks debug files:`);
  planBlocksFiles.forEach((file, index) => {
    const filePath = path.join(debugDir, file);
    const stats = fs.statSync(filePath);
    console.log(`${index + 1}. ${file} (${stats.size} bytes, ${stats.mtime.toISOString()})`);
  });
}

function showDebugSummary(filename) {
  const filePath = path.join(debugDir, filename);
  
  if (!fs.existsSync(filePath)) {
    console.log(`File ${filename} not found.`);
    return;
  }

  try {
    const debugData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    console.log(`\n=== Debug Summary: ${filename} ===`);
    console.log(`Timestamp: ${debugData.timestamp}`);
    console.log(`Error: ${debugData.errorMessage}`);
    
    if (debugData.timeWindowFrom && debugData.timeWindowTo) {
      console.log(`Time Window: ${debugData.timeWindowFrom} to ${debugData.timeWindowTo}`);
    }
    
    if (debugData.subjects) {
      console.log(`Subjects: ${debugData.subjects.length}`);
      debugData.subjects.forEach((subject, index) => {
        console.log(`  ${index + 1}. ${subject.subjectCode} (${subject.baselineMinutes} minutes)`);
      });
    }
    
    if (debugData.constraints) {
      console.log(`Constraints:`);
      console.log(`  Day Max Minutes: ${debugData.constraints.dayMaxMinutes}`);
      console.log(`  Day Min Minutes: ${debugData.constraints.dayMinMinutes}`);
      console.log(`  Catchup Day: ${debugData.constraints.catchupDay}`);
      console.log(`  Test Day: ${debugData.constraints.testDay}`);
      console.log(`  Num Parallel: ${debugData.constraints.numParallel}`);
    }
    
    if (debugData.generatedBlocks) {
      console.log(`Generated Blocks: ${debugData.generatedBlocks.length}`);
    }
    
    if (debugData.problematicDay) {
      console.log(`Problematic Day: ${debugData.problematicDay.date} (${debugData.problematicDay.dayOfWeek})`);
      console.log(`  Is Catchup Day: ${debugData.problematicDay.isCatchupDay}`);
      console.log(`  Is Test Day: ${debugData.problematicDay.isTestDay}`);
      console.log(`  Blocks on Day: ${debugData.problematicDay.blocksOnDay}`);
      console.log(`  Total Minutes: ${debugData.problematicDay.totalMinutes}`);
    }
    
  } catch (error) {
    console.error(`Error reading ${filename}:`, error.message);
  }
}

function runTest() {
  console.log('Running planBlocks debug test...');
  const { execSync } = require('child_process');
  
  try {
    const output = execSync('npm test -- plan-blocks.test.ts', { 
      encoding: 'utf8',
      cwd: __dirname 
    });
    console.log(output);
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

// Main execution
const command = process.argv[2];
const filename = process.argv[3];

switch (command) {
  case 'list':
    listDebugFiles();
    break;
  case 'show':
    if (!filename) {
      console.log('Usage: node debug-helper.js show <filename>');
      return;
    }
    showDebugSummary(filename);
    break;
  case 'test':
    runTest();
    break;
  default:
    console.log('Usage:');
    console.log('  node debug-helper.js list                    - List all debug files');
    console.log('  node debug-helper.js show <filename>         - Show debug file summary');
    console.log('  node debug-helper.js test                    - Run the debug test');
    break;
}
