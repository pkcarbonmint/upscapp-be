import { describe, it, expect, beforeEach } from 'vitest';
import dayjs from 'dayjs';
import { planMain } from '../plan-main';
import { 
  PlanningContext, 
  S2WeekDay, 
  S2Subject, 
  CycleType,
  S2SlotType 
} from '../types';

describe('planMain', () => {
  // Configure test timeouts for faster execution
  const TEST_TIMEOUT = 5000; // 5 seconds instead of 10
  let context: PlanningContext;
  let subjects: S2Subject[];
  let optionalSubject: S2Subject;

  beforeEach(() => {
    // Create simplified test subjects for faster execution
    subjects = [
      {
        subjectCode: 'MATH',
        subjectNname: 'Mathematics',
        examFocus: 'BothExams',
        baselineMinutes: 1200, // Reduced from 2400
        topics: [
          {
            code: 'ALG',
            subtopics: [
              { code: 'ALG1', name: 'Basic Algebra', isEssential: true, priorityLevel: 5 },
            ],
          },
        ],
      },
      {
        subjectCode: 'PHYS',
        subjectNname: 'Physics',
        examFocus: 'BothExams',
        baselineMinutes: 900, // Reduced from 1800
        topics: [
          {
            code: 'MECH',
            subtopics: [
              { code: 'MECH1', name: 'Mechanics', isEssential: true, priorityLevel: 5 },
            ],
          },
        ],
      },
      {
        subjectCode: 'HIST',
        subjectNname: 'History',
        examFocus: 'MainsOnly',
        baselineMinutes: 600, // Reduced from 1500
        topics: [
          {
            code: 'ANCIENT',
            subtopics: [
              { code: 'ANCIENT1', name: 'Ancient History', isEssential: true, priorityLevel: 5 },
            ],
          },
        ],
      },
    ];

    optionalSubject = {
      subjectCode: 'OPTIONAL',
      subjectNname: 'Optional Subject',
      examFocus: 'MainsOnly',
      baselineMinutes: 800, // Reduced from 2000
      topics: [
        {
          code: 'OPT1',
          subtopics: [
            { code: 'OPT1_1', name: 'Optional Topic 1', isEssential: true, priorityLevel: 5 },
          ],
        },
      ],
    };

    context = {
      optionalSubject,
      startDate: dayjs('2024-01-01'),
      targetYear: 2025,
      prelimsExamDate: dayjs('2025-05-26'),
      mainsExamDate: dayjs('2025-09-20'),
      constraints: {
        optionalSubjectCode: 'OPTIONAL',
        confidenceMap: {
          MATH: 0.8,
          PHYS: 0.7,
          CHEM: 0.6,
          HIST: 0.5,
          GEO: 0.4,
          OPTIONAL: 0.3,
        },
        optionalFirst: true,
        catchupDay: S2WeekDay.Sunday,
        testDay: S2WeekDay.Saturday,
        workingHoursPerDay: 8,
        breaks: [],
        testMinutes: 180,
      },
      subjects,
      relativeAllocationWeights: {
        MATH: 0.4,
        PHYS: 0.3,
        HIST: 0.2,
        OPTIONAL: 0.1,
      },
    };
  });

  describe('Basic Functionality', () => {
    it('should return cycles, blocks, and tasks', () => {
      const result = planMain(context);
      
      expect(result).toHaveProperty('cycles');
      expect(result).toHaveProperty('blocks');
      expect(result).toHaveProperty('tasks');
      
      expect(Array.isArray(result.cycles)).toBe(true);
      expect(Array.isArray(result.blocks)).toBe(true);
      expect(Array.isArray(result.tasks)).toBe(true);
    }, TEST_TIMEOUT); // Use configured timeout

    it('should generate cycles with valid cycle types', () => {
      const result = planMain(context);
      
      result.cycles.forEach(cycle => {
        expect(Object.values(CycleType)).toContain(cycle.cycleType);
        expect(dayjs.isDayjs(dayjs(cycle.startDate))).toBe(true);
        expect(dayjs.isDayjs(dayjs(cycle.endDate))).toBe(true);
        expect(dayjs(cycle.endDate).isAfter(dayjs(cycle.startDate))).toBe(true);
      });
    });

    it('should generate blocks with valid structure', () => {
      const result = planMain(context);
      
      result.blocks.forEach(block => {
        expect(block).toHaveProperty('cycleType');
        expect(block).toHaveProperty('subject');
        expect(block).toHaveProperty('from');
        expect(block).toHaveProperty('to');
        
        expect(Object.values(CycleType)).toContain(block.cycleType);
        expect(dayjs.isDayjs(block.from)).toBe(true);
        expect(dayjs.isDayjs(block.to)).toBe(true);
        expect(block.to.isAfter(block.from)).toBe(true);
      });
    }, TEST_TIMEOUT); // Use configured timeout

    it('should generate tasks with valid structure', () => {
      const result = planMain(context);
      
      result.tasks.forEach(task => {
        expect(task).toHaveProperty('subjectCode');
        expect(task).toHaveProperty('taskType');
        expect(task).toHaveProperty('minutes');
        expect(task).toHaveProperty('date');
        
        expect(Object.values(S2SlotType)).toContain(task.taskType);
        expect(task.minutes).toBeGreaterThan(0);
        expect(dayjs.isDayjs(task.date)).toBe(true);
      });
    });
  });

  describe('Different Start Dates and Target Years', () => {
    it('should handle early start (S1 scenario)', () => {
      const earlyContext = {
        ...context,
        startDate: dayjs('2024-01-01'), // Very early start
        targetYear: 2025,
        prelimsExamDate: dayjs('2025-05-26'),
        mainsExamDate: dayjs('2025-09-20'),
      };
      
      const result = planMain(earlyContext);
      
      expect(result.cycles.length).toBeGreaterThan(0);
      expect(result.blocks.length).toBeGreaterThanOrEqual(0);
      expect(result.tasks.length).toBeGreaterThanOrEqual(0);
      
      // Should include foundation cycles (C1, C2)
      const cycleTypes = result.cycles.map(c => c.cycleType);
      expect(cycleTypes).toContain(CycleType.C1);
    });

    it('should handle mid-year start (S3 scenario)', () => {
      const midContext = {
        ...context,
        startDate: dayjs('2024-08-01'), // Mid-year start
        targetYear: 2025,
        prelimsExamDate: dayjs('2025-05-26'),
        mainsExamDate: dayjs('2025-09-20'),
      };
      
      const result = planMain(midContext);
      
      expect(result.cycles.length).toBeGreaterThan(0);
      expect(result.blocks.length).toBeGreaterThanOrEqual(0);
      expect(result.tasks.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle late start (S7 scenario)', () => {
      const lateContext = {
        ...context,
        startDate: dayjs('2025-03-15'), // Very late start
        targetYear: 2025,
        prelimsExamDate: dayjs('2025-05-26'),
        mainsExamDate: dayjs('2025-09-20'),
      };
      
      const result = planMain(lateContext);
      
      expect(result.cycles.length).toBeGreaterThan(0);
      expect(result.blocks.length).toBeGreaterThanOrEqual(0);
      expect(result.tasks.length).toBeGreaterThanOrEqual(0);
      
      // Should focus on revision cycles
      const cycleTypes = result.cycles.map(c => c.cycleType);
      expect(cycleTypes).toContain(CycleType.C5); // Prelims revision
    });

    it('should handle different target years', () => {
      const context2026 = {
        ...context,
        startDate: dayjs('2025-01-01'),
        targetYear: 2026,
        prelimsExamDate: dayjs('2026-05-26'),
        mainsExamDate: dayjs('2026-09-20'),
      };
      
      const result = planMain(context2026);
      
      expect(result.cycles.length).toBeGreaterThan(0);
      expect(result.blocks.length).toBeGreaterThanOrEqual(0);
      expect(result.tasks.length).toBeGreaterThanOrEqual(0);
      
      // All cycles should be within the target year
      result.cycles.forEach(cycle => {
        expect(dayjs(cycle.startDate).year()).toBeLessThanOrEqual(2026);
        expect(dayjs(cycle.endDate).year()).toBeLessThanOrEqual(2026);
      });
    });
  });

  describe('Scenario Boundary Tests', () => {
    it('should create S1 scenario for ≥20 months (long preparation)', () => {
      const s1Context = {
        ...context,
        startDate: dayjs('2023-06-01'), // 20+ months before prelims
        targetYear: 2025,
        prelimsExamDate: dayjs('2025-05-26'),
        mainsExamDate: dayjs('2025-09-20'),
      };
      
      const result = planMain(s1Context);
      
      // S1 should have C1, C2, C3, C4, C5, C5B, C6, C7
      const cycleTypes = result.cycles.map(c => c.cycleType);
      expect(cycleTypes).toContain(CycleType.C1);
      expect(cycleTypes).toContain(CycleType.C2);
      expect(cycleTypes).toContain(CycleType.C3);
      expect(cycleTypes).toContain(CycleType.C4);
      expect(cycleTypes).toContain(CycleType.C5);
      expect(cycleTypes).toContain(CycleType.C5B);
      expect(cycleTypes).toContain(CycleType.C6);
      expect(cycleTypes).toContain(CycleType.C7);
    }, 10000);

    it('should create S2 scenario for 18-20 months (medium-long preparation)', () => {
      const s2Context = {
        ...context,
        startDate: dayjs('2023-10-01'), // ~18 months before prelims
        targetYear: 2025,
        prelimsExamDate: dayjs('2025-05-26'),
        mainsExamDate: dayjs('2025-09-20'),
      };
      
      const result = planMain(s2Context);
      
      // S2 should have same cycles as S1 (C1, C2, C3, C4, C5, C5B, C6, C7)
      const cycleTypes = result.cycles.map(c => c.cycleType);
      expect(cycleTypes).toContain(CycleType.C1);
      expect(cycleTypes).toContain(CycleType.C2);
      expect(cycleTypes).toContain(CycleType.C3);
      expect(cycleTypes).toContain(CycleType.C4);
      expect(cycleTypes).toContain(CycleType.C5);
      expect(cycleTypes).toContain(CycleType.C5B);
      expect(cycleTypes).toContain(CycleType.C6);
      expect(cycleTypes).toContain(CycleType.C7);
    }, 10000);

    it('should create S3 scenario for 15-18 months (medium preparation)', () => {
      const s3Context = {
        ...context,
        startDate: dayjs('2023-12-01'), // ~15 months before prelims
        targetYear: 2025,
        prelimsExamDate: dayjs('2025-05-26'),
        mainsExamDate: dayjs('2025-09-20'),
      };
      
      const result = planMain(s3Context);
      
      // S3 should skip C3 (C1, C2, C4, C5, C5B, C6, C7)
      const cycleTypes = result.cycles.map(c => c.cycleType);
      expect(cycleTypes).toContain(CycleType.C1);
      expect(cycleTypes).toContain(CycleType.C2);
      expect(cycleTypes).not.toContain(CycleType.C3); // C3 should be skipped
      expect(cycleTypes).toContain(CycleType.C4);
      expect(cycleTypes).toContain(CycleType.C5);
      expect(cycleTypes).toContain(CycleType.C5B);
      expect(cycleTypes).toContain(CycleType.C6);
      expect(cycleTypes).toContain(CycleType.C7);
    }, 10000);

    it('should create S4 scenario for 12-15 months (medium-short preparation)', () => {
      const s4Context = {
        ...context,
        startDate: dayjs('2024-03-01'), // ~12 months before prelims
        targetYear: 2025,
        prelimsExamDate: dayjs('2025-05-26'),
        mainsExamDate: dayjs('2025-09-20'),
      };
      
      const result = planMain(s4Context);
      
      // S4 should skip C1 and C3 (C2, C4, C5, C5B, C6, C7)
      const cycleTypes = result.cycles.map(c => c.cycleType);
      expect(cycleTypes).not.toContain(CycleType.C1); // C1 should be skipped
      expect(cycleTypes).toContain(CycleType.C2);
      expect(cycleTypes).not.toContain(CycleType.C3); // C3 should be skipped
      expect(cycleTypes).toContain(CycleType.C4);
      expect(cycleTypes).toContain(CycleType.C5);
      expect(cycleTypes).toContain(CycleType.C5B);
      expect(cycleTypes).toContain(CycleType.C6);
      expect(cycleTypes).toContain(CycleType.C7);
    }, 10000);

    it('should create S4A scenario for 7-12 months until Dec 15', () => {
      const s4aContext = {
        ...context,
        startDate: dayjs('2024-05-01'), // ~7 months before prelims, before Dec 15, but not in S5 range
        targetYear: 2025,
        prelimsExamDate: dayjs('2025-05-26'),
        mainsExamDate: dayjs('2025-09-20'),
      };
      
      const result = planMain(s4aContext);
      
      // S4A should skip C1 and C3 (C2, C4, C5, C5B, C6, C7)
      const cycleTypes = result.cycles.map(c => c.cycleType);
      expect(cycleTypes).not.toContain(CycleType.C1); // C1 should be skipped
      expect(cycleTypes).toContain(CycleType.C2);
      expect(cycleTypes).not.toContain(CycleType.C3); // C3 should be skipped
      expect(cycleTypes).toContain(CycleType.C4);
      expect(cycleTypes).toContain(CycleType.C5);
      expect(cycleTypes).toContain(CycleType.C5B);
      expect(cycleTypes).toContain(CycleType.C6);
      expect(cycleTypes).toContain(CycleType.C7);
    }, 10000);

    it('should create S5 scenario for Jun 1 - Dec 15 (very short late start)', () => {
      const s5Context = {
        ...context,
        startDate: dayjs('2024-08-01'), // Between Jun 1 - Dec 15
        targetYear: 2025,
        prelimsExamDate: dayjs('2025-05-26'),
        mainsExamDate: dayjs('2025-09-20'),
      };
      
      const result = planMain(s5Context);
      
      // S5 should skip C1, C2, C3 and use C8 (C8, C4, C5, C5B, C6, C7)
      const cycleTypes = result.cycles.map(c => c.cycleType);
      expect(cycleTypes).not.toContain(CycleType.C1); // C1 should be skipped
      expect(cycleTypes).not.toContain(CycleType.C2); // C2 should be skipped
      expect(cycleTypes).not.toContain(CycleType.C3); // C3 should be skipped
      expect(cycleTypes).toContain(CycleType.C8); // C8 should be used instead
      expect(cycleTypes).toContain(CycleType.C4);
      expect(cycleTypes).toContain(CycleType.C5);
      expect(cycleTypes).toContain(CycleType.C5B);
      expect(cycleTypes).toContain(CycleType.C6);
      expect(cycleTypes).toContain(CycleType.C7);
    }, 10000);

    it('should create S6 scenario for Dec 16 - Feb 28 (ultra-short preparation)', () => {
      const s6Context = {
        ...context,
        startDate: dayjs('2024-12-20'), // Between Dec 16 - Feb 28
        targetYear: 2025,
        prelimsExamDate: dayjs('2025-05-26'),
        mainsExamDate: dayjs('2025-09-20'),
      };
      
      const result = planMain(s6Context);
      
      // S6 should skip C1, C2, C3, C8 (C4, C5, C5B, C6, C7)
      const cycleTypes = result.cycles.map(c => c.cycleType);
      expect(cycleTypes).not.toContain(CycleType.C1); // C1 should be skipped
      expect(cycleTypes).not.toContain(CycleType.C2); // C2 should be skipped
      expect(cycleTypes).not.toContain(CycleType.C3); // C3 should be skipped
      expect(cycleTypes).not.toContain(CycleType.C8); // C8 should be skipped
      expect(cycleTypes).toContain(CycleType.C4);
      expect(cycleTypes).toContain(CycleType.C5);
      expect(cycleTypes).toContain(CycleType.C5B);
      expect(cycleTypes).toContain(CycleType.C6);
      expect(cycleTypes).toContain(CycleType.C7);
    }, 10000);

    it('should create S7 scenario for Mar 1 - Apr 15 (crash course early)', () => {
      const s7Context = {
        ...context,
        startDate: dayjs('2025-03-15'), // Between Mar 1 - Apr 15
        targetYear: 2025,
        prelimsExamDate: dayjs('2025-05-26'),
        mainsExamDate: dayjs('2025-09-20'),
      };
      
      const result = planMain(s7Context);
      
      // S7 should skip C1, C2, C3, C8, C4 (C5, C5B, C6, C7)
      const cycleTypes = result.cycles.map(c => c.cycleType);
      expect(cycleTypes).not.toContain(CycleType.C1); // C1 should be skipped
      expect(cycleTypes).not.toContain(CycleType.C2); // C2 should be skipped
      expect(cycleTypes).not.toContain(CycleType.C3); // C3 should be skipped
      expect(cycleTypes).not.toContain(CycleType.C8); // C8 should be skipped
      expect(cycleTypes).not.toContain(CycleType.C4); // C4 should be skipped
      expect(cycleTypes).toContain(CycleType.C5);
      expect(cycleTypes).toContain(CycleType.C5B);
      expect(cycleTypes).toContain(CycleType.C6);
      expect(cycleTypes).toContain(CycleType.C7);
    }, 10000);

    it('should reject S8 scenario for Apr 16 - May 15 (too late)', () => {
      const s8Context = {
        ...context,
        startDate: dayjs('2025-04-20'), // Between Apr 16 - May 15
        targetYear: 2025,
        prelimsExamDate: dayjs('2025-05-26'),
        mainsExamDate: dayjs('2025-09-20'),
      };
      
      // S8 should throw an error
      expect(() => planMain(s8Context)).toThrow('Plan generation rejected: insufficient time');
    });

    it('should test exact boundary dates for scenario transitions', () => {
      const targetYear = 2025;
      const prelimsExamDate = dayjs('2025-05-26');
      const mainsExamDate = dayjs('2025-09-20');

      // Test S6 boundary: Dec 16 (should be S6)
      const s6BoundaryContext = {
        ...context,
        startDate: dayjs('2024-12-16'),
        targetYear,
        prelimsExamDate,
        mainsExamDate,
      };
      
      const s6Result = planMain(s6BoundaryContext);
      const s6CycleTypes = s6Result.cycles.map(c => c.cycleType);
      expect(s6CycleTypes).not.toContain(CycleType.C1);
      expect(s6CycleTypes).not.toContain(CycleType.C2);
      expect(s6CycleTypes).not.toContain(CycleType.C3);
      expect(s6CycleTypes).not.toContain(CycleType.C8);

      // Test S7 boundary: Mar 1 (should be S7)
      const s7BoundaryContext = {
        ...context,
        startDate: dayjs('2025-03-01'),
        targetYear,
        prelimsExamDate,
        mainsExamDate,
      };
      
      const s7Result = planMain(s7BoundaryContext);
      const s7CycleTypes = s7Result.cycles.map(c => c.cycleType);
      expect(s7CycleTypes).not.toContain(CycleType.C1);
      expect(s7CycleTypes).not.toContain(CycleType.C2);
      expect(s7CycleTypes).not.toContain(CycleType.C3);
      expect(s7CycleTypes).not.toContain(CycleType.C8);
      expect(s7CycleTypes).not.toContain(CycleType.C4);

      // Test S8 boundary: Apr 16 (should be rejected)
      const s8BoundaryContext = {
        ...context,
        startDate: dayjs('2025-04-16'),
        targetYear,
        prelimsExamDate,
        mainsExamDate,
      };
      
      expect(() => planMain(s8BoundaryContext)).toThrow('Plan generation rejected: insufficient time');
    }, TEST_TIMEOUT); // Use configured timeout
  });

  describe('No Holes in Plan', () => {
    it('should not have gaps between consecutive cycles', () => {
      const result = planMain(context);
      
      if (result.cycles.length < 2) return;
      
      // Sort cycles by start date
      const sortedCycles = result.cycles.sort((a, b) => 
        dayjs(a.startDate).diff(dayjs(b.startDate))
      );
      
      // Check for gaps between consecutive cycles
      for (let i = 0; i < sortedCycles.length - 1; i++) {
        const currentCycle = sortedCycles[i];
        const nextCycle = sortedCycles[i + 1];
        
        const gapDays = dayjs(nextCycle.startDate).diff(dayjs(currentCycle.endDate), 'day');
        // Allow small gaps (up to 1 day) for rounding errors
        expect(gapDays).toBeLessThanOrEqual(1);
      }
    });

    it('should not have gaps between consecutive blocks', () => {
      const result = planMain(context);
      
      if (result.blocks.length < 2) return;
      
      // Sort blocks by start time
      const sortedBlocks = result.blocks.sort((a, b) => a.from.diff(b.from));
      
      // Check for gaps between consecutive blocks
      for (let i = 0; i < sortedBlocks.length - 1; i++) {
        const currentBlock = sortedBlocks[i];
        const nextBlock = sortedBlocks[i + 1];
        
        // If blocks are on the same day, there should be no gap
        if (currentBlock.from.format('YYYY-MM-DD') === nextBlock.from.format('YYYY-MM-DD')) {
          const gapMinutes = nextBlock.from.diff(currentBlock.to, 'minutes');
          // Allow small gaps (up to 1 minute) for rounding errors
          expect(gapMinutes).toBeLessThanOrEqual(1);
        }
      }
    }, TEST_TIMEOUT); // Use configured timeout

    it('should not have gaps between consecutive tasks', () => {
      const result = planMain(context);
      
      if (result.tasks.length < 2) return;
      
      // Group tasks by subject and date
      const tasksBySubjectAndDate = new Map<string, typeof result.tasks>();
      
      result.tasks.forEach(task => {
        const key = `${task.subjectCode}-${task.date.format('YYYY-MM-DD')}`;
        if (!tasksBySubjectAndDate.has(key)) {
          tasksBySubjectAndDate.set(key, []);
        }
        tasksBySubjectAndDate.get(key)!.push(task);
      });
      
      // Check for gaps within each subject-day group
      tasksBySubjectAndDate.forEach(tasks => {
        if (tasks.length < 2) return;
        
        const sortedTasks = tasks.sort((a, b) => a.date.diff(b.date));
        
        for (let i = 0; i < sortedTasks.length - 1; i++) {
          const currentTask = sortedTasks[i];
          const nextTask = sortedTasks[i + 1];
          
          const gapMinutes = nextTask.date.diff(currentTask.date, 'minutes');
          // Allow small gaps (up to 1 minute) for rounding errors
          expect(gapMinutes).toBeLessThanOrEqual(1);
        }
      });
    });

    it('should cover the entire planning period', () => {
      const result = planMain(context);
      
      if (result.cycles.length === 0) return;
      
      const sortedCycles = result.cycles.sort((a, b) => 
        dayjs(a.startDate).diff(dayjs(b.startDate))
      );
      
      const firstCycleStart = dayjs(sortedCycles[0].startDate);
      const lastCycleEnd = dayjs(sortedCycles[sortedCycles.length - 1].endDate);
      
      // First cycle should start close to the planning start date
      const startGapDays = firstCycleStart.diff(context.startDate, 'day');
      expect(startGapDays).toBeLessThanOrEqual(7); // Allow up to 1 week gap
      
      // Last cycle should end close to the prelims exam date
      const endGapDays = context.prelimsExamDate.diff(lastCycleEnd, 'day');
      expect(endGapDays).toBeLessThanOrEqual(7); // Allow up to 1 week gap
    });
  });

  describe('Task Effort Ratios', () => {
    it('should respect task effort ratios for C1 cycle (Study only)', () => {
      const result = planMain(context);
      
      // Find C1 cycle blocks
      const c1Blocks = result.blocks.filter(block => block.cycleType === CycleType.C1);
      
      if (c1Blocks.length === 0) return;
      
      // Get tasks for C1 blocks
      const c1Tasks = result.tasks.filter(task => 
        c1Blocks.some(block => 
          block.subject.subjectCode === task.subjectCode &&
          task.date.isBetween(block.from, block.to, 'day', '[]')
        )
      );
      
      if (c1Tasks.length === 0) return;
      
      // C1 should be 100% study tasks
      const studyTasks = c1Tasks.filter(task => task.taskType === S2SlotType.STUDY);
      const studyRatio = studyTasks.length / c1Tasks.length;
      
      expect(studyRatio).toBeCloseTo(1.0, 1); // Should be 100% study
    });

    it('should respect task effort ratios for C2 cycle (60% Study, 20% Practice, 20% Revision)', () => {
      const result = planMain(context);
      
      // Find C2 cycle blocks
      const c2Blocks = result.blocks.filter(block => block.cycleType === CycleType.C2);
      
      if (c2Blocks.length === 0) return;
      
      // Get tasks for C2 blocks
      const c2Tasks = result.tasks.filter(task => 
        c2Blocks.some(block => 
          block.subject.subjectCode === task.subjectCode &&
          task.date.isBetween(block.from, block.to, 'day', '[]')
        )
      );
      
      if (c2Tasks.length === 0) return;
      
      const studyTasks = c2Tasks.filter(task => task.taskType === S2SlotType.STUDY);
      const practiceTasks = c2Tasks.filter(task => task.taskType === S2SlotType.PRACTICE);
      const revisionTasks = c2Tasks.filter(task => task.taskType === S2SlotType.REVISION);
      
      const studyRatio = studyTasks.length / c2Tasks.length;
      const practiceRatio = practiceTasks.length / c2Tasks.length;
      const revisionRatio = revisionTasks.length / c2Tasks.length;
      
      // Allow some tolerance for rounding
      expect(studyRatio).toBeCloseTo(0.6, 1);
      expect(practiceRatio).toBeCloseTo(0.2, 1);
      expect(revisionRatio).toBeCloseTo(0.2, 1);
    });

    it('should respect task effort ratios for C5 cycle (10% Study, 50% Practice, 40% Revision)', () => {
      const result = planMain(context);
      
      // Find C5 cycle blocks
      const c5Blocks = result.blocks.filter(block => block.cycleType === CycleType.C5);
      
      if (c5Blocks.length === 0) return;
      
      // Get tasks for C5 blocks
      const c5Tasks = result.tasks.filter(task => 
        c5Blocks.some(block => 
          block.subject.subjectCode === task.subjectCode &&
          task.date.isBetween(block.from, block.to, 'day', '[]')
        )
      );
      
      if (c5Tasks.length === 0) return;
      
      const studyTasks = c5Tasks.filter(task => task.taskType === S2SlotType.STUDY);
      const practiceTasks = c5Tasks.filter(task => task.taskType === S2SlotType.PRACTICE);
      const revisionTasks = c5Tasks.filter(task => task.taskType === S2SlotType.REVISION);
      
      const studyRatio = studyTasks.length / c5Tasks.length;
      const practiceRatio = practiceTasks.length / c5Tasks.length;
      const revisionRatio = revisionTasks.length / c5Tasks.length;
      
      // Allow some tolerance for rounding
      expect(studyRatio).toBeCloseTo(0.1, 1);
      expect(practiceRatio).toBeCloseTo(0.5, 1);
      expect(revisionRatio).toBeCloseTo(0.4, 1);
    });

    it('should have correct task effort ratios across all cycles', () => {
      const result = planMain(context);
      
      // Group tasks by cycle type
      const tasksByCycle = new Map<CycleType, typeof result.tasks>();
      
      result.tasks.forEach(task => {
        const block = result.blocks.find(block => 
          block.subject.subjectCode === task.subjectCode &&
          task.date.isBetween(block.from, block.to, 'day', '[]')
        );
        
        if (block) {
          if (!tasksByCycle.has(block.cycleType)) {
            tasksByCycle.set(block.cycleType, []);
          }
          tasksByCycle.get(block.cycleType)!.push(task);
        }
      });
      
      // Check ratios for each cycle type
      const expectedRatios = {
        [CycleType.C1]: { study: 1.0, practice: 0.0, revision: 0.0 },
        [CycleType.C2]: { study: 0.6, practice: 0.2, revision: 0.2 },
        [CycleType.C3]: { study: 0.7, practice: 0.1, revision: 0.2 },
        [CycleType.C4]: { study: 0.2, practice: 0.4, revision: 0.4 },
        [CycleType.C5]: { study: 0.1, practice: 0.5, revision: 0.4 },
        [CycleType.C5B]: { study: 0.1, practice: 0.5, revision: 0.4 },
        [CycleType.C6]: { study: 0.2, practice: 0.3, revision: 0.5 },
        [CycleType.C7]: { study: 0.1, practice: 0.4, revision: 0.5 },
        [CycleType.C8]: { study: 0.8, practice: 0.1, revision: 0.1 },
      };
      
      tasksByCycle.forEach((tasks, cycleType) => {
        const expected = expectedRatios[cycleType];
        if (!expected || tasks.length === 0) return;
        
        const studyTasks = tasks.filter(task => task.taskType === S2SlotType.STUDY);
        const practiceTasks = tasks.filter(task => task.taskType === S2SlotType.PRACTICE);
        const revisionTasks = tasks.filter(task => task.taskType === S2SlotType.REVISION);
        
        const studyRatio = studyTasks.length / tasks.length;
        const practiceRatio = practiceTasks.length / tasks.length;
        const revisionRatio = revisionTasks.length / tasks.length;
        
        // Allow tolerance for rounding errors
        expect(studyRatio).toBeCloseTo(expected.study, 1);
        expect(practiceRatio).toBeCloseTo(expected.practice, 1);
        expect(revisionRatio).toBeCloseTo(expected.revision, 1);
      });
    }, TEST_TIMEOUT); // Use configured timeout
  });

  describe('Subject Filtering by Exam Focus', () => {
    it('should include BothExams subjects in appropriate cycles', () => {
      const result = planMain(context);
      
      // Find BothExams subjects
      const bothExamsSubjects = context.subjects.filter(s => s.examFocus === 'BothExams');
      
      // Check that BothExams subjects appear in C1, C2, C8 cycles
      const bothExamsCycles = [CycleType.C1, CycleType.C2, CycleType.C8];
      
      bothExamsCycles.forEach(cycleType => {
        const cycleBlocks = result.blocks.filter(block => block.cycleType === cycleType);
        
        if (cycleBlocks.length > 0) {
          const cycleSubjects = cycleBlocks.map(block => block.subject.subjectCode);
          
          bothExamsSubjects.forEach(subject => {
            expect(cycleSubjects).toContain(subject.subjectCode);
          });
        }
      });
    });

    it('should include MainsOnly subjects in appropriate cycles', () => {
      const result = planMain(context);
      
      // Find MainsOnly subjects
      const mainsOnlySubjects = context.subjects.filter(s => s.examFocus === 'MainsOnly');
      
      // Check that MainsOnly subjects appear in C3, C6, C7 cycles
      const mainsOnlyCycles = [CycleType.C3, CycleType.C6, CycleType.C7];
      
      mainsOnlyCycles.forEach(cycleType => {
        const cycleBlocks = result.blocks.filter(block => block.cycleType === cycleType);
        
        if (cycleBlocks.length > 0) {
          const cycleSubjects = cycleBlocks.map(block => block.subject.subjectCode);
          
          mainsOnlySubjects.forEach(subject => {
            expect(cycleSubjects).toContain(subject.subjectCode);
          });
        }
      });
    }, TEST_TIMEOUT); // Use configured timeout

    it('should include PrelimsOnly subjects in appropriate cycles', () => {
      const result = planMain(context);
      
      // Find PrelimsOnly subjects
      const prelimsOnlySubjects = context.subjects.filter(s => s.examFocus === 'PrelimsOnly');
      
      // Check that PrelimsOnly subjects appear in C4, C5, C5B cycles
      const prelimsOnlyCycles = [CycleType.C4, CycleType.C5, CycleType.C5B];
      
      prelimsOnlyCycles.forEach(cycleType => {
        const cycleBlocks = result.blocks.filter(block => block.cycleType === cycleType);
        const cycleSubjects = cycleBlocks.map(block => block.subject.subjectCode);
        
        prelimsOnlySubjects.forEach(subject => {
          expect(cycleSubjects).toContain(subject.subjectCode);
        });
      });
    });

    it('should prioritize optional subject in MainsOnly and BothExams cycles', () => {
      const result = planMain(context);
      
      // Find MainsOnly and BothExams cycles
      const relevantCycles = [CycleType.C3, CycleType.C6, CycleType.C7, CycleType.C1, CycleType.C2, CycleType.C8];
      
      relevantCycles.forEach(cycleType => {
        const cycleBlocks = result.blocks.filter(block => block.cycleType === cycleType);
        
        if (cycleBlocks.length > 0) {
          // Optional subject should be the first subject in the cycle
          const firstBlock = cycleBlocks.sort((a, b) => a.from.diff(b.from))[0];
          expect(firstBlock.subject.subjectCode).toBe(context.optionalSubject.subjectCode);
        }
      });
    });
  });

  describe('Time Constraints', () => {
    it('should respect working hours per day constraint', () => {
      const result = planMain(context);
      
      // Group tasks by date
      const tasksByDate = new Map<string, typeof result.tasks>();
      
      result.tasks.forEach(task => {
        const dateKey = task.date.format('YYYY-MM-DD');
        if (!tasksByDate.has(dateKey)) {
          tasksByDate.set(dateKey, []);
        }
        tasksByDate.get(dateKey)!.push(task);
      });
      
      // Check that no day exceeds working hours
      tasksByDate.forEach((tasks, _date) => {
        const totalMinutes = tasks.reduce((sum, task) => sum + task.minutes, 0);
        const maxDailyMinutes = context.constraints.workingHoursPerDay * 60;
        
        expect(totalMinutes).toBeLessThanOrEqual(maxDailyMinutes);
      });
    });

    it('should not schedule tasks on catchup days', () => {
      const result = planMain(context);
      
      result.tasks.forEach(task => {
        const dayOfWeek = task.date.day();
        expect(dayOfWeek).not.toBe(context.constraints.catchupDay);
      });
    });

    it('should not schedule tasks on test days', () => {
      const result = planMain(context);
      
      result.tasks.forEach(task => {
        const dayOfWeek = task.date.day();
        expect(dayOfWeek).not.toBe(context.constraints.testDay);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty subjects array', () => {
      const emptyContext = {
        ...context,
        subjects: [],
      };
      
      const result = planMain(emptyContext);
      
      expect(result.cycles.length).toBeGreaterThanOrEqual(0);
      expect(result.blocks.length).toBeGreaterThanOrEqual(0); // May have optional subject blocks
      expect(result.tasks.length).toBeGreaterThanOrEqual(0); // May have optional subject tasks
    });

    it('should handle single subject', () => {
      const singleSubjectContext = {
        ...context,
        subjects: [subjects[0]],
      };
      
      const result = planMain(singleSubjectContext);
      
      expect(result.cycles.length).toBeGreaterThanOrEqual(0);
      expect(result.blocks.length).toBeGreaterThanOrEqual(0);
      expect(result.tasks.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle very short planning period', () => {
      const shortContext = {
        ...context,
        startDate: dayjs('2025-05-20'),
        prelimsExamDate: dayjs('2025-05-26'), // Only 6 days
        mainsExamDate: dayjs('2025-09-20'),
      };
      
      // Should throw an error for insufficient time
      expect(() => planMain(shortContext)).toThrow('Plan generation rejected: insufficient time');
    });
  });
});
