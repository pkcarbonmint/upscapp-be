import { useState, useCallback, useRef } from 'react';
import { StudyPlan, PlanEditorState, ValidationError, EditorSession } from '../types/editor';

interface UsePlanEditorOptions {
  onSave?: (plan: StudyPlan) => Promise<void>;
  onValidate?: (plan: StudyPlan) => Promise<ValidationError[]>;
}

export const usePlanEditor = (
  initialPlan: StudyPlan,
  options: UsePlanEditorOptions = {}
) => {
  const { onSave, onValidate } = options;
  
  const [state, setState] = useState<PlanEditorState>({
    plan: initialPlan,
    isDirty: false,
    validationErrors: [],
    lastSaved: undefined
  });

  const sessionRef = useRef<EditorSession | null>(null);

  const updatePlan = useCallback((updatedPlan: StudyPlan) => {
    setState(prev => ({
      ...prev,
      plan: updatedPlan,
      isDirty: true
    }));
  }, []);

  const selectCycle = useCallback((cycleId: string | undefined) => {
    setState(prev => ({
      ...prev,
      selectedCycle: cycleId,
      selectedBlock: undefined,
      selectedWeek: undefined
    }));
  }, []);

  const selectBlock = useCallback((blockId: string | undefined) => {
    setState(prev => ({
      ...prev,
      selectedBlock: blockId,
      selectedWeek: undefined
    }));
  }, []);

  const selectWeek = useCallback((week: number | undefined) => {
    setState(prev => ({
      ...prev,
      selectedWeek: week
    }));
  }, []);

  const savePlan = useCallback(async () => {
    if (!onSave || !state.isDirty) return;

    try {
      await onSave(state.plan);
      setState(prev => ({
        ...prev,
        isDirty: false,
        lastSaved: new Date()
      }));
    } catch (error) {
      console.error('Failed to save plan:', error);
      // Could add error state here
    }
  }, [onSave, state.plan, state.isDirty]);

  const validatePlan = useCallback(async () => {
    if (!onValidate) return;

    try {
      const errors = await onValidate(state.plan);
      setState(prev => ({
        ...prev,
        validationErrors: errors
      }));
    } catch (error) {
      console.error('Failed to validate plan:', error);
      setState(prev => ({
        ...prev,
        validationErrors: [{
          path: 'general',
          message: 'Validation failed: ' + (error as Error).message,
          severity: 'error'
        }]
      }));
    }
  }, [onValidate, state.plan]);

  const createSession = useCallback((sessionId: string, userId: string, planId?: string) => {
    sessionRef.current = {
      sessionId,
      planData: state.plan,
      lastSaved: new Date(),
      userId,
      planId
    };
  }, [state.plan]);

  const loadSession = useCallback((session: EditorSession) => {
    setState(prev => ({
      ...prev,
      plan: session.planData,
      isDirty: false,
      lastSaved: session.lastSaved
    }));
    sessionRef.current = session;
  }, []);

  return {
    // State
    plan: state.plan,
    selectedCycle: state.selectedCycle,
    selectedBlock: state.selectedBlock,
    selectedWeek: state.selectedWeek,
    isDirty: state.isDirty,
    lastSaved: state.lastSaved,
    validationErrors: state.validationErrors,
    
    // Actions
    updatePlan,
    selectCycle,
    selectBlock,
    selectWeek,
    savePlan,
    validatePlan,
    createSession,
    loadSession,
    
    // Session
    session: sessionRef.current
  };
};
