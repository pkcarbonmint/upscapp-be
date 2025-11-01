import type { Dayjs } from "dayjs";
import { S2Constraints, S2Slot, S2SlotType, S2Subject, S2Task, S2Topic, S2TopicWithMinutes, S2WeekDay } from "./types";

export function planSubjectTasks(
  from: Dayjs,
  to: Dayjs,
  subject: S2Subject,
  constraints: S2Constraints,
): Omit<S2Task, 'blockId'>[] {
  // console.log(`planSubjectTasks: Called for ${subject.subjectCode} from ${from.format('YYYY-MM-DD HH:mm')} to ${to.format('YYYY-MM-DD HH:mm')}`);
  // console.log(`planSubjectTasks: Subject has ${subject.topics.length} topics`);
  // console.log(`planSubjectTasks: Subject baseline minutes: ${subject.baselineMinutes}`);

  if (to.isBefore(from)) {
    throw new Error('to date must be after from date');
  }

  if (subject.topics.length === 0) {
    throw new Error('subject must have at least one topic');
  }

  if (constraints.dayMinMinutes > constraints.dayMaxMinutes) {
    throw new Error('day min minutes must be less than day max minutes');
  }

  // Validate task effort split sums to 1
  const effortSum = Object.values(constraints.taskEffortSplit).reduce((a, b) => a + b, 0);
  if (Math.abs(effortSum - 1) > 0.001) {
    throw new Error('Task effort split must sum to 1');
  }

  // determine minutes for each topic, if its not set
  const topicsWithMinutes: S2TopicWithMinutes[] = determineTopicMinutes(subject, constraints);
  // console.log(`planSubjectTasks: Topics with minutes:`, topicsWithMinutes.map(t => ({ code: t.code, minutes: t.baselineMinutes })));

  const timeAvailable = calcAvailableTime(from, to, constraints);
  // console.log(`planSubjectTasks: Time available: ${timeAvailable} minutes`);

  const sortedTopics = sortTopics(topicsWithMinutes);

  // For single-day blocks, don't filter topics by available time - create tasks for available time
  const totalMinutes = to.diff(from, 'minutes');
  let finalTopics: S2TopicWithMinutes[];

  if (totalMinutes <= 24 * 60) {
    // console.log(`planSubjectTasks: Single-day block, using all topics without filtering`);
    finalTopics = sortedTopics;
  } else {
    // filter topics to fit within available time
    const filteredTopics = filterTopicsByAvailableTime(sortedTopics, timeAvailable);
    // console.log(`planSubjectTasks: Filtered topics: ${filteredTopics.length}`);

    // If no topics fit, create a minimal subject with available time
    finalTopics = filteredTopics.length > 0 ? filteredTopics : createMinimalTopics(subject, timeAvailable);
  }

  // console.log(`planSubjectTasks: Final topics: ${finalTopics.length}`);

  const subjWithSortedTopics = { ...subject, topics: finalTopics };
  // console.log(`planSubjectTasks: About to call createTasks_v1 with ${finalTopics.length} topics`);
  // finalTopics.forEach((topic, index) => {
  // console.log(`planSubjectTasks: Final topic ${index}: ${topic.code}, baselineMinutes=${topic.baselineMinutes}`);
  // });
  const tasks = createTasks_v2(subjWithSortedTopics, finalTopics, from, to, constraints);
  // console.log(`planSubjectTasks: Generated ${tasks.length} tasks`);
  return tasks;
}


