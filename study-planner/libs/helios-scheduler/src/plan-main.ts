import dayjs from 'dayjs';
import { planBlocks } from './plan-blocks';
import { planCycles } from './plan-cycles';
import { BlockAllocConstraints, BlockSlot, CycleSchedule, CycleType, PlanningContext, S2Constraints, S2ExamFocus, S2SlotType, S2Subject, S2Task, ScenarioResult } from "./types";
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
  const blocks = cycles2Blocks(context, cycles)
  .map((block, index) => {
    block.id = ''+index; return block;
  });
  // console.log("planMain", "blocks2Tasks");
  const tasks = blocks2Tasks(context, blocks);
  const feb01Tasks = tasks.filter(task => task.date.format('YYYY-MM-DD') === '2026-02-01');
  console.log(`\nFeb 01 tasks: ${JSON.stringify(feb01Tasks, null, 2)}`);
  // console.log("planMain", "blocks2Tasks returned");
  return { cycles, blocks, tasks };
}

function filterSubjects(subjects: S2Subject[], cycleType: CycleType): S2Subject[] {
  return subjects.filter(isIncludeSubjectInCycle(cycleType));
}

function isIncludeSubjectInCycle(cycleType: CycleType) {
  return (cycleType === CycleType.C1) ? c1SubjectFilter : nonC1SubjectFilter;

  function c1SubjectFilter(subject: S2Subject): boolean {
    // console.log("C1 - includeSubject", "subject", subject.subjectCode, "isNCERT", subject.isNCERT);
    return subject.isNCERT ?? false;
  }
  function nonC1SubjectFilter(subject: S2Subject): boolean {
    // Filter subjects based on cycle exam focus
    // PrelimsOnly cycles should include PrelimsOnly and BothExams subjects
    // MainsOnly cycles should include MainsOnly and BothExams subjects  
    // BothExams cycles should include BothExams subjects
    const cycleFocus = cycleType2ExamFocus(cycleType);
    if (cycleFocus === "PrelimsOnly") {
      return subject.examFocus === "PrelimsOnly" || subject.examFocus === "BothExams";
    } else if (cycleFocus === "MainsOnly") {
      return subject.examFocus === "MainsOnly" || subject.examFocus === "BothExams";
    } else if (cycleFocus === "BothExams") {
      return subject.examFocus === "BothExams";
    }
    return false;
  }
}

function reorderSubjects(subjects: S2Subject[], optionalSubject: S2Subject, cycleFocus: S2ExamFocus): S2Subject[] {
  // if MainsOnly or BothExams, then bring Optional to the front of the subject array
  return (cycleFocus === "MainsOnly" || cycleFocus === "BothExams") ?
    [optionalSubject, ...subjects] : subjects;
}


