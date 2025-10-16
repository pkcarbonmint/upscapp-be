import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import { Logger, CycleSchedule, ScenarioResult, CycleType } from '../types/Types'; // Updated for S4A

dayjs.extend(isBetween);

/**
 * Main function to determine cycle schedule based on start date and target year
 */
export function determineCycleSchedule(
  // @ts-ignore
  logger: Logger,
  startDate: Date,
  targetYear: number,
  prelimsExamDate: Date, // Usually around May 28 of target year
  intake?: any // StudentIntake - optional for backward compatibility
): ScenarioResult {
  const totalTimeAvailable = (prelimsExamDate.getTime() - startDate.getTime()) / (30.44 * 24 * 60 * 60 * 1000);
  const scenario = determineScenario(totalTimeAvailable, startDate, targetYear, intake);
  const schedules = generateScheduleForScenario(scenario, startDate, targetYear, intake);

  return {
    scenario,
    totalTimeAvailable,
    schedules
  };
}

/**
 * Determine which scenario (S1-S8) applies based on time available
 */
function determineScenario(
  totalTimeAvailable: number,
  startDate: Date,
  targetYear: number,
  intake?: any
): ScenarioResult['scenario'] {
  const start = dayjs(startDate);

  // Calendar-based conditions take priority over time-based conditions
  // First check specific calendar periods
  const dec16BeforeTarget = dayjs(`${targetYear - 1}-12-16`);
  const feb28 = dayjs(`${targetYear}-02-28`);
  const mar1 = dayjs(`${targetYear}-03-01`);
  const apr15 = dayjs(`${targetYear}-04-15`);
  const prelimsExamDate = intake ? dayjs(intake.getPrelimsExamDate()) : dayjs(`${targetYear}-05-20`);

  // S8: Too late (Apr 16 - May 15)
  const apr16Target = dayjs(`${targetYear}-04-16`);
  if (start.isBetween(apr16Target, prelimsExamDate, 'day', '[]')) {
    return 'S8'; // REJECT
  }

  // S7: Crash course early (Mar 1 - Apr 15) 
  if (start.isBetween(mar1, apr15, 'day', '[]')) {
    return 'S7';
  }

  // S6: Ultra-short (Dec 16 - Jan 15)
  if (start.isBetween(dec16BeforeTarget, feb28, 'day', '[]')) {
    return 'S6';
  }

  // Select S5 when  start date is between 
  // June 1 to Dec 15 of the year before target year
  const jun1BeforeTargetYear = dayjs(`${targetYear - 1}-06-01`);
  const dec15BeforeTargetYear = dayjs(`${targetYear - 1}-12-15`);
  // if start date is between jun1BeforeTarget and dec31BeforeTarget
  if (start.isBetween(jun1BeforeTargetYear, dec15BeforeTargetYear, 'day', '[]')) {
    return 'S5';
  }

  // S4A: Medium-Short Preparation (7-12 months until Dec 15)
  const dec15BeforeTarget = dayjs(`${targetYear - 1}-12-15`);
  const daysBeforeDec15 = dec15BeforeTarget.diff(start, 'day');
  if (totalTimeAvailable >= 7 && totalTimeAvailable < 12 && daysBeforeDec15 >= 0) {
    return 'S4A';
  }

  // Time-based scenarios (only if not in specific calendar periods above)
  if (totalTimeAvailable >= 20) return 'S1';
  else if (totalTimeAvailable >= 18) return 'S2';
  else if (totalTimeAvailable >= 15) return 'S3';
  else if (totalTimeAvailable >= 12) return 'S4';
  else return 'S5'; // Fallback for remaining cases
}

/**
 * Generate schedule for each scenario based on the design document
 */
function generateScheduleForScenario(
  scenario: ScenarioResult['scenario'],
  startDate: Date,
  targetYear: number,
  intake?: any
): CycleSchedule[] {
  switch (scenario) {
    case 'S1':
      return getS1Schedule(startDate, targetYear, intake);
    case 'S2':
      return getS2Schedule(startDate, targetYear, intake);
    case 'S3':
      return getS3Schedule(startDate, targetYear, intake);
    case 'S4':
      return getS4Schedule(startDate, targetYear, intake);
    case 'S4A':
      return getS4ASchedule(startDate, targetYear, intake);
    case 'S5':
      return getS5Schedule(startDate, targetYear, intake);
    case 'S6':
      return getS6Schedule(startDate, targetYear, intake);
    case 'S7':
      return getS7Schedule(startDate, targetYear, intake);
    case 'S8':
      throw new Error(`Plan generation rejected: insufficient time. Consider targeting ${targetYear + 1}.`);
    default:
      throw new Error(`Unknown scenario: ${scenario}`);
  }
}

