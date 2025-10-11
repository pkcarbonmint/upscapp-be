import React from 'react';
import { StudyCycle, StudyPlan, CycleType } from '../types/editor';
import { withDragDrop } from './DragDropProvider';
import BlockEditor from './BlockEditor';

interface CycleEditorProps {
  cycles: StudyCycle[];
  selectedCycle?: string;
  selectedBlock?: string;
  selectedWeek?: number;
  onPlanUpdate: (plan: StudyPlan) => void;
  onCycleSelect: (cycleId: string | undefined) => void;
  onBlockSelect: (blockId: string | undefined) => void;
  onWeekSelect: (week: number | undefined) => void;
  readOnly?: boolean;
}

const CycleItem: React.FC<{
  cycle: StudyCycle;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (cycle: StudyCycle) => void;
  readOnly?: boolean;
}> = ({ cycle, isSelected, onSelect, onUpdate, readOnly }) => {
  const handleCycleTypeChange = (newType: CycleType) => {
    if (readOnly) return;
    onUpdate({
      ...cycle,
      cycleType: newType
    });
  };

  const handleDurationChange = (newDuration: number) => {
    if (readOnly) return;
    onUpdate({
      ...cycle,
      cycleDuration: newDuration
    });
  };

  return (
    <div 
      className={`cycle-item p-4 border rounded-lg cursor-pointer transition-colors ${
        isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
      }`}
      onClick={onSelect}
    >
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-semibold text-gray-900">
          {cycle.cycleName || `Cycle ${cycle.cycleOrder}`}
        </h3>
        <span className="text-sm text-gray-500">
          {cycle.cycleDuration} weeks
        </span>
      </div>
      
      <div className="space-y-2">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Cycle Type
          </label>
          <select
            value={cycle.cycleType || CycleType.FoundationCycle}
            onChange={(e) => handleCycleTypeChange(e.target.value as CycleType)}
            disabled={readOnly}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value={CycleType.FoundationCycle}>Foundation</option>
            <option value={CycleType.ConsolidationCycle}>Consolidation</option>
            <option value={CycleType.RevisionCycle}>Revision</option>
            <option value={CycleType.IntensiveCycle}>Intensive</option>
            <option value={CycleType.PrelimsCycle}>Prelims</option>
            <option value={CycleType.MainsCycle}>Mains</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Duration (weeks)
          </label>
          <input
            type="number"
            value={cycle.cycleDuration}
            onChange={(e) => handleDurationChange(parseInt(e.target.value))}
            disabled={readOnly}
            min="1"
            max="52"
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            value={cycle.cycleDescription}
            onChange={(e) => onUpdate({ ...cycle, cycleDescription: e.target.value })}
            disabled={readOnly}
            rows={2}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Describe this cycle..."
          />
        </div>
      </div>
      
      <div className="mt-3">
        <span className="text-sm text-gray-600">
          {cycle.cycleBlocks.length} blocks
        </span>
      </div>
    </div>
  );
};

const DraggableCycleItem = withDragDrop(CycleItem, 'cycle');

export const CycleEditor: React.FC<CycleEditorProps> = ({
  cycles,
  selectedCycle,
  selectedBlock,
  selectedWeek,
  onPlanUpdate,
  onCycleSelect,
  onBlockSelect,
  onWeekSelect,
  readOnly = false
}) => {
  const handleCycleUpdate = (updatedCycle: StudyCycle) => {
    const updatedCycles = cycles.map(cycle => 
      cycle.cycleId === updatedCycle.cycleId ? updatedCycle : cycle
    );
    
    onPlanUpdate({
      ...cycles[0]?.cycleBlocks[0]?.weekly_plan[0]?.daily_plans[0]?.tasks[0] ? {} : {},
      cycles: updatedCycles
    } as StudyPlan);
  };

  const handleAddCycle = () => {
    if (readOnly) return;
    
    const newCycle: StudyCycle = {
      cycleId: `cycle_${Date.now()}`,
      cycleType: CycleType.FoundationCycle,
      cycleIntensity: 'Moderate' as any,
      cycleDuration: 4,
      cycleStartWeek: cycles.length > 0 ? cycles[cycles.length - 1].cycleStartWeek + cycles[cycles.length - 1].cycleDuration : 1,
      cycleOrder: cycles.length + 1,
      cycleName: `New Cycle ${cycles.length + 1}`,
      cycleBlocks: [],
      cycleDescription: ''
    };
    
    const updatedCycles = [...cycles, newCycle];
    onPlanUpdate({
      ...cycles[0]?.cycleBlocks[0]?.weekly_plan[0]?.daily_plans[0]?.tasks[0] ? {} : {},
      cycles: updatedCycles
    } as StudyPlan);
  };

  const selectedCycleData = cycles.find(cycle => cycle.cycleId === selectedCycle);

  return (
    <div className="cycle-editor">
      <div className="cycles-list">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Study Cycles</h2>
          {!readOnly && (
            <button
              onClick={handleAddCycle}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500"
            >
              Add Cycle
            </button>
          )}
        </div>
        
        <div className="space-y-4">
          {cycles.map((cycle, index) => (
            <DraggableCycleItem
              key={cycle.cycleId}
              itemId={cycle.cycleId}
              index={index}
              cycle={cycle}
              isSelected={selectedCycle === cycle.cycleId}
              onSelect={() => onCycleSelect(cycle.cycleId)}
              onUpdate={handleCycleUpdate}
              readOnly={readOnly}
            />
          ))}
        </div>
      </div>
      
      {selectedCycleData && (
        <div className="selected-cycle-details mt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Blocks in {selectedCycleData.cycleName}
          </h3>
          <BlockEditor
            blocks={selectedCycleData.cycleBlocks}
            selectedBlock={selectedBlock}
            selectedWeek={selectedWeek}
            onCycleUpdate={handleCycleUpdate}
            onBlockSelect={onBlockSelect}
            onWeekSelect={onWeekSelect}
            readOnly={readOnly}
          />
        </div>
      )}
    </div>
  );
};

export default CycleEditor;
