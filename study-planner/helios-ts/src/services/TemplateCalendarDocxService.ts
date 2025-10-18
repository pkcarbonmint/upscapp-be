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
 * Template-based Calendar Document Service
 * 
 * This service generates Word documents using predefined styles instead of inline formatting.
 * It separates content generation from styling by utilizing Word's built-in style system.
 * 
 * Key differences from CalendarDocxService:
 * - Uses predefined styles instead of inline formatting
 * - Minimal inline styling - relies on style definitions
 * - Cleaner separation between content and presentation
 * - Easier to customize appearance without code changes
 * - Optional template file support for advanced customization
 */
export class TemplateCalendarDocxService {
  private static templatePath: string = path.join(process.cwd(), 'study-planner', 'helios-ts', 'templates', 'calendar-template.docx');

  /**
   * Generate study plan document using template
   */
  static async generateStudyPlanDocx(
    studyPlan: StudyPlan,
    studentIntake: StudentIntake,
    options: {
      filename: string;
    }
  ): Promise<void> {
    return generateTemplateBasedDocx(studyPlan, studentIntake, options?.filename);
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
    return generateTemplateBasedDocxToStream(studyPlan, studentIntake, outputStream, options?.filename);
  }

  /**
   * Generate Word document content as buffer (for API responses)
   */
  static async generateStudyPlanDocxBuffer(
    studyPlan: StudyPlan,
    studentIntake: StudentIntake
  ): Promise<Buffer> {
    try {
      const document = await createTemplateBasedDocument(studyPlan, studentIntake);
      return await Packer.toBuffer(document);
    } catch (error) {
      console.error('Failed to generate template-based Word document buffer:', error);
      throw new Error('Template-based Word document buffer generation failed');
    }
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
}

/**
 * Generate template-based Word document
 */
async function generateTemplateBasedDocx(
  studyPlan: StudyPlan,
  studentIntake: StudentIntake,
  filename?: string
): Promise<void> {
  try {
    // Create template-based Word document
    const document = await createTemplateBasedDocument(studyPlan, studentIntake);

    // Save the document
    await saveDocx(document, filename || `study-plan-template-${studyPlan.study_plan_id || 'plan'}.docx`);

  } catch (error) {
    console.error('Failed to generate template-based Word document:', error);
    throw new Error('Template-based Word document generation failed');
  }
}

/**
 * Generate template-based Word document and stream directly to output stream
 */
async function generateTemplateBasedDocxToStream(
  studyPlan: StudyPlan,
  studentIntake: StudentIntake,
  outputStream: Writable,
  filename?: string
): Promise<void> {
  try {
    // Create template-based Word document
    const document = await createTemplateBasedDocument(studyPlan, studentIntake);

    // Generate document buffer and stream to output
    const buffer = await Packer.toBuffer(document);
    outputStream.write(buffer);
    outputStream.end();

    console.log(`✅ Template-based Word document streamed to output: ${filename || `study-plan-template-${studyPlan.study_plan_id || 'plan'}.docx`}`);

  } catch (error) {
    console.error('Failed to generate template-based Word document to stream:', error);
    throw new Error('Template-based Word document streaming failed');
  }
}

/**
 * Create template-based Word document
 */
async function createTemplateBasedDocument(studyPlan: StudyPlan, studentIntake: StudentIntake): Promise<Document> {
  const year = studyPlan.targeted_year || new Date().getFullYear();

  // Build cover page elements using template styles
  const coverPageElements = generateTemplatedCoverPage(studentIntake, year);
  
  // Build main content elements using template styles
  const mainContentElements: (Paragraph | Table)[] = [];
  
  // Birds Eye View
  mainContentElements.push(...generateTemplatedBirdsEyeView(studyPlan));
  
  // Page break before Monthly Views
  mainContentElements.push(new Paragraph({
    children: [new PageBreak()]
  }));
  
  // Monthly Views with Daily/Weekly Pages
  const monthlyElements = await generateTemplatedMonthViews(studyPlan);
  mainContentElements.push(...monthlyElements.filter(item => item instanceof Paragraph || item instanceof Table));
  
  // Page break before Resources Table
  mainContentElements.push(new Paragraph({
    children: [new PageBreak()]
  }));
  
  // Resources Table
  mainContentElements.push(...await generateTemplatedResourcesTable(studyPlan));
  
  // Page break before Legend
  mainContentElements.push(new Paragraph({
    children: [new PageBreak()]
  }));
  
  // Legend
  mainContentElements.push(...generateTemplatedLegend(studyPlan));

  const document = new Document({
    styles: getTemplateDocumentStyles(),
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
          default: createTemplatedFooter(),
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
          default: createTemplatedHeader(studyPlan, studentIntake),
        },
        footers: {
          default: createTemplatedFooter(),
        },
        children: mainContentElements,
      },
    ],
  });

  return document;
}