function filterTopicsByAvailableTime(topics: S2TopicWithMinutes[], availableTime: number): S2TopicWithMinutes[] {
  // console.log(`filterTopicsByAvailableTime: Called with ${topics.length} topics, availableTime=${availableTime}`);
  // topics.forEach((topic, index) => {
  //   console.log(`filterTopicsByAvailableTime: Input topic ${index}: ${topic.code}, baselineMinutes=${topic.baselineMinutes}`);
  // });

  const result = topics.reduce((acc: { filteredTopics: S2TopicWithMinutes[], usedTime: number }, topic) => {
    // console.log(`filterTopicsByAvailableTime: Processing topic ${topic.code}, baselineMinutes=${topic.baselineMinutes}, usedTime=${acc.usedTime}, availableTime=${availableTime}`);
    if (acc.usedTime + topic.baselineMinutes <= availableTime) {
      // console.log(`filterTopicsByAvailableTime: Adding topic ${topic.code} to filtered list`);
      return {
        filteredTopics: [...acc.filteredTopics, topic],
        usedTime: acc.usedTime + topic.baselineMinutes
      };
    }
    // console.log(`filterTopicsByAvailableTime: Skipping topic ${topic.code} - would exceed available time`);
    return acc;
  }, { filteredTopics: [], usedTime: 0 });

  // console.log(`filterTopicsByAvailableTime: Filtered ${result.filteredTopics.length} topics, usedTime=${result.usedTime}`);

  // If there's extra time available, extend topics proportionally
  const remainingTime = availableTime - result.usedTime;
  // console.log(`filterTopicsByAvailableTime: remainingTime=${remainingTime}`);

  if (remainingTime > 0 && result.filteredTopics.length > 0) {
    // console.log(`filterTopicsByAvailableTime: Extending topics proportionally`);
    // Calculate total priority weight for proportional distribution
    const totalWeight = result.filteredTopics.reduce((sum, topic) => {
      const maxPriority = topic.subtopics.length > 0 ? Math.max(...topic.subtopics.map(st => st.priorityLevel)) : 1;
      const essentialBonus = topic.subtopics.some(st => st.isEssential) ? 2 : 1;
      return sum + (maxPriority * essentialBonus);
    }, 0);

    // console.log(`filterTopicsByAvailableTime: totalWeight=${totalWeight}`);

    // Extend each topic proportionally
    const extendedTopics = result.filteredTopics.map(topic => {
      const maxPriority = topic.subtopics.length > 0 ? Math.max(...topic.subtopics.map(st => st.priorityLevel)) : 1;
      const essentialBonus = topic.subtopics.some(st => st.isEssential) ? 2 : 1;
      const weight = maxPriority * essentialBonus;
      const additionalMinutes = Math.floor((remainingTime * weight) / totalWeight);

      // console.log(`filterTopicsByAvailableTime: Extending topic ${topic.code}: original=${topic.baselineMinutes}, additional=${additionalMinutes}, new=${topic.baselineMinutes + additionalMinutes}`);

      return {
        ...topic,
        baselineMinutes: topic.baselineMinutes + additionalMinutes
      };
    });

    // console.log(`filterTopicsByAvailableTime: Returning ${extendedTopics.length} extended topics`);
    return extendedTopics;
  }

  // console.log(`filterTopicsByAvailableTime: Returning ${result.filteredTopics.length} filtered topics`);
  return result.filteredTopics;
}

function createMinimalTopics(subject: S2Subject, availableTime: number): S2TopicWithMinutes[] {
  // Create minimal topics when no topics fit in available time
  // Take the highest priority topics and allocate available time proportionally
  const sortedTopics = sortTopics(determineTopicMinutes(subject, {} as S2Constraints));
  if (sortedTopics.length === 0) {
    return [];
  }

  // Calculate how many topics we can fit
  const avgTopicMinutes = availableTime / sortedTopics.length;
  const minTopicMinutes = 30; // Minimum 30 minutes per topic

  const topicsToInclude = sortedTopics.filter(topic => {
    const topicMinutes = topic.baselineMinutes || avgTopicMinutes;
    return topicMinutes >= minTopicMinutes;
  });

  if (topicsToInclude.length === 0) {
    // If no topics meet minimum, take the highest priority one
    return [{
      ...sortedTopics[0],
      baselineMinutes: availableTime
    }];
  }

  // Distribute available time among selected topics
  const timePerTopic = availableTime / topicsToInclude.length;
  return topicsToInclude.map(topic => ({
    ...topic,
    baselineMinutes: Math.max(minTopicMinutes, timePerTopic)
  }));
}

