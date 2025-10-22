import { StudyPlan, Archetype, CycleIntensity } from '../types/models';
import { StudentIntake } from '../types/models';
import { Logger, LogEntry } from '../types/Types';
import { Config } from './engine-types';
import { makeLogger } from '../services/Log';
import dayjs from 'dayjs';
import { loadAllSubjects } from '../services/SubjectLoader';
import { getOptionalSubjectByCode } from '../config';
import { planMain, CycleType } from 'scheduler2';
import type { PlanningContext, S2Subject,  S2ExamFocus } from 'scheduler2';
import { S2WeekDay } from 'scheduler2';
import crypto from 'crypto';

/**
 * Generate an initial study plan for a student using scheduler2.
   */
  export async function generateInitialPlan(
  userId: string,
  _config: Config,
  _archetypeDetails: Archetype,
  intake: StudentIntake,
  logger0?: Logger
): Promise<{ plan: StudyPlan; logs: LogEntry[] }> {
  const logs: LogEntry[] = [];
  const logger = logger0 || makeLogger(logs);
  const { logInfo: info, } = logger;

  info('Engine', `Starting initial plan generation using scheduler2. User: ${userId}`);
  const startDate = intake.start_date;
  
  // Load the student's optional subject first
  const studentOptionalSubject = await getOptionalSubjectByCode(intake.study_strategy.upsc_optional_subject);
  if (!studentOptionalSubject) {
    throw new Error(`Optional subject ${intake.study_strategy.upsc_optional_subject} not found`);
  }
  
  // Load all subjects including the selected optional subject
  const subjects = [
    studentOptionalSubject,
    ...await loadAllSubjects(intake.study_strategy.upsc_optional_subject)
  ];
  
  const targetYear = intake.getTargetYear();
  const prelimsExamDate = intake.getPrelimsExamDate();
  const mainsExamDate = intake.getMainsExamDate();
  
  logger.logInfo('Engine', `Using start_date: ${startDate} (from intake.start_date: ${intake.start_date})`);

  try {
    // Convert subjects to S2Subject format
    const s2Subjects: S2Subject[] = subjects.map(subject => ({
      subjectCode: subject.subjectCode,
      subjectNname: subject.subjectName,
      examFocus: mapSubjectToExamFocus(subject.subjectCode, intake.study_strategy.upsc_optional_subject),
      baselineMinutes: subject.baselineHours * 60, // Convert hours to minutes
      topics: subject.topics.map(topic => ({
        code: topic.topicCode,
        subtopics: (topic.subtopics || []).map(subtopic => ({
          code: subtopic.code,
          name: subtopic.name,
          isEssential: topic.priority === 'EssentialTopic',
          priorityLevel: topic.priority === 'EssentialTopic' ? 1 : 2
        })),
        baselineMinutes: undefined // Will be calculated by planSubjectTasks
      }))
    }));

    const s2OptionalSubject: S2Subject = {
      subjectCode: studentOptionalSubject.subjectCode,
      subjectNname: studentOptionalSubject.subjectName,
      examFocus: 'MainsOnly', // Optional subjects are typically for Mains
      baselineMinutes: studentOptionalSubject.baselineHours * 60,
      topics: studentOptionalSubject.topics.map(topic => ({
        code: topic.topicCode,
        subtopics: (topic.subtopics || []).map(subtopic => ({
          code: subtopic.code,
          name: subtopic.name,
          isEssential: topic.priority === 'EssentialTopic',
          priorityLevel: topic.priority === 'EssentialTopic' ? 1 : 2
        })),
        baselineMinutes: undefined // Will be calculated by planSubjectTasks
      }))
    };

    // Create confidence map
    const confidenceMap: Record<string, number> = {};
    Object.entries(intake.subject_confidence).forEach(([subjectCode, confidence]) => {
      confidenceMap[subjectCode] = mapConfidenceToNumber(confidence);
    });

    // Calculate relative allocation weights based on baseline hours and confidence
    const relativeAllocationWeights: Record<string, number> = {};
    subjects.forEach(subject => {
      const confidence = confidenceMap[subject.subjectCode] || 1.0;
      relativeAllocationWeights[subject.subjectCode] = subject.baselineHours * confidence;
    });

    // Create PlanningContext
    const context: PlanningContext = {
      optionalSubject: s2OptionalSubject,
      startDate: dayjs(startDate),
      targetYear,
      prelimsExamDate: dayjs(prelimsExamDate),
      mainsExamDate: dayjs(mainsExamDate),
      constraints: {
        optionalSubjectCode: intake.study_strategy.upsc_optional_subject,
        confidenceMap,
        optionalFirst: false, // TODO: Determine based on study strategy
        catchupDay: mapDayToS2WeekDay(intake.study_strategy.catch_up_day_preference),
        testDay: S2WeekDay.Sunday, // Default test day
        workingHoursPerDay: intake.getDailyStudyHours(),
        breaks: [],
        testMinutes: 180 // 3 hours for tests
      },
      subjects: s2Subjects,
      relativeAllocationWeights
    };
    // Call scheduler2 planMain function
    logger.logInfo('Engine', 'Calling scheduler2 planMain function...');
    
    const result = planMain(context);
    
    logger.logInfo('Engine', `Generated ${result.cycles.length} cycles, ${result.blocks.length} blocks, ${result.tasks.length} tasks`);

    // Map result to StudyPlan
    const plan = await mapScheduler2ResultToStudyPlan(result, intake, userId, logger);
    
    return { plan, logs: logger.getLogs() };
  } catch (error) {
    logger.logWarn('Engine', `Plan generation rejected: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return Promise.reject(error);
  }
}

// Helper functions for mapping between data structures

function mapSubjectToExamFocus(subjectCode: string, optionalSubjectCode: string): S2ExamFocus {
  if (subjectCode === optionalSubjectCode) {
    return 'MainsOnly';
  }
  
  // GS subjects are typically for both exams
  if (subjectCode.startsWith('H') || subjectCode === 'G' || subjectCode === 'B' || 
      subjectCode === 'T' || subjectCode === 'P' || subjectCode === 'E') {
    return 'BothExams';
  }
  
  return 'BothExams'; // Default
}

function mapConfidenceToNumber(confidence: string): number {
  switch (confidence) {
    case 'VeryStrong': return 0.7;
    case 'Strong': return 0.8;
    case 'Moderate': return 1.0;
    case 'Weak': return 1.2;
    case 'VeryWeak': return 1.3;
    default: return 1.0;
  }
}

function mapDayToS2WeekDay(dayPreference: string): S2WeekDay {
  switch (dayPreference) {
    case 'Sunday': return S2WeekDay.Sunday;
    case 'Monday': return S2WeekDay.Monday;
    case 'Tuesday': return S2WeekDay.Tuesday;
    case 'Wednesday': return S2WeekDay.Wednesday;
    case 'Thursday': return S2WeekDay.Thursday;
    case 'Friday': return S2WeekDay.Friday;
    case 'Saturday': return S2WeekDay.Saturday;
    default: return S2WeekDay.Sunday;
  }
}

function mapCycleTypeToIntensity(cycleType: CycleType): CycleIntensity {
  switch (cycleType) {
    case 'C1':
    case 'C2':
    case 'C8':
      return CycleIntensity.Foundation;
    case 'C3':
    case 'C6':
    case 'C7':
      return CycleIntensity.Revision;
    case 'C4':
    case 'C5':
    case 'C5.b':
      return CycleIntensity.Rapid;
    default:
      return CycleIntensity.Foundation;
  }
}

async function mapScheduler2ResultToStudyPlan(
  result: { cycles: any[], blocks: any[], tasks: any[] },
  intake: StudentIntake,
  userId: string,
  logger: Logger
): Promise<StudyPlan> {
  // Create basic StudyPlan structure
  const plan: StudyPlan = {
    targeted_year: intake.getTargetYear(),
    start_date: new Date(intake.start_date),
    study_plan_id: crypto.randomUUID(),
    user_id: userId,
    plan_title: `Study Plan for ${intake.getTargetYear()}`,
    curated_resources: {
      essential_resources: [],
      recommended_timeline: {
        immediate_needs: [],
        mid_term_needs: [],
        long_term_needs: []
      },
      budget_summary: {
        total_cost: 0,
        essential_cost: 0,
        optional_cost: 0,
        free_alternatives: 0,
        subscription_cost: 0
      },
      alternative_options: []
    },
    cycles: [],
    scenario: 'S1' // TODO: Determine from scheduler2 result
  };

  // Map cycles from scheduler2 result
  if (result.cycles && result.cycles.length > 0) {
    logger.logInfo('Engine', `Mapping ${result.cycles.length} cycles from scheduler2 result`);
    
    plan.cycles = result.cycles.map((cycle, index) => {
      // Get blocks for this cycle
      const cycleBlocks = result.blocks.filter(block => block.cycleType === cycle.cycleType);
      
      // Map blocks to the expected Block format
      const mappedBlocks = cycleBlocks.map((block, blockIndex) => ({
        block_id: `${cycle.cycleType}-${block.subject.subjectCode}-${blockIndex}`,
        block_title: `${block.subject.subjectNname}`,
        cycle_type: cycle.cycleType,
        cycle_order: index + 1,
        cycle_name: `${cycle.cycleType} Cycle`,
        subjects: [block.subject.subjectCode],
        duration_weeks: Math.ceil(block.to.diff(block.from, 'day') / 7),
        weekly_plan: [], // TODO: Map from result.tasks
        block_resources: {
          primary_books: [],
          supplementary_materials: [],
          practice_resources: [],
          video_content: [],
          current_affairs_sources: [],
          revision_materials: [],
          expert_recommendations: []
        },
        block_start_date: block.from.format('YYYY-MM-DD'),
        block_end_date: block.to.format('YYYY-MM-DD'),
        block_description: `${cycle.cycleType} block for ${block.subject.subjectNname}`,
        estimated_hours: block.to.diff(block.from, 'hours'),
        actual_hours: block.to.diff(block.from, 'hours')
      }));
      
      return {
        cycleId: crypto.randomUUID(),
        cycleType: cycle.cycleType,
        cycleIntensity: mapCycleTypeToIntensity(cycle.cycleType),
        cycleDuration: Math.ceil(dayjs(cycle.endDate).diff(dayjs(cycle.startDate), 'day') / 7),
        cycleStartWeek: Math.ceil(dayjs(cycle.startDate).diff(dayjs(intake.start_date), 'day') / 7) + 1,
        cycleOrder: index + 1,
        cycleName: `${cycle.cycleType} Cycle`,
        cycleBlocks: mappedBlocks,
        cycleDescription: `${cycle.cycleType} cycle for comprehensive preparation`,
        cycleStartDate: cycle.startDate,
        cycleEndDate: cycle.endDate
      };
    });
  } else {
    logger.logInfo('Engine', 'No cycles from scheduler2, using basic plan structure');
  }
  
  return plan;
}