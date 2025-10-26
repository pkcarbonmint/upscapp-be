# Calendar PDF Generator Documentation

## Overview
This document provides a comprehensive guide for AI systems to generate high-quality PDF calendars for UPSC study plans, similar to the HighFidelityPDFService.ts implementation.

## Document Structure

### 1. Student Profile Section
**Location**: Top of the document
**Purpose**: Display comprehensive student information
**Data Required**:
```typescript
interface StudentProfile {
  personalDetails: {
    fullName: string;
    email: string;
    phoneNumber: string;
    location: string;
  };
  academicBackground: {
    graduation: string;
    college: string;
    yearOfPassing: number;
    studentType: string;
  };
  studyStrategy: {
    weeklyHours: string;
    studyApproach: string;
    focusCombo: string;
    optionalSubject: string;
  };
  preparationStatus: {
    preparingSince: string;
    previousAttempts: number;
    targetYear: number;
    startDate: string;
  };
}
```

**HTML Structure**:
```html
<div class="student-profile">
  <div class="profile-header">
    <div class="profile-title">Student Profile</div>
    <div class="profile-subtitle">UPSC {targetYear} Preparation Plan</div>
  </div>
  <div class="profile-grid">
    <!-- 4 profile cards with student information -->
  </div>
</div>
```

### 2. Year-Level Calendar
**Location**: After student profile
**Purpose**: Show study cycles and phases for the entire year
**Data Required**:
```typescript
interface YearCalendar {
  year: number;
  months: MonthCycle[];
}

interface MonthCycle {
  monthName: string;
  monthNumber: number;
  cycleType: CycleType;
  cycleDescription: string;
  days: DayCell[];
}

interface DayCell {
  dayNumber: number;
  isWeekend: boolean;
  cyclePhase: string;
  isActive: boolean;
}
```

**Cycle Types** (from Types.ts):
- C1: "NCERT Foundation Cycle"
- C2: "Comprehensive Foundation Cycle"
- C3: "Mains Revision Pre-Prelims Cycle"
- C4: "Prelims Reading Cycle"
- C5: "Prelims Revision Cycle"
- C5.b: "Prelims Rapid Revision Cycle"
- C6: "Mains Revision Cycle"
- C7: "Mains Rapid Revision Cycle"
- C8: "Mains Foundation Cycle"

### 3. Month-Level Calendar
**Location**: After year calendar
**Purpose**: Show subject-level tasks for the selected month
**Data Required**:
```typescript
interface MonthCalendar {
  monthName: string;
  year: number;
  weeks: WeekRow[];
}

interface WeekRow {
  days: MonthDayCell[];
}

interface MonthDayCell {
  dayNumber: number;
  isWeekend: boolean;
  subjects: SubjectBlock[];
}

interface SubjectBlock {
  subjectName: string;
  subjectCode: string;
  color: string;
}
```

### 4. Week-Level Calendar
**Location**: After month calendar
**Purpose**: Show daily tasks for the selected week
**Data Required**:
```typescript
interface WeekCalendar {
  weekNumber: number;
  startDate: string;
  endDate: string;
  days: WeekDay[];
}

interface WeekDay {
  dayName: string;
  dayNumber: number;
  isWeekend: boolean;
  tasks: DailyTask[];
}

interface DailyTask {
  subject: string;
  description: string;
  color: string;
}
```

### 5. Week Resources Section
**Location**: After week calendar
**Purpose**: Show resources specific to the selected week
**Data Required**:
```typescript
interface WeekResources {
  weekNumber: number;
  dateRange: string;
  resourceCategories: ResourceCategory[];
}

interface ResourceCategory {
  categoryName: string;
  icon: string;
  resources: ResourceItem[];
}

interface ResourceItem {
  icon: string;
  name: string;
  description?: string;
}
```

### 6. Comprehensive Resources Table
**Location**: At the end of the document
**Purpose**: Show all resources organized by subject
**Data Required**:
```typescript
interface ResourcesTable {
  subjects: SubjectResources[];
}

interface SubjectResources {
  subjectName: string;
  primaryBooks: ResourceType[];
  videoContent: ResourceType[];
  practiceMaterials: ResourceType[];
  currentAffairs: ResourceType[];
}

interface ResourceType {
  typeName: string;
  resources: string[];
}
```

## CSS Styling Guidelines

