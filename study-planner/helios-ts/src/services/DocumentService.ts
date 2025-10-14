import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, BorderStyle, AlignmentType, Header, Footer, ImageRun, HeadingLevel } from 'docx';
import type { StudyPlan, StudyCycle, Block, BlockResources, Resource, StudentIntake } from '../types/models';
import { ResourceService } from './ResourceService';
import { ConfigService } from './ConfigService';
import dayjs from 'dayjs';

// Document structure interfaces
interface DocumentSection {
  type: 'title' | 'heading' | 'paragraph' | 'table' | 'list' | 'rich_paragraph' | 'svg_timeline' | 'scenario_collage';
  content: string | TableData | ListData | RichTextContent | ScenarioCollageData;
  style?: string;
  level?: number;
}

interface RichTextContent {
  elements: TextElement[];
}

interface TextElement {
  text: string;
  bold?: boolean;
  italics?: boolean;
  color?: string;
}

interface ScenarioCollageData {
  scenarios: Array<{
    name: string;
    startDate: string;
    targetYear: number;
    planDuration: string;
    svgTimeline: string;
  }>;
}

// Centralized style configuration
const DOCUMENT_STYLES = {
  font: 'Aptos', // Alternative: 'Arial', 'Georgia', 'Cambria'
  colors: {
    primary: '2E5BBA',
    secondary: '666666',
    text: '333333',
    success: '28A745',
    warning: 'FFC107',
    info: '17A2B8',
    error: 'FF6B6B'
  },
  sizes: {
    title: 36,
    subtitle: 24,
    heading1: 28,
    heading2: 24,
    body: 20,
    small: 18
  },
  spacing: {
    cellPadding: 100,
    paragraphAfter: 200,
    headingBefore: 400,
    headingAfter: 200
  }
} as const;

// Color mapping for different cycle types
  const CYCLE_TYPE_COLORS = {
  'C1': 'E3F2FD', // Very light blue
  'C2': 'E8F5E8', // Very light green  
  'C3': 'FCE4EC', // Very light pink
  'C4': 'FFEBEE', // Very light red
  'C5': 'F3E5F5', // Very light purple
  'C6': 'E1F5FE', // Very light cyan
  'C7': 'FFF3E0', // Very light orange
  'C8': 'F1F8E9', // Very light lime
  } as const;

interface TableData {
  headers: string[];
  rows: (string | Paragraph[])[][];
  style?: string;
  rowColors?: string[]; // Optional array of colors for each row
}

interface ListData {
  items: string[];
  style?: string;
}

interface DocumentStructure {
  title: string;
  sections: DocumentSection[];
  metadata: {
    startDate: dayjs.Dayjs;
    targetYear: number;
    generatedDate: string;
    planId: string;
  };
}

/**
 * Browser-compatible document generation service
 * Generates Word documents from StudyPlan data for immediate download
 */
export class DocumentService {
  
  /**
   * Generate and download a Word document from StudyPlan data
   */
  static async generateAndDownloadDocument(studyPlan: StudyPlan, studentIntake: StudentIntake, filename?: string): Promise<void> {
    try {
      const document = await this.generateDocument(null, studyPlan, studentIntake);
      await this.downloadDocument(document, filename || `study-plan-${studyPlan.study_plan_id}.docx`);
    } catch (error) {
      console.error('Failed to generate document:', error);
      throw new Error('Document generation failed');
    }
  }

  /**
   * Generate document with scenario collage
   */
  static async generateDocumentWithCollage(
    scenarioName: string|null,
    studyPlan: StudyPlan, 
    studentIntake: StudentIntake,
    scenarioData: Array<{
      name: string;
      startDate: string;
      targetYear: number;
      planDuration: string;
      svgTimeline: string;
    }>
  ): Promise<Document> {
    const documentStructure = await this.generateDocumentStructureWithCollage(
      scenarioName, studyPlan, studentIntake, scenarioData);
    const wordElements = this.mapToWordElements(documentStructure);
    
    const document = new Document({
      styles: this.getDocumentStyles(),
      sections: [
        {
          children: wordElements,
          properties: {
            page: {
              margin: {
                top: 1440,
                right: 1440,
                bottom: 1440,
                left: 1440,
              },
            },
          },
        },
      ],
    });

    return document;
  }

  /**
   * Generate Word document from StudyPlan data using two-phase approach
   */
  static async generateDocument(
    scenarioName: string|null,
    studyPlan: StudyPlan, studentIntake: StudentIntake): Promise<Document> {
    // Phase 1: Generate document structure
    const documentStructure = await this.generateDocumentStructure(
      scenarioName,
      studyPlan, studentIntake);
    
    // Phase 2: Map to Word objects
    const wordElements = this.mapToWordElements(documentStructure);
    
    const document = new Document({
      styles: this.getDocumentStyles(),
      sections: [
        {
          properties: {},
          headers: {
            default: this.createHeader(studyPlan, studentIntake),
          },
          footers: {
            default: this.createFooter(),
          },
          children: wordElements
        }
      ]
    });

    return document;
  }

  /**
   * Phase 1: Generate document structure
   */
  private static async generateDocumentStructure(
    scenarioName: string|null,
    studyPlan: StudyPlan, studentIntake: StudentIntake): Promise<DocumentStructure> {
    return {
      title: studyPlan.plan_title || 'Study Plan',
      metadata: {
        startDate: dayjs(studentIntake.start_date),
        targetYear: studyPlan.targeted_year || 2026,
        generatedDate: new Date().toISOString(),
        planId: studyPlan.study_plan_id || 'unknown'
      },
      sections: [
        {
          type: 'heading',
          content: scenarioName ? `Study Plan Overview (${scenarioName})` : 'Study Plan Overview',
          style: 'Heading2',
          level: 2
        },
        {
          type: 'svg_timeline',
          content: this.generateTimelineSVG(studyPlan),
          style: 'TimelineSVG'
        },
        ...this.generateStudyPlanSummaryElements(studyPlan, studentIntake),
        {
          type: 'heading',
          content: 'Student Profile',
          style: 'Heading2',
          level: 2
        },
        {
          type: 'table',
          content: this.generateStudentProfileTable(studentIntake),
          style: 'ProfileTableNoBorder'
        },
        {
          type: 'heading',
          content: 'Study Blocks',
          style: 'Heading2',
          level: 2
        },
        ...this.generateCycleTables(studyPlan),
        {
          type: 'heading',
          content: 'Resources',
          style: 'Heading2',
          level: 2
        },
        ...await this.generateResourcesSections(studyPlan),
        {
          type: 'paragraph',
          content: this.generateFooterText(),
          style: 'Footer'
        }
      ]
    };
  }

