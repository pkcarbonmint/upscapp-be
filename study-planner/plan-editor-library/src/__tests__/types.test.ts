import { describe, it, expect } from 'vitest';
import { 
  StudyPlan, 
  StudyCycle, 
  Block, 
  WeeklyPlan, 
  DailyPlan, 
  Task, 
  CycleType, 
  CycleIntensity,
  ValidationError,
  DragDropItem,
  PlanEditorState
} from '../types/editor';

describe('Type Definitions', () => {
  describe('Task', () => {
    it('should have required properties', () => {
      const task: Task = {
        task_id: 'task_1',
        humanReadableId: 'T1',
        title2: 'Test Task',
        duration_minutes: 60,
        details_link: 'https://example.com'
      };

      expect(task.task_id).toBe('task_1');
      expect(task.humanReadableId).toBe('T1');
      expect(task.title2).toBe('Test Task');
      expect(task.duration_minutes).toBe(60);
      expect(task.details_link).toBe('https://example.com');
    });

    it('should allow optional properties', () => {
      const task: Task = {
        task_id: 'task_1',
        humanReadableId: 'T1',
        title2: 'Test Task',
        duration_minutes: 60
      };

      expect(task.details_link).toBeUndefined();
      expect(task.currentAffairsType).toBeUndefined();
      expect(task.task_resources).toBeUndefined();
    });
  });

  describe('DailyPlan', () => {
    it('should contain tasks array', () => {
      const task: Task = {
        task_id: 'task_1',
        humanReadableId: 'T1',
        title2: 'Test Task',
        duration_minutes: 60
      };

      const dailyPlan: DailyPlan = {
        day: 1,
        tasks: [task]
      };

      expect(dailyPlan.day).toBe(1);
      expect(dailyPlan.tasks).toHaveLength(1);
      expect(dailyPlan.tasks[0]).toEqual(task);
    });
  });

  describe('WeeklyPlan', () => {
    it('should contain daily plans array', () => {
      const task: Task = {
        task_id: 'task_1',
        humanReadableId: 'T1',
        title2: 'Test Task',
        duration_minutes: 60
      };

      const dailyPlan: DailyPlan = {
        day: 1,
        tasks: [task]
      };

      const weeklyPlan: WeeklyPlan = {
        week: 1,
        daily_plans: [dailyPlan]
      };

      expect(weeklyPlan.week).toBe(1);
      expect(weeklyPlan.daily_plans).toHaveLength(1);
      expect(weeklyPlan.daily_plans[0]).toEqual(dailyPlan);
    });
  });

  describe('Block', () => {
    it('should have required properties', () => {
      const block: Block = {
        block_id: 'block_1',
        block_title: 'Test Block',
        subjects: ['Polity', 'History'],
        duration_weeks: 4,
        weekly_plan: [],
        block_resources: { resources: [] }
      };

      expect(block.block_id).toBe('block_1');
      expect(block.block_title).toBe('Test Block');
      expect(block.subjects).toEqual(['Polity', 'History']);
      expect(block.duration_weeks).toBe(4);
      expect(block.weekly_plan).toEqual([]);
      expect(block.block_resources).toEqual({ resources: [] });
    });

    it('should allow optional cycle properties', () => {
      const block: Block = {
        block_id: 'block_1',
        block_title: 'Test Block',
        subjects: ['Polity'],
        duration_weeks: 4,
        weekly_plan: [],
        block_resources: { resources: [] },
        cycle_id: 'cycle_1',
        cycle_type: CycleType.FoundationCycle,
        cycle_order: 1,
        cycle_name: 'Foundation'
      };

      expect(block.cycle_id).toBe('cycle_1');
      expect(block.cycle_type).toBe(CycleType.FoundationCycle);
      expect(block.cycle_order).toBe(1);
      expect(block.cycle_name).toBe('Foundation');
    });
  });

  describe('StudyCycle', () => {
    it('should have required properties', () => {
      const cycle: StudyCycle = {
        cycleId: 'cycle_1',
        cycleType: CycleType.FoundationCycle,
        cycleIntensity: CycleIntensity.Moderate,
        cycleDuration: 4,
        cycleStartWeek: 1,
        cycleOrder: 1,
        cycleName: 'Foundation Cycle',
        cycleBlocks: [],
        cycleDescription: 'Initial learning phase'
      };

      expect(cycle.cycleId).toBe('cycle_1');
      expect(cycle.cycleType).toBe(CycleType.FoundationCycle);
      expect(cycle.cycleIntensity).toBe(CycleIntensity.Moderate);
      expect(cycle.cycleDuration).toBe(4);
      expect(cycle.cycleStartWeek).toBe(1);
      expect(cycle.cycleOrder).toBe(1);
      expect(cycle.cycleName).toBe('Foundation Cycle');
      expect(cycle.cycleBlocks).toEqual([]);
      expect(cycle.cycleDescription).toBe('Initial learning phase');
    });
  });

  describe('StudyPlan', () => {
    it('should have required properties', () => {
      const plan: StudyPlan = {
        study_plan_id: 'plan_1',
        user_id: 'user_1',
        plan_title: 'Test Plan',
        curated_resources: { resources: [] }
      };

      expect(plan.study_plan_id).toBe('plan_1');
      expect(plan.user_id).toBe('user_1');
      expect(plan.plan_title).toBe('Test Plan');
      expect(plan.curated_resources).toEqual({ resources: [] });
    });

    it('should allow optional properties', () => {
      const cycle: StudyCycle = {
        cycleId: 'cycle_1',
        cycleType: CycleType.FoundationCycle,
        cycleIntensity: CycleIntensity.Moderate,
        cycleDuration: 4,
        cycleStartWeek: 1,
        cycleOrder: 1,
        cycleName: 'Foundation Cycle',
        cycleBlocks: [],
        cycleDescription: 'Initial learning phase'
      };

      const plan: StudyPlan = {
        study_plan_id: 'plan_1',
        user_id: 'user_1',
        plan_title: 'Test Plan',
        curated_resources: { resources: [] },
        cycles: [cycle],
        timelineUtilization: 0.8
      };

      expect(plan.cycles).toEqual([cycle]);
      expect(plan.timelineUtilization).toBe(0.8);
    });
  });

  describe('CycleType enum', () => {
    it('should have all expected values', () => {
      expect(CycleType.FoundationCycle).toBe('FoundationCycle');
      expect(CycleType.ConsolidationCycle).toBe('ConsolidationCycle');
      expect(CycleType.RevisionCycle).toBe('RevisionCycle');
      expect(CycleType.IntensiveCycle).toBe('IntensiveCycle');
      expect(CycleType.PrelimsCycle).toBe('PrelimsCycle');
      expect(CycleType.MainsCycle).toBe('MainsCycle');
    });
  });

  describe('CycleIntensity enum', () => {
    it('should have all expected values', () => {
      expect(CycleIntensity.Relaxed).toBe('Relaxed');
      expect(CycleIntensity.Moderate).toBe('Moderate');
      expect(CycleIntensity.Intensive).toBe('Intensive');
    });
  });

  describe('ValidationError', () => {
    it('should have required properties', () => {
      const error: ValidationError = {
        path: 'cycles[0].cycleDuration',
        message: 'Duration should be between 2 and 12 weeks',
        severity: 'error'
      };

      expect(error.path).toBe('cycles[0].cycleDuration');
      expect(error.message).toBe('Duration should be between 2 and 12 weeks');
      expect(error.severity).toBe('error');
    });

    it('should allow different severity levels', () => {
      const error: ValidationError = {
        path: 'cycles[0].cycleName',
        message: 'Cycle name is recommended',
        severity: 'warning'
      };

      expect(error.severity).toBe('warning');

      const infoError: ValidationError = {
        path: 'cycles[0].cycleDescription',
        message: 'Description provides context',
        severity: 'info'
      };

      expect(infoError.severity).toBe('info');
    });
  });

  describe('DragDropItem', () => {
    it('should have required properties', () => {
      const item: DragDropItem = {
        type: 'cycle',
        id: 'cycle_1',
        data: { cycleName: 'Test Cycle' },
        sourceIndex: 0
      };

      expect(item.type).toBe('cycle');
      expect(item.id).toBe('cycle_1');
      expect(item.data).toEqual({ cycleName: 'Test Cycle' });
      expect(item.sourceIndex).toBe(0);
    });

    it('should allow optional targetIndex', () => {
      const item: DragDropItem = {
        type: 'block',
        id: 'block_1',
        data: { blockTitle: 'Test Block' },
        sourceIndex: 0,
        targetIndex: 2
      };

      expect(item.targetIndex).toBe(2);
    });
  });

  describe('PlanEditorState', () => {
    it('should have required properties', () => {
      const plan: StudyPlan = {
        study_plan_id: 'plan_1',
        user_id: 'user_1',
        plan_title: 'Test Plan',
        curated_resources: { resources: [] }
      };

      const state: PlanEditorState = {
        plan,
        isDirty: false,
        validationErrors: []
      };

      expect(state.plan).toEqual(plan);
      expect(state.isDirty).toBe(false);
      expect(state.validationErrors).toEqual([]);
    });

    it('should allow optional properties', () => {
      const plan: StudyPlan = {
        study_plan_id: 'plan_1',
        user_id: 'user_1',
        plan_title: 'Test Plan',
        curated_resources: { resources: [] }
      };

      const error: ValidationError = {
        path: 'plan_title',
        message: 'Title is required',
        severity: 'error'
      };

      const state: PlanEditorState = {
        plan,
        selectedCycle: 'cycle_1',
        selectedBlock: 'block_1',
        selectedWeek: 1,
        isDirty: true,
        lastSaved: new Date('2023-01-01'),
        validationErrors: [error]
      };

      expect(state.selectedCycle).toBe('cycle_1');
      expect(state.selectedBlock).toBe('block_1');
      expect(state.selectedWeek).toBe(1);
      expect(state.isDirty).toBe(true);
      expect(state.lastSaved).toEqual(new Date('2023-01-01'));
      expect(state.validationErrors).toEqual([error]);
    });
  });
});