### Color Scheme
```css
/* Primary Colors */
--primary-blue: #667eea;
--primary-purple: #764ba2;
--text-dark: #2d3748;
--text-light: #4a5568;
--background-light: #f8f9fa;
--border-light: #e2e8f0;

/* Cycle Colors */
--cycle-c1: #f8f9fa; /* NCERT Foundation */
--cycle-c2: #f1f3f4; /* Comprehensive Foundation */
--cycle-c3: #e8f0fe; /* Mains Revision Pre-Prelims */
--cycle-c4: #f3e5f5; /* Prelims Reading */
--cycle-c5: #fff3e0; /* Prelims Revision */
--cycle-c5b: #fff3e0; /* Prelims Rapid Revision */
--cycle-c6: #f3e5f5; /* Mains Revision */
--cycle-c7: #f3e5f5; /* Mains Rapid Revision */
--cycle-c8: #fff3e0; /* Mains Foundation */
--cycle-exam: #ffebee; /* Exam Phase */

/* Subject Colors */
--subject-history: #fff5f5;
--subject-geography: #f0fff4;
--subject-polity: #ebf8ff;
--subject-economics: #fffbeb;
--subject-science: #faf5ff;
--subject-current-affairs: #fdf2f8;
--subject-optional: #f0fdf4;
```

### Typography
```css
/* Font Family */
font-family: 'Inter', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;

/* Font Sizes */
--font-title: 2.2rem;
--font-subtitle: 1.1rem;
--font-section: 1.8rem;
--font-card-title: 1rem;
--font-body: 0.9rem;
--font-small: 0.8rem;

/* Font Weights */
--weight-bold: 700;
--weight-semibold: 600;
--weight-medium: 500;
--weight-regular: 400;
```

### Layout Guidelines
```css
/* Container */
max-width: 1400px;
margin: 0 auto;
border-radius: 20px;
box-shadow: 0 20px 40px rgba(0,0,0,0.1);

/* Sections */
padding: 30px;
margin-bottom: 40px;

/* Cards */
border-radius: 12px;
padding: 20px;
background: white;
border: 2px solid #e2e8f0;

/* Grid Layouts */
display: grid;
gap: 20px;
grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
```

## PDF Generation Instructions

### 1. HTML Structure
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Study Planner Calendar {year}</title>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <style>
        /* Include all CSS styles */
    </style>
</head>
<body>
    <div class="container">
        <!-- Student Profile Section -->
        <!-- Year Calendar Section -->
        <!-- Month Calendar Section -->
        <!-- Week Calendar Section -->
        <!-- Week Resources Section -->
        <!-- Legend Section -->
        <!-- Resources Table Section -->
    </div>