/**
 * Scenario S1: Long Preparation (≥20 months)
 * C1: Start → +3 months (NCERT Foundation)
 * C2: After C1 → +10 months (Comprehensive Foundation)
 * C3: After C2 → ends Dec 31 before target year (max 2 months, extend if extra time)
 * C4: Jan 1 target year → Mar 31 target year (Prelims Reading)
 * C5: Apr 1 target year → May 5 target year (Prelims Revision)
 * C5.b: May 6 target year → prelims exam date (Rapid Revision)
 * C6: May 21 target year → Jul 31 target year (Mains Revision)
 * C7: Aug 1 target year → mains exam date (Rapid Mains)
 */
function getS1Schedule(startDate: Date, targetYear: number, intake?: any): CycleSchedule[] {
  const start = dayjs(startDate);

  const c1End = start.add(3, 'month').subtract(1, 'day'); // 3 months - 1 day
  const yearEnd = dayjs(`${targetYear - 1}-12-31`); // Dec 31 before target year

  // Calculate C2: After C1, runs for most of the available time
  const c2Start = c1End.add(1, 'day');

  // Calculate how much time we have total from C1 end to Dec 31 before target year
  const availableMonthsBeforeC4 = yearEnd.diff(c2Start, 'month', true);

  // C3 should get max 2 months, so C2 gets the rest
  const c3MaxDurationMonths = 2;
  const c2TargetDurationMonths = Math.max(7, availableMonthsBeforeC4 - c3MaxDurationMonths); // Minimum 7 months for C2

  const finalC2End = c2Start.add(c2TargetDurationMonths, 'month').endOf('month');
  const c2DurationMonths = Math.ceil(finalC2End.diff(c2Start, 'month', true));

  // Calculate C3: After C2 ends, runs approximately 2 months until Dec 31 before target year
  const c3Start = finalC2End.add(1, 'day');
  const c3End = yearEnd; // End exactly on Dec 31 before target year
  const c3DurationMonths = Math.ceil(c3End.diff(c3Start, 'month', true));

  const c4End = dayjs(`${targetYear}-03-31`);
  const prelimsExamDate = intake ? dayjs(intake.getPrelimsExamDate()) : dayjs(`${targetYear}-05-20`);
  const c5End = dayjs(`${targetYear}-05-05`); // C5 ends May 5
  const c5bEnd = prelimsExamDate.subtract(1, 'day'); // C5.b ends day before prelims
  const c6End = dayjs(`${targetYear}-07-31`);
  const mainsExamDate = intake ? dayjs(intake.getMainsExamDate()) : dayjs(`${targetYear}-08-20`);

  return [
    {
      cycleType: CycleType.C1,
      startDate: start.format('YYYY-MM-DD'),
      endDate: c1End.format('YYYY-MM-DD'),
      durationMonths: 3,
      priority: 'mandatory'
    },
    {
      cycleType: CycleType.C2,
      startDate: c2Start.format('YYYY-MM-DD'),
      endDate: finalC2End.format('YYYY-MM-DD'),
      durationMonths: c2DurationMonths,
      priority: 'mandatory'
    },
    {
      cycleType: CycleType.C3,
      startDate: c3Start.format('YYYY-MM-DD'),
      endDate: c3End.format('YYYY-MM-DD'),
      durationMonths: c3DurationMonths,
      priority: 'mandatory'
    },
    {
      cycleType: CycleType.C4,
      startDate: dayjs(`${targetYear}-01-01`).format('YYYY-MM-DD'),
      endDate: c4End.format('YYYY-MM-DD'),
      durationMonths: 3,
      priority: 'mandatory'
    },
    {
      cycleType: CycleType.C5,
      startDate: dayjs(`${targetYear}-04-01`).format('YYYY-MM-DD'),
      endDate: c5End.format('YYYY-MM-DD'),
      durationMonths: 1,
      priority: 'mandatory'
    },
    {
      cycleType: CycleType.C5B,
      startDate: dayjs(`${targetYear}-05-06`).format('YYYY-MM-DD'),
      endDate: c5bEnd.format('YYYY-MM-DD'),
      durationMonths: 1,
      priority: 'mandatory'
    },
    {
      cycleType: CycleType.C6,
      startDate: prelimsExamDate.format('YYYY-MM-DD'), // Start after C5 ends
      endDate: c6End.format('YYYY-MM-DD'),
      durationMonths: 2,
      priority: 'mandatory'
    },
    {
      cycleType: CycleType.C7,
      startDate: dayjs(`${targetYear}-08-01`).format('YYYY-MM-DD'),
      endDate: mainsExamDate.format('YYYY-MM-DD'),
      durationMonths: 1,
      priority: 'mandatory'
    }
  ];
}

