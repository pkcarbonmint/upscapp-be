import { AlignmentType, } from 'docx';
export const DOCUMENT_STYLES = {
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

export const TABLE_STYLE_NAMES = {
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

export default {
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
