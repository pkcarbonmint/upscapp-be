import React, { useMemo } from 'react';
import type { BlockPreview } from '../types';

// Type definitions for transformed cycle data
interface TransformedCycle {
  cycleId: string;
  name: string;
  cycleType: string;
  order: number;
  blocks: BlockPreview[];
}

interface TimelineViewProps {
  sortedCycles: TransformedCycle[];
}

interface CalendarBlock {
  block: BlockPreview;
  cycle: TransformedCycle;
  startDate: Date;
  endDate: Date;
  monthKey: string;
}

const TimelineView: React.FC<TimelineViewProps> = ({ sortedCycles }) => {
  const formatHours = (hours: number): string => {
    return Math.round(hours * 10) / 10 + " h";
  };

  // Color scheme for different cycle types
  const getCycleColors = (cycleType: string) => {
    const type = cycleType.toLowerCase();
    if (type.includes('foundation')) {
      return {
        bg: 'bg-emerald-50',
        border: 'border-emerald-200',
        text: 'text-emerald-800',
        accent: 'bg-emerald-500',
        light: 'bg-emerald-100'
      };
    } else if (type.includes('consolidation')) {
      return {
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        text: 'text-blue-800',
        accent: 'bg-blue-500',
        light: 'bg-blue-100'
      };
    } else if (type.includes('revision')) {
      return {
        bg: 'bg-orange-50',
        border: 'border-orange-200',
        text: 'text-orange-800',
        accent: 'bg-orange-500',
        light: 'bg-orange-100'
      };
    } else {
      return {
        bg: 'bg-gray-50',
        border: 'border-gray-200',
        text: 'text-gray-800',
        accent: 'bg-gray-500',
        light: 'bg-gray-100'
      };
    }
  };

  // Show message if no cycles data
  if (!sortedCycles || sortedCycles.length === 0) {
    return (
      <div className="space-y-6">
        <h2 className="text-xl font-semibold">Study Plan Timeline</h2>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <div className="text-yellow-600 text-lg mb-2">📅</div>
          <h3 className="text-lg font-medium text-yellow-800 mb-2">No Timeline Data Available</h3>
          <p className="text-yellow-700">
            Your study plan timeline will appear here once the plan is generated.
            Please ensure you've completed all previous steps.
          </p>
        </div>
      </div>
    );
  }

  // Process blocks into calendar format
  const calendarData = useMemo(() => {
    const blocks: CalendarBlock[] = [];
    const monthsMap = new Map<string, CalendarBlock[]>();
    const undatedBlocks: CalendarBlock[] = [];

    sortedCycles.forEach(cycle => {
      cycle.blocks.forEach(block => {
        if (block.blockStartDate && block.blockEndDate) {
          try {
            const startDate = new Date(block.blockStartDate);
            const endDate = new Date(block.blockEndDate);
            
            if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
              const monthKey = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}`;
              
              const calendarBlock: CalendarBlock = {
                block,
                cycle,
                startDate,
                endDate,
                monthKey
              };
              
              blocks.push(calendarBlock);
              
              if (!monthsMap.has(monthKey)) {
                monthsMap.set(monthKey, []);
              }
              monthsMap.get(monthKey)!.push(calendarBlock);
            } else {
              // Add to undated blocks if dates are invalid
              const calendarBlock: CalendarBlock = {
                block,
                cycle,
                startDate: new Date(),
                endDate: new Date(),
                monthKey: 'undated'
              };
              undatedBlocks.push(calendarBlock);
            }
          } catch (error) {
            console.warn('Invalid date format for block:', block.blockId);
            // Add to undated blocks if date parsing fails
            const calendarBlock: CalendarBlock = {
              block,
              cycle,
              startDate: new Date(),
              endDate: new Date(),
              monthKey: 'undated'
            };
            undatedBlocks.push(calendarBlock);
          }
        } else {
          // Add to undated blocks if no dates provided
          const calendarBlock: CalendarBlock = {
            block,
            cycle,
            startDate: new Date(),
            endDate: new Date(),
            monthKey: 'undated'
          };
          undatedBlocks.push(calendarBlock);
        }
      });
    });

    // Sort months chronologically
    const sortedMonths = Array.from(monthsMap.entries()).sort(([a], [b]) => a.localeCompare(b));
    
    return { blocks, monthsMap: new Map(sortedMonths), undatedBlocks };
  }, [sortedCycles]);

  const renderBlockCard = (calendarBlock: CalendarBlock) => {
    const { block, cycle } = calendarBlock;
    const colors = getCycleColors(cycle.cycleType);
    
    return (
      <div 
        key={block.blockId} 
        className={`rounded-lg border ${colors.border} ${colors.bg} p-3 space-y-2 shadow-sm hover:shadow-md transition-shadow`}
      >
        <div className="flex items-start justify-between">
          <h4 className={`font-semibold ${colors.text} text-sm`}>{block.title}</h4>
          <div className={`w-3 h-3 ${colors.accent} rounded-full flex-shrink-0 mt-0.5`}></div>
        </div>
        
        <div className={`text-xs ${colors.text} opacity-75`}>
          <div>{block.durationWeeks} weeks • {block.dateRange}</div>
        </div>
        
        {block.subjects && block.subjects.length > 0 && (
          <p className={`text-xs ${colors.text} opacity-80`}>
            {block.subjects.slice(0, 3).join(", ")}
            {block.subjects.length > 3 && ` +${block.subjects.length - 3} more`}
          </p>
        )}
        
        <div className="grid grid-cols-2 gap-1 text-xs opacity-75">
          <span className={colors.text}>Study: {formatHours(block.hours?.studyHours || 0)}</span>
          <span className={colors.text}>Revision: {formatHours(block.hours?.revisionHours || 0)}</span>
        </div>
      </div>
    );
  };

  const renderMonthView = ([monthKey, blocks]: [string, CalendarBlock[]]) => {
    if (monthKey === 'undated') {
      // Special handling for undated blocks
      const blocksByCycle = blocks.reduce((acc, block) => {
        const cycleId = block.cycle.cycleId;
        if (!acc[cycleId]) {
          acc[cycleId] = {
            cycle: block.cycle,
            blocks: []
          };
        }
        acc[cycleId].blocks.push(block);
        return acc;
      }, {} as Record<string, { cycle: TransformedCycle; blocks: CalendarBlock[] }>);

      return (
        <div key={monthKey} className="space-y-4">
          <div className="flex items-center space-x-3">
            <h3 className="text-lg font-semibold text-gray-900">📋 Undated Blocks</h3>
            <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
              {blocks.length} block{blocks.length !== 1 ? 's' : ''}
            </span>
          </div>
          
          <div className="space-y-4">
            {Object.values(blocksByCycle).map(({ cycle, blocks: cycleBlocks }) => {
              const colors = getCycleColors(cycle.cycleType);
              
              return (
                <div key={cycle.cycleId} className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <span className={`text-sm font-medium ${colors.text}`}>{cycle.name}</span>
                  </div>
                  
                  <div className="grid gap-3 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {cycleBlocks.map(renderBlockCard)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    const [year, month] = monthKey.split('-');
    const monthName = new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('en-US', { 
      month: 'long', 
      year: 'numeric' 
    });

    // Group blocks by cycle for better organization
    const blocksByCycle = blocks.reduce((acc, block) => {
      const cycleId = block.cycle.cycleId;
      if (!acc[cycleId]) {
        acc[cycleId] = {
          cycle: block.cycle,
          blocks: []
        };
      }
      acc[cycleId].blocks.push(block);
      return acc;
    }, {} as Record<string, { cycle: TransformedCycle; blocks: CalendarBlock[] }>);

    return (
      <div key={monthKey} className="space-y-4">
        <div className="flex items-center space-x-3">
          <h3 className="text-lg font-semibold text-gray-900">📅 {monthName}</h3>
          <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
            {blocks.length} block{blocks.length !== 1 ? 's' : ''}
          </span>
        </div>
        
        <div className="space-y-4">
          {Object.values(blocksByCycle).map(({ cycle, blocks: cycleBlocks }) => {
            const colors = getCycleColors(cycle.cycleType);
            
            return (
              <div key={cycle.cycleId} className="space-y-3">
                <div className="flex items-center space-x-2">
                  <span className={`text-sm font-medium ${colors.text}`}>{cycle.name}</span>
                </div>
                
                <div className="grid gap-3 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {cycleBlocks.map(renderBlockCard)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Render cycle legend
  const renderCycleLegend = () => {
    const uniqueCycles = Array.from(new Set(sortedCycles.map(c => c.cycleType)));
    
    return (
      <div className="flex flex-wrap gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <span className="text-sm font-medium text-gray-700">Cycle Types:</span>
        {uniqueCycles.map(cycleType => {
          const colors = getCycleColors(cycleType);
          return (
            <div key={cycleType} className="flex items-center space-x-2">
              <div className={`w-3 h-3 ${colors.accent} rounded-full`}></div>
              <span className="text-sm text-gray-600">{cycleType}</span>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {renderCycleLegend()}
      
      <div className="space-y-8">
        {calendarData.monthsMap.size > 0 ? (
          Array.from(calendarData.monthsMap.entries()).map(renderMonthView)
        ) : (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
            <div className="text-gray-400 text-lg mb-2">📅</div>
            <p className="text-gray-500">No dated blocks available for calendar view</p>
            <p className="text-sm text-gray-400 mt-1">Blocks need valid start and end dates to appear in the calendar</p>
          </div>
        )}
        
        {/* Show undated blocks if any exist */}
        {calendarData.undatedBlocks.length > 0 && (
          <div className="space-y-4">
            {renderMonthView(['undated', calendarData.undatedBlocks])}
          </div>
        )}
      </div>
    </div>
  );
};

export default TimelineView;
