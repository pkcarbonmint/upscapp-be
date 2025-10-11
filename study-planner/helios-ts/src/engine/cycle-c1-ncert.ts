import { StudyCycle } from '../types/models';
import { StudentIntake } from '../types/models';
import { Logger } from '../types/Types';
import dayjs from 'dayjs';
import { SubjData } from '../types/Subjects';
import { createBlocksForSubjects } from './cycle-utils';

/**
 * Plan C1 NCERT Foundation cycle: Pure NCERT-based preparation
 * - Focus on NCERT-based subjects only for basic foundation building
 * - Simplied task structure focusing purely on study
 * - 1.0, 0, 0 task ratio (study only)
 * - Returns undefined if prep starts too late
 */
export async function planC1Cycle(
  logger: Logger,
  //@ts-ignore
  intake: StudentIntake,
  confidenceMap: Map<string, number>,
  startDate: dayjs.Dayjs,
  endDate: dayjs.Dayjs,
  subjData: SubjData,
  allSubjects: any[]
): Promise<StudyCycle | undefined> {
  const { logInfo: info, logDebug: debug } = logger;
  info('Engine', 'Planning C1 NCERT Foundation cycle');

  const durationWeeks = Math.ceil(endDate.diff(startDate, 'day') / 7);

  // Calculate total hours for C1 cycle (assuming 8 hours/day)
  const totalHours = durationWeeks * 7 * 8;

  // Filter subjects for NCERT-based ones only
  // NCERT Foundation focuses on basic subjects typically covered in NCERT books
  const ncertSubjects = allSubjects.filter(s => 
    s.category === 'Macro' || 
    (s.category === 'Micro' && s.subjectCode === 'H01') // History NCERT
  );

  // Debug: Log NCERT subject selection
  debug('Engine', `C1 NCERT subjects: ${ncertSubjects.map(s => s.subjectCode).join(', ')}`);

  debug('Engine', `C1 NCERT Foundation cycle: ${durationWeeks} weeks, ${totalHours} total hours`);

  // Create blocks for NCERT subjects using C1 cycle type
  const blocks = await createBlocksForSubjects(
    intake,
    ncertSubjects, 
    totalHours, 
    confidenceMap, 
    'C1 NCERT Foundation',
    'C1',
    1, // cycleOrder
    'C1 NCERT Foundation Cycle',
    startDate.format('YYYY-MM-DD'),
    endDate.format('YYYY-MM-DD'),
    subjData
  );

  const cycle: StudyCycle = {
    cycleId: `c1-ncert-foundation-${Date.now()}`,
    cycleType: 'C1',
    cycleIntensity: 'Moderate',
    cycleDuration: durationWeeks,
    cycleStartWeek: 1,
    cycleOrder: 1,
    cycleName: 'NCERT Foundation Cycle',
    cycleBlocks: blocks,
    cycleDescription: 'NCERT-based foundation building phase focusing on basic concepts',
    cycleStartDate: startDate.format('YYYY-MM-DD'),
    cycleEndDate: endDate.format('YYYY-MM-DD')
  };

  info('Engine', `Created C1 NCERT Foundation cycle with ${cycle.cycleBlocks.length} blocks`);

  return cycle;
}