/**
 * Generate templated cover page content
 */
function generateTemplatedCoverPage(studentIntake: StudentIntake, year: number): (Paragraph | Table)[] {
  const pd = studentIntake.personal_details;
  const ss = studentIntake.study_strategy;
  const ps = studentIntake.preparation_background;

  const elements: (Paragraph | Table)[] = [];

  // Main title using template style
  elements.push(new Paragraph({
    children: [new TextRun({ 
      text: 'UPSC STUDY PLANNER - ' + year.toString()
    })],
    style: 'DocumentTitle',
    alignment: AlignmentType.CENTER,
  }));

  // Student name using template style
  elements.push(new Paragraph({
    children: [new TextRun({ 
      text: pd?.full_name?.toUpperCase() || 'STUDENT NAME'
    })],
    style: 'StudentName',
    alignment: AlignmentType.CENTER,
  }));

  // Subtitle using template style
  elements.push(new Paragraph({
    children: [new TextRun({ 
      text: 'Personalized Study Plan & Calendar'
    })],
    style: 'DocumentSubtitle',
    alignment: AlignmentType.CENTER,
  }));

  // Student info card using template styles
  const infoCardRows: TableRow[] = [
    createTemplatedInfoRow('📧', 'Email', pd?.email || 'N/A'),
    createTemplatedInfoRow('📱', 'Phone', pd?.phone_number || 'N/A'),
    createTemplatedInfoRow('📍', 'Location', pd?.present_location || 'N/A')
  ];

  elements.push(new Table({
    rows: infoCardRows,
    width: { size: 100, type: WidthType.PERCENTAGE },
    style: 'InfoCard'
  }));

  elements.push(new Paragraph({ text: '', spacing: { after: 600 } }));

  // Study strategy section using template styles
  elements.push(new Paragraph({
    children: [new TextRun({ 
      text: 'Study Strategy Overview'
    })],
    style: 'SectionHeading',
    alignment: AlignmentType.CENTER,
  }));

  // Strategy cards using template styles
  const strategyRows: TableRow[] = [
    new TableRow({
      children: [
        createTemplatedStrategyCard('⏰', 'Weekly Hours', ss?.weekly_study_hours || 'N/A'),
        createTemplatedStrategyCard('🎯', 'Study Approach', ss?.study_approach || 'N/A')
      ]
    }),
    new TableRow({
      children: [
        createTemplatedStrategyCard('📚', 'Optional Subject', studentIntake.optional_subject?.optional_subject_name || 'N/A'),
        createTemplatedStrategyCard('🏆', 'Previous Attempts', ps?.number_of_attempts || 'N/A')
      ]
    })
  ];

  elements.push(new Table({
    rows: strategyRows,
    width: { size: 100, type: WidthType.PERCENTAGE },
    style: 'StrategyGrid'
  }));

  // Inspirational quote using template style
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
                style: 'Quote',
                alignment: AlignmentType.CENTER
              }),
              new Paragraph({
                children: [new TextRun({ 
                  text: '— Robert Collier'
                })],
                style: 'QuoteAuthor',
                alignment: AlignmentType.CENTER,
              })
            ],
            width: { size: 100, type: WidthType.PERCENTAGE },
          })
        ]
      })
    ],
    width: { size: 100, type: WidthType.PERCENTAGE },
    style: 'QuoteBox'
  }));

  // Footer with branding using template style
  elements.push(new Paragraph({
    children: [new TextRun({ 
      text: 'La Mentora Study Planner v1.0 - © 2025-2026 All Rights Reserved'
    })],
    style: 'CoverFooter',
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
    style: 'GenerationDate',
    alignment: AlignmentType.CENTER
  }));

  return elements;
}

/**
 * Generate templated birds eye view calendar
 */