function sortTopics(topicsWithMinutes: S2TopicWithMinutes[]): S2TopicWithMinutes[] {
  // console.log(`sortTopics: Called with ${topicsWithMinutes.length} topics`);
  // topicsWithMinutes.forEach((topic, index) => {
  // console.log(`sortTopics: Input topic ${index}: ${topic.code}, baselineMinutes=${topic.baselineMinutes}`);
  // });

  const sorted = topicsWithMinutes.sort((a, b) => {
    const aEssential = a.subtopics.some(st => st.isEssential);
    const bEssential = b.subtopics.some(st => st.isEssential);

    if (aEssential && !bEssential) return -1;
    if (!aEssential && bEssential) return 1;

    const aMaxPriority = a.subtopics.length > 0 ? Math.max(...a.subtopics.map(st => st.priorityLevel)) : 1;
    const bMaxPriority = b.subtopics.length > 0 ? Math.max(...b.subtopics.map(st => st.priorityLevel)) : 1;
    return bMaxPriority - aMaxPriority; // Higher priority first
  });

  // console.log(`sortTopics: Returning ${sorted.length} topics`);
  // sorted.forEach((topic, index) => {
  // console.log(`sortTopics: Output topic ${index}: ${topic.code}, baselineMinutes=${topic.baselineMinutes}`);
  // });

  return sorted;
}

