import { describe, it, expect, beforeEach } from 'vitest';
import { ConfidenceLevel, ConfidenceMap, CycleSchedule, CycleType, DailyHourLimitsInput, DayOfWeek, DayPreferences, determineBlockSchedule } from 'scheduler';
import { StudentIntake, createStudentIntake } from '../types/models';
import { SubjectLoader } from '../services/SubjectLoader';
import { convertToSchedulerCycleType, convertToSchedulerStudyApproach } from '../engine/cycle-utils';
import dayjs from 'dayjs';
import type { Logger } from '../types/Types';

// @ts-ignore
function makeDummyLogger(): Logger {
  return {
    logInfo: (message: string) => console.log(message),
    logWarn: (message: string) => console.warn(message),
    logDebug: (message: string) => console.debug(message),
    getLogs: () => [],
    clear: () => { }
  };
}

describe('CycleSchedulerScenarios', () => {

  beforeEach(() => {
  });

  describe('scheduler block Tests', () => {
    it('should generate a block schedule for cycle C1 in T1 scenario', () => {
      const intake = makeT1Intake();
      const subjects = SubjectLoader.loadAllSubjects();
      const cycleType = CycleType.C1;

      const c1 = convertToSchedulerCycleType(cycleType);

      // Create cycle schedule for the scheduler library
      const cycleSchedule: CycleSchedule = {
        cycleType: c1,
        startDate: "2025-03-01",
        endDate: "2025-05-31",
        priority: 'mandatory'
      };

      const workingHoursPerDay = intake.getDailyStudyHours();
      const totalHours = dayjs("2025-05-31").diff(dayjs("2025-03-01"), "day") * workingHoursPerDay;
      const gsOptionalRatio = intake.getGSOptionalRatio ? intake.getGSOptionalRatio() : { gs: 0.67, optional: 0.33 };
      const studyApproach = convertToSchedulerStudyApproach(intake.subject_approach);
      const dailyHourLimits: DailyHourLimitsInput = {
        regular_day: intake.getDailyStudyHours(),
        test_day: intake.getDailyStudyHours()
      };
      const dayPreferences: DayPreferences = {
        testDay: DayOfWeek.SUNDAY,
        catchupDay: DayOfWeek.SATURDAY
      };
      const blockScheduleResult = determineBlockSchedule(
        cycleSchedule,
        subjects,
        convertToSchedulerConfidenceMap(intake.subject_confidence),
        totalHours,
        studyApproach,
        workingHoursPerDay,
        gsOptionalRatio,
        dailyHourLimits,
        dayPreferences
      );
      const { blockSchedules } = blockScheduleResult;
      const endDates = blockSchedules.map((block) => ({ subject: block.subjectCode, endDate: block.endDate }));
      console.log('-~'.repeat(20), { endDates });
      expect(blockSchedules).toBeDefined();
      // verify that some one or more blocks extend all the way until the last date of the cycle
      const lastDateOfCycle = dayjs(cycleSchedule.endDate);
      const blocksThatExtendUntilLastDate = blockSchedules.filter((block) => dayjs(block.endDate).isSame(lastDateOfCycle, 'day'));
      expect(blocksThatExtendUntilLastDate.length, `Expected at least one block to extend until the last date of the cycle`).toBeGreaterThan(0);
    });
  })
});

function convertToSchedulerConfidenceMap(confidenceMap: Record<string, ConfidenceLevel>): ConfidenceMap {
  const mapped: [string, number][] = Object.entries(confidenceMap)
    .map(([subjectCode, confidenceLevel]) => [subjectCode, confidenceLevelToNumber(confidenceLevel)]);

  const newMap: ConfidenceMap = new Map(mapped);
  return newMap;
}

function confidenceLevelToNumber(confidenceLevel: ConfidenceLevel): number {
  switch (confidenceLevel) {
    case 'VeryWeak': return 1;
    case 'Weak': return 2;
    case 'Moderate': return 3;
    case 'Strong': return 4;
    case 'VeryStrong': return 5;
    default: return 3;
  }
}
function makeT1Intake(): StudentIntake {
  const testCase = { startDate: new Date('2025-03-01'), targetYear: 2027, };
  const intake: StudentIntake = createStudentIntake({
    preparation_background: {
      preparing_since: '6 months',
      number_of_attempts: '0', // Required - including "0" for freshers
      highest_stage_per_attempt: 'N/A', // Required - "N/A" for freshers
    },
    personal_details: {
      full_name: 'Swati Mutyam',
      email: 'swati.mutyam@gmail.com',
      phone_number: '+91-9876543210',
      present_location: 'Hyderabad',
      student_archetype: 'General',
      graduation_stream: 'Commerce',
      college_university: 'Hyderabad University',
      year_of_passing: 2023
    },
    optional_subject: {
      optional_status: 'Not Taken',
      optional_taken_from: 'N/A',
      optional_subject_name: 'N/A'
    },
    subject_approach: 'DualSubject',
    start_date: testCase.startDate.toISOString().split('T')[0],
    target_year: testCase.targetYear.toString(),
    study_strategy: {
      study_focus_combo: 'GSPlusOptionalPlusCSAT',
      weekly_study_hours: '45-55',
      time_distribution: 'Balanced',
      study_approach: 'Balanced',
      revision_strategy: 'Weekly',
      test_frequency: 'Weekly',
      seasonal_windows: ['Foundation', 'Revision', 'Intensive'],
      upsc_optional_subject: 'OPT-AGR',
      catch_up_day_preference: 'Sunday'
    },
    subject_confidence: {
      'H01': 'VeryStrong',
      'H02': 'VeryStrong',
      'H03': 'VeryStrong',
      'H04': 'VeryStrong',
      'H05': 'VeryStrong',
      'G': 'VeryStrong',
      'B': 'Moderate',
      'T': 'Weak',
      'P': 'Moderate',
      'E': 'Moderate'
    }
  })
  return intake;
}

