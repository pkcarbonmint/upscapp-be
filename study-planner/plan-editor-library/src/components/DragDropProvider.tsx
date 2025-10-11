import React, { createContext, useContext, useCallback, useState } from 'react';
import { DragDropItem } from '../types/editor';

interface DragDropContextType {
  draggedItem: DragDropItem | null;
  setDraggedItem: (item: DragDropItem | null) => void;
  handleDrop: (targetId: string, targetIndex: number) => void;
  isDragging: boolean;
}

const DragDropContext = createContext<DragDropContextType | undefined>(undefined);

export const useDragDrop = () => {
  const context = useContext(DragDropContext);
  if (!context) {
    throw new Error('useDragDrop must be used within a DragDropProvider');
  }
  return context;
};

interface DragDropProviderProps {
  children: React.ReactNode;
  onReorder?: (item: DragDropItem, targetId: string, targetIndex: number) => void;
}

export const DragDropProvider: React.FC<DragDropProviderProps> = ({
  children,
  onReorder
}) => {
  const [draggedItem, setDraggedItem] = useState<DragDropItem | null>(null);

  const handleDrop = useCallback((targetId: string, targetIndex: number) => {
    if (draggedItem && onReorder) {
      onReorder(draggedItem, targetId, targetIndex);
    }
    setDraggedItem(null);
  }, [draggedItem, onReorder]);

  const value: DragDropContextType = {
    draggedItem,
    setDraggedItem,
    handleDrop,
    isDragging: draggedItem !== null
  };

  return (
    <DragDropContext.Provider value={value}>
      {children}
    </DragDropContext.Provider>
  );
};

// Drag and Drop HOC for components
export const withDragDrop = <P extends object>(
  Component: React.ComponentType<P>,
  itemType: DragDropItem['type']
) => {
  return React.forwardRef<HTMLDivElement, P & { 
    itemId: string; 
    index: number;
    onDragStart?: (item: DragDropItem) => void;
    onDragEnd?: () => void;
  }>((props, ref) => {
    const { draggedItem, setDraggedItem, handleDrop } = useDragDrop();
    const { itemId, index, onDragStart, onDragEnd, ...rest } = props;

    const handleDragStart = useCallback((e: React.DragEvent) => {
      const item: DragDropItem = {
        type: itemType,
        id: itemId,
        data: props,
        sourceIndex: index
      };
      
      setDraggedItem(item);
      onDragStart?.(item);
      
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', JSON.stringify(item));
    }, [itemId, index, props, setDraggedItem, onDragStart]);

    const handleDragEnd = useCallback(() => {
      setDraggedItem(null);
      onDragEnd?.();
    }, [setDraggedItem, onDragEnd]);

    const handleDragOver = useCallback((e: React.DragEvent) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
    }, []);

    const handleDropEvent = useCallback((e: React.DragEvent) => {
      e.preventDefault();
      handleDrop(itemId, index);
    }, [handleDrop, itemId, index]);

    return (
      <div
        ref={ref}
        draggable
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragOver={handleDragOver}
        onDrop={handleDropEvent}
        className={`drag-item ${draggedItem?.id === itemId ? 'dragging' : ''}`}
      >
        <Component {...(rest as P)} />
      </div>
    );
  });
};
