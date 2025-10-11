import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePlanEditor } from '../hooks/usePlanEditor';
import { StudyPlan, StudyCycle, CycleType, CycleIntensity, ValidationError } from '../types/editor';

// Mock data
const mockCycle: StudyCycle = {
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

const mockStudyPlan: StudyPlan = {
  study_plan_id: 'plan_1',
  user_id: 'user_1',
  plan_title: 'Test Study Plan',
  curated_resources: { resources: [] },
  cycles: [mockCycle]
};

describe('usePlanEditor', () => {
  const mockOnSave = vi.fn();
  const mockOnValidate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with initial plan', () => {
    const { result } = renderHook(() => 
      usePlanEditor(mockStudyPlan, { onSave: mockOnSave, onValidate: mockOnValidate })
    );

    expect(result.current.plan).toEqual(mockStudyPlan);
    expect(result.current.isDirty).toBe(false);
    expect(result.current.validationErrors).toEqual([]);
    expect(result.current.selectedCycle).toBeUndefined();
    expect(result.current.selectedBlock).toBeUndefined();
    expect(result.current.selectedWeek).toBeUndefined();
  });

  it('should update plan and mark as dirty', () => {
    const { result } = renderHook(() => 
      usePlanEditor(mockStudyPlan, { onSave: mockOnSave, onValidate: mockOnValidate })
    );

    const updatedPlan = { ...mockStudyPlan, plan_title: 'Updated Plan' };

    act(() => {
      result.current.updatePlan(updatedPlan);
    });

    expect(result.current.plan).toEqual(updatedPlan);
    expect(result.current.isDirty).toBe(true);
  });

  it('should select cycle and clear block/week selection', () => {
    const { result } = renderHook(() => 
      usePlanEditor(mockStudyPlan, { onSave: mockOnSave, onValidate: mockOnValidate })
    );

    act(() => {
      result.current.selectCycle('cycle_1');
    });

    expect(result.current.selectedCycle).toBe('cycle_1');
    expect(result.current.selectedBlock).toBeUndefined();
    expect(result.current.selectedWeek).toBeUndefined();
  });

  it('should select block and clear week selection', () => {
    const { result } = renderHook(() => 
      usePlanEditor(mockStudyPlan, { onSave: mockOnSave, onValidate: mockOnValidate })
    );

    act(() => {
      result.current.selectBlock('block_1');
    });

    expect(result.current.selectedBlock).toBe('block_1');
    expect(result.current.selectedWeek).toBeUndefined();
  });

  it('should select week', () => {
    const { result } = renderHook(() => 
      usePlanEditor(mockStudyPlan, { onSave: mockOnSave, onValidate: mockOnValidate })
    );

    act(() => {
      result.current.selectWeek(1);
    });

    expect(result.current.selectedWeek).toBe(1);
  });

  it('should clear cycle selection', () => {
    const { result } = renderHook(() => 
      usePlanEditor(mockStudyPlan, { onSave: mockOnSave, onValidate: mockOnValidate })
    );

    act(() => {
      result.current.selectCycle('cycle_1');
    });

    expect(result.current.selectedCycle).toBe('cycle_1');

    act(() => {
      result.current.selectCycle(undefined);
    });

    expect(result.current.selectedCycle).toBeUndefined();
  });

  it('should clear block selection', () => {
    const { result } = renderHook(() => 
      usePlanEditor(mockStudyPlan, { onSave: mockOnSave, onValidate: mockOnValidate })
    );

    act(() => {
      result.current.selectBlock('block_1');
    });

    expect(result.current.selectedBlock).toBe('block_1');

    act(() => {
      result.current.selectBlock(undefined);
    });

    expect(result.current.selectedBlock).toBeUndefined();
  });

  it('should clear week selection', () => {
    const { result } = renderHook(() => 
      usePlanEditor(mockStudyPlan, { onSave: mockOnSave, onValidate: mockOnValidate })
    );

    act(() => {
      result.current.selectWeek(1);
    });

    expect(result.current.selectedWeek).toBe(1);

    act(() => {
      result.current.selectWeek(undefined);
    });

    expect(result.current.selectedWeek).toBeUndefined();
  });

  it('should save plan and mark as clean', async () => {
    mockOnSave.mockResolvedValue(undefined);

    const { result } = renderHook(() => 
      usePlanEditor(mockStudyPlan, { onSave: mockOnSave, onValidate: mockOnValidate })
    );

    // Make plan dirty first
    act(() => {
      result.current.updatePlan({ ...mockStudyPlan, plan_title: 'Updated Plan' });
    });

    expect(result.current.isDirty).toBe(true);

    // Save plan
    await act(async () => {
      await result.current.savePlan();
    });

    expect(mockOnSave).toHaveBeenCalledWith({ ...mockStudyPlan, plan_title: 'Updated Plan' });
    expect(result.current.isDirty).toBe(false);
    expect(result.current.lastSaved).toBeInstanceOf(Date);
  });

  it('should not save if not dirty', async () => {
    const { result } = renderHook(() => 
      usePlanEditor(mockStudyPlan, { onSave: mockOnSave, onValidate: mockOnValidate })
    );

    await act(async () => {
      await result.current.savePlan();
    });

    expect(mockOnSave).not.toHaveBeenCalled();
  });

  it('should not save if no onSave callback', async () => {
    const { result } = renderHook(() => 
      usePlanEditor(mockStudyPlan, { onValidate: mockOnValidate })
    );

    act(() => {
      result.current.updatePlan({ ...mockStudyPlan, plan_title: 'Updated Plan' });
    });

    await act(async () => {
      await result.current.savePlan();
    });

    expect(result.current.isDirty).toBe(true); // Should remain dirty
  });

  it('should validate plan and set errors', async () => {
    const mockErrors: ValidationError[] = [
      {
        path: 'cycles[0].cycleDuration',
        message: 'Duration should be between 2 and 12 weeks',
        severity: 'warning'
      }
    ];

    mockOnValidate.mockResolvedValue(mockErrors);

    const { result } = renderHook(() => 
      usePlanEditor(mockStudyPlan, { onSave: mockOnSave, onValidate: mockOnValidate })
    );

    await act(async () => {
      await result.current.validatePlan();
    });

    expect(mockOnValidate).toHaveBeenCalledWith(mockStudyPlan);
    expect(result.current.validationErrors).toEqual(mockErrors);
  });

  it('should handle validation errors', async () => {
    const mockError = new Error('Validation failed');
    mockOnValidate.mockRejectedValue(mockError);
    
    // Mock console.error to prevent test output noise
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { result } = renderHook(() => 
      usePlanEditor(mockStudyPlan, { onSave: mockOnSave, onValidate: mockOnValidate })
    );

    await act(async () => {
      await result.current.validatePlan();
    });

    expect(result.current.validationErrors).toEqual([
      {
        path: 'general',
        message: 'Validation failed: Validation failed',
        severity: 'error'
      }
    ]);
    
    // Restore console.error
    consoleSpy.mockRestore();
  });

  it('should not validate if no onValidate callback', async () => {
    const { result } = renderHook(() => 
      usePlanEditor(mockStudyPlan, { onSave: mockOnSave })
    );

    await act(async () => {
      await result.current.validatePlan();
    });

    expect(result.current.validationErrors).toEqual([]);
  });

  it('should create session', () => {
    const { result } = renderHook(() => 
      usePlanEditor(mockStudyPlan, { onSave: mockOnSave, onValidate: mockOnValidate })
    );

    act(() => {
      result.current.createSession('session_1', 'user_1', 'plan_1');
    });

    // Check that session was created by verifying the session object exists
    expect(result.current.session).not.toBeNull();
    expect(result.current.session?.sessionId).toBe('session_1');
    expect(result.current.session?.userId).toBe('user_1');
    expect(result.current.session?.planId).toBe('plan_1');
    expect(result.current.session?.planData).toEqual(mockStudyPlan);
    expect(result.current.session?.lastSaved).toBeInstanceOf(Date);
  });

  it('should load session', () => {
    const { result } = renderHook(() => 
      usePlanEditor(mockStudyPlan, { onSave: mockOnSave, onValidate: mockOnValidate })
    );

    const sessionData = {
      sessionId: 'session_1',
      planData: { ...mockStudyPlan, plan_title: 'Session Plan' },
      lastSaved: new Date('2023-01-01'),
      userId: 'user_1',
      planId: 'plan_1'
    };

    act(() => {
      result.current.loadSession(sessionData);
    });

    expect(result.current.plan).toEqual(sessionData.planData);
    expect(result.current.isDirty).toBe(false);
    expect(result.current.lastSaved).toEqual(sessionData.lastSaved);
    expect(result.current.session).toEqual(sessionData);
  });

  it('should handle save errors gracefully', async () => {
    const mockError = new Error('Save failed');
    mockOnSave.mockRejectedValue(mockError);

    const { result } = renderHook(() => 
      usePlanEditor(mockStudyPlan, { onSave: mockOnSave, onValidate: mockOnValidate })
    );

    act(() => {
      result.current.updatePlan({ ...mockStudyPlan, plan_title: 'Updated Plan' });
    });

    await act(async () => {
      await result.current.savePlan();
    });

    // Should remain dirty on error
    expect(result.current.isDirty).toBe(true);
    expect(result.current.lastSaved).toBeUndefined();
  });

  it('should maintain selection state across plan updates', () => {
    const { result } = renderHook(() => 
      usePlanEditor(mockStudyPlan, { onSave: mockOnSave, onValidate: mockOnValidate })
    );

    // Set selections
    act(() => {
      result.current.selectCycle('cycle_1');
      result.current.selectBlock('block_1');
      result.current.selectWeek(1);
    });

    // Update plan
    act(() => {
      result.current.updatePlan({ ...mockStudyPlan, plan_title: 'Updated Plan' });
    });

    // Selections should be maintained
    expect(result.current.selectedCycle).toBe('cycle_1');
    expect(result.current.selectedBlock).toBe('block_1');
    expect(result.current.selectedWeek).toBe(1);
  });

  it('should handle multiple rapid updates', () => {
    const { result } = renderHook(() => 
      usePlanEditor(mockStudyPlan, { onSave: mockOnSave, onValidate: mockOnValidate })
    );

    act(() => {
      result.current.updatePlan({ ...mockStudyPlan, plan_title: 'Update 1' });
      result.current.updatePlan({ ...mockStudyPlan, plan_title: 'Update 2' });
      result.current.updatePlan({ ...mockStudyPlan, plan_title: 'Update 3' });
    });

    expect(result.current.plan.plan_title).toBe('Update 3');
    expect(result.current.isDirty).toBe(true);
  });

  it('should handle validation with empty errors', async () => {
    mockOnValidate.mockResolvedValue([]);

    const { result } = renderHook(() => 
      usePlanEditor(mockStudyPlan, { onSave: mockOnSave, onValidate: mockOnValidate })
    );

    await act(async () => {
      await result.current.validatePlan();
    });

    expect(result.current.validationErrors).toEqual([]);
  });
});
