import type { StudyPlan, StudentIntake } from '../types/models';
import { CycleType } from '../types/Types';
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import { SubjectLoader } from './SubjectLoader';

dayjs.extend(isBetween);
dayjs.extend(isSameOrBefore);

// Color mapping for different cycle types
const CYCLE_TYPE_COLORS = {
  [CycleType.C1]: { bg: 'DBEAFE', border: '3B82F6', fg: '1D4ED8' },
  [CycleType.C2]: { bg: 'DCFCE7', border: '22C55E', fg: '15803D' },
  [CycleType.C3]: { bg: 'FCE7F3', border: 'EC4899', fg: 'BE185D' },
  [CycleType.C4]: { bg: 'FEE2E2', border: 'EF4444', fg: 'B91C1C' },
  [CycleType.C5]: { bg: 'EDE9FE', border: '8B5CF6', fg: '6D28D9' },
  [CycleType.C5B]: { bg: 'EDE9FE', border: '8B5CF6', fg: '6D28D9' },
  [CycleType.C6]: { bg: 'E0F2FE', border: '06B6D4', fg: '0369A1' },
  [CycleType.C7]: { bg: 'FFEDD5', border: 'F59E0B', fg: 'C2410C' },
  [CycleType.C8]: { bg: 'ECFCCB', border: '84CC16', fg: '3F6212' },
} as const;

interface TemplateDataOptions {
  includeWeeklyViews?: boolean;
  monthIndex?: number;
}

/**
 * Transform StudyPlan and StudentIntake to template data format
 */
export function transformStudyPlanToTemplateData(
  studyPlan: StudyPlan,
  studentIntake: StudentIntake,
  options: TemplateDataOptions = {}
): any {
  const year = studyPlan.targeted_year || new Date().getFullYear();
  const pd = studentIntake.personal_details;
  const ss = studentIntake.study_strategy;
  const ps = studentIntake.preparation_background;

  // Base template data
  const templateData: any = {
    // Cover page data
    coverPage: {
      companyBrand: '🎓 LA MENTORA',
      versionInfo: 'Study Planner v1.0',
      tagline: '"Your Path to UPSC Success"',
      title: 'UPSC STUDY PLANNER',
      year: year.toString(),
      studentName: pd?.full_name?.toUpperCase() || 'STUDENT NAME',
      subtitle: 'Personalized Study Plan & Calendar',
      
      // Student profile
      profile: {
        email: pd?.email || 'N/A',
        phone: pd?.phone_number || 'N/A',
        location: pd?.present_location || 'N/A',
        targetYear: year.toString(),
        optionalSubject: studentIntake.optional_subject?.optional_subject_name || 'N/A',
        previousAttempts: ps?.number_of_attempts || 'N/A',
        studyHours: ss?.weekly_study_hours || 'N/A',
        planDuration: `${calculatePlanDuration(studyPlan)} months`,
      },
      
      // Contact information
      contact: {
        website: 'www.lamentora.com',
        email: 'support@lamentora.com',
        phone: '+91 98765 43210',
        whatsapp: 'WhatsApp Support Available',
      },
    },
    
    // Birds eye view - cycle timeline
    birdsEyeView: {
      title: 'Birds Eye View - Cycle Timeline',
      subtitle: 'A chronological overview of your study cycles from start to finish',
      cycles: (studyPlan.cycles || []).map((cycle: any) => {
        const cycleColor = CYCLE_TYPE_COLORS[cycle.cycleType as keyof typeof CYCLE_TYPE_COLORS];
        const cycleStart = dayjs(cycle.cycleStartDate);
        const cycleEnd = dayjs(cycle.cycleEndDate);
        const duration = cycleEnd.diff(cycleStart, 'day') + 1;
        
        return {
          name: getCycleDescription(cycle.cycleType).replace(/ Cycle$/, ''),
          startDate: cycleStart.format('MMM D, YYYY'),
          endDate: cycleEnd.format('MMM D, YYYY'),
          duration: duration === 1 ? '1 day' : `${duration} days`,
          color: cycleColor?.bg || 'FFFFFF',
          textColor: cycleColor?.fg || '000000',
        };
      }),
    },
    
    // Monthly views
    monthlyViews: generateMonthlyViewsData(studyPlan, studentIntake, options),
    
    // Resources table
    resourcesTable: {
      title: '📊 Comprehensive Resources by Subject',
      subjects: [], // Will be populated below
    },
    
    // Legend
    legend: {
      title: 'ℹ️ Legend & Study Phases',
      entries: [], // Will be populated below
    },
    
    // Header/Footer data
    header: {
      studentName: pd?.full_name || '[Name]',
      targetYear: studyPlan.targeted_year || year,
    },
    footer: {
      company: 'La Mentora Study Planner v1.0',
      copyright: '© 2025-2026 All Rights Reserved',
      generatedDate: new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
    },
  };

  // Populate resources table
  templateData.resourcesTable.subjects = getUniqueSubjects(studyPlan).map((subjectCode: string) => ({
    name: getSubjectName(subjectCode),
    primaryBooks: '', // Will be populated asynchronously if needed
    videoContent: '',
    practiceMaterials: '',
    currentAffairs: '',
  }));

  // Populate legend
  const cycles = studyPlan.cycles || [];
  const uniqueSubjects = getUniqueSubjects(studyPlan);
  
  cycles.forEach((cycle: any) => {
    const cycleColor = CYCLE_TYPE_COLORS[cycle.cycleType as keyof typeof CYCLE_TYPE_COLORS];
    templateData.legend.entries.push({
      color: cycleColor?.bg || 'FFFFFF',
      name: cycle.cycleName,
      description: `Study phase with ${cycle.cycleDuration} weeks duration`,
    });
  });
  
  uniqueSubjects.forEach((subject: string) => {
    templateData.legend.entries.push({
      color: 'E0E0E0',
      name: getSubjectName(subject),
      description: 'Subject area for study',
    });
  });

  return templateData;
}

