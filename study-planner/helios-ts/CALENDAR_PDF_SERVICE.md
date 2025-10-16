# Calendar PDF Service Documentation

This document provides comprehensive documentation for the `CalendarPDFService` - a specialized PDF generation service designed for calendar-focused study plan visualizations.

## Overview

The `CalendarPDFService` is a high-fidelity PDF generation service that specializes in calendar views, timeline visualizations, and schedule-based layouts. It maintains the exact same interface as the existing `PDFService` and `HighFidelityPDFService`, making it a drop-in replacement while providing enhanced calendar-specific features.

### Key Features

✅ **Identical Interface**: Same API as PDFService and HighFidelityPDFService for easy swapping  
✅ **Calendar-Focused Design**: Specialized layouts for scheduling and timeline visualization  
✅ **Timeline Views**: Gantt-style charts and interactive timeline markers  
✅ **Monthly Calendar**: Grid-based monthly calendar views with event markers  
✅ **Weekly Schedule**: Detailed weekly schedule breakdowns  
✅ **High-Quality Rendering**: Puppeteer-powered for crisp graphics and typography  
✅ **Color-Coded Cycles**: Calendar-optimized color schemes for different cycle types  
✅ **Interactive Charts**: Enhanced Chart.js visualizations for calendar data  

## Installation & Setup

### Dependencies

The CalendarPDFService requires the following dependencies (already included in package.json):

```json
{
  "dependencies": {
    "puppeteer": "^24.24.0",
    "dayjs": "^1.11.18",
    "chart.js": "^4.4.0",
    "chartjs-adapter-date-fns": "^3.0.0"
  }
}
```

### System Requirements

- **Node.js**: 18+ (for Puppeteer support)
- **Chrome/Chromium**: Automatically installed by Puppeteer
- **Memory**: Recommended 2GB+ available RAM
- **Storage**: Additional space for Chrome installation

### Environment Variables

```bash
# Optional: Set custom Chrome path
CHROME_PATH=/usr/bin/chromium-browser
```

## Usage

### Basic Usage

```typescript
import { CalendarPDFService } from 'helios-ts';

// Generate calendar-focused structured PDF
await CalendarPDFService.generateStructuredPDF(
  studyPlan, 
  studentIntake, 
  'calendar-study-plan.pdf'
);

// Generate calendar-focused visual PDF with charts
await CalendarPDFService.generateVisualPDF(
  studyPlan, 
  studentIntake, 
  'calendar-visual-plan.pdf'
);

// Use unified API
await CalendarPDFService.generateStudyPlanPDF(studyPlan, studentIntake, {
  type: 'visual',
  filename: 'my-calendar-plan.pdf'
});
```

### Service Switching

```typescript
import { 
  PDFService, 
  HighFidelityPDFService, 
  CalendarPDFService 
} from 'helios-ts';

// Choose service based on requirements
const pdfService = useCalendarView 
  ? CalendarPDFService 
  : useHighFidelity 
    ? HighFidelityPDFService 
    : PDFService;

// All services have identical interfaces!
await pdfService.generateStructuredPDF(studyPlan, studentIntake);
```

### Environment-Based Selection

```typescript
// Use environment variable to control service
const useCalendarPDF = process.env.USE_CALENDAR_PDF === 'true';
const pdfService = useCalendarPDF ? CalendarPDFService : PDFService;

await pdfService.generateStudyPlanPDF(studyPlan, studentIntake, {
  type: 'structured',
  filename: 'study-plan.pdf'
});
```

## API Reference

The `CalendarPDFService` provides the exact same methods as `PDFService` and `HighFidelityPDFService`:

### `generateStructuredPDF(studyPlan, studentIntake, filename?)`

Generates a structured PDF with calendar-focused layout emphasizing timeline and scheduling.

**Parameters:**
- `studyPlan: StudyPlan` - The study plan data
- `studentIntake: StudentIntake` - Student information and preferences
- `filename?: string` - Optional output filename

**Features:**
- Timeline visualization with cycle markers
- Calendar-optimized table layouts
- Color-coded cycle phases
- Weekly schedule breakdowns
- Enhanced typography for dates and schedules

### `generateVisualPDF(studyPlan, studentIntake, filename?)`