function generateTemplatedBirdsEyeView(studyPlan: StudyPlan): (Paragraph | Table)[] {
  const cycles = studyPlan.cycles || [];
  const elements: (Paragraph | Table)[] = [];

  // Title using template style
  elements.push(new Paragraph({
    children: [new TextRun({ 
      text: 'Birds Eye View - Yearly Calendar'
    })],
    style: 'MainHeading'
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

  // Create calendar table using template styles
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
            style: 'CalendarCycleName',
            alignment: AlignmentType.CENTER
          }),
          new Paragraph({
            children: [new TextRun({ text: month.format('MMM YYYY').toUpperCase() })],
            style: 'CalendarMonthName',
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
      return createTemplatedMiniCalendar(month);
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
  
  // Create calendar table using template style
  elements.push(new Table({
    rows: allTableRows,
    width: { size: 100, type: WidthType.PERCENTAGE },
    style: 'CalendarGrid'
  }));

  return elements;
}

/**
 * Generate templated monthly views
 */
async function generateTemplatedMonthViews(studyPlan: StudyPlan): Promise<(Paragraph | Table)[]> {
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

    // Month title using template styles
    const cycleName = cycle ? cycle.cycleName.replace(/ Cycle$/, '') : '';
    elements.push(new Table({
      rows: [
        new TableRow({
          children: [
            new TableCell({
              children: [
                new Paragraph({
                  children: [new TextRun({ text: `${monthName.toUpperCase()} ${monthYear}` })],
                  style: 'MonthTitle',
                  alignment: AlignmentType.LEFT
                })
              ],
              width: { size: 50, type: WidthType.PERCENTAGE },
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [new TextRun({ text: cycleName })],
                  style: 'CycleName',
                  alignment: AlignmentType.RIGHT
                })
              ],
              width: { size: 50, type: WidthType.PERCENTAGE },
            })
          ]
        })
      ],
      width: { size: 100, type: WidthType.PERCENTAGE },
      style: 'MonthHeader'
    }));

    // Monthly calendar grid using template styles
    const calendarTable = createTemplatedMonthlyCalendar(monthDate, cycles);
    elements.push(calendarTable);

    // Add monthly resources using template styles
    elements.push(new Paragraph({ text: '', spacing: { after: 400 } }));
    elements.push(...await generateTemplatedMonthlyResources(studyPlan, monthDate));

    monthCount++;
  }

  return elements;
}

/**
 * Generate templated resources table
 */
async function generateTemplatedResourcesTable(studyPlan: StudyPlan): Promise<(Paragraph | Table)[]> {
  const uniqueSubjects = getUniqueSubjects(studyPlan);
  const elements: (Paragraph | Table)[] = [];

  // Title using template style
  elements.push(new Paragraph({
    children: [new TextRun({ 
      text: '📊 Comprehensive Resources by Subject'
    })],
    style: 'MainHeading'
  }));

  // Create resources table using template styles
  const resourceRows: TableRow[] = [];
  
  // Header row
  resourceRows.push(new TableRow({
    children: [
      createTemplatedTableCell('Subject', true),
      createTemplatedTableCell('Primary Books', true),
      createTemplatedTableCell('Video Content', true),
      createTemplatedTableCell('Practice Materials', true),
      createTemplatedTableCell('Current Affairs', true)
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
        createTemplatedTableCell(subjectName, true),
        createTemplatedTableCell(primaryBooks),
        createTemplatedTableCell(videoContent),
        createTemplatedTableCell(practiceResources),
        createTemplatedTableCell(currentAffairs)
      ]
    }));
  }

  elements.push(new Table({
    rows: resourceRows,
    width: { size: 100, type: WidthType.PERCENTAGE },
    style: 'ResourcesTable'
  }));

  return elements;
}

/**
 * Generate templated legend
 */
function generateTemplatedLegend(studyPlan: StudyPlan): (Paragraph | Table)[] {
  const cycles = studyPlan.cycles || [];
  const uniqueSubjects = getUniqueSubjects(studyPlan);
  const elements: (Paragraph | Table)[] = [];

  // Title using template style
  elements.push(new Paragraph({
    children: [new TextRun({ 
      text: 'ℹ️ Legend & Study Phases'
    })],
    style: 'MainHeading'
  }));

  // Create legend table using template styles
  const legendRows: TableRow[] = [];
  
  // Header row
  legendRows.push(new TableRow({
    children: [
      createTemplatedTableCell('Color', true),
      createTemplatedTableCell('Cycle/Subject', true),
      createTemplatedTableCell('Description', true)
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
        createTemplatedTableCell(cycle.cycleName, true),
        createTemplatedTableCell(`Study phase with ${cycle.cycleDuration} weeks duration`)
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
        createTemplatedTableCell(subjectName, true),
        createTemplatedTableCell('Subject area for study')
      ]
    }));
  });

  elements.push(new Table({
    rows: legendRows,
    width: { size: 100, type: WidthType.PERCENTAGE },
    style: 'LegendTable'
  }));

  return elements;
}

