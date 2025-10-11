import type { Block, StudyCycle, WeeklyPlan } from '../types/models';
import type { StudentIntake } from '../types/models';
import type { Subject } from '../types/Subjects';
import type { Logger } from '../types/Types';
import { createPlanForOneWeek } from './OneWeekPlan';

// Configuration interface (simplified)
export interface Config {
  daily_hour_limits: {
    regular_day: number;
    catch_up_day: number;
    test_day: number;
  };
  task_effort_split: {
    study: number;
    revision: number;
    practice: number;
    test: number;
  };
}

/**
 * NEW: Cycle-aware scheduler that preserves the cycle structure
 */
export async function scheduleWeeksInAllCycles(
  cycles: StudyCycle[],
  studentIntake: StudentIntake,
  archetype: any, // Archetype type
  config: Config,
  logger: Logger
): Promise<StudyCycle[]> {
  logger.logInfo('WeeklyScheduler', `Starting cycle-aware weekly scheduling for ${cycles.length} cycles.`);
  
  const scheduledCycles = await Promise.all(
    cycles.map(cycle => scheduleWeeksForCycle(studentIntake, archetype, config, cycle, logger))
  );
  
  logger.logInfo('WeeklyScheduler', 'Cycle-aware weekly scheduling complete.');
  return scheduledCycles;
}

/**
 * Main orchestrator: Schedule weeks for all blocks with logging (legacy function)
 */
export async function scheduleWeeksInAllBlocks(
  blocks: Block[],
  studentIntake: StudentIntake,
  archetype: any, // Archetype type
  config: Config,
  logger: Logger
): Promise<Block[]> {
  logger.logInfo('WeeklyScheduler', `Starting detailed weekly scheduling for ${blocks.length} blocks.`);
  
  const scheduledBlocks = await Promise.all(
    blocks.map((block, index) => scheduleWeeksForBlock(studentIntake, archetype, config, index + 1, block, logger))
  );
  
  logger.logInfo('WeeklyScheduler', 'Weekly scheduling complete.');
  return scheduledBlocks;
}

/**
 * Schedule weeks for a single block
 */
async function scheduleWeeksForBlock(
  studentIntake: StudentIntake,
  archetype: any,
  config: Config,
  blockIndex: number,
  block: Block,
  logger: Logger
): Promise<Block> {
  logger.logInfo('WeeklyScheduler', `Scheduling block ${blockIndex}: ${block.block_title}`);
  
  // For now, we'll use mock subjects - in real implementation this would load from config
  const allSubjects: Subject[] = []; // TODO: Load from config
  const subjects = getSubjectsForBlock(allSubjects, block);
  const durationWeeks = block.duration_weeks;
  
  logger.logDebug('WeeklyScheduler', `Block ${blockIndex} configuration: ${subjects.length} subjects, ${durationWeeks} weeks duration`);
  logger.logDebug('WeeklyScheduler', `Block ${blockIndex} subjects: ${subjects.map(s => s.subjectName).join(', ')}`);
  
  // Create weekly plans for the duration of this block using the provided archetype
  const weeklyPlans: WeeklyPlan[] = [];
  for (let weekNum = 1; weekNum <= durationWeeks; weekNum++) {
    logger.logDebug('WeeklyScheduler', `Creating week ${weekNum}/${durationWeeks} for block ${blockIndex}`);
    
    const weeklyPlan = await createPlanForOneWeek(
      blockIndex,
      subjects,
      studentIntake,
      archetype,
      config,
      weekNum,
      durationWeeks,
      logger
    );
    
    // Log week-level decisions
    const totalTasks = weeklyPlan.daily_plans.reduce((sum, day) => sum + day.tasks.length, 0);
    const totalMinutes = weeklyPlan.daily_plans.reduce((sum, day) => 
      sum + day.tasks.reduce((daySum, task) => daySum + task.duration_minutes, 0), 0
    );
    const totalHours = Math.round(totalMinutes / 60 * 100) / 100;
    
    logger.logDebug('WeeklyScheduler', `Week ${weekNum} plan: ${totalTasks} tasks, ${totalHours} hours total`);
    
    weeklyPlans.push(weeklyPlan);
  }
  
  logger.logInfo('WeeklyScheduler', `Block ${blockIndex} scheduling complete: ${weeklyPlans.length} weeks planned`);
  
  return {
    ...block,
    weekly_plan: weeklyPlans
  };
}

/**
 * Schedule weeks for a single cycle, preserving the cycle structure
 */
async function scheduleWeeksForCycle(
  studentIntake: StudentIntake,
  archetype: any,
  config: Config,
  cycle: StudyCycle,
  logger: Logger
): Promise<StudyCycle> {
  logger.logInfo('WeeklyScheduler', `Scheduling cycle: ${cycle.cycleDescription}`);
  logger.logDebug('WeeklyScheduler', `Cycle ${cycle.cycleName} (${cycle.cycleType}): ${cycle.cycleBlocks.length} blocks, ${cycle.cycleDuration} weeks duration`);
  
  const blocks = cycle.cycleBlocks;
  const scheduledBlocks = await Promise.all(
    blocks.map((block, index) => scheduleWeeksForBlock(studentIntake, archetype, config, index + 1, block, logger))
  );
  
  // Log cycle-level summary
  const totalWeeks = scheduledBlocks.reduce((sum, block) => sum + block.weekly_plan.length, 0);
  const totalTasks = scheduledBlocks.reduce((sum, block) => 
    sum + block.weekly_plan.reduce((weekSum, week) => 
      weekSum + week.daily_plans.reduce((daySum, day) => daySum + day.tasks.length, 0), 0
    ), 0
  );
  
  logger.logInfo('WeeklyScheduler', `Cycle ${cycle.cycleName} complete: ${totalWeeks} weeks, ${totalTasks} total tasks across ${scheduledBlocks.length} blocks`);
  
  return {
    ...cycle,
    cycleBlocks: scheduledBlocks
  };
}

/**
 * Get subjects for a block by looking up subject codes
 */
function getSubjectsForBlock(allSubjects: Subject[], block: Block): Subject[] {
  const subjectCodes = block.subjects;
  const subjectMap = new Map<string, Subject>();
  
  allSubjects.forEach(subject => {
    subjectMap.set(subject.subjectCode, subject);
  });
  
  return subjectCodes
    .map(code => subjectMap.get(code))
    .filter((subject): subject is Subject => subject !== undefined);
}
