import { CycleIntensity, StudentIntake } from '../types/models';
import { CycleType, Logger } from '../types/Types';
import { Subject, SubjData } from '../types/Subjects';
import { Block } from '../types/models';
import dayjs from 'dayjs';
import { createBlocksForSubjects } from './cycle-utils';

export interface CycleConfig {
  cycleType: CycleType;
  cycleOrder: number;
  cycleName: string;
  cycleDescription: string;
  cycleIntensity: CycleIntensity;
  subjectFilter: (subjects: Subject[]) => Subject[];
  hoursCalculator: (durationWeeks: number, intake: StudentIntake) => number;
  validation?: (startDate: dayjs.Dayjs, endDate: dayjs.Dayjs, intake: StudentIntake) => boolean;
  blockCreator: (
    intake: StudentIntake,
    filteredSubjects: Subject[],
    totalHours: number,
    confidenceMap: Map<string, number>,
    config: CycleConfig,
    startDate: dayjs.Dayjs,
    endDate: dayjs.Dayjs,
    subjData: SubjData,
    logger: Logger
  ) => Promise<Block[]>;
}

// Block Creator Functions
async function blockCreator(
  intake: StudentIntake,
  filteredSubjects: Subject[],
  totalHours: number,
  confidenceMap: Map<string, number>,
  config: CycleConfig,
  startDate: dayjs.Dayjs,
  endDate: dayjs.Dayjs,
  subjData: SubjData,
  logger: Logger
): Promise<Block[]> {
  // Generate blockPrefix from cycleName (remove "Cycle" suffix if present)
  const blockPrefix = config.cycleName.replace(/\s+Cycle$/, '');
  
  return await createBlocksForSubjects(
    {
      intake,
      subjects: filteredSubjects,
      totalHours,
      confidenceMap,
      blockPrefix,
      cycleType: config.cycleType,
      cycleOrder: config.cycleOrder,
      cycleName: config.cycleName,
      cycleStartDate: startDate.format('YYYY-MM-DD'),
      cycleEndDate: endDate.format('YYYY-MM-DD'),
      subjData,
      logger
    }
  );
}


// Cycle Configuration Constants
const C1_CONFIG: CycleConfig = {
  cycleType: CycleType.C1,
  cycleOrder: 1,
  cycleName: 'NCERT Foundation Cycle',
  cycleDescription: 'NCERT-based foundation building phase focusing on basic concepts',
  cycleIntensity: CycleIntensity.Foundation,
  subjectFilter: (subjects) => subjects.filter(s => 
    s.examFocus === 'BothExams' // NCERT foundation subjects are relevant for both exams
  ),
  hoursCalculator: (durationWeeks, intake) => {
    const dailyHours = intake.getDailyStudyHours();
    return durationWeeks * 7 * dailyHours;
  },
  blockCreator
};

const C2_CONFIG: CycleConfig = {
  cycleType: CycleType.C2,
  cycleOrder: 1,
  cycleName: 'UPSC Foundation Cycle',
  cycleDescription: 'Foundation building phase with comprehensive subject coverage',
  cycleIntensity: CycleIntensity.Foundation,
  subjectFilter: (subjects) => subjects, // Uses all subjects, split later
  hoursCalculator: (durationWeeks, intake) => {
    const dailyHours = intake.getDailyStudyHours();
    return durationWeeks * 7 * dailyHours;
  },
  blockCreator,
  validation: (startDate, _endDate, intake) => {
    const foundationEndDate = dayjs(intake.getFoundationCycleEndDate());
    return !startDate.isAfter(foundationEndDate);
  }
};

const C3_CONFIG: CycleConfig = {
  cycleType: CycleType.C3,
  cycleOrder: 3,
  cycleName: 'Mains Foundation',
  cycleDescription: 'Mains-specific foundation building phase preparing for answer writing',
  cycleIntensity: CycleIntensity.Foundation,
  subjectFilter: (subjects) => subjects.filter(s =>
    s.examFocus === 'MainsOnly' || s.examFocus === 'BothExams'
  ),
  hoursCalculator: (durationWeeks, intake) => {
    const dailyHours = intake.getDailyStudyHours();
    return durationWeeks * 7 * dailyHours;
  },
  blockCreator
};

