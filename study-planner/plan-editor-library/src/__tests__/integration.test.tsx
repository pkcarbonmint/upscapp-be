import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DragDropProvider, withDragDrop } from '../components/DragDropProvider';
import { StudyCycle, CycleType, CycleIntensity } from '../types/editor';

// Mock component for testing drag and drop
const TestDraggableComponent = ({ 
  itemId, 
  index, 
  data, 
  onDragStart, 
  onDragEnd 
}: {
  itemId: string;
  index: number;
  data: any;
  onDragStart?: (item: any) => void;
  onDragEnd?: () => void;
}) => {
  return (
    <div 
      data-testid={`draggable-${itemId}`}
      onDragStart={(e) => {
        const item = { type: 'test', id: itemId, data, sourceIndex: index };
        onDragStart?.(item);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', JSON.stringify(item));
      }}
      onDragEnd={onDragEnd}
      draggable
    >
      {data.name || `Item ${itemId}`}
    </div>
  );
};

// Create a wrapper that passes itemId to the inner component
const DraggableTestComponent = ({ itemId, ...props }: any) => {
  return (
    <div data-testid={`draggable-${itemId}`}>
      <TestDraggableComponent itemId={itemId} {...props} />
    </div>
  );
};

describe('Drag and Drop Integration', () => {
  const mockOnReorder = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should handle drag start and end', async () => {
    const user = userEvent.setup();

    render(
      <DragDropProvider onReorder={mockOnReorder}>
        <DraggableTestComponent
          itemId="item-1"
          index={0}
          data={{ name: 'Test Item 1' }}
        />
      </DragDropProvider>
    );

    const draggableElement = screen.getByTestId('draggable-item-1');
    
    // Start drag
    await user.pointer([
      { target: draggableElement, keys: '[MouseLeft>]' },
      { target: draggableElement, coords: { x: 10, y: 10 } }
    ]);

    expect(draggableElement).toHaveClass('dragging');
  });

  it('should handle drop events', async () => {
    const user = userEvent.setup();

    render(
      <DragDropProvider onReorder={mockOnReorder}>
        <div>
          <DraggableTestComponent
            itemId="item-1"
            index={0}
            data={{ name: 'Test Item 1' }}
          />
          <DraggableTestComponent
            itemId="item-2"
            index={1}
            data={{ name: 'Test Item 2' }}
          />
        </div>
      </DragDropProvider>
    );

    const item1 = screen.getByTestId('draggable-item-1');
    const item2 = screen.getByTestId('draggable-item-2');

    // Simulate drag and drop
    fireEvent.dragStart(item1);
    fireEvent.dragOver(item2);
    fireEvent.drop(item2);

    expect(mockOnReorder).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'test',
        id: 'item-1',
        sourceIndex: 0
      }),
      'item-2',
      1
    );
  });

  it('should provide drag drop context to children', () => {
    const TestContextConsumer = () => {
      const { isDragging } = useDragDrop();
      return <div data-testid="context-info">{isDragging ? 'Dragging' : 'Not dragging'}</div>;
    };

    render(
      <DragDropProvider onReorder={mockOnReorder}>
        <TestContextConsumer />
      </DragDropProvider>
    );

    expect(screen.getByTestId('context-info')).toHaveTextContent('Not dragging');
  });

  it('should handle multiple drag operations', async () => {
    const user = userEvent.setup();

    render(
      <DragDropProvider onReorder={mockOnReorder}>
        <div>
          <DraggableTestComponent
            itemId="item-1"
            index={0}
            data={{ name: 'Test Item 1' }}
          />
          <DraggableTestComponent
            itemId="item-2"
            index={1}
            data={{ name: 'Test Item 2' }}
          />
          <DraggableTestComponent
            itemId="item-3"
            index={2}
            data={{ name: 'Test Item 3' }}
          />
        </div>
      </DragDropProvider>
    );

    const item1 = screen.getByTestId('draggable-item-1');
    const item2 = screen.getByTestId('draggable-item-2');
    const item3 = screen.getByTestId('draggable-item-3');

    // First drag operation
    fireEvent.dragStart(item1);
    fireEvent.dragOver(item2);
    fireEvent.drop(item2);

    expect(mockOnReorder).toHaveBeenCalledTimes(1);

    // Second drag operation
    fireEvent.dragStart(item3);
    fireEvent.dragOver(item1);
    fireEvent.drop(item1);

    expect(mockOnReorder).toHaveBeenCalledTimes(2);
  });

  it('should handle drag over events', () => {
    render(
      <DragDropProvider onReorder={mockOnReorder}>
        <DraggableTestComponent
          itemId="item-1"
          index={0}
          data={{ name: 'Test Item 1' }}
        />
      </DragDropProvider>
    );

    const draggableElement = screen.getByTestId('draggable-item-1');
    
    // Simulate drag over
    fireEvent.dragOver(draggableElement);
    
    // Should not throw any errors
    expect(draggableElement).toBeInTheDocument();
  });

  it('should handle drag end without drop', () => {
    render(
      <DragDropProvider onReorder={mockOnReorder}>
        <DraggableTestComponent
          itemId="item-1"
          index={0}
          data={{ name: 'Test Item 1' }}
        />
      </DragDropProvider>
    );

    const draggableElement = screen.getByTestId('draggable-item-1');
    
    // Simulate drag start and end without drop
    fireEvent.dragStart(draggableElement);
    fireEvent.dragEnd(draggableElement);
    
    // Should not call onReorder
    expect(mockOnReorder).not.toHaveBeenCalled();
  });

  it('should work without onReorder callback', () => {
    render(
      <DragDropProvider>
        <DraggableTestComponent
          itemId="item-1"
          index={0}
          data={{ name: 'Test Item 1' }}
        />
      </DragDropProvider>
    );

    const draggableElement = screen.getByTestId('draggable-item-1');
    
    // Should not throw any errors
    fireEvent.dragStart(draggableElement);
    fireEvent.dragOver(draggableElement);
    fireEvent.drop(draggableElement);
    
    expect(draggableElement).toBeInTheDocument();
  });
});