describe('Type Validation', () => {
  it('should enforce correct CycleType values', () => {
    const validTypes = [
      CycleType.FoundationCycle,
      CycleType.ConsolidationCycle,
      CycleType.RevisionCycle,
      CycleType.IntensiveCycle,
      CycleType.PrelimsCycle,
      CycleType.MainsCycle
    ];

    validTypes.forEach(type => {
      const cycle: StudyCycle = {
        cycleId: 'cycle_1',
        cycleType: type,
        cycleIntensity: CycleIntensity.Moderate,
        cycleDuration: 4,
        cycleStartWeek: 1,
        cycleOrder: 1,
        cycleName: 'Test Cycle',
        cycleBlocks: [],
        cycleDescription: 'Test'
      };

      expect(cycle.cycleType).toBe(type);
    });
  });

  it('should enforce correct CycleIntensity values', () => {
    const validIntensities = [
      CycleIntensity.Relaxed,
      CycleIntensity.Moderate,
      CycleIntensity.Intensive
    ];

    validIntensities.forEach(intensity => {
      const cycle: StudyCycle = {
        cycleId: 'cycle_1',
        cycleType: CycleType.FoundationCycle,
        cycleIntensity: intensity,
        cycleDuration: 4,
        cycleStartWeek: 1,
        cycleOrder: 1,
        cycleName: 'Test Cycle',
        cycleBlocks: [],
        cycleDescription: 'Test'
      };

      expect(cycle.cycleIntensity).toBe(intensity);
    });
  });

  it('should enforce correct ValidationError severity values', () => {
    const validSeverities = ['error', 'warning', 'info'] as const;

    validSeverities.forEach(severity => {
      const error: ValidationError = {
        path: 'test.path',
        message: 'Test message',
        severity
      };

      expect(error.severity).toBe(severity);
    });
  });

  it('should enforce correct DragDropItem type values', () => {
    const validTypes = ['cycle', 'block', 'week', 'task'] as const;

    validTypes.forEach(type => {
      const item: DragDropItem = {
        type,
        id: 'test_id',
        data: {},
        sourceIndex: 0
      };

      expect(item.type).toBe(type);
    });
  });
});
