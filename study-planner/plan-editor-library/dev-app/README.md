# Plan Editor Development App

A small development application for testing and developing the plan editor library using the generated JSON files from the Helios engine.

## Features

- **Tree-Based Layout**: Hierarchical display of cycles and blocks with visual tree structure
- **Drag & Drop**: Reorder blocks within cycles using intuitive drag-and-drop functionality
- **Collapsible Interface**: 
  - Cycles can be expanded/collapsed to show/hide blocks
  - Blocks can be expanded/collapsed to show/hide detailed week/task information
- **Elegant Design**: Modern UI using Tailwind CSS with consistent styling
- **Block Summary**: Each block shows subjects, duration, total hours, and task count
- **Interactive Plan Selection**: Switch between different generated plans (T1-T14)
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Visual Indicators**: Clear icons and hover effects for better user experience

## Getting Started

1. Install dependencies:
```bash
cd dev-app
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open your browser to `http://localhost:3001`

## Generated Plans Available

The app can load any of the following generated plans:
- T1 through T14 (14 different test scenarios)

Each plan contains:
- **Intake Data**: Student preferences and study strategy
- **Plan Structure**: Complete cycle-block-week-task hierarchy
- **Resource Information**: Curated resources for each subject
- **Timeline Data**: Start dates, durations, and utilization metrics

## Plan Structure

The generated plans follow this hierarchy:
```
Plan
├── Cycles (e.g., NCERT Foundation, Prelims Rapid Revision)
│   ├── Blocks (Subject-specific blocks within cycles)
│   │   ├── Weeks (Weekly planning within blocks)
│   │   │   ├── Days (Daily planning within weeks)
│   │   │   │   └── Tasks (Individual study tasks)
```

## Development Notes

- The app loads JavaScript files from `../../helios-ts/generated-docs/`
- Each file contains `window.studyPlanData` with the complete plan structure
- The app extracts and parses the JSON data for display
- This serves as a foundation for building the actual plan editor components

## Next Steps

This development app will be used to:
1. Test plan editor library components
2. Validate the generated plan structure
3. Develop drag-and-drop functionality
4. Implement plan editing capabilities
5. Test plan validation logic
