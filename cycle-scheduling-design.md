# Cycle Scheduling Design Specification

## Overview
This document defines the complete cycle scheduling logic for UPSC study plans based on time available until prelims exam date.

## Cycle Types Definition

| Cycle Type | Cycle Type | Description |
|------------|------------|-------------|
| C1 | NCERT Foundation Cycle | Basic NCERT-based preparation |
| C2 | Comprehensive Foundation Cycle | Detailed subject coverage |
| C3 | Mains Revision Pre-Prelims Cycle | Mains-specific preparation setup |
| C4 | Prelims Revision Cycle | Comprehensive prelims revision |
| C5 | Prelims Rapid Revision Cycle | Intensive prelims preparation |
| C6 | Mains Revision Cycle | Mains exam preparation |
| C7 | Mains Rapid Revision Cycle | Final mains preparation |
| C8 | Mains Foundation Cycle | Mains-focused foundation work |

## Scheduling Scenarios

### Scenario S1: Long Preparation (≥20 months)
**Condition**: `totalTimeAvailable >= 20 months`

**Schedule**:
1. C1: Start → +3 months (NCERT Foundation)
2. C2: After C1 → +10 months (Comprehensive Foundation)
3. C3: After C2 → ends Dec 31 before target year (max 2 months, extend if extra time)
4. C4: Jan 1 target year → Mar 31 target year (Prelims Revision)
5. C5: Apr 1 target year → prelims exam date (Rapid Revision)
6. C6: May 21 target year → Jul 31 target year (Mains Revision)
7. C7: Aug 1 target year → mains exam date (Rapid Mains)

### Scenario S2: Medium-Long Preparation (18-20 months)
**Condition**: `18 ≤ totalTimeAvailable < 20 months`

**Schedule**: Identical to S1
- C1: 3 months
- C2: 10 months
- C3: 2 months (ends Dec 31 before target year) - shrink as needed
- C4: Jan-Mar target year
- C5: Apr-prelims date
- C6: May-Jul target year
- C7: Aug-mains date

### Scenario S3: Medium Preparation (15-18 months)
**Condition**: `15 ≤ totalTimeAvailable < 18 months`

**Schedule**:
1. C1: Start → +3 months
2. C2: After C1 → Dec 31 before target year (minimum 7 months, shrink from 10 months)
3. C3: SKIP (No C3)
4. C4: Jan-Mar target year
5. C5: Apr-prelims date
6. C6: May-Jul target year
7. C7: Aug-mains date

**Validation**: C2 duration must be ≥ 7 months

### Scenario S4: Medium-Short Preparation (12-15 months)
**Condition**: `12 ≤ totalTimeAvailable < 15 months`

**Schedule**:
1. C1: SKIP (No C1)
2. C2: Start → Dec 31 before target year (minimum 7 months)
3. C3: SKIP (No C3)
4. C4: Jan-Mar target year
5. C5: Apr-prelims date
6. C6: May-Jul target year
7. C7: Aug-mains date

<REMOVE>
### Scenario S4A: Medium-Short Preparation (7-12 months)
**Condition**: `7 ≤ totalTimeAvailable < 12 months`

**Schedule**:
1. C1: SKIP (No C1)
2. C2: Start → Dec 31 before target year (minimum 7 months) - fit the blocks in available time.
3. C3: SKIP (No C3)
4. C4: Jan-Mar target year
5. C5: Apr-prelims date
6. C6: May-Jul target year
7. C7: Aug-mains date


**Validation**: C2 duration must be ≥ 7 months

### Scenario S5: Very Short Late Start
**Condition**: June 1 to Dec 15 of the year before target year
**Schedule**:
1. C1: SKIP
2. C2: SKIP
3. C3: SKIP
4. C8: Start → Dec 31 before target year (Mains Foundation)
5. C4: Jan-Mar target_year
6. C5: Apr-prelims date
7. C6: May-Jul target year
8. C7: Aug-mains date

### Scenario S6: Ultra-Short Preparation (Dec 16 - Jan 15)
**Condition**: Start date between Dec 16 before target year and Feb 28 of target year

**Schedule**:
1. C1: SKIP
2. C2: SKIP
3. C3: SKIP
4. C8: SKIP
5. C4: Start date → Mar 31 target year
6. C5: Apr 1 → prelims exam date
7. C6: May 21 → Jul 31 target year
8. C7: Aug 1 → mains exam date

