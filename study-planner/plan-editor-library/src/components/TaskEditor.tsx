import React from 'react';
import { Task, DailyPlan } from '../types/editor';
import { withDragDrop } from './DragDropProvider';

interface TaskEditorProps {
  tasks: Task[];
  onDayUpdate: (day: DailyPlan) => void;
  readOnly?: boolean;
}

const TaskItem: React.FC<{
  task: Task;
  onUpdate: (task: Task) => void;
  onDelete: () => void;
  readOnly?: boolean;
}> = ({ task, onUpdate, onDelete, readOnly }) => {
  const handleTitleChange = (newTitle: string) => {
    if (readOnly) return;
    onUpdate({
      ...task,
      title2: newTitle
    });
  };

  const handleDurationChange = (newDuration: number) => {
    if (readOnly) return;
    onUpdate({
      ...task,
      duration_minutes: newDuration
    });
  };

  const handleDetailsLinkChange = (newLink: string) => {
    if (readOnly) return;
    onUpdate({
      ...task,
      details_link: newLink || undefined
    });
  };

  return (
    <div className="task-item p-3 border border-gray-200 rounded-lg bg-white">
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <input
            type="text"
            value={task.title2}
            onChange={(e) => handleTitleChange(e.target.value)}
            disabled={readOnly}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-medium"
            placeholder="Task title..."
          />
        </div>
        {!readOnly && (
          <button
            onClick={onDelete}
            className="ml-2 px-2 py-1 text-red-600 hover:bg-red-100 rounded text-sm"
          >
            Delete
          </button>
        )}
      </div>
      
      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <label className="text-xs font-medium text-gray-700 w-16">
            Duration:
          </label>
          <input
            type="number"
            value={task.duration_minutes}
            onChange={(e) => handleDurationChange(parseInt(e.target.value))}
            disabled={readOnly}
            min="1"
            max="480"
            className="flex-1 p-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          />
          <span className="text-xs text-gray-500">min</span>
        </div>
        
        <div className="flex items-center space-x-2">
          <label className="text-xs font-medium text-gray-700 w-16">
            Link:
          </label>
          <input
            type="url"
            value={task.details_link || ''}
            onChange={(e) => handleDetailsLinkChange(e.target.value)}
            disabled={readOnly}
            placeholder="Optional details link..."
            className="flex-1 p-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        
        <div className="text-xs text-gray-500">
          ID: {task.humanReadableId}
        </div>
      </div>
    </div>
  );
};

const DraggableTaskItem = withDragDrop(TaskItem, 'task');

export const TaskEditor: React.FC<TaskEditorProps> = ({
  tasks,
  onDayUpdate,
  readOnly = false
}) => {
  const handleTaskUpdate = (updatedTask: Task) => {
    const updatedTasks = tasks.map(task => 
      task.task_id === updatedTask.task_id ? updatedTask : task
    );
    
    // Create a mock daily plan for the update
    const updatedDay: DailyPlan = {
      day: 1, // This would need to be passed from parent
      tasks: updatedTasks
    };
    
    onDayUpdate(updatedDay);
  };

  const handleTaskDelete = (taskId: string) => {
    const updatedTasks = tasks.filter(task => task.task_id !== taskId);
    
    const updatedDay: DailyPlan = {
      day: 1, // This would need to be passed from parent
      tasks: updatedTasks
    };
    
    onDayUpdate(updatedDay);
  };

  const handleAddTask = () => {
    if (readOnly) return;
    
    const newTask: Task = {
      task_id: `task_${Date.now()}`,
      humanReadableId: `T${tasks.length + 1}`,
      title2: 'New Task',
      duration_minutes: 60,
      details_link: undefined
    };
    
    const updatedTasks = [...tasks, newTask];
    
    const updatedDay: DailyPlan = {
      day: 1, // This would need to be passed from parent
      tasks: updatedTasks
    };
    
    onDayUpdate(updatedDay);
  };

  const totalMinutes = tasks.reduce((sum, task) => sum + task.duration_minutes, 0);

  return (
    <div className="task-editor">
      <div className="flex items-center justify-between mb-3">
        <h6 className="text-xs font-medium text-gray-700">
          Tasks ({tasks.length}) - {Math.round(totalMinutes / 60)}h {totalMinutes % 60}m
        </h6>
        {!readOnly && (
          <button
            onClick={handleAddTask}
            className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
          >
            Add Task
          </button>
        )}
      </div>
      
      <div className="space-y-2">
        {tasks.map((task, index) => (
          <DraggableTaskItem
            key={task.task_id}
            itemId={task.task_id}
            index={index}
            task={task}
            onUpdate={handleTaskUpdate}
            onDelete={() => handleTaskDelete(task.task_id)}
            readOnly={readOnly}
          />
        ))}
        
        {tasks.length === 0 && (
          <div className="text-center py-4 text-gray-500 text-sm">
            No tasks yet. {!readOnly && 'Click "Add Task" to get started.'}
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskEditor;
