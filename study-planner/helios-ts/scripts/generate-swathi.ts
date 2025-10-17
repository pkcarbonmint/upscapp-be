#!/usr/bin/env node

/**
 * Document Generation Script for Swathi's Study Plan
 * 
 * This script generates Word documents using the new CalendarDocxService
 * for Swathi's study plan, creating professional calendar-style documents
 * that can be used for study planning and tracking.
 * 
 * Features:
 * - Word document generation using CalendarDocxService
 * - Professional calendar layout with color-coded cycles
 * - Performance monitoring and reporting
 */

import { generateInitialPlan } from '../src/engine/NewEngine-generate-plan';
import { DEFAULT_CONFIG } from '../src/config';
import type { StudentIntake, Archetype, StudyPlan } from '../src/types/models';
import { createStudentIntake } from '../src/types/models';
import { CalendarDocxService } from '../src/services/CalendarDocxService';
import * as path from 'path';
import * as fs from 'fs';
import { LogEntry, Logger } from '../src/types/Types';

interface CliArgs {
  scenarios?: string[];
  help?: boolean;
}

/**
 * Parse command line arguments
 */
function parseCliArgs(): CliArgs {
  const args: CliArgs = {};
  const argv = process.argv.slice(2);
  
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    
    if (arg === '-h' || arg === '--help') {
      args.help = true;
    } else if (arg.startsWith('-')) {
      console.error(`❌ Error: Unknown option ${arg}`);
      process.exit(1);
    }
  }
  
  return args;
}

/**
 * Display help information
 */
function showHelp(): void {
  console.log(`
📚 Swathi's Study Plan Document Generator

Usage: node generate-swathi.ts [options]

Options:
  -h, --help               Show this help message

This script generates a professional Word document for Swathi's UPSC study plan
using the CalendarDocxService with color-coded cycles and comprehensive layouts.
`);
}

interface DocumentGeneratorOptions {
  outputDir?: string;
}

const dummyStuff = {
	preparation_background: {
		preparing_since: '6 months',
		number_of_attempts: '0', // Required - including "0" for freshers
		highest_stage_per_attempt: 'N/A', // Required - "N/A" for freshers
	},
	personal_details: {
		full_name: 'Swathi Muthyam',
		email: 'swathi.muthyam@example.com',
		phone_number: '+91-9876543210',
		present_location: 'Hyderabad',
		student_archetype: 'General',
		graduation_stream: 'Commerce',
		college_university: 'Hyderabad University',
		year_of_passing: 2023
	},
}

class SwathiDocumentGenerator {
  private outputDir: string;

  constructor(options: DocumentGeneratorOptions) {
    this.outputDir = options.outputDir || './generated-docs';
  }

  /**
   * Force garbage collection if available (for debugging)
   */
  private forceGC(): void {
    if (global.gc) {
      global.gc();
      console.log('🧹 Forced garbage collection');
    }
  }

  /**
   * Get current memory usage
   */
  private getMemoryUsage(): string {
    if (process.memoryUsage) {
      const usage = process.memoryUsage();
      return `Memory: ${Math.round(usage.heapUsed / 1024 / 1024)}MB used, ${Math.round(usage.heapTotal / 1024 / 1024)}MB total`;
    }
    return 'Memory usage not available';
  }
  
  /**
   * Generate Word document for Swathi's study plan
   */
  async generateSwathiDocument(): Promise<void> {
    const startTime = Date.now();
    console.log('🚀 Starting Swathi\'s study plan document generation...');
    console.log(`📊 Initial ${this.getMemoryUsage()}`);

    // Create output directory
    const dirStartTime = Date.now();
    await this.ensureOutputDirectory();
    console.log(`⏱️  Directory setup took: ${Date.now() - dirStartTime}ms`);

    try {
      // Generate the study plan data
      const planGenStartTime = Date.now();
      const result = await this.generateStudyPlanData();
      const planGenTime = Date.now() - planGenStartTime;
      console.log(`⏱️  Plan generation took: ${planGenTime}ms`);
      console.log(`📊 Generated ${result.plan.cycles?.length || 0} cycles`);

      // Generate Word document using CalendarDocxService
      const wordDocStartTime = Date.now();
      console.log(`📄 Generating Word document using CalendarDocxService...`);
      
      await CalendarDocxService.generateStudyPlanDocx(
        result.plan, 
        result.intake, 
        { filename: 'Swathi-Study-Plan.docx' }
      );
      
      const wordDocTime = Date.now() - wordDocStartTime;
      console.log(`⏱️  Word document generation took: ${wordDocTime}ms`);
      console.log(`✅ Generated: Swathi-Study-Plan.docx`);

      const totalTime = Date.now() - startTime;
      console.log('🎉 Document generation completed!');
      console.log(`⏱️  Total execution time: ${totalTime}ms (${(totalTime / 1000).toFixed(2)}s)`);
      console.log(`📊 ${this.getMemoryUsage()}`);
      console.log(`📁 Document saved to: ${path.resolve(this.outputDir)}`);
      
      // Force garbage collection at the end
      this.forceGC();

    } catch (error) {
      console.error(`❌ Failed to generate Swathi's document:`, error);
      throw error;
    }
  }