const slotSize = 30; // mins
function createTasks_v2(subject: S2Subject, sortedTopics: S2TopicWithMinutes[], from: Dayjs, to: Dayjs, constraints: S2Constraints): Omit<S2Task, 'blockId'>[] {
  const studySlots = allocateSlots(from, to, S2SlotType.STUDY, constraints, constraints.taskEffortSplit[S2SlotType.STUDY]);
  const revisionSlots = allocateSlots(from, to, S2SlotType.REVISION, constraints, constraints.taskEffortSplit[S2SlotType.REVISION]);
  const practiceSlots = allocateSlots(from, to, S2SlotType.PRACTICE, constraints, constraints.taskEffortSplit[S2SlotType.PRACTICE]);
  // console.log(`**** createTasks_v2: studySlots: ${studySlots.length}, revisionSlots: ${revisionSlots.length}, practiceSlots: ${practiceSlots.length}`);

  const studyTasks = distributeTopics(sortedTopics, studySlots, constraints.taskEffortSplit[S2SlotType.STUDY]);
  const revisionTasks = distributeTopics(sortedTopics, revisionSlots, constraints.taskEffortSplit[S2SlotType.REVISION]);
  const practiceTasks = distributeTopics(sortedTopics, practiceSlots, constraints.taskEffortSplit[S2SlotType.PRACTICE]);

  // console.log(`#### createTasks_v2: studyTasks: ${studyTasks.length}, revisionTasks: ${revisionTasks.length}, practiceTasks: ${practiceTasks.length}`);
  // Include explicit TEST tasks so weekly plans include test days; do not add per-subject catchup tasks
  const extraDayTasks: Omit<S2Task, 'blockId'>[] = [];
  const totalDays = to.diff(from, 'day');
  for (let i = 0; i < totalDays; i++) {
    const date = from.add(i, 'day');
    if (isTestDay(date, constraints.testDay)) {
      if (constraints.testMinutes > 0) {
        const testTask = {
          topicCode: subject.subjectCode+'-TEST-'+getNextId(),
          subjectCode: subject.subjectCode,
          taskType: S2SlotType.TEST,
          minutes: constraints.testMinutes,
          date
        };
        console.log(`[DEBUG planSubjectTasks] Creating TEST task for ${subject.subjectCode} on ${date.format('YYYY-MM-DD')} (block from ${from.format('YYYY-MM-DD')} to ${to.format('YYYY-MM-DD')})`);
        extraDayTasks.push(testTask);
      }
    } else if (isCatchupDay(date, constraints.catchupDay)) {
      // Do not add per-subject catchup tasks; a single catchup entry will be handled at presentation layer
      continue;
    }
  }

  const allTasks: Omit<S2Task, 'blockId'>[] = [...studyTasks, ...revisionTasks, ...practiceTasks, 
    ...extraDayTasks
  ];
  // // console.log(`#### createTasks_v2: allTasks: ${allTasks.length}`);

  verifyAllDays(from, to, allTasks);
  return allTasks;

  function verifyAllDays(from: Dayjs, to: Dayjs, tasks: Omit<S2Task, 'blockId'>[]) {
    const allDays = to.diff(from, 'day');
    // // console.log(`#### verifyAllDays: Checking ${allDays} days from ${from.format('YYYY-MM-DD')} to ${to.format('YYYY-MM-DD')}`);
    
    const taskDate2CountMap = new Map<string, number>();
    for (const task of tasks) {
      const key = task.date.format('YYYY-MM-DD');
      if (taskDate2CountMap.has(key)) {
        taskDate2CountMap.set(key, taskDate2CountMap.get(key)! + 1);
      } else {
        taskDate2CountMap.set(key, 1);
      }
    }

    // console.log(`#### verifyAllDays: Tasks cover ${taskDate2CountMap.size} unique days`);
    // console.log(`#### verifyAllDays: Covered days:`, Array.from(taskDate2CountMap.keys()).sort());

    let missngCOunt = 0;
    const missingDays: string[] = [];
    Array(allDays).fill(0).forEach((_, i) => {
      const date = from.add(i, 'day');
      const key = date.format('YYYY-MM-DD');
      // Ignore catchup-only days when checking coverage
      if (!taskDate2CountMap.has(key) && !isCatchupDay(date, constraints.catchupDay)) {
        missngCOunt++;
        missingDays.push(key);
        // console.log(`#### verifyAllDays: Day ${key} (${date.format('dddd')}) is not covered`);
        if (missngCOunt >= 3) {
/*
          const exitIfFailed = true;
          // Capture inputs for createTasks_v2 and write to JSON file for debugging
          const debugData = {
            timestamp: new Date().toISOString(),
            errorMessage: `Too many days are not covered: ${missngCOunt}`,
            inputs: {
              subject: {
                subjectCode: subject.subjectCode,
                subjectNname: subject.subjectNname,
                examFocus: subject.examFocus,
                topics: subject.topics.map(topic => ({
                  code: topic.code,
                  baselineMinutes: topic.baselineMinutes,
                  subtopics: topic.subtopics.map(subtopic => ({
                    code: subtopic.code,
                    name: subtopic.name,
                    baselineMinutes: subtopic.baselineMinutes,
                    isEssential: subtopic.isEssential,
                    priorityLevel: subtopic.priorityLevel
                  }))
                })),
                baselineMinutes: subject.baselineMinutes
              },
              sortedTopics: sortedTopics.map(topic => ({
                code: topic.code,
                baselineMinutes: topic.baselineMinutes,
                subtopics: topic.subtopics.map(subtopic => ({
                  code: subtopic.code,
                  name: subtopic.name,
                  baselineMinutes: subtopic.baselineMinutes,
                  isEssential: subtopic.isEssential,
                  priorityLevel: subtopic.priorityLevel
                }))
              })),
              from: from.format('YYYY-MM-DD HH:mm:ss'),
              to: to.format('YYYY-MM-DD HH:mm:ss'),
              constraints: {
                cycleType: constraints.cycleType,
                dayMaxMinutes: constraints.dayMaxMinutes,
                dayMinMinutes: constraints.dayMinMinutes,
                catchupDay: constraints.catchupDay,
                testDay: constraints.testDay,
                testMinutes: constraints.testMinutes,
                taskEffortSplit: constraints.taskEffortSplit
              }
            },
            generatedTasks: tasks.map(task => ({
              topicCode: task.topicCode,
              subjectCode: task.subjectCode,
              taskType: task.taskType,
              minutes: task.minutes,
              date: task.date.format('YYYY-MM-DD HH:mm:ss')
            })),
            missingDays: Array(allDays).fill(0).map((_, i) => {
              const date = from.add(i, 'day');
              const key = date.format('YYYY-MM-DD');
              return {
                date: key,
                isCovered: taskDate2CountMap.has(key)
              };
            })
          };

          // Write debug data to file
          const debugDir = path.join(__dirname, '..', 'debug');
          if (!fs.existsSync(debugDir)) {
            fs.mkdirSync(debugDir, { recursive: true });
          }
          
          const debugFile = path.join(debugDir, `createTasks_v2_debug_${Date.now()}.json`);
          fs.writeFileSync(debugFile, JSON.stringify(debugData, null, 2));
          
          console.log(`Debug data written to: ${debugFile}`);
          console.log(`Missing days count: ${missngCOunt}`);
          console.log(`Total days: ${allDays}`);
          console.log(`Tasks generated: ${tasks.length}`);
          console.log(`Debug data written to: ${debugFile}`);
          if (exitIfFailed) process.exit(1);
*/
          throw new Error(`Too many days are not covered: ${missngCOunt}.`);
        

        }
      }
    });
    
    // console.log(`#### verifyAllDays: Summary - ${missngCOunt} missing days out of ${allDays} total days`);
    if (missingDays.length > 0) {
      // console.log(`#### verifyAllDays: Missing days:`, missingDays);
    }
  }

  function distributeTopics(topics: S2TopicWithMinutes[], slots: S2Slot[], shareFraction: number): Omit<S2Task, 'blockId'>[] {
    let availableSlots = [...slots];
    // console.log(`#### distributeTopics: Starting with ${topics.length} topics, ${availableSlots.length} slots, shareFraction=${shareFraction}`);
    
    const tasks: Omit<S2Task, 'blockId'>[] = [];
    
    // First pass: allocate slots based on topic requirements
    for (let topicIndex = 0; topicIndex < topics.length; topicIndex++) {
      const topic = topics[topicIndex];
      if (availableSlots.length === 0) {
        // console.log(`#### distributeTopics: No slots left for topic ${topicIndex} (${topic.code})`);
        break;
      }
      
      const minutesToAllocate = topic.baselineMinutes * shareFraction;
      const numSlotsNeeded = Math.floor(minutesToAllocate / slotSize);
      // console.log(`#### distributeTopics: Topic ${topicIndex} (${topic.code}) needs ${numSlotsNeeded} slots (${minutesToAllocate} minutes / ${slotSize})`);
      
      const slotsToUse = availableSlots.slice(0, numSlotsNeeded);
      availableSlots = availableSlots.slice(numSlotsNeeded);
      
      // console.log(`#### distributeTopics: Topic ${topicIndex} using ${slotsToUse.length} slots, ${availableSlots.length} slots remaining`);

      const topicTasks = slotsToUse.map((slot): Omit<S2Task, 'blockId'> => ({
        topicCode: topic.code,
        subjectCode: subject.subjectCode,
        taskType: slot.type,
        minutes: slot.minutes,
        date: slot.date,
      }));
      tasks.push(...topicTasks);
    }
    
    // Second pass: distribute remaining slots among topics to ensure all slots are used
    if (availableSlots.length > 0 && topics.length > 0) {
      // console.log(`#### distributeTopics: Distributing ${availableSlots.length} remaining slots among topics`);
      const remainingTasks = availableSlots.map((slot, slotIndex) => {
        const topic = topics[slotIndex % topics.length];
        return {
          topicCode: topic.code,
          subjectCode: subject.subjectCode,
          taskType: slot.type,
          minutes: slot.minutes,
          date: slot.date,
        };
      });
      tasks.push(...remainingTasks);
    }
    
    // console.log(`#### distributeTopics: Generated ${tasks.length} tasks, 0 slots unused`);
    
    const merged = mergeConsecutiveTasks(tasks);
    // console.log(`#### distributeTopics: After merging: ${merged.length} tasks`);
    return merged;
  }
  function mergeConsecutiveTasks(tasks: Omit<S2Task, 'blockId'>[]): Omit<S2Task, 'blockId'>[] {
    if (tasks.length === 0) return tasks;

    // Group slots by day + topic + taskType
    const groups = new Map<string, Omit<S2Task, 'blockId'>[]>();

    for (const t of tasks) {
      const key = `${t.date.format('YYYY-MM-DD')}-${t.topicCode}-${t.taskType}`;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(t);
    }

    // Merge slots in each group
    const merged: Omit<S2Task, 'blockId'>[] = [];
    for (const groupSlots of groups.values()) {
      const totalMinutes = groupSlots.reduce((sum, slot) => sum + slot.minutes, 0);
      merged.push({
        ...groupSlots[0],
        minutes: totalMinutes
      });
    }

    // Sort by date and time
    return merged.sort((a, b) => {
      const dateCompare = a.date.diff(b.date, 'day');
      if (dateCompare !== 0) return dateCompare;
      return a.date.diff(b.date, 'minutes');
    });
  }
}