* C4:C5 :: 3:2 (duration)

### Scenario S7: Crash Course Early (Mar 1 - Apr 15)
**Condition**: Start date between Mar 1 and Apr 15 of target year

**Schedule**:
1. C1: SKIP
2. C2: SKIP
3. C3: SKIP
4. C8: SKIP
5. C4: SKIP
6. C5: Start date → prelims exam date
7. C6: May 21 → Jul 31 target year
8. C7: Aug 1 → mains exam date

### Scenario S8: Rejection Case (Apr 16 - May 15)
**Condition**: Start date between Apr 16 and Prelims exam date

**Action**: REJECT - Suggest next target year (insufficient time)

## Implementation Requirements

### Function Signature
```typescript
function determineCycleSchedule(
  startDate: Date,
  targetYear: number,
  prelimsExamDate: Date // Usually around May 28 of target year
): CycleSchedule[]
```

### Input Parameters
- `startDate`: When student begins preparation
- `targetYear`: Year of target exam (e.g., 2026)
- `prelimsExamDate`: Actual prelims exam date for target year

### Output Structure
```typescript
interface CycleSchedule {
  cycleType: 'C1' | 'C2' | 'C3' | 'C4' | 'C5' | 'C6' | 'C7' | 'C8';
  startDate: Date;
  endDate: Date;
  duration: number; // in months
  priority: 'mandatory' | 'conditional';
}
```

## Implementation Logic

### Step 1: Calculate Total Available Time
```typescript
const totalTimeAvailable = (prelimsExamDate - startDate) / (30.44 * 24 * 60 * 60 * 1000); // months
```

### Step 2: Determine Scenario
```typescript
if (totalTimeAvailable >= 20) return 'S1';
else if (totalTimeAvailable >= 18) return 'S2';
else if (totalTimeAvailable >= 15) return 'S3';
else if (totalTimeAvailable >= 12) return 'S4';
else if (hasDaysBeforeDec31 && daysBeforeDec31 > 15) return 'S5';
else if (isDec16ToJan15) return 'S6';
else if (isMar1ToApr15) return 'S7';
else return 'S8_REJECT';
```

### Step 3: Generate Cycle Schedule
For each scenario, create CycleSchedule objects with:
- Exact dates (start/end)
- Duration validation
- Priority assignment

### Step 4: Validation Rules
1. No overlapping cycles
2. C2 minimum 7 months when included
3. C3 ends exactly Dec 31 before target year
4. C4/C5/C6/C7 have fixed date ranges
5. All cycles must fit within available time

## Key Dates Reference
- **Dec 31 before target year**: End of C2/C3/C8 cycles
- **Jan 1 target year**: Start of C4
- **Mar 31 target year**: End of C4
- **Apr 1 target year**: Start of C5
- **May 21 target year**: Start of C6
- **Jul 31 target year**: End of C6
- **Aug 1 target year**: Start of C7

## Error Handling
- **S8 Case**: Return error with recommendation for next target year
- **Constraint Violations**: Adjust cycle durations to meet minimum requirements
- **Date Conflicts**: Recalculate dates to prevent overlaps

## Comprehensive Implementation Plan for Cycle Scheduling Refactor

Based on the analysis of the current implementation and the design document, here's the detailed implementation plan:

### Current State Analysis

**Current Cycle Types**: 
- `FoundationCycle` - maps to **C2** (Comprehensive Foundation)
- `PrelimsRevisionCycle` - maps to **C4** (Prelims Revision)  
- `PrelimsRapidRevisionCycle` - maps to **C5** (Prelims Rapid Revision)
- `MainsRevisionCycle` - maps to **C6** (Mains Revision)
- `MainsRapidRevisionCycle` - maps to **C7** (Mains Rapid Revision)

**Missing Cycle Types**:
- **C1**: NCERT Foundation Cycle
- **C3**: Mains Pre-Foundation Cycle  
- **C8**: Mains Foundation Cycle