  /**
   * Generate document structure with scenario collage
   */
  private static async generateDocumentStructureWithCollage(
    _scenarioName: string|null,
    studyPlan: StudyPlan, 
    studentIntake: StudentIntake,
    scenarioData: Array<{
      name: string;
      startDate: string;
      targetYear: number;
      planDuration: string;
      svgTimeline: string;
    }>
  ): Promise<DocumentStructure> {
    return {
      title: studyPlan.plan_title || 'Scenario Overview Collage',
      metadata: {
        startDate: dayjs(studentIntake.start_date),
        targetYear: studyPlan.targeted_year || 2026,
        generatedDate: new Date().toISOString(),
        planId: studyPlan.study_plan_id || 'unknown'
      },
      sections: [
        {
          type: 'scenario_collage',
          content: { scenarios: scenarioData },
          style: 'ScenarioCollage'
        },
        {
          type: 'paragraph',
          content: this.generateFooterText(),
          style: 'Footer'
        }
      ]
    };
  }

  /**
   * Phase 2: Map document structure to Word objects
   */
  private static mapToWordElements(documentStructure: DocumentStructure): (Paragraph | Table)[] {
    const elements: (Paragraph | Table)[] = [];
    const planDuration = calculateDuration(
      documentStructure.metadata.startDate,
      documentStructure.metadata.targetYear);
    // Add title
    elements.push(new Paragraph({
      children: [new TextRun({ text: documentStructure.title })],
      style: 'Title'
    }));
    
    // Add subtitle
    elements.push(new Paragraph({
      children: [new TextRun({ 
        text: `Start Date: ${documentStructure.metadata.startDate.format('DD/MM/YYYY')} | Target Year: ${documentStructure.metadata.targetYear} (${planDuration})`,
        italics: true
      })],
      style: 'Subtitle'
    }));
    
    // Map sections - EXPERIMENT: Only headings
    documentStructure.sections.forEach(section => {
      switch (section.type) {
        case 'heading':
          elements.push(new Paragraph({
            children: [new TextRun({ text: section.content as string })],
            style: section.style || 'Heading1'
          }));
          break;
          
        case 'paragraph':
          elements.push(new Paragraph({
            children: [new TextRun({ text: section.content as string })],
            style: section.style || 'BodyText'
          }));
          break;
          
        case 'rich_paragraph':
          const richContent = section.content as RichTextContent;
          elements.push(new Paragraph({
            children: richContent.elements.map(element => new TextRun({
              text: element.text,
              bold: element.bold,
              italics: element.italics,
              color: element.color,
              size: DOCUMENT_STYLES.sizes.body,
              font: DOCUMENT_STYLES.font
            })),
            style: section.style || 'BodyText'
          }));
          break;
          
        case 'table':
          elements.push(this.createTableFromData(section.content as TableData, section.style));
          break;
          
        case 'list':
          elements.push(...this.createListFromData(section.content as ListData, section.style));
          break;
        case 'svg_timeline':
          elements.push(this.createSVGImage(section.content as string));
          break;
        case 'scenario_collage':
          elements.push(...this.generateScenarioCollageTable(section.content as ScenarioCollageData));
          break;
      }
    });
    
    // Footer is now included in sections
    
    return elements;
  }
  /**
     * Generate elegant SVG timeline for study cycles
     */
  /**
   * Generate timeline SVG for study plan
   */
  static generateTimelineSVG(studyPlan: StudyPlan): string {
    const cycles = studyPlan.cycles || [];
    if (cycles.length === 0) return '';

    // Timeline dimensions
    const width = 700;
    const cycleHeight = 60;
    const padding = 40;
    const timelineWidth = 4;
    const markerRadius = 8;
    const totalHeight = cycles.length * cycleHeight + padding * 2;

    // Cycle colors mapping - much lighter backgrounds
    const cycleColors: Record<string, string> = {
      'C1': '#e3f2fd', // Very light blue
      'C2': '#e8f5e8', // Very light green  
      'C3': '#fce4ec', // Very light pink
      'C4': '#ffebee', // Very light red
      'C5': '#f3e5f5', // Very light purple
      'C6': '#e1f5fe', // Very light cyan
      'C7': '#fff3e0', // Very light orange
      'C8': '#f1f8e9', // Very light lime
    };

    // Border colors for contrast
    const borderColors: Record<string, string> = {
      'C1': '#2196f3', // Blue border
      'C2': '#4caf50', // Green border
      'C3': '#e91e63', // Pink border
      'C4': '#f44336', // Red border
      'C5': '#9c27b0', // Purple border
      'C6': '#00bcd4', // Cyan border
      'C7': '#ff9800', // Orange border
      'C8': '#8bc34a', // Lime border
    };

    let svg = `<svg width="${width}" height="${totalHeight}" xmlns="http://www.w3.org/2000/svg">`;

    // Add scenario code at the top if available
    if (studyPlan.scenario) {
      svg += `<text x="20" y="20" font-family="Arial, Helvetica, sans-serif" font-size="14" font-weight="bold" fill="#667eea" text-anchor="start">${studyPlan.scenario}</text>`;
    }

    // Timeline axis - centered horizontally
    const axisX = padding - 30;
    svg += `<line x1="${axisX}" y1="${padding}" x2="${axisX}" y2="${totalHeight - padding}" stroke="#667eea" stroke-width="${timelineWidth}" stroke-linecap="round"/>`;

    // Generate cycle elements
    cycles.forEach((cycle, index) => {
      const y = padding + (index * cycleHeight) + (cycleHeight / 2);
      const backgroundColor = cycleColors[cycle.cycleType] || '#f5f5f5';
      const borderColor = borderColors[cycle.cycleType] || '#666666';

      // Timeline marker
      svg += `<circle cx="${axisX}" cy="${y}" r="${markerRadius}" fill="${borderColor}" stroke="white" stroke-width="2"/>`;

      // Cycle card background - centered around timeline
      const cardWidth = width * 0.8; // 80% of total width
      const cardX = padding; // Center the card
      const cardY = y - 20;

      svg += `<rect x="${cardX}" y="${cardY}" width="${cardWidth}" height="40" fill="${backgroundColor}" stroke="${borderColor}" stroke-width="1.5" rx="6"/>`;

      // Cycle type badge - positioned to the left of center
      const badgeX = cardX + 20;
      svg += `<rect x="${badgeX}" y="${cardY + 6}" width="24" height="12" fill="${borderColor}" rx="2"/>`;
      svg += `<text x="${badgeX + 12}" y="${cardY + 14}" font-family="Arial, Helvetica, sans-serif" font-size="8" font-weight="bold" fill="white" text-anchor="middle">${cycle.cycleType}</text>`;

      // Cycle name - positioned to the right of badge
      svg += `<text x="${badgeX + 35}" y="${cardY + 16}" font-family="Arial, Helvetica, sans-serif" font-size="12" font-weight="600" fill="#1a1a1a">${cycle.cycleName}</text>`;

      const cycleStartDate = cycle.cycleStartDate;
      const cycleEndDate = cycle.cycleEndDate;
      // Duration info - below cycle name
      const durationText = `${cycle.cycleDuration} weeks (${cycleStartDate} - ${cycleEndDate})`;
      svg += `<text x="${badgeX + 35}" y="${cardY + 30}" font-family="Arial, Helvetica, sans-serif" font-size="10" fill="#4a4a4a">${durationText}</text>`;

      // Date range (compact) - positioned to the right
      const startDate = cycle.cycleStartDate ? new Date(cycle.cycleStartDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'TBD';
      const endDate = cycle.cycleEndDate ? new Date(cycle.cycleEndDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'TBD';
      const dateText = `${startDate} - ${endDate}`;
      svg += `<text x="${cardX + cardWidth - 20}" y="${cardY + 16}" font-family="Arial, Helvetica, sans-serif" font-size="10" fill="#4a4a4a" text-anchor="end">${dateText}</text>`;

      // Subject count - below date range
      const subjectCount = this.getUniqueSubjects(cycle.cycleBlocks).length;
      svg += `<text x="${cardX + cardWidth - 20}" y="${cardY + 30}" font-family="Arial, Helvetica, sans-serif" font-size="10" fill="#4a4a4a" text-anchor="end">${subjectCount} subjects</text>`;
    });

    svg += `</svg>`;
    return svg;
  }

  /**
   * Create SVG image element for Word document
   */
  private static createSVGImage(svgString: string): Paragraph {
    try {
      // Create image run with proper SVG configuration
      const imageRun = new ImageRun({
        data: Buffer.from(svgString),
        type: 'svg',
        fallback: {
          data: Buffer.from(svgString),
          type: 'png',
        },
        transformation: {
          width: 700,
          height: 400,
        },
      });

      return new Paragraph({
        children: [imageRun],
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 }
      });
    } catch (error) {
      console.warn('Failed to create SVG image:', error);
      // Fallback to text description
      return new Paragraph({
        children: [new TextRun({
          text: '[Timeline visualization would appear here]',
          italics: true,
          color: DOCUMENT_STYLES.colors.secondary
        })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 }
      });
    }
  }

  /**
   * Generate scenario collage table with 2 columns
   */
  private static generateScenarioCollageTable(collageData: ScenarioCollageData): (Paragraph | Table)[] {
    const elements: (Paragraph | Table)[] = [];
    
    // Create header
    elements.push(new Paragraph({
      text: 'Scenario Overview Collage',
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 100, after: 100 }
    }));

    // Create table with 2 columns
    const rows: TableRow[] = [];
    
    // Process scenarios in pairs for 2-column layout
    for (let i = 0; i < collageData.scenarios.length; i += 2) {
      const leftScenario = collageData.scenarios[i];
      const rightScenario = collageData.scenarios[i + 1];
      
      const rowCells: TableCell[] = [];
      
      // Left column
      rowCells.push(new TableCell({
        children: [
          new Paragraph({
            children: [new TextRun({ text: leftScenario.name, bold: true, size: 24 })],
            alignment: AlignmentType.CENTER
          }),
          new Paragraph({
            children: [new TextRun({ text: `Start: ${leftScenario.startDate}`, size: 20 })],
            alignment: AlignmentType.CENTER
          }),
          new Paragraph({
            children: [new TextRun({ text: `Target: ${leftScenario.targetYear}`, size: 20 })],
            alignment: AlignmentType.CENTER
          }),
          new Paragraph({
            children: [new TextRun({ text: `Duration: ${leftScenario.planDuration}`, size: 20 })],
            alignment: AlignmentType.CENTER
          }),
          this.createSVGImage(leftScenario.svgTimeline)
        ],
        width: { size: 50, type: WidthType.PERCENTAGE },
        margins: { top: 400, bottom: 400, left: 200, right: 200 }
      }));
      
      // Right column (if exists)
      if (rightScenario) {
        rowCells.push(new TableCell({
          children: [
            new Paragraph({
              children: [new TextRun({ text: rightScenario.name, bold: true, size: 24 })],
              alignment: AlignmentType.CENTER
            }),
            new Paragraph({
              children: [new TextRun({ text: `Start: ${rightScenario.startDate}`, size: 20 })],
              alignment: AlignmentType.CENTER
            }),
            new Paragraph({
              children: [new TextRun({ text: `Target: ${rightScenario.targetYear}`, size: 20 })],
              alignment: AlignmentType.CENTER
            }),
            new Paragraph({
              children: [new TextRun({ text: `Duration: ${rightScenario.planDuration}`, size: 20 })],
              alignment: AlignmentType.CENTER
            }),
            this.createSVGImage(rightScenario.svgTimeline)
          ],
          width: { size: 50, type: WidthType.PERCENTAGE },
          margins: { top: 200, bottom: 200, left: 200, right: 200 }
        }));
      } else {
        // Empty cell for odd number of scenarios
        rowCells.push(new TableCell({
          children: [new Paragraph({ text: '' })],
          width: { size: 50, type: WidthType.PERCENTAGE }
        }));
      }
      
      rows.push(new TableRow({ children: rowCells }));
    }
    
    const table = new Table({
      rows,
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: { style: 'single', size: 1 },
        bottom: { style: 'single', size: 1 },
        left: { style: 'single', size: 1 },
        right: { style: 'single', size: 1 },
        insideHorizontal: { style: 'single', size: 1 },
        insideVertical: { style: 'single', size: 1 }
      }
    });
    