Generates a visual PDF with calendar charts, monthly views, and timeline visualizations.

**Parameters:**
- `studyPlan: StudyPlan` - The study plan data
- `studentIntake: StudentIntake` - Student information and preferences
- `filename?: string` - Optional output filename

**Features:**
- Monthly calendar grid views
- Gantt-style timeline charts
- Interactive Chart.js visualizations
- Weekly schedule layouts
- Color-coded event markers

### `generateStudyPlanPDF(studyPlan, studentIntake, options?)`

Unified API that accepts options for type and filename.

**Parameters:**
- `studyPlan: StudyPlan` - The study plan data
- `studentIntake: StudentIntake` - Student information and preferences
- `options?: Options` - Configuration options

```typescript
interface Options {
  filename?: string;
  type?: 'structured' | 'visual';
}
```

## Calendar-Specific Features

### Timeline Visualizations

The CalendarPDFService includes advanced timeline features:

- **Gantt-Style Charts**: Horizontal bar charts showing cycle durations
- **Timeline Markers**: Visual markers for important milestones
- **Color-Coded Phases**: Different colors for each cycle type
- **Interactive Elements**: Hover effects and detailed tooltips

### Monthly Calendar Views

- **Grid Layout**: Traditional monthly calendar grid
- **Event Markers**: Study cycles and blocks marked on dates
- **Color Coding**: Consistent color scheme across all views
- **Responsive Design**: Adapts to different page sizes

### Weekly Schedule Views

- **Detailed Breakdowns**: Week-by-week study block information
- **Subject Allocation**: Clear subject distribution per week
- **Resource Mapping**: Resources linked to specific weeks
- **Progress Tracking**: Visual progress indicators

### Enhanced Charts

The service includes specialized Chart.js configurations:

```typescript
// Timeline Chart (Gantt-style)
{
  type: 'bar',
  options: {
    indexAxis: 'y',
    scales: {
      x: { title: { text: 'Weeks' } },
      y: { title: { text: 'Cycles' } }
    }
  }
}

// Subject Distribution (Doughnut)
{
  type: 'doughnut',
  options: {
    plugins: {
      legend: { position: 'right' }
    }
  }
}
```

## Service Comparison

| Feature | PDFService | HighFidelityPDFService | CalendarPDFService |
|---------|------------|----------------------|-------------------|
| **Speed** | ⚡ Fast | 🐌 Slower | 🐌 Slower |
| **Quality** | ✅ Good | ⭐ Excellent | ⭐ Excellent |
| **Calendar Focus** | ❌ Basic | ❌ Basic | ⭐ Specialized |
| **Timeline Views** | ✅ Simple | ✅ Enhanced | ⭐ Advanced |
| **Monthly Calendar** | ❌ None | ❌ None | ⭐ Full Support |
| **Weekly Schedule** | ❌ Basic | ❌ Basic | ⭐ Detailed |
| **Gantt Charts** | ❌ None | ❌ None | ⭐ Yes |
| **Color Coding** | ✅ Basic | ✅ Enhanced | ⭐ Calendar-optimized |
| **File Size** | 📦 Small | 📦 Medium | 📦 Medium-Large |
| **Dependencies** | 📦 Light | 🔧 Heavy | 🔧 Heavy |
| **Browser Support** | ✅ Yes | 🚫 Node.js only | 🚫 Node.js only |

## When to Use CalendarPDFService

### ✅ Ideal For:

- **Schedule-Focused Presentations**: When timeline and calendar views are primary
- **Calendar-Based Planning Documents**: Monthly/weekly schedule handouts
- **Timeline and Milestone Tracking**: Progress visualization over time
- **Visual Progress Reports**: Charts and graphs for stakeholders
- **Student Calendar Handouts**: Printable calendar schedules
- **Academic Planning**: Semester and term-based planning
- **Project Management**: Study plan project timelines

### ⚠️ Consider Alternatives For:

- **High-Volume Batch Processing**: Use PDFService for better performance
- **Mobile App Integration**: Browser-based generation preferred
- **Real-Time PDF Generation**: Faster alternatives recommended
- **Memory-Constrained Environments**: Lighter services available
- **Simple Text-Based Reports**: PDFService sufficient
- **Performance-Critical Applications**: Consider caching strategies