function allocateSlots(from: Dayjs, to: Dayjs, slotType: S2SlotType, constraints: S2Constraints, shareFraction: number): S2Slot[] {
  const calendarDays = to.diff(from, 'day');
  // console.log(`**** allocateSlots: from=${from.format('YYYY-MM-DD')}, to=${to.format('YYYY-MM-DD')}, calendarDays=${calendarDays}, slotType=${slotType}, shareFraction=${shareFraction}`);
  
  const slots: S2Slot[] = Array(calendarDays).fill(0)
    .map((_, i) => from.add(i, 'day'))
    .map((date: Dayjs): S2Slot[] => {
      // Do not allocate study/revision/practice slots on test or catchup days
      if (isTestDay(date, constraints.testDay) || isCatchupDay(date, constraints.catchupDay)) {
        // console.log(`**** allocateSlots: ${date.format('YYYY-MM-DD')} (${date.format('dddd')}) - RESTRICTED day (test/catchup), skipping ${slotType} slots`);
        return [];
      }
      const availableMinutes = Math.floor(constraints.dayMaxMinutes * shareFraction);
      const slots = Math.floor(availableMinutes / slotSize);
      // console.log(`**** allocateSlots: ${date.format('YYYY-MM-DD')} (${date.format('dddd')}) - ${slotType} day: ${slots} slots (${availableMinutes} minutes)`);
      return Array(slots).fill(0).map((_, _i): S2Slot => {
        return { date: date, minutes: slotSize, type: slotType };
      });
    })
    .flat();

  // console.log(`**** allocateSlots: Created ${slots.length} slots total`);
  return slots;
}