describe('Plan Editor Integration', () => {
  const mockCycle: StudyCycle = {
    cycleId: 'cycle_1',
    cycleType: CycleType.FoundationCycle,
    cycleIntensity: CycleIntensity.Moderate,
    cycleDuration: 4,
    cycleStartWeek: 1,
    cycleOrder: 1,
    cycleName: 'Foundation Cycle',
    cycleBlocks: [],
    cycleDescription: 'Initial learning phase'
  };

  it('should handle cycle reordering', () => {
    const mockOnReorder = vi.fn();

    render(
      <DragDropProvider onReorder={mockOnReorder}>
        <div>
          <DraggableTestComponent
            itemId="cycle_1"
            index={0}
            data={mockCycle}
          />
          <DraggableTestComponent
            itemId="cycle_2"
            index={1}
            data={{ ...mockCycle, cycleId: 'cycle_2', cycleOrder: 2 }}
          />
        </div>
      </DragDropProvider>
    );

    const cycle1 = screen.getByTestId('draggable-cycle_1');
    const cycle2 = screen.getByTestId('draggable-cycle_2');

    fireEvent.dragStart(cycle1);
    fireEvent.dragOver(cycle2);
    fireEvent.drop(cycle2);

    expect(mockOnReorder).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'test',
        id: 'cycle_1',
        data: mockCycle,
        sourceIndex: 0
      }),
      'cycle_2',
      1
    );
  });

  it('should handle block reordering within cycle', () => {
    const mockOnReorder = vi.fn();

    const mockBlock1 = {
      block_id: 'block_1',
      block_title: 'Block 1',
      subjects: ['Polity'],
      duration_weeks: 4,
      weekly_plan: [],
      block_resources: { resources: [] }
    };

    const mockBlock2 = {
      block_id: 'block_2',
      block_title: 'Block 2',
      subjects: ['History'],
      duration_weeks: 3,
      weekly_plan: [],
      block_resources: { resources: [] }
    };

    render(
      <DragDropProvider onReorder={mockOnReorder}>
        <div>
          <DraggableTestComponent
            itemId="block_1"
            index={0}
            data={mockBlock1}
          />
          <DraggableTestComponent
            itemId="block_2"
            index={1}
            data={mockBlock2}
          />
        </div>
      </DragDropProvider>
    );

    const block1 = screen.getByTestId('draggable-block_1');
    const block2 = screen.getByTestId('draggable-block_2');

    fireEvent.dragStart(block1);
    fireEvent.dragOver(block2);
    fireEvent.drop(block2);

    expect(mockOnReorder).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'test',
        id: 'block_1',
        data: mockBlock1,
        sourceIndex: 0
      }),
      'block_2',
      1
    );
  });
});