const C4_CONFIG: CycleConfig = {
  cycleType: CycleType.C4,
  cycleOrder: 2,
  cycleName: 'Prelims Reading Cycle',
  cycleDescription: 'Intensive reading phase for prelims preparation',
  cycleIntensity: CycleIntensity.Foundation,
  subjectFilter: (subjects) => subjects.filter(s => 
    s.examFocus === 'PrelimsOnly' || s.examFocus === 'BothExams'
  ),
  hoursCalculator: (durationWeeks, intake) => {
    const dailyHours = intake.getDailyStudyHours();
    return durationWeeks * 7 * dailyHours;
  },
  blockCreator
};

const C5_CONFIG: CycleConfig = {
  cycleType: CycleType.C5,
  cycleOrder: 3,
  cycleName: 'Prelims Revision Cycle',
  cycleDescription: 'Intensive revision phase for prelims preparation',
  cycleIntensity: CycleIntensity.Revision,
  subjectFilter: (subjects) => subjects.filter(s =>
    s.examFocus === 'PrelimsOnly' || s.examFocus === 'BothExams'
  ),
  hoursCalculator: (durationWeeks, intake) => {
    const dailyHours = intake.getDailyStudyHours();
    return durationWeeks * 7 * dailyHours;
  },
  blockCreator
};

const C5B_CONFIG: CycleConfig = {
  cycleType: CycleType.C5B,
  cycleOrder: 4,
  cycleName: 'Prelims Rapid Revision Cycle',
  cycleDescription: 'Intensive rapid revision phase for prelims preparation',
  cycleIntensity: CycleIntensity.PreExam,
  subjectFilter: (subjects) => subjects.filter(s =>
    s.examFocus === 'PrelimsOnly' || s.examFocus === 'BothExams'
  ),
  hoursCalculator: (durationWeeks, intake) => {
    const dailyHours = intake.getDailyStudyHours();
    return durationWeeks * 7 * dailyHours;
  },
  blockCreator
};

const C6_CONFIG: CycleConfig = {
  cycleType: CycleType.C6,
  cycleOrder: 5,
  cycleName: 'Mains Revision Cycle',
  cycleDescription: 'Intensive revision phase for mains preparation',
  cycleIntensity: CycleIntensity.Revision,
  subjectFilter: (subjects) => subjects.filter(s =>
    s.examFocus === 'MainsOnly' || s.examFocus === 'BothExams'
  ),
  hoursCalculator: (durationWeeks, intake) => {
    const dailyHours = intake.getDailyStudyHours();
    return durationWeeks * 7 * dailyHours;
  },
  blockCreator
};

const C7_CONFIG: CycleConfig = {
  cycleType: CycleType.C7,
  cycleOrder: 4,
  cycleName: 'Mains Rapid Revision Cycle',
  cycleDescription: 'Intensive rapid revision phase for mains preparation',
  cycleIntensity: CycleIntensity.PreExam,
  subjectFilter: (subjects) => subjects.filter(s =>
    s.examFocus === 'MainsOnly' || s.examFocus === 'BothExams'
  ),
  hoursCalculator: (durationWeeks, intake) => {
    const dailyHours = intake.getDailyStudyHours();
    return durationWeeks * 7 * dailyHours;
  },
  blockCreator
};

const C8_CONFIG: CycleConfig = {
  cycleType: CycleType.C8,
  cycleOrder: 8,
  cycleName: 'Mains Foundation (C8) Cycle',
  cycleDescription: 'Mains-focused foundation work for very late starts, bridge to prelims preparation',
  cycleIntensity: CycleIntensity.Foundation,
  subjectFilter: (subjects) => subjects.filter(s =>
    s.examFocus === 'MainsOnly' || s.examFocus === 'BothExams'
  ),
  hoursCalculator: (durationWeeks, intake) => {
    const dailyHours = intake.getDailyStudyHours();
    return durationWeeks * 7 * dailyHours;
  },
  blockCreator
};

export function getCycleConfig(cycleType: CycleType): CycleConfig {
  switch (cycleType) {
    case CycleType.C1:
      return C1_CONFIG;
    case CycleType.C2:
      return C2_CONFIG;
    case CycleType.C3:
      return C3_CONFIG;
    case CycleType.C4:
      return C4_CONFIG;
    case CycleType.C5:
      return C5_CONFIG;
    case CycleType.C5B:
      return C5B_CONFIG;
    case CycleType.C6:
      return C6_CONFIG;
    case CycleType.C7:
      return C7_CONFIG;
    case CycleType.C8:
      return C8_CONFIG;
    default:
      throw new Error(`Unknown cycle type: ${cycleType}`);
  }
}