import { planCycles, PlanningContext, ScenarioResult, CycleSchedule, CycleType } from 'helios-scheduler';
import dayjs from 'dayjs';

export interface CycleInfo {
  cycleType: CycleType;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  duration: number; // in days
}

export interface YearAnalysis {
  year: string;
  months: number;
  intensity: string;
  probability: string;
  scenario: string;
  cycles: CycleInfo[];
  totalTimeAvailable: number;
}

// Cycle type descriptions for display
const CYCLE_DESCRIPTIONS: Record<CycleType, { name: string; description: string }> = {
  [CycleType.C1]: {
    name: 'NCERT Foundation',
    description: 'Build fundamental concepts with NCERT books'
  },
  [CycleType.C2]: {
    name: 'Comprehensive Foundation',
    description: 'Deep dive into all subjects with standard books'
  },
  [CycleType.C3]: {
    name: 'Mains Revision Pre-Prelims',
    description: 'Focus on mains preparation before prelims'
  },
  [CycleType.C4]: {
    name: 'Prelims Reading',
    description: 'Comprehensive reading for prelims preparation'
  },
  [CycleType.C5]: {
    name: 'Prelims Revision',
    description: 'Intensive revision for prelims exam'
  },
  [CycleType.C5B]: {
    name: 'Prelims Rapid Revision',
    description: 'Final rapid revision before prelims'
  },
  [CycleType.C6]: {
    name: 'Mains Revision',
    description: 'Comprehensive preparation for mains exam'
  },
  [CycleType.C7]: {
    name: 'Mains Rapid Revision',
    description: 'Final intensive preparation for mains'
  },
  [CycleType.C8]: {
    name: 'Mains Foundation',
    description: 'Foundation preparation for mains exam'
  }
};

export function analyzeTargetYear(
  targetYear: string,
  startDate: Date = new Date()
): YearAnalysis {
  const year = parseInt(targetYear);
  const start = dayjs(startDate);
  
  // Default exam dates (can be made configurable)
  const prelimsExamDate = dayjs(`${year}-05-15`); // May 15th
  const mainsExamDate = dayjs(`${year}-09-15`); // September 15th
  
  // Create a basic planning context
  const context: PlanningContext = {
    optionalSubject: {
      subjectCode: 'HISTORY',
      subjectNname: 'History',
      examFocus: 'BothExams',
      topics: [],
      baselineMinutes: 0
    },
    startDate: start,
    targetYear: year,
    prelimsExamDate,
    mainsExamDate,
    constraints: {
      optionalSubjectCode: 'HISTORY',
      confidenceMap: {},
      optionalFirst: false,
      catchupDay: 6, // Saturday
      testDay: 0, // Sunday
      workingHoursPerDay: 8,
      breaks: [],
      testMinutes: 180
    },
    subjects: [],
    relativeAllocationWeights: {}
  };

  try {
    const result: ScenarioResult = planCycles(context);
    
    // Calculate months available
    const months = Math.round(prelimsExamDate.diff(start, 'month', true));
    
    // Determine intensity and probability based on scenario
    const { intensity, probability } = getIntensityAndProbability(result.scenario, months);
    
    // Convert cycles to display format
    const cycles: CycleInfo[] = result.schedules.map((schedule: CycleSchedule) => {
      const startDate = dayjs(schedule.startDate);
      const endDate = dayjs(schedule.endDate);
      const duration = endDate.diff(startDate, 'day');
      
      return {
        cycleType: schedule.cycleType,
        name: CYCLE_DESCRIPTIONS[schedule.cycleType].name,
        description: CYCLE_DESCRIPTIONS[schedule.cycleType].description,
        startDate: schedule.startDate,
        endDate: schedule.endDate,
        duration
      };
    });

    return {
      year: targetYear,
      months,
      intensity,
      probability,
      scenario: result.scenario,
      cycles,
      totalTimeAvailable: result.totalTimeAvailable
    };
  } catch (error) {
    console.error('Error planning cycles:', error);
    
    // Fallback analysis for error cases
    const months = Math.round(prelimsExamDate.diff(start, 'month', true));
    const { intensity, probability } = getIntensityAndProbability('S8', months);
    
    return {
      year: targetYear,
      months,
      intensity,
      probability,
      scenario: 'S8',
      cycles: [],
      totalTimeAvailable: months
    };
  }
}

function getIntensityAndProbability(scenario: string, _months: number): { intensity: string; probability: string } {
  switch (scenario) {
    case 'S1':
    case 'S2':
      return {
        intensity: 'Comfortable (4-6 hrs/day)',
        probability: '85%'
      };
    case 'S3':
      return {
        intensity: 'Moderate (6-8 hrs/day)',
        probability: '78%'
      };
    case 'S4':
    case 'S4A':
      return {
        intensity: 'High (8-10 hrs/day)',
        probability: '65%'
      };
    case 'S5':
      return {
        intensity: 'Very High (10+ hrs/day)',
        probability: '45%'
      };
    case 'S6':
      return {
        intensity: 'Extreme (12+ hrs/day)',
        probability: '25%'
      };
    case 'S7':
      return {
        intensity: 'Crash Course (12+ hrs/day)',
        probability: '15%'
      };
    case 'S8':
      return {
        intensity: 'Not Recommended',
        probability: '5%'
      };
    default:
      return {
        intensity: 'Unknown',
        probability: 'Unknown'
      };
  }
}

export function getScenarioDescription(scenario: string): string {
  switch (scenario) {
    case 'S1': return 'Long Preparation (≥20 months)';
    case 'S2': return 'Medium-Long Preparation (18-20 months)';
    case 'S3': return 'Medium Preparation (15-18 months)';
    case 'S4': return 'Medium-Short Preparation (12-15 months)';
    case 'S4A': return 'Medium-Short Preparation (7-12 months)';
    case 'S5': return 'Very Short Late Start (>15 days before Dec 31)';
    case 'S6': return 'Ultra-Short Preparation (Dec 16 - Jan 15)';
    case 'S7': return 'Crash Course Early (Mar 1 - Apr 15)';
    case 'S8': return 'Too Late (Apr 16 - May 15)';
    default: return 'Unknown Scenario';
  }
}