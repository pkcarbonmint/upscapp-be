import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, BorderStyle, AlignmentType, Header, Footer, PageBreak, PageNumber } from 'docx';
import type { StudyPlan, StudentIntake } from '../types/models';
import { CycleType } from '../types/Types';
import { ResourceService } from './ResourceService';
import { SubjectLoader } from './SubjectLoader';
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import { type Writable } from 'stream';
import * as fs from 'fs';
import * as path from 'path';

dayjs.extend(isBetween);
dayjs.extend(isSameOrBefore);

// Color mapping for different cycle types (matching the PDF service)
const CYCLE_TYPE_COLORS = {
  [CycleType.C1]: { bg: 'E3F2FD', border: '3B82F6' }, // Very light blue
  [CycleType.C2]: { bg: 'E8F5E8', border: '22C55E' }, // Very light green  
  [CycleType.C3]: { bg: 'FCE4EC', border: 'EC4899' }, // Very light pink
  [CycleType.C4]: { bg: 'FFEBEE', border: 'EF4444' }, // Very light red
  [CycleType.C5]: { bg: 'F3E5F5', border: 'A855F7' }, // Very light purple
  [CycleType.C5B]: { bg: 'F3E5F5', border: 'A855F7' }, // Very light purple
  [CycleType.C6]: { bg: 'E1F5FE', border: '06B6D4' }, // Very light cyan
  [CycleType.C7]: { bg: 'FFF3E0', border: 'F59E0B' }, // Very light orange
  [CycleType.C8]: { bg: 'F1F8E9', border: '84CC16' }, // Very light lime
} as const;

/**
 * Word Template-Based Calendar Document Service
 * 
 * This service generates Word documents using an actual Word template (.docx) file
 * with predefined styles. The template contains Word styles that are referenced
 * by name in the generated content.
 * 
 * Key features:
 * - Uses actual Word document (.docx) as template
 * - References predefined Word styles by name
 * - True separation between content and styling
 * - Designers can modify template file directly in Word
 */
export class WordTemplateCalendarDocxService {
  private static templatePath: string = WordTemplateCalendarDocxService.getDefaultTemplatePath();

  /**
   * Get default template path
   */
  private static getDefaultTemplatePath(): string {
    // Try different possible locations for the template
    const possiblePaths = [
      path.join(__dirname, '..', '..', 'templates', 'calendar-template.docx'),
      path.join(process.cwd(), 'templates', 'calendar-template.docx'),
      path.join(process.cwd(), 'study-planner', 'helios-ts', 'templates', 'calendar-template.docx'),
      path.join(process.cwd(), 'src', 'templates', 'calendar-template.docx')
    ];

    for (const templatePath of possiblePaths) {
      if (fs.existsSync(templatePath)) {
        return templatePath;
      }
    }

    // Return the most likely path even if it doesn't exist
    return path.join(process.cwd(), 'templates', 'calendar-template.docx');
  }

  /**
   * Set custom template path
   */
  static setTemplatePath(templatePath: string): void {
    this.templatePath = templatePath;
  }

  /**
   * Get current template path
   */
  static getTemplatePath(): string {
    return this.templatePath;
  }

  /**
   * Check if template file exists
   */
  static templateExists(): boolean {
    return fs.existsSync(this.templatePath);
  }

  /**
   * Generate study plan document using Word template
   */
  static async generateStudyPlanDocx(
    studyPlan: StudyPlan,
    studentIntake: StudentIntake,
    options: {
      filename: string;
    }
  ): Promise<void> {
    return generateWordTemplateBasedDocx(studyPlan, studentIntake, options?.filename);
  }

  /**
   * Generate Word document and stream directly to output stream (memory efficient)
   */
  static async generateStudyPlanDocxToStream(
    studyPlan: StudyPlan,
    studentIntake: StudentIntake,
    outputStream: Writable,
    options?: {
      filename?: string;
    }
  ): Promise<void> {
    return generateWordTemplateBasedDocxToStream(studyPlan, studentIntake, outputStream, options?.filename);
  }

  /**
   * Generate Word document content as buffer (for API responses)
   */
  static async generateStudyPlanDocxBuffer(
    studyPlan: StudyPlan,
    studentIntake: StudentIntake
  ): Promise<Buffer> {
    try {
      const document = await createWordTemplateBasedDocument(studyPlan, studentIntake);
      return await Packer.toBuffer(document);
    } catch (error) {
      console.error('Failed to generate Word template-based document buffer:', error);
      throw new Error('Word template-based document buffer generation failed');
    }
  }
}

/**
 * Generate Word template-based document
 */
async function generateWordTemplateBasedDocx(
  studyPlan: StudyPlan,
  studentIntake: StudentIntake,
  filename?: string
): Promise<void> {
  try {
    // Create Word template-based document
    const document = await createWordTemplateBasedDocument(studyPlan, studentIntake);

    // Save the document
    await saveDocx(document, filename || `study-plan-word-template-${studyPlan.study_plan_id || 'plan'}.docx`);

  } catch (error) {
    console.error('Failed to generate Word template-based document:', error);
    throw new Error('Word template-based document generation failed');
  }
}

/**
 * Generate Word template-based document and stream directly to output stream
 */
async function generateWordTemplateBasedDocxToStream(
  studyPlan: StudyPlan,
  studentIntake: StudentIntake,
  outputStream: Writable,
  filename?: string
): Promise<void> {
  try {
    // Create Word template-based document
    const document = await createWordTemplateBasedDocument(studyPlan, studentIntake);

    // Generate document buffer and stream to output
    const buffer = await Packer.toBuffer(document);
    outputStream.write(buffer);
    outputStream.end();

    console.log(`✅ Word template-based document streamed to output: ${filename || `study-plan-word-template-${studyPlan.study_plan_id || 'plan'}.docx`}`);

  } catch (error) {
    console.error('Failed to generate Word template-based document to stream:', error);
    throw new Error('Word template-based document streaming failed');
  }
}

/**
 * Create Word template-based document using predefined Word styles
 */
