import React from 'react';
import { Block, StudyCycle } from '../types/editor';
import { withDragDrop } from './DragDropProvider';
import { WeekEditor } from './WeekEditor';

interface BlockEditorProps {
  blocks: Block[];
  selectedBlock?: string;
  selectedWeek?: number;
  onCycleUpdate: (cycle: StudyCycle) => void;
  onBlockSelect: (blockId: string | undefined) => void;
  onWeekSelect: (week: number | undefined) => void;
  readOnly?: boolean;
}

const BlockItem: React.FC<{
  block: Block;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (block: Block) => void;
  readOnly?: boolean;
}> = ({ block, isSelected, onSelect, onUpdate, readOnly }) => {
  const handleTitleChange = (newTitle: string) => {
    if (readOnly) return;
    onUpdate({
      ...block,
      block_title: newTitle
    });
  };

  const handleDurationChange = (newDuration: number) => {
    if (readOnly) return;
    onUpdate({
      ...block,
      duration_weeks: newDuration
    });
  };

  const handleSubjectsChange = (newSubjects: string[]) => {
    if (readOnly) return;
    onUpdate({
      ...block,
      subjects: newSubjects
    });
  };

  const addSubject = () => {
    if (readOnly) return;
    const newSubject = prompt('Enter subject name:');
    if (newSubject) {
      handleSubjectsChange([...block.subjects, newSubject]);
    }
  };

  const removeSubject = (index: number) => {
    if (readOnly) return;
    const newSubjects = block.subjects.filter((_, i) => i !== index);
    handleSubjectsChange(newSubjects);
  };

  return (
    <div 
      className={`block-item p-4 border rounded-lg cursor-pointer transition-colors ${
        isSelected ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-gray-300'
      }`}
      onClick={onSelect}
    >
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-md font-semibold text-gray-900">
          {block.block_title}
        </h4>
        <span className="text-sm text-gray-500">
          {block.duration_weeks} weeks
        </span>
      </div>
      
      <div className="space-y-2">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Block Title
          </label>
          <input
            type="text"
            value={block.block_title}
            onChange={(e) => handleTitleChange(e.target.value)}
            disabled={readOnly}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Duration (weeks)
          </label>
          <input
            type="number"
            value={block.duration_weeks}
            onChange={(e) => handleDurationChange(parseInt(e.target.value))}
            disabled={readOnly}
            min="1"
            max="12"
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Subjects
          </label>
          <div className="space-y-1">
            {block.subjects.map((subject, index) => (
              <div key={index} className="flex items-center space-x-2">
                <span className="flex-1 p-2 bg-gray-100 rounded text-sm">
                  {subject}
                </span>
                {!readOnly && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeSubject(index);
                    }}
                    className="px-2 py-1 text-red-600 hover:bg-red-100 rounded text-sm"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
            {!readOnly && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  addSubject();
                }}
                className="px-3 py-1 text-blue-600 hover:bg-blue-100 rounded text-sm"
              >
                + Add Subject
              </button>
            )}
          </div>
        </div>
      </div>
      
      <div className="mt-3">
        <span className="text-sm text-gray-600">
          {block.weekly_plan.length} weeks planned
        </span>
      </div>
    </div>
  );
};

const DraggableBlockItem = withDragDrop(BlockItem, 'block');

export const BlockEditor: React.FC<BlockEditorProps> = ({
  blocks,
  selectedBlock,
  selectedWeek,
  onBlockSelect,
  onWeekSelect,
  readOnly = false
}) => {
  const handleBlockUpdate = (updatedBlock: Block) => {
    // This would need to be implemented to update the parent cycle
    // For now, we'll just call the onCycleUpdate with the updated block
    console.log('Block updated:', updatedBlock);
  };

  const handleAddBlock = () => {
    if (readOnly) return;
    
    const newBlock: Block = {
      block_id: `block_${Date.now()}`,
      block_title: `New Block ${blocks.length + 1}`,
      subjects: [],
      duration_weeks: 4,
      weekly_plan: [],
      block_resources: { resources: [] }
    };
    
    // This would need to be implemented to add to the parent cycle
    console.log('New block:', newBlock);
  };

  const selectedBlockData = blocks.find(block => block.block_id === selectedBlock);

  return (
    <div className="block-editor">
      <div className="blocks-list">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Study Blocks</h3>
          {!readOnly && (
            <button
              onClick={handleAddBlock}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:ring-2 focus:ring-green-500"
            >
              Add Block
            </button>
          )}
        </div>
        
        <div className="space-y-3">
          {blocks.map((block, index) => (
            <DraggableBlockItem
              key={block.block_id}
              itemId={block.block_id}
              index={index}
              block={block}
              isSelected={selectedBlock === block.block_id}
              onSelect={() => onBlockSelect(block.block_id)}
              onUpdate={handleBlockUpdate}
              readOnly={readOnly}
            />
          ))}
        </div>
      </div>
      
      {selectedBlockData && (
        <div className="selected-block-details mt-6">
          <h4 className="text-md font-semibold text-gray-900 mb-4">
            Weekly Plans in {selectedBlockData.block_title}
          </h4>
          <WeekEditor
            weeks={selectedBlockData.weekly_plan}
            selectedWeek={selectedWeek}
            onBlockUpdate={handleBlockUpdate}
            onWeekSelect={onWeekSelect}
            readOnly={readOnly}
          />
        </div>
      )}
    </div>
  );
};

export default BlockEditor;
