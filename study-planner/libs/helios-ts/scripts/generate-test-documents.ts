#!/usr/bin/env node

/**
 * Document Generation Script for Helios Test Scenarios
 * 
 * This script generates both Word and PDF documents for all test scenarios defined in
 * the Oct25-Target*.test.ts files, creating sample study plan documents
 * that can be used for testing and demonstration.
 * 
 * Features:
 * - Word document generation using docx library
 * - PDF document generation using jsPDF with Node.js compatibility
 * - JSON export for debugging
 * - Performance monitoring and reporting
 */

import { Document, Packer } from 'docx';
import { generateInitialPlan } from '../src/engine/NewEngine-generate-plan';
import { DEFAULT_CONFIG } from '../src/config';
import type { StudentIntake, Archetype, StudyPlan } from '../src/types/models';
import { createStudentIntake } from '../src/types/models';
import { DocumentService } from '../src/services/DocumentService';
import { CalendarDocxService } from '../src/services/CalendarDocxService';
import { WeeklyScheduleService } from '../src/services/WeeklyScheduleService';
import { CollageService } from '../src/services/CollageService';
import { DayOfWeek } from 'scheduler';
import * as path from 'path';
import * as fs from 'fs';
import { createWriteStream } from 'fs';
import { LogEntry, Logger } from '../src/types/Types';

interface CliArgs {
  scenarios?: string[];
  format?: string;
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
    
