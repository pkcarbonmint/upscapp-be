import { StudyCycle } from '../types/models';
import { StudentIntake } from '../types/models';
import { Logger } from '../types/Types';
import dayjs from 'dayjs';
import { SubjData } from '../types/Subjects';
import { createBlocksForSubjects } from './cycle-utils';

/**
 * Calculate Prelims Revision start date: April 1 of target year until May 5 of target year
 * - If prep starts after May 5, then the Prelims Revision cycle is not included
 * - If prep starts after April 1 but before May 5, then the Prelims Revision cycle is included, 
 *   but hours are proportionately reduced
 */
export function calculatePrelimsRevisionStartDate(
  logger: Logger,
  startDate: dayjs.Dayjs,
  prelimsReadingStartDate: dayjs.Dayjs | undefined,
  targetYear?: string
): dayjs.Dayjs | undefined {
  const { logInfo: info, logDebug: debug } = logger;

  info('Engine', 'Calculating Prelims Revision start date');

  // Use provided target year or fall back to prelims reading start date
  const targetYearNum = targetYear ? parseInt(targetYear, 10) : prelimsReadingStartDate?.year() || startDate.year() + 1;
  const aprilFirst = dayjs(`${targetYearNum}-04-01`);
  const mayFifth = dayjs(`${targetYearNum}-05-05`);

  debug('Engine', `Target year: ${targetYearNum}, Prelims revision period: ${aprilFirst.format('YYYY-MM-DD')} to ${mayFifth.format('YYYY-MM-DD')}`);

  // If prep starts after May 5, skip this cycle
  if (startDate.isAfter(mayFifth)) {
    info('Engine', 'Prelims revision cycle skipped: start date is after May 5 of target year');
    return undefined;
  }

  // If prep starts after April 1 but before May 5, use start date (proportionate reduction)
  if (startDate.isAfter(aprilFirst) && startDate.isBefore(mayFifth)) {
    info('Engine', `Prelims revision cycle starts on ${startDate.format('YYYY-MM-DD')} (proportionate reduction)`);
    return startDate;
  }

  // If prep starts before April 1, use April 1 as start date
  if (startDate.isBefore(aprilFirst)) {
    info('Engine', `Prelims revision cycle starts on ${aprilFirst.format('YYYY-MM-DD')}`);
    return aprilFirst;
  }

  // If prep starts exactly on April 1, use that date
  info('Engine', `Prelims revision cycle starts on ${startDate.format('YYYY-MM-DD')}`);
  return startDate;
}

/**
 * Plan Prelims Revision cycle: April 1 of target year until May 5 of target year
 * - Apply confidence factors to baseline hours
 * - Trim subtopics from D5 down to B1 if needed
 * - Returns undefined if no time for this cycle
 */
export async function planC5(
  logger: Logger,
  intake: StudentIntake,
  confidenceMap: Map<string, number>,
  startDate: dayjs.Dayjs | undefined,
  endDate: dayjs.Dayjs | undefined,
  subjData: SubjData
): Promise<StudyCycle | undefined> {
  const { logInfo: info, logDebug: debug } = logger;
  const { subjects } = subjData;
  info('Engine', 'Planning Prelims Revision cycle');

  // If no start date or end date, cycle is not included
  if (!startDate || !endDate) {
    info('Engine', 'Prelims revision cycle skipped: no valid start or end date');
    return undefined;
  }

  // Use the endDate parameter passed from the schedule, don't hardcode
  const cycleEndDate = dayjs(endDate);
  const durationWeeks = Math.ceil(cycleEndDate.diff(startDate, 'day') / 7);

  // Calculate total hours for prelims revision cycle (assuming 8 hours/day)
  const totalHours = durationWeeks * 7 * 8;

  debug('Engine', `Prelims revision cycle: ${durationWeeks} weeks, ${totalHours} total hours`);

  // Get subjects by exam focus (prelims only and both exams)
  const prelimsSubjects = subjects.filter(s =>
    s.examFocus === 'PrelimsOnly' || s.examFocus === 'BothExams'
  );

  // Create blocks for prelims subjects
  const blocks = await createBlocksForSubjects(
    intake,
    prelimsSubjects,
    totalHours,
    confidenceMap,
    'Prelims Revision',
    'C5',
    3,
    'Prelims Revision Cycle',
    startDate.format('YYYY-MM-DD'),
    cycleEndDate.format('YYYY-MM-DD'),
    subjData);

  const cycle: StudyCycle = {
    cycleId: `prelims-revision-${Date.now()}`,
    cycleType: 'C5',
    cycleIntensity: 'Intensive',
    cycleDuration: durationWeeks,
    cycleStartWeek: 1,
    cycleOrder: 3,
    cycleName: 'Prelims Revision Cycle',
    cycleBlocks: blocks,
    cycleDescription: 'Intensive revision phase for prelims preparation',
    cycleStartDate: startDate.format('YYYY-MM-DD'),
    cycleEndDate: cycleEndDate.format('YYYY-MM-DD')
  };

  info('Engine', `Created Prelims revision cycle with ${cycle.cycleBlocks.length} blocks`);

  return cycle;
}

