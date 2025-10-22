import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, BorderStyle, AlignmentType, Header, Footer, PageBreak, PageNumber } from 'docx';
import type { StudyPlan, StudentIntake } from '../types/models';
import { CycleType } from '../types/Types';
import { ResourceService } from './ResourceService';
import { SubjectLoader } from './SubjectLoader';
import { DayOfWeek } from 'scheduler';
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import { type Writable } from 'stream';
import optionalSubjectsData from '../config/optional_subjects.json';

dayjs.extend(isBetween);
dayjs.extend(isSameOrBefore);

const genOverview = false, genInspirationQuote = false, genStrategyOverview = false;
// Color mapping for different cycle types (matching the PDF service)
const CYCLE_TYPE_COLORS = {
  [CycleType.C1]: { bg: 'DBEAFE', border: '3B82F6', fg: '1D4ED8' }, // Light blue with vivid blue text
  [CycleType.C2]: { bg: 'DCFCE7', border: '22C55E', fg: '15803D' }, // Light green with rich green text
  [CycleType.C3]: { bg: 'FCE7F3', border: 'EC4899', fg: 'BE185D' }, // Light pink with elegant magenta text
  [CycleType.C4]: { bg: 'FEE2E2', border: 'EF4444', fg: 'B91C1C' }, // Light red with deep red text
  [CycleType.C5]: { bg: 'EDE9FE', border: '8B5CF6', fg: '6D28D9' }, // Light violet with royal purple text
  [CycleType.C5B]: { bg: 'EDE9FE', border: '8B5CF6', fg: '6D28D9' }, // Light violet with royal purple text
  [CycleType.C6]: { bg: 'E0F2FE', border: '06B6D4', fg: '0369A1' }, // Light sky with teal text
  [CycleType.C7]: { bg: 'FFEDD5', border: 'F59E0B', fg: 'C2410C' }, // Light orange with warm orange text
  [CycleType.C8]: { bg: 'ECFCCB', border: '84CC16', fg: '3F6212' }, // Light lime with olive text
} as const;