async function createWordTemplateBasedDocument(studyPlan: StudyPlan, studentIntake: StudentIntake): Promise<Document> {
  const year = studyPlan.targeted_year || new Date().getFullYear();

  console.log(`📄 Creating Word template-based document for year ${year}`);
  
  // Check if template exists
  if (!WordTemplateCalendarDocxService.templateExists()) {
    console.log(`⚠️  Word template not found at: ${WordTemplateCalendarDocxService.getTemplatePath()}`);
    console.log(`📄 Using programmatic styles (template will be created if needed)`);
  } else {
    console.log(`✅ Using Word template: ${WordTemplateCalendarDocxService.getTemplatePath()}`);
  }

  // Build cover page elements using Word template styles
  const coverPageElements = generateWordTemplateCoverPage(studentIntake, year);
  
  // Build main content elements using Word template styles
  const mainContentElements: (Paragraph | Table)[] = [];
  
  // Birds Eye View
  mainContentElements.push(...generateWordTemplateBirdsEyeView(studyPlan));
  
  // Page break before Monthly Views
  mainContentElements.push(new Paragraph({
    children: [new PageBreak()]
  }));
  
  // Monthly Views with Daily/Weekly Pages
  const monthlyElements = await generateWordTemplateMonthViews(studyPlan);
  mainContentElements.push(...monthlyElements.filter(item => item instanceof Paragraph || item instanceof Table));
  
  // Page break before Resources Table
  mainContentElements.push(new Paragraph({
    children: [new PageBreak()]
  }));
  
  // Resources Table
  mainContentElements.push(...await generateWordTemplateResourcesTable(studyPlan));
  
  // Page break before Legend
  mainContentElements.push(new Paragraph({
    children: [new PageBreak()]
  }));
  
  // Legend
  mainContentElements.push(...generateWordTemplateLegend(studyPlan));

  const document = new Document({
    styles: getWordTemplateStyles(),
    sections: [
      // Cover page section (no header)
      {
        properties: {
          page: {
            margin: {
              top: 1440, // 1 inch
              right: 1440,
              bottom: 1440,
              left: 1440,
            },
          },
        },
        footers: {
          default: createWordTemplateFooter(),
        },
        children: coverPageElements,
      },
      // Main content section (with header)
      {
        properties: {
          page: {
            margin: {
              top: 1440, // 1 inch
              right: 1440,
              bottom: 1440,
              left: 1440,
            },
          },
        },
        headers: {
          default: createWordTemplateHeader(studyPlan, studentIntake),
        },
        footers: {
          default: createWordTemplateFooter(),
        },
        children: mainContentElements,
      },
    ],
  });

  return document;
}

/**
 * Generate cover page content using Word template styles
 */
function generateWordTemplateCoverPage(studentIntake: StudentIntake, year: number): (Paragraph | Table)[] {
  const pd = studentIntake.personal_details;
  const ss = studentIntake.study_strategy;
  const ps = studentIntake.preparation_background;

  const elements: (Paragraph | Table)[] = [];

  // Main title using Word template style
  elements.push(new Paragraph({
    children: [new TextRun({ 
      text: 'UPSC STUDY PLANNER - ' + year.toString()
    })],
    style: 'DocumentTitle', // References Word template style
    alignment: AlignmentType.CENTER,
  }));

  // Student name using Word template style
  elements.push(new Paragraph({
    children: [new TextRun({ 
      text: pd?.full_name?.toUpperCase() || 'STUDENT NAME'
    })],
    style: 'StudentName', // References Word template style
    alignment: AlignmentType.CENTER,
  }));

  // Subtitle using Word template style
  elements.push(new Paragraph({
    children: [new TextRun({ 
      text: 'Personalized Study Plan & Calendar'
    })],
    style: 'DocumentSubtitle', // References Word template style
    alignment: AlignmentType.CENTER,
  }));

  elements.push(new Paragraph({ text: '', spacing: { after: 600 } }));

  // Student info using Word template styles
  const infoCardRows: TableRow[] = [
    createWordTemplateInfoRow('📧', 'Email', pd?.email || 'N/A'),
    createWordTemplateInfoRow('📱', 'Phone', pd?.phone_number || 'N/A'),
    createWordTemplateInfoRow('📍', 'Location', pd?.present_location || 'N/A')
  ];

  elements.push(new Table({
    rows: infoCardRows,
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: 'E0E0E0' },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: 'E0E0E0' },
      left: { style: BorderStyle.SINGLE, size: 1, color: 'E0E0E0' },
      right: { style: BorderStyle.SINGLE, size: 1, color: 'E0E0E0' },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: 'E0E0E0' },
      insideVertical: { style: BorderStyle.NONE, size: 0 }
    }
  }));

  elements.push(new Paragraph({ text: '', spacing: { after: 600 } }));

  // Study strategy section using Word template style
  elements.push(new Paragraph({
    children: [new TextRun({ 
      text: 'Study Strategy Overview'
    })],
    style: 'SectionHeading', // References Word template style
    alignment: AlignmentType.CENTER,
  }));

  // Strategy cards using Word template styles
  const strategyRows: TableRow[] = [
    new TableRow({
      children: [
        createWordTemplateStrategyCard('⏰', 'Weekly Hours', ss?.weekly_study_hours || 'N/A'),
        createWordTemplateStrategyCard('🎯', 'Study Approach', ss?.study_approach || 'N/A')
      ]
    }),
    new TableRow({
      children: [
        createWordTemplateStrategyCard('📚', 'Optional Subject', studentIntake.optional_subject?.optional_subject_name || 'N/A'),
        createWordTemplateStrategyCard('🏆', 'Previous Attempts', ps?.number_of_attempts || 'N/A')
      ]
    })
  ];

  elements.push(new Table({
    rows: strategyRows,
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.NONE, size: 0 },
      bottom: { style: BorderStyle.NONE, size: 0 },
      left: { style: BorderStyle.NONE, size: 0 },
      right: { style: BorderStyle.NONE, size: 0 },
      insideHorizontal: { style: BorderStyle.NONE, size: 0 },
      insideVertical: { style: BorderStyle.NONE, size: 0 }
    }
  }));

  // Inspirational quote using Word template styles
  elements.push(new Table({
    rows: [
      new TableRow({
        children: [
          new TableCell({
            children: [
              new Paragraph({
                children: [new TextRun({ 
                  text: '"Success is the sum of small efforts repeated day in and day out."'
                })],
                style: 'Quote', // References Word template style
                alignment: AlignmentType.CENTER
              }),
              new Paragraph({
                children: [new TextRun({ 
                  text: '— Robert Collier'
                })],
                style: 'QuoteAuthor', // References Word template style
                alignment: AlignmentType.CENTER,
              })
            ],
            width: { size: 100, type: WidthType.PERCENTAGE },
          })
        ]
      })
    ],
    width: { size: 100, type: WidthType.PERCENTAGE },
  }));

  // Footer with branding using Word template style
  elements.push(new Paragraph({
    children: [new TextRun({ 
      text: 'La Mentora Study Planner v1.0 - © 2025-2026 All Rights Reserved'
    })],
    style: 'CoverFooter', // References Word template style
    alignment: AlignmentType.CENTER,
  }));

  elements.push(new Paragraph({
    children: [new TextRun({ 
      text: `Generated on ${new Date().toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })}`
    })],
    style: 'GenerationDate', // References Word template style
    alignment: AlignmentType.CENTER
  }));

  return elements;
}

