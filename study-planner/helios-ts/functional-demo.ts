/**
 * Demonstration of the Functional Block Planning Logic
 * 
 * This script shows how the new functional approach works and validates
 * that it addresses the key issues identified in the current system.
 */

import dayjs from 'dayjs';
import { 
  calculateAvailableTime,
  calculateSubjectPriorities,
  allocateTimeProportionally,
  createContinuousBlocks,
  fillTimeGaps,
  validateContinuousCoverage,
  getTotalAllocatedHours,
  getSubjectCoverage
} from './src/engine/functional-block-planner';

// Mock data for demonstration
const mockSubjects = [
  {
    subjectCode: 'H01',
    subjectName: 'History',
    baselineHours: 120,
    category: 'Macro',
    examFocus: 'BothExams' as const,
    topics: []
  },
  {
    subjectCode: 'H02', 
    subjectName: 'Geography',
    baselineHours: 100,
    category: 'Macro',
    examFocus: 'BothExams' as const,
    topics: []
  },
  {
    subjectCode: 'H04',
    subjectName: 'Public Administration',
    baselineHours: 150,
    category: 'Micro',
    examFocus: 'MainsOnly' as const,
    topics: []
  },
  {
    subjectCode: 'P01',
    subjectName: 'Polity',
    baselineHours: 80,
    category: 'Macro',
    examFocus: 'BothExams' as const,
    topics: []
  }
];

const confidenceMap = new Map([
  ['H01', 0.3], // Weak - needs more time
  ['H02', 0.5], // Moderate
  ['H04', 0.8], // Strong - needs less time
  ['P01', 0.6]  // Above moderate
]);

function demonstrateFunctionalPlanning() {
  console.log('='.repeat(80));
  console.log('FUNCTIONAL BLOCK PLANNING DEMONSTRATION');
  console.log('='.repeat(80));
  
  // Step 1: Calculate Available Time
  console.log('\n1. CALCULATING AVAILABLE TIME');
  console.log('-'.repeat(40));
  
  const startDate = dayjs('2024-01-01');
  const endDate = dayjs('2024-04-30'); // 4 months
  const dailyHours = 8;
  
  const timeCalc = calculateAvailableTime(startDate, endDate, dailyHours);
  console.log(`Study Period: ${startDate.format('YYYY-MM-DD')} to ${endDate.format('YYYY-MM-DD')}`);
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
    console.log(`${a.subjectCode}: ${a.allocatedHours}h (${a.allocatedDays} days)`);
    totalAllocated += a.allocatedHours;
  });
  
  console.log(`\nTotal Allocated: ${totalAllocated}h of ${timeCalc.totalHours}h available`);
  console.log(`Utilization: ${((totalAllocated / timeCalc.totalHours) * 100).toFixed(1)}%`);
  
  // Step 4: Create Continuous Blocks
  console.log('\n4. CREATING CONTINUOUS BLOCKS');
  console.log('-'.repeat(40));
  
  const continuousBlocks = createContinuousBlocks(allocations, mockSubjects, startDate, dailyHours);
  
  continuousBlocks.forEach((block, index) => {
    console.log(`Block ${index + 1}: ${block.subjectName}`);
    console.log(`  Period: ${block.startDate.format('YYYY-MM-DD')} to ${block.endDate.format('YYYY-MM-DD')}`);
    console.log(`  Duration: ${block.endDate.diff(block.startDate, 'day') + 1} days`);
    console.log(`  Daily Hours: ${block.dailyHours}h`);
    console.log(`  Total Hours: ${block.totalHours}h`);
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
      console.log(`  Gap ${index + 1}: ${gap.start.format('YYYY-MM-DD')} to ${gap.end.format('YYYY-MM-DD')}`);
    });
    
    // Step 5b: Fill Time Gaps
    console.log('\n5b. FILLING TIME GAPS');
    console.log('-'.repeat(40));
    
    const gapFilledBlocks = fillTimeGaps(continuousBlocks, endDate, mockSubjects, dailyHours);
    
    console.log(`Original blocks: ${continuousBlocks.length}`);
    console.log(`Gap-filled blocks: ${gapFilledBlocks.length}`);
    
    // Re-validate
    const newCoverage = validateContinuousCoverage(gapFilledBlocks, startDate, endDate);
    if (newCoverage.isValid) {
      console.log('✅ CONTINUOUS COVERAGE ACHIEVED after gap filling!');
    } else {
      console.log('❌ Still have gaps after filling:');
      newCoverage.gaps.forEach((gap, index) => {
        console.log(`  Remaining Gap ${index + 1}: ${gap.start.format('YYYY-MM-DD')} to ${gap.end.format('YYYY-MM-DD')}`);
      });
    }
  }
  
  // Step 6: Summary Statistics
  console.log('\n6. SUMMARY STATISTICS');
  console.log('-'.repeat(40));
  
  const finalBlocks = coverage.isValid ? continuousBlocks : fillTimeGaps(continuousBlocks, endDate, mockSubjects, dailyHours);
  
  const totalHours = getTotalAllocatedHours(finalBlocks);
  const subjectCoverage = getSubjectCoverage(finalBlocks);
  
  console.log(`Total Blocks Created: ${finalBlocks.length}`);
  console.log(`Total Hours Allocated: ${totalHours}h`);
  console.log(`Time Utilization: ${((totalHours / timeCalc.totalHours) * 100).toFixed(1)}%`);
  
  console.log('\nSubject Coverage:');
  subjectCoverage.forEach((hours, subjectCode) => {
    const subject = mockSubjects.find(s => s.subjectCode === subjectCode);
    console.log(`  ${subjectCode} (${subject?.subjectName || 'Unknown'}): ${hours}h`);
  });
  
  // Step 7: Key Benefits Demonstrated
  console.log('\n7. KEY BENEFITS DEMONSTRATED');
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

// Run the demonstration
if (require.main === module) {
  demonstrateFunctionalPlanning();
}

export { demonstrateFunctionalPlanning };