import { StudyPlan, Archetype, StudyCycle } from '../types/models';
import { StudentIntake } from '../types/models';
import { Logger, LogEntry, ConfidenceLevel, SubjectApproach } from '../types/Types';
import { Config } from './engine-types';
import { makeLogger } from '../services/Log';
import dayjs from 'dayjs';
import { loadAllSubjects, loadSubtopics } from '../services/SubjectLoader';
import { ResourceService } from '../services/ResourceService';
import { SubjData } from '../types/Subjects';
import { PlanResources, ResourceTimeline, BudgetSummary } from '../types/models';
import { determineCycleSchedule } from './cycle-scheduler';
import { planFoundationCycle as planC2FoundationCycle } from './cycle-foundation';
import { planPrelimsRevisionCycle as planC4PrelimsRevisionCycle } from './cycle-prelims-revision';
import { planPrelimsRapidRevisionCycle as planC5PrelimsRapidRevisionCycle } from './cycle-prelims-rapid';
import { planMainsRapidRevisionCycle as planC7MainsRapidRevisionCycle } from './cycle-mains-rapid';
import { planC1Cycle } from './cycle-c1-ncert';
import { planC3Cycle } from './cycle-c3-mains-prefoundation';
import { planC8Cycle } from './cycle-c8-mains-foundation';
import { planMainsRevisionCycle as planC6MainsRevisionCycle } from './cycle-mains-revision';