/**
 * Generate birds eye view using Word template styles
 */
function generateWordTemplateBirdsEyeView(studyPlan: StudyPlan): (Paragraph | Table)[] {
  const cycles = studyPlan.cycles || [];
  const elements: (Paragraph | Table)[] = [];

  // Title using Word template style
  elements.push(new Paragraph({
    children: [new TextRun({ 
      text: 'Birds Eye View - Yearly Calendar'
    })],
    style: 'MainHeading' // References Word template style
  }));

  const minDate = dayjs(studyPlan.start_date);
  const maxDate = dayjs(`${studyPlan.targeted_year}-08-31`);
  const endDate = maxDate.endOf('month');

  // Create monthly calendar grid (6 months per row)
  const months: Array<{ month: dayjs.Dayjs; cycle: any }> = [];
  
  for (
    let currentDate = minDate.startOf('month');
    currentDate.isSameOrBefore(endDate, 'month');
    currentDate = currentDate.add(1, 'month')
  ) {
    const monthDate = currentDate;
    let cycle = null;
    
    for (const c of cycles) {
      const cycleStart = dayjs(c.cycleStartDate);
      const cycleEnd = dayjs(c.cycleEndDate);
      if (monthDate.isBetween(cycleStart, cycleEnd, 'month', '[]')) {
        cycle = c;
        break;
      }
    }
    
    months.push({ month: monthDate, cycle });
  }

  // Group months into rows of 6
  const monthRows: Array<Array<{ month: dayjs.Dayjs; cycle: any }>> = [];
  for (let i = 0; i < months.length; i += 6) {
    monthRows.push(months.slice(i, i + 6));
  }

  // Create calendar table using Word template styles
  const allTableRows: TableRow[] = [];
  
  monthRows.forEach((monthRow) => {
    // Header row with month names
    const headerCells: TableCell[] = monthRow.map(({ month, cycle }) => {
      const cycleColor = cycle ? CYCLE_TYPE_COLORS[cycle.cycleType as keyof typeof CYCLE_TYPE_COLORS]?.bg || 'FFFFFF' : 'FFFFFF';
      const cycleName = cycle ? cycle.cycleName.replace(/ Cycle$/, '') : '';
      
      return new TableCell({
        children: [
          new Paragraph({
            children: [new TextRun({ text: cycleName })],
            style: 'CalendarCycleName', // References Word template style
            alignment: AlignmentType.CENTER
          }),
          new Paragraph({
            children: [new TextRun({ text: month.format('MMM YYYY').toUpperCase() })],
            style: 'CalendarMonthName', // References Word template style
            alignment: AlignmentType.CENTER
          })
        ],
        width: { size: 16.67, type: WidthType.PERCENTAGE },
        shading: { fill: cycleColor },
      });
    });
    
    // Fill remaining cells if less than 6 months
    while (headerCells.length < 6) {
      headerCells.push(new TableCell({
        children: [new Paragraph({ text: '' })],
        width: { size: 16.67, type: WidthType.PERCENTAGE }
      }));
    }
    
    allTableRows.push(new TableRow({ children: headerCells }));
    
    // Calendar grid for each month
    const calendarCells: TableCell[] = monthRow.map(({ month }) => {
      return createWordTemplateMiniCalendar(month);
    });
    
    // Fill remaining cells
    while (calendarCells.length < 6) {
      calendarCells.push(new TableCell({
        children: [new Paragraph({ text: '' })],
        width: { size: 16.67, type: WidthType.PERCENTAGE }
      }));
    }
    
    allTableRows.push(new TableRow({ children: calendarCells }));
  });
  
  // Create calendar table
  elements.push(new Table({
    rows: allTableRows,
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: 'E0E0E0' },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: 'E0E0E0' },
      left: { style: BorderStyle.SINGLE, size: 1, color: 'E0E0E0' },
      right: { style: BorderStyle.SINGLE, size: 1, color: 'E0E0E0' },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: 'E0E0E0' },
      insideVertical: { style: BorderStyle.SINGLE, size: 1, color: 'E0E0E0' }
    }
  }));

  return elements;
}

/**
 * Generate monthly views using Word template styles
 */
