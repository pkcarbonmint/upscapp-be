import type { StudyPlan, Block, StudyCycle,  Archetype } from '../types/models';
import type { StudentIntake } from '../types/models';
import type { Config, MonthlyFeedback, PerformanceData, PlanReviewResult } from './engine-types';
import type { TopicConfidenceMap } from '../types/HourCalculationTypes';
import { v4 as uuidv4 } from 'uuid';

export { generateInitialPlan } from "./NewEngine-generate-plan";  

/**
 * Rebalance plan based on performance data (placeholder implementation)
 */
export async function rebalancePlan(
  _userId: string,
  _config: Config,
  archetypeDetails: Archetype,
  currentPlan: StudyPlan,
  _performanceData: PerformanceData
): Promise<StudyPlan> {
  console.log(`Rebalancing plan for archetype: ${archetypeDetails.description}`);
  // TODO: Implement adaptive rebalancing algorithm
  return currentPlan;
}

/**
 * Dynamic Study Plan Rebalancing
 */
export async function rebalanceStudyPlan(
  _userId: string,
  config: Config,
  originalPlan: StudyPlan,
  startWeek: number,
  feedback: MonthlyFeedback,
  topicConfidenceMap: TopicConfidenceMap
): Promise<StudyPlan> {
  // PHASE 1: Extract blocks from cycles and partition into past and future
  const allBlocks = extractBlocksFromCycles(originalPlan);
  const { pastBlocks, futureBlocks } = partitionPlanByWeek(allBlocks, startWeek);
  
  // PHASE 2: Identify all future topics and their completion status
  const allFutureTopicsWithStatus = await identifyUnfinishedWorkNew(futureBlocks, feedback, topicConfidenceMap);
  
  // Filter for topics that are incomplete or need review
  const topicsForReplan = allFutureTopicsWithStatus.filter(([_, __, status]) => needsRevisiting(status));
  const droppedTopics = allFutureTopicsWithStatus.filter(([_, __, status]) => !needsRevisiting(status));
  const droppedTopicCodes = droppedTopics.map(([topic, _, __]) => topic.topicCode);
  
  console.log(`Dropped topic codes during rebalancing: ${JSON.stringify(droppedTopicCodes)}`);
      
  // Extract topic and subject_code pairs for the planner
  const combinedTopicsAndSubjects: Array<[any, string]> = topicsForReplan.map(([topic, subjectCode, _]) => [topic, subjectCode]);

  // PHASE 3 & 4: Run the new topic-based re-balancing planner
  const newFutureBlocks = await runTopicBasedRebalancePlanner(config, combinedTopicsAndSubjects, feedback, topicConfidenceMap, originalPlan);
  
  // PHASE 5: Reconstruct the complete plan by updating cycles with rebalanced blocks
  const rebalancedCycles = updateCyclesWithRebalancedBlocks(originalPlan, pastBlocks, newFutureBlocks);
  const rebalancedPlan = { ...originalPlan, cycles: rebalancedCycles || [] };
  
  return rebalancedPlan;
}

/**
 * Review plan for potential issues and improvements
 */
export async function reviewPlan(
  _userId: string,
  _config: Config,
  plan: StudyPlan,
  _intake: StudentIntake
): Promise<PlanReviewResult> {
  // TODO: Implement comprehensive plan review
  return {
    review_id: `review-${uuidv4()}`,
    plan_id: plan.study_plan_id,
    overall_score: 85,
    is_executable: true,
    validation_issues: [],
    fix_suggestions: [],
    summary: 'Plan review completed successfully',
    detailed_feedback: {}
  };
}

/**
 * Validate plan for basic safety and feasibility
 */
export async function validatePlan(
  _userId: string,
  _config: Config,
  _plan: StudyPlan,
  _intake: StudentIntake
): Promise<boolean> {
  // TODO: Implement plan validation
  return true;
}

// Helper functions


/**
 * Extract all blocks from cycles in a study plan
 */
function extractBlocksFromCycles(plan: StudyPlan): Block[] {
  return plan.cycles ? plan.cycles.flatMap(cycle => cycle.cycleBlocks) : [];
}

/**
 * Update cycles with rebalanced blocks
 */
function updateCyclesWithRebalancedBlocks(_originalPlan: StudyPlan, pastBlocks: Block[], newFutureBlocks: Block[]): StudyCycle[] | undefined {
  if (!_originalPlan.cycles) return undefined;
  
  const originalCycles = _originalPlan.cycles;
  if (originalCycles.length === 0) return undefined;
  
  // For now, put all rebalanced blocks in the first cycle
  // TODO: Implement proper cycle redistribution logic
  const firstCycle = originalCycles[0];
  const updatedFirstCycle = {
    ...firstCycle,
    cycleBlocks: [...pastBlocks, ...newFutureBlocks]
  };
  
  return [updatedFirstCycle, ...originalCycles.slice(1)];
}

/**
 * Partition study plan blocks into past and future based on week number
 */
function partitionPlanByWeek(allBlocks: Block[], startWeek: number): { pastBlocks: Block[]; futureBlocks: Block[] } {
  let cumulativeWeeks = 0;
  const pastBlocks: Block[] = [];
  const futureBlocks: Block[] = [];
  
  for (const block of allBlocks) {
    cumulativeWeeks += block.duration_weeks;
    if (cumulativeWeeks < startWeek) {
      pastBlocks.push(block);
    } else {
      futureBlocks.push(block);
    }
  }
  
  return { pastBlocks, futureBlocks };
}

/**
 * Determine if a topic needs to be included in the replan
 */
function needsRevisiting(status: any): boolean {
  return status.topicProgress < 1.0 || status.qualityScore < 0.7;
}

/**
 * Identify unfinished work in future blocks
 */
async function identifyUnfinishedWorkNew(
  _blockList: Block[],
  _feedback: MonthlyFeedback,
  _confidenceMap: TopicConfidenceMap
): Promise<Array<[any, string, any]>> {
  // TODO: Implement topic analysis
  return [];
}

/**
 * Run topic-based rebalance planner
 */
async function runTopicBasedRebalancePlanner(
  _config: Config,
  topicsAndSubjects: Array<[any, string]>,
  _feedback: MonthlyFeedback,
  _topicConfidenceMap: TopicConfidenceMap,
  _originalPlan: StudyPlan
): Promise<Block[]> {
  if (topicsAndSubjects.length === 0) {
    return [];
  }
  
  // TODO: Implement topic-based rebalancing
  return [];
}
