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
  // console.log(`planSubjectTasks: About to call createTasks with ${finalTopics.length} topics`);
  // finalTopics.forEach((topic, index) => {
    // console.log(`planSubjectTasks: Final topic ${index}: ${topic.code}, baselineMinutes=${topic.baselineMinutes}`);
  // });
  const tasks = createTasks(subjWithSortedTopics, finalTopics, from, to, constraints);
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

function createTasks(subject: S2Subject, sortedTopics: S2TopicWithMinutes[], from: Dayjs, to: Dayjs, constraints: S2Constraints): S2Task[] {
  // console.log(`createTasks: Called with ${sortedTopics.length} topics`);
  // sortedTopics.forEach((topic, index) => {
    // console.log(`createTasks: Topic ${index}: ${topic.code}, baselineMinutes=${topic.baselineMinutes}`);
  // });
  
  const totalMinutes = to.diff(from, 'minutes');
  
  // For single-day blocks, create tasks for the same day
  if (totalMinutes <= 24 * 60) {
    // console.log(`createTasks: Single-day block, creating tasks for ${from.format('YYYY-MM-DD')}`);
    
    // Calculate available minutes for this single day
    const availableMinutes = totalMinutes;
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

  const studySlots = studyDays.map((date) => allocateStudySlots(date, studyMinutesPerDay));
  const revisionSlots = studyDays.map((date) => allocateRevisionSlots(date, revisionMinutesPerDay));
  const practiceSlots = studyDays.map((date) => allocatePracticeSlots(date, practiceMinutesPerDay));

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
  
  // console.log(`distributeTopicsAcrossAllSlots: allSlots: ${allSlots.length}`);
  allSlots.forEach((slot, index) => {
    // console.log(`distributeTopicsAcrossAllSlots: Slot ${index}: type=${slot.type}, minutes=${slot.minutes}, date=${slot.date.format('YYYY-MM-DD')}`);
  });
  
  let topicIndex = 0;
  let remainingMinutes = topics[topicIndex]?.baselineMinutes || 0;
  
  // console.log(`distributeTopicsAcrossAllSlots: Initial topicIndex=${topicIndex}, remainingMinutes=${remainingMinutes}`);
  topics.forEach((topic, index) => {
    // console.log(`distributeTopicsAcrossAllSlots: Topic ${index}: ${topic.code}, baselineMinutes=${topic.baselineMinutes}`);
  });

  for (const slot of allSlots) {
    if (topicIndex >= topics.length) break;

    const topic = topics[topicIndex];
    const minutesToAllocate = Math.min(slot.minutes, remainingMinutes);

    // console.log(`distributeTopicsAcrossAllSlots: Processing slot type=${slot.type}, minutes=${slot.minutes}, topic=${topic.code}, remainingMinutes=${remainingMinutes}, minutesToAllocate=${minutesToAllocate}`);

    if (minutesToAllocate > 0) {
      allTasks.push({
        topicCode: topic.code,
        subjectCode: subject.subjectCode,
        taskType: slot.type,
        minutes: minutesToAllocate,
        date: slot.date,
      });

      remainingMinutes -= minutesToAllocate;

      if (remainingMinutes <= 0) {
        topicIndex++;
        remainingMinutes = topics[topicIndex]?.baselineMinutes || 0;
      }
    }
  }

  // console.log(`distributeTopicsAcrossAllSlots: Generated ${allTasks.length} tasks`);
  allTasks.forEach((task, index) => {
    // console.log(`distributeTopicsAcrossAllSlots: Task ${index}: type=${task.taskType}, minutes=${task.minutes}, topic=${task.topicCode}`);
  });

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