</body>
</html>
```

### 2. PDF Generation Settings
```typescript
const pdfOptions = {
  format: 'A4',
  printBackground: true,
  margin: { 
    top: '20px', 
    right: '30px', 
    bottom: '20px', 
    left: '30px' 
  },
  preferCSSPageSize: false,
  displayHeaderFooter: true,
  headerTemplate: '<div></div>',
  footerTemplate: `
    <div style="font-size: 10px; text-align: center; width: 100%; color: #666; margin: 0 15px;">
      Study Planner Calendar - Generated on ${new Date().toLocaleDateString()} - Page <span class="pageNumber"></span> of <span class="totalPages"></span>
    </div>
  `
};
```

### 3. Data Integration
```typescript
// Example data structure for AI to use
const calendarData = {
  studentProfile: {
    personalDetails: {
      fullName: "Student Name",
      email: "student@email.com",
      phoneNumber: "+91 9876543210",
      location: "City, State"
    },
    // ... other profile data
  },
  yearCalendar: {
    year: 2026,
    months: [
      {
        monthName: "JANUARY",
        cycleType: "C1",
        cycleDescription: "NCERT Foundation Cycle",
        days: [
          { dayNumber: 1, isWeekend: false, cyclePhase: "cycle-phase-1" },
          // ... other days
        ]
      },
      // ... other months
    ]
  },
  monthCalendar: {
    monthName: "JANUARY",
    year: 2026,
    weeks: [
      {
        days: [
          {
            dayNumber: 13,
            isWeekend: true,
            subjects: [
              { subjectName: "History", subjectCode: "H01", color: "history" },
              { subjectName: "Geography", subjectCode: "G01", color: "geography" }
            ]
          },
          // ... other days
        ]
      }
    ]
  },
  weekCalendar: {
    weekNumber: 3,
    startDate: "January 13, 2026",
    endDate: "January 19, 2026",
    days: [
      {
        dayName: "Sunday",
        dayNumber: 13,
        isWeekend: true,
        tasks: [
          { subject: "Current Affairs", description: "The Hindu Editorial", color: "current-affairs" },
          { subject: "History", description: "Modern History - Freedom Struggle", color: "history" }
        ]
      },
      // ... other days
    ]
  },
  weekResources: {
    weekNumber: 3,
    dateRange: "January 13-19, 2026",
    resourceCategories: [
      {
        categoryName: "Primary Books",
        icon: "📚",
        resources: [
          { icon: "📖", name: "Laxmikanth - Indian Polity (Chapters 1-3)" },
          { icon: "📖", name: "Spectrum - Modern History (Freedom Struggle)" }
        ]
      },
      // ... other categories
    ]
  },
  resourcesTable: {
    subjects: [
      {
        subjectName: "History",
        primaryBooks: [
          { typeName: "📚 Textbooks", resources: ["Spectrum - Modern History", "NCERT - Class 6-12 History"] },
          { typeName: "📖 Reference", resources: ["Bipin Chandra - India's Struggle for Independence"] }
        ],
        videoContent: [
          { typeName: "🎥 Online Courses", resources: ["Vision IAS - History Foundation", "Unacademy - Modern History"] }
        ],
        practiceMaterials: [
          { typeName: "📋 Practice Tests", resources: ["Previous Year Prelims Questions", "Mains Answer Writing Practice"] }
        ],
        currentAffairs: [
          { typeName: "📰 Daily Sources", resources: ["The Hindu - Editorial", "Indian Express - Analysis"] }
        ]
      },
      // ... other subjects
    ]
  }
};
```

## Implementation Steps

### 1. Data Preparation
- Collect student profile information
- Generate year calendar with cycle assignments
- Create month calendar with subject blocks
- Build week calendar with daily tasks
- Compile week-specific resources
- Organize comprehensive resources table

### 2. HTML Generation
- Create HTML structure with all sections
- Apply CSS styling for professional appearance
- Ensure responsive design for different screen sizes
- Add interactive elements (hover effects, etc.)

### 3. PDF Generation
- Use Puppeteer or similar tool for PDF generation
- Apply high-quality settings for professional output
- Include proper headers and footers
- Ensure print-friendly formatting

### 4. Quality Assurance
- Verify all data is correctly displayed
- Check color coding and styling consistency
- Ensure proper page breaks and formatting
- Test PDF generation with different data sets

## Best Practices

### 1. Data Validation
- Validate all required fields are present
- Ensure date formats are consistent
- Check for missing or invalid data
- Handle edge cases gracefully

### 2. Performance Optimization
- Minimize CSS and HTML size
- Use efficient data structures
- Optimize image and font loading
- Cache frequently used resources

### 3. Accessibility
- Use semantic HTML elements
- Ensure proper color contrast
- Include alt text for images
- Support keyboard navigation

### 4. Maintainability
- Use consistent naming conventions
- Document all functions and classes
- Keep CSS organized and modular
- Version control all changes

## Error Handling

### 1. Missing Data
```typescript
// Handle missing student profile data
if (!studentProfile.personalDetails.fullName) {
  studentProfile.personalDetails.fullName = "Not Provided";
}

// Handle missing calendar data
if (!yearCalendar.months || yearCalendar.months.length === 0) {
  // Generate default calendar structure
}
```

### 2. PDF Generation Errors
```typescript
try {
  const pdfBuffer = await generatePDF(htmlContent, pdfOptions);
  return pdfBuffer;
} catch (error) {
  console.error('PDF generation failed:', error);
  throw new Error('Failed to generate PDF calendar');
}
```

### 3. Resource Loading Errors
```typescript
// Handle missing resources gracefully
if (!resourcesTable.subjects || resourcesTable.subjects.length === 0) {
  resourcesTable.subjects = [getDefaultSubjectResources()];
}
```

## Conclusion

This document provides a comprehensive guide for AI systems to generate professional PDF calendars for UPSC study plans. The structure is based on the HighFidelityPDFService.ts implementation and includes all necessary components for a complete study planner calendar.

The generated PDFs will include:
- Student profile information
- Year-level cycle visualization
- Month-level subject planning
- Week-level daily tasks
- Week-specific resources
- Comprehensive resources table
- Professional styling and formatting

This approach ensures consistency, quality, and maintainability in PDF generation while providing students with a comprehensive and visually appealing study plan calendar.