/**
 * Generate an initial study plan for a student.
 * 
 * Algorithm:
 *   1. 
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

  info('Engine', `Starting initial plan generation. User: ${userId}`);

  /**
   * Other rules:
   * 
   *  - Optional subject is studied only before target year. E.g. if preparing for 2026,
   *    no optional subject hours after December 31, 2025.
   * 
   * Main algorithm:
   * 0. Build baseline hour table - this is common for all students. The output of this
   *    is a table that maps subject codes -> baseline hours.
   * 0.1. Build confidence map based on the intake data
   * 1. Calculate the total hours available to the student. Assumes minimum 8 hours/day
   * 2. Determine stretch/shrink factor based on available-hours:baseline-hours ratio. Ratio > 1 if strech, else shrink
   * 3. Calculate the total hours for each subject based on the stretch/shrink factor. 
   * 2. Determine the cycles based on target year and start date:
   *    - no foundation cycle if shrink
   * 3. Foundation cycle: start date until December 31st of the year before target year. 
   *    If prep starts after December 31st of the year before target year,
   *    then the foundation cycle is not included in the plan
   * 4. PrelimsRevision cycle: Jan 1 of target year until 31 March of target year. If prep starts after 
   *    April 1 of target year, then the prelims revision cycle is not included in the plan. If prep
   *    starts after Jan 1 but before March 31, then the prelims revision cycle is included in the plan, 
   *    but hours are proportionately reduced.
   * 5. Prelims RapidRevision cycle: April 1 of target year until May 20 of target year. If prep starts after May 10, 
   *    then the request plan generation is rejected. If prep starts after April 1 but before May 10, 
   *    then the Prelims RapidRevision cycle is included in the plan, but hours are proportionately reduced.
   * 6. Mains RapidRevision cycle: May 21 of target year until August 20 of target year. If prep starts after Aug 1,
   *    then plan generation is rejected. If prep starts after May 21 but before Aug 1,
   *    then the Mains RapidRevision cycle is included in the plan, but hours are proportionately reduced.
   * 7. During Foundation cycle, ratio of GS:Optional hours is 6:3
   * 8. For every cycle, first apply confidence factors to base line hours based on the confidence map.
   *    - Very strong: 0.7 * baseline hours
   *    - Strong: 0.8 * baseline hours
   *    - Moderate: 1.0 * baseline hours
   *    - Weak: 1.2 * baseline hours
   *    - Very weak: 1.3 * baseline hours
   * 9. Then, in every cycle, trim D5 (SubtopicBand 'D' and priority 5) first, then D4, then D3 etc. until
   *    you trim all the way to B1. Band A is left untouched.  This trimming is done until there's 
   *    enough time for the rest of the subtopics.
   * 
   */
  const subjects = loadAllSubjects();
  const subjData: SubjData = {
    subjects, subtopics: loadSubtopics(subjects)
  }
  // const baselineHourTable = buildBaselineHourTable(logger, subjData);

  // NEW: Use cycle scheduler to determine plan structure
  const targetYear = parseInt(intake.target_year || '2026');
  const prelimsExamDate = dayjs(`${targetYear}-05-28`).toDate(); // Default prelims date
  
  // Debug: Log the start_date being used
  const startDate = intake.start_date;
  logger.logInfo('Engine', `Using start_date: ${startDate} (from intake.start_date: ${intake.start_date})`);
  
  let scheduleResult;
  try {
    scheduleResult = determineCycleSchedule(
      logger,
      new Date(startDate),
      targetYear,
      prelimsExamDate
    );
  } catch (error) {
    // Handle S8 (REJECT) scenario
    logger.logWarn('Engine', `Plan generation rejected: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw error;
  }
  
  logger.logInfo('Engine', `Determined scenario ${scheduleResult.scenario} with ${scheduleResult.totalTimeAvailable.toFixed(1)} months available`);
  
  // Generate cycles based on determined schedule
  const cycles = await generateCyclesFromSchedule(logger, intake, scheduleResult, subjData);
  
  const plan = await buildFinalPlan(logger, intake, cycles, scheduleResult.scenario);

  await sanityCheckPlan(plan, intake);
  return { plan, logs: logger.getLogs() };
}

/**
 * Generate cycles based on the determined schedule
 */
async function generateCyclesFromSchedule(
  logger: Logger,
  intake: StudentIntake,
  scheduleResult: any, // ScenarioResult
  subjData: SubjData
): Promise<StudyCycle[]> {
  const cycles: StudyCycle[] = [];
  
  // Determine subjectApproach based on study focus preference
  const studyFocusCombo = intake.study_strategy.study_focus_combo;
  const subjectApproach: SubjectApproach = 
    studyFocusCombo === 'OneGS' ? 'SingleSubject' :
    studyFocusCombo === 'OneGSPlusOptional' ? 'DualSubject' :
    studyFocusCombo === 'GSPlusOptionalPlusCSAT' ? 'TripleSubject' :
    'DualSubject'; // Default fallback
  
  logger.logInfo('Engine', `Using ${subjectApproach} approach based on study focus: ${studyFocusCombo}`);
  
  for (const schedule of scheduleResult.schedules) {
    const cycle = await generateCycleForSchedule(
      logger, 
      intake, 
      schedule,
      subjData
    );
    if (cycle) cycles.push(cycle);
  }
  
  return cycles;
}

/**
 * Generate individual cycle based on schedule entry
 */
async function generateCycleForSchedule(
  logger: Logger,
  intake: StudentIntake,
  schedule: any, // CycleSchedule
  subjData: SubjData
): Promise<StudyCycle | undefined> {
  const startDate = dayjs(schedule.startDate);
  const endDate = dayjs(schedule.endDate);
  const confidenceMap = buildConfidenceMap(logger, intake, subjData);
  
  switch (schedule.cycleType) {
    case 'C1':
      return await planC1Cycle(logger, intake, confidenceMap, startDate, endDate, subjData, subjData.subjects);
    case 'C2':
      return await planC2FoundationCycle(logger, intake, confidenceMap, startDate, subjData, subjData.subjects);
    case 'C3':
      return await planC3Cycle(logger, intake, confidenceMap, startDate, endDate, subjData, subjData.subjects);
    case 'C4':
      return await planC4PrelimsRevisionCycle(logger, intake, confidenceMap, startDate, endDate, subjData);
    case 'C5':
      return await planC5PrelimsRapidRevisionCycle(logger, intake, confidenceMap, startDate, endDate, subjData);
    case 'C6':
      return await planC6MainsRevisionCycle(logger, intake, confidenceMap, startDate, endDate, subjData);
    case 'C7':
      return await planC7MainsRapidRevisionCycle(logger, intake, confidenceMap, startDate, endDate, subjData);
    case 'C8':
      return await planC8Cycle(logger, intake, confidenceMap, startDate, endDate, subjData, subjData.subjects);
    default:
      logger.logWarn('Engine', `Unknown cycle type: ${schedule.cycleType}`);
      return undefined;
  }
}

async function sanityCheckPlan(plan: StudyPlan, intake: StudentIntake): Promise<void> {
  const cycles = plan.cycles;

  if (!plan.cycles) {
    throw new Error("Plan cycles are expected")
  }
    // const cycleTypes = cycles?.map((cycle: StudyCycle) => cycle.cycleType);
  const prelimsRapidCycle = cycles?.find((cycle: StudyCycle) => cycle.cycleType === 'C5');
  if (!prelimsRapidCycle) {
    throw new Error("Prelims Rapid Revision cycle is expected")
  }
  const targetYear = intake.target_year;
  const prcEndDate = dayjs(prelimsRapidCycle.cycleEndDate);
  if (dayjs(prcEndDate).isAfter(dayjs(`${targetYear}-05-20`))) {
    throw new Error("Prelims Rapid Revision cycle end date is expected to be before May 20, 2026")
  }
  const mainsRapidCycle = cycles?.find((cycle: StudyCycle) => cycle.cycleType === 'C7');
  if (!mainsRapidCycle) {
    throw new Error("Mains Rapid Revision cycle is expected")
  }
  const mrcEndDate = dayjs(mainsRapidCycle.cycleEndDate);
  if (dayjs(mrcEndDate).isAfter(dayjs(`${targetYear}-08-20`))) {
    throw new Error("Mains Rapid Revision cycle end date is expected to be before August 20, 2026")
  }

  for (const cycle of plan.cycles) {
    for (const block of cycle.cycleBlocks) {
      if (!(block.block_end_date && block.block_start_date)) {
        throw new Error(`Block ${block.block_id} has no start or end date`);
      }
      // Block end date must not exceed cycle end date
      if (dayjs(block.block_end_date).isAfter(dayjs(cycle.cycleEndDate))) {
        throw new Error(`Block ${block.block_id} end date ${block.block_end_date} exceeds cycle end date ${cycle.cycleEndDate}`);
      }
      if (dayjs(block.block_start_date).isBefore(dayjs(cycle.cycleStartDate))) {
        throw new Error(`Block ${block.block_id} start date ${block.block_start_date} is before cycle start date ${cycle.cycleStartDate}`);
      }
      if (dayjs(block.block_end_date).isBefore(dayjs(block.block_start_date))) {
        throw new Error(`Block ${block.block_id} end date ${block.block_end_date} is before start date ${block.block_start_date}`);
      }
    }
  }

}

/**
 * Build baseline hour table - maps subject codes to baseline hours.
 * This is common for all students and provides the foundation for hour calculations.
 * If baselineHours is undefined or 0, calculates bottom-up from subtopics.
 */
// function buildBaselineHourTable(_logger: Logger, subjects: Subject[]): Map<string, number> {
//   return new Map(
//     subjects.map(subject => {
//       const baselineHours = (subject.baselineHours === undefined || subject.baselineHours === 0) 
//         ? calculateBaselineHoursFromSubtopics(subject)
//         : subject.baselineHours;
//       return [subject.subjectCode, baselineHours];
//     })
//   );
// }

/**
 * Calculate baseline hours from subtopics by summing up all subtopic baseline hours
 */
// function calculateBaselineHoursFromSubtopics(subject: Subject): number {
//   return subject.topics
//     .map(topic => topic.subtopics || [])
//     .flat()
//     .reduce((total, subtopic) => total + subtopic.baselineHours, 0);
// }

/**
 * Build confidence map from intake data - maps subtopic codes to confidence factors
 * Stretch factors: Very strong: 0.7, Strong: 0.8, Moderate: 1.0, Weak: 1.2, Very weak: 1.3
 */
function buildConfidenceMap(logger: Logger, intake: StudentIntake, subjData: SubjData): Map<string, number> {
  const { logInfo: info, logDebug: debug } = logger;
  const { subjects } = subjData;
  info('Engine', 'Building confidence map from intake data');
  
  const confidenceMap = new Map<string, number>();
  
  // Map confidence levels to factors
  const confidenceFactors: Record<ConfidenceLevel, number> = {
    'VeryStrong': 0.7,
    'Strong': 0.8,
    'Moderate': 1.0,
    'Weak': 1.2,
    'VeryWeak': 1.3,
    'NotStarted': 1.3
  };
  
  // For each subject in intake, map all its subtopics to the subject's confidence factor
  Object.entries(intake.subject_confidence)
    .map(([subjectCode, confidenceLevel]) => ({
      subjectCode,
      stretchFactor: confidenceFactors[confidenceLevel],
      subject: subjects.find(s => s.subjectCode === subjectCode)
    }))
    .filter(({ subject }) => subject !== undefined)
    .flatMap(({ subject, stretchFactor, subjectCode }) =>
      subject!.topics
        .filter(topic => topic.subtopics)
        .flatMap(topic => topic.subtopics!)
        .map(subtopic => {
          confidenceMap.set(subtopic.code, stretchFactor);
          debug('Engine', `Subtopic ${subtopic.code}: confidence factor ${stretchFactor} (${subjectCode})`);
          return [subtopic.code, stretchFactor] as [string, number];
        })
    );
  
  // For subjects not in intake, default to 'Moderate' confidence
  const moderateFactor = confidenceFactors['Moderate'];
  const subjectsNotInIntake = subjects.filter(subject => 
    !Object.keys(intake.subject_confidence).includes(subject.subjectCode)
  );
  
  subjectsNotInIntake.forEach(subject => {
    subject.topics
      .filter(topic => topic.subtopics)
      .flatMap(topic => topic.subtopics!)
      .forEach(subtopic => {
        if (!confidenceMap.has(subtopic.code)) {
          confidenceMap.set(subtopic.code, moderateFactor);
          debug('Engine', `Subtopic ${subtopic.code}: default confidence factor ${moderateFactor} (${subject.subjectCode})`);
        }
      });
  });
  
  info('Engine', `Built confidence map with ${confidenceMap.size} subtopics (${subjectsNotInIntake.length} subjects defaulted to Moderate)`);
  
  return confidenceMap;
}

/**
 * Aggregate resources from all cycles into a comprehensive plan-level resource summary
 */
async function aggregatePlanResources(
  logger: Logger,
  cycles: StudyCycle[]
): Promise<PlanResources> {
  const { logInfo: info, logDebug: debug } = logger;
  
  info('Engine', 'Aggregating resources from all cycles');
  
  // Collect all unique subjects from all cycles
  const allSubjects = new Set<string>();
  cycles.forEach(cycle => {
    cycle.cycleBlocks.forEach(block => {
      block.subjects.forEach(subjectCode => allSubjects.add(subjectCode));
    });
  });
  
  debug('Engine', `Found subjects across all cycles: ${Array.from(allSubjects).join(', ')}`);
  
  // Aggregate resources by category
  const allResources = new Map<string, any>(); // resource_id -> resource_obj for deduplication
  
  for (const subjectCode of allSubjects) {
    try {
      const subjectResources = await ResourceService.getResourcesForSubject(subjectCode);
      const resourceCategories = [
        'primary_books',
        'supplementary_materials', 
        'practice_resources',
        'video_content',
        'expert_recommendations'
      ];
      
      resourceCategories.forEach(category => {
        const resources = subjectResources[category as keyof typeof subjectResources] || [];
        resources.forEach(resource => {
          if (!allResources.has(resource.resource_id)) {
            allResources.set(resource.resource_id, resource);
            debug('Engine', `Added resource: ${resource.resource_title} (${category})`);
          }
        });
      });
    } catch (error) {
      debug('Engine', `Error loading resources for subject ${subjectCode}: ${error}`);
    }
  }
  
  info('Engine', `Aggregated ${allResources.size} unique resources from ${allSubjects.size} subjects`);
  
  // Categorize resources by priority for timeline
  const essentialResources: any[] = [];
  const immediateNeeds: any[] = [];
  const midTermNeeds: any[] = [];
  const longTermNeeds: any[] = [];
  const alternativeOptions: any[] = [];
  
  Array.from(allResources.values()).forEach(resource => {
    if (resource.resource_priority === 'Essential') {
      essentialResources.push(resource);
      
      // Timeline distribution based on cycle type
      const isEarlyCycle = cycles.some(cycle => 
        cycle.cycleType === 'C2' && 
        cycle.cycleBlocks.some(block => block.subjects.includes(resource.resource_subjects[0]))
      );
      
      if (isEarlyCycle) {
        immediateNeeds.push(resource);
      } else {
        midTermNeeds.push(resource);
      }
    } else if (resource.resource_priority === 'Recommended') {
      midTermNeeds.push(resource);
    } else if (resource.resource_priority === 'Optional') {
      // Optional resources go to both long-term AND alternatives
      // This is intentional - they serve dual purposes
      longTermNeeds.push(resource);
      alternativeOptions.push(resource);
    }
  });
  
  debug('Engine', `Resource categorization: ${essentialResources.length} essential, ${immediateNeeds.length} immediate, ${midTermNeeds.length} mid-term, ${longTermNeeds.length} long-term, ${alternativeOptions.length} alternatives`);
  
  // Calculate budget summary
  const budgetSummary = calculateBudgetSummary([
    ...essentialResources,
    ...midTermNeeds,
    ...longTermNeeds
  ]);
  
  const recommendedTimeline: ResourceTimeline = {
    immediate_needs: immediateNeeds,
    mid_term_needs: midTermNeeds,
    long_term_needs: longTermNeeds
  };
  
  info('Engine', `Resource aggregation complete: ${essentialResources.length} essential, ${immediateNeeds.length} immediate, ${midTermNeeds.length} mid-term, ${longTermNeeds.length} long-term`);
  
  return {
    essential_resources: essentialResources,
    recommended_timeline: recommendedTimeline,
    budget_summary: budgetSummary,
    alternative_options: alternativeOptions
  };
}

/**
 * Calculate budget summary for aggregated resources
 */
function calculateBudgetSummary(allResources: any[]): BudgetSummary {
  let essentialCost = 0;
  let optionalCost = 0;
  let freeAlternatives = 0;
  let subscriptionCost = 0;
  
  allResources.forEach(resource => {
    if (resource.resource_cost?.type === 'Paid') {
      const cost = resource.resource_cost.amount || 0;
      
      if (resource.resource_priority === 'Essential') {
        essentialCost += cost;
      } else if (resource.resource_priority === 'Optional') {
        optionalCost += cost;
      } else if (resource.resource_priority === 'Recommended') {
        // Treat recommended as essential for budget purposes
        essentialCost += cost;
      }
    } else if (resource.resource_cost?.type === 'Subscription') {
      // Use deterministic subscription cost instead of random
      const subscriptionAmount = resource.resource_cost.plan === 'Premium' ? 50 : 
                                resource.resource_cost.plan === 'Standard' ? 30 : 15;
      
      subscriptionCost += subscriptionAmount;
      
      // Also distribute subscription cost to priority categories
      if (resource.resource_priority === 'Essential') {
        essentialCost += subscriptionAmount;
      } else if (resource.resource_priority === 'Recommended') {
        essentialCost += subscriptionAmount;
      } else if (resource.resource_priority === 'Optional') {
        optionalCost += subscriptionAmount;
      }
    } else if (resource.resource_cost?.type === 'Free') {
      freeAlternatives++;
    }
  });
  
  // Total cost is the sum of essential + optional costs only (subscription costs are already included in those)
  const totalCost = essentialCost + optionalCost;
  
  return {
    total_cost: Math.round(totalCost),
    essential_cost: Math.round(essentialCost),
    optional_cost: Math.round(optionalCost),
    free_alternatives: freeAlternatives,
    subscription_cost: Math.round(subscriptionCost)
  };
}

/**
 * Build final study plan by combining all cycles
 */
async function buildFinalPlan(
  logger: Logger,
  intake: StudentIntake,
  cycles: StudyCycle[],
  scenario?: string
): Promise<StudyPlan> {
  const { logInfo: info, logDebug: debug } = logger;
  
  info('Engine', 'Building final study plan');
  
  debug('Engine', `Final plan includes ${cycles.length} cycles: ${cycles.map(c => c.cycleName).join(', ')}`);
  
  // Calculate total blocks across all cycles
  const totalBlocks = cycles.reduce((sum, cycle) => sum + cycle.cycleBlocks.length, 0);
  
  // Calculate total duration across all cycles
  const totalDuration = cycles.reduce((sum, cycle) => sum + cycle.cycleDuration, 0);
  
  info('Engine', `Final plan: ${totalBlocks} blocks across ${totalDuration} weeks`);
  
  // Aggregrate resources from all cycles
  const curatedResources = await aggregatePlanResources(logger, cycles);
  
  const plan: StudyPlan = {
    targeted_year: parseInt(intake.target_year || '2026'),
    start_date: dayjs(intake.start_date || new Date()).toDate(),
    study_plan_id: `plan-${Date.now()}`,
    user_id: 'system-generated',
    plan_title: `Study Plan for ${intake.target_year || 'UPSC'} Preparation`,
    curated_resources: curatedResources,
    effective_season_context: 'ComprehensiveStudy',
    created_for_target_year: intake.target_year,
    timelineUtilization: calculateTimelineUtilization(cycles),
    cycles: cycles,
    milestones: calculateMilestones(cycles),
    scenario: scenario
  };
  
  info('Engine', 'Final study plan created successfully');
  
  return plan;
}

/**
 * Calculate timeline utilization percentage
 */
function calculateTimelineUtilization(cycles: StudyCycle[]): number {
  if (cycles.length === 0) return 0;
  
  const totalWeeks = cycles.reduce((sum, cycle) => sum + cycle.cycleDuration, 0);
  const maxPossibleWeeks = 52; // Assuming 1 year max preparation
  
  return Math.min(100, Math.round((totalWeeks / maxPossibleWeeks) * 100));
}

/**
 * Calculate major milestones based on cycles
 */
function calculateMilestones(cycles: StudyCycle[]): any {
  const milestones: any = {};
  
  // Find foundation to prelims date
  const foundationCycle = cycles.find(c => c.cycleType === 'C2');
  const prelimsCycle = cycles.find(c => c.cycleType === 'C4');
  
  if (foundationCycle && prelimsCycle) {
    milestones.foundationToPrelimsDate = prelimsCycle.cycleStartDate;
  }
  
  // Find prelims to mains date
  const prelimsRapidCycle = cycles.find(c => c.cycleName.includes('Prelims Rapid'));
  const mainsRapidCycle = cycles.find(c => c.cycleName.includes('Mains Rapid'));
  
  if (prelimsRapidCycle && mainsRapidCycle) {
    milestones.prelimsToMainsDate = mainsRapidCycle.cycleStartDate;
  }
  
  return milestones;
}
