import dayjs from 'dayjs';
import { planBlocks } from './plan-blocks';
import { planCycles } from './plan-cycles';
import { BlockAllocConstraints, BlockSlot, CycleSchedule, CycleType, PlanningContext, S2Constraints, S2ExamFocus, S2SlotType, S2Task, ScenarioResult } from "./types";
import { planSubjectTasks } from './plan-subject';

// import { writeFileSync } from "fs";

/* Before calling this function, build the context object
* 1. load subjects
* 2.Load optional subject 
* 3. If optional first, put the optional as the first subjet and use merged array
* 4. Determine subject relative weights based on confidence map
* 5. GS:Optional weight should be reflected in the relative weights
*/
export function planMain(context: PlanningContext) {
  const scenario: ScenarioResult = planCycles(context);
  const cycles = scenario.schedules;
  // console.log("planMain", "cycles2Blocks");
  const blocks = cycles2Blocks(context, cycles);
  // console.log("planMain", "blocks2Tasks");
  const tasks = blocks2Tasks(context, blocks);
  // console.log("planMain", "blocks2Tasks returned");
  return { cycles, blocks, tasks };
}

function cycles2Blocks(context: PlanningContext, schedules: CycleSchedule[]): BlockSlot[] {
  const blocks = schedules.flatMap((cycle) => {
    const { cycleType, startDate, endDate } = cycle;
    const cycle2ExamFocus = cycleType2ExamFocus(cycleType);
    // Filter subjects based on cycle exam focus
    // PrelimsOnly cycles should include PrelimsOnly and BothExams subjects
    // MainsOnly cycles should include MainsOnly and BothExams subjects  
    // BothExams cycles should include BothExams subjects
    const subjects = context.subjects.filter((subject) => {
      if (cycle2ExamFocus === "PrelimsOnly") {
        return subject.examFocus === "PrelimsOnly" || subject.examFocus === "BothExams";
      } else if (cycle2ExamFocus === "MainsOnly") {
        return subject.examFocus === "MainsOnly" || subject.examFocus === "BothExams";
      } else if (cycle2ExamFocus === "BothExams") {
        return subject.examFocus === "BothExams";
      }
      return false;
    });

    // if MainsOnly or BothExams, then bring Optional to the front of the subject array
    const reorderedSubjects = (cycle2ExamFocus === "MainsOnly" || cycle2ExamFocus === "BothExams") ?
      [context.optionalSubject, ...subjects] : subjects;
      
    const numParallel = 2;
    // reorder subjects
    const blkConstraints: BlockAllocConstraints = {
      cycleType,
      relativeAllocationWeights: context.relativeAllocationWeights,
      numParallel,
      workingMinutesPerDay: context.constraints.workingHoursPerDay*60 / numParallel,
      catchupDay: context.constraints.catchupDay,
      testDay: context.constraints.testDay,
      testMinutes: context.constraints.testMinutes,
    }
    
    const blocks = planBlocks(dayjs(startDate), dayjs(endDate), reorderedSubjects, blkConstraints);
    return blocks;
  });
  return blocks;
}

function cycleType2ExamFocus(cycleType: CycleType): S2ExamFocus {
  switch (cycleType) {
    case CycleType.C1:
      return "BothExams";
    case CycleType.C2:
      return "BothExams";
    case CycleType.C3:
      return "MainsOnly";
    case CycleType.C4:
      return "PrelimsOnly";
    case CycleType.C5:
      return "PrelimsOnly";
    case CycleType.C5B:
      return "PrelimsOnly";
    case CycleType.C6:
      return "MainsOnly";
    case CycleType.C7:
      return "MainsOnly";
    case CycleType.C8:
      return "BothExams";
    default:
      throw new Error(`Unknown cycle type: ${cycleType}`);
  }
}

/**
 * Adjusts task effort split for excess time blocks by removing STUDY tasks and redistributing
 * the STUDY share proportionally to REVISION and PRACTICE tasks.
 * 
 * For excess time blocks (second pass after all baseline time is allocated), we exclude STUDY
 * tasks since the material has already been studied. The STUDY time is redistributed to reinforce
 * learning through REVISION and PRACTICE.
 * 
 * Redistribution strategy:
 * - If both REVISION and PRACTICE exist: redistribute STUDY proportionally maintaining their relative ratios
 * - If only REVISION exists: allocate all STUDY time to REVISION
 * - If only PRACTICE exists: allocate all STUDY time to PRACTICE
 * - If neither exists: allocate all STUDY time to REVISION (default)
 * 
 * @param taskEffortSplit - Original task effort split from cycle type (e.g., {STUDY: 0.7, REVISION: 0.2, PRACTICE: 0.1})
 * @returns Modified task effort split with STUDY set to 0 and STUDY share redistributed to REVISION/PRACTICE
 */