async function generateWordTemplateMonthViews(studyPlan: StudyPlan): Promise<(Paragraph | Table)[]> {
  const cycles = studyPlan.cycles || [];
  const elements: (Paragraph | Table)[] = [];

  const minDate = dayjs(studyPlan.start_date);
  const maxDate = dayjs(`${studyPlan.targeted_year}-08-31`);
  const endDate = maxDate.endOf('month');

  const maxMonths = process.env.PDF_MAX_MONTHS ? parseInt(process.env.PDF_MAX_MONTHS) : null;
  let monthCount = 0;

  for (
    let currentDate = minDate.startOf('month');
    currentDate.isSameOrBefore(endDate, 'month') && (maxMonths === null || monthCount < maxMonths);
    currentDate = currentDate.add(1, 'month')
  ) {
    const monthDate = currentDate;
    const monthName = monthDate.format('MMMM');
    const monthYear = monthDate.format('YYYY');

    // Find which cycle this month belongs to
    let cycle = null;
    for (const c of cycles) {
      const cycleStart = dayjs(c.cycleStartDate);
      const cycleEnd = dayjs(c.cycleEndDate);
      if (monthDate.isBetween(cycleStart, cycleEnd, 'month', '[]')) {
        cycle = c;
        break;
      }
    }

    // Page break before each month (except the first one)
    if (monthCount > 0) {
      elements.push(new Paragraph({
        children: [new PageBreak()]
      }));
    }

    // Month title using Word template styles
    const cycleName = cycle ? cycle.cycleName.replace(/ Cycle$/, '') : '';
    elements.push(new Table({
      rows: [
        new TableRow({
          children: [
            new TableCell({
              children: [
                new Paragraph({
                  children: [new TextRun({ text: `${monthName.toUpperCase()} ${monthYear}` })],
                  style: 'MonthTitle', // References Word template style
                  alignment: AlignmentType.LEFT
                })
              ],
              width: { size: 50, type: WidthType.PERCENTAGE },
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [new TextRun({ text: cycleName })],
                  style: 'CycleName', // References Word template style
                  alignment: AlignmentType.RIGHT
                })
              ],
              width: { size: 50, type: WidthType.PERCENTAGE },
            })
          ]
        })
      ],
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: { style: BorderStyle.NONE, size: 0 },
        bottom: { style: BorderStyle.NONE, size: 0 },
        left: { style: BorderStyle.NONE, size: 0 },
        right: { style: BorderStyle.NONE, size: 0 },
        insideHorizontal: { style: BorderStyle.NONE, size: 0 },
        insideVertical: { style: BorderStyle.NONE, size: 0 }
      }
    }));

    // Monthly calendar grid using Word template styles
    const calendarTable = createWordTemplateMonthlyCalendar(monthDate, cycles);
    elements.push(calendarTable);

    // Add monthly resources using Word template styles
    elements.push(new Paragraph({ text: '', spacing: { after: 400 } }));
    elements.push(...await generateWordTemplateMonthlyResources(studyPlan, monthDate));

    monthCount++;
  }

  return elements;
}

/**
 * Generate resources table using Word template styles
 */
async function generateWordTemplateResourcesTable(studyPlan: StudyPlan): Promise<(Paragraph | Table)[]> {
  const uniqueSubjects = getUniqueSubjects(studyPlan);
  const elements: (Paragraph | Table)[] = [];

  // Title using Word template style
  elements.push(new Paragraph({
    children: [new TextRun({ 
      text: '📊 Comprehensive Resources by Subject'
    })],
    style: 'MainHeading' // References Word template style
  }));

  // Create resources table using Word template styles
  const resourceRows: TableRow[] = [];
  
  // Header row
  resourceRows.push(new TableRow({
    children: [
      createWordTemplateTableCell('Subject', true),
      createWordTemplateTableCell('Primary Books', true),
      createWordTemplateTableCell('Video Content', true),
      createWordTemplateTableCell('Practice Materials', true),
      createWordTemplateTableCell('Current Affairs', true)
    ]
  }));

  for (const subjectCode of uniqueSubjects) {
    const subjectName = getSubjectName(subjectCode);
    const resources = await ResourceService.getResourcesForSubject(subjectCode);

    const primaryBooks = resources.primary_books.map(r => r.resource_title).join(', ');
    const videoContent = resources.video_content.map(r => r.resource_title).join(', ');
    const practiceResources = resources.practice_resources.map(r => r.resource_title).join(', ');
    const currentAffairs = resources.current_affairs_sources.map(r => r.resource_title).join(', ');

    resourceRows.push(new TableRow({
      children: [
        createWordTemplateTableCell(subjectName, true),
        createWordTemplateTableCell(primaryBooks),
        createWordTemplateTableCell(videoContent),
        createWordTemplateTableCell(practiceResources),
        createWordTemplateTableCell(currentAffairs)
      ]
    }));
  }

  elements.push(new Table({
    rows: resourceRows,
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: 'E0E0E0' },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: 'E0E0E0' },
      left: { style: BorderStyle.SINGLE, size: 1, color: 'E0E0E0' },
      right: { style: BorderStyle.SINGLE, size: 1, color: 'E0E0E0' },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: 'E0E0E0' },
      insideVertical: { style: BorderStyle.SINGLE, size: 1, color: 'E0E0E0' }
    }
  }));

  return elements;
}

/**
 * Generate legend using Word template styles
 */
function generateWordTemplateLegend(studyPlan: StudyPlan): (Paragraph | Table)[] {
  const cycles = studyPlan.cycles || [];
  const uniqueSubjects = getUniqueSubjects(studyPlan);
  const elements: (Paragraph | Table)[] = [];

  // Title using Word template style
  elements.push(new Paragraph({
    children: [new TextRun({ 
      text: 'ℹ️ Legend & Study Phases'
    })],
    style: 'MainHeading' // References Word template style
  }));

  // Create legend table using Word template styles
  const legendRows: TableRow[] = [];
  
  // Header row
  legendRows.push(new TableRow({
    children: [
      createWordTemplateTableCell('Color', true),
      createWordTemplateTableCell('Cycle/Subject', true),
      createWordTemplateTableCell('Description', true)
    ]
  }));

  // Add cycle entries
  cycles.forEach((cycle) => {
    const cycleColor = CYCLE_TYPE_COLORS[cycle.cycleType as keyof typeof CYCLE_TYPE_COLORS]?.bg || 'FFFFFF';
    legendRows.push(new TableRow({
      children: [
        new TableCell({
          children: [new Paragraph({ text: '' })],
          width: { size: 20, type: WidthType.PERCENTAGE },
          shading: { fill: cycleColor },
        }),
        createWordTemplateTableCell(cycle.cycleName, true),
        createWordTemplateTableCell(`Study phase with ${cycle.cycleDuration} weeks duration`)
      ]
    }));
  });

  // Add subject entries
  uniqueSubjects.forEach(subject => {
    const subjectName = getSubjectName(subject);
    legendRows.push(new TableRow({
      children: [
        new TableCell({
          children: [new Paragraph({ text: '' })],
          width: { size: 20, type: WidthType.PERCENTAGE },
          shading: { fill: 'E0E0E0' },
        }),
        createWordTemplateTableCell(subjectName, true),
        createWordTemplateTableCell('Subject area for study')
      ]
    }));
  });

  elements.push(new Table({
    rows: legendRows,
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: 'E0E0E0' },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: 'E0E0E0' },
      left: { style: BorderStyle.SINGLE, size: 1, color: 'E0E0E0' },
      right: { style: BorderStyle.SINGLE, size: 1, color: 'E0E0E0' },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: 'E0E0E0' },
      insideVertical: { style: BorderStyle.SINGLE, size: 1, color: 'E0E0E0' }
    }
  }));

  return elements;
}