    if (arg === '-s' || arg === '--scenarios') {
      const nextArg = argv[i + 1];
      if (nextArg && !nextArg.startsWith('-')) {
        args.scenarios = nextArg.split(',').map(s => s.trim());
        i++; // Skip the next argument as it's the value
      } else {
        console.error('❌ Error: -s/--scenarios requires a value (e.g., -s T1,T2,T3)');
        process.exit(1);
      }
    } else if (arg === '-f' || arg === '--format') {
      const nextArg = argv[i + 1];
      if (nextArg && !nextArg.startsWith('-')) {
        args.format = nextArg.toLowerCase();
        i++; // Skip the next argument as it's the value
      } else {
        console.error('❌ Error: -f/--format requires a value (e.g., -f js)');
        process.exit(1);
      }
    } else if (arg === '-h' || arg === '--help') {
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
📚 Helios Test Document Generator

Usage: node generate-test-documents2.ts [options]

Options:
  -s, --scenarios <list>    Comma-separated list of scenarios to run (e.g., T1,T2,T12)
  -f, --format <format>     Output format: js, json, markdown (default: js)
  -h, --help               Show this help message

Examples:
  node generate-test-documents2.ts                    # Run all scenarios with JS format
  node generate-test-documents2.ts -s T1,T2          # Run only T1 and T2 scenarios
  node generate-test-documents2.ts -s T1,T2,T12      # Run T1, T2, and T12 scenarios
  node generate-test-documents2.ts -f json           # Generate JSON format for all scenarios
  node generate-test-documents2.ts -s T1 -f markdown # Generate markdown for T1 only

Available Scenarios:
  T1-T15: Test scenarios with different start dates and configurations

Note: If no scenarios are specified, all available scenarios will be run.
`);
}

/**
 * Filter scenarios based on command line arguments
 */
function filterScenarios(allScenarios: any[], selectedScenarios?: string[]): any[] {
  if (!selectedScenarios || selectedScenarios.length === 0) {
    return allScenarios;
  }
  
  const filtered = allScenarios.filter(scenario => 
    selectedScenarios.includes(scenario.name)
  );
  
  // Check for invalid scenario names
  const validScenarioNames = allScenarios.map(s => s.name);
  const invalidScenarios = selectedScenarios.filter(name => !validScenarioNames.includes(name));
  
  if (invalidScenarios.length > 0) {
    console.warn(`⚠️  Warning: Invalid scenario names: ${invalidScenarios.join(', ')}`);
    console.log(`📋 Available scenarios: ${validScenarioNames.join(', ')}`);
  }
  
  if (filtered.length === 0) {
    console.error('❌ Error: No valid scenarios found. Available scenarios:', validScenarioNames.join(', '));
    process.exit(1);
  }
  
  console.log(`🎯 Running selected scenarios: ${filtered.map(s => s.name).join(', ')}`);
  return filtered;
}

interface DocumentGeneratorOptions {
  outputDir?: string;
  generateMarkdown: boolean;
  generateJson: boolean;
  generateWeeklySchedules: boolean;
  generatePDFs: boolean; // Generate PDF versions alongside Word documents
  format?: string; // Output format: js, json, markdown
}


const startDates :  string [] = [
  '2025-03-01', // T1
  '2025-12-10', // T2
  '2026-03-10', // T3
  '2026-06-10', // T4
  '2026-09-10', // T5
  '2026-10-10', // T6
  '2026-11-10', // T7
  '2026-12-15', // T8
  '2026-12-16', // T9
  '2027-02-01', // T10
  '2027-02-28', // T11
  '2027-03-01', // T12
  '2027-03-15', // T13
  '2027-04-15', // T14
  '2027-04-20', // T15
]
;

const dummyStuff = {
	preparation_background: {
		preparing_since: '6 months',
		number_of_attempts: '0', // Required - including "0" for freshers
		highest_stage_per_attempt: 'N/A', // Required - "N/A" for freshers
	},
	personal_details: {
		full_name: 'Swati Mutyam',
		email: 'swati.mutyam@gmail.com',
		phone_number: '+91-9876543210',
		present_location: 'Hyderabad',
		student_archetype: 'General',
		graduation_stream: 'Commerce',
		college_university: 'Hyderabad University',
		year_of_passing: 2023
	},
	optional_subject: {
		optional_subject_name: 'Agriculture'
	}
}

class TestDocumentGenerator {
  private outputDir: string;
  private generateMarkdown: boolean;
  private generateJson: boolean;
  private generateWeeklySchedules: boolean;
  private generatePDFs: boolean;
  private format: string;

  constructor(options: DocumentGeneratorOptions) {
    this.outputDir = options.outputDir || './generated-docs';
    this.generateMarkdown = options.generateMarkdown;
    this.generateJson = options.generateJson;
    this.generateWeeklySchedules= options.generateWeeklySchedules;
    this.generatePDFs = options.generatePDFs; // Default to true to generate PDFs
    this.format = options.format || 'js';
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
   * Generate documents for all test scenarios
   */
  async generateAllTestDocuments(selectedScenarios?: string[]): Promise<void> {
    const startTime = Date.now();
    console.log('🚀 Starting document generation for all test scenarios...');
    console.log(`📊 Initial ${this.getMemoryUsage()}`);

    // Create output directory
    const dirStartTime = Date.now();
    await this.ensureOutputDirectory();
    console.log(`⏱️  Directory setup took: ${Date.now() - dirStartTime}ms`);
    // Define test scenarios for different target years
    const allScenarios = startDates.map((startDate, i) => ({
      name: `T${i + 1}`,
      config: this.getTestConfig(),
      archetype: this.getArchetype(),
      intake: this.makeIntake('2027', startDate),
    }));

    // Filter scenarios based on command line arguments
    const scenarios = filterScenarios(allScenarios, selectedScenarios);
    // Collect all scenario data for collage
    const allScenarioData: Array<{
      name: string;
      startDate: string;
      targetYear: number;
      planDuration: string;
      svgTimeline: string;
    }> = [];

    // Generate JSON for each scenario
    const jsonGenerationStartTime = Date.now();
    console.log(`📄 Starting JSON generation for ${scenarios.length} scenarios...`);
    if (this.generateJson) {

    for (const scenario of scenarios) {
      const scenarioStartTime = Date.now();
      console.log(`📄 Generating JSON for ${scenario.name}...`);

      try {
        // Generate the study plan data
        const planGenStartTime = Date.now();
        const result = await this.generateStudyPlanData(scenario);
        const planGenTime = Date.now() - planGenStartTime;
        console.log(`  ⏱️  Plan generation took: ${planGenTime}ms`);
        
        // Collect data for collage
        const collageDataStartTime = Date.now();
        const planDuration = CollageService.calculatePlanDuration(result.intake.start_date, result.intake.target_year || '2027');
        const svgTimeline = DocumentService.generateTimelineSVG(result.plan);
        const collageDataTime = Date.now() - collageDataStartTime;
        console.log(`  ⏱️  Collage data preparation took: ${collageDataTime}ms`);
        
        allScenarioData.push({
          name: scenario.name,
          startDate: result.intake.start_date,
          targetYear: parseInt(result.intake.target_year || '2027'),
          planDuration: planDuration,
          svgTimeline: svgTimeline
        });
        
        // Generate JSON file for raw data debugging
          const jsonSaveStartTime = Date.now();
          const jsonData = this.generateJsonData(result, result.intake);
          await this.saveJson(jsonData, scenario.name);
          const jsonSaveTime = Date.now() - jsonSaveStartTime;
          console.log(`  ⏱️  JSON save took: ${jsonSaveTime}ms`);
          console.log(`📊 Generated debug JSON: ${scenario.name}.json`);
        

        const totalScenarioTime = Date.now() - scenarioStartTime;
        console.log(`  ✅ ${scenario.name} completed in: ${totalScenarioTime}ms`);

      } catch (error) {
        console.error(`❌ Failed to generate ${scenario.name}:`, error);
      }
    }
  }
    const totalJsonGenerationTime = Date.now() - jsonGenerationStartTime;
    console.log(`⏱️  Total JSON generation took: ${totalJsonGenerationTime}ms`);
    console.log(`📊 After JSON generation: ${this.getMemoryUsage()}`);

    // Generate collage document
    if (allScenarioData.length > 0) {
      const collageStartTime = Date.now();
      console.log(`🎨 Generating scenario collage document...`);
      await this.generateCollage(allScenarioData);
      const collageTime = Date.now() - collageStartTime;
      console.log(`⏱️  Collage generation took: ${collageTime}ms`);
    }


    // Generate documents for each scenario
    const documentGenerationStartTime = Date.now();
    console.log(`📄 Starting document generation for ${scenarios.length} scenarios...`);
    
    for (const scenario of scenarios) {
      const docScenarioStartTime = Date.now();
      console.log(`📄 Generating document for ${scenario.name}...`);

      try {
        // Generate the study plan data
        const docPlanGenStartTime = Date.now();
        const result = await this.generateStudyPlanData(scenario);
        const docPlanGenTime = Date.now() - docPlanGenStartTime;
        console.log(`  ⏱️  Plan generation took: ${docPlanGenTime}ms`);

        // Generate Word document
        await this.generateWordDocument(
          scenario.name, result.plan, result.intake);

        // Generate PDF document if enabled
        if (this.generatePDFs) {
          const pdfStartTime = Date.now();
          await this.generatePDFDocument(scenario.name, result.plan, result.intake);
          const pdfTime = Date.now() - pdfStartTime;
          console.log(`  ⏱️  PDF document generation took: ${pdfTime}ms`);
          console.log(`📊 Generated PDF: ${scenario.name}.pdf`);
        }

        // Generate Weekly Schedule document
        if (this.generateWeeklySchedules) {
          const weeklyStartTime = Date.now();
          const weeklySchedule = await this.generateWeeklyScheduleDocument(result.plan);
          const weeklyGenTime = Date.now() - weeklyStartTime;
          console.log(`  ⏱️  Weekly schedule generation took: ${weeklyGenTime}ms`);
          
          const weeklySaveStartTime = Date.now();
          await this.saveDocument(weeklySchedule, `${scenario.name}-WeeklySchedule`);
          const weeklySaveTime = Date.now() - weeklySaveStartTime;
          console.log(`  ⏱️  Weekly schedule save took: ${weeklySaveTime}ms`);
          console.log(`📅 Generated weekly schedule: ${scenario.name}-WeeklySchedule.docx`);
        }

        // Generate format-specific output based on format parameter
        if (this.format === 'js') {
          const jsStartTime = Date.now();
          const jsContent = this.generateJSFormatDocument(result.plan, result.intake, scenario);
          const jsGenTime = Date.now() - jsStartTime;
          console.log(`  ⏱️  JS format generation took: ${jsGenTime}ms`);
          
          const jsSaveStartTime = Date.now();
          await this.saveJS(jsContent, scenario.name);
          const jsSaveTime = Date.now() - jsSaveStartTime;
          console.log(`  ⏱️  JS format save took: ${jsSaveTime}ms`);
          console.log(`📄 Generated JS format: ${scenario.name}.js`);
        } else if (this.format === 'json') {
          const jsonStartTime = Date.now();
          const jsonData = this.generateJsonData(result, result.intake);
          const jsonGenTime = Date.now() - jsonStartTime;
          console.log(`  ⏱️  JSON format generation took: ${jsonGenTime}ms`);
          
          const jsonSaveStartTime = Date.now();
          await this.saveJson(jsonData, scenario.name);
          const jsonSaveTime = Date.now() - jsonSaveStartTime;
          console.log(`  ⏱️  JSON format save took: ${jsonSaveTime}ms`);
          console.log(`📄 Generated JSON format: ${scenario.name}.js`);
        } else if (this.format === 'markdown') {
          const markdownStartTime = Date.now();
          const markdown = this.generateMarkdownDocument(result.plan, scenario);
          const markdownGenTime = Date.now() - markdownStartTime;
          console.log(`  ⏱️  Markdown format generation took: ${markdownGenTime}ms`);
          
          const markdownSaveStartTime = Date.now();
          await this.saveMarkdown(markdown, scenario.name);
          const markdownSaveTime = Date.now() - markdownSaveStartTime;
          console.log(`  ⏱️  Markdown format save took: ${markdownSaveTime}ms`);
          console.log(`📄 Generated Markdown format: ${scenario.name}.md`);
        }

        // Generate Markdown file for debugging (legacy)
        if (this.generateMarkdown) {
          const markdownStartTime = Date.now();
          const markdown = this.generateMarkdownDocument(result.plan, scenario);
          const markdownGenTime = Date.now() - markdownStartTime;
          console.log(`  ⏱️  Markdown generation took: ${markdownGenTime}ms`);
          
          const markdownSaveStartTime = Date.now();
          await this.saveMarkdown(markdown, scenario.name);
          const markdownSaveTime = Date.now() - markdownSaveStartTime;
          console.log(`  ⏱️  Markdown save took: ${markdownSaveTime}ms`);
          console.log(`📝 Generated debug markdown: ${scenario.name}.md`);
        }

        const totalDocScenarioTime = Date.now() - docScenarioStartTime;
        console.log(`  ✅ ${scenario.name} document completed in: ${totalDocScenarioTime}ms`);
        console.log(`✅ Generated: ${scenario.name}.docx`);
      } catch (error) {
        console.error(`❌ Failed to generate ${scenario.name}:`, error);
      }
    }
    
    const totalDocumentGenerationTime = Date.now() - documentGenerationStartTime;
    console.log(`⏱️  Total document generation took: ${totalDocumentGenerationTime}ms`);
    console.log(`📊 After document generation: ${this.getMemoryUsage()}`);

    const totalTime = Date.now() - startTime;
    console.log('🎉 Document generation completed!');
    console.log(`⏱️  Total execution time: ${totalTime}ms (${(totalTime / 1000).toFixed(2)}s)`);
    console.log(`📊 ${this.getMemoryUsage()}`);
    console.log(`📁 Documents saved to: ${path.resolve(this.outputDir)}`);
    
    // Performance summary
    console.log('\n📈 PERFORMANCE SUMMARY:');
    console.log(`- Total scenarios processed: ${scenarios.length}`);
    console.log(`- Average time per scenario: ${Math.round(totalTime / scenarios.length)}ms`);
    console.log(`- JSON generation phase: ${totalJsonGenerationTime}ms`);
    console.log(`- Document generation phase: ${totalDocumentGenerationTime}ms`);
    
    // Force garbage collection at the end
    this.forceGC();
  }


  /**
   * Generate study plan data for a test scenario (shared by both formats)
   */
  private async generateStudyPlanData(scenario: any): Promise<{ plan: StudyPlan; logs: LogEntry[]; intake: StudentIntake }> {
    const planGenStartTime = Date.now();
    console.log(`    🔄 Starting plan generation for ${scenario.name}...`);
    const logs: LogEntry[] = [];
    const logger = makeLogger(logs);
    // Generate the study plan
    const result = await generateInitialPlan(
      'test-user-' + scenario.name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
      scenario.config,
      scenario.archetype,
      scenario.intake,
      logger
    );

    const planGenTime = Date.now() - planGenStartTime;
    console.log(`    ⏱️  Plan generation completed in: ${planGenTime}ms`);
    console.log(`    📊 Generated ${result.plan.cycles?.length || 0} cycles`);

    return { ...result, intake: scenario.intake };
  
  
    function makeLogger(_logs?: LogEntry[]): Logger {
      return {
        logInfo(source: string, message: string) {
          console.log(`[${source}] ${message}`);
        },
    
        logWarn(source: string, message: string) {
          console.log(`[${source}] ${message}`);
        },
    
        logDebug(source: string, message: string) {
          console.log(`[${source}] ${message}`);
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
   * Generate Weekly Schedule document from study plan data
   */
  private async generateWeeklyScheduleDocument(studyPlan: StudyPlan): Promise<Document> {
    const weeklyStartTime = Date.now();
    console.log(`      📅 Generating weekly schedule...`);
    
    const result = await WeeklyScheduleService.generateWeeklySchedule(studyPlan);
    
    const weeklyTime = Date.now() - weeklyStartTime;
    console.log(`      ⏱️  Weekly schedule generation took: ${weeklyTime}ms`);
    
    return result;
  }

  /**
   * Generate Word document from study plan data using enhanced DocumentService
   */
  private async generateWordDocument(
    scenarioName: string,
    studyPlan: StudyPlan, studentIntake: StudentIntake): Promise<void> {
    const wordDocStartTime = Date.now();
    console.log(`      📄 Generating Word document...`);
    
    await CalendarDocxService.generateStudyPlanDocxToStream(
      studyPlan,
      studentIntake,
      createWriteStream(path.join(this.outputDir, `${scenarioName}.docx`)),
      { filename: `${scenarioName}.docx` }
    );

  }

  /**
   * Generate PDF document using streaming method for better memory efficiency
   */
  private async generatePDFDocument(
    scenarioName: string,
    studyPlan: StudyPlan,
    studentIntake: StudentIntake
  ): Promise<void> {
    const pdfDocStartTime = Date.now();
    console.log(`      📄 Generating PDF document with streaming...`);
    
    try {
    // Dynamically import CalendarPDFService to avoid bundling issues
    const { CalendarPDFService } = await import('../src/services/CalendarPDFService');
      
      // Create output file path
      const outputPath = path.join(this.outputDir, `${scenarioName}.pdf`);
      
      // Create write stream for PDF output
      const pdfWriteStream = createWriteStream(outputPath);
      
      // Generate PDF using streaming method
      await CalendarPDFService.generateStudyPlanPDFToStream(
        studyPlan, 
        studentIntake, 
        pdfWriteStream, 
        { filename: `${scenarioName}.pdf` }
      );
      
      // Also generate HTML for debugging (this still uses the old method)
      await CalendarPDFService.generateHTML(studyPlan, studentIntake, { filename: `${scenarioName}.html` });
      
      const pdfDocTime = Date.now() - pdfDocStartTime;
      console.log(`      ⏱️  PDF document generation took: ${pdfDocTime}ms`);
      console.log(`      📁 PDF generated with streaming: ${scenarioName}.pdf (${path.resolve(outputPath)})`);
      
    } catch (error) {
      console.error(`      ❌ Failed to generate PDF with streaming for ${scenarioName}:`, error);
      console.log(`      🔄 Falling back to non-streaming method...`);
      
      // Fallback to the original method if streaming fails
      const { CalendarPDFService } = await import('../src/services/CalendarPDFService');
      await CalendarPDFService.generateStudyPlanPDF(studyPlan, studentIntake, { filename: `${scenarioName}.pdf` });
      await CalendarPDFService.generateHTML(studyPlan, studentIntake, { filename: `${scenarioName}.html` });
      
      const pdfDocTime = Date.now() - pdfDocStartTime;
      console.log(`      ⏱️  PDF document generation (fallback) took: ${pdfDocTime}ms`);
      console.log(`      📁 PDF generated (fallback): ${scenarioName}.pdf`);
    }
  }



  /**
   * Generate collage document with all scenarios
   */
  private async generateCollage(scenarioData: Array<{
    name: string;
    startDate: string;
    targetYear: number;
    planDuration: string;
    svgTimeline: string;
  }>): Promise<void> {
    try {
      const collageStartTime = Date.now();
      console.log(`    🎨 Generating collage document...`);
      
      // Generate collage document using dedicated CollageService
      const document = await CollageService.generateCollageDocument(scenarioData);
      
      const collageGenTime = Date.now() - collageStartTime;
      console.log(`    ⏱️  Collage document generation took: ${collageGenTime}ms`);
      
      const collageSaveStartTime = Date.now();
      await this.saveDocument(document, 'ScenarioCollage');
      const collageSaveTime = Date.now() - collageSaveStartTime;
      console.log(`    ⏱️  Collage document save took: ${collageSaveTime}ms`);
      
      console.log(`✅ Generated collage document: ScenarioCollage.docx`);
    } catch (error) {
      console.error(`❌ Failed to generate collage document:`, error);
    }
  }

  /**
   * Generate a JavaScript format document
   */
  private generateJSFormatDocument(plan: StudyPlan, intake: StudentIntake, scenario: TestScenario): string {
    const jsContent = `// Generated Study Plan for ${scenario.name}
// Start Date: ${intake.start_date}
// Target Year: ${intake.target_year}
// Catch-up Day Preference: ${intake.study_strategy?.catch_up_day_preference || 'Not set'}
// Test Day Preference: ${intake.study_strategy?.test_day_preference || 'Not set'}

const studyPlan = ${JSON.stringify(plan, null, 2)};

const studentIntake = ${JSON.stringify(intake, null, 2)};

module.exports = {
  studyPlan,
  studentIntake,
  scenario: '${scenario.name}',
  generatedAt: new Date().toISOString()
};
`;
    return jsContent;
  }

  /**
   * Generate Markdown document for debugging
   */
  private generateMarkdownDocument(studyPlan: StudyPlan, scenario: any): string {
    let markdown = `# ${studyPlan.plan_title}

## Scenario Information
- **Test Case**: ${scenario.name}
- **Description**: ${scenario.description}
- **Study Plan ID**: ${studyPlan.study_plan_id}
- **Target Year**: ${scenario.intake.target_year || 'Not specified'}
- **Generated**: ${new Date().toISOString()}

## 🚨 DEBUG INFO - Plan Structure Analysis

### Plan Metadata
\`\`\`json
{
  "title": "${studyPlan.plan_title}",
  "study_plan_id": "${studyPlan.study_plan_id}",
  "cycles_count": ${studyPlan.cycles?.length || 0},
  "target_year": "${studyPlan.targeted_year || 'Not specified'}",
  "has_resources": ${!!studyPlan.curated_resources}
}
\`\`\`

### Cycles Debug Info
\`\`\`json
${JSON.stringify(studyPlan.cycles, null, 2)}
\`\`\`

### Detailed Cycle Analysis
`;

    if (studyPlan.cycles && studyPlan.cycles.length > 0) {
      studyPlan.cycles.forEach((cycle: any, index: number) => {
        const cycleStartDate = cycle.cycleStartDate ? new Date(cycle.cycleStartDate).toLocaleDateString() : 'TBD';
        const cycleEndDate = cycle.cycleEndDate ? new Date(cycle.cycleEndDate).toLocaleDateString() : 'TBD';
        markdown += `\n#### Cycle ${index + 1}: ${cycle.cycleName || 'Unnamed'}
- **Type**: ${cycle.cycleType || 'Unknown'}
- **Blocks**: ${cycle.cycleBlocks?.length || 0}
- **Duration**: ${cycle.cycleDuration || 0} weeks
- **Dates**: ${cycleStartDate} - ${cycleEndDate}

`;

        if (cycle.cycleBlocks && cycle.cycleBlocks.length > 0) {
          markdown += `**Blocks Detail**:\n`;
          cycle.cycleBlocks.forEach((block: any, blockIndex: number) => {
            const blockDates = this.calculateBlockDates(cycle, block, 0);
            markdown += `- Block ${blockIndex + 1}: ${block.block_title || 'Untitled'}
  - Duration: ${block.duration_weeks || 0} weeks
  - Dates: ${blockDates.start} - ${blockDates.end}
  - Subjects: ${block.subjects?.join(', ') || 'None'}
  - Estimated Hours: ${block.estimated_hours || 0}

`;
          });
        } else {
          markdown += `⚠️ **No blocks in this cycle**\n\n`;
        }
      });
    } else {
      markdown += `⚠️ **NO CYCLES GENERATED - This indicates a problem with plan generation**\n\n`;
    }

    markdown += `### Resource Information
\`\`\`json
${JSON.stringify(studyPlan.curated_resources, null, 2)}
\`\`\`

### Total Plan Statistics
- **Total Blocks**: ${this.countTotalBlocks(studyPlan)}
- **Total Weeks**: ${this.calculateTotalWeeks(studyPlan)}
- **Total Subjects**: ${this.calculateTotalSubjects(studyPlan)}

---

## 📚 Resource Summary

### Essential Resources
${studyPlan.curated_resources?.essential_resources?.map(resource =>
      `- **${resource.resource_title}** (${resource.resource_priority}) - ${resource.resource_cost?.type === 'Free' ? 'Free' : `₹${(resource.resource_cost as any)?.amount || 'N/A'}`} - ${resource.estimated_hours}h`
    ).join('\n') || 'No essential resources found'}

### Budget Summary
${studyPlan.curated_resources?.budget_summary ?
        `- **Total Cost**: ₹${studyPlan.curated_resources.budget_summary.total_cost}
- **Essential Cost**: ₹${studyPlan.curated_resources.budget_summary.essential_cost}
- **Optional Cost**: ₹${studyPlan.curated_resources.budget_summary.optional_cost}
- **Free Alternatives**: ${studyPlan.curated_resources.budget_summary.free_alternatives}
- **Subscription Cost**: ₹${studyPlan.curated_resources.budget_summary.subscription_cost}` :
        'No budget information available'}

### Block-Level Resources
${studyPlan.cycles?.map(cycle =>
          cycle.cycleBlocks?.map(block =>
            `#### ${block.block_title}
- **Primary Books**: ${block.block_resources?.primary_books?.length || 0}
- **Current Affairs**: ${block.block_resources?.current_affairs_sources?.length || 0}
- **Practice Resources**: ${block.block_resources?.practice_resources?.length || 0}
- **Video Content**: ${block.block_resources?.video_content?.length || 0}`
          ).join('\n')
        ).join('\n') || 'No block resources found'}

---

*This file was generated for debugging study plan structure. Check the JSON objects above to identify why cycles or blocks might be empty.*
`;

    return markdown;
  }

