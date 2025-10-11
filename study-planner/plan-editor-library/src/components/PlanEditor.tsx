import React, { useEffect, useCallback } from 'react';
import { PlanEditorProps, StudyPlan } from '../types/editor';
import { usePlanEditor } from '../hooks/usePlanEditor';
import { DragDropProvider } from './DragDropProvider';
import { CycleEditor } from './CycleEditor';
import { TimelineView } from './TimelineView';
import { ValidationPanel } from './ValidationPanel';

export const PlanEditor: React.FC<PlanEditorProps> = ({
  initialPlan,
  onChange,
  onSave,
  onValidate,
  readOnly = false,
  showTimeline = true,
  autoSave = true,
  autoSaveInterval = 30000 // 30 seconds
}) => {
  const {
    plan,
    selectedCycle,
    selectedBlock,
    selectedWeek,
    isDirty,
    lastSaved,
    validationErrors,
    updatePlan,
    selectCycle,
    selectBlock,
    selectWeek,
    savePlan,
    validatePlan
  } = usePlanEditor(initialPlan, { onSave, onValidate });

  // Auto-save effect
  useEffect(() => {
    if (!autoSave || !isDirty || !onSave) return;

    const interval = setInterval(() => {
      savePlan();
    }, autoSaveInterval);

    return () => clearInterval(interval);
  }, [autoSave, isDirty, onSave, autoSaveInterval, savePlan]);

  // Notify parent of changes
  useEffect(() => {
    onChange(plan);
  }, [plan, onChange]);

  const handlePlanUpdate = useCallback((updatedPlan: StudyPlan) => {
    updatePlan(updatedPlan);
  }, [updatePlan]);

  const handleValidation = useCallback(async () => {
    await validatePlan();
  }, [validatePlan]);

  return (
    <DragDropProvider>
      <div className="plan-editor">
        <div className="plan-editor-header">
          <h2 className="text-xl font-bold text-gray-900">
            {plan.plan_title || 'Study Plan Editor'}
          </h2>
          <div className="flex items-center space-x-4">
            {isDirty && (
              <span className="text-sm text-orange-600">
                Unsaved changes
              </span>
            )}
            {lastSaved && (
              <span className="text-sm text-gray-500">
                Last saved: {lastSaved.toLocaleTimeString()}
              </span>
            )}
            <button
              onClick={handleValidation}
              className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
              disabled={readOnly}
            >
              Validate Plan
            </button>
            {onSave && (
              <button
                onClick={savePlan}
                className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                disabled={readOnly || !isDirty}
              >
                Save Plan
              </button>
            )}
          </div>
        </div>

        <div className="plan-editor-content">
          {showTimeline && (
            <div className="timeline-section mb-6">
              <TimelineView
                plan={plan}
                selectedCycle={selectedCycle}
                selectedBlock={selectedBlock}
                onCycleSelect={selectCycle}
                onBlockSelect={selectBlock}
                readOnly={readOnly}
              />
            </div>
          )}

          <div className="editor-section">
            <CycleEditor
              cycles={plan.cycles || []}
              selectedCycle={selectedCycle}
              selectedBlock={selectedBlock}
              selectedWeek={selectedWeek}
              onPlanUpdate={handlePlanUpdate}
              onCycleSelect={selectCycle}
              onBlockSelect={selectBlock}
              onWeekSelect={selectWeek}
              readOnly={readOnly}
            />
          </div>

          {validationErrors.length > 0 && (
            <div className="validation-section mt-6">
              <ValidationPanel errors={validationErrors} />
            </div>
          )}
        </div>
      </div>
    </DragDropProvider>
  );
};

export default PlanEditor;