/**
 * Generate monthly views data
 */
function generateMonthlyViewsData(
  studyPlan: StudyPlan,
  studentIntake: StudentIntake,
  options: TemplateDataOptions
): any {
  const cycles = studyPlan.cycles || [];
  const minDate = dayjs(studyPlan.start_date);
  const maxDate = dayjs(`${studyPlan.targeted_year}-08-31`);
  const endDate = maxDate.endOf('month');
  
  const PDF_MAX_MONTHS = 36;
  const months: any[] = [];
  let monthCount = 0;

  // If monthIndex is specified, only generate that specific month
  if (options.monthIndex !== undefined) {
    const allMonths: dayjs.Dayjs[] = [];
    for (
      let currentDate = minDate.startOf('month');
      currentDate.isSameOrBefore(endDate, 'month');
      currentDate = currentDate.add(1, 'month')
    ) {
      allMonths.push(currentDate);
    }
    
    if (options.monthIndex >= 0 && options.monthIndex < allMonths.length) {
      const monthDate = allMonths[options.monthIndex];
      months.push(generateMonthData(monthDate, cycles, studyPlan, studentIntake, options));
    }
    
    return { months };
  }

  // Generate all months
  for (
    let currentDate = minDate.startOf('month');
    currentDate.isSameOrBefore(endDate, 'month') && monthCount < PDF_MAX_MONTHS;
    currentDate = currentDate.add(1, 'month')
  ) {
    const monthDate = currentDate;
    months.push(generateMonthData(monthDate, cycles, studyPlan, studentIntake, options));
    monthCount++;
  }

  return { months };
}

/**
 * Generate data for a specific month
 */
