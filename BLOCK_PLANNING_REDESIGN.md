# Block Planning Logic Redesign for Helios-ts

## Current Issues Analysis

After analyzing the existing codebase, I've identified several key issues with the current block planning logic:

### 1. Calendar Time Holes
- **Problem**: Gaps in calendar time where no study time is planned
- **Root Cause**: Complex sequential block creation logic that doesn't ensure continuous coverage
- **Impact**: Inefficient use of available study time

### 2. Unclear Optional vs GS Subject Handling
- **Problem**: Confusing logic for optional subjects, sometimes no tasks generated
- **Root Cause**: Complex `gs_optional_ratio` calculations and conditional logic
- **Impact**: Students may not get proper optional subject coverage

### 3. Unused Concepts
- **Problem**: Archetype, prepmode, and seasons are complex but underutilized
- **Root Cause**: Over-engineering with concepts that don't add clear value
- **Impact**: Code complexity without corresponding benefit

### 4. Non-Functional Design
- **Problem**: Imperative, stateful logic that's hard to reason about
- **Root Cause**: Mixing concerns and complex state management
- **Impact**: Difficult to test, debug, and maintain

## New Functional Block Planning Algorithm

### Core Principles

1. **Continuous Time Coverage**: Every day in the study period should have planned activities
2. **Proportional Subject Allocation**: Time allocation based on subject importance and confidence
3. **Functional Composition**: Small, pure functions that compose together
4. **Predictable Behavior**: Same inputs always produce same outputs

### Algorithm Overview

```
Input: StudentProfile, StudyPeriod, Subjects
Output: ContinuousBlockPlan

1. Calculate Available Time
2. Determine Subject Priorities  
3. Allocate Time Proportionally
4. Create Continuous Blocks
5. Fill Time Gaps
6. Generate Tasks
```

### Step-by-Step Algorithm

#### Step 1: Calculate Available Time
```typescript
type TimeCalculation = {
  totalDays: number;
  dailyHours: number;
  totalHours: number;
  weeklyHours: number;
}

function calculateAvailableTime(
  startDate: Date, 
  endDate: Date, 
  dailyHours: number
): TimeCalculation
```

**Purpose**: Establish the total time budget for planning.

#### Step 2: Determine Subject Priorities
```typescript
type SubjectPriority = {
  subjectCode: string;
  baselineHours: number;
  confidenceMultiplier: number; // 0.5-2.0 based on weak/strong
  priorityWeight: number; // calculated weight
}

function calculateSubjectPriorities(
  subjects: Subject[],
  confidenceMap: Map<string, number>
): SubjectPriority[]
```

**Purpose**: Rank subjects by importance and student confidence level.

#### Step 3: Allocate Time Proportionally
```typescript
type TimeAllocation = {
  subjectCode: string;
  allocatedHours: number;
  allocatedDays: number;
}

function allocateTimeProportionally(
  priorities: SubjectPriority[],
  totalHours: number
): TimeAllocation[]
```

**Purpose**: Distribute available time based on subject priorities.

#### Step 4: Create Continuous Blocks
```typescript
type ContinuousBlock = {
  subjectCode: string;
  startDate: Date;
  endDate: Date;
  dailyHours: number;
  totalHours: number;
}

function createContinuousBlocks(
  allocations: TimeAllocation[],
  startDate: Date,
  dailyHours: number
): ContinuousBlock[]
```

**Purpose**: Create sequential, non-overlapping blocks that cover the entire study period.

#### Step 5: Fill Time Gaps
```typescript
function fillTimeGaps(
  blocks: ContinuousBlock[],
  endDate: Date,
  subjects: Subject[]
): ContinuousBlock[]
```

**Purpose**: Ensure no gaps in the calendar by extending or adding blocks.

#### Step 6: Generate Tasks
```typescript
type TaskTemplate = {
  type: 'study' | 'practice' | 'revision' | 'test';
  subjectCode: string;
  duration: number;
  resources?: Resource[];
}

function generateTasks(
  block: ContinuousBlock,
  taskRatios: TaskRatios
): TaskTemplate[]
```

**Purpose**: Convert blocks into specific daily tasks.

### Functional Composition

The algorithm composes as a pipeline:

```typescript
const createBlockPlan = pipe(
  calculateAvailableTime,
  calculateSubjectPriorities,
  allocateTimeProportionally,
  createContinuousBlocks,
  fillTimeGaps,
  generateTasks
);
```

### Key Simplifications

#### 1. Remove Archetype Complexity
- **Old**: Complex archetype selection and adjustment logic
- **New**: Simple time commitment (daily hours) and subject approach (parallel/sequential)

#### 2. Remove Prepmode Concept
- **Old**: Complex prepmode calculations based on exam dates
- **New**: Direct cycle type mapping to task ratios

#### 3. Remove Seasonal Windows
- **Old**: Complex seasonal window logic
- **New**: Simple time-based progression through cycles

#### 4. Simplify Optional Subject Handling
- **Old**: Complex `gs_optional_ratio` calculations
- **New**: Treat optional subjects as regular subjects with appropriate priority weights

### Subject Time Allocation Logic

#### Dynamic Allocation Based on Time Availability

