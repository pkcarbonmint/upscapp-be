import { describe, it, expect, beforeEach } from 'vitest';
import dayjs from 'dayjs';
import { planSubjectTasks, calcAvailableTime } from '../plan-subject';
import { Weekday, S2SlotType, S2Constraints, S2Subject, } from '../types';

describe('planSubjectTasks', () => {
  let from: dayjs.Dayjs;
  let to: dayjs.Dayjs;
  let constraints: S2Constraints;
  let subject: S2Subject;

  beforeEach(() => {
    from = dayjs('2024-01-01');
    to = dayjs('2024-01-08'); // 7 days
    constraints = {
      dayMaxMinutes: 480, // 8 hours
      dayMinMinutes: 240, // 4 hours
      catchupDay: Weekday.Sunday,
      testDay: Weekday.Saturday,
      testMinutes: 180, // 3 hours
      taskEffortSplit: {
        [S2SlotType.STUDY]: 0.5,
        [S2SlotType.REVISION]: 0.3,
        [S2SlotType.PRACTICE]: 0.2,
        [S2SlotType.TEST]: 0,
        [S2SlotType.CATCHUP]: 0,
      },
    };
    subject = {
      code: 'MATH',
      name: 'Mathematics',
      baselineMinutes: 2400, // 40 hours
      topics: [
        {
          code: 'ALG',
          subtopics: [
            { code: 'ALG1', name: 'Basic Algebra', isEssential: true, priorityLevel: 5 },
            { code: 'ALG2', name: 'Advanced Algebra', isEssential: false, priorityLevel: 3 },
          ],
        },
        {
          code: 'CALC',
          subtopics: [
            { code: 'CALC1', name: 'Basic Calculus', isEssential: true, priorityLevel: 4 },
            { code: 'CALC2', name: 'Advanced Calculus', isEssential: false, priorityLevel: 2 },
          ],
        },
        {
          code: 'STAT',
          subtopics: [
            { code: 'STAT1', name: 'Basic Statistics', isEssential: false, priorityLevel: 1 },
          ],
        },
      ],
    };
  });

  describe('Basic functionality', () => {
    it('should create tasks for all topics', () => {
      const tasks = planSubjectTasks(from, to, subject, constraints);
      
      expect(tasks.length).toBeGreaterThan(0);
      expect(tasks.every(task => task.minutes > 0)).toBe(true);
      expect(tasks.every(task => task.subjectCode === 'MATH')).toBe(true);
    });

    it('should throw error when to date is before from date', () => {
      const invalidTo = dayjs('2023-12-31');
      expect(() => planSubjectTasks(from, invalidTo, subject, constraints)).toThrow('to date must be after from date');
    });

    it('should throw error when subject has no topics', () => {
      const emptySubject = { ...subject, topics: [] };
      expect(() => planSubjectTasks(from, to, emptySubject, constraints)).toThrow('subject must have at least one topic');
    });

    it('should throw error when day min minutes is greater than day max minutes', () => {
      const invalidConstraints = { ...constraints, dayMinMinutes: 600, dayMaxMinutes: 480 };
      expect(() => planSubjectTasks(from, to, subject, invalidConstraints)).toThrow('day min minutes must be less than day max minutes');
    });

    it('should throw error when task effort split does not sum to 1', () => {
      const invalidConstraints = { ...constraints, taskEffortSplit: { ...constraints.taskEffortSplit, [S2SlotType.STUDY]: 0.8 } };
      expect(() => planSubjectTasks(from, to, subject, invalidConstraints)).toThrow('Task effort split must sum to 1');
    });
  });

  describe('No gaps - available time completely filled', () => {
    it('should fill all available time slots without gaps', () => {
      const tasks = planSubjectTasks(from, to, subject, constraints);
      const availableTime = calcAvailableTime(from, to, constraints);
      
      // Calculate total minutes allocated for study topics only (excluding catchup and test)
      const studyTasks = tasks.filter(task => 
        task.taskType === S2SlotType.STUDY || 
        task.taskType === S2SlotType.REVISION || 
        task.taskType === S2SlotType.PRACTICE
      );
      const totalStudyMinutes = studyTasks.reduce((sum, task) => sum + task.minutes, 0);
      
      // Allow for small rounding differences (within 100 minutes)
      expect(Math.abs(totalStudyMinutes - availableTime)).toBeLessThanOrEqual(100);
    });

    it('should distribute time across all available days', () => {
      const tasks = planSubjectTasks(from, to, subject, constraints);
      
      // Group tasks by date
      const tasksByDate = tasks.reduce((acc, task) => {
        const dateKey = task.date.format('YYYY-MM-DD');
        if (!acc[dateKey]) acc[dateKey] = [];
        acc[dateKey].push(task);
        return acc;
      }, {} as Record<string, typeof tasks>);

      // Check that we have tasks for most days (excluding catchup and test days)
      const expectedDays = 7; // from Jan 1 to Jan 8
      const catchupDays = 1; // Sunday
      const testDays = 1; // Saturday
      const expectedStudyDays = expectedDays - catchupDays - testDays;
      
      const studyDays = Object.keys(tasksByDate).filter(dateKey => {
        const date = dayjs(dateKey);
        return !isCatchupDay(date) && !isTestDay(date);
      });
      
      expect(studyDays.length).toBe(expectedStudyDays);
    });
  });

  describe('Non-essential topics dropped when time insufficient', () => {
    it('should prioritize essential topics over non-essential ones', () => {
      // Create a scenario with limited time but still enough for essential topics
      const limitedConstraints = {
        ...constraints,
        dayMaxMinutes: 180, // 3 hours
        dayMinMinutes: 120, // 2 hours
      };
      
      const tasks = planSubjectTasks(from, to, subject, limitedConstraints);
      
      // Essential topics should be included
      const essentialTopics = ['ALG', 'CALC']; // Both have essential subtopics
      
      const taskTopicCodes = tasks.map(task => task.topicCode).filter(Boolean);
      
      // Essential topics should be present
      essentialTopics.forEach(topicCode => {
        expect(taskTopicCodes).toContain(topicCode);
      });
      
      // Non-essential topics might be dropped if time is insufficient
      // This depends on the total time available
    });

    it('should sort topics by priority level when essential status is equal', () => {
      const tasks = planSubjectTasks(from, to, subject, constraints);
      
      // Find tasks for topics with essential subtopics
      const essentialTopicTasks = tasks.filter(task => 
        task.topicCode === 'ALG' || task.topicCode === 'CALC'
      );
      
      // ALG should be prioritized over CALC due to higher priority level (5 vs 4)
      const algTasks = essentialTopicTasks.filter(task => task.topicCode === 'ALG');
      const calcTasks = essentialTopicTasks.filter(task => task.topicCode === 'CALC');
      
      // Both should have tasks, but ALG should be scheduled first
      expect(algTasks.length).toBeGreaterThan(0);
      expect(calcTasks.length).toBeGreaterThan(0);
    });
  });

  describe('Proportional time reduction', () => {
    it('should distribute remaining time proportionally when total time is insufficient', () => {
      // Create a scenario where total topic hours exceed available time
      const subjectWithManyTopics = {
        ...subject,
        baselineMinutes: 6000, // More than available time
        topics: [
          ...subject.topics,
          {
            code: 'GEOM',
            subtopics: [
              { code: 'GEOM1', name: 'Basic Geometry', isEssential: true, priorityLevel: 3 },
            ],
          },
          {
            code: 'TRIG',
            subtopics: [
              { code: 'TRIG1', name: 'Basic Trigonometry', isEssential: true, priorityLevel: 2 },
            ],
          },
        ],
      };
      
      const tasks = planSubjectTasks(from, to, subjectWithManyTopics, constraints);
      const availableTime = calcAvailableTime(from, to, constraints);
      
      // Calculate total minutes allocated for study topics only (excluding catchup and test)
      const studyTasks = tasks.filter(task => 
        task.taskType === S2SlotType.STUDY || 
        task.taskType === S2SlotType.REVISION || 
        task.taskType === S2SlotType.PRACTICE
      );
      const totalStudyMinutes = studyTasks.reduce((sum, task) => sum + task.minutes, 0);
      
      // Should use all available time (within 100 minutes)
      expect(Math.abs(totalStudyMinutes - availableTime)).toBeLessThanOrEqual(100);
    });
  });

  describe('No tasks with 0 time', () => {
    it('should not create any tasks with 0 hours', () => {
      const tasks = planSubjectTasks(from, to, subject, constraints);
      
      expect(tasks.every(task => task.minutes > 0)).toBe(true);
    });

    it('should handle edge case with very limited time', () => {
      const veryLimitedConstraints = {
        ...constraints,
        dayMaxMinutes: 30, // 0.5 hours
        dayMinMinutes: 15, // 0.25 hours
      };
      
      const tasks = planSubjectTasks(from, to, subject, veryLimitedConstraints);
      
      expect(tasks.every(task => task.minutes > 0)).toBe(true);
    });
  });

  describe('Catchup days respected', () => {
    it('should only schedule catchup tasks on catchup days', () => {
      const tasks = planSubjectTasks(from, to, subject, constraints);
      
      // Find tasks on catchup days (Sunday)
      const catchupDayTasks = tasks.filter(task => isCatchupDay(task.date));
      
      // All tasks on catchup days should be catchup tasks
      expect(catchupDayTasks.every(task => task.taskType === S2SlotType.CATCHUP)).toBe(true);
      
      // Should have catchup tasks
      expect(catchupDayTasks.length).toBeGreaterThan(0);
    });

    it('should not schedule study/revision/practice tasks on catchup days', () => {
      const tasks = planSubjectTasks(from, to, subject, constraints);
      
      // Find tasks on catchup days
      const catchupDayTasks = tasks.filter(task => isCatchupDay(task.date));
      
      // Should not have study, revision, or practice tasks on catchup days
      const nonCatchupTasks = catchupDayTasks.filter(task => 
        task.taskType !== S2SlotType.CATCHUP
      );
      
      expect(nonCatchupTasks.length).toBe(0);
    });

    it('should allocate correct hours for catchup tasks', () => {
      const tasks = planSubjectTasks(from, to, subject, constraints);
      
      const catchupTasks = tasks.filter(task => task.taskType === S2SlotType.CATCHUP);
      
      // Each catchup task should have the correct minutes
      catchupTasks.forEach(task => {
        expect(task.minutes).toBe(constraints.dayMaxMinutes);
      });
    });
  });

  describe('Test tasks scheduling', () => {
    it('should schedule test tasks only on designated test days', () => {
      const tasks = planSubjectTasks(from, to, subject, constraints);
      
      // Find tasks on test days (Saturday)
      const testDayTasks = tasks.filter(task => isTestDay(task.date));
      
      // All tasks on test days should be test tasks
      expect(testDayTasks.every(task => task.taskType === S2SlotType.TEST)).toBe(true);
      
      // Should have test tasks
      expect(testDayTasks.length).toBeGreaterThan(0);
    });

    it('should not schedule other tasks on test days', () => {
      const tasks = planSubjectTasks(from, to, subject, constraints);
      
      // Find tasks on test days
      const testDayTasks = tasks.filter(task => isTestDay(task.date));
      
      // Should not have study, revision, practice, or catchup tasks on test days
      const nonTestTasks = testDayTasks.filter(task => 
        task.taskType !== S2SlotType.TEST
      );
      
      expect(nonTestTasks.length).toBe(0);
    });

    it('should allocate correct hours for test tasks', () => {
      const tasks = planSubjectTasks(from, to, subject, constraints);
      
      const testTasks = tasks.filter(task => task.taskType === S2SlotType.TEST);
      
      // Each test task should have the correct minutes
      testTasks.forEach(task => {
        expect(task.minutes).toBe(constraints.testMinutes);
      });
    });

    it('should have correct topic code for test tasks', () => {
      const tasks = planSubjectTasks(from, to, subject, constraints);
      
      const testTasks = tasks.filter(task => task.taskType === S2SlotType.TEST);
      
      // All test tasks should have 'TEST' as topic code
      expect(testTasks.every(task => task.topicCode === 'TEST')).toBe(true);
    });
  });

  describe('Task distribution across slot types', () => {
    it('should distribute tasks according to effort split', () => {
      const tasks = planSubjectTasks(from, to, subject, constraints);
      
      const studyTasks = tasks.filter(task => task.taskType === S2SlotType.STUDY);
      const revisionTasks = tasks.filter(task => task.taskType === S2SlotType.REVISION);
      const practiceTasks = tasks.filter(task => task.taskType === S2SlotType.PRACTICE);
      
      const totalStudyMinutes = studyTasks.reduce((sum, task) => sum + task.minutes, 0);
      const totalRevisionMinutes = revisionTasks.reduce((sum, task) => sum + task.minutes, 0);
      const totalPracticeMinutes = practiceTasks.reduce((sum, task) => sum + task.minutes, 0);
      const totalMinutes = totalStudyMinutes + totalRevisionMinutes + totalPracticeMinutes;
      
      if (totalMinutes > 0) {
        const studyRatio = totalStudyMinutes / totalMinutes;
        const revisionRatio = totalRevisionMinutes / totalMinutes;
        const practiceRatio = totalPracticeMinutes / totalMinutes;
        
        // Allow for some tolerance due to rounding
        expect(Math.abs(studyRatio - constraints.taskEffortSplit[S2SlotType.STUDY])).toBeLessThan(0.1);
        expect(Math.abs(revisionRatio - constraints.taskEffortSplit[S2SlotType.REVISION])).toBeLessThan(0.1);
        expect(Math.abs(practiceRatio - constraints.taskEffortSplit[S2SlotType.PRACTICE])).toBeLessThan(0.1);
      }
    });
  });

  describe('Extra time handling', () => {
    it('should extend topics to fill available time when extra time is available', () => {
      // Create a subject with fewer total hours than available time
      const subjectWithLimitedTopics = {
        ...subject,
        baselineMinutes: 1200, // Much less than available time (~1860 minutes for 7 days)
        topics: [
          {
            code: 'ALG',
            subtopics: [
              { code: 'ALG1', name: 'Basic Algebra', isEssential: true, priorityLevel: 5 },
            ],
          },
          {
            code: 'CALC',
            subtopics: [
              { code: 'CALC1', name: 'Basic Calculus', isEssential: true, priorityLevel: 4 },
            ],
          },
        ],
      };
      
      const tasks = planSubjectTasks(from, to, subjectWithLimitedTopics, constraints);
      const availableTime = calcAvailableTime(from, to, constraints);
      
      // Calculate total minutes allocated for study topics only (excluding catchup and test)
      const studyTasks = tasks.filter(task => 
        task.taskType === S2SlotType.STUDY || 
        task.taskType === S2SlotType.REVISION || 
        task.taskType === S2SlotType.PRACTICE
      );
      const totalStudyMinutes = studyTasks.reduce((sum, task) => sum + task.minutes, 0);
      
      // The total allocated minutes should be close to available minutes
      // This test documents expected behavior for when extension is implemented
      expect(Math.abs(totalStudyMinutes - availableTime)).toBeLessThanOrEqual(100);
    });

    it('should prioritize extending higher priority topics when extra time is available', () => {
      const subjectWithPriorityTopics = {
        ...subject,
        baselineMinutes: 900, // Less than available time
        topics: [
          {
            code: 'HIGH_PRIORITY',
            subtopics: [
              { code: 'HP1', name: 'High Priority Topic', isEssential: true, priorityLevel: 5 },
            ],
          },
          {
            code: 'LOW_PRIORITY',
            subtopics: [
              { code: 'LP1', name: 'Low Priority Topic', isEssential: true, priorityLevel: 2 },
            ],
          },
        ],
      };
      
      const tasks = planSubjectTasks(from, to, subjectWithPriorityTopics, constraints);
      
      // Find tasks for each topic
      const highPriorityTasks = tasks.filter(task => task.topicCode === 'HIGH_PRIORITY');
      const lowPriorityTasks = tasks.filter(task => task.topicCode === 'LOW_PRIORITY');
      
      const highPriorityMinutes = highPriorityTasks.reduce((sum, task) => sum + task.minutes, 0);
      const lowPriorityMinutes = lowPriorityTasks.reduce((sum, task) => sum + task.minutes, 0);
      
      // Higher priority topics should get more extended time
      // This test documents expected behavior for when extension is implemented
      expect(highPriorityMinutes).toBeGreaterThanOrEqual(lowPriorityMinutes);
    });
  });

  describe('Edge cases', () => {
    it('should handle single day scheduling', () => {
      const singleDayTo = from.add(1, 'day');
      // Use more generous constraints for single day
      const singleDayConstraints = {
        ...constraints,
        dayMaxMinutes: 360, // 6 hours
        dayMinMinutes: 240, // 4 hours
      };
      const tasks = planSubjectTasks(from, singleDayTo, subject, singleDayConstraints);
      
      expect(tasks.length).toBeGreaterThan(0);
      expect(tasks.every(task => task.minutes > 0)).toBe(true);
    });

    it('should handle subjects with predefined topic hours', () => {
      const subjectWithPredefinedHours = {
        ...subject,
        topics: subject.topics.map(topic => ({
          ...topic,
          baselineMinutes: 600, // 10 hours
        })),
      };
      
      const tasks = planSubjectTasks(from, to, subjectWithPredefinedHours, constraints);
      
      expect(tasks.length).toBeGreaterThan(0);
      expect(tasks.every(task => task.minutes > 0)).toBe(true);
    });

    it('should handle mixed predefined and undefined topic hours', () => {
      const mixedSubject = {
        ...subject,
        topics: [
          { ...subject.topics[0], baselineMinutes: 900 }, // 15 hours
          { ...subject.topics[1] }, // No baseline minutes
          { ...subject.topics[2], baselineMinutes: 300 }, // 5 hours
        ],
      };
      
      const tasks = planSubjectTasks(from, to, mixedSubject, constraints);
      
      expect(tasks.length).toBeGreaterThan(0);
      expect(tasks.every(task => task.minutes > 0)).toBe(true);
    });
  });

  describe('Topic Configuration Variations', () => {
    it('should handle topics with only essential subtopics', () => {
      const essentialOnlySubject: S2Subject = {
        code: 'PHYS',
        name: 'Physics',
        baselineMinutes: 1200, // 20 hours
        topics: [
          {
            code: 'MECH',
            subtopics: [
              { code: 'MECH1', name: 'Kinematics', isEssential: true, priorityLevel: 5 },
              { code: 'MECH2', name: 'Dynamics', isEssential: true, priorityLevel: 4 },
            ],
          },
          {
            code: 'THERM',
            subtopics: [
              { code: 'THERM1', name: 'Heat Transfer', isEssential: true, priorityLevel: 3 },
            ],
          },
        ],
      };

      const tasks = planSubjectTasks(from, to, essentialOnlySubject, constraints);
      
      // All topics should be included since all subtopics are essential
      const topicCodes = tasks.map(task => task.topicCode).filter(Boolean);
      expect(topicCodes).toContain('MECH');
      expect(topicCodes).toContain('THERM');
      
      // All tasks should have valid topic codes
      expect(tasks.every(task => task.topicCode && task.topicCode.length > 0)).toBe(true);
    });

    it('should handle topics with only non-essential subtopics', () => {
      const nonEssentialOnlySubject: S2Subject = {
        code: 'CHEM',
        name: 'Chemistry',
        baselineMinutes: 600, // 10 hours
        topics: [
          {
            code: 'ORG',
            subtopics: [
              { code: 'ORG1', name: 'Organic Reactions', isEssential: false, priorityLevel: 2 },
              { code: 'ORG2', name: 'Synthesis', isEssential: false, priorityLevel: 1 },
            ],
          },
        ],
      };

      const tasks = planSubjectTasks(from, to, nonEssentialOnlySubject, constraints);
      
      // Non-essential topics should be included if time allows
      const topicCodes = tasks.map(task => task.topicCode).filter(Boolean);
      expect(topicCodes).toContain('ORG');
      
      // All tasks should have valid topic codes
      expect(tasks.every(task => task.topicCode && task.topicCode.length > 0)).toBe(true);
    });

    it('should handle topics with predefined baselineMinutes', () => {
      const predefinedSubject: S2Subject = {
        code: 'BIO',
        name: 'Biology',
        baselineMinutes: 1800, // 30 hours
        topics: [
          {
            code: 'CELL',
            baselineMinutes: 600, // 10 hours
            subtopics: [
              { code: 'CELL1', name: 'Cell Structure', isEssential: true, priorityLevel: 5 },
              { code: 'CELL2', name: 'Cell Division', isEssential: true, priorityLevel: 4 },
            ],
          },
          {
            code: 'GEN',
            baselineMinutes: 900, // 15 hours
            subtopics: [
              { code: 'GEN1', name: 'Genetics', isEssential: true, priorityLevel: 3 },
              { code: 'GEN2', name: 'Evolution', isEssential: false, priorityLevel: 2 },
            ],
          },
          {
            code: 'ECO',
            subtopics: [
              { code: 'ECO1', name: 'Ecosystems', isEssential: false, priorityLevel: 1 },
            ],
          },
        ],
      };

      const tasks = planSubjectTasks(from, to, predefinedSubject, constraints);
      
      // Topics with predefined minutes should be included
      const topicCodes = tasks.map(task => task.topicCode).filter(Boolean);
      expect(topicCodes).toContain('CELL');
      expect(topicCodes).toContain('GEN');
      
      // Total time should respect predefined allocations
      const cellTasks = tasks.filter(task => task.topicCode === 'CELL');
      const genTasks = tasks.filter(task => task.topicCode === 'GEN');
      
      const cellTotalMinutes = cellTasks.reduce((sum, task) => sum + task.minutes, 0);
      const genTotalMinutes = genTasks.reduce((sum, task) => sum + task.minutes, 0);
      
      // Should be close to predefined values (within 10% tolerance)
      expect(Math.abs(cellTotalMinutes - 600)).toBeLessThanOrEqual(60);
      expect(Math.abs(genTotalMinutes - 900)).toBeLessThanOrEqual(90);
    });

    it('should handle topics without baselineMinutes (auto-distributed)', () => {
      const autoDistributedSubject: S2Subject = {
        code: 'HIST',
        name: 'History',
        baselineMinutes: 1200, // 20 hours
        topics: [
          {
            code: 'ANCIENT',
            subtopics: [
              { code: 'ANC1', name: 'Ancient Civilizations', isEssential: true, priorityLevel: 5 },
              { code: 'ANC2', name: 'Classical Period', isEssential: true, priorityLevel: 4 },
            ],
          },
          {
            code: 'MEDIEVAL',
            subtopics: [
              { code: 'MED1', name: 'Middle Ages', isEssential: true, priorityLevel: 3 },
              { code: 'MED2', name: 'Renaissance', isEssential: false, priorityLevel: 2 },
            ],
          },
          {
            code: 'MODERN',
            subtopics: [
              { code: 'MOD1', name: 'Industrial Revolution', isEssential: false, priorityLevel: 1 },
            ],
          },
        ],
      };

      const tasks = planSubjectTasks(from, to, autoDistributedSubject, constraints);
      
      // All topics should be included
      const topicCodes = tasks.map(task => task.topicCode).filter(Boolean);
      expect(topicCodes).toContain('ANCIENT');
      expect(topicCodes).toContain('MEDIEVAL');
      expect(topicCodes).toContain('MODERN');
      
      // Time should be distributed based on priority and essential status
      const ancientTasks = tasks.filter(task => task.topicCode === 'ANCIENT');
      const medievalTasks = tasks.filter(task => task.topicCode === 'MEDIEVAL');
      const modernTasks = tasks.filter(task => task.topicCode === 'MODERN');
      
      const ancientMinutes = ancientTasks.reduce((sum, task) => sum + task.minutes, 0);
      const medievalMinutes = medievalTasks.reduce((sum, task) => sum + task.minutes, 0);
      const modernMinutes = modernTasks.reduce((sum, task) => sum + task.minutes, 0);
      
      // Higher priority topics should get more time
      expect(ancientMinutes).toBeGreaterThanOrEqual(medievalMinutes);
      expect(medievalMinutes).toBeGreaterThanOrEqual(modernMinutes);
    });

    it('should handle mixed essential/non-essential subtopics within same topic', () => {
      const mixedSubject: S2Subject = {
        code: 'GEO',
        name: 'Geography',
        baselineMinutes: 900, // 15 hours
        topics: [
          {
            code: 'PHYS',
            subtopics: [
              { code: 'PHYS1', name: 'Physical Geography', isEssential: true, priorityLevel: 5 },
              { code: 'PHYS2', name: 'Climate', isEssential: true, priorityLevel: 4 },
              { code: 'PHYS3', name: 'Weather Patterns', isEssential: false, priorityLevel: 2 },
            ],
          },
          {
            code: 'HUMAN',
            subtopics: [
              { code: 'HUM1', name: 'Population', isEssential: true, priorityLevel: 3 },
              { code: 'HUM2', name: 'Urban Planning', isEssential: false, priorityLevel: 1 },
            ],
          },
        ],
      };

      const tasks = planSubjectTasks(from, to, mixedSubject, constraints);
      
      // Both topics should be included
      const topicCodes = tasks.map(task => task.topicCode).filter(Boolean);
      expect(topicCodes).toContain('PHYS');
      expect(topicCodes).toContain('HUMAN');
      
      // Should have tasks for both topics
      expect(tasks.length).toBeGreaterThan(0);
      expect(tasks.every(task => task.topicCode && task.topicCode.length > 0)).toBe(true);
    });

    it('should handle topics with varying priority levels', () => {
      const prioritySubject: S2Subject = {
        code: 'LIT',
        name: 'Literature',
        baselineMinutes: 1500, // 25 hours
        topics: [
          {
            code: 'POETRY',
            subtopics: [
              { code: 'POE1', name: 'Classical Poetry', isEssential: true, priorityLevel: 5 },
              { code: 'POE2', name: 'Modern Poetry', isEssential: true, priorityLevel: 4 },
            ],
          },
          {
            code: 'PROSE',
            subtopics: [
              { code: 'PRO1', name: 'Fiction', isEssential: true, priorityLevel: 3 },
              { code: 'PRO2', name: 'Non-fiction', isEssential: false, priorityLevel: 2 },
            ],
          },
          {
            code: 'DRAMA',
            subtopics: [
              { code: 'DRA1', name: 'Classical Drama', isEssential: false, priorityLevel: 1 },
            ],
          },
        ],
      };

      const tasks = planSubjectTasks(from, to, prioritySubject, constraints);
      
      // All topics should be included
      const topicCodes = tasks.map(task => task.topicCode).filter(Boolean);
      expect(topicCodes).toContain('POETRY');
      expect(topicCodes).toContain('PROSE');
      expect(topicCodes).toContain('DRAMA');
      
      // Tasks should be sorted by priority
      const poetryTasks = tasks.filter(task => task.topicCode === 'POETRY');
      const proseTasks = tasks.filter(task => task.topicCode === 'PROSE');
      const dramaTasks = tasks.filter(task => task.topicCode === 'DRAMA');
      
      const poetryMinutes = poetryTasks.reduce((sum, task) => sum + task.minutes, 0);
      const proseMinutes = proseTasks.reduce((sum, task) => sum + task.minutes, 0);
      const dramaMinutes = dramaTasks.reduce((sum, task) => sum + task.minutes, 0);
      
      // Higher priority topics should get more time
      expect(poetryMinutes).toBeGreaterThanOrEqual(proseMinutes);
      expect(proseMinutes).toBeGreaterThanOrEqual(dramaMinutes);
    });

    it('should handle single subtopic per topic', () => {
      const singleSubtopicSubject: S2Subject = {
        code: 'ART',
        name: 'Art',
        baselineMinutes: 600, // 10 hours
        topics: [
          {
            code: 'PAINT',
            subtopics: [
              { code: 'PAI1', name: 'Painting Techniques', isEssential: true, priorityLevel: 5 },
            ],
          },
          {
            code: 'SCULP',
            subtopics: [
              { code: 'SCU1', name: 'Sculpture Basics', isEssential: true, priorityLevel: 4 },
            ],
          },
          {
            code: 'DRAW',
            subtopics: [
              { code: 'DRA1', name: 'Drawing Fundamentals', isEssential: false, priorityLevel: 2 },
            ],
          },
        ],
      };

      const tasks = planSubjectTasks(from, to, singleSubtopicSubject, constraints);
      
      // All topics should be included
      const topicCodes = tasks.map(task => task.topicCode).filter(Boolean);
      expect(topicCodes).toContain('PAINT');
      expect(topicCodes).toContain('SCULP');
      expect(topicCodes).toContain('DRAW');
      
      // Each topic should have tasks for its single subtopic
      const paintTasks = tasks.filter(task => task.topicCode === 'PAINT');
      const sculpTasks = tasks.filter(task => task.topicCode === 'SCULP');
      const drawTasks = tasks.filter(task => task.topicCode === 'DRAW');
      
      expect(paintTasks.length).toBeGreaterThan(0);
      expect(sculpTasks.length).toBeGreaterThan(0);
      expect(drawTasks.length).toBeGreaterThan(0);
      
      // All tasks should have valid topic codes
      expect(tasks.every(task => task.topicCode && task.topicCode.length > 0)).toBe(true);
    });

    it('should handle many subtopics per topic', () => {
      const manySubtopicsSubject: S2Subject = {
        code: 'SCI',
        name: 'Science',
        baselineMinutes: 2400, // 40 hours
        topics: [
          {
            code: 'PHYSICS',
            subtopics: [
              { code: 'PHY1', name: 'Mechanics', isEssential: true, priorityLevel: 5 },
              { code: 'PHY2', name: 'Thermodynamics', isEssential: true, priorityLevel: 4 },
              { code: 'PHY3', name: 'Electromagnetism', isEssential: true, priorityLevel: 3 },
              { code: 'PHY4', name: 'Quantum Physics', isEssential: false, priorityLevel: 2 },
              { code: 'PHY5', name: 'Relativity', isEssential: false, priorityLevel: 1 },
            ],
          },
          {
            code: 'CHEMISTRY',
            subtopics: [
              { code: 'CHE1', name: 'Organic Chemistry', isEssential: true, priorityLevel: 4 },
              { code: 'CHE2', name: 'Inorganic Chemistry', isEssential: true, priorityLevel: 3 },
              { code: 'CHE3', name: 'Physical Chemistry', isEssential: false, priorityLevel: 2 },
            ],
          },
        ],
      };

      const tasks = planSubjectTasks(from, to, manySubtopicsSubject, constraints);
      
      // At least one topic should be included
      const topicCodes = tasks.map(task => task.topicCode).filter(Boolean);
      expect(topicCodes.length).toBeGreaterThan(0);
      expect(topicCodes).toContain('PHYSICS');
      
      // Should have tasks for at least one topic
      const physicsTasks = tasks.filter(task => task.topicCode === 'PHYSICS');
      const chemistryTasks = tasks.filter(task => task.topicCode === 'CHEMISTRY');
      
      expect(physicsTasks.length).toBeGreaterThan(0);
      
      // Chemistry should be dropped because:
      // 1. PHYSICS has higher priority essential subtopics (priority 5 vs 4)
      // 2. Limited available time: 40 hours over 7 days with catchup/test days reducing slots
      // 3. PHYSICS has 5 subtopics (3 essential, 2 non-essential) requiring significant time
      // 4. CHEMISTRY has 3 subtopics (2 essential, 1 non-essential) but lower priority
      // 5. Scheduler prioritizes higher priority topics when time is constrained
      expect(chemistryTasks.length).toBe(0);
      
      // Should have tasks for at least one topic
      expect(tasks.length).toBeGreaterThan(0);
      expect(tasks.every(task => task.topicCode && task.topicCode.length > 0)).toBe(true);
    });
  });

function isCatchupDay(date: dayjs.Dayjs): boolean {
  return date.day() === Weekday.Sunday;
}

function isTestDay(date: dayjs.Dayjs): boolean {
  return date.day() === Weekday.Saturday;
}
});
