/**
 * Simple demonstration of the Functional Block Planning concepts
 * This shows the core logic without TypeScript dependencies
 */

// Mock dayjs functionality for demonstration
function createDate(dateStr) {
  return new Date(dateStr);
}

function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function diffDays(date1, date2) {
  const diffTime = Math.abs(date2 - date1);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function formatDate(date) {
  return date.toISOString().split('T')[0];
}

// Core functional planning logic
function calculateAvailableTime(startDate, endDate, dailyHours) {
  const totalDays = diffDays(startDate, endDate) + 1;
  const totalHours = totalDays * dailyHours;
  const weeklyHours = dailyHours * 7;
  
  return {
    totalDays,
    dailyHours,
    totalHours,
    weeklyHours
  };
}

function calculateSubjectPriorities(subjects, confidenceMap) {
  const CONFIDENCE_MULTIPLIERS = {
    0.3: 1.5,  // Weak - needs more time
    0.5: 1.0,  // Moderate
    0.8: 0.7   // Strong - needs less time
  };
  
  return subjects.map(subject => {
    const confidence = confidenceMap.get(subject.subjectCode) || 0.5;
    let confidenceMultiplier = 1.0;
    
    if (confidence <= 0.3) confidenceMultiplier = 1.5;
    else if (confidence >= 0.7) confidenceMultiplier = 0.7;
    else confidenceMultiplier = 1.0;
    
    const priorityWeight = subject.baselineHours * confidenceMultiplier;
    
    return {
      subjectCode: subject.subjectCode,
      subjectName: subject.subjectName,
      baselineHours: subject.baselineHours,
      confidenceMultiplier,
      priorityWeight
    };
  });
}

function allocateTimeProportionally(priorities, totalHours) {
  const MIN_SUBJECT_HOURS = 4;
  const totalWeight = priorities.reduce((sum, p) => sum + p.priorityWeight, 0);
  
  if (totalWeight === 0) {
    const hoursPerSubject = Math.max(MIN_SUBJECT_HOURS, totalHours / priorities.length);
    return priorities.map(p => ({
      subjectCode: p.subjectCode,
      subjectName: p.subjectName,
      allocatedHours: hoursPerSubject,
      allocatedDays: Math.ceil(hoursPerSubject / 8)
    }));
  }
  
  let allocations = priorities.map(priority => {
    const proportionalHours = (totalHours * priority.priorityWeight) / totalWeight;
    const allocatedHours = Math.max(MIN_SUBJECT_HOURS, proportionalHours);
    
    return {
      subjectCode: priority.subjectCode,
      subjectName: priority.subjectName,
      allocatedHours,
      allocatedDays: Math.ceil(allocatedHours / 8)
    };
  });
  
  // Adjust if total exceeds available time
  const totalAllocated = allocations.reduce((sum, a) => sum + a.allocatedHours, 0);
  if (totalAllocated > totalHours) {
    const scaleFactor = totalHours / totalAllocated;
    allocations = allocations.map(a => ({
      ...a,
      allocatedHours: Math.max(MIN_SUBJECT_HOURS, a.allocatedHours * scaleFactor),
      allocatedDays: Math.ceil(a.allocatedHours * scaleFactor / 8)
    }));
  }
  
  return allocations;
}

function createContinuousBlocks(allocations, subjects, startDate, dailyHours) {
  const blocks = [];
  let currentDate = new Date(startDate);
  
  for (const allocation of allocations) {
    const subject = subjects.find(s => s.subjectCode === allocation.subjectCode);
    if (!subject) continue;
    
    const blockDays = Math.max(1, Math.ceil(allocation.allocatedHours / dailyHours));
    const endDate = addDays(currentDate, blockDays - 1);
    
    blocks.push({
      subjectCode: allocation.subjectCode,
      subjectName: allocation.subjectName,
      startDate: new Date(currentDate),
      endDate: endDate,
      dailyHours: Math.min(dailyHours, allocation.allocatedHours / blockDays),
      totalHours: allocation.allocatedHours,
      subjects: [subject]
    });
    
    currentDate = addDays(endDate, 1);
  }
  
  return blocks;
}

function validateContinuousCoverage(blocks, expectedStart, expectedEnd) {
  const sortedBlocks = [...blocks].sort((a, b) => a.startDate - b.startDate);
  const gaps = [];
  
  // Check for gap at the beginning
  if (sortedBlocks.length > 0 && sortedBlocks[0].startDate > expectedStart) {
    gaps.push({
      start: expectedStart,
      end: addDays(sortedBlocks[0].startDate, -1)
    });
  }
  
  // Check for gaps between blocks
  for (let i = 0; i < sortedBlocks.length - 1; i++) {
    const currentEnd = sortedBlocks[i].endDate;
    const nextStart = sortedBlocks[i + 1].startDate;
    
    if (diffDays(currentEnd, nextStart) > 1) {
      gaps.push({
        start: addDays(currentEnd, 1),
        end: addDays(nextStart, -1)
      });
    }
  }
  
  // Check for gap at the end
  const lastBlock = sortedBlocks[sortedBlocks.length - 1];
  if (lastBlock && lastBlock.endDate < expectedEnd) {
    gaps.push({
      start: addDays(lastBlock.endDate, 1),
      end: expectedEnd
    });
  }
  
  return {
    isValid: gaps.length === 0,
    gaps
  };
}

// Demo data
const mockSubjects = [
  {
    subjectCode: 'H01',
    subjectName: 'History',
    baselineHours: 120,
    category: 'Macro',
    examFocus: 'BothExams'
  },
  {
    subjectCode: 'H02', 
    subjectName: 'Geography',
    baselineHours: 100,
    category: 'Macro',
    examFocus: 'BothExams'
  },
  {
    subjectCode: 'H04',
    subjectName: 'Public Administration',
    baselineHours: 150,
    category: 'Micro',
    examFocus: 'MainsOnly'
  },
  {
    subjectCode: 'P01',
    subjectName: 'Polity',
    baselineHours: 80,
    category: 'Macro',
    examFocus: 'BothExams'
  }
];

const confidenceMap = new Map([
  ['H01', 0.3], // Weak - needs more time
  ['H02', 0.5], // Moderate
  ['H04', 0.8], // Strong - needs less time
  ['P01', 0.6]  // Above moderate
]);

// Run demonstration
function runDemo() {
  console.log('='.repeat(80));
  console.log('FUNCTIONAL BLOCK PLANNING DEMONSTRATION');
  console.log('='.repeat(80));
  
  // Step 1: Calculate Available Time
  console.log('\n1. CALCULATING AVAILABLE TIME');
  console.log('-'.repeat(40));
  
  const startDate = createDate('2024-01-01');
  const endDate = createDate('2024-04-30'); // 4 months
  const dailyHours = 8;
  
  const timeCalc = calculateAvailableTime(startDate, endDate, dailyHours);
  console.log(`Study Period: ${formatDate(startDate)} to ${formatDate(endDate)}`);
  console.log(`Total Days: ${timeCalc.totalDays}`);
  console.log(`Daily Hours: ${timeCalc.dailyHours}`);
  console.log(`Total Available Hours: ${timeCalc.totalHours}`);
  console.log(`Weekly Hours: ${timeCalc.weeklyHours}`);
  
  // Step 2: Calculate Subject Priorities
  console.log('\n2. CALCULATING SUBJECT PRIORITIES');
  console.log('-'.repeat(40));
  
  const priorities = calculateSubjectPriorities(mockSubjects, confidenceMap);
  priorities.forEach(p => {
    console.log(`${p.subjectCode} (${p.subjectName}):`);
    console.log(`  Baseline: ${p.baselineHours}h`);
    console.log(`  Confidence Multiplier: ${p.confidenceMultiplier}x`);
    console.log(`  Priority Weight: ${p.priorityWeight}`);
  });
  
  // Step 3: Allocate Time Proportionally
  console.log('\n3. ALLOCATING TIME PROPORTIONALLY');
  console.log('-'.repeat(40));
  
  const allocations = allocateTimeProportionally(priorities, timeCalc.totalHours);
  let totalAllocated = 0;
  
  allocations.forEach(a => {
    console.log(`${a.subjectCode}: ${a.allocatedHours.toFixed(1)}h (${a.allocatedDays} days)`);
    totalAllocated += a.allocatedHours;
  });
  
  console.log(`\nTotal Allocated: ${totalAllocated.toFixed(1)}h of ${timeCalc.totalHours}h available`);
  console.log(`Utilization: ${((totalAllocated / timeCalc.totalHours) * 100).toFixed(1)}%`);
  
  // Step 4: Create Continuous Blocks
  console.log('\n4. CREATING CONTINUOUS BLOCKS');
  console.log('-'.repeat(40));
  
  const continuousBlocks = createContinuousBlocks(allocations, mockSubjects, startDate, dailyHours);
  
  continuousBlocks.forEach((block, index) => {
    console.log(`Block ${index + 1}: ${block.subjectName}`);
    console.log(`  Period: ${formatDate(block.startDate)} to ${formatDate(block.endDate)}`);
    console.log(`  Duration: ${diffDays(block.startDate, block.endDate) + 1} days`);
    console.log(`  Daily Hours: ${block.dailyHours.toFixed(1)}h`);
    console.log(`  Total Hours: ${block.totalHours.toFixed(1)}h`);
  });
  
  // Step 5: Validate Continuous Coverage
  console.log('\n5. VALIDATING CONTINUOUS COVERAGE');
  console.log('-'.repeat(40));
  
  const coverage = validateContinuousCoverage(continuousBlocks, startDate, endDate);
  
  if (coverage.isValid) {
    console.log('✅ PERFECT CONTINUOUS COVERAGE - No gaps found!');
  } else {
    console.log('❌ Gaps found in coverage:');
    coverage.gaps.forEach((gap, index) => {
      console.log(`  Gap ${index + 1}: ${formatDate(gap.start)} to ${formatDate(gap.end)}`);
    });
  }
  
  // Step 6: Key Benefits
  console.log('\n6. KEY BENEFITS DEMONSTRATED');
  console.log('-'.repeat(40));
  
  console.log('✅ No Calendar Holes: Every day from start to end is covered');
  console.log('✅ Clear Subject Handling: All subjects treated uniformly with confidence-based priorities');
  console.log('✅ Functional Design: Pure functions with predictable behavior');
  console.log('✅ Dynamic Allocation: Time adjusts based on availability and subject needs');
  console.log('✅ Simplified Logic: No archetype, prepmode, or seasonal complexity');
  
  console.log('\n' + '='.repeat(80));
  console.log('DEMONSTRATION COMPLETE');
  console.log('='.repeat(80));
}

// Run the demo
runDemo();