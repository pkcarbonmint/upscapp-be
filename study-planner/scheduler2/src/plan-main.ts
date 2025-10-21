import dayjs from 'dayjs';
import { planBlocks } from './plan-blocks';
import { planCycles } from './plan-cycles';
import { BlockAllocConstraints, BlockSlot, CycleSchedule, CycleType, PlanningContext, S2Constraints, S2ExamFocus, S2SlotType, S2Task, ScenarioResult } from "./types";
import { planSubjectTasks } from './plan-subject';


/* Before calling this function, build the context object
* 1. load subjects
* 2.Load optional subject 
* 3. If optional first, put the optional as the first subjet and use merged array
* 4. Determine subject relative weights based on confidence map
* 5. GS:Optional weight should be reflected in the relative weights
*/
export function planMain(context: PlanningContext) {
  // setup relative weights and subject order
  const scenario: ScenarioResult = planCycles(context);
  const cycles = scenario.schedules;
  console.log("planMain", "cycles2Blocks");
  const blocks = cycles2Blocks(context, cycles);
  console.log("planMain", "blocks2Tasks");
  const tasks = blocks2Tasks(context, blocks);
  console.log("planMain", "blocks2Tasks returned");
  return { cycles, blocks, tasks };
}

function cycles2Blocks(context: PlanningContext, schedules: CycleSchedule[]): BlockSlot[] {
  const blocks = schedules.flatMap((cycle) => {
    const { cycleType, startDate, endDate } = cycle;
    const cycle2ExamFocus = cycleType2ExamFocus(cycleType);
    const subjects = context.subjects.filter((subject) => subject.examFocus === cycle2ExamFocus);

    // if MainsOnly or BothExams, then bring Optional to the front of the subject array
    const reorderedSubjects = (cycle2ExamFocus === "MainsOnly" || cycle2ExamFocus === "BothExams") ?
      [context.optionalSubject, ...subjects] : subjects;
      
    const numParallel = 2;
    // reorder subjects
    const blkConstraints: BlockAllocConstraints = {
      cycleType,
      relativeAllocationWeights: context.relativeAllocationWeights,
      numParallel,
      workingHoursPerDay: context.constraints.workingHoursPerDay,
      catchupDay: context.constraints.catchupDay,
      testDay: context.constraints.testDay,
    }
    console.log("cycles2Blocks", "Calling planBlocks");
    return planBlocks(dayjs(startDate), dayjs(endDate), reorderedSubjects, blkConstraints);
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

function blocks2Tasks(context: PlanningContext, blocks: BlockSlot[]): S2Task[] {
  const tasks = blocks.flatMap((block) => {
    const { cycleType } = block;
    const { subject, from, to } = block;
    const taskPlanConstraints: S2Constraints = {
      cycleType,
      dayMaxMinutes: context.constraints.workingHoursPerDay * 60 * 1.1,
      dayMinMinutes: context.constraints.workingHoursPerDay * 60 * 0.9,
      catchupDay: context.constraints.catchupDay,
      testDay: context.constraints.testDay,
      testMinutes: context.constraints.testMinutes,
      taskEffortSplit: cycleTypeToTaskEffortSplit(cycleType),
    }
    return planSubjectTasks(from, to, subject, taskPlanConstraints);
  });
  return tasks;
}

const BASE_TASK_RATIOS = {
  'C1': { [S2SlotType.STUDY]: 1.0, [S2SlotType.PRACTICE]: 0, [S2SlotType.REVISION]: 0 },
  'C2': { [S2SlotType.STUDY]: 0.6, [S2SlotType.PRACTICE]: 0.2, [S2SlotType.REVISION]: 0.2 },
  'C3': { [S2SlotType.STUDY]: 0.7, [S2SlotType.PRACTICE]: 0.1, [S2SlotType.REVISION]: 0.2 },
  'C4': { [S2SlotType.STUDY]: 0.2, [S2SlotType.PRACTICE]: 0.4, [S2SlotType.REVISION]: 0.4 },
  'C5': { [S2SlotType.STUDY]: 0.1, [S2SlotType.PRACTICE]: 0.5, [S2SlotType.REVISION]: 0.4 },
  'C5.b': { [S2SlotType.STUDY]: 0.1, [S2SlotType.PRACTICE]: 0.5, [S2SlotType.REVISION]: 0.4 },
  'C6': { [S2SlotType.STUDY]: 0.2, [S2SlotType.PRACTICE]: 0.3, [S2SlotType.REVISION]: 0.5 },
  'C7': { [S2SlotType.STUDY]: 0.1, [S2SlotType.PRACTICE]: 0.4, [S2SlotType.REVISION]: 0.5 },
  'C8': { [S2SlotType.STUDY]: 0.8, [S2SlotType.PRACTICE]: 0.1, [S2SlotType.REVISION]: 0.1 }
};


function cycleTypeToTaskEffortSplit(cycleType: CycleType): Record<number, number> {
  // Get base ratios for the cycle type
  return BASE_TASK_RATIOS[cycleType];
}