/**
 * Generate templated monthly resources section
 */
async function generateTemplatedMonthlyResources(studyPlan: StudyPlan, monthDate: dayjs.Dayjs): Promise<(Paragraph | Table)[]> {
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
      style: 'NoResourcesMessage'
    }));
    return elements;
  }

  // Resources title using template style
  elements.push(new Paragraph({
    children: [new TextRun({ 
      text: `📚 Resources for ${monthDate.format('MMMM YYYY')}`
    })],
    style: 'SubHeading'
  }));

  // Create subject cards using template styles
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
      cardCells.push(createTemplatedSubjectCard(firstSubject, firstResources));
    }
    
    // Second subject card (if exists)
    if (secondSubject) {
      const secondResources = await ResourceService.getResourcesForSubject(secondSubject);
      cardCells.push(createTemplatedSubjectCard(secondSubject, secondResources));
    } else {
      cardCells.push(new TableCell({
        children: [new Paragraph({ text: '' })],
        width: { size: 33.33, type: WidthType.PERCENTAGE }
      }));
    }
    
    // Third subject card (if exists)
    if (thirdSubject) {
      const thirdResources = await ResourceService.getResourcesForSubject(thirdSubject);
      cardCells.push(createTemplatedSubjectCard(thirdSubject, thirdResources));
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
    style: 'ResourceCards'
  }));

  return elements;
}

// ===== HELPER FUNCTIONS =====

/**
 * Create templated info row for cover page
 */
function createTemplatedInfoRow(icon: string, label: string, value: string): TableRow {
  return new TableRow({
    children: [
      new TableCell({
        children: [
          new Paragraph({
            children: [new TextRun({ text: icon })],
            style: 'InfoIcon',
            alignment: AlignmentType.CENTER
          })
        ],
        width: { size: 15, type: WidthType.PERCENTAGE },
      }),
      new TableCell({
        children: [
          new Paragraph({
            children: [
              new TextRun({ text: `${label}: `, style: 'InfoLabel' }),
              new TextRun({ text: value, style: 'InfoValue' })
            ]
          })
        ],
        width: { size: 85, type: WidthType.PERCENTAGE },
      })
    ]
  });
}

/**
 * Create templated strategy card
 */
function createTemplatedStrategyCard(icon: string, title: string, value: string): TableCell {
  return new TableCell({
    children: [
      new Paragraph({
        children: [new TextRun({ text: icon })],
        style: 'StrategyIcon',
        alignment: AlignmentType.CENTER,
      }),
      new Paragraph({
        children: [new TextRun({ text: title })],
        style: 'StrategyTitle',
        alignment: AlignmentType.CENTER,
      }),
      new Paragraph({
        children: [new TextRun({ text: value })],
        style: 'StrategyValue',
        alignment: AlignmentType.CENTER
      })
    ],
    width: { size: 50, type: WidthType.PERCENTAGE },
  });
}

/**
 * Create templated mini calendar for birds eye view
 */