**Current Task Ratios**:
```typescript
const taskRatios: Record<CycleType, { study: number; practice: number; revision: number }> = {
  'FoundationCycle': { study: 0.7, practice: 0.15, revision: 0.15 },
  'PrelimsRevisionCycle': { study: 0.0, practice: 0.4, revision: 0.6 },
  'PrelimsRapidRevisionCycle': { study: 0.0, practice: 0.4, revision: 0.6 },
  'MainsRevisionCycle': { study: 0.0, practice: 0.4, revision: 0.6 },
  'MainsRapidRevisionCycle': { study: 0.0, practice: 0.4, revision: 0.6 },
};
```

### Implementation Steps

#### 1. Update TypeScript Types

**File**: `study-planner/helios-ts/src/types/Types.ts`

```typescript
// Update CycleType (lines 85-90)
export type CycleType =
  | "C1" // NCERT Foundation Cycle
  | "C2" // Comprehensive Foundation Cycle  
  | "C3" // Mains Pre-Foundation Cycle
  | "C4" // Prelims Revision Cycle
  | "C5" // Prelims Rapid Revision Cycle
  | "C6" // Mains Revision Cycle
  | "C7" // Mains Rapid Revision Cycle
  | "C8" // Mains Foundation Cycle
  ;

// Add new interfaces for cycle scheduling
export interface CycleSchedule {
  cycleType: CycleType;
  startDate: string;
  endDate: string;
  durationMonths: number;
  priority: 'mandatory' | 'conditional';
}

export interface ScenarioResult {
  scenario: 'S1' | 'S2' | 'S3' | 'S4' | 'S5' | 'S6' | 'S7' | 'S8_REJECT';
  totalTimeAvailable: number;
  schedules: CycleSchedule[];
}
```

#### 2. Create Cycle Scheduling Engine

**New File**: `study-planner/helios-ts/src/engine/cycle-scheduler.ts`

```typescript
import dayjs from 'dayjs';
import { Logger, CycleSchedule, ScenarioResult } from '../types/Types';

/**
 * Main function to determine cycle schedule based on start date and target year
 */
export function determineCycleSchedule(
  logger: Logger,
  startDate: Date,
  targetYear: number,
  prelimsExamDate: Date // Usually around May 28 of target year
): ScenarioResult {
  const totalTimeAvailable = (prelimsExamDate.getTime() - startDate.getTime()) / (30.44 * 24 * 60 * 60 * 1000);
  const scenario = determineScenario(totalTimeAvailable, startDate, targetYear);
  const schedules = generateScheduleForScenario(scenario, startDate, targetYear);
  
  return {
    scenario,
    totalTimeAvailable,
    schedules
  };
}

/**
 * Determine which scenario (S1-S8) applies based on time available
 */
function determineScenario(
  totalTimeAvailable: number,
  startDate: Date,
  targetYear: number
): ScenarioResult['scenario'] {
  const dec31BeforeTarget = dayjs(`${targetYear - 1}-12-31`);
  const daysBeforeDec31 = dec31BeforeTarget.diff(startDate, 'day');
  
  const start = dayjs(startDate);
  const dec16BeforeTarget = dayjs(`${targetYear - 1}-12-16`);
  const jan15Target = dayjs(`${targetYear}-01-15`);
  const mar1Target = dayjs(`${targetYear}-03-01`);
  const apr15Target = dayjs(`${targetYear}-04-15`);
  
  if (totalTimeAvailable >= 20) return 'S1';
  else if (totalTimeAvailable >= 18) return 'S2';
  else if (totalTimeAvailable >= 15) return 'S3';
  else if (totalTimeAvailable >= 12) return 'S4';
  else if (daysBeforeDec31 > 15) return 'S5';
  else if (start.isBetween(dec16BeforeTarget, jan15Target, 'day', '[]')) return 'S6';
  else if (start.isBetween(mar1Target, apr15Target, 'day', '[]')) return 'S7';
  else return 'S8_REJECT';
}

/**
 * Generate schedule for each scenario based on the design document
 */
function generateScheduleForScenario(
  scenario: ScenarioResult['scenario'],
  startDate: Date,
  targetYear: number
): CycleSchedule[] {
  switch (scenario) {
    case 'S1':
      return getS1Schedule(startDate, targetYear);
    case 'S2':
      return getS2Schedule(startDate, targetYear);
    case 'S3':
      return getS3Schedule(startDate, targetYear);
    case 'S4':
      return getS4Schedule(startDate, targetYear);
    case 'S5':
      return getS5Schedule(startDate, targetYear);
    case 'S6':
      return getS6Schedule(startDate, targetYear);
    case 'S7':
      return getS7Schedule(startDate, targetYear);
    case 'S8_REJECT':
      throw new Error(`Plan generation rejected: insufficient time. Consider targeting ${targetYear + 1}.`);
    default:
      throw new Error(`Unknown scenario: ${scenario}`);
  }
}

// Individual scenario implementations...
function getS1Schedule(startDate: Date, targetYear: number): CycleSchedule[] {
  const start = dayjs(startDate);
  
  return [
    {
      cycleType: 'C1',
      startDate: start.format('YYYY-MM-DD'),
      endDate: start.add(3, 'month').format('YYYY-MM-DD'),
      durationMonths: 3,
      priority: 'mandatory'
    },
    {
      cycleType: 'C2',
      startDate: start.add(3, 'month').add(1, 'day').format('YYYY-MM-DD'),
      endDate: `${targetYear - 1}-12-31`,
      durationMonths: 10,
      priority: 'mandatory'
    },
    // ... continue with other cycles
  ];
}
```

