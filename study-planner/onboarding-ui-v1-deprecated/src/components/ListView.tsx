import React from 'react';
import type { BlockPreview } from '../types';

// Type definitions for transformed cycle data
interface TransformedCycle {
  cycleId: string;
  name: string;
  cycleType: string;
  order: number;
  blocks: BlockPreview[];
}

interface ListViewProps {
  sortedCycles: TransformedCycle[];
}

const ListView: React.FC<ListViewProps> = ({ sortedCycles }) => {
  const formatHours = (hours: number): string => {
    return Math.round(hours * 10) / 10 + " h";
  };

  const allBlocks = sortedCycles.flatMap((cycle: TransformedCycle) => 
    cycle.blocks.map((block: BlockPreview) => ({ ...block, cycleName: cycle.name }))
  );

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {allBlocks.map((block: BlockPreview & { cycleName: string }, index: number) => (
          <div key={block.blockId} className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h4 className="font-semibold">{block.title}</h4>
                <span className="text-sm text-blue-600 bg-blue-50 px-2 py-1 rounded">
                  {block.cycleName}
                </span>
              </div>
              <span className="text-sm text-gray-500">Block {index + 1}</span>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Duration:</span> {block.durationWeeks} weeks
              </div>
              <div>
                <span className="font-medium">Date Range:</span> {block.dateRange}
              </div>
              <div>
                <span className="font-medium">Study Hours:</span> {formatHours(block.hours.studyHours)}
              </div>
              <div>
                <span className="font-medium">Revision Hours:</span> {formatHours(block.hours.revisionHours)}
              </div>
            </div>
            <div className="mt-2">
              <span className="font-medium text-sm">Subjects:</span>
              <span className="text-sm text-gray-700 ml-2">
                {block.subjects.length > 0 ? block.subjects.join(", ") : "No subjects listed"}
              </span>
            </div>
            <div className="mt-2">
              <span className="font-medium text-sm">Resources:</span>
              <p className="text-sm text-gray-700">{block.resources.oneLine}</p>
              {block.resources.extraLine && (
                <p className="opacity-80">{block.resources.extraLine}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ListView;
