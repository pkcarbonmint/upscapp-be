import { StudyCycle } from '../types/models';
import { StudentIntake } from '../types/models';
import { Logger } from '../types/Types';
import dayjs from 'dayjs';
import { SubjData } from '../types/Subjects';
import { createBlocksForSubjects } from './cycle-utils';

/**
* Plan Foundation cycle: start date until December 31st of the year before target year
* - GS:Optional hours ratio is 6:3
* - Apply confidence factors to baseline hours
* - Trim subtopics from D5 down to B1 if needed
* - Returns undefined if prep starts after December 31st of the year before target year
*/
export async function planFoundationCycle(
  logger: Logger,
  intake: StudentIntake,
  confidenceMap: Map<string, number>,
  startDate: dayjs.Dayjs,
  subjData: SubjData,
  allSubjects: any[]
): Promise<StudyCycle | undefined> {
  const { logInfo: info, logDebug: debug } = logger;
  info('Engine', 'Planning Foundation cycle');

  const endDate = dayjs(intake.getFoundationCycleEndDate());

  // If prep starts after December 31st of the year before target year, no foundation cycle
  if (startDate.isAfter(endDate)) {
    info('Engine', 'Foundation cycle skipped: start date is after December 31st of the year before target year');
    return undefined;
  }

  const durationWeeks = Math.ceil(endDate.diff(startDate, 'day') / 7);

  // Calculate total hours for foundation cycle
  const dailyHours = intake.getDailyStudyHours();
  const totalHours = durationWeeks * 7 * dailyHours;

  // Use all subjects for foundation cycle (with default confidence levels)
  const gsSubjects = allSubjects.filter(s => s.category === 'Macro');
  const optionalSubjects = allSubjects.filter(s => s.category === 'Micro');
  
  // Calculate hours based on subject approach
  const ratio = intake.getGSOptionalRatio();
  const gsHours = Math.floor(totalHours * ratio.gs);
  const optionalHours = Math.floor(totalHours * ratio.optional);

  debug('Engine', `Foundation cycle: ${durationWeeks} weeks, ${totalHours} total hours (GS: ${gsHours}, Optional: ${optionalHours})`);
  // Apply confidence factors and create blocks
  const gsBlocks = await createBlocksForSubjects(
    intake,
    gsSubjects, gsHours, confidenceMap, 'GS Foundation',
    'C2',
    1,
    'Foundation Cycle',
    startDate.format('YYYY-MM-DD'),
    endDate.format('YYYY-MM-DD'),
    subjData);
  const optionalBlocks = await createBlocksForSubjects(
    intake,
    optionalSubjects, optionalHours, confidenceMap, 'Optional Foundation', 'C2', 1,
    'Foundation Cycle',
    startDate.format('YYYY-MM-DD'),
    endDate.format('YYYY-MM-DD'),
    subjData);

  
  const cycle: StudyCycle = {
    cycleId: `foundation-${Date.now()}`,
    cycleType: 'C2',
    cycleIntensity: 'Moderate',
    cycleDuration: durationWeeks,
    cycleStartWeek: 1,
    cycleOrder: 1,
    cycleName: 'Foundation Cycle',
    cycleBlocks: [...gsBlocks, ...optionalBlocks],
    cycleDescription: 'Foundation building phase with comprehensive subject coverage',
    cycleStartDate: startDate.format('YYYY-MM-DD'),
    cycleEndDate: endDate.format('YYYY-MM-DD')
  };

  info('Engine', `Created Foundation cycle with ${cycle.cycleBlocks.length} blocks`);

  return cycle;
}
