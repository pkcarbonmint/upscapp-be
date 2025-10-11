import React from 'react';
import { StudyPlan } from '../types/editor';

interface TimelineViewProps {
  plan: StudyPlan;
  selectedCycle?: string;
  selectedBlock?: string;
  onCycleSelect: (cycleId: string) => void;
  onBlockSelect: (blockId: string) => void;
  readOnly?: boolean;
}

export const TimelineView: React.FC<TimelineViewProps> = ({
  plan,
  selectedCycle,
  selectedBlock,
  onCycleSelect,
  onBlockSelect
}) => {
  const cycles = plan.cycles || [];
  const totalWeeks = cycles.reduce((sum, cycle) => sum + cycle.cycleDuration, 0);

  return (
    <div className="timeline-view">
      <div className="timeline-header mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Plan Timeline</h3>
        <div className="text-sm text-gray-600">
          Total Duration: {totalWeeks} weeks
        </div>
      </div>
      
      <div className="timeline-container overflow-x-auto">
        <div className="timeline-track min-w-full">
          {cycles.map((cycle) => (
            <div key={cycle.cycleId} className="timeline-cycle mb-4">
              <div 
                className={`cycle-header p-3 border rounded-lg cursor-pointer transition-colors ${
                  selectedCycle === cycle.cycleId 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => onCycleSelect(cycle.cycleId)}
              >
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-gray-900">
                    {cycle.cycleName || `Cycle ${cycle.cycleOrder}`}
                  </h4>
                  <span className="text-sm text-gray-600">
                    {cycle.cycleDuration} weeks
                  </span>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {cycle.cycleType} • {cycle.cycleIntensity}
                </div>
              </div>
              
              {selectedCycle === cycle.cycleId && (
                <div className="cycle-blocks mt-3 ml-4">
                  <div className="blocks-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {cycle.cycleBlocks.map((block) => (
                      <div
                        key={block.block_id}
                        className={`block-item p-2 border rounded cursor-pointer transition-colors ${
                          selectedBlock === block.block_id
                            ? 'border-green-500 bg-green-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => onBlockSelect(block.block_id)}
                      >
                        <div className="text-sm font-medium text-gray-900">
                          {block.block_title}
                        </div>
                        <div className="text-xs text-gray-600">
                          {block.duration_weeks} weeks • {block.subjects.length} subjects
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {block.subjects.slice(0, 2).join(', ')}
                          {block.subjects.length > 2 && '...'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      
      {cycles.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No cycles in this plan yet.
        </div>
      )}
    </div>
  );
};

export default TimelineView;