// Document styles configuration
const DOCUMENT_STYLES = {
  font: 'Aptos',
  colors: {
    primary: '2563EB', // brighter primary blue
    secondary: '64748B', // slate
    text: '1F2937', // gray-800 for elegance and contrast
    success: '16A34A',
    warning: 'F59E0B',
    info: '06B6D4',
    error: 'EF4444'
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

// Table style names for Word document customization
// These styles should be defined in the Word template document
const TABLE_STYLE_NAMES = {
  studentInfo: 'StudentInfoTable',
  strategyCards: 'StrategyCardsTable',
  quote: 'QuoteTable',
  birdsEyeView: 'BirdsEyeViewTable',
  monthlyCalendar: 'MonthlyCalendarTable',
  miniCalendar: 'MiniCalendarTable',
  subjectCards: 'SubjectCardsTable',
  resources: 'ResourcesTable',
  legend: 'LegendTable',
  monthTitle: 'MonthTitleTable',
  weeklySchedule: 'WeeklyScheduleTable',
  weekTitle: 'WeekTitleTable',
  coverTitle: 'CoverTitleTable'
} as const;

const createDocument = (studyPlan: StudyPlan, studentIntake: StudentIntake) => (coverPageElements: (Paragraph | Table)[], mainContentElements: (Paragraph | Table)[]) => {
  return new Document({
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

}

/**
 * Generate structured Word document that matches PDF format with high-fidelity rendering
 * This is the RECOMMENDED method for professional study plan Word documents
 */
async function generateStructuredDocx(
  studyPlan: StudyPlan,
  studentIntake: StudentIntake,
  filename?: string
): Promise<void> {
  // Create high-quality Word document
  const [coverPageElements, mainContentElements] = await createStructuredWordDocument(studyPlan, studentIntake);
  const document = createDocument(studyPlan, studentIntake)(coverPageElements, mainContentElements);

  // Save the document
  await saveDocx(document, filename || `study-plan-${studyPlan.study_plan_id || 'plan'}.docx`);
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
    const [coverPageElements, mainContentElements] = await createStructuredWordDocument(studyPlan, studentIntake);
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
      const [coverPageElements, mainContentElements] = await createStructuredWordDocument(studyPlan, studentIntake);
      const document = createDocument(studyPlan, studentIntake)(coverPageElements, mainContentElements);
      return await Packer.toBuffer(document);
    } catch (error) {
      console.error('Failed to generate Word document buffer:', error);
      throw new Error('Word document buffer generation failed');
    }
  }

  /**
   * Generate a styled template document for manual editing
   * This creates a blank document with all styles defined but no content
   */
  static async generateStyledTemplate(): Promise<void> {
    return generateStyledTemplate();
  }

  /**
   * Load a Word template document with pre-defined styles
   * This allows users to customize table styles in Word and save as template
   */
  static async loadTemplateDocument(templatePath?: string): Promise<Document> {
    return loadTemplateDocument(templatePath);
  }
}

// ===== CORE WORD DOCUMENT GENERATION METHODS =====

/**
 * Create structured Word document for yearly planner book format
 */
async function createStructuredWordDocument(studyPlan: StudyPlan, studentIntake: StudentIntake) {
  const year = studyPlan.targeted_year || new Date().getFullYear();

  // Build cover page elements
  const coverPageElements = await generateCoverPage(studentIntake, studyPlan, year);

  // Build main content elements
  const mainContentElements: (Paragraph | Table)[] = [];

  // Birds Eye View
  mainContentElements.push(...generateBirdsEyeView(studyPlan));

  // Birds Eye View Legend
  mainContentElements.push(...generateBirdsEyeLegend(studyPlan));

  // Page break before Monthly Views
  mainContentElements.push(new Paragraph({
    children: [new PageBreak()]
  }));

  // Monthly Views with Daily/Weekly Pages
  const monthlyElements = await generateMonthViewWithDailyPages(studyPlan, studentIntake);
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
  return [coverPageElements, mainContentElements];
}

/**
 * Generate cover page content
 */
async function generateCoverPage(studentIntake: StudentIntake, studyPlan: StudyPlan, year: number): Promise<(Paragraph | Table)[]> {
  const pd = studentIntake.personal_details;
  const ss = studentIntake.study_strategy;
  const ps = studentIntake.preparation_background;

  const elements: (Paragraph | Table)[] = [];

  // Professional branding header
  elements.push(new Paragraph({
    children: [new TextRun({
      text: '🎓 LA MENTORA'
    })],
    style: 'CompanyBrand'
  }));

  elements.push(new Paragraph({
    children: [new TextRun({
      text: 'Study Planner v1.0'
    })],
    style: 'VersionInfo'
  }));

  elements.push(new Paragraph({
    children: [new TextRun({
      text: '"Your Path to UPSC Success"'
    })],
    style: 'CompanyTagline'
  }));

  elements.push(new Paragraph({ text: '', spacing: { after: 400 } }));

  // Main title with enhanced styling
  elements.push(new Table({
    rows: [
      new TableRow({
        children: [
          new TableCell({
            children: [
              new Paragraph({
                children: [new TextRun({
                  text: 'UPSC STUDY PLANNER'
                })],
                style: 'CoverPageTitle'
              }),
              new Paragraph({
                children: [new TextRun({
                  text: year.toString()
                })],
                style: 'CoverPageYear'
              })
            ],
            width: { size: 100, type: WidthType.PERCENTAGE },
            margins: { top: 300, bottom: 300, left: 200, right: 200 },
            borders: {
              top: { style: BorderStyle.DOUBLE, size: 3, color: DOCUMENT_STYLES.colors.primary },
              bottom: { style: BorderStyle.DOUBLE, size: 3, color: DOCUMENT_STYLES.colors.primary },
              left: { style: BorderStyle.DOUBLE, size: 3, color: DOCUMENT_STYLES.colors.primary },
              right: { style: BorderStyle.DOUBLE, size: 3, color: DOCUMENT_STYLES.colors.primary }
            }
          })
        ]
      })
    ],
    width: { size: 100, type: WidthType.PERCENTAGE },
    style: TABLE_STYLE_NAMES.coverTitle,
    borders: {
      top: { style: BorderStyle.NONE, size: 0 },
      bottom: { style: BorderStyle.NONE, size: 0 },
      left: { style: BorderStyle.NONE, size: 0 },
      right: { style: BorderStyle.NONE, size: 0 },
      insideHorizontal: { style: BorderStyle.NONE, size: 0 },
      insideVertical: { style: BorderStyle.NONE, size: 0 }
    }
  }));

  elements.push(new Paragraph({ text: '', spacing: { after: 200 } }));

  // Student name with elegant styling
  elements.push(new Paragraph({
    children: [new TextRun({
      text: pd?.full_name?.toUpperCase() || 'STUDENT NAME'
    })],
    style: 'StudentName'
  }));

  // Subtitle
  elements.push(new Paragraph({
    children: [new TextRun({
      text: 'Personalized Study Plan & Calendar'
    })],
    style: 'CoverPageSubtitle'
  }));

  elements.push(new Paragraph({ text: '', spacing: { after: 200 } }));

  // Student Profile heading
  elements.push(new Paragraph({
    children: [new TextRun({
      text: 'STUDENT PROFILE'
    })],
    style: 'CardTitle'
  }));

  // Enhanced student profile card
  const profileCardRows: TableRow[] = [
    new TableRow({
      children: [
        new TableCell({
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: '📧 '
                }),
                new TextRun({
                  text: pd?.email || 'N/A'
                })
              ],
              style: 'ProfileData'
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: '📱 '
                }),
                new TextRun({
                  text: pd?.phone_number || 'N/A'
                })
              ],
              style: 'ProfileData'
            })
          ],
          width: { size: 50, type: WidthType.PERCENTAGE },
          margins: { top: 150, bottom: 150, left: 200, right: 100 }
        }),
        new TableCell({
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: '📍 '
                }),
                new TextRun({
                  text: pd?.present_location || 'N/A'
                })
              ],
              style: 'ProfileData'
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: '🎯 Target: UPSC '
                }),
                new TextRun({
                  text: year.toString()
                })
              ],
              style: 'ProfileData'
            })
          ],
          width: { size: 50, type: WidthType.PERCENTAGE },
          margins: { top: 150, bottom: 150, left: 100, right: 200 }
        })
      ]
    }),
    new TableRow({
      children: [
        new TableCell({
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: '📚 Optional: '
                }),
                new TextRun({
                  text: studentIntake.optional_subject?.optional_subject_name ||
                    getOptionalSubjectName(studentIntake.study_strategy?.upsc_optional_subject || '') || 'N/A'
                })
              ],
              style: 'ProfileData'
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: '🏆 Previous Attempts: '
                }),
                new TextRun({
                  text: ps?.number_of_attempts || 'N/A'
                })
              ],
              style: 'ProfileData'
            })
          ],
          width: { size: 50, type: WidthType.PERCENTAGE },
          margins: { top: 150, bottom: 150, left: 200, right: 100 }
        }),
        new TableCell({
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: '⏰ Study Hours: '
                }),
                new TextRun({
                  text: ss?.weekly_study_hours || 'N/A'
                })
              ],
              style: 'ProfileData'
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: `📅 Plan Duration: ${calculatePlanDuration(studyPlan)} months`
                })
              ],
              style: 'ProfileData'
            })
          ],
          width: { size: 50, type: WidthType.PERCENTAGE },
          margins: { top: 150, bottom: 150, left: 100, right: 200 }
        })
      ]
    })
  ];

  elements.push(new Table({
    rows: profileCardRows,
    width: { size: 100, type: WidthType.PERCENTAGE },
    style: TABLE_STYLE_NAMES.studentInfo,
    borders: {
      top: { style: BorderStyle.SINGLE, size: 2, color: DOCUMENT_STYLES.colors.primary },
      bottom: { style: BorderStyle.SINGLE, size: 2, color: DOCUMENT_STYLES.colors.primary },
      left: { style: BorderStyle.SINGLE, size: 2, color: DOCUMENT_STYLES.colors.primary },
      right: { style: BorderStyle.SINGLE, size: 2, color: DOCUMENT_STYLES.colors.primary },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: 'E0E0E0' },
      insideVertical: { style: BorderStyle.SINGLE, size: 1, color: 'E0E0E0' }
    }
  }));

  elements.push(new Paragraph({ text: '', spacing: { after: 200 } }));
  if (genOverview) {
    // Study Plan Overview heading
    elements.push(new Paragraph({
      children: [new TextRun({
        text: 'STUDY PLAN OVERVIEW'
      })],
      style: 'CardTitle'
    }));

    // Study plan overview section
    const overviewCardRows: TableRow[] = [
      new TableRow({
        children: [
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: '📊 Total Cycles: 8'
                  })
                ],
                style: 'OverviewData'
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: '🗓️ Start Date: '
                  }),
                  new TextRun({
                    text: studentIntake.start_date ?
                      new Date(studentIntake.start_date).toLocaleDateString('en-IN', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      }) : 'Not specified'
                  })
                ],
                style: 'OverviewData'
              })
            ],
            width: { size: 50, type: WidthType.PERCENTAGE },
            margins: { top: 150, bottom: 150, left: 200, right: 100 }
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: '📈 Study Phases: Foundation → Mains'
                  })
                ],
                style: 'OverviewData'
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: '🎯 Target Exam: Aug '
                  }),
                  new TextRun({
                    text: year.toString()
                  })
                ],
                style: 'OverviewData'
              })
            ],
            width: { size: 50, type: WidthType.PERCENTAGE },
            margins: { top: 150, bottom: 150, left: 100, right: 200 }
          })
        ]
      }),
      new TableRow({
        children: [
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: `📚 Subjects Covered: ${calculateSubjectsCount(studyPlan)}`
                  })
                ],
                style: 'OverviewData'
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: `⏱️ Total Study Hours: ${calculateTotalStudyHours(studyPlan).toLocaleString()}`
                  })
                ],
                style: 'OverviewData'
              })
            ],
            width: { size: 50, type: WidthType.PERCENTAGE },
            margins: { top: 150, bottom: 150, left: 200, right: 100 }
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [new TextRun({
                  text: ''
                })]
              })
            ],
            width: { size: 50, type: WidthType.PERCENTAGE },
            margins: { top: 150, bottom: 150, left: 100, right: 200 }
          })
        ]
      })
    ];

    elements.push(new Table({
      rows: overviewCardRows,
      width: { size: 100, type: WidthType.PERCENTAGE },
      style: TABLE_STYLE_NAMES.studentInfo,
      borders: {
        top: { style: BorderStyle.SINGLE, size: 2, color: DOCUMENT_STYLES.colors.primary },
        bottom: { style: BorderStyle.SINGLE, size: 2, color: DOCUMENT_STYLES.colors.primary },
        left: { style: BorderStyle.SINGLE, size: 2, color: DOCUMENT_STYLES.colors.primary },
        right: { style: BorderStyle.SINGLE, size: 2, color: DOCUMENT_STYLES.colors.primary },
        insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: 'E0E0E0' },
        insideVertical: { style: BorderStyle.SINGLE, size: 1, color: 'E0E0E0' }
      }
    }));

    elements.push(new Paragraph({ text: '', spacing: { after: 400 } }));
  }
  if (genStrategyOverview) {
    // Study strategy highlights
    elements.push(new Paragraph({
      children: [new TextRun({
        text: 'Study Strategy Overview'
      })],
      style: 'StrategyOverviewTitle'
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
      style: TABLE_STYLE_NAMES.strategyCards,
      borders: {
        top: { style: BorderStyle.NONE, size: 0 },
        bottom: { style: BorderStyle.NONE, size: 0 },
        left: { style: BorderStyle.NONE, size: 0 },
        right: { style: BorderStyle.NONE, size: 0 },
        insideHorizontal: { style: BorderStyle.NONE, size: 0 },
        insideVertical: { style: BorderStyle.NONE, size: 0 }
      }
    }));

    elements.push(new Paragraph({ text: '', spacing: { after: 200 } }));
  }
  if (genInspirationQuote) {
    // Inspirational quote with better styling
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
                  style: 'QuoteText'
                }),
                new Paragraph({
                  children: [new TextRun({
                    text: '— Robert Collier'
                  })],
                  style: 'QuoteAuthor'
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
      style: TABLE_STYLE_NAMES.quote,
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
  }

  // Contact & Support heading
  elements.push(new Paragraph({ text: '', spacing: { after: 600 } }));
  elements.push(new Paragraph({
    children: [new TextRun({
      text: 'CONTACT & SUPPORT'
    })],
    style: 'CardTitle'
  }));

  const contactCardRows: TableRow[] = [
    new TableRow({
      children: [
        new TableCell({
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: '🌐 www.lamentora.com'
                })
              ],
              style: 'ContactData'
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: '📧 support@lamentora.com'
                })
              ],
              style: 'ContactData'
            })
          ],
          width: { size: 50, type: WidthType.PERCENTAGE },
          margins: { top: 150, bottom: 150, left: 200, right: 100 }
        }),
        new TableCell({
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: '📱 +91 98765 43210'
                })
              ],
              style: 'ContactData'
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: '💬 WhatsApp Support Available'
                })
              ],
              style: 'ContactData'
            })
          ],
          width: { size: 50, type: WidthType.PERCENTAGE },
          margins: { top: 150, bottom: 150, left: 100, right: 200 }
        })
      ]
    }),
  ];

  elements.push(new Table({
    rows: contactCardRows,
    width: { size: 100, type: WidthType.PERCENTAGE },
    style: TABLE_STYLE_NAMES.studentInfo,
    borders: {
      top: { style: BorderStyle.SINGLE, size: 2, color: DOCUMENT_STYLES.colors.primary },
      bottom: { style: BorderStyle.SINGLE, size: 2, color: DOCUMENT_STYLES.colors.primary },
      left: { style: BorderStyle.SINGLE, size: 2, color: DOCUMENT_STYLES.colors.primary },
      right: { style: BorderStyle.SINGLE, size: 2, color: DOCUMENT_STYLES.colors.primary },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: 'E0E0E0' },
      insideVertical: { style: BorderStyle.SINGLE, size: 1, color: 'E0E0E0' }
    }
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
      text: 'Birds Eye View - Yearly Calendar'
    })],
    style: 'SectionHeading1'
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

  monthRows.forEach(async (monthRow) => {
    // Header row with month names
    const headerCells: TableCell[] = monthRow.map(({ month, cycle }) => {
      const cycleColor = cycle ? CYCLE_TYPE_COLORS[cycle.cycleType as keyof typeof CYCLE_TYPE_COLORS]?.bg || 'FFFFFF' : 'FFFFFF';
      const cycleName = cycle ? cycle.cycleName.replace(/ Cycle$/, '') : '';

      return new TableCell({
        children: [
          new Paragraph({
            children: [new TextRun({
              text: cycleName
            })],
            style: 'TableCellMonthName'
          }),
          new Paragraph({
            children: [new TextRun({
              text: month.format('MMM YYYY').toUpperCase()
            })],
            style: 'TableCellMonthYear'
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
                text: day
              })],
              style: 'TableCellBirdsEyeDay'
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
                text: day.toString()
              })],
              style: 'TableCellBirdsEyeDayNumber'
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
        style: TABLE_STYLE_NAMES.miniCalendar,
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
    style: TABLE_STYLE_NAMES.birdsEyeView,
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
 * Generate birds eye view legend with cycle descriptions
 */
function generateBirdsEyeLegend(studyPlan: StudyPlan): (Paragraph | Table)[] {
  const elements: (Paragraph | Table)[] = [];
  
  // Get unique cycles from the study plan
  const cycles = studyPlan.cycles || [];
  const uniqueCycles = cycles.filter((cycle, index, self) => 
    index === self.findIndex(c => c.cycleType === cycle.cycleType)
  );

  if (uniqueCycles.length === 0) {
    return elements;
  }

  // Legend title
  elements.push(new Paragraph({
    children: [new TextRun({
      text: '📋 Study Cycle Legend'
    })],
    style: 'SectionHeading2'
  }));

  // Create legend table with cycle descriptions
  const legendRows: TableRow[] = [];

  // Group cycles into pairs for 2-column layout
  for (let i = 0; i < uniqueCycles.length; i += 2) {
    const firstCycle = uniqueCycles[i];
    const secondCycle = uniqueCycles[i + 1];

    const rowCells: TableCell[] = [];
    // First cycle cell
    const firstCycleColor = CYCLE_TYPE_COLORS[firstCycle.cycleType as keyof typeof CYCLE_TYPE_COLORS];
    rowCells.push(new TableCell({
      children: [
        new Paragraph({
          children: [
            new TextRun({
              text: firstCycle.cycleName.replace(/ Cycle$/, ''),
              bold: true,
              color: firstCycleColor?.fg || DOCUMENT_STYLES.colors.primary
            }),
            ],
          style: 'TableCellBold'
        }),
        new Paragraph({
          children: [
            new TextRun({
            text: getCycleDescription(firstCycle.cycleType)
          })
        ],
          style: 'BodyText'
        })
      ],
      width: { size: 50, type: WidthType.PERCENTAGE },
      margins: { top: 100, bottom: 100, left: 200, right: 100 },
      shading: { fill: firstCycleColor?.bg || 'FFFFFF' }
    }));

    // Second cycle cell (if exists)
    if (secondCycle) {
      const secondCycleColor = CYCLE_TYPE_COLORS[secondCycle.cycleType as keyof typeof CYCLE_TYPE_COLORS];
      rowCells.push(new TableCell({
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: secondCycle.cycleName.replace(/ Cycle$/, ''),
                bold: true,
                color: secondCycleColor?.fg || DOCUMENT_STYLES.colors.primary
              })
            ],
            style: 'TableCellBold'
          }),
          new Paragraph({
            children: [new TextRun({
              text: getCycleDescription(secondCycle.cycleType)
            })],
            style: 'BodyText'
          })
        ],
        width: { size: 50, type: WidthType.PERCENTAGE },
        margins: { top: 200, bottom: 200, left: 100, right: 200 },
        shading: { fill: secondCycleColor?.bg || 'FFFFFF' }
      }));
    } else {
      // Empty cell for odd number of cycles
      rowCells.push(new TableCell({
        children: [],
        width: { size: 50, type: WidthType.PERCENTAGE },
        margins: { top: 200, bottom: 200, left: 100, right: 200 }
      }));
    }

    legendRows.push(new TableRow({ children: rowCells }));
  }

  // Add the legend table
  elements.push(new Table({
    rows: legendRows,
    width: { size: 100, type: WidthType.PERCENTAGE },
    style: TABLE_STYLE_NAMES.legend,
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: 'E0E0E0' },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: 'E0E0E0' },
      left: { style: BorderStyle.SINGLE, size: 1, color: 'E0E0E0' },
      right: { style: BorderStyle.SINGLE, size: 1, color: 'E0E0E0' },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: 'E0E0E0' },
      insideVertical: { style: BorderStyle.SINGLE, size: 1, color: 'E0E0E0' }
    }
  }));

  // Add spacing after legend
  elements.push(new Paragraph({ text: '', spacing: { after: 400 } }));

  return elements;
}

