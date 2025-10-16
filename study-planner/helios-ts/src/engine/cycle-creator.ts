import { StudyCycle } from '../types/models';
import { StudentIntake } from '../types/models';
import { Logger } from '../types/Types';
import { SubjData } from '../types/Subjects';
import { getCycleConfig } from './cycle-config';
import { CycleType } from '../types/Types';
import dayjs from 'dayjs';

export async function createStudyCycle(
  logger: Logger,
  intake: StudentIntake,
  confidenceMap: Map<string, number>,
  startDate: dayjs.Dayjs,
  endDate: dayjs.Dayjs,
  subjData: SubjData,
  cycleType: CycleType
): Promise<StudyCycle> {
  const config = getCycleConfig(cycleType);
  const { logInfo: info, logDebug: debug } = logger;
  info('Engine', `Planning ${config.cycleName}`);

  // Validation check
  if (config.validation && !config.validation(startDate, endDate, intake)) {
    info('Engine', `${config.cycleName} skipped: validation failed`);
    return Promise.reject(new Error(`${config.cycleName} skipped: validation failed`));
  }

  const durationWeeks = Math.ceil(endDate.diff(startDate, 'day') / 7);
  const totalHours = config.hoursCalculator(durationWeeks, intake);
  
  // Use subjData.subjects as the canonical source
  const filteredSubjects = config.subjectFilter(subjData.subjects);

  debug('Engine', `${config.cycleName}: ${durationWeeks} weeks, ${totalHours} total hours`);
  debug('Engine', `${config.cycleName} subjects: ${filteredSubjects.map(s => s.subjectCode).join(', ')}`);

  // Use the configured block creator function
  const blocks = await config.blockCreator(
    intake, filteredSubjects, totalHours, confidenceMap, config,
    startDate, endDate, subjData,
    logger
  );

  const cycle: StudyCycle = {
    cycleId: `${config.cycleType.toLowerCase()}-${Date.now()}`,
    cycleType: config.cycleType,
    cycleIntensity: config.cycleIntensity,
    cycleDuration: durationWeeks,
    cycleOrder: config.cycleOrder,
    cycleName: config.cycleName,
    cycleBlocks: blocks,
    cycleDescription: config.cycleDescription,
    cycleStartDate: startDate.format('YYYY-MM-DD'),
    cycleEndDate: endDate.format('YYYY-MM-DD')
  };

  info('Engine', `Created ${config.cycleName} with ${cycle.cycleBlocks.length} blocks`);
  return cycle;
}