    elements.push(table);
    return elements;
  }

  /**
   * Get unique subjects from cycle blocks
   */
  private static getUniqueSubjects(cycleBlocks: Block[]): string[] {
    const subjects = new Set<string>();
    cycleBlocks?.forEach(block => {
      if (block.subjects) {
        block.subjects.forEach(subject => subjects.add(subject));
      }
    });
    return Array.from(subjects);
  }
  /**
   * Get document styles
   */
  private static getDocumentStyles() {
    return {
      paragraphStyles: [
        {
          id: 'Title',
          name: 'Title',
          basedOn: 'Normal',
          run: { 
            size: DOCUMENT_STYLES.sizes.title, 
            bold: true, 
            color: DOCUMENT_STYLES.colors.primary, 
            font: DOCUMENT_STYLES.font 
          },
          paragraph: { alignment: AlignmentType.CENTER, spacing: { after: 600 } }
        },
        {
          id: 'Subtitle',
          name: 'Subtitle',
          basedOn: 'Normal',
          run: { 
            size: DOCUMENT_STYLES.sizes.subtitle, 
            italics: true, 
            color: DOCUMENT_STYLES.colors.secondary, 
            font: DOCUMENT_STYLES.font 
          },
          paragraph: { alignment: AlignmentType.CENTER, spacing: { after: 800 } }
        },
        {
          id: 'Heading1',
          name: 'Heading 1',
          basedOn: 'Normal',
          run: { 
            size: DOCUMENT_STYLES.sizes.heading1, 
            bold: true, 
            color: DOCUMENT_STYLES.colors.primary, 
            font: DOCUMENT_STYLES.font 
          },
          paragraph: { 
            spacing: { 
              before: DOCUMENT_STYLES.spacing.headingBefore, 
              after: DOCUMENT_STYLES.spacing.headingAfter 
            } 
          }
        },
        {
          id: 'Heading2',
          name: 'Heading 2',
          basedOn: 'Normal',
          run: { 
            size: DOCUMENT_STYLES.sizes.heading2, 
            bold: true, 
            color: DOCUMENT_STYLES.colors.primary, 
            font: DOCUMENT_STYLES.font 
          },
          paragraph: { 
            spacing: { 
              before: 300, 
              after: 150 
            } 
          }
        },
        {
          id: 'Heading3',
          name: 'Heading 3',
          basedOn: 'Normal',
          run: { 
            size: DOCUMENT_STYLES.sizes.body, 
            bold: true, 
            color: DOCUMENT_STYLES.colors.text, 
            font: DOCUMENT_STYLES.font 
          },
          paragraph: { 
            spacing: { 
              before: 150, 
              after: 75 
            } 
          }
        },
        {
          id: 'BodyText',
          name: 'Body Text',
          basedOn: 'Normal',
          run: { 
            size: DOCUMENT_STYLES.sizes.body, 
            color: DOCUMENT_STYLES.colors.text, 
            font: DOCUMENT_STYLES.font 
          },
          paragraph: { 
            spacing: { 
              after: DOCUMENT_STYLES.spacing.paragraphAfter 
            } 
          }
        },
        {
          id: 'ResourceItem',
          name: 'Resource Item',
          basedOn: 'Normal',
          run: { 
            size: DOCUMENT_STYLES.sizes.small, 
            color: DOCUMENT_STYLES.colors.text, 
            font: DOCUMENT_STYLES.font 
          },
          paragraph: { spacing: { after: 100 } }
        },
        {
          id: 'Footer',
          name: 'Footer',
          basedOn: 'Normal',
          run: { 
            size: DOCUMENT_STYLES.sizes.small, 
            color: DOCUMENT_STYLES.colors.secondary, 
            font: DOCUMENT_STYLES.font 
          },
          paragraph: { 
            alignment: AlignmentType.CENTER, 
            spacing: { before: 600, after: 200 } 
          }
        },
        {
          id: 'ResourceTable',
          name: 'ResourceTable',
          basedOn: 'Normal',
          run: { 
            size: DOCUMENT_STYLES.sizes.body, 
            color: DOCUMENT_STYLES.colors.text, 
            font: DOCUMENT_STYLES.font 
          },
          paragraph: { 
            spacing: { after: 200 } 
          }
        },
        {
          id: 'ProfileTable',
          name: 'ProfileTable',
          basedOn: 'Normal',
          run: { 
            size: DOCUMENT_STYLES.sizes.body, 
            color: DOCUMENT_STYLES.colors.text, 
            font: DOCUMENT_STYLES.font 
          },
          paragraph: { 
            spacing: { after: 200 } 
          }
        }
      ]
    };
  }


  /**
   * Generate student profile table data with 4 columns
   */
  private static generateStudentProfileTable(studentIntake: StudentIntake): TableData {
    const rows: string[][] = [];
    
    // Personal Details
    if (studentIntake.personal_details) {
      const pd = studentIntake.personal_details;
      rows.push([
        'Full Name', pd.full_name || 'Not provided',
        'Email', pd.email || 'Not provided'
      ]);
      rows.push([
        'Phone', pd.phone_number || 'Not provided',
        'Location', pd.present_location || 'Not provided'
      ]);
      rows.push([
        'Student Type', pd.student_archetype || 'Not provided',
        'Graduation Stream', pd.graduation_stream || 'Not provided'
      ]);
      rows.push([
        'College/University', pd.college_university || 'Not provided',
        'Year of Passing', pd.year_of_passing?.toString() || 'Not provided'
      ]);
    }
    
    // Preparation Background
    if (studentIntake.preparation_background) {
      const pb = studentIntake.preparation_background;
      rows.push([
        'Preparing Since', pb.preparing_since || 'Not provided',
        'Number of Attempts', pb.number_of_attempts || 'Not provided'
      ]);
      rows.push([
        'Highest Stage', pb.highest_stage_per_attempt || 'Not provided',
        'Last GS Score', (pb.last_attempt_gs_prelims_score && pb.last_attempt_gs_prelims_score > 0) ? pb.last_attempt_gs_prelims_score.toString() : 'N/A'
      ]);
      if (pb.last_attempt_csat_score && pb.last_attempt_csat_score > 0) {
        rows.push([
          'Last CSAT Score', pb.last_attempt_csat_score.toString(),
          '', ''
        ]);
      }
    }
    
    // Coaching Details
    if (studentIntake.coaching_details) {
      const cd = studentIntake.coaching_details;
      rows.push([
        'Prior Coaching', cd.prior_coaching || 'Not provided',
        'Coaching Institute', cd.prior_coaching === 'Yes' ? (cd.coaching_institute_name || 'Not provided') : 'N/A'
      ]);
      rows.push([
        'Prior Mentorship', cd.prior_mentorship || 'Not provided',
        'Mentor Name', cd.prior_mentorship === 'Yes' ? (cd.programme_mentor_name || 'Not provided') : 'N/A'
      ]);
      rows.push([
        'Place of Preparation', cd.place_of_preparation || 'Not provided',
        '', ''
      ]);
    }
    
    // Study Strategy
    if (studentIntake.study_strategy) {
      const ss = studentIntake.study_strategy;
      rows.push([
        'Weekly Study Hours', ss.weekly_study_hours || 'Not provided',
        'Study Approach', ss.study_approach || 'Not provided'
      ]);
      rows.push([
        'Time Distribution', ss.time_distribution || 'Not provided',
        'Revision Strategy', ss.revision_strategy || 'Not provided'
      ]);
      rows.push([
        'Test Frequency', ss.test_frequency || 'Not provided',
        'Catch-up Day', ss.catch_up_day_preference || 'Not provided'
      ]);
      if (ss.seasonal_windows && ss.seasonal_windows.length > 0) {
        rows.push([
          'Seasonal Windows', ss.seasonal_windows.join(', '),
          '', ''
        ]);
      }
    }
    
    // Target Year and Start Date
    if (studentIntake.target_year || studentIntake.start_date) {
      rows.push([
        'Target Year', studentIntake.target_year || 'Not provided',
        'Start Date', studentIntake.start_date || 'Not provided'
      ]);
    }
    
    return {
      headers: [], // No headers for student profile table
      rows
    };
  }

  /**
   * Generate study plan summary elements with proper Word formatting
   */
  private static generateStudyPlanSummaryElements(studyPlan: StudyPlan, studentIntake: StudentIntake): DocumentSection[] {
    const cycles = studyPlan.cycles || [];
    const targetYear = studyPlan.targeted_year || studyPlan.created_for_target_year || new Date().getFullYear() + 1;
    const studentName = studentIntake.personal_details?.full_name || 'you';
    const sections: DocumentSection[] = [];
    
    // Introduction paragraph
    sections.push({
      type: 'paragraph',
      content: `This comprehensive study plan is strategically designed for ${studentName} for UPSC ${targetYear} preparation, structured across multiple specialized cycles to maximize learning efficiency and exam readiness.`,
      style: 'BodyText'
    });
    
    // Analyze cycles and create narrative
    const c1 = cycles.find(c => c.cycleType === 'C1');
    const c2 = cycles.find(c => c.cycleType === 'C2');
    const c3 = cycles.find(c => c.cycleType === 'C3');
    const c4 = cycles.find(c => c.cycleType === 'C4');
    const c5 = cycles.find(c => c.cycleType === 'C5');
    const c6 = cycles.find(c => c.cycleType === 'C6');
    const c7 = cycles.find(c => c.cycleType === 'C7');
    const c8 = cycles.find(c => c.cycleType === 'C8');

    if (c1) {
      const duration = c1.cycleDuration || 0;
      const startDate = c1.cycleStartDate;
      const endDate = c1.cycleEndDate;
      sections.push({
        type: 'rich_paragraph',
        content: {
          elements: [
            { text: 'NCERT Foundation Cycle', bold: true },
            { text: ` (${startDate} to ${endDate}, ${duration} weeks): This initial cycle focuses exclusively on NCERT textbooks to build fundamental concepts across all subjects. The heavy study focus ensures comprehensive understanding of basic concepts before moving to advanced preparation. You'll establish strong conceptual foundations through systematic NCERT study, ensuring you have the essential knowledge base required for UPSC preparation.` }
          ]
        },
        style: 'BodyText'
      });
    }
    if (c2) {
      const duration = c2.cycleDuration || 0;
      const startDate = c2.cycleStartDate;
      const endDate = c2.cycleEndDate;
      sections.push({
        type: 'rich_paragraph',
        content: {
          elements: [
            { text: 'Foundation Cycle', bold: true },
            { text: ` (${startDate} to ${endDate}, ${duration} weeks): This initial cycle establishes a solid conceptual foundation across all subjects. During this extended period, you'll build comprehensive understanding through systematic study of core topics, ensuring strong fundamentals before moving to exam-specific preparation.` }
          ]
        },
        style: 'BodyText'
      });
    }
    
    if (c3) {
      const duration = c3.cycleDuration || 0;
      const startDate = c3.cycleStartDate;
      const endDate = c3.cycleEndDate;
      sections.push({
        type: 'rich_paragraph',
        content: {
          elements: [
            { text: 'Mains Revision Pre-Prelims Cycle', bold: true },
            { text: ` (${startDate} to ${endDate}, ${duration} weeks): This cycle prepares you for Mains-specific requirements while maintaining focus on study. You'll develop answer writing techniques, analytical thinking skills, and Mains-oriented study patterns. This phase bridges foundation knowledge with Mains examination demands, ensuring you're well-prepared for the descriptive nature of Mains papers.` }          ]
        },
        style: 'BodyText'
      });
    }
    if (c4) {
      const duration = c4.cycleDuration || 0;
      const startDate = c4.cycleStartDate;
      const endDate = c4.cycleEndDate;
      sections.push({
        type: 'rich_paragraph',
        content: {
          elements: [
            { text: 'Prelims Revision Cycle', bold: true },
            { text: ` (${startDate} to ${endDate}, ${duration} weeks): This cycle transitions from foundation building to exam-focused preparation. You'll engage in intensive revision of previously studied material while incorporating practice tests and current affairs integration to align with Prelims requirements.` }
          ]
        },
        style: 'BodyText'
      });
    }
    
    if (c5) {
      const duration = c5.cycleDuration || 0;
      const startDate = c5.cycleStartDate;
      const endDate = c5.cycleEndDate;
      sections.push({
        type: 'rich_paragraph',
        content: {
          elements: [
            { text: 'Prelims Rapid Revision Cycle', bold: true },
            { text: ` (${startDate} to ${endDate}, ${duration} weeks): The final sprint before Prelims examination focuses on high-yield topics, quick revision techniques, and intensive practice sessions. This cycle emphasizes speed, accuracy, and retention of key facts and concepts essential for Prelims success.` }
          ]
        },
        style: 'BodyText'
      });
    }
    
    if (c6) {
      const duration = c6.cycleDuration || 0;
      const startDate = c6.cycleStartDate;
      const endDate = c6.cycleEndDate;
      sections.push({
        type: 'rich_paragraph',
        content: {
          elements: [
            { text: 'Mains Revision Cycle', bold: true },
            { text: ` (${startDate} to ${endDate}, ${duration} weeks): This cycle focuses on comprehensive Mains examination preparation. You'll engage in intensive answer writing practice, essay development, optional subject mastery, and comprehensive revision tailored to the descriptive nature of Mains papers. This phase emphasizes analytical thinking and structured response development essential for Mains success.` }          ]
        },
        style: 'BodyText'
      });
    }

    if (c7) {
      const duration = c7.cycleDuration || 0;
      const startDate = c7.cycleStartDate;
      const endDate = c7.cycleEndDate;
      sections.push({
        type: 'rich_paragraph',
        content: {
          elements: [
            { text: 'Mains Rapid Revision Phase', bold: true },
            { text: ` (${startDate} to ${endDate}, ${duration} weeks): Post-Prelims preparation shifts focus to Mains examination requirements. This phase emphasizes answer writing practice, essay development, optional subject mastery, and comprehensive revision tailored to the descriptive nature of Mains papers.` }
          ]
        },
        style: 'BodyText'
      });
    }
    
    if (c8) {
      const duration = c8.cycleDuration || 0;
      const startDate = c8.cycleStartDate;
      const endDate = c8.cycleEndDate;
      sections.push({
        type: 'rich_paragraph',
        content: {
          elements: [
            { text: 'Mains Foundation Cycle', bold: true },
            { text: ` (${startDate} to ${endDate}, ${duration} weeks): This specialized cycle provides comprehensive Mains preparation with heavy focus on study and conceptual understanding. You'll establish thorough knowledge of Mains-specific topics, develop analytical thinking skills, and build the foundation necessary for effective answer writing. This cycle ensures you're well-prepared for the descriptive and analytical nature of Mains examination papers.` }          ]
        },
        style: 'BodyText'
      });
    }
    // Summary paragraph
    const totalWeeks = this.calculateTotalWeeks(studyPlan);
    const totalBlocks = this.countTotalBlocks(studyPlan);
    
    sections.push({
      type: 'rich_paragraph',
      content: {
        elements: [
          { text: 'The entire study journey spans ' },
          { text: `${totalWeeks} weeks`, bold: true },
          { text: ' across ' },
          { text: `${cycles.length} specialized cycles`, bold: true },
          { text: ', broken down into ' },
          { text: `${totalBlocks} focused study blocks`, bold: true },
          { text: '. Each cycle is carefully timed to align with UPSC examination dates and optimal learning patterns, ensuring you peak at the right moments while maintaining consistent progress throughout your preparation journey.' }
        ]
      },
      style: 'BodyText'
    });
    
    return sections;
  }


  /**
   * Generate separate tables for each cycle
   */
  private static generateCycleTables(studyPlan: StudyPlan): DocumentSection[] {
    const sections: DocumentSection[] = [];

    studyPlan.cycles?.forEach(cycle => {
      // Add cycle heading
      sections.push({
        type: 'heading',
        content: cycle.cycleName || 'Untitled Cycle',
        style: 'Heading3',
        level: 3
      });

      // Add cycle description if available
      if (cycle.cycleDescription) {
        sections.push({
          type: 'paragraph',
          content: cycle.cycleDescription,
          style: 'BodyText'
        });
      }

      // Add cycle duration info
      const cycleDurationText = `Duration: ${cycle.cycleStartDate} to ${cycle.cycleEndDate} (${cycle.cycleDuration} weeks)`;
      sections.push({
        type: 'paragraph',
        content: cycleDurationText,
        style: 'BodyText'
      });

      // Generate table for this cycle's blocks
      const tableData = this.generateCycleBlocksTableData(cycle);
      sections.push({
        type: 'table',
        content: tableData,
        style: 'BlocksTable'
      });

      // Add spacing between cycles
      sections.push({
        type: 'paragraph',
        content: '',
        style: 'BodyText'
      });
    });

    return sections;
  }

  /**
   * Generate blocks table data for a single cycle
   */
  private static generateCycleBlocksTableData(cycle: StudyCycle): TableData {
    const headers = ['Block', 'Time Frame', 'Resources'];
    const rows: (string | Paragraph[])[][] = [];
    const rowColors: string[] = [];

    cycle.cycleBlocks?.forEach((block, blockIndex) => {
      const blockDates = this.calculateBlockDates(cycle, block, blockIndex);
      const durationText = `${blockDates.start} - ${blockDates.end}\n${block.duration_weeks} week(s)`;
      const resourceSummary = this.summarizeBlockResources(block.block_resources);
      const resourceBullets = this.createResourceBullets(resourceSummary);
      rows.push([
        block.block_title || 'Untitled',
        durationText,
        resourceBullets
      ]);
      
      // Add color based on cycle type
      const cycleType = cycle.cycleType || block.cycle_type;
      const color = cycleType ? CYCLE_TYPE_COLORS[cycleType as keyof typeof CYCLE_TYPE_COLORS] || 'FFFFFF' : 'FFFFFF';
      rowColors.push(color);
    });

    return { headers, rows, rowColors };
  }
  /**
   * Generate resources sections with proper Word formatting
   */
  private static async generateResourcesSections(studyPlan: StudyPlan): Promise<DocumentSection[]> {
    const sections: DocumentSection[] = [];
    
    // Get all unique subjects from the study plan
    const subjects = new Set(
      studyPlan.cycles?.flatMap(cycle => 
        cycle.cycleBlocks?.flatMap(block => 
          block.subjects || []
        ) || []
      ) || []
    );

    // Generate sections for each subject
    const subjectSections = await Promise.all(
      Array.from(subjects).map(async (subjectCode) => {
        try {
          const subjectResources = await ResourceService.getResourcesForSubject(subjectCode);
          const subjectName = await this.getSubjectName(subjectCode);
          
          const subjectSections: DocumentSection[] = [
            {
              type: 'heading',
              content: subjectName,
              style: 'Heading3',
              level: 3
            }
          ];
          
          // Add resource categories as tables
          const resourceCategories = [
            { name: 'Primary Books', resources: subjectResources.primary_books },
            { name: 'Current Affairs', resources: subjectResources.current_affairs_sources },
            { name: 'Practice Resources', resources: subjectResources.practice_resources },
            { name: 'Supplementary Materials', resources: subjectResources.supplementary_materials },
            { name: 'Video Content', resources: subjectResources.video_content },
            { name: 'Revision Materials', resources: subjectResources.revision_materials },
            { name: 'Expert Recommendations', resources: subjectResources.expert_recommendations }
          ];
          
          resourceCategories
            .filter(category => category.resources.length > 0)
            .forEach(category => {
              subjectSections.push({
                type: 'table',
                content: this.createResourceCategoryTable(category.name, category.resources),
                style: 'ResourceTable'
              });
            });
          
          return subjectSections;
          
        } catch (error) {
          console.warn(`Failed to load resources for subject ${subjectCode}:`, error);
          return [{
            type: 'paragraph' as const,
            content: `Unable to load resources for ${subjectCode}`,
            style: 'BodyText'
          }];
        }
      })
    );
    
    sections.push(...subjectSections.flat());

    return sections;
  }

  /**
   * Create a table for a resource category
   */
  private static createResourceCategoryTable(_categoryName: string, resources: Resource[]): TableData {
    const headers = ['Resource', 'Priority', 'Cost', 'Hours'];
    const rows = resources.map(resource => [
      resource.resource_title,
      resource.resource_priority,
      this.formatResourceCost(resource.resource_cost),
      resource.estimated_hours ? `${resource.estimated_hours}h` : 'N/A'
    ]);

    return { headers, rows };
  }

  /**
   * Get subject name from subject code using standard subject table
   */
  private static async getSubjectName(subjectCode: string): Promise<string> {
    const subject = await ConfigService.getSubjectByCode(subjectCode);
    return subject?.subjectName || subjectCode;
  }

  /**
   * Format resource cost for display
   */
  private static formatResourceCost(resourceCost?: any): string {
    if (!resourceCost) return 'Free';
    
    switch (resourceCost.type) {
      case 'Free':
        return 'Free';
      case 'Paid':
        return `₹${resourceCost.amount || 'N/A'}`;
      case 'Subscription':
        return `${resourceCost.plan || 'Subscription'} Subscription`;
      default:
        return 'Free';
    }
  }

  /**
   * Generate footer text
   */
  private static generateFooterText(): string {
    return `Generated by Study Planner on: ${new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })}

Good luck with your UPSC preparation!`;
  }

  /**
   * Create document header
   */
  private static createHeader(studyPlan: StudyPlan, studentIntake: StudentIntake): Header {
    return new Header({
      children: [
        new Paragraph({
          children: [
            new TextRun({
              text: `Student Name: ${studentIntake.personal_details?.full_name || '[Placeholder Name]'}`,
              bold: true,
              size: DOCUMENT_STYLES.sizes.small,
              color: DOCUMENT_STYLES.colors.primary,
              font: DOCUMENT_STYLES.font
            }),
            new TextRun({
              text: `\t\t\tTarget Year: ${studyPlan.targeted_year}`,
              bold: true,
              size: DOCUMENT_STYLES.sizes.small,
              color: DOCUMENT_STYLES.colors.primary,
              font: DOCUMENT_STYLES.font
            })
          ],
          alignment: AlignmentType.JUSTIFIED,
          spacing: { after: 100 }
        })
      ]
    });
  }

  /**
   * Create document footer
   */
  private static createFooter(): Footer {
    return new Footer({
      children: [
          new Paragraph({
          children: [
            new TextRun({
              text: "© 2025 La Mentora. All rights reserved.",
              size: DOCUMENT_STYLES.sizes.small,
              color: DOCUMENT_STYLES.colors.secondary,
              font: DOCUMENT_STYLES.font
            })
          ],
          alignment: AlignmentType.CENTER,
          spacing: { before: 100 }
        })
      ]
    });
  }

  /**
   * Create table from data
   */
  private static createTableFromData(tableData: TableData, style?: string): Table {
    const rows: TableRow[] = [];
    
    // Determine if this is a profile table (no borders, minimal margins)
    const isProfileTable = style === 'ProfileTableNoBorder';
    const cellPadding = isProfileTable ? 20 : DOCUMENT_STYLES.spacing.cellPadding; // Much smaller padding for profile table
    const cellSpacing = isProfileTable ? 50 : DOCUMENT_STYLES.spacing.cellPadding;
    
    // Only add header row if headers array is not empty
    if (tableData.headers.length > 0) {
      rows.push(new TableRow({
        children: tableData.headers.map(header => 
          new TableCell({ 
            children: [new Paragraph({
              children: [new TextRun({ 
                text: header, 
                bold: true,
                size: DOCUMENT_STYLES.sizes.body,
                color: DOCUMENT_STYLES.colors.text,
                font: DOCUMENT_STYLES.font
              })],
              spacing: { 
                before: cellSpacing, 
                after: cellSpacing 
              }
            })],
            margins: {
              top: cellPadding,
              bottom: cellPadding,
              left: cellPadding,
              right: cellPadding
            }
          })
        )
      }));
    }

    tableData.rows.forEach((row, rowIndex) => {
      // Get row color if available
      const rowColor = tableData.rowColors?.[rowIndex];
      
      rows.push(new TableRow({
        children: row.map(cell => {
          // Handle both string and Paragraph[] cells
          const cellContent = Array.isArray(cell) 
            ? cell // Already Paragraph[]
            : [new Paragraph({
                children: [new TextRun({ 
                  text: cell as string,
                  size: DOCUMENT_STYLES.sizes.body,
                  color: DOCUMENT_STYLES.colors.text,
                  font: DOCUMENT_STYLES.font
                })],
                spacing: { 
                  before: cellSpacing, 
                  after: cellSpacing 
                }
              })];
          
          return new TableCell({ 
            children: cellContent,
            margins: {
              top: cellPadding,
              bottom: cellPadding,
              left: cellPadding,
              right: cellPadding
            },
            shading: rowColor ? {
              fill: rowColor
            } : undefined
          });
        })
      }));
    });

    // Determine column count from headers if available, otherwise from first row
    const columnCount = tableData.headers.length > 0 
      ? tableData.headers.length 
      : (tableData.rows[0]?.length || 1);
    const columnWidth = Math.floor(10000 / columnCount); // Distribute width evenly
    
    // Configure borders based on table style
    const borders = isProfileTable ? {
      // No borders for profile table
      top: { style: BorderStyle.NONE, size: 0 },
      bottom: { style: BorderStyle.NONE, size: 0 },
      left: { style: BorderStyle.NONE, size: 0 },
      right: { style: BorderStyle.NONE, size: 0 },
      insideHorizontal: { style: BorderStyle.NONE, size: 0 },
      insideVertical: { style: BorderStyle.NONE, size: 0 }
    } : {
      // Standard borders for other tables
      top: { style: BorderStyle.SINGLE, size: 1, color: 'E0E0E0' },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: 'E0E0E0' },
      left: { style: BorderStyle.SINGLE, size: 1, color: 'E0E0E0' },
      right: { style: BorderStyle.SINGLE, size: 1, color: 'E0E0E0' },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: 'E0E0E0' },
      insideVertical: { style: BorderStyle.SINGLE, size: 1, color: 'E0E0E0' }
    };
    
    return new Table({
      rows,
      width: { size: 100, type: WidthType.PERCENTAGE },
      columnWidths: Array(columnCount).fill(columnWidth),
      borders
    });
  }

  /**
   * Create list from data
   */
  private static createListFromData(listData: ListData, style?: string): Paragraph[] {
    return listData.items.map(item => 
      new Paragraph({
        children: [new TextRun({ text: `• ${item}` })],
        style: style || 'ResourceItem'
      })
    );
  }


  /**
   * Create bullet paragraphs from resource summary strings
   */
  private static createResourceBullets(resourceNames: string[]): Paragraph[] {
    if (resourceNames.length === 0) {
      return [new Paragraph({
        children: [new TextRun({ text: 'No resources' })],
        style: 'ResourceItem'
      })];
    }

    return resourceNames.map(name => 
      new Paragraph({
        children: [new TextRun({ text: `• ${name}` })],
        style: 'ResourceItem'
      })
    );
  }

  /**
   * Summarize block resources for table display - shows actual resource names
   */
  private static summarizeBlockResources({
    primary_books,
    supplementary_materials,
    current_affairs_sources,
    practice_resources,
    video_content,
    revision_materials,
    expert_recommendations,
  }: BlockResources): string[] {
    
    return [
      ...primary_books,
      ...supplementary_materials,
      ...current_affairs_sources,
      ...practice_resources,
      ...video_content,
      ...revision_materials,
      ...expert_recommendations,      
    ]
    .map(resource => resource.resource_title);
    
    // const resourceNames: string[] = [];
    // if (blockResources.primary_books && blockResources.primary_books.length > 0) {
    //   blockResources.primary_books.forEach(book => {
    //     resourceNames.push(`${book.resource_title}`);
    //   });
    // }
    
    // if (blockResources.supplementary_materials && blockResources.supplementary_materials.length > 0) {
    //   blockResources.supplementary_materials.forEach(mat => {
    //     resourceNames.push(`${mat.resource_title}`);
    //   });
    // }
    
    // if (blockResources.current_affairs_sources && blockResources.current_affairs_sources.length > 0) {
    //   blockResources.current_affairs_sources.forEach(ca => {
    //     resourceNames.push(`${ca.resource_title}`);
    //   });
    // }
    
    // if (resourceNames.length === 0) {
    //   return ['No resources available'];
    // }
    
  }

  /**
   * Calculate block dates from cycle dates and block position
   */
  private static calculateBlockDates(cycle: StudyCycle, block: Block, _blockIndex: number): { start: string; end: string } {
    if (!cycle.cycleStartDate) {
      throw new Error('Cycle start date is required');
    }

    
    // Calculate this block's end date

    return {
      start: block.block_start_date || 'TBD',
      end: block.block_end_date || 'TBD'
    };
  }


  /**
   * Calculate total weeks across all cycles
   */
  private static calculateTotalWeeks(studyPlan: StudyPlan): number {
    if (!studyPlan.cycles) return 0;
    return studyPlan.cycles.reduce((total: number, cycle: StudyCycle) => {
      return total + (cycle.cycleDuration || 0);
    }, 0);
  }

  /**
   * Count total blocks across all cycles
   */
  private static countTotalBlocks(studyPlan: StudyPlan): number {
    if (!studyPlan.cycles) return 0;
    return studyPlan.cycles.reduce((total: number, cycle: StudyCycle) => {
      return total + (cycle.cycleBlocks?.length || 0);
    }, 0);
  }

  /**
   * Download generated document
   */
  private static async downloadDocument(document: Document, filename: string): Promise<void> {
    const buffer = await Packer.toBuffer(document);
    const blob = new Blob([new Uint8Array(buffer)], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    
    const url = window.URL.createObjectURL(blob);
    const link = globalThis.document.createElement('a');
    link.href = url;
    link.download = filename;
    globalThis.document.body.appendChild(link);
    link.click();
    globalThis.document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

}
export default DocumentService;


function calculateDuration(startDate: dayjs.Dayjs, targetYear: number): string {
  // calculation duration string that looks like:
  //    x year y months z weeks
  // omit x if x is 0, omit y if y is 0, omit z if z is 0
  const targetDate = dayjs(`${targetYear}-05-19`); // Match C5 end date
  
  const years = targetDate.diff(startDate, 'year');
  const months = targetDate.diff(startDate, 'month') % 12;
  const weeks = Math.floor(targetDate.diff(startDate, 'day') % 30 / 7);
  
  const parts: string[] = [];
  
  if (years > 0) {
    parts.push(`${years} year${years !== 1 ? 's' : ''}`);
  }
  if (months > 0) {
    parts.push(`${months} month${months !== 1 ? 's' : ''}`);
  }
  if (weeks > 0) {
    parts.push(`${weeks} week${weeks !== 1 ? 's' : ''}`);
  }
  
  return parts.length > 0 ? parts.join(' ') : '0 days';
}