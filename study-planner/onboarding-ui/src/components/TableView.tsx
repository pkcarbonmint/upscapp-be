import React, { useState } from 'react';
import type { BlockPreview } from '../types';

// Type definitions for transformed cycle data
interface TransformedCycle {
  cycleId: string;
  name: string;
  cycleType: string;
  order: number;
  blocks: BlockPreview[];
}

interface TableViewProps {
  sortedCycles: TransformedCycle[];
}

const TableView: React.FC<TableViewProps> = ({ sortedCycles }) => {
  const [expandedCycles, setExpandedCycles] = useState<Set<string>>(new Set());

  const formatHours = (hours: number): string => {
    return `${hours}h`;
  };

  const formatDateRange = (startDate?: string, endDate?: string, durationWeeks?: number): string => {
    if (!startDate || !endDate) {
      return durationWeeks ? `${durationWeeks} weeks` : 'TBD';
    }
    
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      const formatDate = (date: Date) => {
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = String(date.getFullYear()).slice(-2);
        return `${day}/${month}/${year}`;
      };
      
      const duration = durationWeeks ? ` (${durationWeeks}w)` : '';
      return `${formatDate(start)} - ${formatDate(end)}${duration}`;
    } catch (error) {
      return durationWeeks ? `${durationWeeks} weeks` : 'Invalid Date';
    }
  };

  const toggleCycleExpansion = (cycleId: string) => {
    setExpandedCycles(prev => {
      const newSet = new Set(prev);
      if (newSet.has(cycleId)) {
        newSet.delete(cycleId);
      } else {
        newSet.add(cycleId);
      }
      return newSet;
    });
  };

  const calculateCycleTotals = (cycle: TransformedCycle) => {
    const totalWeeks = cycle.blocks.reduce((sum, block) => sum + block.durationWeeks, 0);
    const totalStudyHours = cycle.blocks.reduce((sum, block) => sum + block.hours.studyHours, 0);
    const totalRevisionHours = cycle.blocks.reduce((sum, block) => sum + block.hours.revisionHours, 0);
    const totalPracticeHours = cycle.blocks.reduce((sum, block) => sum + block.hours.practiceHours, 0);
    const totalTestHours = cycle.blocks.reduce((sum, block) => sum + block.hours.testHours, 0);
    
    return {
      totalWeeks,
      totalStudyHours,
      totalRevisionHours,
      totalPracticeHours,
      totalTestHours
    };
  };

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-200 rounded-lg">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                Cycle
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                Blocks
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                Total Duration
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                Study Hours
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                Revision Hours
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                Practice Hours
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                Test Hours
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {sortedCycles.map((cycle: TransformedCycle, cycleIndex: number) => {
              const isExpanded = expandedCycles.has(cycle.cycleId);
              const totals = calculateCycleTotals(cycle);
              
              return (
                <React.Fragment key={cycle.cycleId}>
                  {/* Cycle Summary Row */}
                  <tr 
                    className={`${cycleIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'} cursor-pointer hover:bg-blue-50 transition-colors`}
                    onClick={() => toggleCycleExpansion(cycle.cycleId)}
                  >
                    <td className="px-4 py-3 text-sm">
                      <div className="flex items-center">
                        <span className="mr-2 text-gray-400">
                          {isExpanded ? '▼' : '▶'}
                        </span>
                        <div>
                          <div className="font-medium text-gray-900">{cycle.name}</div>
                          <div className="text-xs text-gray-500">Click to {isExpanded ? 'collapse' : 'expand'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {cycle.blocks.length} blocks
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {totals.totalWeeks} weeks
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {formatHours(totals.totalStudyHours)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {formatHours(totals.totalRevisionHours)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {formatHours(totals.totalPracticeHours)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {formatHours(totals.totalTestHours)}
                    </td>
                  </tr>
                  
                  {/* Expanded Block Details */}
                  {isExpanded && (
                    <tr>
                      <td colSpan={7} className="px-0 py-0">
                        <div className="bg-gray-50 border-t border-gray-200">
                          <div className="px-4 py-3">
                            <h4 className="text-sm font-medium text-gray-700 mb-3">Blocks in {cycle.name}:</h4>
                            <div className="overflow-x-auto">
                              <table className="min-w-full bg-white border border-gray-200 rounded">
                                <thead className="bg-gray-100">
                                  <tr>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Block</th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Duration & Dates</th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Subjects</th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Study</th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Revision</th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Practice</th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Test</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                  {cycle.blocks.map((block: BlockPreview, blockIndex: number) => (
                                    <tr key={block.blockId} className={blockIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                      <td className="px-3 py-2 text-sm">
                                        <div className="font-medium text-gray-900">{block.title}</div>
                                        <div className="text-xs text-gray-500">#{blockIndex + 1}</div>
                                      </td>
                                      <td className="px-3 py-2 text-sm text-gray-900">
                                        {formatDateRange(block.blockStartDate, block.blockEndDate, block.durationWeeks)}
                                      </td>
                                      <td className="px-3 py-2 text-sm text-gray-900">
                                        <div className="max-w-xs truncate" title={block.subjects.join(", ")}>
                                          {block.subjects.length > 0 ? block.subjects.join(", ") : "No subjects"}
                                        </div>
                                      </td>
                                      <td className="px-3 py-2 text-sm text-gray-900">
                                        {formatHours(block.hours.studyHours)}
                                      </td>
                                      <td className="px-3 py-2 text-sm text-gray-900">
                                        {formatHours(block.hours.revisionHours)}
                                      </td>
                                      <td className="px-3 py-2 text-sm text-gray-900">
                                        {formatHours(block.hours.practiceHours)}
                                      </td>
                                      <td className="px-3 py-2 text-sm text-gray-900">
                                        {formatHours(block.hours.testHours)}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TableView;
