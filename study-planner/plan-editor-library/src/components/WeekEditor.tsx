import React from 'react';
import { WeeklyPlan, Block } from '../types/editor';
import { withDragDrop } from './DragDropProvider';
import TaskEditor from './TaskEditor';

interface WeekEditorProps {
  weeks: WeeklyPlan[];
  selectedWeek?: number;
  onBlockUpdate: (block: Block) => void;
  onWeekSelect: (week: number | undefined) => void;
  readOnly?: boolean;
}

const WeekItem: React.FC<{
  week: WeeklyPlan;
  isSelected: boolean;
  onSelect: () => void;
}> = ({ week, isSelected, onSelect }) => {
  const totalTasks = week.daily_plans.reduce((sum, day) => sum + day.tasks.length, 0);
  const totalMinutes = week.daily_plans.reduce((sum, day) => 
    sum + day.tasks.reduce((daySum, task) => daySum + task.duration_minutes, 0), 0
  );

  return (
    <div 
      className={`week-item p-3 border rounded-lg cursor-pointer transition-colors ${
        isSelected ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:border-gray-300'
      }`}
      onClick={onSelect}
    >
      <div className="flex items-center justify-between mb-2">
        <h5 className="text-sm font-semibold text-gray-900">
          Week {week.week}
        </h5>
        <span className="text-xs text-gray-500">
          {totalTasks} tasks, {Math.round(totalMinutes / 60)}h
        </span>
      </div>
      
      <div className="space-y-1">
        {week.daily_plans.map((day, dayIndex) => (
          <div key={dayIndex} className="text-xs text-gray-600">
            Day {day.day}: {day.tasks.length} tasks
          </div>
        ))}
      </div>
    </div>
  );
};

const DraggableWeekItem = withDragDrop(WeekItem, 'week');

export const WeekEditor: React.FC<WeekEditorProps> = ({
  weeks,
  selectedWeek,
  onWeekSelect,
  readOnly = false
}) => {
  const handleWeekUpdate = (updatedWeek: WeeklyPlan) => {
    // This would need to be implemented to update the parent block
    console.log('Week updated:', updatedWeek);
  };

  const handleAddWeek = () => {
    if (readOnly) return;
    
    const newWeek: WeeklyPlan = {
      week: weeks.length + 1,
      daily_plans: []
    };
    
    // This would need to be implemented to add to the parent block
    console.log('New week:', newWeek);
  };

  const selectedWeekData = weeks.find(week => week.week === selectedWeek);

  return (
    <div className="week-editor">
      <div className="weeks-list">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-md font-semibold text-gray-900">Weekly Plans</h4>
          {!readOnly && (
            <button
              onClick={handleAddWeek}
              className="px-3 py-1 bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:ring-2 focus:ring-purple-500 text-sm"
            >
              Add Week
            </button>
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {weeks.map((week, index) => (
            <DraggableWeekItem
              key={week.week}
              itemId={`week_${week.week}`}
              index={index}
              week={week}
              isSelected={selectedWeek === week.week}
              onSelect={() => onWeekSelect(week.week)}
            />
          ))}
        </div>
      </div>
      
      {selectedWeekData && (
        <div className="selected-week-details mt-6">
          <h5 className="text-sm font-semibold text-gray-900 mb-4">
            Daily Plans for Week {selectedWeekData.week}
          </h5>
          <div className="space-y-4">
            {selectedWeekData.daily_plans.map((day, dayIndex) => (
              <div key={dayIndex} className="border border-gray-200 rounded-lg p-4">
                <h6 className="text-sm font-medium text-gray-800 mb-2">
                  Day {day.day}
                </h6>
                <TaskEditor
                  tasks={day.tasks}
                  onDayUpdate={(updatedDay) => {
                    const updatedDailyPlans = [...selectedWeekData.daily_plans];
                    updatedDailyPlans[dayIndex] = updatedDay;
                    handleWeekUpdate({
                      ...selectedWeekData,
                      daily_plans: updatedDailyPlans
                    });
                  }}
                  readOnly={readOnly}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default WeekEditor;
