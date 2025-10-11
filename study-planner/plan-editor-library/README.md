# Plan Editor Library

A reusable React library for editing UPSC study plans with drag-and-drop functionality for the cycle-block-week-task structure.

## Structure

```
plan-editor-library/
├── src/
│   ├── components/
│   │   ├── PlanEditor.tsx          # Main editor component
│   │   ├── CycleEditor.tsx          # Cycle-level editing
│   │   ├── BlockEditor.tsx          # Block-level editing
│   │   ├── WeekEditor.tsx           # Week-level editing
│   │   ├── TaskEditor.tsx           # Task-level editing
│   │   ├── DragDropProvider.tsx     # Drag and drop context
│   │   └── TimelineView.tsx         # Visual timeline
│   ├── hooks/
│   │   ├── usePlanEditor.ts         # Main editor hook
│   │   ├── useDragDrop.ts           # Drag and drop logic
│   │   └── useValidation.ts         # Plan validation
│   ├── types/
│   │   └── editor.ts                # TypeScript definitions
│   ├── utils/
│   │   ├── validation.ts           # Validation utilities
│   │   ├── helpers.ts              # Helper functions
│   │   └── constants.ts             # Constants
│   └── index.ts                    # Main export
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

## Installation

```bash
npm install plan-editor-library
```

## Usage

```tsx
import { PlanEditor } from 'plan-editor-library';

function MyComponent() {
  const handlePlanChange = (plan: StudyPlan) => {
    console.log('Plan updated:', plan);
  };

  return (
    <PlanEditor
      initialPlan={studyPlan}
      onChange={handlePlanChange}
      onSave={handleSave}
      onValidate={handleValidate}
    />
  );
}
```

## Features

- **Drag & Drop**: Reorder cycles, blocks, weeks, and tasks
- **Visual Timeline**: See the complete plan structure
- **Validation**: Real-time validation with Helios engine
- **Auto-save**: Draft saving with session management
- **Responsive**: Works on desktop and mobile
- **Accessible**: Full keyboard navigation support