/**
 * Generate monthly resources section using Word template styles
 */
async function generateWordTemplateMonthlyResources(studyPlan: StudyPlan, monthDate: dayjs.Dayjs): Promise<(Paragraph | Table)[]> {
  const cycles = studyPlan.cycles || [];
  const elements: (Paragraph | Table)[] = [];
  
  const monthStart = monthDate.startOf('month');
  const monthEnd = monthDate.endOf('month');

  // Get all subjects that are active in this month
  const monthlySubjects = new Set<string>();

  for (const cycle of cycles) {
    for (const block of cycle.cycleBlocks) {
      const blockStart = dayjs(block.block_start_date);
      const blockEnd = dayjs(block.block_end_date);

      // Check if block overlaps with this month
      if (blockStart.isBefore(monthEnd) && blockEnd.isAfter(monthStart)) {
        for (const subject of block.subjects) {
          monthlySubjects.add(subject);
        }
      }
    }
  }

  if (monthlySubjects.size === 0) {
    elements.push(new Paragraph({
      children: [new TextRun({ 
        text: 'No resources for this month.'
      })],
      style: 'NoResourcesMessage' // References Word template style
    }));
    return elements;
  }

  // Resources title using Word template style
  elements.push(new Paragraph({
    children: [new TextRun({ 
      text: `📚 Resources for ${monthDate.format('MMMM YYYY')}`
    })],
    style: 'SubHeading' // References Word template style
  }));

  // Create subject cards using Word template styles
  const subjectsArray = Array.from(monthlySubjects);
  const subjectTriplets: Array<[string, string?, string?]> = [];
  
  // Group subjects into triplets for 3-column layout
  for (let i = 0; i < subjectsArray.length; i += 3) {
    subjectTriplets.push([subjectsArray[i], subjectsArray[i + 1], subjectsArray[i + 2]]);
  }

  const allCardRows: TableRow[] = [];
  
  for (const [firstSubject, secondSubject, thirdSubject] of subjectTriplets) {
    const cardCells: TableCell[] = [];
    
    // First subject card
    if (firstSubject) {
      const firstResources = await ResourceService.getResourcesForSubject(firstSubject);
      cardCells.push(createWordTemplateSubjectCard(firstSubject, firstResources));
    }
    
    // Second subject card (if exists)
    if (secondSubject) {
      const secondResources = await ResourceService.getResourcesForSubject(secondSubject);
      cardCells.push(createWordTemplateSubjectCard(secondSubject, secondResources));
    } else {
      cardCells.push(new TableCell({
        children: [new Paragraph({ text: '' })],
        width: { size: 33.33, type: WidthType.PERCENTAGE }
      }));
    }
    
    // Third subject card (if exists)
    if (thirdSubject) {
      const thirdResources = await ResourceService.getResourcesForSubject(thirdSubject);
      cardCells.push(createWordTemplateSubjectCard(thirdSubject, thirdResources));
    } else {
      cardCells.push(new TableCell({
        children: [new Paragraph({ text: '' })],
        width: { size: 33.33, type: WidthType.PERCENTAGE }
      }));
    }
    
    allCardRows.push(new TableRow({ children: cardCells }));
  }
  
  elements.push(new Table({
    rows: allCardRows,
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.NONE, size: 0 },
      bottom: { style: BorderStyle.NONE, size: 0 },
      left: { style: BorderStyle.NONE, size: 0 },
      right: { style: BorderStyle.NONE, size: 0 },
      insideHorizontal: { style: BorderStyle.NONE, size: 0 },
      insideVertical: { style: BorderStyle.NONE, size: 0 }
    }
  }));

  return elements;
}

// ===== HELPER FUNCTIONS =====

/**
 * Create info row for cover page using Word template styles
 */
function createWordTemplateInfoRow(icon: string, label: string, value: string): TableRow {
  return new TableRow({
    children: [
      new TableCell({
        children: [
          new Paragraph({
            children: [new TextRun({ text: icon })],
            style: 'InfoIcon', // References Word template style
            alignment: AlignmentType.CENTER
          })
        ],
        width: { size: 15, type: WidthType.PERCENTAGE },
      }),
      new TableCell({
        children: [
          new Paragraph({
            children: [
              new TextRun({ text: `${label}: `, style: 'InfoLabel' }), // References Word template style
              new TextRun({ text: value, style: 'InfoValue' }) // References Word template style
            ]
          })
        ],
        width: { size: 85, type: WidthType.PERCENTAGE },
      })
    ]
  });
}

/**
 * Create strategy card using Word template styles
 */
function createWordTemplateStrategyCard(icon: string, title: string, value: string): TableCell {
  return new TableCell({
    children: [
      new Paragraph({
        children: [new TextRun({ text: icon })],
        style: 'StrategyIcon', // References Word template style
        alignment: AlignmentType.CENTER,
      }),
      new Paragraph({
        children: [new TextRun({ text: title })],
        style: 'StrategyTitle', // References Word template style
        alignment: AlignmentType.CENTER,
      }),
      new Paragraph({
        children: [new TextRun({ text: value })],
        style: 'StrategyValue', // References Word template style
        alignment: AlignmentType.CENTER
      })
    ],
    width: { size: 50, type: WidthType.PERCENTAGE },
  });
}

/**
 * Create mini calendar for birds eye view using Word template styles
 */