/**
 * Scenario S2: Medium-Long Preparation (18-20 months)
 * Identical to S1
 */
function getS2Schedule(startDate: Date, targetYear: number, intake?: any): CycleSchedule[] {
  return getS1Schedule(startDate, targetYear, intake);
}

/**
 * Scenario S3: Medium Preparation (15-18 months)
 * C1: Start → +3 months
 * C2: After C1 → Dec 31 before target year (minimum 7 months, shrink from 10 months)
 * C3: SKIP (No C3)
 * C4: Jan-Mar target year
 * C5: Apr 1 - May 5
 * C5.b: May 6 - prelims date
 * C6: May-Jul target year
 * C7: Aug-mains date
 */
function getS3Schedule(startDate: Date, targetYear: number, intake?: any): CycleSchedule[] {
  const start = dayjs(startDate);
  const prelimsExamDate = intake ? dayjs(intake.getPrelimsExamDate()) : dayjs(`${targetYear}-05-20`);
  const mainsExamDate = intake ? dayjs(intake.getMainsExamDate()) : dayjs(`${targetYear}-08-20`);

  return [
    {
      cycleType: CycleType.C1,
      startDate: start.format('YYYY-MM-DD'),
      endDate: start.add(3, 'month').subtract(1, 'day').format('YYYY-MM-DD'),
      durationMonths: 3,
      priority: 'mandatory'
    },
    {
      cycleType: CycleType.C2,
      startDate: start.add(3, 'month').format('YYYY-MM-DD'),
      endDate: dayjs(`${targetYear - 1}-12-31`).format('YYYY-MM-DD'),
      durationMonths: 7, // Shrunken from 10 months
      priority: 'mandatory'
    },
    {
      cycleType: CycleType.C4,
      startDate: dayjs(`${targetYear}-01-01`).format('YYYY-MM-DD'),
      endDate: dayjs(`${targetYear}-03-31`).format('YYYY-MM-DD'),
      durationMonths: 3,
      priority: 'mandatory'
    },
    {
      cycleType: CycleType.C5,
      startDate: dayjs(`${targetYear}-04-01`).format('YYYY-MM-DD'),
      endDate: dayjs(`${targetYear}-05-05`).format('YYYY-MM-DD'),
      durationMonths: 1,
      priority: 'mandatory'
    },
    {
      cycleType: CycleType.C5B,
      startDate: dayjs(`${targetYear}-05-06`).format('YYYY-MM-DD'),
      endDate: prelimsExamDate.subtract(1, 'day').format('YYYY-MM-DD'),
      durationMonths: 1,
      priority: 'mandatory'
    },
    {
      cycleType: CycleType.C6,
      startDate: prelimsExamDate.format('YYYY-MM-DD'), // Start after C5 ends
      endDate: dayjs(`${targetYear}-07-31`).format('YYYY-MM-DD'),
      durationMonths: 2,
      priority: 'mandatory'
    },
    {
      cycleType: CycleType.C7,
      startDate: dayjs(`${targetYear}-08-01`).format('YYYY-MM-DD'),
      endDate: mainsExamDate.format('YYYY-MM-DD'),
      durationMonths: 1,
      priority: 'mandatory'
    }
  ];
}

/**
 * Scenario S4: Medium-Short Preparation (12-15 months)
 * C1: SKIP (No C1)
 * C2: Start → Dec 31 before target year (minimum 7 months)
 * C3: SKIP (No C3)
 * C4: Jan-Mar target year
 * C5: Apr 1 - May 5
 * C5.b: May 6 - prelims date
 * C6: May-Jul target year
 * C7: Aug-mains date
 */