#### 3. Update Task Ratios for New Cycle Types

**File**: `study-planner/helios-ts/src/engine/cycle-utils.ts` (lines 450-456)

```typescript
const taskRatios: Record<CycleType, { study: number; practice: number; revision: number }> = {
  // Foundation Cycles - Focus on study with some practice/revision
  'C1': { study: 1.0, practice: 0, revision: 0 }, // NCERT Foundation - Heavy study focus
  'C2': { study: 0.7, practice: 0.15, revision: 0.15 }, // Comprehensive Foundation - More balanced
  'C3': { study: 1.0, practice: 0, revision: 0 }, // Mains Pre-Foundation - Prepares for mains focus
  
  // Revision Cycles - Focus on practice and revision
  'C4': { study: 0.0, practice: 0.4, revision: 0.6 }, // Prelims Revision
  'C5': { study: 0.0, practice: 0.4, revision: 0.6 }, // Prelims Rapid Revision
  
  // Mains Cycles - Balanced practice and revision
  'C6': { study: 0.0, practice: 0.4, revision: 0.6 }, // Mains Revision
  'C7': { study: 0.0, practice: 0.4, revision: 0.6 }, // Mains Rapid Revision
  
  // Special Foundation Cycle
  'C8': { study: 0.8, practice: 0.1, revision: 0.1 }, // Mains Foundation - Similar to CNCERT
};
```

#### 4. Create Individual Cycle Planning Functions

**New Files**:
- `study-planner/helios-ts/src/engine/cycle-c1-ncert.ts`
- `study-planner/helios-ts/src/engine/cycle-c3-mains-prefoundation.ts`
- `study-planner/helios-ts/src/engine/cycle-c8-mains-foundation.ts`

Each file will follow the pattern established by existing cycle files:

```typescript
export async function planC1Cycle(
  logger: Logger,
  intake: StudentIntake,
  confidenceMap: Map<string, number>,
  startDate: dayjs.Dayjs,
  subjData: SubjData,
  allSubjects: any[]
): Promise<StudyCycle | undefined> {
  // Focus on NCERT-based subjects only
  // Basic foundation building
  // Simplified task structure
}

export async function planC3Cycle(
  logger: Logger,
  intake: StudentIntake,
  confidenceMap: Map<string, number>,
  startDate: dayjs.Dayjs,
  subjData: SubjData
): Promise<StudyCycle | undefined> {
  // Focus on mains-specific preparation
  // Answer writing skills preparation
  // Mains-only subjects
}

export async function planC8Cycle(
  logger: Logger,
  intake: StudentIntake,
  confidenceMap: Map<string, number>,
  startDate: dayjs.Dayjs,
  subjData: SubjData
): Promise<StudyCycle | undefined> {
  // Mains-focused foundation work
  // Used for very late starts
  // Bridge to Prelims revision
}
```

#### 5. Refactor Main Engine

**File**: `study-planner/helios-ts/src/engine/NewEngine-generate-plan.ts` (main function refactor)