function adjustTaskEffortSplit(taskEffortSplit: Record<S2SlotType, number>): Record<S2SlotType, number> {
  const studyShare = taskEffortSplit[S2SlotType.STUDY];
  const revisionShare = taskEffortSplit[S2SlotType.REVISION];
  const practiceShare = taskEffortSplit[S2SlotType.PRACTICE];
  const totalNonStudy = revisionShare + practiceShare;
  
  // Early return if no STUDY to redistribute
  if (studyShare === 0) {
    return taskEffortSplit;
  }
  
  
  // Calculate new REVISION share:
  // - If both REVISION and PRACTICE exist: redistribute STUDY proportionally maintaining their ratio
  //   (REVISION gets: revisionShare + (studyShare * revisionShare / totalNonStudy))
  // - Else if only REVISION exists: give all STUDY to REVISION
  // - Else if only PRACTICE exists: REVISION becomes 0
  // - Else (neither exists): give all STUDY to REVISION
  const newRevisionShare = totalNonStudy > 0
    ? revisionShare + (studyShare * revisionShare / totalNonStudy)
    : revisionShare > 0
      ? revisionShare + studyShare
      : practiceShare > 0
        ? 0
        : studyShare;
  
  // Calculate new PRACTICE share:
  // - If both REVISION and PRACTICE exist: redistribute STUDY proportionally maintaining their ratio
  //   (PRACTICE gets: practiceShare + (studyShare * practiceShare / totalNonStudy))
  // - Else if only PRACTICE exists: give all STUDY to PRACTICE
  // - Else: PRACTICE remains at its original value (0)
  const newPracticeShare = totalNonStudy > 0
    ? practiceShare + (studyShare * practiceShare / totalNonStudy)
    : practiceShare > 0
      ? practiceShare + studyShare
      : 0;
  
  return {
    ...taskEffortSplit,
    [S2SlotType.STUDY]: 0,  // Remove STUDY tasks for excess time blocks
    [S2SlotType.REVISION]: newRevisionShare,
    [S2SlotType.PRACTICE]: newPracticeShare,
  };
}
function blocks2Tasks(context: PlanningContext, blocks: BlockSlot[]): S2Task[] {
  // console.log(`blocks2Tasks: Processing ${blocks.length} blocks`);
  const tasks = blocks.flatMap((block, index) => {
    const { cycleType } = block;
    const { subject, from, to } = block;
    const taskEffortSplit = block.metadata?.isExcessTime 
      ? adjustTaskEffortSplit(cycleTypeToTaskEffortSplit(cycleType)) 
      :  cycleTypeToTaskEffortSplit(cycleType);
    const taskPlanConstraints: S2Constraints = {
      cycleType,
      dayMaxMinutes: block.minutesPerDay,
      dayMinMinutes: block.minutesPerDay,
      catchupDay: context.constraints.catchupDay, 
      testDay: context.constraints.testDay,
      testMinutes: context.constraints.testMinutes,
      taskEffortSplit,
      optionalSubjectCode: context.constraints.optionalSubjectCode,
    }
    // console.log(`blocks2Tasks: Block ${index + 1} - ${subject.subjectCode} (${cycleType}) from ${from.format('YYYY-MM-DD HH:mm')} to ${to.format('YYYY-MM-DD HH:mm')}`);
    // console.log(`blocks2Tasks: Block duration: ${to.diff(from, 'minutes')} minutes`);
    // console.log(`blocks2Tasks: Task constraints:`, taskPlanConstraints);
    
    try {
      const blockTasks = planSubjectTasks(from, to, subject, taskPlanConstraints);
      // console.log(`blocks2Tasks: Block ${index + 1} generated ${blockTasks.length} tasks`);
      return blockTasks;
           } catch (error) {
             console.error(`blocks2Tasks: Error in block ${index + 1}:`, error instanceof Error ? error.message : String(error));
             return [];
           }
  });
  // console.log(`blocks2Tasks: Total tasks generated: ${tasks.length}`);
  return tasks;
}

const BASE_TASK_RATIOS = {
  'C1': { [S2SlotType.STUDY]: 1.0, [S2SlotType.PRACTICE]: 0, [S2SlotType.REVISION]: 0, [S2SlotType.TEST]: 0, [S2SlotType.CATCHUP]: 0 },
  'C2': { [S2SlotType.STUDY]: 0.6, [S2SlotType.PRACTICE]: 0.2, [S2SlotType.REVISION]: 0.2, [S2SlotType.TEST]: 0, [S2SlotType.CATCHUP]: 0 },
  'C3': { [S2SlotType.STUDY]: 0.7, [S2SlotType.PRACTICE]: 0.1, [S2SlotType.REVISION]: 0.2, [S2SlotType.TEST]: 0, [S2SlotType.CATCHUP]: 0 },
  'C4': { [S2SlotType.STUDY]: 0.2, [S2SlotType.PRACTICE]: 0.4, [S2SlotType.REVISION]: 0.4, [S2SlotType.TEST]: 0, [S2SlotType.CATCHUP]: 0 },
  'C5': { [S2SlotType.STUDY]: 0.1, [S2SlotType.PRACTICE]: 0.5, [S2SlotType.REVISION]: 0.4, [S2SlotType.TEST]: 0, [S2SlotType.CATCHUP]: 0 },
  'C5.b': { [S2SlotType.STUDY]: 0.1, [S2SlotType.PRACTICE]: 0.5, [S2SlotType.REVISION]: 0.4, [S2SlotType.TEST]: 0, [S2SlotType.CATCHUP]: 0 },
  'C6': { [S2SlotType.STUDY]: 0.2, [S2SlotType.PRACTICE]: 0.3, [S2SlotType.REVISION]: 0.5, [S2SlotType.TEST]: 0, [S2SlotType.CATCHUP]: 0 },
  'C7': { [S2SlotType.STUDY]: 0.1, [S2SlotType.PRACTICE]: 0.4, [S2SlotType.REVISION]: 0.5, [S2SlotType.TEST]: 0, [S2SlotType.CATCHUP]: 0 },
  'C8': { [S2SlotType.STUDY]: 0.8, [S2SlotType.PRACTICE]: 0.1, [S2SlotType.REVISION]: 0.1, [S2SlotType.TEST]: 0, [S2SlotType.CATCHUP]: 0 }
};


function cycleTypeToTaskEffortSplit(cycleType: CycleType): Record<number, number> {
  // Get base ratios for the cycle type
  return BASE_TASK_RATIOS[cycleType];
}
