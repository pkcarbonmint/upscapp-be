import { StudyCycle } from '../types/models';
import { StudentIntake } from '../types/models';
import { Logger } from '../types/Types';
import dayjs from 'dayjs';
import { SubjData } from '../types/Subjects';
import { createBlocksForSubjects } from './cycle-utils';

/**
 * Plan C3 Mains Revision Pre-Prelims cycle: Mains-specific preparation setup
 * - Focus on mains-only subjects and topics
 * - Prepare for mains-style answer writing skills
 * - 1.0, 0, 0 task ratio (study only - building mains knowledge base)
 * - Returns undefined if no time for this cycle
 */
export async function planC3Cycle(
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
  info('Engine', 'Planning C3 Mains Revision Pre-Prelims Cycle');

  const durationWeeks = Math.ceil(endDate.diff(startDate, 'day') / 7);

  // Calculate total hours for C3 cycle (assuming 8 hours/day)
  const totalHours = durationWeeks * 7 * 8;

  // Filter subjects for mains-only and both exams focus
  const mainsSubjects = allSubjects.filter(s =>
    s.examFocus === 'MainsOnly' || s.examFocus === 'BothExams'
  );

  debug('Engine', `C3 Mains Revision Pre-Prelims Cycle subjects: ${mainsSubjects.map(s => s.subjectCode).join(', ')}`);

  debug('Engine', `C3 Mains Revision Pre-Prelims Cycle cycle: ${durationWeeks} weeks, ${totalHours} total hours`);

  // Create blocks for mains subjects using C3 cycle type
  const blocks = await createBlocksForSubjects(
    intake,
    mainsSubjects,
    totalHours,
    confidenceMap,
    'Mains Revision Pre-Prelims',
    'C3',
    3, // cycleOrder
    'Mains Revision Pre-Prelims Cycle',
    startDate.format('YYYY-MM-DD'),
    endDate.format('YYYY-MM-DD'),
    subjData
  );

  const cycle: StudyCycle = {
    cycleId: `c3-mains-prefoundation-${Date.now()}`,
    cycleType: 'C3',
    cycleIntensity: 'Moderate',
    cycleDuration: durationWeeks,
    cycleStartWeek: 1,
    cycleOrder: 3,
    cycleName: 'Mains Revision Pre-Prelims Cycle',
    cycleBlocks: blocks,
    cycleDescription: 'Mains-specific foundation building phase preparing for answer writing',
    cycleStartDate: startDate.format('YYYY-MM-DD'),
    cycleEndDate: endDate.format('YYYY-MM-DD')
  };

  info('Engine', `Created C3 Mains Revision Pre-Prelims Cycle with ${cycle.cycleBlocks.length} blocks`);

  return cycle;
}