  /**
   * Save markdown file
   */
  private async saveMarkdown(content: string, filename: string): Promise<void> {
    const filePath = path.join(this.outputDir, `${filename}.md`);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`📝 Markdown saved: ${filename}.md`);
    console.log(`   📁 Location: ${path.resolve(filePath)}`);
  }

  /**
   * Generate comprehensive JSON data for debugging
   */
  private generateJsonData(result: { plan: StudyPlan; logs: LogEntry[] }, intake: StudentIntake): string {
    const jsonData = { intake: intake, plan: result.plan };
    return JSON.stringify(jsonData, null, 2);
  }

  /**
   * Save JSON debug file
   */
  private async saveJS(content: string, filename: string): Promise<void> {
    const filePath = path.join(this.outputDir, `${filename}.js`);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`📊 JS saved: ${filename}.js`);
    console.log(`   📁 Location: ${path.resolve(filePath)}`);
  }

  private async saveJson(content: string, filename: string): Promise<void> {
    const filePath = path.join(this.outputDir, `${filename}.js`);
    const wrappedContent = `window.studyPlanData = ${content};`;
    fs.writeFileSync(filePath, wrappedContent, 'utf8');
    console.log(`📊 JSON saved: ${filename}.js`);
    console.log(`   📁 Location: ${path.resolve(filePath)}`);
  }





  /**
   * Save document to file
   */
  private async saveDocument(document: Document, filename: string): Promise<void> {
    const bufferStartTime = Date.now();
    const buffer = await Packer.toBuffer(document);
    const bufferTime = Date.now() - bufferStartTime;
    console.log(`        ⏱️  Document buffer creation took: ${bufferTime}ms`);
    
    const filePath = path.join(this.outputDir, `${filename}.docx`);

    const writeStartTime = Date.now();
    // Write the document to file system
    fs.writeFileSync(filePath, buffer);
    const writeTime = Date.now() - writeStartTime;
    console.log(`        ⏱️  File write took: ${writeTime}ms`);

    console.log(`✅ Document saved: ${filename}.docx (${buffer.length} bytes)`);
    console.log(`   📁 Location: ${path.resolve(filePath)}`);
  }

  /**
。

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

  private getArchetype(): Archetype {
    return {
      archetype: 'Test Archetype',
      timeCommitment: 'FullTime',
      weeklyHoursMin: 40,
      weeklyHoursMax: 50,
      description: 'Student focusing on 2 subjects with balanced approach',
      defaultPacing: 'Balanced',
      defaultApproach: 'SingleSubject',
      specialFocus: ['GS', 'Optional']
    };
  }

  private makeIntake(targetYear: string, startDate: string): StudentIntake {
    return createStudentIntake({
      ...dummyStuff,
      subject_approach: 'DualSubject',
      subject_confidence: {
        'H01': 'VeryStrong',
        'H02': 'VeryStrong',
        'H03': 'VeryStrong',
        'H04': 'VeryStrong',
        'H05': 'VeryStrong',
        'G': 'VeryStrong',
        'B': 'Moderate',
        'T': 'Weak',
        'P': 'Moderate',
        'E': 'Moderate'
      },
      study_strategy: {
        study_focus_combo: 'GSPlusOptionalPlusCSAT',
        weekly_study_hours: '45-55',
        time_distribution: 'Balanced',
        study_approach: 'Balanced',
        revision_strategy: 'Weekly',
        test_frequency: 'Weekly',
        seasonal_windows: ['Foundation', 'Revision', 'Intensive'],
        upsc_optional_subject: 'OPT-AGR'
      },
      target_year: targetYear,
      start_date: startDate
    });
  }

  private getTestConfig() {
    return DEFAULT_CONFIG;
  }

  // Helper methods for calculations

  /**
   * Calculate block start and end dates based on cycle dates and block position
   */
  private calculateBlockDates(cycle: any, block: any, _blockIndex: number): { start: string; end: string } {
    if (!cycle.cycleStartDate) {
      return { start: 'TBD', end: 'TBD' };
    }

    const cycleStartDate = new Date(cycle.cycleStartDate);

    // Calculate the start date by adding weeks from previous blocks
    let cumulativeWeeks = 0;
    for (let i = 0; i < _blockIndex; i++) {
      cumulativeWeeks += cycle.cycleBlocks[i]?.duration_weeks || 0;
    }

    const blockStartDate = new Date(cycleStartDate);
    blockStartDate.setDate(blockStartDate.getDate() + (cumulativeWeeks * 7));

    const blockEndDate = new Date(blockStartDate);
    blockEndDate.setDate(blockEndDate.getDate() + ((block.duration_weeks || 1) * 7) - 1);

    return {
      start: blockStartDate.toLocaleDateString(),
      end: blockEndDate.toLocaleDateString()
    };
  }

  private calculateTotalWeeks(studyPlan: StudyPlan): number {
    if (studyPlan.cycles) {
      return studyPlan.cycles.reduce((total: number, cycle: any) => {
        return total + this.calculateCycleDuration(cycle);
      }, 0);
    }
    return 0;
  }

  private calculateCycleDuration(cycle: any): number {
    if (cycle.cycleBlocks) {
      return cycle.cycleBlocks.reduce((total: number, block: any) => {
        return total + (block.duration_weeks || 0);
      }, 0);
    }
    return 0;
  }

  private countTotalBlocks(studyPlan: StudyPlan): number {
    if (studyPlan.cycles) {
      return studyPlan.cycles.reduce((total: number, cycle: any) => {
        return total + (cycle.cycleBlocks?.length || 0);
      }, 0);
    }
    return 0;
  }


  private calculateTotalSubjects(studyPlan: StudyPlan): number {
    if (!studyPlan.cycles) return 0;

    const allSubjects = new Set<string>();

    studyPlan.cycles.forEach((cycle: any) => {
      if (cycle.cycleBlocks) {
        cycle.cycleBlocks.forEach((block: any) => {
          if (block.subjects) {
            block.subjects.forEach((subject: string) => allSubjects.add(subject));
          }
        });
      }
    });

    return allSubjects.size;
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
    
    const generator = new TestDocumentGenerator({
      outputDir: './generated-docs',
      generateMarkdown: false,
      generateJson: true,
      generateWeeklySchedules: false, // Disabled for performance testing
      generatePDFs: false, // Enable PDF generation
      format: cliArgs.format || 'js'
    });

    await generator.generateAllTestDocuments(cliArgs.scenarios);
  } catch (error) {
    console.error('❌ Error running document generation:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

export { TestDocumentGenerator };
