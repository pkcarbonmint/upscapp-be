import { describe, it, expect, beforeEach } from 'vitest';
import { 
  distributeTasksIntoDays, 
  assignHumanReadableIDs, 
  createWeeklyPlan,
  WeeklyTask,
  DailyHourLimits,
  WeeklyTaskSchedulingInput,
  DayOfWeek
} from '../tasks';
import dayjs from 'dayjs';
import { DailyPlan } from '../types';

describe('Weekly Task Scheduling Tests', () => {
  let mockTasks: WeeklyTask[];
  let mockDailyLimits: DailyHourLimits;

  beforeEach(() => {
    // Create mock tasks
    mockTasks = [
      {
        task_id: 'task-1',
        humanReadableId: 'H01w1t1',
        title: 'Study History Chapter 1',
        duration_minutes: 120, // 2 hours
        taskType: 'study',
        resources: ['NCERT History Book'],
        subjectCode: 'H01'
      },
      {
        task_id: 'task-2',
        humanReadableId: 'G01w1t2',
        title: 'Practice Geography Questions',
        duration_minutes: 90, // 1.5 hours
        taskType: 'practice',
        resources: ['Geography Practice Book'],
        subjectCode: 'G01'
      },
      {
        task_id: 'task-3',
        humanReadableId: 'P01w1t3',
        title: 'Revise Polity Notes',
        duration_minutes: 60, // 1 hour
        taskType: 'revision',
        resources: ['Polity Notes'],
        subjectCode: 'P01'
      },
      {
        task_id: 'task-4',
        humanReadableId: 'E01w1t4',
        title: 'Weekly Test',
        duration_minutes: 180, // 3 hours
        taskType: 'test',
        resources: [],
        subjectCode: 'E01'
      },
      {
        task_id: 'task-5',
        humanReadableId: 'E01w1t5',
        title: 'Study Economics Chapter 2',
        duration_minutes: 150, // 2.5 hours
        taskType: 'study',
        resources: ['Economics Textbook'],
        subjectCode: 'E01'
      }
    ];

    mockDailyLimits = {
      regular_day: 8, // 8 hours per regular day
      test_day: 4     // 4 hours for test day
    };
  });

  describe('Basic Task Distribution', () => {
    it('should distribute tasks across 7 days', () => {
      const input: WeeklyTaskSchedulingInput = {
        weekStartDate: dayjs(),
        tasks: mockTasks,
        dailyLimits: mockDailyLimits,
        catchupDayPreference: DayOfWeek.SATURDAY,
        testDayPreference: DayOfWeek.SUNDAY
      };

      const result = distributeTasksIntoDays(input);

      expect(result.dailyPlans).toHaveLength(7);
      expect(result.dailyPlans[0].day).toBe(1); // Monday
      expect(result.dailyPlans[6].day).toBe(7); // Sunday
    });

    it('should schedule all tasks', () => {
      const input: WeeklyTaskSchedulingInput = {
        weekStartDate: dayjs(),
        tasks: mockTasks,
        dailyLimits: mockDailyLimits,
        catchupDayPreference: DayOfWeek.SATURDAY,
        testDayPreference: DayOfWeek.SUNDAY
      };

      const result = distributeTasksIntoDays(input);

      const totalScheduledTasks = result.dailyPlans.reduce(
        (sum, day) => sum + day.tasks.length, 
        0
      );
      
      expect(totalScheduledTasks).toBe(mockTasks.length);
    });

    it('should respect daily hour limits', () => {
      const input: WeeklyTaskSchedulingInput = {
        weekStartDate: dayjs(),
        tasks: mockTasks,
        dailyLimits: mockDailyLimits,
        catchupDayPreference: DayOfWeek.SATURDAY,
        testDayPreference: DayOfWeek.SUNDAY
      };

      const result = distributeTasksIntoDays(input);

      result.dailyPlans.forEach((dayPlan, index) => {
        const dayHours = dayPlan.tasks.reduce(
          (sum, task) => sum + (task.duration_minutes / 60), 
          0
        );
        
        if (index === 5) { // Saturday - catchup day
          expect(dayHours).toBe(0);
        } else if (index === 6) { // Sunday - test day
          expect(dayHours).toBeLessThanOrEqual(mockDailyLimits.test_day);
        } else { // Regular days
          expect(dayHours).toBeLessThanOrEqual(mockDailyLimits.regular_day);
        }
      });
    });

    it('should calculate total scheduled hours correctly', () => {
      const input: WeeklyTaskSchedulingInput = {
        weekStartDate: dayjs(),
        tasks: mockTasks,
        dailyLimits: mockDailyLimits,
        catchupDayPreference: DayOfWeek.SATURDAY,
        testDayPreference: DayOfWeek.SUNDAY
      };

      const result = distributeTasksIntoDays(input);

      const expectedTotalHours = mockTasks.reduce(
        (sum, task) => sum + (task.duration_minutes / 60), 
        0
      );

      expect(result.totalScheduledHours).toBeCloseTo(expectedTotalHours, 2);
    });
  });

  describe('Catchup Day Handling', () => {
    it('should leave Saturday empty when Saturday is catchup day', () => {
      const input: WeeklyTaskSchedulingInput = {
        weekStartDate: dayjs(),
        tasks: mockTasks,
        dailyLimits: mockDailyLimits,
        catchupDayPreference: DayOfWeek.SATURDAY,
        testDayPreference: DayOfWeek.SUNDAY
      };

      const result = distributeTasksIntoDays(input);

      const saturdayTasks = result.dailyPlans[5].tasks; // Saturday is index 5
      expect(saturdayTasks).toHaveLength(0);
    });


    it('should leave Thursday empty when Thursday is catchup day', () => {
      const input: WeeklyTaskSchedulingInput = {
        weekStartDate: dayjs(),
        tasks: mockTasks,
        dailyLimits: mockDailyLimits,
        catchupDayPreference: DayOfWeek.THURSDAY,
        testDayPreference: DayOfWeek.SUNDAY
      };

      const result = distributeTasksIntoDays(input);

      const thursdayTasks = result.dailyPlans[3].tasks; // Thursday is index 3
      expect(thursdayTasks).toHaveLength(0);
    });

    it('should leave Friday empty when Friday is catchup day', () => {
      const input: WeeklyTaskSchedulingInput = {
        weekStartDate: dayjs(),
        tasks: mockTasks,
        dailyLimits: mockDailyLimits,
        catchupDayPreference: DayOfWeek.FRIDAY,
        testDayPreference: DayOfWeek.SUNDAY
      };

      const result = distributeTasksIntoDays(input);

      const fridayTasks = result.dailyPlans[4].tasks; // Friday is index 4
      expect(fridayTasks).toHaveLength(0);
    });

    // Test combined catchup/test day scenario
    it('should allow test tasks on catchup day when catchup and test day are the same', () => {
      const testTask: WeeklyTask = {
        task_id: 'test-task',
        humanReadableId: 'T01w1t6',
        title: 'Weekly Test',
        duration_minutes: 180, // 3 hours
        taskType: 'test',
        resources: [],
        subjectCode: 'T01'
      };

      const input: WeeklyTaskSchedulingInput = {
        weekStartDate: dayjs(),
        tasks: [...mockTasks, testTask],
        dailyLimits: mockDailyLimits,
        catchupDayPreference: DayOfWeek.SATURDAY,
        testDayPreference: DayOfWeek.SATURDAY // Same day as catchup
      };

      const result = distributeTasksIntoDays(input);

      const saturdayTasks = result.dailyPlans[5].tasks; // Saturday is index 5
      
      // Should have test tasks but no non-test tasks
      expect(saturdayTasks.length).toBeGreaterThan(0);
      expect(saturdayTasks.every(task => task.taskType === 'test')).toBe(true);
      
      // Should not have any non-test tasks
      const nonTestTasks = saturdayTasks.filter(task => task.taskType !== 'test');
      expect(nonTestTasks).toHaveLength(0);
    });

    it('should prevent non-test tasks on catchup day when catchup and test day are the same', () => {
      const input: WeeklyTaskSchedulingInput = {
        weekStartDate: dayjs(),
        tasks: mockTasks,
        dailyLimits: mockDailyLimits,
        catchupDayPreference: DayOfWeek.SATURDAY,
        testDayPreference: DayOfWeek.SATURDAY // Same day as catchup
      };

      const result = distributeTasksIntoDays(input);

      const saturdayTasks = result.dailyPlans[5].tasks; // Saturday is index 5
      
      // Should only have test tasks, no study/practice/revision tasks
      const nonTestTasks = saturdayTasks.filter(task => task.taskType !== 'test');
      expect(nonTestTasks).toHaveLength(0);
    });
  });

  describe('Test Day Handling', () => {
    it('should respect test day hour limits', () => {
      const input: WeeklyTaskSchedulingInput = {
        weekStartDate: dayjs(),
        tasks: mockTasks,
        dailyLimits: mockDailyLimits,
        catchupDayPreference: DayOfWeek.SATURDAY,
        testDayPreference: DayOfWeek.SUNDAY
      };

      const result = distributeTasksIntoDays(input);

      const sundayHours = result.dailyPlans[6].tasks.reduce(
        (sum, task) => sum + (task.duration_minutes / 60), 
        0
      );

      expect(sundayHours).toBeLessThanOrEqual(mockDailyLimits.test_day);
    });
  });

  describe('Task Splitting', () => {
    it('should split large tasks across multiple days when needed', () => {
      const largeTask: WeeklyTask = {
        task_id: 'large-task',
        humanReadableId: 'L01w1t6',
        title: 'Very Long Study Session',
        duration_minutes: 600, // 10 hours - too large for any single day
        taskType: 'study',
        resources: ['Multiple Books'],
        subjectCode: 'L01'
      };

      const input: WeeklyTaskSchedulingInput = {
        weekStartDate: dayjs(),
        tasks: [largeTask],
        dailyLimits: mockDailyLimits,
        catchupDayPreference: DayOfWeek.SATURDAY,
        testDayPreference: DayOfWeek.SUNDAY
      };

      const result = distributeTasksIntoDays(input);

      // Should be split across multiple days
      const daysWithTasks = result.dailyPlans.filter(day => day.tasks.length > 0);
      expect(daysWithTasks.length).toBeGreaterThan(1);

      // Total duration should be preserved
      const totalScheduledMinutes = result.dailyPlans.reduce(
        (sum, day) => sum + day.tasks.reduce(
          (daySum, task) => daySum + task.duration_minutes, 
          0
        ), 
        0
      );
      expect(totalScheduledMinutes).toBe(largeTask.duration_minutes);
    });
  });

  describe('Conflict Detection', () => {
    it('should detect day overload conflicts', () => {
      // Create tasks that exceed daily limits
      const excessiveTasks: WeeklyTask[] = Array(10).fill(null).map((_, i) => ({
        task_id: `excessive-task-${i}`,
        humanReadableId: `E01w1t${i}`,
        title: `Excessive Task ${i}`,
        duration_minutes: 480, // 8 hours each - will exceed limits
        taskType: 'study',
        resources: [],
        subjectCode: 'E01'
      }));

      const input: WeeklyTaskSchedulingInput = {
        weekStartDate: dayjs(),
        tasks: excessiveTasks,
        dailyLimits: mockDailyLimits,
        catchupDayPreference: DayOfWeek.SATURDAY,
        testDayPreference: DayOfWeek.SUNDAY
      };

      const result = distributeTasksIntoDays(input);

      expect(result.conflicts.length).toBeGreaterThan(0);
      expect(result.conflicts.some(conflict => conflict.type === 'day_overload')).toBe(true);
    });
  });

  describe('Human Readable ID Assignment', () => {
    it('should assign sequential human readable IDs', () => {
      const start = dayjs();
      const dailyPlans: DailyPlan[] = [
        {
          day: 1,
          date: start.add(1, 'day'),
          tasks: [
            { task_id: 'task-1', humanReadableId: '', title: 'Task 1', duration_minutes: 60, taskType: 'study' as const, subjectCode: 'H01' },
            { task_id: 'task-2', humanReadableId: '', title: 'Task 2', duration_minutes: 60, taskType: 'study' as const, subjectCode: 'H01' }
          ]
        },
        {
          day: 2,
          date: start.add(1, 'day'),
          tasks: [
            { task_id: 'task-3', humanReadableId: '', title: 'Task 3', duration_minutes: 60, taskType: 'study' as const, subjectCode: 'H01' }
          ]
        }
      ];

      const result = assignHumanReadableIDs(dailyPlans, 0, 1);

      expect(result[0].tasks[0].humanReadableId).toBe('H01w1t1');
      expect(result[0].tasks[1].humanReadableId).toBe('H01w1t2');
      expect(result[1].tasks[0].humanReadableId).toBe('H01w1t3');
    });
  });

  describe('Weekly Plan Creation', () => {
    it('should create a weekly plan from daily plans', () => {
      const start = dayjs();
      const dailyPlans: DailyPlan[] = [
        { day: 1, tasks: [], date: start.add(1,'day') },
        { day: 2, tasks: [], date: start.add(2,'day')  },
        { day: 3, tasks: [], date: start.add(3,'day')  },
        { day: 4, tasks: [], date: start.add(4,'day')  },
        { day: 5, tasks: [], date: start.add(5,'day')  },
        { day: 6, tasks: [], date: start.add(6,'day')  },
        { day: 7, tasks: [], date: start.add(7,'day')  }
      ];

      const result = createWeeklyPlan(dailyPlans, 1);

      expect(result.week).toBe(1);
      expect(result.daily_plans).toHaveLength(7);
      expect(result.daily_plans[0].day).toBe(1);
      expect(result.daily_plans[6].day).toBe(7);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty task list', () => {
      const input: WeeklyTaskSchedulingInput = {
        weekStartDate: dayjs(),
        tasks: [],
        dailyLimits: mockDailyLimits,
        catchupDayPreference: DayOfWeek.SATURDAY,
        testDayPreference: DayOfWeek.SUNDAY
      };

      const result = distributeTasksIntoDays(input);

      expect(result.dailyPlans).toHaveLength(7);
      expect(result.totalScheduledHours).toBe(0);
      expect(result.conflicts).toHaveLength(0);
    });

    it('should handle single task', () => {
      const singleTask: WeeklyTask = {
        task_id: 'single-task',
        humanReadableId: 'S01w1t1',
        title: 'Single Task',
        duration_minutes: 60,
        taskType: 'study',
        resources: [],
        subjectCode: 'S01'
      };

      const input: WeeklyTaskSchedulingInput = {
        weekStartDate: dayjs(),
        tasks: [singleTask],
        dailyLimits: mockDailyLimits,
        catchupDayPreference: DayOfWeek.SATURDAY,
        testDayPreference: DayOfWeek.SUNDAY
      };

      const result = distributeTasksIntoDays(input);

      expect(result.dailyPlans).toHaveLength(7);
      expect(result.totalScheduledHours).toBe(1);
      
      const daysWithTasks = result.dailyPlans.filter(day => day.tasks.length > 0);
      expect(daysWithTasks).toHaveLength(1);
    });

    it('should handle tasks with zero duration', () => {
      const zeroDurationTask: WeeklyTask = {
        task_id: 'zero-task',
        humanReadableId: 'Z01w1t1',
        title: 'Zero Duration Task',
        duration_minutes: 0,
        taskType: 'study',
        resources: [],
        subjectCode: 'Z01'
      };

      const input: WeeklyTaskSchedulingInput = {
        weekStartDate: dayjs(),
        tasks: [zeroDurationTask],
        dailyLimits: mockDailyLimits,
        catchupDayPreference: DayOfWeek.SATURDAY,
        testDayPreference: DayOfWeek.SUNDAY
      };

      const result = distributeTasksIntoDays(input);

      expect(result.totalScheduledHours).toBe(0);
      expect(result.conflicts).toHaveLength(0);
    });
  });

  describe('Task Distribution Requirements', () => {

    it('should distribute tasks reasonably across days when no catchup day is specified', () => {
      const input: WeeklyTaskSchedulingInput = {
        weekStartDate: dayjs(),
        tasks: mockTasks,
        dailyLimits: mockDailyLimits,
        testDayPreference: DayOfWeek.SUNDAY
        // No catchup day specified
      };

      const result = distributeTasksIntoDays(input);


      // Check that tasks are distributed across multiple days (not all on one day)
      const daysWithTasks = result.dailyPlans.filter(dayPlan => dayPlan.tasks.length > 0);
      expect(daysWithTasks.length).toBeGreaterThan(1); // Should be distributed across multiple days
      
      // Check that no single day has all tasks
      const maxTasksOnAnyDay = Math.max(...result.dailyPlans.map(dp => dp.tasks.length));
      expect(maxTasksOnAnyDay).toBeLessThan(mockTasks.length); // No single day should have all tasks
    });

    it('should respect daily hour limits for all days', () => {
      const input: WeeklyTaskSchedulingInput = {
        weekStartDate: dayjs(),
        tasks: mockTasks,
        dailyLimits: mockDailyLimits,
        catchupDayPreference: DayOfWeek.THURSDAY,
        testDayPreference: DayOfWeek.SUNDAY
      };

      const result = distributeTasksIntoDays(input);

      result.dailyPlans.forEach((dayPlan, index) => {
        const dayHours = dayPlan.tasks.reduce(
          (sum, task) => sum + (task.duration_minutes / 60), 
          0
        );
        
        if (index === 3) { // Thursday - catchup day
          expect(dayHours).toBe(0);
        } else if (index === 6) { // Sunday - test day
          expect(dayHours).toBeLessThanOrEqual(mockDailyLimits.test_day);
        } else { // Regular days
          expect(dayHours).toBeLessThanOrEqual(mockDailyLimits.regular_day);
        }
      });
    });

    it('should distribute work reasonably across non-catchup days', () => {
      const manyTasks: WeeklyTask[] = Array(20).fill(null).map((_, i) => ({
        task_id: `task-${i}`,
        humanReadableId: `T01w1t${i}`,
        title: `Task ${i}`,
        duration_minutes: 60, // 1 hour each
        taskType: 'study' as const,
        resources: [],
        subjectCode: 'T01'
      }));

      const input: WeeklyTaskSchedulingInput = {
        weekStartDate: dayjs(),
        tasks: manyTasks,
        dailyLimits: mockDailyLimits,
        catchupDayPreference: DayOfWeek.MONDAY,
        testDayPreference: DayOfWeek.SUNDAY
      };

      const result = distributeTasksIntoDays(input);

      // Calculate hours for each non-catchup day
      const nonCatchupDayHours = result.dailyPlans
        .filter((_, index) => index !== 0) // Exclude Monday (catchup day)
        .map(dayPlan => 
          dayPlan.tasks.reduce((sum, task) => sum + (task.duration_minutes / 60), 0)
        );

      // All non-catchup days should have some work
      nonCatchupDayHours.forEach(hours => {
        expect(hours).toBeGreaterThan(0);
      });

      // Work should be distributed (not all on one day)
      const maxHours = Math.max(...nonCatchupDayHours);
      const minHours = Math.min(...nonCatchupDayHours);
      expect(maxHours - minHours).toBeLessThanOrEqual(4); // Reasonable distribution
    });

    it('should respect daily hour limits for all days', () => {
      const input: WeeklyTaskSchedulingInput = {
        weekStartDate: dayjs(),
        tasks: mockTasks,
        dailyLimits: mockDailyLimits,
        catchupDayPreference: DayOfWeek.FRIDAY,
        testDayPreference: DayOfWeek.SUNDAY
      };

      const result = distributeTasksIntoDays(input);

      result.dailyPlans.forEach((dayPlan, index) => {
        const dayHours = dayPlan.tasks.reduce(
          (sum, task) => sum + (task.duration_minutes / 60), 
          0
        );
        
        if (index === 4) { // Friday - catchup day
          expect(dayHours).toBe(0);
        } else if (index === 6) { // Sunday - test day
          expect(dayHours).toBeLessThanOrEqual(mockDailyLimits.test_day);
        } else { // Regular days
          expect(dayHours).toBeLessThanOrEqual(mockDailyLimits.regular_day);
        }
      });
    });

    it('should ensure catchup day violations are detected', () => {
      const input: WeeklyTaskSchedulingInput = {
        weekStartDate: dayjs(),
        tasks: mockTasks,
        dailyLimits: mockDailyLimits,
        catchupDayPreference: DayOfWeek.TUESDAY,
        testDayPreference: DayOfWeek.SUNDAY
      };

      const result = distributeTasksIntoDays(input);

      // Check if any non-test tasks are scheduled on catchup day
      const tuesdayTasks = result.dailyPlans[1].tasks; // Tuesday is index 1
      const nonTestTasksOnCatchupDay = tuesdayTasks.filter(task => task.taskType !== 'test');
      
      if (nonTestTasksOnCatchupDay.length > 0) {
        // If there are violations, they should be detected in conflicts
        expect(result.conflicts.some(conflict => conflict.type === 'catchup_day_violation')).toBe(true);
      } else {
        // If no violations, no catchup day conflicts should be reported
        expect(result.conflicts.some(conflict => conflict.type === 'catchup_day_violation')).toBe(false);
      }
    });
  });

  describe('Performance', () => {
    it('should handle large number of tasks efficiently', () => {
      const largeTaskList: WeeklyTask[] = Array(100).fill(null).map((_, i) => ({
        task_id: `task-${i}`,
        humanReadableId: `P01w1t${i}`,
        title: `Task ${i}`,
        duration_minutes: Math.floor(Math.random() * 180) + 30, // 30-210 minutes
        taskType: 'study' as const,
        resources: [],
        subjectCode: 'P01'
      }));

      const input: WeeklyTaskSchedulingInput = {
        weekStartDate: dayjs(),
        tasks: largeTaskList,
        dailyLimits: mockDailyLimits,
        catchupDayPreference: DayOfWeek.SATURDAY,
        testDayPreference: DayOfWeek.SUNDAY
      };

      const startTime = Date.now();
      const result = distributeTasksIntoDays(input);
      const endTime = Date.now();

      expect(result.dailyPlans).toHaveLength(7);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });
  });
});