export function cycles2Blocks(context: PlanningContext, cycles: CycleSchedule[]): BlockSlot[] {
  const blocks = cycles.flatMap((cycle) => {
    const { cycleType, startDate, endDate } = cycle;

    const cycle2ExamFocus = cycleType2ExamFocus(cycleType);
    function dedupFilter(subject: S2Subject): boolean {
      return subject.subjectCode !== context.constraints.optionalSubjectCode;
    }
    const filteredSubjects = filterSubjects(context.subjects, cycleType)
      .filter(dedupFilter);
    const reorderedSubjects = reorderSubjects(filteredSubjects, context.optionalSubject, cycle2ExamFocus);
    // console.log("cycles2Blocks", cycleType, "unfilteredSubjects", context.subjects, "reorderedSubjects", reorderedSubjects);
    // console.log("cycles2Blocks", cycleType, "unfilteredSubjects", context.subjects.length, "reorderedSubjects", reorderedSubjects.length);
    const numParallel = 2;
    // reorder subjects
    const blkConstraints: BlockAllocConstraints = {
      cycleType,
      relativeAllocationWeights: context.relativeAllocationWeights,
      numParallel,
      workingMinutesPerDay: context.constraints.workingHoursPerDay * 60,
      catchupDay: context.constraints.catchupDay,
      testDay: context.constraints.testDay,
      testMinutes: context.constraints.testMinutes,
    }
    // check if we have duplicate subjects
    const duplicateSubjects = reorderedSubjects.filter((subject, index, self) =>
      self.findIndex(t => t.subjectCode === subject.subjectCode) !== index
    );
    if (duplicateSubjects.length > 0) {
      throw new Error(`Duplicate subjects found: ${duplicateSubjects.map(s => s.subjectCode).join(', ')}`);
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

function planOneBlock(context: PlanningContext, block: BlockSlot, index: number): S2Task[] {
  const { cycleType } = block;
  const { subject, from, to } = block;
  const taskEffortSplit = cycleTypeToTaskEffortSplit(cycleType);
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

  const blockTasks = planSubjectTasks(from, to, subject, taskPlanConstraints);
  // console.log(`blocks2Tasks: Block ${index + 1} generated ${blockTasks.length} tasks`);
  const testTasks = blockTasks.filter(t => t.taskType === S2SlotType.TEST);
  if (testTasks.length > 0) {
    console.log(`[DEBUG blocks2Tasks] Block ${index + 1} (${subject.subjectCode}, ${from.format('YYYY-MM-DD')} to ${to.format('YYYY-MM-DD')}) generated ${testTasks.length} test task(s):`);
    testTasks.forEach(task => {
      console.log(`  - [${block.id}]Test task on ${task.date.format('YYYY-MM-DD')} for ${task.subjectCode} (${task.minutes} minutes)`);
    });
  }
  const finaltasks = blockTasks.map(task => ({ ...task, blockId: block.id }));

  // verify duplicate test tasks here
  const duplicateTestTasks = finaltasks.filter(t => t.taskType === S2SlotType.TEST).filter((t, index, self) =>
    self.findIndex(t2 => t2.date.isSame(t.date) && t2.subjectCode === t.subjectCode) !== index
  );
  if (duplicateTestTasks.length > 0) {
    throw new Error(`Duplicate test tasks found: ${duplicateTestTasks.map(t => t.date.format('YYYY-MM-DD') + ' ' + t.subjectCode).join(', ')}`);
  }
  
  return finaltasks;
}


function blocks2Tasks(context: PlanningContext, blocks: BlockSlot[]): S2Task[] {
  // console.log(`blocks2Tasks: Processing ${blocks.length} blocks`);
  const tasks = blocks.flatMap((block, index) => planOneBlock(context, block, index));
  return dedupTestTasks(tasks);
}

function dedupTestTasks(tasks: S2Task[]): S2Task[] {
  // Deduplicate test tasks by date+subject (same subject should only have one test per day)
  console.log(`[DEBUG blocks2Tasks] Before deduplication: ${tasks.length} total tasks`);
  const testTasksBefore = tasks.filter(t => t.taskType === S2SlotType.TEST);
  console.log(`[DEBUG blocks2Tasks] Before deduplication: ${testTasksBefore.length} test tasks`);

  const testTaskMap = new Map<string, S2Task>();
  const nonTestTasks: S2Task[] = [];

  for (const task of tasks) {
    if (task.taskType === S2SlotType.TEST) {
      const key = `${task.date.format('YYYY-MM-DD')}|${task.subjectCode}`;
      if (testTaskMap.has(key)) {
        const existing = testTaskMap.get(key)!;
        console.log(`[DEBUG blocks2Tasks] Found duplicate test task: ${key}`);
        console.log(`  Existing: blockId=${existing.blockId}, date=${existing.date.format('YYYY-MM-DD')}, minutes=${existing.minutes}`);
        console.log(`  Duplicate: blockId=${task.blockId}, date=${task.date.format('YYYY-MM-DD')}, minutes=${task.minutes}`);
        // Keep the first one encountered, or the one with more minutes
        if (task.minutes > existing.minutes) {
          testTaskMap.set(key, task);
        }
      } else {
        testTaskMap.set(key, task);
      }
    } else {
      nonTestTasks.push(task);
    }
  }

  const deduplicatedTasks = [...nonTestTasks, ...Array.from(testTaskMap.values())];
  const testTasksAfter = deduplicatedTasks.filter(t => t.taskType === S2SlotType.TEST);
  console.log(`[DEBUG blocks2Tasks] After deduplication: ${deduplicatedTasks.length} total tasks, ${testTasksAfter.length} test tasks`);
  console.log(`[DEBUG blocks2Tasks] Removed ${testTasksBefore.length - testTasksAfter.length} duplicate test tasks`);

  // console.log(`blocks2Tasks: Total tasks generated: ${tasks.length}`);
  return deduplicatedTasks;
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
