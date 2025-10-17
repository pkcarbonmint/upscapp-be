import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, BorderStyle, AlignmentType, Header, Footer, PageBreak, PageNumber } from 'docx';
import type { StudyPlan, StudentIntake } from '../types/models';
import { CycleType } from '../types/Types';
import { ResourceService } from './ResourceService';
import { SubjectLoader } from './SubjectLoader';
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import { type Writable } from 'stream';
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

// Document styles configuration
const DOCUMENT_STYLES = {
  font: 'Aptos',
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
    heading3: 20,
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

/**
 * Generate structured Word document that matches PDF format with high-fidelity rendering
 * This is the RECOMMENDED method for professional study plan Word documents
 */
async function generateStructuredDocx(
  studyPlan: StudyPlan,
  studentIntake: StudentIntake,
  filename?: string
): Promise<void> {
  try {
    // Create high-quality Word document
    const document = await createStructuredWordDocument(studyPlan, studentIntake);

    // Save the document
    await saveDocx(document, filename || `study-plan-${studyPlan.study_plan_id || 'plan'}.docx`);

  } catch (error) {
    console.error('Failed to generate structured Word document:', error);
    throw new Error('Structured Word document generation failed');
  }
}

/**
 * Generate structured Word document and stream directly to output stream (memory efficient)
 */
async function generateStructuredDocxToStream(
  studyPlan: StudyPlan,
  studentIntake: StudentIntake,
  outputStream: Writable,
  filename?: string
): Promise<void> {
  try {
    // Create high-quality Word document
    const document = await createStructuredWordDocument(studyPlan, studentIntake);

    // Generate document buffer and stream to output
    const buffer = await Packer.toBuffer(document);
    outputStream.write(buffer);
    outputStream.end();

    console.log(`✅ Word document streamed to output: ${filename || `study-plan-${studyPlan.study_plan_id || 'plan'}.docx`}`);

  } catch (error) {
    console.error('Failed to generate structured Word document to stream:', error);
    throw new Error('Structured Word document streaming failed');
  }
}

/**
 * Main entry point - defaults to structured Word document (recommended)
 * Matches the exact interface of the original CalendarPDFService
 */
export class CalendarDocxService {
  static async generateStudyPlanDocx(
    studyPlan: StudyPlan,
    studentIntake: StudentIntake,
    options: {
      filename: string;
    }
  ): Promise<void> {
    return generateStructuredDocx(studyPlan, studentIntake, options?.filename);
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
    return generateStructuredDocxToStream(studyPlan, studentIntake, outputStream, options?.filename);
  }

  /**
   * Generate Word document content as buffer (for API responses)
   */
  static async generateStudyPlanDocxBuffer(
    studyPlan: StudyPlan,
    studentIntake: StudentIntake
  ): Promise<Buffer> {
    try {
      const document = await createStructuredWordDocument(studyPlan, studentIntake);
      return await Packer.toBuffer(document);
    } catch (error) {
      console.error('Failed to generate Word document buffer:', error);
      throw new Error('Word document buffer generation failed');
    }
  }
}

// ===== CORE WORD DOCUMENT GENERATION METHODS =====

/**
 * Create structured Word document for yearly planner book format
 */
async function createStructuredWordDocument(studyPlan: StudyPlan, studentIntake: StudentIntake): Promise<Document> {
  const year = studyPlan.targeted_year || new Date().getFullYear();

  // Build cover page elements
  const coverPageElements = generateCoverPage(studentIntake, year);
  
  // Build main content elements
  const mainContentElements: (Paragraph | Table)[] = [];
  
  // Birds Eye View
  mainContentElements.push(...generateBirdsEyeView(studyPlan));
  
  // Page break before Monthly Views
  mainContentElements.push(new Paragraph({
    children: [new PageBreak()]
  }));
  
  // Monthly Views with Daily/Weekly Pages
  const monthlyElements = await generateMonthViewWithDailyPages(studyPlan);
  mainContentElements.push(...monthlyElements.filter(item => item instanceof Paragraph || item instanceof Table));
  
  // Page break before Resources Table
  mainContentElements.push(new Paragraph({
    children: [new PageBreak()]
  }));
  
  // Resources Table
  mainContentElements.push(...await generateResourcesTable(studyPlan));
  
  // Page break before Legend
  mainContentElements.push(new Paragraph({
    children: [new PageBreak()]
  }));
  
  // Legend
  mainContentElements.push(...generateLegend(studyPlan));

  const document = new Document({
    styles: getDocumentStyles(),
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
          default: createFooter(),
        },
        children: coverPageElements, // All cover page elements
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
          default: createHeader(studyPlan, studentIntake),
        },
        footers: {
          default: createFooter(),
        },
        children: mainContentElements, // All main content elements
      },
    ],
  });

  return document;
}