/**
 * Get one-liner description for each cycle type
 */
function getCycleDescription(cycleType: string): string {
  const descriptions: { [key: string]: string } = {
    'C1': 'NCERT Foundation - Building core concepts from NCERT textbooks',
    'C2': 'Comprehensive Foundation - Deep dive into all subjects with standard books',
    'C3': 'Mains Revision Pre-Prelims - Focused preparation for Mains exam',
    'C4': 'Prelims Reading - Comprehensive reading for Prelims preparation',
    'C5': 'Prelims Revision - Intensive revision and practice for Prelims',
    'C5.b': 'Prelims Rapid Revision - Quick revision and mock tests',
    'C6': 'Mains Revision - Comprehensive revision for Mains exam',
    'C7': 'Mains Rapid Revision - Quick revision and answer writing practice',
    'C8': 'Mains Foundation - Building strong foundation for Mains preparation'
  };
  
  return descriptions[cycleType] || 'Study cycle for comprehensive preparation';
}

/**
 * Generate monthly views with daily/weekly pages
 */
async function generateMonthViewWithDailyPages(studyPlan: StudyPlan, studentIntake: StudentIntake): Promise<(Paragraph | Table)[]> {
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
    const cycleColor = cycle ? CYCLE_TYPE_COLORS[cycle.cycleType as keyof typeof CYCLE_TYPE_COLORS]?.fg || DOCUMENT_STYLES.colors.primary : DOCUMENT_STYLES.colors.primary;

    elements.push(new Table({
      rows: [
        new TableRow({
          children: [
            new TableCell({
              children: [
                new Paragraph({
                  children: [new TextRun({
                    text: `${monthName.toUpperCase()} ${monthYear}`,
                    color: cycleColor
                  })],
                  style: 'MonthTitle'
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
                    color: cycleColor
                  })],
                  style: 'CycleName'
                })
              ],
              width: { size: 50, type: WidthType.PERCENTAGE },
              margins: { top: 0, bottom: 0, left: 0, right: 0 }
            })
          ]
        })
      ],
      width: { size: 100, type: WidthType.PERCENTAGE },
      style: TABLE_STYLE_NAMES.monthTitle,
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
              text: day
            })],
            style: 'TableCellCalendarHeader'
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
            text: day.toString()
          })],
          style: 'TableCellCalendarDayNumberBold'
        })
      ];

      // Add subjects
      daySubjects.forEach(subject => {
        cellContent.push(new Paragraph({
          children: [new TextRun({
            text: subject
          })],
          style: 'TableCellCalendarSubject'
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
      style: TABLE_STYLE_NAMES.monthlyCalendar,
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

    // Add weekly views for this month
    elements.push(new Paragraph({ text: '', spacing: { after: 400 } }));
    elements.push(...await generateWeeklyViews(studyPlan, studentIntake, monthDate));

    monthCount++;
  }

  return elements;
}

/**
 * Generate weekly views for a specific month
 */
async function generateWeeklyViews(studyPlan: StudyPlan, studentIntake: StudentIntake, monthDate: dayjs.Dayjs): Promise<(Paragraph | Table)[]> {
  const elements: (Paragraph | Table)[] = [];

  const monthStart = monthDate.startOf('month');
  const monthEnd = monthDate.endOf('month');

  // Get all weeks in this month
  const weeksInMonth: dayjs.Dayjs[] = [];
  let currentWeek = monthStart.startOf('week');

  while (currentWeek.isBefore(monthEnd) || currentWeek.isSame(monthEnd, 'week')) {
    weeksInMonth.push(currentWeek);
    currentWeek = currentWeek.add(1, 'week');
  }

  // Generate weekly view for each week
  for (let i = 0; i < weeksInMonth.length; i++) {
    const weekStart = weeksInMonth[i];
    const weekEnd = weekStart.endOf('week');

    // Find which cycle this week belongs to
    let weekCycle = null;
    for (const cycle of studyPlan.cycles || []) {
      const cycleStart = dayjs(cycle.cycleStartDate);
      const cycleEnd = dayjs(cycle.cycleEndDate);
      if (weekStart.isBetween(cycleStart, cycleEnd, 'week', '[]') ||
        weekEnd.isBetween(cycleStart, cycleEnd, 'week', '[]')) {
        weekCycle = cycle;
        break;
      }
    }

    // Page break before each week
    elements.push(new Paragraph({
      children: [new PageBreak()]
    }));

    // Week title with cycle name - same layout as month view
    const cycleName = weekCycle ? weekCycle.cycleName.replace(/ Cycle$/, '') : '';
    const cycleColor = weekCycle ? CYCLE_TYPE_COLORS[weekCycle.cycleType as keyof typeof CYCLE_TYPE_COLORS]?.fg || DOCUMENT_STYLES.colors.primary : DOCUMENT_STYLES.colors.primary;

    // Week title with cycle name using table for proper alignment
    elements.push(new Table({
      rows: [
        new TableRow({
          children: [
            new TableCell({
              children: [
                new Paragraph({
                  children: [new TextRun({
                    text: `📅 ${weekStart.format('MMM DD')} - ${weekEnd.format('MMM DD, YYYY')}`,
                    color: cycleColor
                  })],
                  style: 'WeekTitle'
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
                    color: cycleColor
                  })],
                  style: 'WeekCycleName'
                })
              ],
              width: { size: 50, type: WidthType.PERCENTAGE },
              margins: { top: 0, bottom: 0, left: 0, right: 0 }
            })
          ]
        })
      ],
      width: { size: 100, type: WidthType.PERCENTAGE },
      style: TABLE_STYLE_NAMES.weekTitle,
      borders: {
        top: { style: BorderStyle.NONE, size: 0 },
        bottom: { style: BorderStyle.NONE, size: 0 },
        left: { style: BorderStyle.NONE, size: 0 },
        right: { style: BorderStyle.NONE, size: 0 },
        insideHorizontal: { style: BorderStyle.NONE, size: 0 },
        insideVertical: { style: BorderStyle.NONE, size: 0 }
      }
    }));

    // Add spacing between title and calendar
    elements.push(new Paragraph({ text: '', spacing: { after: 200 } }));

    // Generate weekly content
    elements.push(...await generateWeekContent(studyPlan, studentIntake, weekStart, weekEnd, weekCycle));

    // Add weekly resources
    elements.push(new Paragraph({ text: '', spacing: { after: 400 } }));
    elements.push(...await generateWeeklyResources(studyPlan, weekStart, weekEnd));
  }

  return elements;
}