function determineTopicMinutes(subject: S2Subject, _constraints: S2Constraints): S2TopicWithMinutes[] {

  const topicsWithoutMinutes: S2Topic[] = subject.topics.filter(hasNoBaselineMinutes);
  const topicsWithMinutes: S2Topic[] = subject.topics.filter(hasBaselineMinutes);

  // console.log(`determineTopicMinutes: Subject ${subject.subjectCode} has ${subject.topics.length} topics`);
  // console.log(`determineTopicMinutes: topicsWithoutMinutes: ${topicsWithoutMinutes.length}, topicsWithMinutes: ${topicsWithMinutes.length}`);
  // console.log(`determineTopicMinutes: subject.baselineMinutes: ${subject.baselineMinutes}`);

  const unknownAvailableMinutes = subject.baselineMinutes -
    topicsWithMinutes.reduce((acc, topic) => acc + getTopicBaselineMinutes(topic), 0);

  // console.log(`determineTopicMinutes: unknownAvailableMinutes: ${unknownAvailableMinutes}`);

  if (topicsWithoutMinutes.length === 0) {
    // console.log(`determineTopicMinutes: All topics have baseline minutes, returning as-is`);
    return topicsWithMinutes as S2TopicWithMinutes[];
  }
  const unknownAveAllocation = unknownAvailableMinutes / topicsWithoutMinutes.length;

  // console.log(`determineTopicMinutes: unknownAveAllocation: ${unknownAveAllocation}`);

  const allTopicsWithMinutes: S2TopicWithMinutes[] = subject.topics
    .map((topic) => ({ ...topic, baselineMinutes: topic.baselineMinutes ? topic.baselineMinutes : unknownAveAllocation }));

  // console.log(`determineTopicMinutes: Final topics with minutes:`);
  // allTopicsWithMinutes.forEach((topic, index) => {
  // console.log(`determineTopicMinutes: Topic ${index}: ${topic.code}, baselineMinutes=${topic.baselineMinutes}`);
  // });

  return allTopicsWithMinutes;
}