/**
 * Generate cover page content
 */
function generateCoverPage(studentIntake: StudentIntake, year: number): (Paragraph | Table)[] {
  const pd = studentIntake.personal_details;
  const ss = studentIntake.study_strategy;
  const ps = studentIntake.preparation_background;

  const elements: (Paragraph | Table)[] = [];

  // Top decorative line

  // Main title with gradient effect simulation

  elements.push(new Paragraph({
    children: [new TextRun({ 
      text: 'UPSC STUDY PLANNER - ' + year.toString(), 
      bold: true, 
      size: 42, 
      color: DOCUMENT_STYLES.colors.primary,
      font: DOCUMENT_STYLES.font
    })],
    alignment: AlignmentType.CENTER,
    spacing: { after: 0 }
  }));

  // Student name with elegant styling
  elements.push(new Paragraph({
    children: [new TextRun({ 
      text: pd?.full_name?.toUpperCase() || 'STUDENT NAME', 
      bold: true, 
      size: 36, 
      color: DOCUMENT_STYLES.colors.text,
      font: DOCUMENT_STYLES.font
    })],
    alignment: AlignmentType.CENTER,
    spacing: { after: 100 }
  }));

  // Subtitle
  elements.push(new Paragraph({
    children: [new TextRun({ 
      text: 'Personalized Study Plan & Calendar', 
      size: 18, 
      color: DOCUMENT_STYLES.colors.secondary,
      font: DOCUMENT_STYLES.font
    })],
    alignment: AlignmentType.CENTER,
    spacing: { after: 200 }
  }));

  // Student info card with modern design
  const infoCardRows: TableRow[] = [
    new TableRow({
      children: [
        new TableCell({
          children: [
            new Paragraph({
              children: [new TextRun({ 
                text: '📧', 
                size: 16, 
                color: DOCUMENT_STYLES.colors.primary,
                font: DOCUMENT_STYLES.font
              })],
              alignment: AlignmentType.CENTER
            })
          ],
          width: { size: 15, type: WidthType.PERCENTAGE },
          margins: { top: 200, bottom: 200, left: 100, right: 100 }
        }),
        new TableCell({
          children: [
            new Paragraph({
              children: [
                new TextRun({ 
                  text: 'Email: ', 
                  bold: true, 
                  size: 14, 
                  color: DOCUMENT_STYLES.colors.secondary,
                  font: DOCUMENT_STYLES.font
                }),
                new TextRun({ 
                  text: pd?.email || 'N/A', 
                  size: 14, 
                  color: DOCUMENT_STYLES.colors.text,
                  font: DOCUMENT_STYLES.font
                })
              ]
            })
          ],
          width: { size: 85, type: WidthType.PERCENTAGE },
          margins: { top: 200, bottom: 200, left: 100, right: 100 }
        })
      ]
    }),
    new TableRow({
      children: [
        new TableCell({
          children: [
            new Paragraph({
              children: [new TextRun({ 
                text: '📱', 
                size: 16, 
                color: DOCUMENT_STYLES.colors.primary,
                font: DOCUMENT_STYLES.font
              })],
              alignment: AlignmentType.CENTER
            })
          ],
          width: { size: 15, type: WidthType.PERCENTAGE },
          margins: { top: 200, bottom: 200, left: 100, right: 100 }
        }),
        new TableCell({
          children: [
            new Paragraph({
              children: [
                new TextRun({ 
                  text: 'Phone: ', 
                  bold: true, 
                  size: 14, 
                  color: DOCUMENT_STYLES.colors.secondary,
                  font: DOCUMENT_STYLES.font
                }),
                new TextRun({ 
                  text: pd?.phone_number || 'N/A', 
                  size: 14, 
                  color: DOCUMENT_STYLES.colors.text,
                  font: DOCUMENT_STYLES.font
                })
              ]
            })
          ],
          width: { size: 85, type: WidthType.PERCENTAGE },
          margins: { top: 200, bottom: 200, left: 100, right: 100 }
        })
      ]
    }),
    new TableRow({
      children: [
        new TableCell({
          children: [
            new Paragraph({
              children: [new TextRun({ 
                text: '📍', 
                size: 16, 
                color: DOCUMENT_STYLES.colors.primary,
                font: DOCUMENT_STYLES.font
              })],
              alignment: AlignmentType.CENTER
            })
          ],
          width: { size: 15, type: WidthType.PERCENTAGE },
          margins: { top: 200, bottom: 200, left: 100, right: 100 }
        }),
        new TableCell({
          children: [
            new Paragraph({
              children: [
                new TextRun({ 
                  text: 'Location: ', 
                  bold: true, 
                  size: 14, 
                  color: DOCUMENT_STYLES.colors.secondary,
                  font: DOCUMENT_STYLES.font
                }),
                new TextRun({ 
                  text: pd?.present_location || 'N/A', 
                  size: 14, 
                  color: DOCUMENT_STYLES.colors.text,
                  font: DOCUMENT_STYLES.font
                })
              ]
            })
          ],
          width: { size: 85, type: WidthType.PERCENTAGE },
          margins: { top: 200, bottom: 200, left: 100, right: 100 }
        })
      ]
    })
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

  // Study strategy highlights
  elements.push(new Paragraph({
    children: [new TextRun({ 
      text: 'Study Strategy Overview', 
      bold: true, 
      size: 24, 
      color: DOCUMENT_STYLES.colors.primary,
      font: DOCUMENT_STYLES.font
    })],
    alignment: AlignmentType.CENTER,
    spacing: { after: 400 }
  }));

  // Strategy cards in 2x2 grid
  const strategyRows: TableRow[] = [
    new TableRow({
      children: [
        createStrategyCard('⏰', 'Weekly Hours', ss?.weekly_study_hours || 'N/A'),
        createStrategyCard('🎯', 'Study Approach', ss?.study_approach || 'N/A')
      ]
    }),
    new TableRow({
      children: [
        createStrategyCard('📚', 'Optional Subject', studentIntake.optional_subject?.optional_subject_name || 'N/A'),
        createStrategyCard('🏆', 'Previous Attempts', ps?.number_of_attempts || 'N/A')
      ]
    })
  ];

  elements.push(new Table({
    rows: strategyRows,
    width: { size: 100, type: WidthType.PERCENTAGE },
    columnWidths: [4000, 4000],
    borders: {
      top: { style: BorderStyle.NONE, size: 0 },
      bottom: { style: BorderStyle.NONE, size: 0 },
      left: { style: BorderStyle.NONE, size: 0 },
      right: { style: BorderStyle.NONE, size: 0 },
      insideHorizontal: { style: BorderStyle.NONE, size: 0 },
      insideVertical: { style: BorderStyle.NONE, size: 0 }
    }
  }));

  elements.push(new Paragraph({ text: '', spacing: { after: 800 } }));

  // Inspirational quote with better styling
  elements.push(new Table({
    rows: [
      new TableRow({
        children: [
          new TableCell({
            children: [
              new Paragraph({
                children: [new TextRun({ 
                  text: '"Success is the sum of small efforts repeated day in and day out."', 
                  italics: true, 
                  size: 18, 
                  color: DOCUMENT_STYLES.colors.primary,
                  font: DOCUMENT_STYLES.font
                })],
                alignment: AlignmentType.CENTER
              }),
              new Paragraph({
                children: [new TextRun({ 
                  text: '— Robert Collier', 
                  size: 14, 
                  color: DOCUMENT_STYLES.colors.secondary,
                  font: DOCUMENT_STYLES.font
                })],
                alignment: AlignmentType.CENTER,
                spacing: { before: 200 }
              })
            ],
            width: { size: 100, type: WidthType.PERCENTAGE },
            margins: { top: 400, bottom: 400, left: 400, right: 400 },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 1, color: DOCUMENT_STYLES.colors.primary },
              bottom: { style: BorderStyle.SINGLE, size: 1, color: DOCUMENT_STYLES.colors.primary },
              left: { style: BorderStyle.SINGLE, size: 1, color: DOCUMENT_STYLES.colors.primary },
              right: { style: BorderStyle.SINGLE, size: 1, color: DOCUMENT_STYLES.colors.primary }
            }
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

  elements.push(new Paragraph({ text: '', spacing: { after: 600 } }));

  // Footer with branding
  elements.push(new Paragraph({
    children: [new TextRun({ 
      text: 'La Mentora Study Planner v1.0 - © 2025-2026 All Rights Reserved', 
      size: 14, 
      color: DOCUMENT_STYLES.colors.secondary,
      font: DOCUMENT_STYLES.font
    })],
    alignment: AlignmentType.CENTER,
    spacing: { after: 200 }
  }));

  elements.push(new Paragraph({
    children: [new TextRun({ 
      text: `Generated on ${new Date().toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })}`, 
      size: 12, 
      color: DOCUMENT_STYLES.colors.secondary,
      font: DOCUMENT_STYLES.font
    })],
    alignment: AlignmentType.CENTER
  }));

  return elements;
}

/**
 * Generate birds eye view calendar
 */
function generateBirdsEyeView(studyPlan: StudyPlan): (Paragraph | Table)[] {
  const cycles = studyPlan.cycles || [];
  const elements: (Paragraph | Table)[] = [];

  // Title
  elements.push(new Paragraph({
    children: [new TextRun({ 
      text: 'Birds Eye View - Yearly Calendar', 
      bold: true, 
      size: DOCUMENT_STYLES.sizes.heading1, 
      color: DOCUMENT_STYLES.colors.primary,
      font: DOCUMENT_STYLES.font
    })],
    spacing: { after: 400 }
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

  // Create single table with all month rows
  const allTableRows: TableRow[] = [];
  
  monthRows.forEach((monthRow) => {
    // Header row with month names
    const headerCells: TableCell[] = monthRow.map(({ month, cycle }) => {
      const cycleColor = cycle ? CYCLE_TYPE_COLORS[cycle.cycleType as keyof typeof CYCLE_TYPE_COLORS]?.bg || 'FFFFFF' : 'FFFFFF';
      const cycleName = cycle ? cycle.cycleName.replace(/ Cycle$/, '') : '';
      
      return new TableCell({
        children: [
          new Paragraph({
            children: [new TextRun({ 
              text: cycleName, 
              bold: true, 
              size: 10, 
              color: DOCUMENT_STYLES.colors.primary,
              font: DOCUMENT_STYLES.font
            })],
            alignment: AlignmentType.CENTER
          }),
          new Paragraph({
            children: [new TextRun({ 
              text: month.format('MMM YYYY').toUpperCase(), 
              bold: true, 
              size: 12, 
              color: DOCUMENT_STYLES.colors.text,
              font: DOCUMENT_STYLES.font
            })],
            alignment: AlignmentType.CENTER
          })
        ],
        width: { size: 16.67, type: WidthType.PERCENTAGE },
        shading: { fill: cycleColor },
        margins: { top: 200, bottom: 200, left: 100, right: 100 }
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
    
    // Calendar grid for each month - use table structure for perfect alignment
    const calendarCells: TableCell[] = monthRow.map(({ month }) => {
      const daysInMonth = month.daysInMonth();
      const firstDayOfMonth = month.startOf('month').day();
      
      // Create a mini table for the calendar with proper alignment
      const calendarTableRows: TableRow[] = [];
      
      // Header row with day names
      const dayHeaders = ['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(day => 
        new TableCell({
          children: [
            new Paragraph({
              children: [new TextRun({ 
                text: day, 
                bold: true, 
                size: 8, 
                color: DOCUMENT_STYLES.colors.secondary,
                font: DOCUMENT_STYLES.font
              })],
              alignment: AlignmentType.CENTER
            })
          ],
          width: { size: 14.28, type: WidthType.PERCENTAGE },
          margins: { top: 50, bottom: 50, left: 20, right: 20 }
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
          margins: { top: 20, bottom: 20, left: 10, right: 10 }
        }));
      }
      
      // Add days of the month
      for (let day = 1; day <= daysInMonth; day++) {
        currentWeek.push(new TableCell({
          children: [
            new Paragraph({
              children: [new TextRun({ 
                text: day.toString(), 
                size: 8, 
                color: DOCUMENT_STYLES.colors.text,
                font: DOCUMENT_STYLES.font
              })],
              alignment: AlignmentType.CENTER
            })
          ],
          width: { size: 14.28, type: WidthType.PERCENTAGE },
          margins: { top: 20, bottom: 20, left: 10, right: 10 }
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
          margins: { top: 20, bottom: 20, left: 10, right: 10 }
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
        margins: { top: 100, bottom: 100, left: 50, right: 50 }
      });
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
  
  // Create single table with all rows
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
 * Generate monthly views with daily/weekly pages
 */
async function generateMonthViewWithDailyPages(studyPlan: StudyPlan): Promise<(Paragraph | Table)[]> {
  const cycles = studyPlan.cycles || [];
  const elements: (Paragraph | Table)[] = [];

  const minDate = dayjs(studyPlan.start_date);
  const maxDate = dayjs(`${studyPlan.targeted_year}-08-31`);
  const endDate = maxDate.endOf('month');

  // Configurable limit - set to null for all months, or a number to limit
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

    // Month title with cycle name using table for proper alignment
    const cycleName = cycle ? cycle.cycleName.replace(/ Cycle$/, '') : '';
    elements.push(new Table({
      rows: [
        new TableRow({
          children: [
            new TableCell({
              children: [
                new Paragraph({
                  children: [new TextRun({ 
                    text: `${monthName.toUpperCase()} ${monthYear}`, 
                    bold: true, 
                    size: DOCUMENT_STYLES.sizes.heading1, 
                    color: DOCUMENT_STYLES.colors.primary,
                    font: DOCUMENT_STYLES.font
                  })],
                  alignment: AlignmentType.LEFT
                })
              ],
              width: { size: 50, type: WidthType.PERCENTAGE },
              margins: { top: 0, bottom: 0, left: 0, right: 0 }
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [new TextRun({ 
                    text: cycleName, 
                    bold: true, 
                    size: 25, 
                    color: DOCUMENT_STYLES.colors.primary,
                    font: DOCUMENT_STYLES.font
                  })],
                  alignment: AlignmentType.RIGHT
                })
              ],
              width: { size: 50, type: WidthType.PERCENTAGE },
              margins: { top: 0, bottom: 0, left: 0, right: 0 }
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
    
    // Add spacing after the title
    elements.push(new Paragraph({ text: '', spacing: { after: 400 } }));

    // Monthly calendar grid
    const daysInMonth = monthDate.daysInMonth();
    const firstDayOfMonth = monthDate.startOf('month').day();
    
    const calendarRows: TableRow[] = [];
    
    // Header row
    const headerCells = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(day => 
      new TableCell({
        children: [
          new Paragraph({
            children: [new TextRun({ 
              text: day, 
              bold: true, 
              size: 12, 
              color: DOCUMENT_STYLES.colors.primary,
              font: DOCUMENT_STYLES.font
            })],
            alignment: AlignmentType.CENTER
          })
        ],
        width: { size: 14.28, type: WidthType.PERCENTAGE },
        shading: { fill: 'F8F9FA' },
        margins: { top: 200, bottom: 200, left: 100, right: 100 }
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
        margins: { top: 200, bottom: 200, left: 100, right: 100 }
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
          children: [new TextRun({ 
            text: day.toString(), 
            bold: true, 
            size: 14, 
            color: DOCUMENT_STYLES.colors.text,
            font: DOCUMENT_STYLES.font
          })],
          alignment: AlignmentType.CENTER
        })
      ];

      // Add subjects
      daySubjects.forEach(subject => {
        cellContent.push(new Paragraph({
          children: [new TextRun({ 
            text: subject, 
            size: 8, 
            color: DOCUMENT_STYLES.colors.text,
            font: DOCUMENT_STYLES.font
          })],
          alignment: AlignmentType.CENTER
        }));
      });

      currentWeek.push(new TableCell({
        children: cellContent,
        width: { size: 14.28, type: WidthType.PERCENTAGE },
        shading: { fill: cycleColor },
        margins: { top: 200, bottom: 200, left: 100, right: 100 }
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
        margins: { top: 200, bottom: 200, left: 100, right: 100 }
      }));
    }
    if (currentWeek.length > 0) {
      calendarRows.push(new TableRow({ children: currentWeek }));
    }

    elements.push(new Table({
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
    }));

    // Add monthly resources
    elements.push(new Paragraph({ text: '', spacing: { after: 400 } }));
    elements.push(...await generateMonthlyResources(studyPlan, monthDate));

    monthCount++;
  }

  return elements;
}

/**
 * Generate monthly resources section
 */
async function generateMonthlyResources(studyPlan: StudyPlan, monthDate: dayjs.Dayjs): Promise<(Paragraph | Table)[]> {
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
        text: 'No resources for this month.', 
        italics: true, 
        color: DOCUMENT_STYLES.colors.secondary,
        font: DOCUMENT_STYLES.font
      })],
      spacing: { after: 400 }
    }));
    return elements;
  }

  // Resources title
  elements.push(new Paragraph({
    children: [new TextRun({ 
      text: `📚 Resources for ${monthDate.format('MMMM YYYY')}`, 
      bold: true, 
      size: DOCUMENT_STYLES.sizes.heading2, 
      color: DOCUMENT_STYLES.colors.primary,
      font: DOCUMENT_STYLES.font
    })],
    spacing: { after: 400 }
  }));

  // Create single table with 3-column card layout for all subjects
  const subjectsArray = Array.from(monthlySubjects);
  const subjectTriplets: Array<[string, string?, string?]> = [];
  
  // Group subjects into triplets for 3-column layout
  for (let i = 0; i < subjectsArray.length; i += 3) {
    subjectTriplets.push([subjectsArray[i], subjectsArray[i + 1], subjectsArray[i + 2]]);
  }

  // Create a single table with all subject card rows
  const allCardRows: TableRow[] = [];
  
  for (const [firstSubject, secondSubject, thirdSubject] of subjectTriplets) {
    // Create card row with three subject cards
    const cardCells: TableCell[] = [];
    
    // First subject card
    const firstResources = await ResourceService.getResourcesForSubject(firstSubject);
    cardCells.push(createSubjectCard(firstSubject, firstResources));
    
    // Second subject card (if exists)
    if (secondSubject) {
      const secondResources = await ResourceService.getResourcesForSubject(secondSubject);
      cardCells.push(createSubjectCard(secondSubject, secondResources));
    } else {
      // Empty cell for missing subjects
      cardCells.push(new TableCell({
        children: [new Paragraph({ text: '' })],
        width: { size: 33.33, type: WidthType.PERCENTAGE }
      }));
    }
    
    // Third subject card (if exists)
    if (thirdSubject) {
      const thirdResources = await ResourceService.getResourcesForSubject(thirdSubject);
      cardCells.push(createSubjectCard(thirdSubject, thirdResources));
    } else {
      // Empty cell for missing subjects
      cardCells.push(new TableCell({
        children: [new Paragraph({ text: '' })],
        width: { size: 33.33, type: WidthType.PERCENTAGE }
      }));
    }
    
    allCardRows.push(new TableRow({ children: cardCells }));
  }
  
  // Add the single table with all subject cards
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

/**
 * Generate resources table
 */
async function generateResourcesTable(studyPlan: StudyPlan): Promise<(Paragraph | Table)[]> {
  const uniqueSubjects = getUniqueSubjects(studyPlan);
  const elements: (Paragraph | Table)[] = [];

  // Title
  elements.push(new Paragraph({
    children: [new TextRun({ 
      text: '📊 Comprehensive Resources by Subject', 
      bold: true, 
      size: DOCUMENT_STYLES.sizes.heading1, 
      color: DOCUMENT_STYLES.colors.primary,
      font: DOCUMENT_STYLES.font
    })],
    spacing: { after: 400 }
  }));

  // Create resources table
  const resourceRows: TableRow[] = [];
  
  // Header row
  resourceRows.push(new TableRow({
    children: [
      createTableCell('Subject', DOCUMENT_STYLES.colors.primary, true),
      createTableCell('Primary Books', DOCUMENT_STYLES.colors.primary, true),
      createTableCell('Video Content', DOCUMENT_STYLES.colors.primary, true),
      createTableCell('Practice Materials', DOCUMENT_STYLES.colors.primary, true),
      createTableCell('Current Affairs', DOCUMENT_STYLES.colors.primary, true)
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
        createTableCell(subjectName, DOCUMENT_STYLES.colors.text, true),
        createTableCell(primaryBooks, DOCUMENT_STYLES.colors.text),
        createTableCell(videoContent, DOCUMENT_STYLES.colors.text),
        createTableCell(practiceResources, DOCUMENT_STYLES.colors.text),
        createTableCell(currentAffairs, DOCUMENT_STYLES.colors.text)
      ]
    }));
  }

  elements.push(new Table({
    rows: resourceRows,
    width: { size: 100, type: WidthType.PERCENTAGE },
    columnWidths: [2000, 3000, 3000, 3000, 3000],
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
 * Generate legend
 */
function generateLegend(studyPlan: StudyPlan): (Paragraph | Table)[] {
  const cycles = studyPlan.cycles || [];
  const uniqueSubjects = getUniqueSubjects(studyPlan);
  const elements: (Paragraph | Table)[] = [];

  // Title
  elements.push(new Paragraph({
    children: [new TextRun({ 
      text: 'ℹ️ Legend & Study Phases', 
      bold: true, 
      size: DOCUMENT_STYLES.sizes.heading1, 
      color: DOCUMENT_STYLES.colors.primary,
      font: DOCUMENT_STYLES.font
    })],
    spacing: { after: 400 }
  }));

  // Create legend table
  const legendRows: TableRow[] = [];
  
  // Header row
  legendRows.push(new TableRow({
    children: [
      createTableCell('Color', DOCUMENT_STYLES.colors.primary, true),
      createTableCell('Cycle/Subject', DOCUMENT_STYLES.colors.primary, true),
      createTableCell('Description', DOCUMENT_STYLES.colors.primary, true)
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
          margins: { top: 200, bottom: 200, left: 200, right: 200 }
        }),
        createTableCell(cycle.cycleName, DOCUMENT_STYLES.colors.text, true),
        createTableCell(`Study phase with ${cycle.cycleDuration} weeks duration`, DOCUMENT_STYLES.colors.text)
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
          margins: { top: 200, bottom: 200, left: 200, right: 200 }
        }),
        createTableCell(subjectName, DOCUMENT_STYLES.colors.text, true),
        createTableCell('Subject area for study', DOCUMENT_STYLES.colors.text)
      ]
    }));
  });

  elements.push(new Table({
    rows: legendRows,
    width: { size: 100, type: WidthType.PERCENTAGE },
    columnWidths: [2000, 4000, 6000],
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

// ===== HELPER FUNCTIONS =====

/**
 * Create a subject card with resources
 */
function createSubjectCard(subjectCode: string, resources: any): TableCell {
  const subjectName = getSubjectName(subjectCode);
  
  // Create card content with header and resource sections
  const cardContent: Paragraph[] = [];
  
  // Card header with subject name
  cardContent.push(new Paragraph({
    children: [new TextRun({ 
      text: subjectName, 
      bold: true, 
      size: 14, 
      color: DOCUMENT_STYLES.colors.primary,
      font: DOCUMENT_STYLES.font
    })],
    alignment: AlignmentType.CENTER,
    spacing: { after: 200 }
  }));
  
  // Resource categories with bullet points
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
        children: [new TextRun({ 
          text: category.name, 
          bold: true, 
          size: 10, 
          color: DOCUMENT_STYLES.colors.secondary,
          font: DOCUMENT_STYLES.font
        })],
        spacing: { before: 100, after: 50 }
      }));
      
      // Resource items as bullet points
      category.resources.forEach((resource: any) => {
        cardContent.push(new Paragraph({
          children: [new TextRun({ 
            text: `• ${resource.resource_title}`, 
            size: 9, 
            color: DOCUMENT_STYLES.colors.text,
            font: DOCUMENT_STYLES.font
          })],
          spacing: { after: 50 }
        }));
      });
    }
  }
  
  return new TableCell({
    children: cardContent,
    width: { size: 33.33, type: WidthType.PERCENTAGE },
    margins: { top: 200, bottom: 200, left: 150, right: 150 },
    shading: { fill: 'F8F9FA' },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: 'E0E0E0' },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: 'E0E0E0' },
      left: { style: BorderStyle.SINGLE, size: 1, color: 'E0E0E0' },
      right: { style: BorderStyle.SINGLE, size: 1, color: 'E0E0E0' }
    }
  });
}

/**
 * Create a table cell with text content
 */
function createTableCell(text: string, color: string, bold = false): TableCell {
  return new TableCell({
    children: [
      new Paragraph({
        children: [new TextRun({ 
          text, 
          bold, 
          color, 
          font: DOCUMENT_STYLES.font,
          size: DOCUMENT_STYLES.sizes.body
        })],
        alignment: AlignmentType.LEFT
      })
    ],
    margins: { top: 200, bottom: 200, left: 200, right: 200 }
  });
}

/**
 * Create a strategy card with icon, title, and value
 */
function createStrategyCard(icon: string, title: string, value: string): TableCell {
  return new TableCell({
    children: [
      new Paragraph({
        children: [new TextRun({ 
          text: icon, 
          size: 20, 
          color: DOCUMENT_STYLES.colors.primary,
          font: DOCUMENT_STYLES.font
        })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 }
      }),
      new Paragraph({
        children: [new TextRun({ 
          text: title, 
          bold: true, 
          size: 12, 
          color: DOCUMENT_STYLES.colors.secondary,
          font: DOCUMENT_STYLES.font
        })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 100 }
      }),
      new Paragraph({
        children: [new TextRun({ 
          text: value, 
          size: 14, 
          color: DOCUMENT_STYLES.colors.text,
          font: DOCUMENT_STYLES.font
        })],
        alignment: AlignmentType.CENTER
      })
    ],
    width: { size: 50, type: WidthType.PERCENTAGE },
    margins: { top: 300, bottom: 300, left: 200, right: 200 },
    shading: { fill: 'F8F9FA' },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: 'E0E0E0' },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: 'E0E0E0' },
      left: { style: BorderStyle.SINGLE, size: 1, color: 'E0E0E0' },
      right: { style: BorderStyle.SINGLE, size: 1, color: 'E0E0E0' }
    }
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
 * Get document styles
 */
function getDocumentStyles() {
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
      }
    ]
  };
}

/**
 * Create document header
 */
function createHeader(studyPlan: StudyPlan, studentIntake: StudentIntake): Header {
  return new Header({
    children: [
      new Paragraph({
        children: [
          new TextRun({
            text: `Student: ${studentIntake.personal_details?.full_name || '[Name]'}`,
            bold: true,
            size: DOCUMENT_STYLES.sizes.small,
            color: DOCUMENT_STYLES.colors.primary,
            font: DOCUMENT_STYLES.font
          }),
          new TextRun({
            text: `\t\tTarget Year: ${studyPlan.targeted_year}`,
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
function createFooter(): Footer {
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
            size: DOCUMENT_STYLES.sizes.small,
            color: DOCUMENT_STYLES.colors.secondary,
            font: DOCUMENT_STYLES.font
          }),
          new TextRun({
            children: [PageNumber.CURRENT],
            size: DOCUMENT_STYLES.sizes.small,
            color: DOCUMENT_STYLES.colors.secondary,
            font: DOCUMENT_STYLES.font
          }),
          new TextRun({
            text: ' of ',
            size: DOCUMENT_STYLES.sizes.small,
            color: DOCUMENT_STYLES.colors.secondary,
            font: DOCUMENT_STYLES.font
          }),
          new TextRun({
            children: [PageNumber.TOTAL_PAGES],
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
    console.log(`📁 Word document download triggered: ${filename}`);
  } else {
    // Node.js environment - save to filesystem
    const fs = await import('fs');
    const path = await import('path');

    const outputDir = path.join(process.cwd(), 'generated-docs');

    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const outputPath = path.join(outputDir, filename);
    const buffer = await Packer.toBuffer(document);
    fs.writeFileSync(outputPath, buffer);

    console.log(`✅ Word document saved: ${filename}`);
    console.log(`   📁 Location: ${outputPath}`);
  }
}
