import { StudyCycle } from '../types/models';
import { StudentIntake } from '../types/models';
import { Logger } from '../types/Types';
import dayjs from 'dayjs';
import { SubjData } from '../types/Subjects';
import { createBlocksForSubjects } from './cycle-utils';

/**
 * Plan C8 Mains Foundation cycle: Mains-focused foundation work for very late starts
 * - Used when start date is very late (Scenario S5: >15 days before Dec 31)
 * - Bridge to Prelims revision phase
 * - Focus on mains subjects but foundation-level approach
 * - 1.0, 0, 0 task ratio (study only like C1)
 * - Returns undefined if no time for this cycle
 */
export async function planC8(
  logger: Logger,
  // @ts-ignore
  intake: StudentIntake,
  confidenceMap: Map<string, number>,
  startDate: dayjs.Dayjs,
  endDate: dayjs.Dayjs,
  subjData: SubjData,
  allSubjects: any[]
): Promise<StudyCycle | undefined> {
  const { logInfo: info, logDebug: debug } = logger;
  info('Engine', 'Planning C8 Mains Foundation cycle');

  const durationWeeks = Math.ceil(endDate.diff(startDate, 'day') / 7);

  // Calculate total hours for C8 cycle (assuming 8 hours/day)
  const totalHours = durationWeeks * 7 * 8;

  // Filter subjects for mains-focused foundation work
  // C8 is a bridge cycle, so we focus on core mains subjects
  const mainsFoundationSubjects = allSubjects.filter(s =>
    s.examFocus === 'MainsOnly' || s.examFocus === 'BothExams'
  );

  debug('Engine', `C8 Mains Foundation subjects: ${mainsFoundationSubjects.map(s => s.subjectCode).join(', ')}`);

  debug('Engine', `C8 Mains Foundation cycle: ${durationWeeks} weeks, ${totalHours} total hours`);

  // Create blocks for mains foundation subjects using C8 cycle type
  const blocks = await createBlocksForSubjects(
    intake,
    mainsFoundationSubjects,
    totalHours,
    confidenceMap,
    'C8 Mains Foundation',
    'C8',
    8, // cycleOrder
    'C8 Mains Foundation Cycle',
    startDate.format('YYYY-MM-DD'),
    endDate.format('YYYY-MM-DD'),
    subjData
  );

  const cycle: StudyCycle = {
    cycleId: `c8-mains-foundation-${Date.now()}`,
    cycleType: 'C8',
    cycleIntensity: 'Intensive',
    cycleDuration: durationWeeks,
    cycleStartWeek: 1,
    cycleOrder: 8,
    cycleName: 'C8 Mains Foundation Cycle',
    cycleBlocks: blocks,
    cycleDescription: 'Mains-focused foundation work for very late starts, bridge to prelims preparation',
    cycleStartDate: startDate.format('YYYY-MM-DD'),
    cycleEndDate: endDate.format('YYYY-MM-DD')
  };

  info('Engine', `Created C8 Mains Foundation cycle with ${cycle.cycleBlocks.length} blocks`);

  return cycle;
}