/**
 * Generate content for a specific week in calendar layout
 */
async function generateWeekContent(studyPlan: StudyPlan, studentIntake: StudentIntake, weekStart: dayjs.Dayjs, weekEnd: dayjs.Dayjs, weekCycle?: any): Promise<(Paragraph | Table)[]> {
  const cycles = studyPlan.cycles || [];
  const elements: (Paragraph | Table)[] = [];

  // Find blocks that overlap with this week
  const weekBlocks: Array<{ block: any; cycle: any }> = [];

  for (const cycle of cycles) {
    for (const block of cycle.cycleBlocks) {
      const blockStart = dayjs(block.block_start_date);
      const blockEnd = dayjs(block.block_end_date);

      // Check if block overlaps with this week (inclusive boundaries)
      if (blockStart.isBefore(weekEnd) && (blockEnd.isAfter(weekStart) || blockEnd.isSame(weekStart, 'day'))) {
        weekBlocks.push({ block, cycle });
      }
    }
  }

  if (weekBlocks.length === 0) {
    elements.push(new Paragraph({
      children: [new TextRun({
        text: 'No study activities scheduled for this week.'
      })],
      style: 'NoActivitiesText'
    }));
    return elements;
  }

  // Create weekly calendar table with 7 day columns
  const calendarRows: TableRow[] = [];

  // Header row with day names and dates
  const headerCells: TableCell[] = [];
  const cycleBgColor = weekCycle ? CYCLE_TYPE_COLORS[weekCycle.cycleType as keyof typeof CYCLE_TYPE_COLORS]?.bg || 'F8F9FA' : 'F8F9FA';
  const cycleFgColor = weekCycle ? CYCLE_TYPE_COLORS[weekCycle.cycleType as keyof typeof CYCLE_TYPE_COLORS]?.fg || DOCUMENT_STYLES.colors.primary : DOCUMENT_STYLES.colors.primary;

  for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
    const currentDay = weekStart.add(dayOffset, 'day');
    const dayName = currentDay.format('dddd');
    const dayDate = currentDay.format('MMM DD');
    const isCatchupDay = isCatchupDayCheck(currentDay, studentIntake.study_strategy?.catch_up_day_preference);

    // Use cycle color for header, but keep catchup day highlighting
    const headerBgColor = isCatchupDay ? 'FFF3E0' : cycleBgColor;
    const headerFgColor = isCatchupDay ? 'F57C00' : cycleFgColor;

    headerCells.push(new TableCell({
      children: [
        new Paragraph({
          children: [new TextRun({
            text: dayName,
            color: headerFgColor
          })],
          style: 'TableCellCalendarDayHeader'
        }),
        new Paragraph({
          children: [new TextRun({
            text: dayDate,
            color: headerFgColor
          })],
          style: 'TableCellCalendarDateHeader'
        }),
        new Paragraph({
          children: [new TextRun({
            text: isCatchupDay ? 'Catchup Day' : '',
            color: headerFgColor
          })],
          style: 'TableCellCatchupLabel'
        })
      ],
      width: { size: 14.28, type: WidthType.PERCENTAGE },
      shading: { fill: headerBgColor },
      margins: { top: 200, bottom: 200, left: 100, right: 100 }
    }));
  }

  calendarRows.push(new TableRow({ children: headerCells }));

  // Get all tasks for the week organized by actual date
  const weekTasks: Array<{ day: number; date: dayjs.Dayjs; tasks: Array<{ task: any; subject: string; block: any; cycle: any }> }> = [];

  for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
    const currentDay = weekStart.add(dayOffset, 'day');
    const dayTasks: Array<{ task: any; subject: string; block: any; cycle: any }> = [];

    for (const { block, cycle } of weekBlocks) {
      const blockStart = dayjs(block.block_start_date);
      const blockEnd = dayjs(block.block_end_date);

      if (currentDay.isBetween(blockStart, blockEnd, 'day', '[]')) {
        // Find weekly plan for this week
        // Calculate which week of the block this day falls into
        const daysFromStart = currentDay.diff(blockStart, 'day');
        const weekNumber = Math.floor(daysFromStart / 7) + 1;
        const weeklyPlan = block.weekly_plan?.find((wp: any) => wp.week === weekNumber);

        if (weeklyPlan && weeklyPlan.daily_plans) {
          // Find the daily plan that matches the current day's actual date
          const dayPlan = weeklyPlan.daily_plans.find((dp: any) => {
            const planDate = dayjs(dp.date);
            return planDate.isSame(currentDay, 'day');
          });

          if (dayPlan && dayPlan.tasks) {
            for (const task of dayPlan.tasks) {
              // Only add the task once, not for each subject
              // The task should be associated with the primary subject or the first subject
              const primarySubject = block.subjects[0] || 'Unknown';
              dayTasks.push({ task, subject: primarySubject, block, cycle });
            }
          }
        } else {
          // case where weekly_plan is empty
          console.warn(`Weekly plan is empty for block ${block.block_id} on day ${currentDay.format('YYYY-MM-DD')}`);
        }
      }
    }

    weekTasks.push({ day: dayOffset, date: currentDay, tasks: dayTasks });
  }

  // Group tasks by subject for each day
  const groupedByDay: Array<{ day: number; date: dayjs.Dayjs; groups: Array<{ subject: string; tasks: Array<{ task: any; subject: string; block: any; cycle: any }> }> }> = weekTasks.map(({ day, date, tasks }) => {
    const groupsMap = new Map<string, Array<{ task: any; subject: string; block: any; cycle: any }>>();
    for (const t of tasks) {
      const key = t.subject;
      if (!groupsMap.has(key)) groupsMap.set(key, []);
      groupsMap.get(key)!.push(t);
    }
    const groups = Array.from(groupsMap.entries()).map(([subject, groupedTasks]) => ({ subject, tasks: groupedTasks }));
    return { day, date, groups };
  });

  const maxGroups = Math.max(...groupedByDay.map(d => d.groups.length), 1);

  // Create rows for each subject group index
  for (let groupIndex = 0; groupIndex < maxGroups; groupIndex++) {
    const rowCells: TableCell[] = [];

    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const { date: currentDay, groups } = groupedByDay[dayOffset];
      const isCatchupDay = isCatchupDayCheck(currentDay, studentIntake.study_strategy?.catch_up_day_preference);
      const cellBg = isCatchupDay ? 'FFF3E0' : cycleBgColor;

      if (groupIndex < groups.length) {
        const group = groups[groupIndex];
        const subjectName = getSubjectName(group.subject);

        const children: Paragraph[] = [];
        children.push(new Paragraph({
          children: [new TextRun({ text: subjectName })],
          style: 'TableCellTaskSubject'
        }));

        for (const { task } of group.tasks) {
          const duration = formatDuration(task.duration_minutes);
          const taskType = task.taskType || 'study';
          children.push(new Paragraph({
            children: [new TextRun({ text: `• ${task.title} — ${duration}` })],
            style: 'TableCellTaskDetails'
          }));
          children.push(createTaskTypeBadge(taskType));
        }

        rowCells.push(new TableCell({
          children,
          width: { size: 14.28, type: WidthType.PERCENTAGE },
          shading: { fill: cellBg },
          margins: { top: 150, bottom: 150, left: 100, right: 100 }
        }));
      } else {
        rowCells.push(new TableCell({
          children: [new Paragraph({ text: '' })],
          width: { size: 14.28, type: WidthType.PERCENTAGE },
          shading: { fill: cellBg },
          margins: { top: 150, bottom: 150, left: 100, right: 100 }
        }));
      }
    }

    calendarRows.push(new TableRow({ children: rowCells }));
  }

  // Add the weekly calendar table
  elements.push(new Table({
    rows: calendarRows,
    width: { size: 100, type: WidthType.PERCENTAGE },
    style: TABLE_STYLE_NAMES.weeklySchedule,
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
 * Format duration in hours:mins format if > 60 minutes
 */
function formatDuration(minutes: number): string {
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (remainingMinutes === 0) {
      return `${hours}h`;
    } else {
      return `${hours}h ${remainingMinutes}m`;
    }
  } else {
    return `${minutes}m`;
  }
}

/**
 * Create a task type badge
 */
function createTaskTypeBadge(taskType: string): Paragraph {
  const badgeConfig = getTaskTypeBadgeConfig(taskType);

  return new Paragraph({
    children: [
      new TextRun({
        text: badgeConfig.text,
        color: badgeConfig.textColor,
        bold: true,
        size: 8
      })
    ],
    style: 'TableCellTaskBadge',
    shading: { fill: badgeConfig.backgroundColor }
  });
}

/**
 * Get badge configuration for task type
 */
function getTaskTypeBadgeConfig(taskType: string): { text: string; backgroundColor: string; textColor: string } {
  const configs = {
    study: { text: 'STUDY', backgroundColor: 'E3F2FD', textColor: '1976D2' },
    practice: { text: 'PRACTICE', backgroundColor: 'E8F5E8', textColor: '388E3C' },
    revision: { text: 'REVISION', backgroundColor: 'FCE4EC', textColor: 'C2185B' },
    test: { text: 'TEST', backgroundColor: 'FFF3E0', textColor: 'F57C00' },
    current_affairs: { text: 'CA', backgroundColor: 'F3E5F5', textColor: '7B1FA2' },
    optional: { text: 'OPTIONAL', backgroundColor: 'E1F5FE', textColor: '0288D1' }
  };

  return configs[taskType as keyof typeof configs] || { text: taskType.toUpperCase(), backgroundColor: 'F5F5F5', textColor: '757575' };
}

/**
 * Get the optional subject name from the subject code
 */
function getOptionalSubjectName(subjectCode: string): string {
  const optionalSubject = optionalSubjectsData.subjects.find(
    subject => subject.code === subjectCode
  );
  return optionalSubject?.name || subjectCode;
}

/**
 * Get task types for a given cycle type
 */
function getTaskTypesForCycle(cycleType: string): string[] {
  const taskTypeMap: { [key: string]: string[] } = {
    'C1': ['study'],
    'C2': ['study', 'practice', 'revision'],
    'C3': ['study', 'revision'],
    'C4': ['practice', 'revision'],
    'C5': ['practice', 'revision'],
    'C5.b': ['practice', 'revision'],
    'C6': ['practice', 'revision'],
    'C7': ['practice', 'revision'],
    'C8': ['study', 'practice', 'revision']
  };
  
  return taskTypeMap[cycleType] || ['study'];
}

/**
 * Calculate the total duration of the study plan in months
 */
function calculatePlanDuration(studyPlan: StudyPlan): number {
  if (!studyPlan.cycles) return 0;

  const totalWeeks = studyPlan.cycles.reduce((total: number, cycle: any) => {
    if (cycle.cycleBlocks) {
      return total + cycle.cycleBlocks.reduce((cycleTotal: number, block: any) => {
        return cycleTotal + (block.duration_weeks || 0);
      }, 0);
    }
    return total;
  }, 0);

  // Convert weeks to months (approximate: 4.33 weeks per month)
  return Math.round(totalWeeks / 4.33);
}

/**
 * Calculate the total study hours across all blocks in the study plan
 */
function calculateTotalStudyHours(studyPlan: StudyPlan): number {
  if (!studyPlan.cycles) return 0;

  return studyPlan.cycles.reduce((total: number, cycle: any) => {
    if (cycle.cycleBlocks) {
      return total + cycle.cycleBlocks.reduce((cycleTotal: number, block: any) => {
        return cycleTotal + (block.estimated_hours || 0);
      }, 0);
    }
    return total;
  }, 0);
}

/**
 * Calculate the number of unique subjects covered in the study plan
 */
function calculateSubjectsCount(studyPlan: StudyPlan): number {
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

/**
 * Check if a day is a catchup day based on the actual study plan configuration
 */
function isCatchupDayCheck(day: dayjs.Dayjs, catchUpPreference?: string): boolean {
  const dayOfWeek = day.day();

  // Map day names to dayjs day numbers (0=Sunday, 1=Monday, ..., 6=Saturday)
  const dayMap: { [key in DayOfWeek]: number } = {
    [DayOfWeek.SUNDAY]: 0,
    [DayOfWeek.MONDAY]: 1,
    [DayOfWeek.TUESDAY]: 2,
    [DayOfWeek.WEDNESDAY]: 3,
    [DayOfWeek.THURSDAY]: 4,
    [DayOfWeek.FRIDAY]: 5,
    [DayOfWeek.SATURDAY]: 6
  };

  // Use provided preference
  if (catchUpPreference && Object.values(DayOfWeek).includes(catchUpPreference as DayOfWeek)) {
    return dayOfWeek === dayMap[catchUpPreference as DayOfWeek];
  }

  // Default to no catchup days if not specified or invalid
  return false;
}

/**
 * Generate weekly resources section
 */
async function generateWeeklyResources(studyPlan: StudyPlan, weekStart: dayjs.Dayjs, weekEnd: dayjs.Dayjs): Promise<(Paragraph | Table)[]> {
  const cycles = studyPlan.cycles || [];
  const elements: (Paragraph | Table)[] = [];

  // Get all subjects that are active in this week
  const weeklySubjects = new Set<string>();

  for (const cycle of cycles) {
    for (const block of cycle.cycleBlocks) {
      const blockStart = dayjs(block.block_start_date);
      const blockEnd = dayjs(block.block_end_date);

      // Check if block overlaps with this week
      if (blockStart.isBefore(weekEnd) && blockEnd.isAfter(weekStart)) {
        for (const subject of block.subjects) {
          weeklySubjects.add(subject);
        }
      }
    }
  }

  if (weeklySubjects.size === 0) {
    elements.push(new Paragraph({
      children: [new TextRun({
        text: 'No resources for this week.'
      })],
      style: 'NoResourcesText'
    }));
    return elements;
  }

  // Resources title
  elements.push(new Paragraph({
    children: [new TextRun({
      text: `📚 Resources for ${weekStart.format('MMM DD')} - ${weekEnd.format('MMM DD')}`
    })],
    style: 'ResourceTitle'
  }));

  // Create single table with 3-column card layout for all subjects
  const subjectsArray = Array.from(weeklySubjects);
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
    style: TABLE_STYLE_NAMES.subjectCards,
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
        text: 'No resources for this month.'
      })],
      style: 'NoResourcesText'
    }));
    return elements;
  }

  // Resources title
  elements.push(new Paragraph({
    children: [new TextRun({
      text: `📚 Resources for ${monthDate.format('MMMM YYYY')}`
    })],
    style: 'ResourceTitle'
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
    style: TABLE_STYLE_NAMES.subjectCards,
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
      text: '📊 Comprehensive Resources by Subject'
    })],
    style: 'SectionHeading1'
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
    style: TABLE_STYLE_NAMES.resources,
    shading: { fill: 'FFFFFF' },
    borders: {
      top: { style: BorderStyle.NONE, size: 0 },
      left: { style: BorderStyle.NONE, size: 0 },
      bottom: { style: BorderStyle.SINGLE, size: 2, color: 'D1D5DB' }, // bottom border for raised look
      right: { style: BorderStyle.SINGLE, size: 2, color: 'D1D5DB' }, // right border for raised look
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: 'E5E7EB' },
      insideVertical: { style: BorderStyle.SINGLE, size: 1, color: 'E5E7EB' }
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
      text: 'ℹ️ Legend & Study Phases'
    })],
    style: 'SectionHeading1'
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
    style: TABLE_STYLE_NAMES.legend,
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
      text: subjectName
    })],
    style: 'TableCellSubjectName'
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
          text: category.name
        })],
        style: 'TableCellCategoryTitle'
      }));

      // Resource items as bullet points
      category.resources.forEach((resource: any) => {
        cardContent.push(new Paragraph({
          children: [new TextRun({
            text: `• ${resource.resource_title}`
          })],
          style: 'TableCellResourceItem'
        }));
      });
    }
  }

  return new TableCell({
    children: cardContent,
    width: { size: 33.33, type: WidthType.PERCENTAGE },
    margins: { top: 200, bottom: 200, left: 150, right: 150 },
    shading: { fill: 'FFFFFF' },
    borders: {
      top: { style: BorderStyle.NONE, size: 0 },
      left: { style: BorderStyle.NONE, size: 0 },
      bottom: { style: BorderStyle.SINGLE, size: 2, color: 'D1D5DB' },
      right: { style: BorderStyle.SINGLE, size: 2, color: 'D1D5DB' }
    }
  });
}

