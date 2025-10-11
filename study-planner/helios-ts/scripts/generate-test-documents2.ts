#!/usr/bin/env node

/**
 * Document Generation Script for Helios Test Scenarios
 * 
 * This script generates Word documents for all test scenarios defined in
 * the Oct25-Target*.test.ts files, creating sample study plan documents
 * that can be used for testing and demonstration.
 */

import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType } from 'docx';
import { generateInitialPlan } from '../src/engine/NewEngine-generate-plan';
import { DEFAULT_CONFIG } from '../src/config';
import type { StudentIntake, Archetype, StudyPlan, StudyCycle } from '../src/types/models';
import { ResourceService } from '../src/services/ResourceService';
import { DocumentService } from '../src/services/DocumentService';
import { WeeklyScheduleService } from '../src/services/WeeklyScheduleService';
import { CollageService } from '../src/services/CollageService';
import dayjs from 'dayjs';
import * as path from 'path';
import * as fs from 'fs';
import { LogEntry } from '../src/types/Types';

interface DocumentGeneratorOptions {
  outputDir?: string;
  includeResources?: boolean;
  generateMarkdown?: boolean;
  generateJson?: boolean;
  generateWeeklySchedules?: boolean;
  maxScenarios?: number; // Limit number of scenarios for performance testing
}

class TestDocumentGenerator {
  private outputDir: string;
  private includeResources: boolean;
  private generateMarkdown: boolean;
  private generateJson: boolean;
  private generateWeeklySchedules: boolean;
  private maxScenarios: number;

