import { StudyCycle } from '../types/models';
import { StudentIntake } from '../types/models';
import { Logger } from '../types/Types';
import dayjs from 'dayjs';
import { SubjData } from '../types/Subjects';
import { createBlocksForSubjects } from './cycle-utils';

/**
 * Calculate Prelims Revision start date: Jan 1 of target year until 31 March of target year
 * - If prep starts after April 1 of target year, then the prelims revision cycle is not included
 * - If prep starts after Jan 1 but before March 31, then the prelims revision cycle is included, 
 *   but hours are proportionately reduced
 */
export function calculatePrelimsRevisionStartDate(
  logger: Logger,
  startDate: dayjs.Dayjs,
  foundationStartDate: dayjs.Dayjs,
  targetYear?: string
): dayjs.Dayjs | undefined {
  const { logInfo: info, logDebug: debug } = logger;
  
  info('Engine', 'Calculating Prelims Revision start date');
  
  // Use provided target year or fall back to foundation start date context
  const targetYearNum = targetYear ? parseInt(targetYear, 10) : foundationStartDate.year() + 1;
  const prelimsRevisionStart = dayjs(`${targetYearNum}-01-01`);
  const prelimsRevisionEnd = dayjs(`${targetYearNum}-03-31`);
  const aprilFirst = dayjs(`${targetYearNum}-04-01`);
  
  debug('Engine', `Target year: ${targetYearNum}, Prelims revision period: ${prelimsRevisionStart.format('YYYY-MM-DD')} to ${prelimsRevisionEnd.format('YYYY-MM-DD')}`);
  
  // If prep starts after April 1 of target year, no prelims revision cycle
  if (startDate.isAfter(aprilFirst)) {
    info('Engine', 'Prelims revision cycle skipped: start date is after April 1 of target year');
    return undefined;
  }
  
  // If prep starts after Jan 1 but before March 31, use start date (proportionate reduction)
  if (startDate.isAfter(prelimsRevisionStart) && startDate.isBefore(prelimsRevisionEnd)) {
    info('Engine', `Prelims revision cycle starts on ${startDate.format('YYYY-MM-DD')} (proportionate reduction)`);
    return startDate;
  }
  
  // If prep starts before Jan 1, use Jan 1 as start date
  if (startDate.isBefore(prelimsRevisionStart)) {
    info('Engine', `Prelims revision cycle starts on ${prelimsRevisionStart.format('YYYY-MM-DD')}`);
    return prelimsRevisionStart;
  }
  
  // If prep starts exactly on Jan 1, use that date
  info('Engine', `Prelims revision cycle starts on ${startDate.format('YYYY-MM-DD')}`);
  return startDate;
}

/**
 * Plan Prelims Revision cycle: Jan 1 of target year until 31 March of target year
 * - Apply confidence factors to baseline hours
 * - Trim subtopics from D5 down to B1 if needed
 * - Returns undefined if no time for this cycle
 */
export async function planPrelimsRevisionCycle(
  logger: Logger,
  intake: StudentIntake,
  confidenceMap: Map<string, number>,
  startDate: dayjs.Dayjs,
  endDate: dayjs.Dayjs,
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
  const blocks = await createBlocksForSubjects(intake,
    prelimsSubjects,
    totalHours,
    confidenceMap,
    'Prelims Revision',
    'C4',
    2, 
    'Prelims Revision Cycle',
    startDate.format('YYYY-MM-DD'),
    cycleEndDate.format('YYYY-MM-DD'),
    subjData);
  
  const cycle: StudyCycle = {
    cycleId: `prelims-revision-${Date.now()}`,
    cycleType: 'C4',
    cycleIntensity: 'Intensive',
    cycleDuration: durationWeeks,
    cycleStartWeek: 1,
    cycleOrder: 2,
    cycleName: 'Prelims Revision Cycle',
    cycleBlocks: blocks,
    cycleDescription: 'Intensive revision phase for prelims preparation',
    cycleStartDate: startDate.format('YYYY-MM-DD'),
    cycleEndDate: cycleEndDate.format('YYYY-MM-DD')
  };
  
  info('Engine', `Created Prelims revision cycle with ${cycle.cycleBlocks.length} blocks`);
  
  return cycle;
}