function getS4Schedule(startDate: Date, targetYear: number, intake?: any): CycleSchedule[] {
  const start = dayjs(startDate);
  const prelimsExamDate = intake ? dayjs(intake.getPrelimsExamDate()) : dayjs(`${targetYear}-05-20`);
  const mainsExamDate = intake ? dayjs(intake.getMainsExamDate()) : dayjs(`${targetYear}-08-20`);

  return [
    {
      cycleType: CycleType.C2,
      startDate: start.format('YYYY-MM-DD'),
      endDate: dayjs(`${targetYear - 1}-12-31`).format('YYYY-MM-DD'),
      durationMonths: 7, // Minimum required months
      priority: 'mandatory'
    },
    {
      cycleType: CycleType.C4,
      startDate: dayjs(`${targetYear}-01-01`).format('YYYY-MM-DD'),
      endDate: dayjs(`${targetYear}-03-31`).format('YYYY-MM-DD'),
      durationMonths: 3,
      priority: 'mandatory'
    },
    {
      cycleType: CycleType.C5,
      startDate: dayjs(`${targetYear}-04-01`).format('YYYY-MM-DD'),
      endDate: dayjs(`${targetYear}-05-05`).format('YYYY-MM-DD'),
      durationMonths: 1,
      priority: 'mandatory'
    },
    {
      cycleType: CycleType.C5B,
      startDate: dayjs(`${targetYear}-05-06`).format('YYYY-MM-DD'),
      endDate: prelimsExamDate.subtract(1, 'day').format('YYYY-MM-DD'),
      durationMonths: 1,
      priority: 'mandatory'
    },
    {
      cycleType: CycleType.C6,
      startDate: prelimsExamDate.format('YYYY-MM-DD'), // Start after C5 ends
      endDate: dayjs(`${targetYear}-07-31`).format('YYYY-MM-DD'),
      durationMonths: 2,
      priority: 'mandatory'
    },
    {
      cycleType: CycleType.C7,
      startDate: dayjs(`${targetYear}-08-01`).format('YYYY-MM-DD'),
      endDate: mainsExamDate.format('YYYY-MM-DD'),
      durationMonths: 1,
      priority: 'mandatory'
    }
  ];
}

/**
 * Scenario S4A: Medium-Short Preparation (7-12 months)
 * C1: SKIP (No C1)
 * C2: Start → Dec 31 before target year (minimum 7 months) - fit the blocks in available time.
 * C3: SKIP (No C3)
 * C4: Jan-Mar target year
 * C5: Apr 1 - May 5
 * C5.b: May 6 - prelims date
 * C6: May-Jul target year
 * C7: Aug-mains date
 * 
 * Validation: C2 duration must be ≥ 7 months
 */
function getS4ASchedule(startDate: Date, targetYear: number, intake?: any): CycleSchedule[] {
  const start = dayjs(startDate);
  const prelimsExamDate = intake ? dayjs(intake.getPrelimsExamDate()) : dayjs(`${targetYear}-05-20`);
  const mainsExamDate = intake ? dayjs(intake.getMainsExamDate()) : dayjs(`${targetYear}-08-20`);

  // Calculate C2 duration to ensure it's at least 7 months
  const c2End = dayjs(`${targetYear - 1}-12-31`);
  const c2DurationMonths = Math.max(7, c2End.diff(start, 'month', true));

  return [
    {
      cycleType: CycleType.C2,
      startDate: start.format('YYYY-MM-DD'),
      endDate: c2End.format('YYYY-MM-DD'),
      durationMonths: Math.ceil(c2DurationMonths),
      priority: 'mandatory'
    },
    {
      cycleType: CycleType.C4,
      startDate: dayjs(`${targetYear}-01-01`).format('YYYY-MM-DD'),
      endDate: dayjs(`${targetYear}-03-31`).format('YYYY-MM-DD'),
      durationMonths: 3,
      priority: 'mandatory'
    },
    {
      cycleType: CycleType.C5,
      startDate: dayjs(`${targetYear}-04-01`).format('YYYY-MM-DD'),
      endDate: dayjs(`${targetYear}-05-05`).format('YYYY-MM-DD'),
      durationMonths: 1,
      priority: 'mandatory'
    },
    {
      cycleType: CycleType.C5B,
      startDate: dayjs(`${targetYear}-05-06`).format('YYYY-MM-DD'),
      endDate: prelimsExamDate.subtract(1, 'day').format('YYYY-MM-DD'),
      durationMonths: 1,
      priority: 'mandatory'
    },
    {
      cycleType: CycleType.C6,
      startDate: prelimsExamDate.format('YYYY-MM-DD'), // Start after C5.b ends
      endDate: dayjs(`${targetYear}-07-31`).format('YYYY-MM-DD'),
      durationMonths: 2,
      priority: 'mandatory'
    },
    {
      cycleType: CycleType.C7,
      startDate: dayjs(`${targetYear}-08-01`).format('YYYY-MM-DD'),
      endDate: mainsExamDate.subtract(1, 'day').format('YYYY-MM-DD'),
      durationMonths: 1,
      priority: 'mandatory'
    }
  ];
}

