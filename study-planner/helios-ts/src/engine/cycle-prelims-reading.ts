import { StudyCycle } from '../types/models';
import { StudentIntake } from '../types/models';
import { Logger } from '../types/Types';
import dayjs from 'dayjs';
import { SubjData } from '../types/Subjects';
import { createBlocksForSubjects } from './cycle-utils';

/**
 * Calculate Prelims Reading start date: Jan 1 of target year until 31 March of target year
 * - If prep starts after April 1 of target year, then the prelims reading cycle is not included
 * - If prep starts after Jan 1 but before March 31, then the prelims reading cycle is included, 
 *   but hours are proportionately reduced
 */
export function calculatePrelimsReadingStartDate(
  logger: Logger,
  startDate: dayjs.Dayjs,
  foundationStartDate: dayjs.Dayjs,
  targetYear?: string
): dayjs.Dayjs | undefined {
  const { logInfo: info, logDebug: debug } = logger;
  
  info('Engine', 'Calculating Prelims Reading start date');
  
  // Use provided target year or fall back to foundation start date context
  const targetYearNum = targetYear ? parseInt(targetYear, 10) : foundationStartDate.year() + 1;
  const prelimsReadingStart = dayjs(`${targetYearNum}-01-01`);
  const prelimsReadingEnd = dayjs(`${targetYearNum}-03-31`);
  const aprilFirst = dayjs(`${targetYearNum}-04-01`);
  
  debug('Engine', `Target year: ${targetYearNum}, Prelims reading period: ${prelimsReadingStart.format('YYYY-MM-DD')} to ${prelimsReadingEnd.format('YYYY-MM-DD')}`);
  
  // If prep starts after April 1 of target year, no prelims reading cycle
  if (startDate.isAfter(aprilFirst)) {
    info('Engine', 'Prelims reading cycle skipped: start date is after April 1 of target year');
    return undefined;
  }
  
  // If prep starts after Jan 1 but before March 31, use start date (proportionate reduction)
  if (startDate.isAfter(prelimsReadingStart) && startDate.isBefore(prelimsReadingEnd)) {
    info('Engine', `Prelims reading cycle starts on ${startDate.format('YYYY-MM-DD')} (proportionate reduction)`);
    return startDate;
  }
  
  // If prep starts before Jan 1, use Jan 1 as start date
  if (startDate.isBefore(prelimsReadingStart)) {
    info('Engine', `Prelims reading cycle starts on ${prelimsReadingStart.format('YYYY-MM-DD')}`);
    return prelimsReadingStart;
  }
  
  // If prep starts exactly on Jan 1, use that date
  info('Engine', `Prelims reading cycle starts on ${startDate.format('YYYY-MM-DD')}`);
  return startDate;
}

/**
 * Plan Prelims Reading cycle: Jan 1 of target year until 31 March of target year
 * - Apply confidence factors to baseline hours
 * - Trim subtopics from D5 down to B1 if needed
 * - Returns undefined if no time for this cycle
 */
export async function planPrelimsReadingCycle(
  logger: Logger,
  intake: StudentIntake,
  confidenceMap: Map<string, number>,
  startDate: dayjs.Dayjs,
  endDate: dayjs.Dayjs,
  subjData: SubjData
): Promise<StudyCycle | undefined> {
  const { logInfo: info, logDebug: debug } = logger;
  const { subjects } = subjData;
  info('Engine', 'Planning Prelims Reading cycle');
  
  // If no start date or end date, cycle is not included
  if (!startDate || !endDate) {
    info('Engine', 'Prelims reading cycle skipped: no valid start or end date');
    return undefined;
  }
  
  // Use the endDate parameter passed from the schedule, don't hardcode
  const cycleEndDate = dayjs(endDate);
  const durationWeeks = Math.ceil(cycleEndDate.diff(startDate, 'day') / 7);
  
  // Calculate total hours for prelims reading cycle (assuming 8 hours/day)
  const totalHours = durationWeeks * 7 * 8;

  debug('Engine', `Prelims reading cycle: ${durationWeeks} weeks, ${totalHours} total hours`);
  
  // Get subjects by exam focus (prelims only and both exams)
  const prelimsSubjects = subjects.filter(s => 
    s.examFocus === 'PrelimsOnly' || s.examFocus === 'BothExams'
  );
  
  // Create blocks for prelims subjects
  const blocks = await createBlocksForSubjects(intake,
    prelimsSubjects,
    totalHours,
    confidenceMap,
    'Prelims Reading',
    'C4',
    2, 
    'Prelims Reading Cycle',
    startDate.format('YYYY-MM-DD'),
    cycleEndDate.format('YYYY-MM-DD'),
    subjData);
  
  const cycle: StudyCycle = {
    cycleId: `prelims-reading-${Date.now()}`,
    cycleType: 'C4',
    cycleIntensity: 'Intensive',
    cycleDuration: durationWeeks,
    cycleStartWeek: 1,
    cycleOrder: 2,
    cycleName: 'Prelims Reading Cycle',
    cycleBlocks: blocks,
    cycleDescription: 'Intensive reading phase for prelims preparation',
    cycleStartDate: startDate.format('YYYY-MM-DD'),
    cycleEndDate: cycleEndDate.format('YYYY-MM-DD')
  };
  
  info('Engine', `Created Prelims reading cycle with ${cycle.cycleBlocks.length} blocks`);
  
  return cycle;
}