function createWordTemplateMiniCalendar(month: dayjs.Dayjs): TableCell {
  const daysInMonth = month.daysInMonth();
  const firstDayOfMonth = month.startOf('month').day();
  
  const calendarTableRows: TableRow[] = [];
  
  // Header row with day names
  const dayHeaders = ['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(day => 
    new TableCell({
      children: [
        new Paragraph({
          children: [new TextRun({ text: day })],
          style: 'CalendarDayHeader', // References Word template style
          alignment: AlignmentType.CENTER
        })
      ],
      width: { size: 14.28, type: WidthType.PERCENTAGE },
    })
  );
  calendarTableRows.push(new TableRow({ children: dayHeaders }));
  
  // Create calendar weeks
  let currentWeek: TableCell[] = [];
  
  // Add empty cells for days before month starts
  for (let i = 0; i < firstDayOfMonth; i++) {
    currentWeek.push(new TableCell({
      children: [new Paragraph({ text: '' })],
      width: { size: 14.28, type: WidthType.PERCENTAGE },
    }));
  }
  
  // Add days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    currentWeek.push(new TableCell({
      children: [
        new Paragraph({
          children: [new TextRun({ text: day.toString() })],
          style: 'CalendarDay', // References Word template style
          alignment: AlignmentType.CENTER
        })
      ],
      width: { size: 14.28, type: WidthType.PERCENTAGE },
    }));
    
    // Start new week if we have 7 days
    if (currentWeek.length === 7) {
      calendarTableRows.push(new TableRow({ children: currentWeek }));
      currentWeek = [];
    }
  }
  
  // Fill remaining cells in the last week
  while (currentWeek.length < 7) {
    currentWeek.push(new TableCell({
      children: [new Paragraph({ text: '' })],
      width: { size: 14.28, type: WidthType.PERCENTAGE },
    }));
  }
  if (currentWeek.length > 0) {
    calendarTableRows.push(new TableRow({ children: currentWeek }));
  }
  
  // Create the mini calendar table
  const calendarTable = new Table({
    rows: calendarTableRows,
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.NONE, size: 0 },
      bottom: { style: BorderStyle.NONE, size: 0 },
      left: { style: BorderStyle.NONE, size: 0 },
      right: { style: BorderStyle.NONE, size: 0 },
      insideHorizontal: { style: BorderStyle.NONE, size: 0 },
      insideVertical: { style: BorderStyle.NONE, size: 0 }
    }
  });
  
  return new TableCell({
    children: [calendarTable],
    width: { size: 16.67, type: WidthType.PERCENTAGE },
  });
}

/**
 * Create monthly calendar using Word template styles
 */
function createWordTemplateMonthlyCalendar(monthDate: dayjs.Dayjs, cycles: any[]): Table {
  const daysInMonth = monthDate.daysInMonth();
  const firstDayOfMonth = monthDate.startOf('month').day();
  
  const calendarRows: TableRow[] = [];
  
  // Header row
  const headerCells = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(day => 
    new TableCell({
      children: [
        new Paragraph({
          children: [new TextRun({ text: day })],
          style: 'MonthlyCalendarHeader', // References Word template style
          alignment: AlignmentType.CENTER
        })
      ],
      width: { size: 14.28, type: WidthType.PERCENTAGE },
    })
  );
  calendarRows.push(new TableRow({ children: headerCells }));

  // Calendar days
  let currentWeek: TableCell[] = [];
  
  // Add empty cells for days before month starts
  for (let i = 0; i < firstDayOfMonth; i++) {
    currentWeek.push(new TableCell({
      children: [new Paragraph({ text: '' })],
      width: { size: 14.28, type: WidthType.PERCENTAGE },
    }));
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const currentDay = monthDate.date(day);
    
    // Determine which cycle this day belongs to for background color
    let dayCycle = null;
    for (const cycle of cycles) {
      const cycleStart = dayjs(cycle.cycleStartDate);
      const cycleEnd = dayjs(cycle.cycleEndDate);
      if (currentDay.isBetween(cycleStart, cycleEnd, 'day', '[]')) {
        dayCycle = cycle;
        break;
      }
    }

    const cycleColor = dayCycle ? CYCLE_TYPE_COLORS[dayCycle.cycleType as keyof typeof CYCLE_TYPE_COLORS]?.bg || 'FFFFFF' : 'FFFFFF';
    
    // Get subjects for this day
    const daySubjects: string[] = [];
    for (const cycle of cycles) {
      for (const block of cycle.cycleBlocks) {
        const blockStart = dayjs(block.block_start_date);
        const blockEnd = dayjs(block.block_end_date);
        
        if (currentDay.isBetween(blockStart, blockEnd, 'day', '[]')) {
          for (const subject of block.subjects) {
            const subjectName = getSubjectName(subject);
            daySubjects.push(subjectName);
          }
        }
      }
    }

    const cellContent = [
      new Paragraph({
        children: [new TextRun({ text: day.toString() })],
        style: 'CalendarDayNumber', // References Word template style
        alignment: AlignmentType.CENTER
      })
    ];

    // Add subjects using Word template style
    daySubjects.forEach(subject => {
      cellContent.push(new Paragraph({
        children: [new TextRun({ text: subject })],
        style: 'CalendarSubject', // References Word template style
        alignment: AlignmentType.CENTER
      }));
    });

    currentWeek.push(new TableCell({
      children: cellContent,
      width: { size: 14.28, type: WidthType.PERCENTAGE },
      shading: { fill: cycleColor },
    }));

    // Start new week if we have 7 days
    if (currentWeek.length === 7) {
      calendarRows.push(new TableRow({ children: currentWeek }));
      currentWeek = [];
    }
  }

  // Fill remaining cells in the last week
  while (currentWeek.length < 7) {
    currentWeek.push(new TableCell({
      children: [new Paragraph({ text: '' })],
      width: { size: 14.28, type: WidthType.PERCENTAGE },
    }));
  }
  if (currentWeek.length > 0) {
    calendarRows.push(new TableRow({ children: currentWeek }));
  }

  return new Table({
    rows: calendarRows,
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: 'E0E0E0' },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: 'E0E0E0' },
      left: { style: BorderStyle.SINGLE, size: 1, color: 'E0E0E0' },
      right: { style: BorderStyle.SINGLE, size: 1, color: 'E0E0E0' },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: 'E0E0E0' },
      insideVertical: { style: BorderStyle.SINGLE, size: 1, color: 'E0E0E0' }
    }
  });
}

/**
 * Create subject card using Word template styles
 */
