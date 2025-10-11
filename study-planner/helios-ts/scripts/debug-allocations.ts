import { generateInitialPlan } from '../src/engine/NewEngine-generate-plan';
import { loadAllSubjects } from '../src/services/SubjectLoader';
import { Logger } from '../src/types/Types';
import fs from 'fs';

async function analyzeAllocations() {
  console.log('🚀 Running 2028 scenario allocation analysis...\n');

  // Test configuration matching existing test patterns exactly
  const testArchetype = {
    archetype_name: 'Beginner',
    archetype_description: 'Someone starting UPSC preparation',
    archetype_challenges: ['FirstTimeAttempt']
  };

  const testConfig = {};

  const testIntake = {
    subject_confidence: {
      'H01': 'VeryStrong',  // History-Ancient
      'H02': 'VeryStrong',  // History-Medieval
      'H03': 'VeryStrong',  // History-Modern
      'H04': 'VeryStrong',  // History-Art and Culture
      'H05': 'VeryStrong',  // History-World
      'H06': 'VeryStrong',  // History-Post Independent India
      'G': 'VeryStrong',    // Geography
      'B': 'VeryStrong',    // Environment
      'T': 'VeryStrong',    // Science & Technology
      'P': 'VeryStrong',    // Indian Polity
      'E': 'VeryStrong',    // Indian Economy
      'O': 'VeryStrong',    // Governance
      'I': 'VeryStrong',    // International Relations
      'C': 'VeryStrong',    // Internal Security
      'S': 'VeryStrong',    // Society
      'Z': 'VeryStrong'     // Essay
    },
    target_year: '2028',
    start_date: '2025-10-01',
    study_strategy: {
      study_focus_combo: 'OneGSPlusOptional',
      weekly_study_hours: '40-50',
      time_distribution: 'Balanced',
      study_approach: 'Balanced',
      revision_strategy: 'Weekly',
      test_frequency: 'Monthly',
      seasonal_windows: ['Foundation', 'Revision'],
      catch_up_day_preference: 'Sunday'
    },
    subject_approach: 'SingleSubject'
  };

  // Create logger
  const logs: any[] = [];
  const logger: Logger = {
    logInfo: (context: string, message: string) => {
      console.log(`[${context}] ${message}`);
      logs.push({ type: 'info', context, message });
    },
    logDebug: (context: string, message: string) => {
      console.log(`[DEBUG ${context}] ${message}`);
      logs.push({ type: 'debug', context, message });
    },
    logWarning: (context: string, message: string) => {
      console.warn(`[WARNING ${context}] ${message}`);
      logs.push({ type: 'warning', context, message });
    },
    logError: (context: string, message: string) => {
      console.error(`[ERROR ${context}] ${message}`);
      logs.push({ type: 'error', context, message });
    },
    getLogs: () => logs
  };

  try {
    // Generate the full study plan
    console.log('Generating study plan...');
    const result = await generateInitialPlan(
      'debug-user-123',
      testConfig,
      testArchetype,
      testIntake,
      logger
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
      cycle_analysis: [] as any[]
    };

    console.log(`\n📋 Found ${cycles.length} cycles to analyze\n`);

    for (const cycle of cycles) {
      console.log(`📊 Analyzing Cycle: ${cycle.cycleName} (${cycle.cycleType})`);
      console.log(`   Duration: ${cycle.cycleDuration} weeks`);
      console.log(`   Period: ${cycle.cycleStartDate} to ${cycle.cycleEndDate}`);
      console.log(`   Blocks: ${cycle.cycleBlocks?.length || 0}`);

      const cycleData: any = {
        cycleName: cycle.cycleName,
        cycleType: cycle.cycleType,
        cycleDuration: cycle.cycleDuration,
        period: `${cycle.cycleStartDate} to ${cycle.cycleEndDate}`,
        totalBlocks: cycle.cycleBlocks?.length || 0,
        subjectAllocations: [] as any[]
      };

      // Extract subject allocations from blocks
      const subjectAllocations = new Map<string, number>();

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
      console.log(`   Top 10 subject allocations:`);
      allocations.slice(0, 10).forEach(allocation => {
        console.log(`     ${allocation.subjectCode}: ${allocation.hours}h`);
      });

      analysis.cycle_analysis.push(cycleData);
      console.log('');
    }

    // Create cross-cycle comparison
    console.log('🔍 Cross-Cycle Comparison:\n');

    // Get all unique subjects
    const allSubjects = new Set<string>();
    cycles.forEach(cycle => {
      if (cycle.cycleBlocks) {
        cycle.cycleBlocks.forEach(block => {
          if (block.subjects) {
            block.subjects.forEach(subj => allSubjects.add(subj));
          }
        });
      }
    });

    // Create comparison matrix
    const comparisonData: any[] = [];
    for (const subject of Array.from(allSubjects).sort()) {
      const row: any = { subjectCode: subject };
      cycles.forEach((cycle) => {
        const cycleName = cycle.cycleType.replace('Cycle', '');
        // Find allocation for this subject in this cycle
        const cycleAnalysis = analysis.cycle_analysis.find(c => c.cycleType === cycle.cycleType);
        const allocation = cycleAnalysis?.subjectAllocations.find(s => s.subjectCode === subject)?.hours || 0;
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

    // Display summary table
    console.log('\n📊 Summary Table (Top 10 subjects by Foundation allocation):');
    console.log('Subject | Foundation | PrelimsRev | PrelimsRapidRev | MainsRapidRev');
    console.log('--------|------------|------------|-----------------|---------------');
    
    const foundationCycle = analysis.cycle_analysis.find(c => c.cycleType === 'FoundationCycle');
    const foundationTop10 = foundationCycle?.subjectAllocations.slice(0, 10) || [];
    
    foundationTop10.forEach(subject => {
      const row: string[] = [subject.subjectCode];
      cycles.forEach(cycle => {
        const cycleAnalysis = analysis.cycle_analysis.find(c => c.cycleType === cycle.cycleType);
        const allocation = cycleAnalysis?.subjectAllocations.find(s => s.subjectCode === subject.subjectCode)?.hours || 0;
        row.push(allocation.toString());
      });
      console.log(row.join(' | '));
    });

  } catch (error) {
    console.error('❌ Error analyzing allocations:', error);
    process.exit(1);
  }
}

// Run the analysis
analyzeAllocations().catch(console.error);