function generateMonthData(
  monthDate: dayjs.Dayjs,
  cycles: any[],
  studyPlan: StudyPlan,
  studentIntake: StudentIntake,
  options: TemplateDataOptions
): any {
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
  
  const cycleName = cycle ? cycle.cycleName.replace(/ Cycle$/, '') : '';
  const cycleColor = cycle ? CYCLE_TYPE_COLORS[cycle.cycleType as keyof typeof CYCLE_TYPE_COLORS]?.fg || '000000' : '000000';
  const cycleBgColor = cycle ? CYCLE_TYPE_COLORS[cycle.cycleType as keyof typeof CYCLE_TYPE_COLORS]?.bg || 'FFFFFF' : 'FFFFFF';
  
  // Generate calendar grid
  const daysInMonth = monthDate.daysInMonth();
  const firstDayOfMonth = monthDate.startOf('month').day();
  
  const calendarDays: any[] = [];
  
  // Add empty cells for days before month starts
  for (let i = 0; i < firstDayOfMonth; i++) {
    calendarDays.push({ empty: true });
  }
  
  // Add actual days
  for (let day = 1; day <= daysInMonth; day++) {
    const currentDay = monthDate.date(day);
    
    // Determine which cycle this day belongs to
    let dayCycle = null;
    for (const c of cycles) {
      const cycleStart = dayjs(c.cycleStartDate);
      const cycleEnd = dayjs(c.cycleEndDate);
      if (currentDay.isBetween(cycleStart, cycleEnd, 'day', '[]')) {
        dayCycle = c;
        break;
      }
    }
    
    const dayCycleColor = dayCycle ? CYCLE_TYPE_COLORS[dayCycle.cycleType as keyof typeof CYCLE_TYPE_COLORS]?.bg || 'FFFFFF' : 'FFFFFF';
    
    // Get subjects for this day
    const daySubjects: string[] = [];
    for (const c of cycles) {
      for (const block of c.cycleBlocks) {
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
    
    calendarDays.push({
      empty: false,
      dayNumber: day.toString(),
      subjects: daySubjects,
      bgColor: dayCycleColor,
    });
  }
  
  // Fill remaining cells
  const totalCells = Math.ceil(calendarDays.length / 7) * 7;
  while (calendarDays.length < totalCells) {
    calendarDays.push({ empty: true });
  }
  
  // Group into weeks (rows of 7)
  const weeks: any[] = [];
  for (let i = 0; i < calendarDays.length; i += 7) {
    weeks.push({
      days: calendarDays.slice(i, i + 7)
    });
  }
  
  const monthData: any = {
    name: monthName,
    year: monthYear,
    cycleName: cycleName,
    cycleColor: cycleColor,
    cycleBgColor: cycleBgColor,
    calendarWeeks: weeks,
    resources: [], // Monthly resources can be added here
  };
  
  // Add weekly views if enabled
  if (options.includeWeeklyViews !== false) {
    monthData.weeklyViews = generateWeeklyViewsData(studyPlan, studentIntake, monthDate);
  }
  
  return monthData;
}

/**
 * Generate weekly views data for a month
 */
function generateWeeklyViewsData(
  studyPlan: StudyPlan,
  _studentIntake: StudentIntake,
  monthDate: dayjs.Dayjs
): any[] {
  const weeks: any[] = [];
  const monthStart = monthDate.startOf('month');
  const monthEnd = monthDate.endOf('month');
  
  let currentWeek = monthStart.startOf('week');
  
  while (currentWeek.isBefore(monthEnd) || currentWeek.isSame(monthEnd, 'week')) {
    const weekStart = currentWeek;
    const weekEnd = currentWeek.endOf('week');
    
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
    
    const cycleName = weekCycle ? weekCycle.cycleName.replace(/ Cycle$/, '') : '';
    const cycleColor = weekCycle ? CYCLE_TYPE_COLORS[weekCycle.cycleType as keyof typeof CYCLE_TYPE_COLORS]?.fg || '000000' : '000000';
    
    // Generate daily data for the week
    const days: any[] = [];
    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const currentDay = weekStart.add(dayOffset, 'day');
      const dayName = currentDay.format('dddd');
      const dayDate = currentDay.format('MMM DD');
      
      days.push({
        name: dayName,
        date: dayDate,
        tasks: [], // Tasks can be populated here
      });
    }
    
    weeks.push({
      startDate: weekStart.format('MMM DD'),
      endDate: weekEnd.format('MMM DD, YYYY'),
      cycleName: cycleName,
      cycleColor: cycleColor,
      days: days,
    });
    
    currentWeek = currentWeek.add(1, 'week');
  }
  
  return weeks;
}

/**
 * Get cycle description
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
 * Calculate plan duration in months
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
