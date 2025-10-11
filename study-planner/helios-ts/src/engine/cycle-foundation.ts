import { StudyCycle } from '../types/models';
import { StudentIntake } from '../types/models';
import { Logger, SubjectApproach } from '../types/Types';
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
  allSubjects: any[],
  subjectApproach: SubjectApproach
): Promise<StudyCycle | undefined> {
  const { logInfo: info, logDebug: debug } = logger;
  info('Engine', 'Planning Foundation cycle');

  const targetYear = parseInt(intake.target_year || '2026');
  const endDate = dayjs(`${targetYear - 1}-12-31`);

  // If prep starts after December 31st of the year before target year, no foundation cycle
  if (startDate.isAfter(endDate)) {
    info('Engine', 'Foundation cycle skipped: start date is after December 31st of the year before target year');
    return undefined;
  }

  const durationWeeks = Math.ceil(endDate.diff(startDate, 'day') / 7);

  // Calculate total hours for foundation cycle (assuming 8 hours/day)
  const totalHours = durationWeeks * 7 * 8;

  // Use all subjects for foundation cycle (with default confidence levels)
  const gsSubjects = allSubjects.filter(s => s.category === 'Macro');
  const optionalSubjects = allSubjects.filter(s => s.category === 'Micro');
  
  // Debug: Check Geography presence
  const geographyInGS = gsSubjects.filter(s => s.subjectCode === 'G');
  console.log(`🔍 DEBUG: Geography in GS subjects: ${geographyInGS.length} found`);
  console.log(`🔍 DEBUG: GS subjects count: ${gsSubjects.length}, Optional subjects count: ${optionalSubjects.length}`);
  
  // Calculate hours based on subject approach - use 6:3 ratio for GS:Optional
  const gsHours = Math.floor(totalHours * 0.67); // 6/9 = 0.67
  const optionalHours = Math.floor(totalHours * 0.33); // 3/9 = 0.33

  debug('Engine', `Foundation cycle: ${durationWeeks} weeks, ${totalHours} total hours (GS: ${gsHours}, Optional: ${optionalHours})`);
  // Apply confidence factors and create blocks
  const gsBlocks = await createBlocksForSubjects(
    gsSubjects, gsHours, confidenceMap, 'GS Foundation',
    'C2',
    1,
    'Foundation Cycle',
    startDate.format('YYYY-MM-DD'),
    endDate.format('YYYY-MM-DD'),
    subjData, subjectApproach);
  const optionalBlocks = await createBlocksForSubjects(optionalSubjects, optionalHours, confidenceMap, 'Optional Foundation', 'C2', 1, 'Foundation Cycle', startDate.format('YYYY-MM-DD'), endDate.format('YYYY-MM-DD'), subjData, subjectApproach);

  // Debug: Count Geography blocks
  const geographyBlocks = [...gsBlocks, ...optionalBlocks].filter(block => 
    block.subjects && block.subjects.includes('G')
  );
  const geographyTotalHours = geographyBlocks.reduce((sum, block) => 
    sum + (block.actual_hours || 0), 0
  );
  console.log(`🔍 DEBUG: Geography blocks created: ${geographyBlocks.length}`);
  console.log(`🔍 DEBUG: Geography total hours: ${geographyTotalHours}`);
  
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