```typescript
export async function generateInitialPlan(
  userId: string,
  _config: Config,
  _archetypeDetails: Archetype,
  intake: StudentIntake,
  logger0?: Logger
): Promise<{ plan: StudyPlan; logs: LogEntry[] }> {
  const logger = logger0 || makeLogger(logs);
  
  // NEW: Use cycle scheduler to determine plan structure
  const scheduleResult = determineCycleSchedule(
    logger,
    new Date(intake.start_date || new Date().toISOString().split('T')[0]),
    parseInt(intake.target_year || '2026'),
    dayjs(`${intake.target_year}-05-28`).toDate() // Default prelims date
  );
  
  if (scheduleResult.senario === 'S8_REJECT') {
    throw new Error('Plan generation rejected: insufficient preparation time');
  }
  
  // Generate cycles based on determined schedule
  const cycles = await generateCyclesFromSchedule(logger, intake, scheduleResult);
  
  const plan = await buildFinalPlan(logger, intake, cycles);
  await sanityCheckPlan(plan, intake);
  
  return { plan, logs: logger.getLogs() };
}

async function generateCyclesFromSchedule(
  logger: Logger,
  intake: StudentIntake,
  scheduleResult: ScenarioResult
): Promise<StudyCycle[]> {
  const cycles: StudyCycle[] = [];
  
  for (const schedule of scheduleResult.schedules) {
    const cycle = await generateCycleForSchedule(
      logger, 
      intake, 
      schedule
    );
    if (cycle) cycles.push(cycle);
  }
  
  return cycles;
}

async function generateCycleForSchedule(
  logger: Logger,
  intake: StudentIntake,
  schedule: CycleSchedule
): Promise<StudyCycle | undefined> {
  switch (schedule.cycleType) {
    case 'C1':
      return await planC1Cycle(logger, intake, confidenceMap, dayjs(schedule.startDate), subjData, subjects);
    case 'C2':
      return await planFoundationCycle(logger, intake, confidenceMap, dayjs(schedule.startDate), subjData, subjects, subjectApproach);
    case 'C3':
      return await planC3Cycle(logger, intake, confidenceMap, dayjs(schedule.startDate), subjData);
    case 'C4':
      return await planPrelimsRevisionCycle(logger, intake, confidenceMap, dayjs(schedule.startDate), subjData);
    case 'C5':
      return await planPrelimsRapidRevisionCycle(logger, intake, confidenceMap, dayjs(schedule.startDate), subjData);
    case 'C6':
      return await planMainsRevisionCycle(logger, intake, confidenceMap, dayjs(schedule.startDate), subjData);
    case 'C7':
      return await planMainsRapidRevisionCycle(logger, intake, confidenceMap, dayjs(schedule.startDate), subjData);
    case 'C8':
      return await planC8Cycle(logger, intake, confidenceMap, dayjs(schedule.startDate), subjData);
    default:
      logger.logWarn('Engine', `Unknown cycle type: ${schedule.cycleType}`);
      return undefined;
  }
}
```

#### 6. Update Document Generation

The existing document generation logic should automatically support the new cycle structure since it iterates through `StudyCycle` objects. However, we may need to update:

- Cycle naming conventions
- Cycle descriptions 
- Subject filtering logic for each cycle type

#### 7. Implementation Priority

1. **Phase 1**: Update types and create cycle scheduler (immediate)
2. **Phase 2**: Implement C1, C3, C8 cycle planners (core functionality)  
3. **Phase 3**: Refactor main engine to use new scheduler (integration)
4. **Phase 4**: Update task ratios and validate document generation (polish)

#### 8. Testing Strategy

- Unit tests for scenario determination logic
- Integration tests for each scenario's cycle generation
- Validation tests for edge cases (S8 rejection, date conflicts)
- End-to-end tests for complete plan generation

#### 9. Migration Considerations

- Existing plans use old cycle naming - need backward compatibility during transition
- Gradually deprecate old cycle types
- Update any client code that references specific cycle names

### Benefits of New Implementation

1. **Systematic Approach**: Deterministic cycle selection based on time available
2. **Complete Coverage**: All scenarios from the design document implemented
3. **Better Segmentation**: Clear distinction between NCERT, Comprehensive, and Mains preparation
4. **Time-Aware**: Cycles adapt based on available preparation time
5. **Validation**: Built-in rejection for insufficient preparation time
6. **Extensibility**: Easy to add new scenarios or modify existing ones