function createTemplatedMiniCalendar(month: dayjs.Dayjs): TableCell {
  const daysInMonth = month.daysInMonth();
  const firstDayOfMonth = month.startOf('month').day();
  
  const calendarTableRows: TableRow[] = [];
  
  // Header row with day names
  const dayHeaders = ['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(day => 
    new TableCell({
      children: [
        new Paragraph({
          children: [new TextRun({ text: day })],
          style: 'CalendarDayHeader',
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
          style: 'CalendarDay',
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
    style: 'MiniCalendar'
  });
  
  return new TableCell({
    children: [calendarTable],
    width: { size: 16.67, type: WidthType.PERCENTAGE },
  });
}

/**
 * Create templated monthly calendar
 */
function createTemplatedMonthlyCalendar(monthDate: dayjs.Dayjs, cycles: any[]): Table {
  const daysInMonth = monthDate.daysInMonth();
  const firstDayOfMonth = monthDate.startOf('month').day();
  
  const calendarRows: TableRow[] = [];
  
  // Header row
  const headerCells = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(day => 
    new TableCell({
      children: [
        new Paragraph({
          children: [new TextRun({ text: day })],
          style: 'MonthlyCalendarHeader',
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
        style: 'CalendarDayNumber',
        alignment: AlignmentType.CENTER
      })
    ];

    // Add subjects using template style
    daySubjects.forEach(subject => {
      cellContent.push(new Paragraph({
        children: [new TextRun({ text: subject })],
        style: 'CalendarSubject',
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
    style: 'MonthlyCalendar'
  });
}

/**
 * Create templated subject card
 */
function createTemplatedSubjectCard(subjectCode: string, resources: any): TableCell {
  const subjectName = getSubjectName(subjectCode);
  
  const cardContent: Paragraph[] = [];
  
  // Card header with subject name
  cardContent.push(new Paragraph({
    children: [new TextRun({ text: subjectName })],
    style: 'SubjectCardTitle',
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
        style: 'ResourceCategoryTitle'
      }));
      
      // Resource items as bullet points
      category.resources.forEach((resource: any) => {
        cardContent.push(new Paragraph({
          children: [new TextRun({ text: `• ${resource.resource_title}` })],
          style: 'ResourceItem'
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
 * Create templated table cell
 */
function createTemplatedTableCell(text: string, isHeader = false): TableCell {
  return new TableCell({
    children: [
      new Paragraph({
        children: [new TextRun({ text })],
        style: isHeader ? 'TableHeader' : 'TableCell',
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
 * Get template document styles - these define the visual appearance
 */
function getTemplateDocumentStyles() {
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
        paragraph: { spacing: { after: 0 } }
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
        paragraph: { spacing: { after: 100 } }
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
        paragraph: { spacing: { after: 200 } }
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
        paragraph: { spacing: { after: 400 } }
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
        }
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
        paragraph: { spacing: { before: 200 } }
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
        paragraph: { spacing: { after: 200 } }
      },
      {
        id: 'GenerationDate',
        name: 'Generation Date',
        basedOn: 'Normal',
        run: { 
          size: 12, 
          color: '666666', 
          font: 'Aptos'
        }
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
        },
        paragraph: { spacing: { after: 200 } }
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
        },
        paragraph: { spacing: { after: 100 } }
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
        },
        paragraph: { spacing: { after: 200 } }
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
        },
        paragraph: { spacing: { before: 100, after: 50 } }
      },
      {
        id: 'ResourceItem',
        name: 'Resource Item',
        basedOn: 'Normal',
        run: { 
          size: 9, 
          color: '333333', 
          font: 'Aptos'
        },
        paragraph: { spacing: { after: 50 } }
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
        },
        paragraph: { spacing: { after: 400 } }
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
    ],
    
    // Table styles
    tableStyles: [
      {
        id: 'InfoCard',
        name: 'Info Card',
        borders: {
          top: { style: BorderStyle.SINGLE, size: 1, color: 'E0E0E0' },
          bottom: { style: BorderStyle.SINGLE, size: 1, color: 'E0E0E0' },
          left: { style: BorderStyle.SINGLE, size: 1, color: 'E0E0E0' },
          right: { style: BorderStyle.SINGLE, size: 1, color: 'E0E0E0' },
          insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: 'E0E0E0' },
          insideVertical: { style: BorderStyle.NONE, size: 0 }
        }
      },
      {
        id: 'StrategyGrid',
        name: 'Strategy Grid',
        borders: {
          top: { style: BorderStyle.NONE, size: 0 },
          bottom: { style: BorderStyle.NONE, size: 0 },
          left: { style: BorderStyle.NONE, size: 0 },
          right: { style: BorderStyle.NONE, size: 0 },
          insideHorizontal: { style: BorderStyle.NONE, size: 0 },
          insideVertical: { style: BorderStyle.NONE, size: 0 }
        }
      },
      {
        id: 'QuoteBox',
        name: 'Quote Box',
        borders: {
          top: { style: BorderStyle.NONE, size: 0 },
          bottom: { style: BorderStyle.NONE, size: 0 },
          left: { style: BorderStyle.NONE, size: 0 },
          right: { style: BorderStyle.NONE, size: 0 },
          insideHorizontal: { style: BorderStyle.NONE, size: 0 },
          insideVertical: { style: BorderStyle.NONE, size: 0 }
        }
      },
      {
        id: 'CalendarGrid',
        name: 'Calendar Grid',
        borders: {
          top: { style: BorderStyle.SINGLE, size: 1, color: 'E0E0E0' },
          bottom: { style: BorderStyle.SINGLE, size: 1, color: 'E0E0E0' },
          left: { style: BorderStyle.SINGLE, size: 1, color: 'E0E0E0' },
          right: { style: BorderStyle.SINGLE, size: 1, color: 'E0E0E0' },
          insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: 'E0E0E0' },
          insideVertical: { style: BorderStyle.SINGLE, size: 1, color: 'E0E0E0' }
        }
      },
      {
        id: 'MiniCalendar',
        name: 'Mini Calendar',
        borders: {
          top: { style: BorderStyle.NONE, size: 0 },
          bottom: { style: BorderStyle.NONE, size: 0 },
          left: { style: BorderStyle.NONE, size: 0 },
          right: { style: BorderStyle.NONE, size: 0 },
          insideHorizontal: { style: BorderStyle.NONE, size: 0 },
          insideVertical: { style: BorderStyle.NONE, size: 0 }
        }
      },
      {
        id: 'MonthHeader',
        name: 'Month Header',
        borders: {
          top: { style: BorderStyle.NONE, size: 0 },
          bottom: { style: BorderStyle.NONE, size: 0 },
          left: { style: BorderStyle.NONE, size: 0 },
          right: { style: BorderStyle.NONE, size: 0 },
          insideHorizontal: { style: BorderStyle.NONE, size: 0 },
          insideVertical: { style: BorderStyle.NONE, size: 0 }
        }
      },
      {
        id: 'MonthlyCalendar',
        name: 'Monthly Calendar',
        borders: {
          top: { style: BorderStyle.SINGLE, size: 1, color: 'E0E0E0' },
          bottom: { style: BorderStyle.SINGLE, size: 1, color: 'E0E0E0' },
          left: { style: BorderStyle.SINGLE, size: 1, color: 'E0E0E0' },
          right: { style: BorderStyle.SINGLE, size: 1, color: 'E0E0E0' },
          insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: 'E0E0E0' },
          insideVertical: { style: BorderStyle.SINGLE, size: 1, color: 'E0E0E0' }
        }
      },
      {
        id: 'ResourceCards',
        name: 'Resource Cards',
        borders: {
          top: { style: BorderStyle.NONE, size: 0 },
          bottom: { style: BorderStyle.NONE, size: 0 },
          left: { style: BorderStyle.NONE, size: 0 },
          right: { style: BorderStyle.NONE, size: 0 },
          insideHorizontal: { style: BorderStyle.NONE, size: 0 },
          insideVertical: { style: BorderStyle.NONE, size: 0 }
        }
      },
      {
        id: 'ResourcesTable',
        name: 'Resources Table',
        borders: {
          top: { style: BorderStyle.SINGLE, size: 1, color: 'E0E0E0' },
          bottom: { style: BorderStyle.SINGLE, size: 1, color: 'E0E0E0' },
          left: { style: BorderStyle.SINGLE, size: 1, color: 'E0E0E0' },
          right: { style: BorderStyle.SINGLE, size: 1, color: 'E0E0E0' },
          insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: 'E0E0E0' },
          insideVertical: { style: BorderStyle.SINGLE, size: 1, color: 'E0E0E0' }
        }
      },
      {
        id: 'LegendTable',
        name: 'Legend Table',
        borders: {
          top: { style: BorderStyle.SINGLE, size: 1, color: 'E0E0E0' },
          bottom: { style: BorderStyle.SINGLE, size: 1, color: 'E0E0E0' },
          left: { style: BorderStyle.SINGLE, size: 1, color: 'E0E0E0' },
          right: { style: BorderStyle.SINGLE, size: 1, color: 'E0E0E0' },
          insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: 'E0E0E0' },
          insideVertical: { style: BorderStyle.SINGLE, size: 1, color: 'E0E0E0' }
        }
      }
    ]
  };
}

/**
 * Create document header using template styles
 */
function createTemplatedHeader(studyPlan: StudyPlan, studentIntake: StudentIntake): Header {
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
        style: 'TableHeader',
        alignment: AlignmentType.JUSTIFIED,
      })
    ]
  });
}

/**
 * Create document footer using template styles
 */
function createTemplatedFooter(): Footer {
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
        style: 'CoverFooter',
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
    console.log(`📁 Template-based Word document download triggered: ${filename}`);
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

    console.log(`✅ Template-based Word document saved: ${filename}`);
    console.log(`   📁 Location: ${outputPath}`);
  }
}