## Color Scheme

The CalendarPDFService uses a specialized color palette optimized for calendar views:

```typescript
const CALENDAR_CYCLE_COLORS = {
  'C1': { bg: '#E3F2FD', border: '#2196F3', text: '#0D47A1' }, // Blue
  'C2': { bg: '#E8F5E8', border: '#4CAF50', text: '#1B5E20' }, // Green  
  'C3': { bg: '#FCE4EC', border: '#E91E63', text: '#880E4F' }, // Pink
  'C4': { bg: '#FFEBEE', border: '#F44336', text: '#B71C1C' }, // Red
  'C5': { bg: '#F3E5F5', border: '#9C27B0', text: '#4A148C' }, // Purple
  'C6': { bg: '#E1F5FE', border: '#00BCD4', text: '#006064' }, // Cyan
  'C7': { bg: '#FFF3E0', border: '#FF9800', text: '#E65100' }, // Orange
  'C8': { bg: '#F1F8E9', border: '#8BC34A', text: '#33691E' }, // Light Green
};
```

## Performance Considerations

### Optimization Tips

```typescript
// For better performance in production
const browser = await puppeteer.launch({
  headless: true,
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu'
  ]
});
```

### Memory Management

- **Chart Rendering**: Charts are rendered in-browser for better quality
- **Image Optimization**: Vector graphics preferred over raster images
- **Page Breaks**: Intelligent page break handling for calendar layouts
- **Resource Cleanup**: Automatic browser cleanup after generation

### Caching Strategies

```typescript
// Example caching implementation
const pdfCache = new Map();

async function getCachedPDF(cacheKey: string, generator: () => Promise<Buffer>) {
  if (pdfCache.has(cacheKey)) {
    return pdfCache.get(cacheKey);
  }
  
  const pdf = await generator();
  pdfCache.set(cacheKey, pdf);
  return pdf;
}
```

## Docker Configuration

For containerized deployments:

```dockerfile
# Install Chrome dependencies
RUN apt-get update && apt-get install -y \
    chromium-browser \
    fonts-liberation \
    fonts-noto-color-emoji \
    --no-install-recommends

# Set Chrome path
ENV CHROME_PATH=/usr/bin/chromium-browser

# Increase memory limits for PDF generation
ENV NODE_OPTIONS="--max-old-space-size=4096"
```

## Error Handling

### Common Issues and Solutions

**Chrome Launch Errors:**
```bash
# Install Chrome dependencies on Linux
apt-get install -y chromium-browser fonts-liberation
```

**Memory Issues:**
```javascript
// Increase Node.js memory limit
node --max-old-space-size=4096 your-script.js
```

**Permission Errors:**
```javascript
// Add sandbox bypass for containers
puppeteer.launch({
  args: ['--no-sandbox', '--disable-setuid-sandbox']
});
```

**Chart Rendering Issues:**
```typescript
// Wait for charts to load
await new Promise(resolve => setTimeout(resolve, 3000));
```

### Error Recovery

```typescript
try {
  await CalendarPDFService.generateStructuredPDF(plan, intake);
} catch (error) {
  if (error.message.includes('Chrome not found')) {
    // Fallback to basic service
    await PDFService.generateStructuredPDF(plan, intake);
  } else {
    // Log error and retry
    console.error('Calendar PDF generation failed:', error);
    throw error;
  }
}
```

## Examples

### Complete Example