  /**
   * Generate study plan data for Swathi
   */
  private async generateStudyPlanData(): Promise<{ plan: StudyPlan; logs: LogEntry[]; intake: StudentIntake }> {
    const planGenStartTime = Date.now();
    console.log(`    🔄 Starting plan generation for Swathi...`);
    const logs: LogEntry[] = [];
    const logger = makeLogger(logs);
    
    // Create Swathi's intake
    const intake = this.makeIntake('2027', '2025-10-21');
    
    // Generate the study plan
    const result = await generateInitialPlan(
      'swathi-muthyam',
      this.getTestConfig(),
      this.getBalancedDualSubjectArchetype(),
      intake,
      logger
    );

    const planGenTime = Date.now() - planGenStartTime;
    console.log(`    ⏱️  Plan generation completed in: ${planGenTime}ms`);
    console.log(`    📊 Generated ${result.plan.cycles?.length || 0} cycles`);

    return { ...result, intake };
  
  
    function makeLogger(_logs?: LogEntry[]): Logger {
      return {
        logInfo() {
        },
    
        logWarn() {
        },
    
        logDebug() {
        },
    
        getLogs() {
          return [];
        },
    
        clear() {
        }
      }
    }
  }

  /**
   * Ensure output directory exists
   */
  private async ensureOutputDirectory(): Promise<void> {
    const resolvedPath = path.resolve(this.outputDir);
    console.log(`📁 Ensuring output directory exists: ${resolvedPath}`);

    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
      console.log(`✅ Created directory: ${resolvedPath}`);
    } else {
      console.log(`📁 Directory already exists: ${resolvedPath}`);
    }
  }

  // Test scenario configurations (based on actual test files)

  private getBalancedDualSubjectArchetype(): Archetype {
    return {
      archetype: 'Swathi',
      timeCommitment: 'FullTime',
      weeklyHoursMin: 40,
      weeklyHoursMax: 50,
      description: 'Student focusing on 3 subjects with balanced approach',
      defaultPacing: 'Balanced',
      defaultApproach: 'TripleSubject',
      specialFocus: ['GS', 'Optional']
    };
  }

  private makeIntake(targetYear: string, startDate: string): StudentIntake {
    return createStudentIntake({
      ...dummyStuff,
      subject_approach: 'TripleSubject',
      subject_confidence: {},
      study_strategy: {
        study_focus_combo: 'GSPlusOptionalPlusCSAT',
        weekly_study_hours: '45-55',
        time_distribution: 'Balanced',
        study_approach: 'Balanced',
        revision_strategy: 'Weekly',
        test_frequency: 'Weekly',
        seasonal_windows: ['Foundation', 'Revision', 'Intensive'],
        catch_up_day_preference: 'Sunday'
      },
      target_year: targetYear,
      start_date: startDate
    });
  }

  private getTestConfig() {
    return DEFAULT_CONFIG;
  }
}

// Main execution
async function main() {
  try {
    // Parse command line arguments
    const cliArgs = parseCliArgs();
    
    // Show help if requested
    if (cliArgs.help) {
      showHelp();
      return;
    }
    
    const generator = new SwathiDocumentGenerator({
      outputDir: './generated-docs'
    });

    await generator.generateSwathiDocument();
  } catch (error) {
    console.error('❌ Error running document generation:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

export { SwathiDocumentGenerator };