const hasNoBaselineMinutes = (topic: S2Topic) => topic.baselineMinutes === undefined;
const hasBaselineMinutes = (topic: S2Topic) => topic.baselineMinutes !== undefined;
const getTopicBaselineMinutes = (topic: S2Topic) => topic.baselineMinutes || 0;


function calcMinMinutesAvailable(availableDays: number, numCatchupDays: number, numTestDays: number, constraints: S2Constraints) {
  return constraints.dayMinMinutes * availableDays - numCatchupDays * constraints.dayMaxMinutes - numTestDays * constraints.testMinutes;
}

function calcMaxMinutesAvailable(availableDays: number, numCatchupDays: number, numTestDays: number, constraints: S2Constraints) {
  return constraints.dayMaxMinutes * availableDays - numCatchupDays * constraints.dayMaxMinutes - numTestDays * constraints.testMinutes;
}

function countCatchupDays(from: Dayjs, to: Dayjs, catchupDay: S2WeekDay) {

  if (to.isBefore(from)) {
    throw new Error('to date must be after from date');
  }

  const days = to.diff(from, 'day');
  // Check how many catchup days are there between from and to
  // use map and filter
  return Array(days).fill(0)
    .map((_, i) => from.add(i, 'day'))
    .filter((date) => date.day() === catchupDay)
    .length;
}

function countTestDays(from: Dayjs, to: Dayjs, testDay: S2WeekDay) {
  if (to.isBefore(from)) {
    throw new Error('to date must be after from date');
  }

  const days = to.diff(from, 'day');
  return Array(days).fill(0)
    .map((_, i) => from.add(i, 'day'))
    .filter((date) => date.day() === testDay)
    .length;
}

function isCatchupDay(date: Dayjs, catchupDay: S2WeekDay) {
  return date.day() === catchupDay;
}

function isTestDay(date: Dayjs, testDay: S2WeekDay) {
  return date.day() === testDay;
}

export function calcAvailableTime(from: Dayjs, to: Dayjs, constraints: S2Constraints) {
  if (to.isBefore(from)) {
    throw new Error('to date must be after from date');
  }

  const totalMinutes = to.diff(from, 'minutes');
  // For single-day blocks, use the actual block duration
  if (totalMinutes <= 24 * 60) {
    return totalMinutes;
  }

  // For multi-day blocks, use the original day-based calculation
  const availableDays = to.diff(from, 'day');
  const numCatchupDays = countCatchupDays(from, to, constraints.catchupDay);
  const numTestDays = countTestDays(from, to, constraints.testDay);

  const minMinutesAvailable = calcMinMinutesAvailable(availableDays, numCatchupDays, numTestDays, constraints);
  const maxMinutesAvailable = calcMaxMinutesAvailable(availableDays, numCatchupDays, numTestDays, constraints);
  const minutesAvailable = (minMinutesAvailable + maxMinutesAvailable) / 2;

  return minutesAvailable;
}

let nextId=0;
function getNextId(): string {
  nextId++;
  return ''+nextId;
}