function createWordTemplateSubjectCard(subjectCode: string, resources: any): TableCell {
  const subjectName = getSubjectName(subjectCode);
  
  const cardContent: Paragraph[] = [];
  
  // Card header with subject name
  cardContent.push(new Paragraph({
    children: [new TextRun({ text: subjectName })],
    style: 'SubjectCardTitle', // References Word template style
    alignment: AlignmentType.CENTER,
  }));
  
  // Resource categories
  const resourceCategories = [
    { name: '📚 Primary Books', resources: resources.primary_books },
    { name: '🎥 Video Content', resources: resources.video_content },
    { name: '📝 Practice Materials', resources: resources.practice_resources },
    { name: '📰 Current Affairs', resources: resources.current_affairs_sources }
  ];
  
  for (const category of resourceCategories) {
    if (category.resources && category.resources.length > 0) {
      // Category title
      cardContent.push(new Paragraph({
        children: [new TextRun({ text: category.name })],
        style: 'ResourceCategoryTitle' // References Word template style
      }));
      
      // Resource items as bullet points
      category.resources.forEach((resource: any) => {
        cardContent.push(new Paragraph({
          children: [new TextRun({ text: `• ${resource.resource_title}` })],
          style: 'ResourceItem' // References Word template style
        }));
      });
    }
  }
  
  return new TableCell({
    children: cardContent,
    width: { size: 33.33, type: WidthType.PERCENTAGE },
  });
}

/**
 * Create table cell using Word template styles
 */
function createWordTemplateTableCell(text: string, isHeader = false): TableCell {
  return new TableCell({
    children: [
      new Paragraph({
        children: [new TextRun({ text })],
        style: isHeader ? 'TableHeader' : 'TableCell', // References Word template styles
        alignment: AlignmentType.LEFT
      })
    ],
  });
}

/**
 * Get unique subjects from study plan
 */
function getUniqueSubjects(studyPlan: StudyPlan): string[] {
  const subjects = new Set<string>();
  studyPlan.cycles?.forEach(cycle => {
    cycle.cycleBlocks?.forEach(block => {
      block.subjects?.forEach(subject => subjects.add(subject));
    });
  });
  return Array.from(subjects);
}

/**
 * Get subject name from subject code
 */
function getSubjectName(subjectCode: string): string {
  const subject = SubjectLoader.getSubjectByCode(subjectCode);
  return subject?.subjectName || subjectCode;
}

/**
 * Get Word template styles - these define the styles that should exist in the Word template
 */