  constructor(options: DocumentGeneratorOptions = {}) {
    this.outputDir = options.outputDir || './generated-docs';
    this.includeResources = options.includeResources ?? true;
    this.generateMarkdown = options.generateMarkdown ?? true;
    this.generateJson = options.generateJson ?? true;
    this.generateWeeklySchedules = options.generateWeeklySchedules ?? false;
    this.maxScenarios = options.maxScenarios || Infinity;
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
  async generateAllTestDocuments(): Promise<void> {
    const startTime = Date.now();
    console.log('🚀 Starting document generation for all test scenarios...');
    console.log(`📊 Initial ${this.getMemoryUsage()}`);

    // Create output directory
    const dirStartTime = Date.now();
    await this.ensureOutputDirectory();
    console.log(`⏱️  Directory setup took: ${Date.now() - dirStartTime}ms`);
    // Define test scenarios for different target years
    const scenarioSetupStartTime = Date.now();
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
    ];

    const scenarios = startDates.map((startDate, i) => ({
      name: `T${i + 1}`,
      config: this.getTestConfig(),
      archetype: this.getBalancedDualSubjectArchetype(),
      intake: this.makeIntake('2027', startDate),
    }));
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
        if (this.generateJson) {
          const jsonSaveStartTime = Date.now();
          const jsonData = this.generateJsonData(result, result.intake);
          await this.saveJson(jsonData, scenario.name);
          const jsonSaveTime = Date.now() - jsonSaveStartTime;
          console.log(`  ⏱️  JSON save took: ${jsonSaveTime}ms`);
          console.log(`📊 Generated debug JSON: ${scenario.name}.json`);
        }

        const totalScenarioTime = Date.now() - scenarioStartTime;
        console.log(`  ✅ ${scenario.name} completed in: ${totalScenarioTime}ms`);

      } catch (error) {
        console.error(`❌ Failed to generate ${scenario.name}:`, error);
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
        const wordDocStartTime = Date.now();
        const documentPath = await this.generateWordDocument(
          scenario.name, result.plan, result.intake);
        const wordDocTime = Date.now() - wordDocStartTime;
        console.log(`  ⏱️  Word document generation took: ${wordDocTime}ms`);
        
        const docSaveStartTime = Date.now();
        await this.saveDocument(documentPath, scenario.name);
        const docSaveTime = Date.now() - docSaveStartTime;
        console.log(`  ⏱️  Document save took: ${docSaveTime}ms`);

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

        // Generate Markdown file for debugging
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
    
    // Generate the study plan
    const result = await generateInitialPlan(
      'test-user-' + scenario.name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
      scenario.config,
      scenario.archetype,
      scenario.intake
    );

    const planGenTime = Date.now() - planGenStartTime;
    console.log(`    ⏱️  Plan generation completed in: ${planGenTime}ms`);
    console.log(`    📊 Generated ${result.plan.cycles?.length || 0} cycles`);

    return { ...result, intake: scenario.intake };
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
    studyPlan: StudyPlan, studentIntake: StudentIntake): Promise<Document> {
    const wordDocStartTime = Date.now();
    console.log(`      📄 Generating Word document...`);
    
    // Use the actual student intake instead of creating a mock
    const result = await DocumentService.generateDocument(
      scenarioName, studyPlan, studentIntake);
    
    const wordDocTime = Date.now() - wordDocStartTime;
    console.log(`      ⏱️  Word document generation took: ${wordDocTime}ms`);
    
    return result;
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
            const blockDates = this.calculateBlockDates(cycle, block, blockIndex);
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
  private async saveJson(content: string, filename: string): Promise<void> {
    const filePath = path.join(this.outputDir, `${filename}.js`);
    const wrappedContent = `window.studyPlanData = ${content};`;
    fs.writeFileSync(filePath, wrappedContent, 'utf8');
    console.log(`📊 JSON saved: ${filename}.js`);
    console.log(`   📁 Location: ${path.resolve(filePath)}`);
  }

  /**
   * Create executive summary section
   */
  private createExecutiveSummarySection(studyPlan: StudyPlan): Paragraph {
    const summary = `This study plan provides a comprehensive roadmap designed for ${studyPlan.targeted_year || studyPlan.created_for_target_year || 'UPSC'} exam preparation.
    
Total Duration: ${this.calculateTotalWeeks(studyPlan)} weeks
Total Blocks: ${this.countTotalBlocks(studyPlan)}
Study Cycles: ${this.countStudyCycles(studyPlan)}

The plan strategically organizes your study journey through multiple cycles, each tailored to maximize learning efficiency and retention.`;

    return new Paragraph({
      text: summary,
      spacing: { before: 300, after: 300 }
    });
  }

  /**
   * Create plan overview table
   */
  private createPlanOverviewTable(studyPlan: StudyPlan): Table {
    const rows = [
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph('Metric')] }),
          new TableCell({ children: [new Paragraph('Value')] })
        ]
      }),
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph('Study Plan ID')] }),
          new TableCell({ children: [new Paragraph(studyPlan.study_plan_id || 'Generated')] })
        ]
      })
    ];

    // Add more rows with plan data
    rows.push(
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph('Target Year')] }),
          new TableCell({ children: [new Paragraph(String(studyPlan.targeted_year) || studyPlan.created_for_target_year || 'Not specified')] })
        ]
      })
    );

    const table = new Table({
      rows,
      width: {
        size: 100,
        type: WidthType.PERCENTAGE
      }
    });

    return table;
  }

  /**
   * Create blocks table for a cycle
   */
  private createBlocksTable(cycle: any): Table {
    const rows = [
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({
              children: [new TextRun({ text: 'Block Title', bold: true })]
            })]
          }),
          new TableCell({
            children: [new Paragraph({
              children: [new TextRun({ text: 'Duration', bold: true })]
            })]
          }),
          new TableCell({
            children: [new Paragraph({
              children: [new TextRun({ text: 'Resources', bold: true })]
            })]
          })
        ]
      })
    ];

    // Add data rows for each block
    cycle.cycleBlocks.forEach((block: any, blockIndex: number) => {
      const blockDates = this.calculateBlockDates(cycle, block, blockIndex);
      const durationText = `${block.duration_weeks} week(s)\n${blockDates.start} - ${blockDates.end}`;

      // Summarize resources (limit to first 3 for brevity)
      const resourceSummary = this.summarizeBlockResources(block.block_resources);

      rows.push(
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph(block.block_title || 'Untitled')],
              width: { size: 40, type: WidthType.PERCENTAGE }
            }),
            new TableCell({
              children: [new Paragraph(durationText)],
              width: { size: 25, type: WidthType.PERCENTAGE }
            }),
            new TableCell({
              children: [new Paragraph(resourceSummary)],
              width: { size: 35, type: WidthType.PERCENTAGE }
            })
          ]
        })
      );
    });

    const table = new Table({
      rows,
      width: {
        size: 100,
        type: WidthType.PERCENTAGE
      },
      borders: {
        top: { style: 'single', size: 1 },
        bottom: { style: 'single', size: 1 },
        left: { style: 'single', size: 1 },
        right: { style: 'single', size: 1 },
        insideHorizontal: { style: 'single', size: 1 },
        insideVertical: { style: 'single', size: 1 }
      }
    });

    return table;
  }

  /**
   * Summarize block resources for table display
   */
  private summarizeBlockResources(blockResources: any): string {
    if (!blockResources) {
      return 'No resources';
    }

    const summaries: string[] = [];

    if (blockResources.primary_books && blockResources.primary_books.length > 0) {
      summaries.push(`${blockResources.primary_books.length} Books`);
    }

    if (blockResources.video_content && blockResources.video_content.length > 0) {
      summaries.push(`${blockResources.video_content.length} Videos`);
    }

    if (blockResources.practice_resources && blockResources.practice_resources.length > 0) {
      summaries.push(`${blockResources.practice_resources.length} Practice`);
    }

    if (blockResources.current_affairs_sources && blockResources.current_affairs_sources.length > 0) {
      summaries.push(`${blockResources.current_affairs_sources.length} Current Affairs`);
    }

    return summaries.length > 0 ? summaries.join(', ') : 'Resources available';
  }

  /**
   * Create resource summary section
   */
  private createResourceSummarySection(studyPlan: StudyPlan): Paragraph {
    if (!studyPlan.curated_resources) {
      return new Paragraph('No resource data available.');
    }

    const resources = studyPlan.curated_resources;
    const summary = `
Resource Summary:

Essential Resources: ${resources.essential_resources?.length || 0} items
Recommended Timeline: ${Object.keys(resources.recommended_timeline || {}).length} milestones

Budget Overview:
- Essential Cost: ₹${resources.budget_summary?.essential_cost || 0}
- Optional Cost: ₹${resources.budget_summary?.optional_cost || 0}
- Free Alternatives: ${resources.budget_summary?.free_alternatives || 0} options
`;

    return new Paragraph({
      text: summary,
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 400, after: 200 }
    });
  }

  /**
   * Create detailed cycles sections
   */
  private createDetailedCyclesSections(studyPlan: StudyPlan): (Paragraph | Table)[] {
    if (!studyPlan.cycles || studyPlan.cycles.length === 0) {
      return [new Paragraph('No cycles available in this study plan.')];
    }

    const sections: (Paragraph | Table)[] = [];

    // Add heading for cycles section
    sections.push(
      new Paragraph({
        text: 'Study Plan Structure',
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 400 }
      })
    );

    // Process each cycle
    studyPlan.cycles.forEach((cycle, index: number) => {
      sections.push(
        new Paragraph({
          text: `Cycle ${index + 1}: ${cycle.cycleName || cycle.cycleType}`,
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 300 }
        })
      );

      if (cycle.cycleBlocks && cycle.cycleBlocks.length > 0) {
        const cycleStartDate = cycle.cycleStartDate ? new Date(cycle.cycleStartDate).toLocaleDateString() : 'TBD';
        const cycleEndDate = cycle.cycleEndDate ? new Date(cycle.cycleEndDate).toLocaleDateString() : 'TBD';
        const cycleSummary = `Duration: ${this.calculateCycleDuration(cycle)} weeks | Blocks: ${cycle.cycleBlocks.length} | Dates: ${cycleStartDate} - ${cycleEndDate}`;
        sections.push(
          new Paragraph({
            text: cycleSummary,
            spacing: { after: 200 }
          })
        );

        // Add blocks table
        if (cycle.cycleBlocks && cycle.cycleBlocks.length > 0) {
          sections.push(
            new Paragraph({
              text: 'Blocks Summary',
              heading: HeadingLevel.HEADING_4,
              spacing: { before: 300, after: 200 }
            })
          );

          const blocksTable = this.createBlocksTable(cycle);
          sections.push(blocksTable);
        }
      }
    });

    return sections;
  }

  /**
   * Create study strategy section
   */
  private createStudyStrategySection(studyPlan: StudyPlan): Paragraph {
    const strategy = `
Recommended Study Strategy:

Phase 1: Foundation Building (Weeks 1-8)
- Focus on understanding core concepts
- Establish daily study routines
- Build subject-matter familiarity

Phase 2: Intensive Practice (Weeks 9-16)
- Implement active learning techniques
- Regular practice tests and assessments
- Strengthen weak areas

Phase 3: Consolidation (Weeks 17-20)
- Comprehensive revision cycles
- Mock examinations
- Final preparation and confidence building

Study Tips:
• Maintain consistent daily study schedule
• Practice with past papers regularly
• Focus on application-based learning
• Stay updated with current affairs
• Regular self-assessment and adjustment
`;

    return new Paragraph({
      text: strategy,
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 400, after: 200 }
    });
  }

  /**
   * Create resource budget section
   */
  private createResourceBudgetSection(curatedResources: any): Paragraph {
    const budget = `
Resource Budget Breakdown:

ESSENTIAL RESOURCES:
Total Cost: ₹${curatedResources.budget_summary?.total_cost || 0}

Investment Distribution:
• Core Study Materials: ₹${curatedResources.budget_summary?.essential_cost || 0}
• Supplementary Materials: ₹${curatedResources.budget_summary?.optional_cost || 0}

Cost-Free Options:
• Free Alternatives Available: ${curatedResources.budget_summary?.free_alternatives || 0} resources
• Additional free resources recommended based on budget constraints

Financial Planning Tips:
• Essential resources should take priority in your budget
• Consider subscription costs for premium content
• Free alternatives can complement paid resources effectively
`;

    return new Paragraph({
      text: budget,
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 400, after: 200 }
    });
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

  private getBalancedDualSubjectArchetype(): Archetype {
    return {
      archetype: 'BalancedDualSubject',
      timeCommitment: 'FullTime',
      weeklyHoursMin: 40,
      weeklyHoursMax: 50,
      description: 'Student focusing on 2 subjects with balanced approach',
      defaultPacing: 'Balanced',
      defaultApproach: 'DualSubject',
      specialFocus: ['GS', 'Optional']
    };
  }

  private getBalancedDualSubjectIntake(targetYear: string = '2026'): Omit<StudentIntake, 'start_date'> {
    return {
      subject_confidence: {
        'H01': 'Moderate',
        'H02': 'Moderate',
        'G': 'Moderate'
      },
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
      target_year: targetYear
    };
  }

  private getSingleSubjectArchetype(): Archetype {
    return {
      archetype: 'FocusSingleSubject',
      timeCommitment: 'PartTime',
      weeklyHoursMin: 25,
      weeklyHoursMax: 35,
      description: 'Student focusing on single subject for intensive preparation',
      defaultPacing: 'StrongFirst',
      defaultApproach: 'SingleSubject',
      specialFocus: ['GS']
    };
  }

  private getSingleSubjectIntake(targetYear: string = '2027'): Omit<StudentIntake, 'start_date'> {
    return {
      subject_confidence: {
        'H01': 'VeryStrong',
        'H02': 'Moderate',
        'H03': 'Weak'
      },
      study_strategy: {
        study_focus_combo: 'OneGS',
        weekly_study_hours: '25-35',
        time_distribution: 'Intensive',
        study_approach: 'Balanced',
        revision_strategy: 'Daily',
        test_frequency: 'BiWeekly',
        seasonal_windows: ['Foundation'],
        catch_up_day_preference: 'Saturday'
      },
      target_year: targetYear
    };
  }

  private getComprehensiveGSArchetype(): Archetype {
    return {
      archetype: 'ComprehensiveGS',
      timeCommitment: 'FullTime',
      weeklyHoursMin: 45,
      weeklyHoursMax: 55,
      description: 'Comprehensive GS preparation with extensive coverage',
      defaultPacing: 'Balanced',
      defaultApproach: 'TripleSubject',
      specialFocus: ['GS', 'Current_Affairs']
    };
  }

  private makeIntake(targetYear: string, startDate: string): StudentIntake {
    return {
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
        catch_up_day_preference: 'Sunday'
      },
      target_year: targetYear,
      start_date: startDate
    };
  }

  private getTestConfig() {
    return DEFAULT_CONFIG;
  }

  // Helper methods for calculations

  /**
   * Calculate block start and end dates based on cycle dates and block position
   */
  private calculateBlockDates(cycle: any, block: any, blockIndex: number): { start: string; end: string } {
    if (!cycle.cycleStartDate) {
      return { start: 'TBD', end: 'TBD' };
    }

    const cycleStartDate = new Date(cycle.cycleStartDate);

    // Calculate the start date by adding weeks from previous blocks
    let cumulativeWeeks = 0;
    for (let i = 0; i < blockIndex; i++) {
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

  private countStudyCycles(studyPlan: StudyPlan): number {
    return studyPlan.cycles?.length || 0;
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
    const generator = new TestDocumentGenerator({
      outputDir: './generated-docs',
      includeResources: true,
      generateMarkdown: false,
      generateJson: true,
      generateWeeklySchedules: false, // Disabled for performance testing
      maxScenarios: 3 // Limit to 3 scenarios for performance testing
    });

    await generator.generateAllTestDocuments();
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