/**
 * Scenario S5: Very Short Late Start (>15 days before Dec 31)
 * C1: SKIP
 * C2: SKIP
 * C3: SKIP
 * C8: Start → Dec 31 before target year (Mains Foundation)
 * C4: Jan-Mar target_year
 * C5: Apr 1 - May 5
 * C5.b: May 6 - prelims date
 * C6: May-Jul target year
 * C7: Aug-mains date
 */
function getS5Schedule(startDate: Date, targetYear: number, intake?: any): CycleSchedule[] {
  const start = dayjs(startDate);
  const prelimsExamDate = intake ? dayjs(intake.getPrelimsExamDate()) : dayjs(`${targetYear}-05-20`);
  const mainsExamDate = intake ? dayjs(intake.getMainsExamDate()) : dayjs(`${targetYear}-08-20`);

  return [
    {
      cycleType: CycleType.C8,
      startDate: start.format('YYYY-MM-DD'),
      endDate: dayjs(`${targetYear - 1}-12-31`).format('YYYY-MM-DD'),
      durationMonths: 1, // Whatever time is available
      priority: 'mandatory'
    },
    {
      cycleType: CycleType.C4,
      startDate: dayjs(`${targetYear}-01-01`).format('YYYY-MM-DD'),
      endDate: dayjs(`${targetYear}-03-31`).format('YYYY-MM-DD'),
      durationMonths: 3,
      priority: 'mandatory'
    },
    {
      cycleType: CycleType.C5,
      startDate: dayjs(`${targetYear}-04-01`).format('YYYY-MM-DD'),
      endDate: dayjs(`${targetYear}-05-05`).format('YYYY-MM-DD'),
      durationMonths: 1,
      priority: 'mandatory'
    },
    {
      cycleType: CycleType.C5B,
      startDate: dayjs(`${targetYear}-05-06`).format('YYYY-MM-DD'),
      endDate: prelimsExamDate.subtract(1, 'day').format('YYYY-MM-DD'),
      durationMonths: 1,
      priority: 'mandatory'
    },
    {
      cycleType: CycleType.C6,
      startDate: prelimsExamDate.format('YYYY-MM-DD'), // Start after C5.b ends
      endDate: dayjs(`${targetYear}-07-31`).format('YYYY-MM-DD'),
      durationMonths: 2,
      priority: 'mandatory'
    },
    {
      cycleType: CycleType.C7,
      startDate: dayjs(`${targetYear}-08-01`).format('YYYY-MM-DD'),
      endDate: mainsExamDate.format('YYYY-MM-DD'),
      durationMonths: 1,
      priority: 'mandatory'
    }
  ];
}

/**
 * Scenario S6: Ultra-Short Preparation (Dec 16 - Jan 15)
 * C1: SKIP
 * C2: SKIP
 * C3: SKIP
 * C8: SKIP
 * C4: Start date → Mar 31 target year (if start is before Jan 1)
 * C5: Apr 1 → May 5 (or proportionate if very late start)
 * C5.b: May 6 → prelims exam date (or proportionate if very late start)
 * C6: May 21 → Jul 31 target year
 * C7: Aug 1 → mains exam date
 */