function getWordTemplateStyles() {
  return {
    paragraphStyles: [
      // Cover page styles
      {
        id: 'DocumentTitle',
        name: 'Document Title',
        basedOn: 'Normal',
        run: { 
          size: 42, 
          bold: true, 
          color: '2E5BBA', 
          font: 'Aptos'
        },
        paragraph: { alignment: AlignmentType.CENTER, spacing: { after: 0 } }
      },
      {
        id: 'StudentName',
        name: 'Student Name',
        basedOn: 'Normal',
        run: { 
          size: 36, 
          bold: true, 
          color: '333333', 
          font: 'Aptos'
        },
        paragraph: { alignment: AlignmentType.CENTER, spacing: { after: 100 } }
      },
      {
        id: 'DocumentSubtitle',
        name: 'Document Subtitle',
        basedOn: 'Normal',
        run: { 
          size: 18, 
          color: '666666', 
          font: 'Aptos'
        },
        paragraph: { alignment: AlignmentType.CENTER, spacing: { after: 200 } }
      },
      {
        id: 'SectionHeading',
        name: 'Section Heading',
        basedOn: 'Normal',
        run: { 
          size: 24, 
          bold: true, 
          color: '2E5BBA', 
          font: 'Aptos'
        },
        paragraph: { alignment: AlignmentType.CENTER, spacing: { after: 400 } }
      },
      {
        id: 'Quote',
        name: 'Quote',
        basedOn: 'Normal',
        run: { 
          size: 18, 
          italics: true, 
          color: '2E5BBA', 
          font: 'Aptos'
        },
        paragraph: { alignment: AlignmentType.CENTER }
      },
      {
        id: 'QuoteAuthor',
        name: 'Quote Author',
        basedOn: 'Normal',
        run: { 
          size: 14, 
          color: '666666', 
          font: 'Aptos'
        },
        paragraph: { alignment: AlignmentType.CENTER, spacing: { before: 200 } }
      },
      {
        id: 'CoverFooter',
        name: 'Cover Footer',
        basedOn: 'Normal',
        run: { 
          size: 14, 
          color: '666666', 
          font: 'Aptos'
        },
        paragraph: { alignment: AlignmentType.CENTER, spacing: { after: 200 } }
      },
      {
        id: 'GenerationDate',
        name: 'Generation Date',
        basedOn: 'Normal',
        run: { 
          size: 12, 
          color: '666666', 
          font: 'Aptos'
        },
        paragraph: { alignment: AlignmentType.CENTER }
      },
      
      // Main content styles
      {
        id: 'MainHeading',
        name: 'Main Heading',
        basedOn: 'Normal',
        run: { 
          size: 28, 
          bold: true, 
          color: '2E5BBA', 
          font: 'Aptos'
        },
        paragraph: { spacing: { after: 400 } }
      },
      {
        id: 'SubHeading',
        name: 'Sub Heading',
        basedOn: 'Normal',
        run: { 
          size: 24, 
          bold: true, 
          color: '2E5BBA', 
          font: 'Aptos'
        },
        paragraph: { spacing: { after: 400 } }
      },
      {
        id: 'MonthTitle',
        name: 'Month Title',
        basedOn: 'Normal',
        run: { 
          size: 28, 
          bold: true, 
          color: '2E5BBA', 
          font: 'Aptos'
        }
      },
      {
        id: 'CycleName',
        name: 'Cycle Name',
        basedOn: 'Normal',
        run: { 
          size: 25, 
          bold: true, 
          color: '2E5BBA', 
          font: 'Aptos'
        }
      },
      
      // Calendar styles
      {
        id: 'CalendarCycleName',
        name: 'Calendar Cycle Name',
        basedOn: 'Normal',
        run: { 
          size: 10, 
          bold: true, 
          color: '2E5BBA', 
          font: 'Aptos'
        }
      },
      {
        id: 'CalendarMonthName',
        name: 'Calendar Month Name',
        basedOn: 'Normal',
        run: { 
          size: 12, 
          bold: true, 
          color: '333333', 
          font: 'Aptos'
        }
      },
      {
        id: 'CalendarDayHeader',
        name: 'Calendar Day Header',
        basedOn: 'Normal',
        run: { 
          size: 8, 
          bold: true, 
          color: '666666', 
          font: 'Aptos'
        }
      },
      {
        id: 'CalendarDay',
        name: 'Calendar Day',
        basedOn: 'Normal',
        run: { 
          size: 8, 
          color: '333333', 
          font: 'Aptos'
        }
      },
      {
        id: 'MonthlyCalendarHeader',
        name: 'Monthly Calendar Header',
        basedOn: 'Normal',
        run: { 
          size: 12, 
          bold: true, 
          color: '2E5BBA', 
          font: 'Aptos'
        }
      },
      {
        id: 'CalendarDayNumber',
        name: 'Calendar Day Number',
        basedOn: 'Normal',
        run: { 
          size: 14, 
          bold: true, 
          color: '333333', 
          font: 'Aptos'
        }
      },
      {
        id: 'CalendarSubject',
        name: 'Calendar Subject',
        basedOn: 'Normal',
        run: { 
          size: 8, 
          color: '333333', 
          font: 'Aptos'
        }
      },
      
      // Info and strategy styles
      {
        id: 'InfoIcon',
        name: 'Info Icon',
        basedOn: 'Normal',
        run: { 
          size: 16, 
          color: '2E5BBA', 
          font: 'Aptos'
        }
      },
      {
        id: 'InfoLabel',
        name: 'Info Label',
        basedOn: 'Normal',
        run: { 
          size: 14, 
          bold: true, 
          color: '666666', 
          font: 'Aptos'
        }
      },
      {
        id: 'InfoValue',
        name: 'Info Value',
        basedOn: 'Normal',
        run: { 
          size: 14, 
          color: '333333', 
          font: 'Aptos'
        }
      },
      {
        id: 'StrategyIcon',
        name: 'Strategy Icon',
        basedOn: 'Normal',
        run: { 
          size: 20, 
          color: '2E5BBA', 
          font: 'Aptos'
        }
      },
      {
        id: 'StrategyTitle',
        name: 'Strategy Title',
        basedOn: 'Normal',
        run: { 
          size: 12, 
          bold: true, 
          color: '666666', 
          font: 'Aptos'
        }
      },
      {
        id: 'StrategyValue',
        name: 'Strategy Value',
        basedOn: 'Normal',
        run: { 
          size: 14, 
          color: '333333', 
          font: 'Aptos'
        }
      },
      
      // Resource styles
      {
        id: 'SubjectCardTitle',
        name: 'Subject Card Title',
        basedOn: 'Normal',
        run: { 
          size: 14, 
          bold: true, 
          color: '2E5BBA', 
          font: 'Aptos'
        }
      },
      {
        id: 'ResourceCategoryTitle',
        name: 'Resource Category Title',
        basedOn: 'Normal',
        run: { 
          size: 10, 
          bold: true, 
          color: '666666', 
          font: 'Aptos'
        }
      },
      {
        id: 'ResourceItem',
        name: 'Resource Item',
        basedOn: 'Normal',
        run: { 
          size: 9, 
          color: '333333', 
          font: 'Aptos'
        }
      },
      {
        id: 'NoResourcesMessage',
        name: 'No Resources Message',
        basedOn: 'Normal',
        run: { 
          size: 14, 
          italics: true, 
          color: '666666', 
          font: 'Aptos'
        }
      },
      
      // Table styles
      {
        id: 'TableHeader',
        name: 'Table Header',
        basedOn: 'Normal',
        run: { 
          size: 20, 
          bold: true, 
          color: '2E5BBA', 
          font: 'Aptos'
        }
      },
      {
        id: 'TableCell',
        name: 'Table Cell',
        basedOn: 'Normal',
        run: { 
          size: 20, 
          color: '333333', 
          font: 'Aptos'
        }
      }
    ]
  };
}

/**
 * Create document header using Word template styles
 */
function createWordTemplateHeader(studyPlan: StudyPlan, studentIntake: StudentIntake): Header {
  return new Header({
    children: [
      new Paragraph({
        children: [
          new TextRun({
            text: `Student: ${studentIntake.personal_details?.full_name || '[Name]'}`,
          }),
          new TextRun({
            text: `\t\tTarget Year: ${studyPlan.targeted_year}`,
          })
        ],
        style: 'TableHeader', // References Word template style
        alignment: AlignmentType.JUSTIFIED,
      })
    ]
  });
}

/**
 * Create document footer using Word template styles
 */
function createWordTemplateFooter(): Footer {
  return new Footer({
    children: [
      new Paragraph({
        children: [
          new TextRun({
            text: `La Mentora Study Planner v1.0 - © 2025-2026 All Rights Reserved. Generated on ${new Date().toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })} - Page `,
          }),
          new TextRun({
            children: [PageNumber.CURRENT],
          }),
          new TextRun({
            text: ' of ',
          }),
          new TextRun({
            children: [PageNumber.TOTAL_PAGES],
          })
        ],
        style: 'CoverFooter', // References Word template style
        alignment: AlignmentType.CENTER,
      })
    ]
  });
}

/**
 * Save Word document to appropriate location (filesystem or browser download)
 */
async function saveDocx(document: Document, filename: string): Promise<void> {
  if (typeof window !== 'undefined') {
    // Browser environment - trigger download
    const buffer = await Packer.toBuffer(document);
    const blob = new Blob([new Uint8Array(buffer)], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    const url = URL.createObjectURL(blob);
    const a = globalThis.document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    console.log(`📁 Word template-based document download triggered: ${filename}`);
  } else {
    // Node.js environment - save to filesystem
    const outputDir = path.join(process.cwd(), 'generated-docs');

    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const outputPath = path.join(outputDir, filename);
    const buffer = await Packer.toBuffer(document);
    fs.writeFileSync(outputPath, buffer);

    console.log(`✅ Word template-based document saved: ${filename}`);
    console.log(`   📁 Location: ${outputPath}`);
  }
}