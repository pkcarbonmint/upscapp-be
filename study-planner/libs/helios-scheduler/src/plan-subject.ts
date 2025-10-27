import type { Dayjs } from "dayjs";
import { S2Constraints, S2Slot, S2SlotType, S2Subject, S2Task, S2Topic, S2TopicWithMinutes, S2WeekDay } from "./types";

export function planSubjectTasks(
  from: Dayjs,
  to: Dayjs,
  subject: S2Subject,
  constraints: S2Constraints,
): S2Task[] {
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

//@ts-ignore
function createTasks_v1(subject: S2Subject, sortedTopics: S2TopicWithMinutes[], from: Dayjs, to: Dayjs, constraints: S2Constraints): S2Task[] {
  // console.log(`createTasks: Called with ${sortedTopics.length} topics`);
  // sortedTopics.forEach((topic, index) => {
  // console.log(`createTasks: Topic ${index}: ${topic.code}, baselineMinutes=${topic.baselineMinutes}`);
  // });
  const totalMinutes = to.diff(from, 'minutes');

  // For single-day blocks, create tasks for the same day
  if (totalMinutes <= 24 * 60) {
    // console.log(`createTasks: Single-day block, creating tasks for ${from.format('YYYY-MM-DD')}`);

    // Calculate available minutes for this single day
    const availableMinutes = Math.min(totalMinutes, constraints.dayMaxMinutes);
    const studyMinutes = Math.round(availableMinutes * constraints.taskEffortSplit[S2SlotType.STUDY]);
    const revisionMinutes = Math.round(availableMinutes * constraints.taskEffortSplit[S2SlotType.REVISION]);
    const practiceMinutes = Math.round(availableMinutes * constraints.taskEffortSplit[S2SlotType.PRACTICE]);

    // console.log(`createTasks: Single-day available minutes: ${availableMinutes}, study: ${studyMinutes}, revision: ${revisionMinutes}, practice: ${practiceMinutes}`);

    // Create slots for this single day
    const studySlots = studyMinutes > 0 ? [allocateStudySlots(from, studyMinutes)] : [];
    const revisionSlots = revisionMinutes > 0 ? [allocateRevisionSlots(from, revisionMinutes)] : [];
    const practiceSlots = practiceMinutes > 0 ? [allocatePracticeSlots(from, practiceMinutes)] : [];

    // Distribute topics across slots
    const allTasks = distributeTopicsAcrossAllSlots(subject, sortedTopics, studySlots, revisionSlots, practiceSlots);
    // console.log(`createTasks: Single-day generated ${allTasks.length} tasks`);
    return allTasks;
  }

  // For multi-day blocks, use the original logic
  const numAvailableDays = to.diff(from, 'day');
  const numCatchupDays = countCatchupDays(from, to, constraints.catchupDay);
  const numTestDays = countTestDays(from, to, constraints.testDay);
  const allDates = Array(numAvailableDays).fill(0).map((_, i) => from.add(i, 'day'));

  // distribute among available days - 
  const catchupSlots: S2Slot[] = allDates.filter(date => isCatchupDay(date, constraints.catchupDay)).map((date) => allocateCatchupSlots(date, constraints.dayMaxMinutes));
  const testSlots: S2Slot[] = allDates.filter(date => isTestDay(date, constraints.testDay)).map((date) => allocateTestSlots(date, constraints.testMinutes));

  const minMinutesAvailable = calcMinMinutesAvailable(numAvailableDays, numCatchupDays, numTestDays, constraints);
  const maxMinutesAvailable = calcMaxMinutesAvailable(numAvailableDays, numCatchupDays, numTestDays, constraints);
  const averageMinutesAvailable = (minMinutesAvailable + maxMinutesAvailable) / 2;
  const studyMinutesAvailable = Math.round(averageMinutesAvailable * constraints.taskEffortSplit[S2SlotType.STUDY]);
  const revisionMinutesAvailable = Math.round(averageMinutesAvailable * constraints.taskEffortSplit[S2SlotType.REVISION]);
  const practiceMinutesAvailable = Math.round(averageMinutesAvailable * constraints.taskEffortSplit[S2SlotType.PRACTICE]);

  const studyDays = allDates.filter((date) => !isCatchupDay(date, constraints.catchupDay) && !isTestDay(date, constraints.testDay));
  const studyMinutesPerDay = studyDays.length > 0 ? Math.round(studyMinutesAvailable / studyDays.length) : 0;
  const revisionMinutesPerDay = studyDays.length > 0 ? Math.round(revisionMinutesAvailable / studyDays.length) : 0;
  const practiceMinutesPerDay = studyDays.length > 0 ? Math.round(practiceMinutesAvailable / studyDays.length) : 0;

  // Ensure daily minutes don't exceed dayMaxMinutes constraint
  const totalMinutesPerDay = studyMinutesPerDay + revisionMinutesPerDay + practiceMinutesPerDay;
  let finalStudyMinutesPerDay = studyMinutesPerDay;
  let finalRevisionMinutesPerDay = revisionMinutesPerDay;
  let finalPracticeMinutesPerDay = practiceMinutesPerDay;

  if (totalMinutesPerDay > constraints.dayMaxMinutes) {
    const scaleFactor = constraints.dayMaxMinutes / totalMinutesPerDay;
    finalStudyMinutesPerDay = Math.round(studyMinutesPerDay * scaleFactor);
    finalRevisionMinutesPerDay = Math.round(revisionMinutesPerDay * scaleFactor);
    finalPracticeMinutesPerDay = Math.round(practiceMinutesPerDay * scaleFactor);

  }

  const studySlots = studyDays.map((date) => allocateStudySlots(date, finalStudyMinutesPerDay));
  const revisionSlots = studyDays.map((date) => allocateRevisionSlots(date, finalRevisionMinutesPerDay));
  const practiceSlots = studyDays.map((date) => allocatePracticeSlots(date, finalPracticeMinutesPerDay));

  // Distribute topics across different slot types
  const allTasks = distributeTopicsAcrossAllSlots(subject, sortedTopics, studySlots, revisionSlots, practiceSlots);

  // Add catchup tasks for any remaining topics
  const catchupTasks: S2Task[] = catchupSlots.map((catchupSlot) => {
    return {
      topicCode: 'CATCHUP',
      subjectCode: subject.subjectCode,
      taskType: S2SlotType.CATCHUP,
      minutes: catchupSlot.minutes,
      date: catchupSlot.date,
    };
  });

  const testTasks: S2Task[] = testSlots.map((testSlot) => {
    return {
      topicCode: 'TEST',
      subjectCode: subject.subjectCode,
      taskType: S2SlotType.TEST,
      minutes: testSlot.minutes,
      date: testSlot.date,
    };
  });

  return [...allTasks, ...catchupTasks, ...testTasks];
}

const slotSize = 30; // mins
function createTasks_v2(subject: S2Subject, sortedTopics: S2TopicWithMinutes[], from: Dayjs, to: Dayjs, constraints: S2Constraints): S2Task[] {
  const studySlots = allocateSlots(from, to, S2SlotType.STUDY, constraints, constraints.taskEffortSplit[S2SlotType.STUDY]);
  const revisionSlots = allocateSlots(from, to, S2SlotType.REVISION, constraints, constraints.taskEffortSplit[S2SlotType.REVISION]);
  const practiceSlots = allocateSlots(from, to, S2SlotType.PRACTICE, constraints, constraints.taskEffortSplit[S2SlotType.PRACTICE]);
  console.log(`**** createTasks_v2: studySlots: ${studySlots.length}, revisionSlots: ${revisionSlots.length}, practiceSlots: ${practiceSlots.length}`);

  const studyTasks = distributeTopics(sortedTopics, studySlots, constraints.taskEffortSplit[S2SlotType.STUDY]);
  const revisionTasks = distributeTopics(sortedTopics, revisionSlots, constraints.taskEffortSplit[S2SlotType.REVISION]);
  const practiceTasks = distributeTopics(sortedTopics, practiceSlots, constraints.taskEffortSplit[S2SlotType.PRACTICE]);

  console.log(`#### createTasks_v2: studyTasks: ${studyTasks.length}, revisionTasks: ${revisionTasks.length}, practiceTasks: ${practiceTasks.length}`);
  // Include explicit TEST tasks so weekly plans include test days; do not add per-subject catchup tasks
  const extraDayTasks: S2Task[] = [];
  const totalDays = to.diff(from, 'day');
  for (let i = 0; i < totalDays; i++) {
    const date = from.add(i, 'day');
    if (isTestDay(date, constraints.testDay)) {
      if (constraints.testMinutes > 0) {
        extraDayTasks.push({
          topicCode: 'TEST',
          subjectCode: subject.subjectCode,
          taskType: S2SlotType.TEST,
          minutes: constraints.testMinutes,
          date
        });
      }
    } else if (isCatchupDay(date, constraints.catchupDay)) {
      // Do not add per-subject catchup tasks; a single catchup entry will be handled at presentation layer
      continue;
    }
  }

  const allTasks = [...studyTasks, ...revisionTasks, ...practiceTasks, ...extraDayTasks];
  console.log(`#### createTasks_v2: allTasks: ${allTasks.length}`);

  verifyAllDays(from, to, allTasks);
  return allTasks;

  function verifyAllDays(from: Dayjs, to: Dayjs, tasks: S2Task[]) {
    const allDays = to.diff(from, 'day');
    console.log(`#### verifyAllDays: Checking ${allDays} days from ${from.format('YYYY-MM-DD')} to ${to.format('YYYY-MM-DD')}`);
    
    const taskDate2CountMap = new Map<string, number>();
    for (const task of tasks) {
      const key = task.date.format('YYYY-MM-DD');
      if (taskDate2CountMap.has(key)) {
        taskDate2CountMap.set(key, taskDate2CountMap.get(key)! + 1);
      } else {
        taskDate2CountMap.set(key, 1);
      }
    }

    console.log(`#### verifyAllDays: Tasks cover ${taskDate2CountMap.size} unique days`);
    console.log(`#### verifyAllDays: Covered days:`, Array.from(taskDate2CountMap.keys()).sort());

    const exitIfFailed = true;
    let missngCOunt = 0;
    const missingDays: string[] = [];
    Array(allDays).fill(0).forEach((_, i) => {
      const date = from.add(i, 'day');
      const key = date.format('YYYY-MM-DD');
      // Ignore catchup-only days when checking coverage
      if (!taskDate2CountMap.has(key) && !isCatchupDay(date, constraints.catchupDay)) {
        missngCOunt++;
        missingDays.push(key);
        console.log(`#### verifyAllDays: Day ${key} (${date.format('dddd')}) is not covered`);
        if (exitIfFailed && missngCOunt >= 3) {
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

          // Log debug data to console (browser-compatible)
          console.log(`Debug data:`, debugData);
          console.log(`Missing days count: ${missngCOunt}`);
          console.log(`Total days: ${allDays}`);
          console.log(`Tasks generated: ${tasks.length}`);

          throw new Error(`Too many days are not covered: ${missngCOunt}. Check console for debug data.`);
        

        }
      }
    });
    
    console.log(`#### verifyAllDays: Summary - ${missngCOunt} missing days out of ${allDays} total days`);
    if (missingDays.length > 0) {
      console.log(`#### verifyAllDays: Missing days:`, missingDays);
    }
  }

  function distributeTopics(topics: S2TopicWithMinutes[], slots: S2Slot[], shareFraction: number): S2Task[] {
    let availableSlots = [...slots];
    console.log(`#### distributeTopics: Starting with ${topics.length} topics, ${availableSlots.length} slots, shareFraction=${shareFraction}`);
    
    const tasks: S2Task[] = [];
    
    // First pass: allocate slots based on topic requirements
    for (let topicIndex = 0; topicIndex < topics.length; topicIndex++) {
      const topic = topics[topicIndex];
      if (availableSlots.length === 0) {
        console.log(`#### distributeTopics: No slots left for topic ${topicIndex} (${topic.code})`);
        break;
      }
      
      const minutesToAllocate = topic.baselineMinutes * shareFraction;
      const numSlotsNeeded = Math.floor(minutesToAllocate / slotSize);
      console.log(`#### distributeTopics: Topic ${topicIndex} (${topic.code}) needs ${numSlotsNeeded} slots (${minutesToAllocate} minutes / ${slotSize})`);
      
      const slotsToUse = availableSlots.slice(0, numSlotsNeeded);
      availableSlots = availableSlots.slice(numSlotsNeeded);
      
      console.log(`#### distributeTopics: Topic ${topicIndex} using ${slotsToUse.length} slots, ${availableSlots.length} slots remaining`);

      const topicTasks = slotsToUse.map((slot): S2Task => ({
        topicCode: topic.code,
        subjectCode: subject.subjectCode,
        taskType: slot.type,
        minutes: slot.minutes,
        date: slot.date,
      }));
      tasks.push(...topicTasks);
    }
    
    // Second pass: distribute remaining slots among topics to ensure all slots are used
    if (availableSlots.length > 0) {
      console.log(`#### distributeTopics: Distributing ${availableSlots.length} remaining slots among topics`);
      let topicIndex = 0;
      for (const slot of availableSlots) {
        if (topics.length === 0) break;
        
        const topic = topics[topicIndex % topics.length];
        tasks.push({
          topicCode: topic.code,
          subjectCode: subject.subjectCode,
          taskType: slot.type,
          minutes: slot.minutes,
          date: slot.date,
        });
        topicIndex++;
      }
    }
    
    console.log(`#### distributeTopics: Generated ${tasks.length} tasks, 0 slots unused`);
    
    const merged = mergeConsecutiveTasks(tasks);
    console.log(`#### distributeTopics: After merging: ${merged.length} tasks`);
    return merged;
  }
  function mergeConsecutiveTasks(tasks: S2Task[]): S2Task[] {
    if (tasks.length === 0) return tasks;

    // Group slots by day + topic + taskType
    const groups = new Map<string, S2Task[]>();

    for (const t of tasks) {
      const key = `${t.date.format('YYYY-MM-DD')}-${t.topicCode}-${t.taskType}`;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(t);
    }

    // Merge slots in each group
    const merged: S2Task[] = [];
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
  console.log(`**** allocateSlots: from=${from.format('YYYY-MM-DD')}, to=${to.format('YYYY-MM-DD')}, calendarDays=${calendarDays}, slotType=${slotType}, shareFraction=${shareFraction}`);
  
  const slots: S2Slot[] = Array(calendarDays).fill(0)
    .map((_, i) => from.add(i, 'day'))
    .map((date: Dayjs): S2Slot[] => {
      // Do not allocate study/revision/practice slots on test or catchup days
      if (isTestDay(date, constraints.testDay) || isCatchupDay(date, constraints.catchupDay)) {
        console.log(`**** allocateSlots: ${date.format('YYYY-MM-DD')} (${date.format('dddd')}) - RESTRICTED day (test/catchup), skipping ${slotType} slots`);
        return [];
      }
      const availableMinutes = Math.floor(constraints.dayMaxMinutes * shareFraction);
      const slots = Math.floor(availableMinutes / slotSize);
      console.log(`**** allocateSlots: ${date.format('YYYY-MM-DD')} (${date.format('dddd')}) - ${slotType} day: ${slots} slots (${availableMinutes} minutes)`);
      return Array(slots).fill(0).map((_, _i): S2Slot => {
        return { date: date, minutes: slotSize, type: slotType };
      });
    })
    .flat();

  console.log(`**** allocateSlots: Created ${slots.length} slots total`);
  return slots;
}

// Helper function to distribute topics across all slot types
function distributeTopicsAcrossAllSlots(
  subject: S2Subject,
  topics: S2TopicWithMinutes[],
  studySlots: S2Slot[],
  revisionSlots: S2Slot[],
  practiceSlots: S2Slot[]
): S2Task[] {
  // console.log(`distributeTopicsAcrossAllSlots: Called for ${subject.subjectCode}`);
  // console.log(`distributeTopicsAcrossAllSlots: studySlots: ${studySlots.length}, revisionSlots: ${revisionSlots.length}, practiceSlots: ${practiceSlots.length}`);
  // console.log(`distributeTopicsAcrossAllSlots: topics: ${topics.length}`);

  const allTasks: S2Task[] = [];

  // Combine all slots with their types
  const allSlots = [
    ...studySlots.map(slot => ({ ...slot, type: S2SlotType.STUDY })),
    ...revisionSlots.map(slot => ({ ...slot, type: S2SlotType.REVISION })),
    ...practiceSlots.map(slot => ({ ...slot, type: S2SlotType.PRACTICE }))
  ];

  // If there are no slots or topics, nothing to schedule
  if (allSlots.length === 0 || topics.length === 0) {
    return [];
  }

  // Calculate total minutes available across all slots for this block
  const totalSlotMinutes = allSlots.reduce((sum, slot) => sum + slot.minutes, 0);
  if (totalSlotMinutes <= 0) {
    return [];
  }

  // Start from declared/extended baseline minutes for topics
  const declaredMinutes = topics.map(t => Math.max(0, t.baselineMinutes));
  const sumDeclared = declaredMinutes.reduce((a, b) => a + b, 0);

  let targetMinutesPerTopic = declaredMinutes.slice();

  if (sumDeclared === 0) {
    // Fallback to equal split
    targetMinutesPerTopic = topics.map(() => Math.floor(totalSlotMinutes / Math.max(1, topics.length)));
    // Fix rounding leftovers
    let leftover = totalSlotMinutes - targetMinutesPerTopic.reduce((a, b) => a + b, 0);
    let i = 0;
    while (leftover > 0) {
      targetMinutesPerTopic[i % targetMinutesPerTopic.length] += 1;
      leftover -= 1;
      i += 1;
    }
  } else if (sumDeclared > totalSlotMinutes) {
    // Not enough time for all declared minutes: scale down proportionally
    const scale = totalSlotMinutes / sumDeclared;
    targetMinutesPerTopic = declaredMinutes.map(m => Math.floor(m * scale));
    // Adjust for rounding
    let leftover = totalSlotMinutes - targetMinutesPerTopic.reduce((a, b) => a + b, 0);
    if (leftover > 0) {
      const indices = topics.map((_, i) => i).sort((a, b) => declaredMinutes[b] - declaredMinutes[a]);
      let p = 0;
      while (leftover > 0) {
        targetMinutesPerTopic[indices[p % indices.length]] += 1;
        leftover -= 1;
        p += 1;
      }
    }
  } else if (sumDeclared < totalSlotMinutes) {
    // Extra time available: distribute by topic priority (essential first, higher priority more)
    let extra = totalSlotMinutes - sumDeclared;
    const priorityWeights = topics.map(topic => {
      const maxPriority = topic.subtopics.length > 0 ? Math.max(...topic.subtopics.map(st => st.priorityLevel)) : 1;
      const essentialBonus = topic.subtopics.some(st => st.isEssential) ? 2 : 1;
      return maxPriority * essentialBonus;
    });
    let totalPriority = priorityWeights.reduce((a, b) => a + b, 0);
    if (totalPriority <= 0) {
      totalPriority = topics.length;
      for (let i = 0; i < priorityWeights.length; i++) priorityWeights[i] = 1;
    }
    const extraAlloc = topics.map((_, i) => Math.floor((extra * priorityWeights[i]) / totalPriority));
    // Fix rounding leftovers for extra
    let leftover = extra - extraAlloc.reduce((a, b) => a + b, 0);
    if (leftover > 0) {
      const indices = topics.map((_, i) => i).sort((a, b) => priorityWeights[b] - priorityWeights[a]);
      let p = 0;
      while (leftover > 0) {
        extraAlloc[indices[p % indices.length]] += 1;
        leftover -= 1;
        p += 1;
      }
    }
    targetMinutesPerTopic = targetMinutesPerTopic.map((m, i) => m + extraAlloc[i]);
  }

  // Group slots by day to enforce max topics per day
  const slotsByDate = new Map<string, { date: typeof allSlots[number]['date']; slots: S2Slot[] }>();
  for (const slot of allSlots) {
    const key = slot.date.format('YYYY-MM-DD');
    const entry = slotsByDate.get(key);
    if (entry) {
      entry.slots.push(slot);
    } else {
      slotsByDate.set(key, { date: slot.date, slots: [slot] });
    }
  }

  const sortedDays = Array.from(slotsByDate.values()).sort((a, b) => a.date.valueOf() - b.date.valueOf());

  // Pointer across topics so we progress through the list over days
  let topicCursor = 0;

  for (const day of sortedDays) {
    const daySlots = day.slots;

    // Pick topics with remaining minutes for this day
    const dayTopicIndices: number[] = [];
    const picked = new Set<number>();
    let attempts = 0;
    while (attempts < topics.length * 2) {
      // Advance cursor to a topic with remaining minutes
      let searched = 0;
      while (searched < topics.length && (targetMinutesPerTopic[topicCursor] <= 0 || picked.has(topicCursor))) {
        topicCursor = (topicCursor + 1) % topics.length;
        searched += 1;
      }
      if (searched >= topics.length && (targetMinutesPerTopic[topicCursor] <= 0 || picked.has(topicCursor))) {
        break; // no more topics with remaining minutes
      }
      dayTopicIndices.push(topicCursor);
      picked.add(topicCursor);
      // Move cursor forward for next pick next time
      topicCursor = (topicCursor + 1) % topics.length;
      attempts += 1;
    }

    if (dayTopicIndices.length === 0) {
      continue; // nothing to allocate for this day
    }

    // Check if we should maximize duration (when topics have equal targets)
    const topicTargets = dayTopicIndices.map(idx => targetMinutesPerTopic[idx]);
    const targetsAreExactlyEqual = Math.max(...topicTargets) === Math.min(...topicTargets);
    const shouldMaximizeDuration = topicTargets.length > 0 &&
      targetsAreExactlyEqual;

    // Allocate each day's slots maximizing topic duration
    let dayTopicPtr = 0; // points into dayTopicIndices

    for (const slot of daySlots) {
      let minutesLeftInSlot = slot.minutes;
      while (minutesLeftInSlot > 0 && dayTopicPtr < dayTopicIndices.length) {
        const topicIdx = dayTopicIndices[dayTopicPtr];
        if (shouldMaximizeDuration) {
          // Maximize duration: allocate ALL remaining time in this slot to current topic
          // Ignore target constraints - use all available time
          const alloc = minutesLeftInSlot;
          if (alloc > 0) {
            allTasks.push({
              topicCode: topics[topicIdx].code,
              subjectCode: subject.subjectCode,
              taskType: slot.type,
              minutes: alloc,
              date: slot.date,
            });
            targetMinutesPerTopic[topicIdx] -= alloc;
            minutesLeftInSlot -= alloc;
          }

          // Only move to next topic if current topic is completely finished
          if (targetMinutesPerTopic[topicIdx] <= 0) {
            dayTopicPtr += 1;
          }
        } else {
          // Original behavior: allocate fairly and move to next topic
          const remainingForTopic = targetMinutesPerTopic[topicIdx];

          if (remainingForTopic <= 0) {
            dayTopicPtr += 1;
            continue;
          }

          const alloc = Math.min(minutesLeftInSlot, remainingForTopic);
          if (alloc > 0) {
            allTasks.push({
              topicCode: topics[topicIdx].code,
              subjectCode: subject.subjectCode,
              taskType: slot.type,
              minutes: alloc,
              date: slot.date,
            });
            targetMinutesPerTopic[topicIdx] -= alloc;
            minutesLeftInSlot -= alloc;
          }

          // Move to next topic after each allocation
          dayTopicPtr += 1;
        }
      }
      // If we exhausted today's topics but slot still has minutes, leave unused
    }
  }

  return allTasks;
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


function createSlot(date: Dayjs, type: S2SlotType, minutes: number): S2Slot {
  return {
    date: date,
    type: type,
    minutes: minutes,
  };
}

function allocateStudySlots(date: Dayjs, studyMinutes: number) {
  return createSlot(date, S2SlotType.STUDY, studyMinutes);
}

function allocateRevisionSlots(date: Dayjs, revisionMinutes: number) {
  return createSlot(date, S2SlotType.REVISION, revisionMinutes);
}

function allocatePracticeSlots(date: Dayjs, practiceMinutes: number) {
  return createSlot(date, S2SlotType.PRACTICE, practiceMinutes);
}

function allocateCatchupSlots(date: Dayjs, catchupMinutes: number) {
  return createSlot(date, S2SlotType.CATCHUP, catchupMinutes);
}

function allocateTestSlots(date: Dayjs, testMinutes: number) {
  return createSlot(date, S2SlotType.TEST, testMinutes);
}
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
