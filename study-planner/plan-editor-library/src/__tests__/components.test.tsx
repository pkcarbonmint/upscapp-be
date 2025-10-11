import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ValidationPanel } from '../components/ValidationPanel';
import { StudyPlan, StudyCycle, Block, WeeklyPlan, DailyPlan, Task, CycleType, ValidationError } from '../types/editor';

// Mock data for testing
const mockTask: Task = {
  task_id: 'task_1',
  humanReadableId: 'T1',
  title2: 'Test Task',
  duration_minutes: 60,
  details_link: 'https://example.com'
};

const mockDailyPlan: DailyPlan = {
  day: 1,
  tasks: [mockTask]
};

const mockWeeklyPlan: WeeklyPlan = {
  week: 1,
  daily_plans: [mockDailyPlan]
};

const mockBlock: Block = {
  block_id: 'block_1',
  block_title: 'Test Block',
  subjects: ['Polity', 'History'],
  duration_weeks: 4,
  weekly_plan: [mockWeeklyPlan],
  block_resources: { resources: [] }
};

const mockCycle: StudyCycle = {
  cycleId: 'cycle_1',
  cycleType: CycleType.FoundationCycle,
  cycleIntensity: 'Moderate' as any,
  cycleDuration: 4,
  cycleStartWeek: 1,
  cycleOrder: 1,
  cycleName: 'Foundation Cycle',
  cycleBlocks: [mockBlock],
  cycleDescription: 'Initial learning phase'
};

const mockStudyPlan: StudyPlan = {
  study_plan_id: 'plan_1',
  user_id: 'user_1',
  plan_title: 'Test Study Plan',
  curated_resources: { resources: [] },
  cycles: [mockCycle]
};

// Mock validation errors
const mockValidationErrors: ValidationError[] = [
  {
    path: 'cycles[0].cycleDuration',
    message: 'Cycle duration should be between 2 and 12 weeks',
    severity: 'warning'
  },
  {
    path: 'cycles[0].cycleBlocks[0].subjects',
    message: 'At least one subject is required',
    severity: 'error'
  }
];

describe('ValidationPanel', () => {
  it('renders validation errors', () => {
    render(<ValidationPanel errors={mockValidationErrors} />);

    expect(screen.getByText('Validation Results')).toBeInTheDocument();
    expect(screen.getByText('1 errors')).toBeInTheDocument();
    expect(screen.getByText('1 warnings')).toBeInTheDocument();
  });

  it('shows error messages', () => {
    render(<ValidationPanel errors={mockValidationErrors} />);

    expect(screen.getByText('cycles[0].cycleBlocks[0].subjects')).toBeInTheDocument();
    expect(screen.getByText('At least one subject is required')).toBeInTheDocument();
  });

  it('shows warning messages', () => {
    render(<ValidationPanel errors={mockValidationErrors} />);

    expect(screen.getByText('cycles[0].cycleDuration')).toBeInTheDocument();
    expect(screen.getByText('Cycle duration should be between 2 and 12 weeks')).toBeInTheDocument();
  });

  it('renders nothing when no errors', () => {
    const { container } = render(<ValidationPanel errors={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('shows correct severity icons', () => {
    render(<ValidationPanel errors={mockValidationErrors} />);

    expect(screen.getByText('❌')).toBeInTheDocument(); // Error icon
    expect(screen.getByText('⚠️')).toBeInTheDocument(); // Warning icon
  });
});

describe('Types', () => {
  it('creates valid StudyPlan object', () => {
    expect(mockStudyPlan.study_plan_id).toBe('plan_1');
    expect(mockStudyPlan.plan_title).toBe('Test Study Plan');
    expect(mockStudyPlan.cycles).toHaveLength(1);
  });

  it('creates valid StudyCycle object', () => {
    expect(mockCycle.cycleId).toBe('cycle_1');
    expect(mockCycle.cycleName).toBe('Foundation Cycle');
    expect(mockCycle.cycleType).toBe(CycleType.FoundationCycle);
    expect(mockCycle.cycleBlocks).toHaveLength(1);
  });

  it('creates valid Block object', () => {
    expect(mockBlock.block_id).toBe('block_1');
    expect(mockBlock.block_title).toBe('Test Block');
    expect(mockBlock.subjects).toEqual(['Polity', 'History']);
    expect(mockBlock.duration_weeks).toBe(4);
  });

  it('creates valid WeeklyPlan object', () => {
    expect(mockWeeklyPlan.week).toBe(1);
    expect(mockWeeklyPlan.daily_plans).toHaveLength(1);
  });

  it('creates valid DailyPlan object', () => {
    expect(mockDailyPlan.day).toBe(1);
    expect(mockDailyPlan.tasks).toHaveLength(1);
  });

  it('creates valid Task object', () => {
    expect(mockTask.task_id).toBe('task_1');
    expect(mockTask.title2).toBe('Test Task');
    expect(mockTask.duration_minutes).toBe(60);
  });

  it('creates valid ValidationError objects', () => {
    expect(mockValidationErrors[0].path).toBe('cycles[0].cycleDuration');
    expect(mockValidationErrors[0].severity).toBe('warning');
    expect(mockValidationErrors[1].severity).toBe('error');
  });
});