function getS6Schedule(startDate: Date, targetYear: number, intake?: any): CycleSchedule[] {
  const start = dayjs(startDate);
  const prelimsExamDate = intake ? dayjs(intake.getPrelimsExamDate()) : dayjs(`${targetYear}-05-20`);
  const mainsExamDate = intake ? dayjs(intake.getMainsExamDate()) : dayjs(`${targetYear}-08-20`);

  // For very late starts (Nov/Dec), C5 and C5.b should start from start date instead of Apr 1
  // 
  // Pick C4:C5:C5.b durations in 3:1:1 ratio from start date until prelims exam date
  const daysToExam = prelimsExamDate.diff(start, 'day');
  const c4DurationDays = Math.floor(daysToExam * 3 / 5);  // C4 gets 3/5 of total time
  const c5DurationDays = Math.floor(daysToExam * 1 / 5);  // C5 gets 1/5 of total time
  const c5bDurationDays = Math.floor(daysToExam * 1 / 5); // C5.b gets 1/5 of total time
  const c4StartDate = start;
  const c4EndDate = c4StartDate.add(c4DurationDays, 'day');
  const c5StartDate = c4EndDate.add(1, 'day');  // C5 starts day after C4 ends
  const c5EndDate = c5StartDate.add(c5DurationDays, 'day');
  const c5bStartDate = c5EndDate.add(1, 'day'); // C5.b starts day after C5 ends

  const schedules: CycleSchedule[] = [];

  // Always add C4 for S6 scenarios
  schedules.push({
    cycleType: CycleType.C4,
    startDate: c4StartDate.format('YYYY-MM-DD'),
    endDate: c4EndDate.format('YYYY-MM-DD'),
    durationMonths: Math.ceil(c4DurationDays / 30),
    priority: 'mandatory'
  });

  schedules.push({
    cycleType: CycleType.C5,
    startDate: c5StartDate.format('YYYY-MM-DD'),
    endDate: c5EndDate.format('YYYY-MM-DD'),
    durationMonths: Math.ceil(c5DurationDays / 30),
    priority: 'mandatory'
  });

  schedules.push({
    cycleType: CycleType.C5B,
    startDate: c5bStartDate.format('YYYY-MM-DD'),
    endDate: prelimsExamDate.subtract(1, 'day').format('YYYY-MM-DD'),
    durationMonths: Math.ceil(c5bDurationDays / 30),
    priority: 'mandatory'
  });

  schedules.push({
    cycleType: CycleType.C6,
    startDate: prelimsExamDate.format('YYYY-MM-DD'), // Start after C5.b ends
    endDate: dayjs(`${targetYear}-07-31`).format('YYYY-MM-DD'),
    durationMonths: 2,
    priority: 'mandatory'
  });

  schedules.push({
    cycleType: CycleType.C7,
    startDate: dayjs(`${targetYear}-08-01`).format('YYYY-MM-DD'),
    endDate: mainsExamDate.format('YYYY-MM-DD'),
    durationMonths: 1,
    priority: 'mandatory'
  });

  return schedules;
}

/**
 * Scenario S7: Crash Course Early (Mar 1 - Apr 15)
 * C1: SKIP
 * C2: SKIP
 * C3: SKIP
 * C8: SKIP
 * C4: SKIP
 * C5: Start date → May 5 (if time allows)
 * C5.b: May 6 → prelims exam date
 * C6: May 21 → Jul 31 target year
 * C7: Aug 1 → mains exam date
 */
function getS7Schedule(startDate: Date, targetYear: number, intake?: any): CycleSchedule[] {
  const start = dayjs(startDate);
  const prelimsExamDate = intake ? dayjs(intake.getPrelimsExamDate()) : dayjs(`${targetYear}-05-20`);
  const mainsExamDate = intake ? dayjs(intake.getMainsExamDate()) : dayjs(`${targetYear}-08-20`);

  // Split available time equally between C5 and C5.b
  const daysToExam = prelimsExamDate.diff(start, 'day');
  const c5DurationDays = Math.floor(daysToExam / 2);
  const c5EndDate = start.add(c5DurationDays, 'day');
  const c5bStartDate = c5EndDate.add(1, 'day');

  return [
    {
      cycleType: CycleType.C5,
      startDate: start.format('YYYY-MM-DD'),
      endDate: c5EndDate.format('YYYY-MM-DD'),
      durationMonths: Math.ceil(c5DurationDays / 30),
      priority: 'mandatory'
    },
    {
      cycleType: CycleType.C5B,
      startDate: c5bStartDate.format('YYYY-MM-DD'),
      endDate: prelimsExamDate.subtract(1, 'day').format('YYYY-MM-DD'),
      durationMonths: Math.ceil((daysToExam - c5DurationDays) / 30),
      priority: 'mandatory'
    },
    {
      cycleType: CycleType.C6,
      startDate: prelimsExamDate.format('YYYY-MM-DD'), // Start after C5 ends
      endDate: dayjs(`${targetYear}-07-31`).format('YYYY-MM-DD'),
      durationMonths: 2,
      priority: 'mandatory'
    },
    {
      cycleType: CycleType.C7,
      startDate: dayjs(`${targetYear}-08-01`).format('YYYY-MM-DD'),
      endDate: mainsExamDate.format('YYYY-MM-DD'),
      durationMonths: 1,
      priority: 'mandatory'
    }
  ];
}