```typescript
import { CalendarPDFService, StudyPlan, StudentIntake } from 'helios-ts';

const studyPlan: StudyPlan = {
  study_plan_id: 'upsc-2025-calendar',
  plan_title: 'UPSC 2025 Calendar Study Plan',
  targeted_year: 2025,
  cycles: [
    {
      cycleType: 'C1',
      cycleName: 'Foundation Phase',
      cycleStartDate: '2024-11-01',
      cycleEndDate: '2024-12-31',
      cycleDuration: 8,
      cycleBlocks: [
        {
          block_title: 'History & Culture',
          block_start_date: '2024-11-01',
          block_end_date: '2024-11-15',
          duration_weeks: 2,
          subjects: ['HIS', 'ART'],
          block_resources: {
            primary_books: [{ resource_title: 'NCERT History' }],
            supplementary_materials: [],
            current_affairs_sources: [],
            practice_resources: [],
            video_content: [],
            revision_materials: [],
            expert_recommendations: []
          }
        }
      ]
    }
  ]
};

const studentIntake: StudentIntake = {
  personal_details: {
    full_name: 'John Doe',
    email: 'john@example.com',
    student_archetype: 'Systematic Learner'
  },
  target_year: '2025',
  start_date: '2024-11-01'
};

// Generate calendar-focused PDFs
async function generateCalendarPDFs() {
  try {
    // Structured calendar PDF
    await CalendarPDFService.generateStructuredPDF(
      studyPlan,
      studentIntake,
      'calendar-structured-plan.pdf'
    );

    // Visual calendar PDF with charts
    await CalendarPDFService.generateVisualPDF(
      studyPlan,
      studentIntake,
      'calendar-visual-plan.pdf'
    );

    console.log('✅ Calendar PDFs generated successfully!');
  } catch (error) {
    console.error('❌ PDF generation failed:', error);
  }
}

generateCalendarPDFs();
```

### Service Comparison Example

```typescript
import { 
  PDFService, 
  HighFidelityPDFService, 
  CalendarPDFService 
} from 'helios-ts';

async function compareServices(studyPlan, studentIntake) {
  const services = [
    { name: 'Basic', service: PDFService },
    { name: 'HighFidelity', service: HighFidelityPDFService },
    { name: 'Calendar', service: CalendarPDFService }
  ];

  for (const { name, service } of services) {
    const startTime = Date.now();
    
    await service.generateStructuredPDF(
      studyPlan,
      studentIntake,
      `${name.toLowerCase()}-plan.pdf`
    );
    
    const duration = Date.now() - startTime;
    console.log(`${name} PDF generated in ${duration}ms`);
  }
}
```

## Migration Guide

### From PDFService

```typescript
// Before
import { PDFService } from 'helios-ts';
await PDFService.generateStructuredPDF(plan, intake);

// After - just change the import!
import { CalendarPDFService } from 'helios-ts';
await CalendarPDFService.generateStructuredPDF(plan, intake);
```

### Gradual Migration

```typescript
// Use feature flag to control service
const useCalendarPDF = process.env.ENABLE_CALENDAR_PDF === 'true';
const pdfService = useCalendarPDF ? CalendarPDFService : PDFService;

await pdfService.generateStructuredPDF(plan, intake);
```

## Future Enhancements

Planned improvements for CalendarPDFService:

- [ ] **Interactive Calendar Elements**: Clickable calendar dates in PDFs
- [ ] **Custom Calendar Themes**: User-defined color schemes and layouts
- [ ] **Multi-Language Calendar Support**: Localized month/day names
- [ ] **Calendar Export Integration**: iCal/Google Calendar export
- [ ] **Advanced Timeline Features**: Dependency tracking and critical path
- [ ] **Mobile-Optimized Layouts**: Responsive calendar views
- [ ] **Accessibility Improvements**: Screen reader and PDF/UA compliance
- [ ] **Performance Optimizations**: Faster rendering and smaller file sizes

## Support & Troubleshooting

### Debug Mode

Enable debug logging for troubleshooting:

```typescript
process.env.DEBUG = 'puppeteer:*';
await CalendarPDFService.generateStructuredPDF(plan, intake);
```

### Performance Monitoring

```typescript
const startTime = Date.now();
await CalendarPDFService.generateVisualPDF(plan, intake);
const duration = Date.now() - startTime;
console.log(`Calendar PDF generated in ${duration}ms`);
```

### Common Solutions

1. **Slow Generation**: Increase memory allocation and use caching
2. **Chart Issues**: Ensure Chart.js CDN is accessible
3. **Font Problems**: Install system fonts or use web fonts
4. **Layout Issues**: Check CSS media queries and page breaks

---

**Note**: The CalendarPDFService requires a Node.js environment and is not suitable for browser-based applications. For browser compatibility, use the original `PDFService`.

For additional support, please refer to the main documentation or create an issue in the project repository.