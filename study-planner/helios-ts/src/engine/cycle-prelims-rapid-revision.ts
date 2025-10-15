import { StudyCycle } from '../types/models';
import { StudentIntake } from '../types/models';
import { Logger } from '../types/Types';
import dayjs from 'dayjs';
import { SubjData } from '../types/Subjects';
import { createBlocksForSubjects } from './cycle-utils';

/**
 * Calculate Prelims Rapid Revision start date: May 6 of target year until prelims exam date
 * - If prep starts after May 6, then the Prelims Rapid Revision cycle is included with reduced time
 * - If prep starts after May 15, then the request plan generation is rejected
 */
export function calculatePrelimsRapidRevisionStartDate(
  logger: Logger,
  startDate: dayjs.Dayjs,
  prelimsRevisionStartDate: dayjs.Dayjs | undefined,
  targetYear?: string
): dayjs.Dayjs | undefined {
  const { logInfo: info, logDebug: debug } = logger;

  info('Engine', 'Calculating Prelims Rapid Revision start date');

  // Use provided target year or fall back to prelims revision start date
  const targetYearNum = targetYear ? parseInt(targetYear, 10) : prelimsRevisionStartDate?.year() || startDate.year() + 1;
  const maySixth = dayjs(`${targetYearNum}-05-06`);
  const mayFifteenth = dayjs(`${targetYearNum}-05-15`);

  debug('Engine', `Target year: ${targetYearNum}, Rapid revision period starts: ${maySixth.format('YYYY-MM-DD')}`);

  // If prep starts after May 15, reject plan generation
  if (startDate.isAfter(mayFifteenth)) {
    info('Engine', 'Plan generation rejected: start date is after May 15 of target year');
    throw new Error('Plan generation rejected: start date is after May 15 of target year');
  }

  // If prep starts after May 6 but before May 15, use start date (proportionate reduction)
  if (startDate.isAfter(maySixth) && startDate.isBefore(mayFifteenth)) {
    info('Engine', `Prelims rapid revision cycle starts on ${startDate.format('YYYY-MM-DD')} (proportionate reduction)`);
    return startDate;
  }

  // If prep starts before May 6, use May 6 as start date
  if (startDate.isBefore(maySixth)) {
    info('Engine', `Prelims rapid revision cycle starts on ${maySixth.format('YYYY-MM-DD')}`);
    return maySixth;
  }

  // If prep starts exactly on May 6, use that date
  info('Engine', `Prelims rapid revision cycle starts on ${startDate.format('YYYY-MM-DD')}`);
  return startDate;
}

/**
 * Plan Prelims Rapid Revision cycle: May 6 of target year until prelims exam date
 * - Apply confidence factors to baseline hours
 * - Trim subtopics from D5 down to B1 if needed
 * - Returns undefined if no time for this cycle
 */
export async function planPrelimsRapidRevisionCycle(
  logger: Logger,
  intake: StudentIntake,
  confidenceMap: Map<string, number>,
  startDate: dayjs.Dayjs | undefined,
  endDate: dayjs.Dayjs | undefined,
  subjData: SubjData
): Promise<StudyCycle | undefined> {
  const { logInfo: info, logDebug: debug } = logger;
  const { subjects } = subjData;
  info('Engine', 'Planning Prelims Rapid Revision cycle');

  // If no start date or end date, cycle is not included
  if (!startDate || !endDate) {
    info('Engine', 'Prelims rapid revision cycle skipped: no valid start or end date');
    return undefined;
  }

  // Use the endDate parameter passed from the schedule, don't hardcode
  const cycleEndDate = dayjs(endDate);
  const durationWeeks = Math.ceil(cycleEndDate.diff(startDate, 'day') / 7);

  // Calculate total hours for prelims rapid revision cycle (assuming 8 hours/day)
  const totalHours = durationWeeks * 7 * 8;

  debug('Engine', `Prelims rapid revision cycle: ${durationWeeks} weeks, ${totalHours} total hours`);

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
    'Prelims Rapid Revision',
    'C5.b',
    4,
    'Prelims Rapid Revision Cycle',
    startDate.format('YYYY-MM-DD'),
    cycleEndDate.format('YYYY-MM-DD'),
    subjData);

  const cycle: StudyCycle = {
    cycleId: `prelims-rapid-revision-${Date.now()}`,
    cycleType: 'C5.b',
    cycleIntensity: 'Intensive',
    cycleDuration: durationWeeks,
    cycleStartWeek: 1,
    cycleOrder: 4,
    cycleName: 'Prelims Rapid Revision Cycle',
    cycleBlocks: blocks,
    cycleDescription: 'Intensive rapid revision phase for prelims preparation',
    cycleStartDate: startDate.format('YYYY-MM-DD'),
    cycleEndDate: cycleEndDate.format('YYYY-MM-DD')
  };

  info('Engine', `Created Prelims rapid revision cycle with ${cycle.cycleBlocks.length} blocks`);

  return cycle;
}