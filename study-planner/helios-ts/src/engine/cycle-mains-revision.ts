import { StudyCycle } from '../types/models';
import { StudentIntake } from '../types/models';
import { Logger } from '../types/Types';
import dayjs from 'dayjs';
import { SubjData } from '../types/Subjects';
import { createBlocksForSubjects } from './cycle-utils';

/**
 * Calculate Mains Rapid Revision start date: May 21 of target year until August 20 of target year
 * - If prep starts after Aug 1, then plan generation is rejected
 * - If prep starts after May 21 but before Aug 1, then the Mains RapidRevision cycle is included, 
 *   but hours are proportionately reduced
 */
export function calculateMainsRapidRevisionStartDate(
  logger: Logger,
  startDate: dayjs.Dayjs,
  prelimsRapidRevisionStartDate: dayjs.Dayjs | undefined,
  targetYear?: string
): dayjs.Dayjs | undefined {
  const { logInfo: info, logDebug: debug } = logger;

  info('Engine', 'Calculating Mains Rapid Revision start date');

  // Use provided target year or fall back to prelims rapid revision start date
  const targetYearNum = targetYear ? parseInt(targetYear, 10) : prelimsRapidRevisionStartDate?.year() || startDate.year() + 1;
  const mayTwentyFirst = dayjs(`${targetYearNum}-05-21`);
  const augustFirst = dayjs(`${targetYearNum}-08-01`);
  const augustTwentieth = dayjs(`${targetYearNum}-08-20`);

  debug('Engine', `Target year: ${targetYearNum}, Mains rapid revision period: ${mayTwentyFirst.format('YYYY-MM-DD')} to ${augustTwentieth.format('YYYY-MM-DD')}`);

  // If prep starts after Aug 1, reject plan generation
  if (startDate.isAfter(augustFirst)) {
    info('Engine', 'Plan generation rejected: start date is after Aug 1 of target year');
    throw new Error('Plan generation rejected: start date is after Aug 1 of target year');
  }

  // If prep starts after May 21 but before Aug 1, use start date (proportionate reduction)
  if (startDate.isAfter(mayTwentyFirst) && startDate.isBefore(augustFirst)) {
    info('Engine', `Mains rapid revision cycle starts on ${startDate.format('YYYY-MM-DD')} (proportionate reduction)`);
    return startDate;
  }

  // If prep starts before May 21, use May 21 as start date
  if (startDate.isBefore(mayTwentyFirst)) {
    info('Engine', `Mains rapid revision cycle starts on ${mayTwentyFirst.format('YYYY-MM-DD')}`);
    return mayTwentyFirst;
  }

  // If prep starts exactly on May 21, use that date
  info('Engine', `Mains rapid revision cycle starts on ${startDate.format('YYYY-MM-DD')}`);
  return startDate;
}

/**
 * Plan Mains Revision cycle: May 20 of target year until July 31 of target year
 * - Apply confidence factors to baseline hours
 * - Trim subtopics from D5 down to B1 if needed
 * - Returns undefined if no time for this cycle
 */
export async function planMainsRevisionCycle(
  logger: Logger,
  intake: StudentIntake,
  confidenceMap: Map<string, number>,
  startDate: dayjs.Dayjs,
  endDate: dayjs.Dayjs,
  subjData: SubjData
): Promise<StudyCycle | undefined> {
  const { logInfo: info, logDebug: debug } = logger;
  const { subjects } = subjData;
  info('Engine', 'Planning Mains Revision cycle (C6)');

  if (!intake.target_year) {
    throw new Error('no valid target year');
  }

  const durationWeeks = Math.ceil(endDate.diff(startDate, 'day') / 7);
  // Calculate total hours for mains revision cycle (assuming 8 hours/day)
  const totalHours = durationWeeks * 7 * 8;

  debug('Engine', `Mains revision cycle: ${durationWeeks} weeks, ${totalHours} total hours`);

  // Get subjects by exam focus (mains only and both exams)
  const mainsSubjects = subjects.filter(s =>
    s.examFocus === 'MainsOnly' || s.examFocus === 'BothExams'
  );

  // Create blocks for mains subjects
  const blocks = await createBlocksForSubjects(
    intake,
    mainsSubjects,
    totalHours,
    confidenceMap,
    'Mains Revision', 'C6',
    5,
    'Mains Revision Cycle',
    startDate.format('YYYY-MM-DD'),
    endDate.format('YYYY-MM-DD'),
    subjData);

  const cycle: StudyCycle = {
    cycleId: `mains-revision-${Date.now()}`,
    cycleType: 'C6',
    cycleIntensity: 'Intensive',
    cycleDuration: durationWeeks,
    cycleStartWeek: 1,
    cycleOrder: 5,
    cycleName: 'Mains Revision Cycle',
    cycleBlocks: blocks,
    cycleDescription: 'Intensive revision phase for mains preparation',
    cycleStartDate: startDate.format('YYYY-MM-DD'),
    cycleEndDate: endDate.format('YYYY-MM-DD')
  };

  info('Engine', `Created Mains revision cycle with ${cycle.cycleBlocks.length} blocks`);

  return cycle;
}