/**
 * Create a table cell with text content
 */
function createTableCell(text: string, _color: string, bold = false): TableCell {
  return new TableCell({
    children: [
      new Paragraph({
        children: [new TextRun({
          text
        })],
        style: bold ? 'TableCellHeader' : 'TableCellData'
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
          text: icon
        })],
        style: 'TableCellIconLarge'
      }),
      new Paragraph({
        children: [new TextRun({
          text: title
        })],
        style: 'TableCellTitle'
      }),
      new Paragraph({
        children: [new TextRun({
          text: value
        })],
        style: 'TableCellValue'
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
 * Get comprehensive document styles for all elements
 */
function getDocumentStyles() {
  return {
    paragraphStyles: [
      // Cover Page Styles
      {
        id: 'CompanyBrand',
        name: 'Company Brand',
        basedOn: 'Normal',
        run: {
          size: 32,
          bold: true,
          color: DOCUMENT_STYLES.colors.primary,
          font: DOCUMENT_STYLES.font
        },
        paragraph: { alignment: AlignmentType.CENTER, spacing: { after: 200 } }
      },
      {
        id: 'VersionInfo',
        name: 'Version Info',
        basedOn: 'Normal',
        run: {
          size: 18,
          color: DOCUMENT_STYLES.colors.secondary,
          font: DOCUMENT_STYLES.font
        },
        paragraph: { alignment: AlignmentType.CENTER, spacing: { after: 200 } }
      },
      {
        id: 'CompanyTagline',
        name: 'Company Tagline',
        basedOn: 'Normal',
        run: {
          size: 16,
          italics: true,
          color: DOCUMENT_STYLES.colors.secondary,
          font: DOCUMENT_STYLES.font
        },
        paragraph: { alignment: AlignmentType.CENTER, spacing: { after: 400 } }
      },
      {
        id: 'CoverPageTitle',
        name: 'Cover Page Title',
        basedOn: 'Normal',
        run: {
          size: 36,
          bold: true,
          color: DOCUMENT_STYLES.colors.primary,
          font: DOCUMENT_STYLES.font
        },
        paragraph: { alignment: AlignmentType.CENTER, spacing: { after: 100 } }
      },
      {
        id: 'CoverPageYear',
        name: 'Cover Page Year',
        basedOn: 'Normal',
        run: {
          size: 28,
          bold: true,
          color: DOCUMENT_STYLES.colors.primary,
          font: DOCUMENT_STYLES.font
        },
        paragraph: { alignment: AlignmentType.CENTER, spacing: { after: 0 } }
      },
      {
        id: 'CardTitle',
        name: 'Card Title',
        basedOn: 'Heading1',
        run: {
          size: 20,
          bold: true,
          color: DOCUMENT_STYLES.colors.primary,
          font: DOCUMENT_STYLES.font
        },
        paragraph: {
          alignment: AlignmentType.CENTER,
          spacing: { before: 400, after: 200 },
          outlineLevel: 1
        }
      },
      {
        id: 'ProfileData',
        name: 'Profile Data',
        basedOn: 'Normal',
        run: {
          size: 14,
          color: DOCUMENT_STYLES.colors.text,
          font: DOCUMENT_STYLES.font
        },
        paragraph: { spacing: { after: 100 } }
      },
      {
        id: 'OverviewData',
        name: 'Overview Data',
        basedOn: 'Normal',
        run: {
          size: 14,
          color: DOCUMENT_STYLES.colors.text,
          font: DOCUMENT_STYLES.font
        },
        paragraph: { spacing: { after: 100 } }
      },
      {
        id: 'ContactData',
        name: 'Contact Data',
        basedOn: 'Normal',
        run: {
          size: 14,
          color: DOCUMENT_STYLES.colors.text,
          font: DOCUMENT_STYLES.font
        },
        paragraph: { spacing: { after: 100 } }
      },
      {
        id: 'StudentName',
        name: 'Student Name',
        basedOn: 'Normal',
        run: {
          size: 36,
          bold: true,
          color: DOCUMENT_STYLES.colors.text,
          font: DOCUMENT_STYLES.font
        },
        paragraph: { alignment: AlignmentType.CENTER, spacing: { after: 100 } }
      },
      {
        id: 'CoverPageSubtitle',
        name: 'Cover Page Subtitle',
        basedOn: 'Normal',
        run: {
          size: 18,
          color: DOCUMENT_STYLES.colors.secondary,
          font: DOCUMENT_STYLES.font
        },
        paragraph: { alignment: AlignmentType.CENTER, spacing: { after: 200 } }
      },
      {
        id: 'StrategyOverviewTitle',
        name: 'Strategy Overview Title',
        basedOn: 'Normal',
        run: {
          size: 24,
          bold: true,
          color: DOCUMENT_STYLES.colors.primary,
          font: DOCUMENT_STYLES.font
        },
        paragraph: { alignment: AlignmentType.CENTER, spacing: { after: 400 } }
      },
      {
        id: 'QuoteText',
        name: 'Quote Text',
        basedOn: 'Normal',
        run: {
          size: 18,
          italics: true,
          color: DOCUMENT_STYLES.colors.primary,
          font: DOCUMENT_STYLES.font
        },
        paragraph: { alignment: AlignmentType.CENTER }
      },
      {
        id: 'QuoteAuthor',
        name: 'Quote Author',
        basedOn: 'Normal',
        run: {
          size: 14,
          color: DOCUMENT_STYLES.colors.secondary,
          font: DOCUMENT_STYLES.font
        },
        paragraph: { alignment: AlignmentType.CENTER, spacing: { before: 200 } }
      },
      {
        id: 'FooterBranding',
        name: 'Footer Branding',
        basedOn: 'Normal',
        run: {
          size: 14,
          color: DOCUMENT_STYLES.colors.secondary,
          font: DOCUMENT_STYLES.font
        },
        paragraph: { alignment: AlignmentType.CENTER, spacing: { after: 200 } }
      },
      {
        id: 'FooterDate',
        name: 'Footer Date',
        basedOn: 'Normal',
        run: {
          size: 12,
          color: DOCUMENT_STYLES.colors.secondary,
          font: DOCUMENT_STYLES.font
        },
        paragraph: { alignment: AlignmentType.CENTER }
      },

      // Main Content Styles
      {
        id: 'SectionHeading1',
        name: 'Section Heading 1',
        basedOn: 'Normal',
        run: {
          size: DOCUMENT_STYLES.sizes.heading1,
          bold: true,
          color: DOCUMENT_STYLES.colors.primary,
          font: DOCUMENT_STYLES.font
        },
        paragraph: { spacing: { after: 400 } }
      },
      {
        id: 'SectionHeading2',
        name: 'Section Heading 2',
        basedOn: 'Normal',
        run: {
          size: DOCUMENT_STYLES.sizes.heading2,
          bold: true,
          color: DOCUMENT_STYLES.colors.primary,
          font: DOCUMENT_STYLES.font
        },
        paragraph: { spacing: { after: 400 } }
      },
      {
        id: 'MonthTitle',
        name: 'Month Title',
        basedOn: 'Normal',
        run: {
          size: DOCUMENT_STYLES.sizes.heading1,
          bold: true,
          color: DOCUMENT_STYLES.colors.primary,
          font: DOCUMENT_STYLES.font
        },
        paragraph: { alignment: AlignmentType.LEFT }
      },
      {
        id: 'CycleName',
        name: 'Cycle Name',
        basedOn: 'Normal',
        run: {
          size: 25,
          bold: true,
          color: DOCUMENT_STYLES.colors.primary,
          font: DOCUMENT_STYLES.font
        },
        paragraph: { alignment: AlignmentType.RIGHT }
      },
      {
        id: 'ResourceTitle',
        name: 'Resource Title',
        basedOn: 'Normal',
        run: {
          size: DOCUMENT_STYLES.sizes.heading2,
          bold: true,
          color: DOCUMENT_STYLES.colors.primary,
          font: DOCUMENT_STYLES.font
        },
        paragraph: { spacing: { after: 400 } }
      },
      {
        id: 'NoResourcesText',
        name: 'No Resources Text',
        basedOn: 'Normal',
        run: {
          italics: true,
          color: DOCUMENT_STYLES.colors.secondary,
          font: DOCUMENT_STYLES.font
        },
        paragraph: { spacing: { after: 400 } }
      },
      {
        id: 'WeekTitle',
        name: 'Week Title',
        basedOn: 'Normal',
        run: {
          size: DOCUMENT_STYLES.sizes.heading2,
          bold: true,
          color: DOCUMENT_STYLES.colors.primary,
          font: DOCUMENT_STYLES.font
        },
        paragraph: { spacing: { after: 200 } }
      },
      {
        id: 'WeekCycleName',
        name: 'Week Cycle Name',
        basedOn: 'Normal',
        run: {
          size: 25,
          bold: true,
          color: DOCUMENT_STYLES.colors.primary,
          font: DOCUMENT_STYLES.font
        },
        paragraph: { alignment: AlignmentType.RIGHT }
      },
      {
        id: 'NoActivitiesText',
        name: 'No Activities Text',
        basedOn: 'Normal',
        run: {
          italics: true,
          color: DOCUMENT_STYLES.colors.secondary,
          font: DOCUMENT_STYLES.font
        },
        paragraph: { spacing: { after: 400 } }
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
        id: 'SmallText',
        name: 'Small Text',
        basedOn: 'Normal',
        run: {
          size: DOCUMENT_STYLES.sizes.small,
          color: DOCUMENT_STYLES.colors.text,
          font: DOCUMENT_STYLES.font
        },
        paragraph: { alignment: AlignmentType.CENTER }
      },

      // Table Cell Text Styles
      {
        id: 'TableCellHeader',
        name: 'Table Cell Header',
        basedOn: 'Normal',
        run: {
          size: DOCUMENT_STYLES.sizes.body,
          bold: true,
          color: DOCUMENT_STYLES.colors.primary,
          font: DOCUMENT_STYLES.font
        },
        paragraph: { alignment: AlignmentType.LEFT }
      },
      {
        id: 'TableCellData',
        name: 'Table Cell Data',
        basedOn: 'Normal',
        run: {
          size: DOCUMENT_STYLES.sizes.body,
          color: DOCUMENT_STYLES.colors.text,
          font: DOCUMENT_STYLES.font
        },
        paragraph: { alignment: AlignmentType.LEFT }
      },
      {
        id: 'TableCellCenter',
        name: 'Table Cell Center',
        basedOn: 'Normal',
        run: {
          size: DOCUMENT_STYLES.sizes.body,
          color: DOCUMENT_STYLES.colors.text,
          font: DOCUMENT_STYLES.font
        },
        paragraph: { alignment: AlignmentType.CENTER }
      },
      {
        id: 'TableCellBold',
        name: 'Table Cell Bold',
        basedOn: 'Normal',
        run: {
          size: DOCUMENT_STYLES.sizes.body,
          bold: true,
          color: DOCUMENT_STYLES.colors.text,
          font: DOCUMENT_STYLES.font
        },
        paragraph: { alignment: AlignmentType.LEFT }
      },
      {
        id: 'TableCellSecondary',
        name: 'Table Cell Secondary',
        basedOn: 'Normal',
        run: {
          size: 14,
          bold: true,
          color: DOCUMENT_STYLES.colors.secondary,
          font: DOCUMENT_STYLES.font
        },
        paragraph: { alignment: AlignmentType.LEFT }
      },
      {
        id: 'TableCellSecondaryData',
        name: 'Table Cell Secondary Data',
        basedOn: 'Normal',
        run: {
          size: 14,
          color: DOCUMENT_STYLES.colors.text,
          font: DOCUMENT_STYLES.font
        },
        paragraph: { alignment: AlignmentType.LEFT }
      },
      {
        id: 'TableCellIcon',
        name: 'Table Cell Icon',
        basedOn: 'Normal',
        run: {
          size: 16,
          color: DOCUMENT_STYLES.colors.primary,
          font: DOCUMENT_STYLES.font
        },
        paragraph: { alignment: AlignmentType.CENTER }
      },
      {
        id: 'TableCellIconLarge',
        name: 'Table Cell Icon Large',
        basedOn: 'Normal',
        run: {
          size: 20,
          color: DOCUMENT_STYLES.colors.primary,
          font: DOCUMENT_STYLES.font
        },
        paragraph: { alignment: AlignmentType.CENTER, spacing: { after: 200 } }
      },
      {
        id: 'TableCellIconSmall',
        name: 'Table Cell Icon Small',
        basedOn: 'Normal',
        run: {
          size: 16,
          color: DOCUMENT_STYLES.colors.primary,
          font: DOCUMENT_STYLES.font
        },
        paragraph: { alignment: AlignmentType.CENTER }
      },
      {
        id: 'TableCellTitle',
        name: 'Table Cell Title',
        basedOn: 'Normal',
        run: {
          size: 12,
          bold: true,
          color: DOCUMENT_STYLES.colors.secondary,
          font: DOCUMENT_STYLES.font
        },
        paragraph: { alignment: AlignmentType.CENTER, spacing: { after: 100 } }
      },
      {
        id: 'TableCellValue',
        name: 'Table Cell Value',
        basedOn: 'Normal',
        run: {
          size: 14,
          color: DOCUMENT_STYLES.colors.text,
          font: DOCUMENT_STYLES.font
        },
        paragraph: { alignment: AlignmentType.CENTER }
      },
      {
        id: 'TableCellSubjectName',
        name: 'Table Cell Subject Name',
        basedOn: 'Normal',
        run: {
          size: 14,
          bold: true,
          color: DOCUMENT_STYLES.colors.primary,
          font: DOCUMENT_STYLES.font
        },
        paragraph: { alignment: AlignmentType.CENTER, spacing: { after: 200 } }
      },
      {
        id: 'TableCellCategoryTitle',
        name: 'Table Cell Category Title',
        basedOn: 'Normal',
        run: {
          size: 10,
          bold: true,
          color: DOCUMENT_STYLES.colors.secondary,
          font: DOCUMENT_STYLES.font
        },
        paragraph: { spacing: { before: 100, after: 50 } }
      },
      {
        id: 'TableCellResourceItem',
        name: 'Table Cell Resource Item',
        basedOn: 'Normal',
        run: {
          size: 9,
          color: DOCUMENT_STYLES.colors.text,
          font: DOCUMENT_STYLES.font
        },
        paragraph: { spacing: { after: 50 } }
      },
      {
        id: 'TableCellCalendarDay',
        name: 'Table Cell Calendar Day',
        basedOn: 'Normal',
        run: {
          size: 8,
          bold: true,
          color: DOCUMENT_STYLES.colors.secondary,
          font: DOCUMENT_STYLES.font
        },
        paragraph: { alignment: AlignmentType.CENTER }
      },
      {
        id: 'TableCellCalendarDayNumber',
        name: 'Table Cell Calendar Day Number',
        basedOn: 'Normal',
        run: {
          size: 8,
          color: DOCUMENT_STYLES.colors.text,
          font: DOCUMENT_STYLES.font
        },
        paragraph: { alignment: AlignmentType.CENTER }
      },
      {
        id: 'TableCellCalendarDayBold',
        name: 'Table Cell Calendar Day Bold',
        basedOn: 'Normal',
        run: {
          size: 8,
          bold: true,
          color: DOCUMENT_STYLES.colors.text,
          font: DOCUMENT_STYLES.font
        },
        paragraph: { alignment: AlignmentType.CENTER }
      },
      {
        id: 'TableCellCalendarDayNumberBold',
        name: 'Table Cell Calendar Day Number Bold',
        basedOn: 'Normal',
        run: {
          size: 14,
          bold: true,
          color: DOCUMENT_STYLES.colors.text,
          font: DOCUMENT_STYLES.font
        },
        paragraph: { alignment: AlignmentType.CENTER }
      },
      {
        id: 'TableCellCalendarSubject',
        name: 'Table Cell Calendar Subject',
        basedOn: 'Normal',
        run: {
          size: 8,
          color: DOCUMENT_STYLES.colors.text,
          font: DOCUMENT_STYLES.font
        },
        paragraph: { alignment: AlignmentType.CENTER }
      },
      {
        id: 'TableCellMonthName',
        name: 'Table Cell Month Name',
        basedOn: 'Normal',
        run: {
          size: 10,
          bold: true,
          color: DOCUMENT_STYLES.colors.primary,
          font: DOCUMENT_STYLES.font
        },
        paragraph: { alignment: AlignmentType.CENTER }
      },
      {
        id: 'TableCellMonthYear',
        name: 'Table Cell Month Year',
        basedOn: 'Normal',
        run: {
          size: 12,
          bold: true,
          color: DOCUMENT_STYLES.colors.text,
          font: DOCUMENT_STYLES.font
        },
        paragraph: { alignment: AlignmentType.CENTER }
      },
      {
        id: 'TableCellCalendarHeader',
        name: 'Table Cell Calendar Header',
        basedOn: 'Normal',
        run: {
          size: 12,
          bold: true,
          color: DOCUMENT_STYLES.colors.primary,
          font: DOCUMENT_STYLES.font
        },
        paragraph: { alignment: AlignmentType.CENTER }
      },
      {
        id: 'TableCellCalendarDayHeader',
        name: 'Table Cell Calendar Day Header',
        basedOn: 'Normal',
        run: {
          size: 14,
          bold: true,
          color: DOCUMENT_STYLES.colors.primary,
          font: DOCUMENT_STYLES.font
        },
        paragraph: { alignment: AlignmentType.CENTER, spacing: { after: 100 } }
      },
      {
        id: 'TableCellCalendarDateHeader',
        name: 'Table Cell Calendar Date Header',
        basedOn: 'Normal',
        run: {
          size: 12,
          color: DOCUMENT_STYLES.colors.text,
          font: DOCUMENT_STYLES.font
        },
        paragraph: { alignment: AlignmentType.CENTER, spacing: { after: 100 } }
      },
      {
        id: 'TableCellCatchupLabel',
        name: 'Table Cell Catchup Label',
        basedOn: 'Normal',
        run: {
          size: 10,
          bold: true,
          color: DOCUMENT_STYLES.colors.warning,
          font: DOCUMENT_STYLES.font
        },
        paragraph: { alignment: AlignmentType.CENTER }
      },
      {
        id: 'TableCellTaskSubject',
        name: 'Table Cell Task Subject',
        basedOn: 'Normal',
        run: {
          size: 10,
          bold: true,
          color: DOCUMENT_STYLES.colors.primary,
          font: DOCUMENT_STYLES.font
        },
        paragraph: { spacing: { after: 50 } }
      },
      {
        id: 'TableCellTaskTitle',
        name: 'Table Cell Task Title',
        basedOn: 'Normal',
        run: {
          size: 9,
          color: DOCUMENT_STYLES.colors.text,
          font: DOCUMENT_STYLES.font
        },
        paragraph: { spacing: { after: 50 } }
      },
      {
        id: 'TableCellTaskDetails',
        name: 'Table Cell Task Details',
        basedOn: 'Normal',
        run: {
          size: 8,
          color: DOCUMENT_STYLES.colors.secondary,
          font: DOCUMENT_STYLES.font
        },
        paragraph: { spacing: { after: 0 } }
      },
      {
        id: 'TableCellTaskDuration',
        name: 'Table Cell Task Duration',
        basedOn: 'Normal',
        run: {
          size: 8,
          color: DOCUMENT_STYLES.colors.secondary,
          font: DOCUMENT_STYLES.font
        },
        paragraph: { spacing: { after: 50 } }
      },
      {
        id: 'TableCellTaskBadge',
        name: 'Table Cell Task Badge',
        basedOn: 'Normal',
        run: {
          size: 8,
          font: DOCUMENT_STYLES.font
        },
        paragraph: {
          alignment: AlignmentType.CENTER,
          spacing: { after: 0 }
        }
      },

      // Birds Eye View Calendar Styles (no borders, smaller text)
      {
        id: 'TableCellBirdsEyeDay',
        name: 'Table Cell Birds Eye Day',
        basedOn: 'Normal',
        run: {
          size: 6,
          bold: true,
          color: DOCUMENT_STYLES.colors.secondary,
          font: DOCUMENT_STYLES.font
        },
        paragraph: { alignment: AlignmentType.CENTER }
      },
      {
        id: 'TableCellBirdsEyeDayNumber',
        name: 'Table Cell Birds Eye Day Number',
        basedOn: 'Normal',
        run: {
          size: 6,
          color: DOCUMENT_STYLES.colors.text,
          font: DOCUMENT_STYLES.font
        },
        paragraph: { alignment: AlignmentType.CENTER }
      },

      // Header and Footer Styles
      {
        id: 'HeaderText',
        name: 'Header Text',
        basedOn: 'Normal',
        run: {
          size: DOCUMENT_STYLES.sizes.small,
          bold: true,
          color: DOCUMENT_STYLES.colors.primary,
          font: DOCUMENT_STYLES.font
        },
        paragraph: { alignment: AlignmentType.JUSTIFIED, spacing: { after: 100 } }
      },
      {
        id: 'FooterText',
        name: 'Footer Text',
        basedOn: 'Normal',
        run: {
          size: DOCUMENT_STYLES.sizes.small,
          color: DOCUMENT_STYLES.colors.secondary,
          font: DOCUMENT_STYLES.font
        },
        paragraph: { alignment: AlignmentType.CENTER, spacing: { before: 100 } }
      }
    ]
  };
}

/**
 * Generate a blank template document for manual editing
 * This creates a blank document with all styles defined but no content
 */
async function generateStyledTemplate(): Promise<void> {
  const templateElements: (Paragraph | Table)[] = [];

  // Add only essential instructions
  templateElements.push(new Paragraph({
    children: [new TextRun({ text: 'UPSC Study Planner - Blank Template' })],
    style: 'CoverPageTitle'
  }));

  templateElements.push(new Paragraph({
    children: [new TextRun({ text: 'Instructions for Customizing Table Styles:' })],
    style: 'SectionHeading1'
  }));

  templateElements.push(new Paragraph({
    children: [new TextRun({ text: '1. Open this document in Microsoft Word' })],
    style: 'BodyText'
  }));

  templateElements.push(new Paragraph({
    children: [new TextRun({ text: '2. Go to the Table Design tab (when a table is selected)' })],
    style: 'BodyText'
  }));

  templateElements.push(new Paragraph({
    children: [new TextRun({ text: '3. Create new table styles with these exact names:' })],
    style: 'BodyText'
  }));

  templateElements.push(new Paragraph({
    children: [new TextRun({ text: '   • StudentInfoTable' })],
    style: 'BodyText'
  }));

  templateElements.push(new Paragraph({
    children: [new TextRun({ text: '   • MonthlyCalendarTable' })],
    style: 'BodyText'
  }));

  templateElements.push(new Paragraph({
    children: [new TextRun({ text: '   • ResourcesTable' })],
    style: 'BodyText'
  }));

  templateElements.push(new Paragraph({
    children: [new TextRun({ text: '   • BirdsEyeViewTable' })],
    style: 'BodyText'
  }));

  templateElements.push(new Paragraph({
    children: [new TextRun({ text: '   • MonthTitleTable' })],
    style: 'BodyText'
  }));

  templateElements.push(new Paragraph({
    children: [new TextRun({ text: '   • LegendTable' })],
    style: 'BodyText'
  }));

  templateElements.push(new Paragraph({
    children: [new TextRun({ text: '   • StrategyCardsTable' })],
    style: 'BodyText'
  }));

  templateElements.push(new Paragraph({
    children: [new TextRun({ text: '   • QuoteTable' })],
    style: 'BodyText'
  }));

  templateElements.push(new Paragraph({
    children: [new TextRun({ text: '   • SubjectCardsTable' })],
    style: 'BodyText'
  }));

  templateElements.push(new Paragraph({
    children: [new TextRun({ text: '   • MiniCalendarTable' })],
    style: 'BodyText'
  }));

  templateElements.push(new Paragraph({
    children: [new TextRun({ text: '   • WeeklyScheduleTable' })],
    style: 'BodyText'
  }));

  templateElements.push(new Paragraph({
    children: [new TextRun({ text: '   • WeekTitleTable' })],
    style: 'BodyText'
  }));

  templateElements.push(new Paragraph({
    children: [new TextRun({ text: '4. Customize borders, colors, fonts, and other properties as desired' })],
    style: 'BodyText'
  }));

  templateElements.push(new Paragraph({
    children: [new TextRun({ text: '5. Save this document as a template (.dotx) file' })],
    style: 'BodyText'
  }));

  templateElements.push(new Paragraph({
    children: [new TextRun({ text: '6. The generated documents will automatically use your custom table styles!' })],
    style: 'BodyText'
  }));

  templateElements.push(new Paragraph({ text: '', spacing: { after: 400 } }));

  // Create the template document
  const templateDocument = new Document({
    styles: getDocumentStyles(),
    sections: [
      {
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
        children: templateElements,
      },
    ],
  });

  // Save the template
  await saveDocx(templateDocument, 'study-plan-template.docx');
  console.log('✅ Styled template document generated: study-plan-template.docx');
}

/**
 * Load a Word template document with pre-defined styles
 * This allows users to customize table styles in Word and save as template
 */
async function loadTemplateDocument(templatePath?: string): Promise<Document> {
  const fs = await import('fs');
  const path = await import('path');

  // Default template path
  const defaultTemplatePath = path.join(process.cwd(), 'templates', 'calendar-template.docx');
  const templateFile = templatePath || defaultTemplatePath;

  if (fs.existsSync(templateFile)) {
    try {
      // Read template file (currently not used due to docx library limitations)
      fs.readFileSync(templateFile);
      console.log(`📁 Template found at: ${templateFile}`);
      console.log(`⚠️  Note: Direct template loading not yet implemented in docx library`);
      console.log(`   For now, the service will create new documents with the defined styles.`);
    } catch (error) {
      console.warn(`⚠️ Failed to load template from ${templateFile}:`, error);
    }
  } else {
    console.log(`📁 No template found at: ${templateFile}`);
    console.log(`   Using default styles. Run 'npm run generate-template' to create a template.`);
  }

  // Fallback to creating new document with styles
  return new Document({
    styles: getDocumentStyles(),
    sections: []
  });
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
            text: `Student: ${studentIntake.personal_details?.full_name || '[Name]'}`
          }),
          new TextRun({
            text: `\t\tTarget Year: ${studyPlan.targeted_year}`
          })
        ],
        style: 'HeaderText'
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
            })} - Page `
          }),
          new TextRun({
            children: [PageNumber.CURRENT]
          }),
          new TextRun({
            text: ' of '
          }),
          new TextRun({
            children: [PageNumber.TOTAL_PAGES]
          })
        ],
        style: 'FooterText'
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


