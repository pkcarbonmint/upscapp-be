import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import { Logger, ScenarioResult } from '../types/Types';
import { determineCycleSchedule as newDetermineCycleSchedule } from 'scheduler';

dayjs.extend(isBetween);

/**
 * Main function to determine cycle schedule based on start date and target year
 * This is now a wrapper around the new scheduler library
 */
export function determineCycleSchedule(
  // @ts-ignore
  logger: Logger,
  startDate: Date,
  targetYear: number,
  prelimsExamDate: Date, // Usually around May 28 of target year
  intake?: any // StudentIntake - optional for backward compatibility
): ScenarioResult {
  // Convert to the new scheduler library format
  const result = newDetermineCycleSchedule(startDate, targetYear, prelimsExamDate, intake);

  // Convert back to the old format for backward compatibility
  return {
    scenario: result.scenario as any,
    totalTimeAvailable: result.totalTimeAvailable,
    schedules: result.schedules.map((schedule: any) => ({
      cycleType: schedule.cycleType as any,
      startDate: schedule.startDate,
      endDate: schedule.endDate,
      priority: schedule.priority as any,
      durationMonths: Math.ceil(dayjs(schedule.endDate).diff(dayjs(schedule.startDate), 'month', true))
    }))
  };
}

