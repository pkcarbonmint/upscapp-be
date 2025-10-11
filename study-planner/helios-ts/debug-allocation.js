#!/usr/bin/env node

/**
 * Debug script to analyze subject allocation patterns across all cycles
 * Usage: node debug-allocation.js
 */

import { generateInitialPlan } from './src/engine/NewEngine-generate-plan.js';
import { loadAllSubjects } from './src/services/SubjectLoader.js';
import fs from 'fs';

async function analyzeAllocations() {
  console.log('🚀 Running 2028 scenario allocation analysis...\n');

  // Test configuration - 2028 scenario
  const testConfig = {
    "archetype": "Beginner",
    "confidence_levels": {
      "H01": "Strong",      // History-Ancient
      "H02": "Strong",      // History-Medieval  
      "H03": "Strong",      // History-Modern
      "H04": "Strong",      // History-Art and Culture
      "H05": "Strong",      // History-World
      "H06": "Strong",      // History-Post Independent India
      "G": "VeryStrong",    // Geography
      "B": "Strong",        // Environment, Ecology and Disaster Management
      "T": "Strong",        // Science & Technology
      "P": "Strong",        // Indian Polity and Governance
      "E": "Strong",        // Indian Economy
      "O": "Strong",        // Governance
      "I": "Strong",        // International Relations
      "C": "Strong",        // Internal Security
      "S": "Strong",        // Society and Social Justice
      "Z": "Strong"         // Essay
    },
    "target_year": "2028",
    "start_date": "2025-10-01",
    "study_strategy": {
      "study_focus_combo": "OneGSPlusOptional",
      "weekly_study_hours": "40-50",
      "time_distribution": "Balanced",
      "study_approach": "Balanced",
      "revision_strategy": "weekly",
      "test_frequency": "Monthly",
      "seasonal_windows": ["Foundation", "Revision"],
      "catch_up_day_preference": "Sunday"
    },
    "subject_approach": "SingleSubject"
  };

  const testArchetype = {
    archetype_name: "Beginner",
    archetype_description: "Someone starting UPSC preparation",
    archetype_challenges: ["FirstTimeAttempt"]
  };

  const testIntake = {
    name: "Test User",
    target_year: "2028",
    start_date: "2025-10-01",
    subject_approach: "SingleSubject"
  };

  try {
    // Generate the full study plan
    const result = await generateInitialPlan(
      'debug-user-123',
      testConfig,
      testArchetype,
      testIntake
    );

    const plan = result.plan;
    const cycles = plan.cycles || [];

    // Analyze each cycle
    const analysis = {
      metadata: {
        plan_title: plan.plan_title,
        target_year: testIntake.target_year,
        start_date: testIntake.start_date,
        total_cycles: cycles.length
      },
      cycle_analysis: []
    };

    console.log(`📋 Found ${cycles.length} cycles to analyze\n`);

    for (const cycle of cycles) {
      console.log(`📊 Analyzing Cycle: ${cycle.cycleName} (${cycle.cycleType})`);
      console.log(`   Duration: ${cycle.cycleDuration} weeks`);
      console.log(`   Period: ${cycle.cycleStartDate} to ${cycle.cycleEndDate}`);
      console.log(`   Blocks: ${cycle.cycleBlocks?.length || 0}`);

      const cycleData = {
        cycleName: cycle.cycleName,
        cycleType: sequence.cycleType,
        cycleDuration: cycle.cycleDuration,
        period: `${cycle.cycleStartDate} to ${cycle.cycleEndDate}`,
        totalBlocks: cycle.cycleBlocks?.length || 0,
        subjectAllocations: []
      };

      // Extract subject allocations from blocks
      const subjectAllocations = new Map();

      if (cycle.cycleBlocks) {
        for (const block of cycle.cycleBlocks) {
          if (block.subjects && block.actual_hours) {
            for (const subjectCode of block.subjects) {
              const currentHours = subjectAllocations.get(subjectCode) || 0;
              subjectAllocations.set(subjectCode, currentHours + block.actual_hours);
            }
          }
        }
      }

      // Convert to sorted array
      const allocations = Array.from(subjectAllocations.entries())
        .map(([subjectCode, hours]) => ({ subjectCode, hours }))
        .sort((a, b) => b.hours - a.hours);

      cycleData.subjectAllocations = allocations;

      // Log top allocations for this cycle
      console.log(`   Top 5 subject allocations:`);
      allocations.slice(0, 5).forEach(allocation => {
        console.log(`     ${allocation.subjectCode}: ${allocation.hours}h`);
      });

      analysis.cycle_analysis.push(cycleData);
      console.log('');
    }

    // Generate cross-cycle comparison
    console.log('🔍 Cross-Cycle Comparison:\n');

    // Get all unique subjects
    const allSubjects = new Set();
    cycles.forEach(cycle => {
      if (cycle.cycleBlocks) {
        cycle.cycleBlocks.forEach(block => {
          if (block.subjects) {
            block.subjects.forEach(subj => allSubjects.add(subj));
          }
        });
      }
    });

    // Create comparison table
    const comparisonData = [];
    for (const subject of Array.from(allSubjects).sort()) {
      const row = { subjectCode: subject };
      cycles.forEach((cycle, index) => {
        const cycleName = cycle.cycleType.replace('Cycle', '');
        const allocation = subjectAllocations.get(subject) || 0;
        row[cycleName] = allocation;
      });
      comparisonData.push(row);
    }

    // Save analysis to file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `allocation-analysis-2028-${timestamp}.json`;
    
    const outputData = {
      ...analysis,
      comparison: comparisonData,
      summary: {
        generated_at: new Date().toISOString(),
        scenario: '2028_Beginner_Target',
        findings: {
          geography_foundation_allocation: analysis.cycle_analysis
            .find(c => c.cycleType === 'FoundationCycle')
            ?.subjectAllocations.find(s => s.subjectCode === 'G')?.hours || 'N/A',
          total_subjects_analyzed: allSubjects.size,
          cycles_analyzed: cycles.length
        }
      }
    };

    fs.writeFileSync(filename, JSON.stringify(outputData, null, 2));
    
    console.log(`📄 Analysis saved to: ${filename}`);
    console.log('\n🎯 Key Findings:');
    console.log(`   Geography Foundation allocation: ${outputData.summary.findings.geography_foundation_allocation}h`);
    console.log(`   Total subjects analyzed: ${outputData.summary.findings.total_subjects_analyzed}`);
    console.log(`   Cycles analyzed: ${outputData.summary.findings.cycles_analyzed}`);

    // Display Geography allocation across cycles
    console.log('\n📊 Geography Allocation Across Cycles:');
    analysis.cycle_analysis.forEach(cycle => {
      const geoAllocation = cycle.subjectAllocations.find(s => s.subjectCode === 'G');
      if (geoAllocation) {
        console.log(`   ${cycle.cycleType}: ${geoAllocation.hours}h`);
      }
    });

  } catch (error) {
    console.error('❌ Error analyzing allocations:', error);
    process.exit(1);
  }
}

// Run the analysis
analyzeAllocations().catch(console.error);