```typescript
function calculateDynamicAllocation(
  subjects: Subject[],
  availableHours: number,
  confidenceMap: Map<string, number>
): Map<string, number> {
  
  // Calculate baseline requirements
  const totalBaseline = subjects.reduce((sum, s) => 
    sum + (s.baselineHours * getConfidenceMultiplier(s.code, confidenceMap)), 0
  );
  
  // If we have more time than baseline, expand proportionally
  if (availableHours > totalBaseline) {
    const expansionFactor = availableHours / totalBaseline;
    return subjects.map(s => ({
      subjectCode: s.code,
      allocatedHours: s.baselineHours * getConfidenceMultiplier(s.code, confidenceMap) * expansionFactor
    }));
  }
  
  // If we have less time, shrink proportionally but maintain minimums
  const shrinkFactor = availableHours / totalBaseline;
  return subjects.map(s => ({
    subjectCode: s.code,
    allocatedHours: Math.max(
      4, // minimum 4 hours per subject
      s.baselineHours * getConfidenceMultiplier(s.code, confidenceMap) * shrinkFactor
    )
  }));
}
```

### Continuous Coverage Algorithm

```typescript
function ensureContinuousCoverage(
  blocks: Block[],
  studyPeriod: { start: Date, end: Date }
): Block[] {
  
  const sortedBlocks = blocks.sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
  const result: Block[] = [];
  let currentDate = studyPeriod.start;
  
  for (const block of sortedBlocks) {
    // Fill any gap before this block
    if (block.startDate > currentDate) {
      const gapFiller = createGapFillerBlock(currentDate, block.startDate);
      result.push(gapFiller);
    }
    
    result.push(block);
    currentDate = block.endDate;
  }
  
  // Fill any remaining gap at the end
  if (currentDate < studyPeriod.end) {
    const finalFiller = createGapFillerBlock(currentDate, studyPeriod.end);
    result.push(finalFiller);
  }
  
  return result;
}
```

### Task Generation Logic

```typescript
type TaskRatios = {
  study: number;      // 0.0 - 1.0
  practice: number;   // 0.0 - 1.0  
  revision: number;   // 0.0 - 1.0
  test: number;       // 0.0 - 1.0
}

const CYCLE_TASK_RATIOS: Record<CycleType, TaskRatios> = {
  'C1': { study: 1.0, practice: 0.0, revision: 0.0, test: 0.0 },
  'C2': { study: 0.6, practice: 0.2, revision: 0.15, test: 0.05 },
  'C3': { study: 0.7, practice: 0.1, revision: 0.2, test: 0.0 },
  'C4': { study: 0.2, practice: 0.4, revision: 0.3, test: 0.1 },
  'C5': { study: 0.1, practice: 0.5, revision: 0.3, test: 0.1 },
  'C6': { study: 0.2, practice: 0.3, revision: 0.4, test: 0.1 },
  'C7': { study: 0.1, practice: 0.4, revision: 0.4, test: 0.1 },
  'C8': { study: 0.8, practice: 0.1, revision: 0.1, test: 0.0 }
};

function generateDailyTasks(
  block: ContinuousBlock,
  cycleType: CycleType,
  date: Date
): Task[] {
  
  const ratios = CYCLE_TASK_RATIOS[cycleType];
  const dailyHours = block.dailyHours;
  
  return [
    ...generateStudyTasks(block.subjectCode, dailyHours * ratios.study),
    ...generatePracticeTasks(block.subjectCode, dailyHours * ratios.practice),
    ...generateRevisionTasks(block.subjectCode, dailyHours * ratios.revision),
    ...generateTestTasks(block.subjectCode, dailyHours * ratios.test)
  ].filter(task => task.duration > 0);
}
```

## Benefits of New Design

### 1. Guaranteed Continuous Coverage
- No calendar holes - every day has planned activities
- Automatic gap filling ensures complete time utilization

### 2. Clear Subject Handling
- All subjects treated uniformly with priority weights
- No special cases for optional vs GS subjects
- Transparent allocation logic

### 3. Functional Design
- Pure functions with predictable behavior
- Easy to test individual components
- Composable pipeline architecture

### 4. Dynamic Time Allocation
- Automatically adjusts to available time
- Maintains subject proportions while respecting constraints
- Graceful handling of time pressure scenarios

### 5. Simplified Configuration
- Removed unused concepts (archetype, prepmode, seasons)
- Clear task ratio definitions per cycle type
- Minimal configuration surface

## Implementation Strategy

### Phase 1: Core Functions
1. Implement time calculation functions
2. Create subject priority calculation
3. Build proportional allocation logic

### Phase 2: Block Creation
1. Implement continuous block creation
2. Add gap filling logic
3. Create block validation

### Phase 3: Task Generation
1. Implement task generation per cycle type
2. Add resource assignment
3. Create daily plan assembly

### Phase 4: Integration
1. Replace existing block creation logic
2. Update tests
3. Validate with existing scenarios

## Testing Strategy

### Unit Tests
- Test each pure function independently
- Verify edge cases (no time, single subject, etc.)
- Test composition pipeline

### Integration Tests
- Test complete block planning scenarios
- Verify continuous coverage
- Test time allocation accuracy

### Property-Based Tests
- Verify time allocation sums to available time
- Ensure no calendar gaps
- Check subject coverage requirements

This design provides a clean, functional approach that addresses all the identified issues while maintaining the core functionality needed for effective study planning.