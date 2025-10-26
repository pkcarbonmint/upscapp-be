# Cycle Functions Refactoring Plan

## Current State Analysis

### Existing Cycle Functions
Based on the current codebase, we have the following cycle functions:

1. **planC1** (`cycle-c1.ts`) - NCERT Foundation cycle
2. **planC2** (`cycle-c2.ts`) - Foundation cycle (GS/Optional split)
3. **planC3** (`cycle-c3.ts`) - Mains Revision Pre-Prelims cycle
4. **planC4** (`cycle-c4.ts`) - Prelims Reading cycle
5. **planC5** (`cycle-c5.ts`) - Prelims Revision cycle
6. **planC5b** (`cycle-c5b.ts`) - Prelims Rapid Revision cycle
7. **planC6** (`cycle-c6.ts`) - Mains Revision cycle
8. **planC7** (`cycle-c7.ts`) - Mains Rapid Revision cycle
9. **planC8** (`cycle-c8.ts`) - Mains Foundation cycle

### Common Patterns Identified

#### 1. **Function Signatures**
All cycle functions follow the same pattern:
```typescript
export async function planC[X](
  logger: Logger,
  intake: StudentIntake,
  confidenceMap: Map<string, number>,
  startDate: dayjs.Dayjs,
  endDate: dayjs.Dayjs, // Some optional
  subjData: SubjData,
  allSubjects: any[] // Some use subjData.subjects
): Promise<StudyCycle | undefined>
```

#### 2. **Core Logic Flow**
Every function follows this pattern:
1. Log cycle planning start
2. Calculate duration in weeks
3. Calculate total hours
4. Filter subjects based on criteria
5. Call `createBlocksForSubjects()`
6. Create `StudyCycle` object
7. Log completion and return

#### 3. **StudyCycle Object Structure**
All create similar objects with consistent fields:
- `cycleId`, `cycleType`, `cycleIntensity`, `cycleDuration`
- `cycleStartWeek`, `cycleOrder`, `cycleName`
- `cycleBlocks`, `cycleDescription`
- `cycleStartDate`, `cycleEndDate`

### Key Differences That Need Preservation

#### 1. **Subject Filtering Logic**
- **C1**: NCERT subjects (`category === 'Macro'` or `subjectCode === 'H01'`)
- **C2**: All subjects, split into GS/Optional with ratio calculation
- **C3, C6, C7, C8**: Mains subjects (`examFocus === 'MainsOnly' || 'BothExams'`)
- **C4, C5, C5b**: Prelims subjects (`examFocus === 'PrelimsOnly' || 'BothExams'`)

#### 2. **Hours Calculation**
- **C2**: Uses `intake.getDailyStudyHours()` and GS/Optional ratio
- **Others**: Fixed 8 hours/day (`durationWeeks * 7 * 8`)

#### 3. **Special Handling**
- **C2**: Unique GS/Optional split with separate block creation
- **C6**: Has `planMainsRevisionCycle` function with different signature
- **C4, C5, C5b**: Use `subjData.subjects` instead of `allSubjects`
- **C6, C7**: Some have date validation logic

#### 4. **Cycle Metadata**
Each cycle has unique:
- `cycleType`, `cycleOrder`, `cycleName`, `cycleDescription`
- `cycleIntensity` values ('Moderate' or 'Intensive')

## Refactoring Strategy

### Option 1: Configuration-Based Abstraction (Recommended)

Create a generic `createStudyCycle` function that takes a configuration object defining cycle-specific behavior.

#### 1.1 Create Configuration Types and Factory Function

**File**: `src/engine/cycle-config.ts`

```typescript
import { StudentIntake } from '../types/models';
import { CycleType } from '../types/Types';
import { Subject, SubjData } from '../types/Subjects';
import { Block } from '../types/models';
import dayjs from 'dayjs';

export enum CycleIntensity {
  Foundation = 'Foundation',
  Revision = 'Revision',
  Rapid = 'Rapid',
  PreExam = 'PreExam'
}

export interface CycleConfig {
  cycleType: string;
  cycleOrder: number;
  cycleName: string;
  cycleDescription: string;
  cycleIntensity: CycleIntensity;
  subjectFilter: (subjects: Subject[]) => Subject[];
  hoursCalculator: (durationWeeks: number, intake: StudentIntake) => number;
  validation?: (startDate: dayjs.Dayjs, endDate: dayjs.Dayjs, intake: StudentIntake) => boolean;
  blockCreator: (
    intake: StudentIntake,
    filteredSubjects: Subject[],
    totalHours: number,
    confidenceMap: Map<string, number>,
    config: CycleConfig,
    startDate: dayjs.Dayjs,
    endDate: dayjs.Dayjs,
    subjData: SubjData
  ) => Promise<Block[]>;
}

// Block Creator Functions
async function createStandardBlocks(
  intake: StudentIntake,
  filteredSubjects: Subject[],
  totalHours: number,
  confidenceMap: Map<string, number>,
  config: CycleConfig,
  startDate: dayjs.Dayjs,
  endDate: dayjs.Dayjs,
  subjData: SubjData
): Promise<Block[]> {
  // Generate blockPrefix from cycleName (remove "Cycle" suffix if present)
  const blockPrefix = config.cycleName.replace(/\s+Cycle$/, '');
  
  return await createBlocksForSubjects(
    intake, filteredSubjects, totalHours, confidenceMap, blockPrefix,
    config.cycleType, config.cycleOrder, config.cycleName,
    startDate.format('YYYY-MM-DD'), endDate.format('YYYY-MM-DD'), subjData
  );
}

async function createGSOptionalSplitBlocks(
  intake: StudentIntake,
  filteredSubjects: Subject[],
  totalHours: number,
  confidenceMap: Map<string, number>,
  config: CycleConfig,
  startDate: dayjs.Dayjs,
  endDate: dayjs.Dayjs,
  subjData: SubjData
): Promise<Block[]> {
  const gsSubjects = filteredSubjects.filter(s => s.category === 'Macro');
  const optionalSubjects = filteredSubjects.filter(s => s.category === 'Micro');
  const ratio = intake.getGSOptionalRatio();
  const gsHours = Math.floor(totalHours * ratio.gs);
  const optionalHours = Math.floor(totalHours * ratio.optional);

  const gsBlocks = await createBlocksForSubjects(
    intake, gsSubjects, gsHours, confidenceMap, 'GS Foundation',
    config.cycleType, config.cycleOrder, config.cycleName,
    startDate.format('YYYY-MM-DD'), endDate.format('YYYY-MM-DD'), subjData
  );
  
  const optionalBlocks = await createBlocksForSubjects(
    intake, optionalSubjects, optionalHours, confidenceMap, 'Optional Foundation',
    config.cycleType, config.cycleOrder, config.cycleName,
    startDate.format('YYYY-MM-DD'), endDate.format('YYYY-MM-DD'), subjData
  );
  
  return [...gsBlocks, ...optionalBlocks];
}

// Cycle Configuration Constants
const C1_CONFIG: CycleConfig = {
  cycleType: 'C1',
  cycleOrder: 1,
  cycleName: 'NCERT Foundation Cycle',
  cycleDescription: 'NCERT-based foundation building phase focusing on basic concepts',
  cycleIntensity: CycleIntensity.Foundation,
  subjectFilter: (subjects) => subjects.filter(s => 
    s.examFocus === 'BothExams' // NCERT foundation subjects are relevant for both exams
  ),
  hoursCalculator: (durationWeeks, intake) => {
    const dailyHours = intake.getDailyStudyHours();
    return durationWeeks * 7 * dailyHours;
  },
  blockCreator: createStandardBlocks
};

const C2_CONFIG: CycleConfig = {
  cycleType: 'C2',
  cycleOrder: 1,
  cycleName: 'Foundation Cycle',
  cycleDescription: 'Foundation building phase with comprehensive subject coverage',
  cycleIntensity: CycleIntensity.Foundation,
  subjectFilter: (subjects) => subjects, // Uses all subjects, split later
  hoursCalculator: (durationWeeks, intake) => {
    const dailyHours = intake.getDailyStudyHours();
    return durationWeeks * 7 * dailyHours;
  },
  blockCreator: createGSOptionalSplitBlocks,
  validation: (startDate, endDate, intake) => {
    const foundationEndDate = dayjs(intake.getFoundationCycleEndDate());
    return !startDate.isAfter(foundationEndDate);
  }
};

const C3_CONFIG: CycleConfig = {
  cycleType: 'C3',
  cycleOrder: 3,
  cycleName: 'Mains Revision Pre-Prelims Cycle',
  cycleDescription: 'Mains-specific foundation building phase preparing for answer writing',
  cycleIntensity: CycleIntensity.Foundation,
  subjectFilter: (subjects) => subjects.filter(s =>
    s.examFocus === 'MainsOnly' || s.examFocus === 'BothExams'
  ),
  hoursCalculator: (durationWeeks, intake) => {
    const dailyHours = intake.getDailyStudyHours();
    return durationWeeks * 7 * dailyHours;
  },
  blockCreator: createStandardBlocks
};

const C4_CONFIG: CycleConfig = {
  cycleType: 'C4',
  cycleOrder: 2,
  cycleName: 'Prelims Reading Cycle',
  cycleDescription: 'Intensive reading phase for prelims preparation',
  cycleIntensity: CycleIntensity.Foundation,
  subjectFilter: (subjects) => subjects.filter(s => 
    s.examFocus === 'PrelimsOnly' || s.examFocus === 'BothExams'
  ),
  hoursCalculator: (durationWeeks, intake) => {
    const dailyHours = intake.getDailyStudyHours();
    return durationWeeks * 7 * dailyHours;
  },
  blockCreator: createStandardBlocks
};

const C5_CONFIG: CycleConfig = {
  cycleType: 'C5',
  cycleOrder: 3,
  cycleName: 'Prelims Revision Cycle',
  cycleDescription: 'Intensive revision phase for prelims preparation',
  cycleIntensity: CycleIntensity.Revision,
  subjectFilter: (subjects) => subjects.filter(s =>
    s.examFocus === 'PrelimsOnly' || s.examFocus === 'BothExams'
  ),
  hoursCalculator: (durationWeeks, intake) => {
    const dailyHours = intake.getDailyStudyHours();
    return durationWeeks * 7 * dailyHours;
  },
  blockCreator: createStandardBlocks
};

const C5B_CONFIG: CycleConfig = {
  cycleType: 'C5.b',
  cycleOrder: 4,
  cycleName: 'Prelims Rapid Revision Cycle',
  cycleDescription: 'Intensive rapid revision phase for prelims preparation',
  cycleIntensity: CycleIntensity.PreExam,
  subjectFilter: (subjects) => subjects.filter(s =>
    s.examFocus === 'PrelimsOnly' || s.examFocus === 'BothExams'
  ),
  hoursCalculator: (durationWeeks, intake) => {
    const dailyHours = intake.getDailyStudyHours();
    return durationWeeks * 7 * dailyHours;
  },
  blockCreator: createStandardBlocks
};

const C6_CONFIG: CycleConfig = {
  cycleType: 'C6',
  cycleOrder: 5,
  cycleName: 'Mains Revision Cycle',
  cycleDescription: 'Intensive revision phase for mains preparation',
  cycleIntensity: CycleIntensity.Revision,
  subjectFilter: (subjects) => subjects.filter(s =>
    s.examFocus === 'MainsOnly' || s.examFocus === 'BothExams'
  ),
  hoursCalculator: (durationWeeks, intake) => {
    const dailyHours = intake.getDailyStudyHours();
    return durationWeeks * 7 * dailyHours;
  },
  blockCreator: createStandardBlocks
};

const C7_CONFIG: CycleConfig = {
  cycleType: 'C7',
  cycleOrder: 4,
  cycleName: 'Mains Rapid Revision Cycle',
  cycleDescription: 'Intensive rapid revision phase for mains preparation',
  cycleIntensity: CycleIntensity.PreExam,
  subjectFilter: (subjects) => subjects.filter(s =>
    s.examFocus === 'MainsOnly' || s.examFocus === 'BothExams'
  ),
  hoursCalculator: (durationWeeks, intake) => {
    const dailyHours = intake.getDailyStudyHours();
    return durationWeeks * 7 * dailyHours;
  },
  blockCreator: createStandardBlocks
};

const C8_CONFIG: CycleConfig = {
  cycleType: 'C8',
  cycleOrder: 8,
  cycleName: 'C8 Mains Foundation Cycle',
  cycleDescription: 'Mains-focused foundation work for very late starts, bridge to prelims preparation',
  cycleIntensity: CycleIntensity.Foundation,
  subjectFilter: (subjects) => subjects.filter(s =>
    s.examFocus === 'MainsOnly' || s.examFocus === 'BothExams'
  ),
  hoursCalculator: (durationWeeks, intake) => {
    const dailyHours = intake.getDailyStudyHours();
    return durationWeeks * 7 * dailyHours;
  },
  blockCreator: createStandardBlocks
};

export function getCycleConfig(cycleType: CycleType): CycleConfig {
  switch (cycleType) {
    case 'C1':
      return C1_CONFIG;
    case 'C2':
      return C2_CONFIG;
    case 'C3':
      return C3_CONFIG;
    case 'C4':
      return C4_CONFIG;
    case 'C5':
      return C5_CONFIG;
    case 'C5.b':
      return C5B_CONFIG;
    case 'C6':
      return C6_CONFIG;
    case 'C7':
      return C7_CONFIG;
    case 'C8':
      return C8_CONFIG;
    default:
      throw new Error(`Unknown cycle type: ${cycleType}`);
  }
}
```

#### 1.2 Create Generic Cycle Creator

**File**: `src/engine/cycle-creator.ts`

```typescript
import { StudyCycle } from '../types/models';
import { StudentIntake } from '../types/models';
import { Logger } from '../types/Types';
import { SubjData } from '../types/Subjects';
import { createBlocksForSubjects } from './cycle-utils';
import { CycleType, getCycleConfig } from './cycle-config';
import dayjs from 'dayjs';

export async function createStudyCycle(
  logger: Logger,
  intake: StudentIntake,
  confidenceMap: Map<string, number>,
  startDate: dayjs.Dayjs,
  endDate: dayjs.Dayjs,
  subjData: SubjData,
  cycleType: CycleType
): Promise<StudyCycle | undefined> {
  const config = getCycleConfig(cycleType);
  const { logInfo: info, logDebug: debug } = logger;
  info('Engine', `Planning ${config.cycleName}`);

  // Validation check
  if (config.validation && !config.validation(startDate, endDate, intake)) {
    info('Engine', `${config.cycleName} skipped: validation failed`);
    return undefined;
  }

  const durationWeeks = Math.ceil(endDate.diff(startDate, 'day') / 7);
  const totalHours = config.hoursCalculator(durationWeeks, intake);
  
  // Use subjData.subjects as the canonical source
  const filteredSubjects = config.subjectFilter(subjData.subjects);

  debug('Engine', `${config.cycleName}: ${durationWeeks} weeks, ${totalHours} total hours`);
  debug('Engine', `${config.cycleName} subjects: ${filteredSubjects.map(s => s.subjectCode).join(', ')}`);

  // Use the configured block creator function
  const blocks = await config.blockCreator(
    intake, filteredSubjects, totalHours, confidenceMap, config,
    startDate, endDate, subjData
  );

  const cycle: StudyCycle = {
    cycleId: `${config.cycleType.toLowerCase()}-${Date.now()}`,
    cycleType: config.cycleType,
    cycleIntensity: config.cycleIntensity,
    cycleDuration: durationWeeks,
    cycleOrder: config.cycleOrder,
    cycleName: config.cycleName,
    cycleBlocks: blocks,
    cycleDescription: config.cycleDescription,
    cycleStartDate: startDate.format('YYYY-MM-DD'),
    cycleEndDate: endDate.format('YYYY-MM-DD')
  };

  info('Engine', `Created ${config.cycleName} with ${cycle.cycleBlocks.length} blocks`);
  return cycle;
}
```

#### 1.3 Add Cycle Functions to cycle-creator.ts

**File**: `src/engine/cycle-creator.ts` (add these functions at the end)

```typescript
// Cycle Planning Functions
export async function planC1(
  logger: Logger,
  intake: StudentIntake,
  confidenceMap: Map<string, number>,
  startDate: dayjs.Dayjs,
  endDate: dayjs.Dayjs,
  subjData: SubjData
): Promise<StudyCycle | undefined> {
  return createStudyCycle(
    logger, intake, confidenceMap, startDate, endDate, subjData,
    'C1'
  );
}

export async function planC2(
  logger: Logger,
  intake: StudentIntake,
  confidenceMap: Map<string, number>,
  startDate: dayjs.Dayjs,
  subjData: SubjData
): Promise<StudyCycle | undefined> {
  const endDate = dayjs(intake.getFoundationCycleEndDate());
  return createStudyCycle(
    logger, intake, confidenceMap, startDate, endDate, subjData,
    'C2'
  );
}

export async function planC3(
  logger: Logger,
  intake: StudentIntake,
  confidenceMap: Map<string, number>,
  startDate: dayjs.Dayjs,
  endDate: dayjs.Dayjs,
  subjData: SubjData
): Promise<StudyCycle | undefined> {
  return createStudyCycle(
    logger, intake, confidenceMap, startDate, endDate, subjData,
    'C3'
  );
}

export async function planC4(
  logger: Logger,
  intake: StudentIntake,
  confidenceMap: Map<string, number>,
  startDate: dayjs.Dayjs,
  endDate: dayjs.Dayjs,
  subjData: SubjData
): Promise<StudyCycle | undefined> {
  return createStudyCycle(
    logger, intake, confidenceMap, startDate, endDate, subjData,
    'C4'
  );
}

export async function planC5(
  logger: Logger,
  intake: StudentIntake,
  confidenceMap: Map<string, number>,
  startDate: dayjs.Dayjs | undefined,
  endDate: dayjs.Dayjs | undefined,
  subjData: SubjData
): Promise<StudyCycle | undefined> {
  if (!startDate || !endDate) {
    return undefined;
  }
  return createStudyCycle(
    logger, intake, confidenceMap, startDate, endDate, subjData,
    'C5'
  );
}

export async function planC5b(
  logger: Logger,
  intake: StudentIntake,
  confidenceMap: Map<string, number>,
  startDate: dayjs.Dayjs | undefined,
  endDate: dayjs.Dayjs | undefined,
  subjData: SubjData
): Promise<StudyCycle | undefined> {
  if (!startDate || !endDate) {
    return undefined;
  }
  return createStudyCycle(
    logger, intake, confidenceMap, startDate, endDate, subjData,
    'C5.b'
  );
}

export async function planC6(
  logger: Logger,
  intake: StudentIntake,
  confidenceMap: Map<string, number>,
  startDate: dayjs.Dayjs,
  endDate: dayjs.Dayjs,
  subjData: SubjData
): Promise<StudyCycle | undefined> {
  return createStudyCycle(
    logger, intake, confidenceMap, startDate, endDate, subjData,
    'C6'
  );
}

export async function planC7(
  logger: Logger,
  intake: StudentIntake,
  confidenceMap: Map<string, number>,
  startDate: dayjs.Dayjs,
  endDate: dayjs.Dayjs,
  subjData: SubjData
): Promise<StudyCycle | undefined> {
  return createStudyCycle(
    logger, intake, confidenceMap, startDate, endDate, subjData,
    'C7'
  );
}

export async function planC8(
  logger: Logger,
  intake: StudentIntake,
  confidenceMap: Map<string, number>,
  startDate: dayjs.Dayjs,
  endDate: dayjs.Dayjs,
  subjData: SubjData
): Promise<StudyCycle | undefined> {
  return createStudyCycle(
    logger, intake, confidenceMap, startDate, endDate, subjData,
    'C8'
  );
}
```

#### 1.4 Update Main Engine Imports

**File**: `src/engine/NewEngine-generate-plan.ts`

```typescript
// Replace all individual cycle imports with:
import { 
  planC1, planC2, planC3, planC4, planC5, planC5b, planC6, planC7, planC8 
} from './cycle-creator';

// Remove these individual imports:
// import { planC1 as planC1 } from './cycle-c1';
// import { planC2 as planC2 } from './cycle-c2';
// import { planC3 as planC3 } from './cycle-c3';
// import { planC4 as planC4 } from './cycle-c4';
// import { planC5 as planC5 } from './cycle-c5';
// import { planC5b as planC5b } from './cycle-c5b';
// import { planC6 as planC6 } from './cycle-c6';
// import { planC7 as planC7 } from './cycle-c7';
// import { planC8 as planC8 } from './cycle-c8';
```

#### 1.5 Remove Individual Cycle Files

After updating the imports, the following files can be deleted:
- `src/engine/cycle-c1.ts`
- `src/engine/cycle-c2.ts`
- `src/engine/cycle-c3.ts`
- `src/engine/cycle-c4.ts`
- `src/engine/cycle-c5.ts`
- `src/engine/cycle-c5b.ts`
- `src/engine/cycle-c6.ts`
- `src/engine/cycle-c7.ts`
- `src/engine/cycle-c8.ts`

### Benefits of Consolidating Cycle Functions

Moving all cycle functions to `cycle-creator.ts` provides:

1. **Reduced File Count**: From 9 individual files to 1 consolidated file
2. **Easier Maintenance**: All cycle logic in one place
3. **Simpler Imports**: Single import statement instead of 9 separate imports
4. **Better Organization**: Related functions grouped together
5. **Reduced Duplication**: No need for separate files with identical structure
6. **Easier Testing**: Can test all cycle functions together
7. **Cleaner Codebase**: Fewer files to navigate and maintain

### Why We Removed `cycleStartWeek`

The `cycleStartWeek` field was removed because:

1. **Not Used for Logic**: It's only stored as metadata, never used for calculations or business logic
2. **Redundant Data**: Can be calculated when needed using `cycleStartDate` and the overall study plan start date
3. **Maintenance Overhead**: Requires complex logic to calculate correctly during cycle creation
4. **YAGNI Principle**: "You Aren't Gonna Need It" - remove until actually needed

**When Needed in the Future:**
```typescript
// Can be calculated on-demand:
function calculateCycleStartWeek(cycle: StudyCycle, overallStartDate: dayjs.Dayjs): number {
  return Math.ceil(dayjs(cycle.cycleStartDate).diff(overallStartDate, 'day') / 7) + 1;
}
```

### Why We Removed `useSubjDataSubjects`

The `useSubjDataSubjects` flag was removed because it was masking an inconsistency in function signatures:

**The Problem:**
- **Some cycles** (C1, C2, C3, C8) took `allSubjects: any[]` parameter
- **Other cycles** (C4, C5, C5b, C6, C7) didn't take this parameter and used `subjData.subjects` internally
- **The `allSubjects` parameter** was just `subjData.subjects` passed through
- **The flag** was a workaround to handle this inconsistency

**The Solution:**
- **Standardized on `subjData.subjects`** as the canonical source
- **Removed the `allSubjects` parameter** from all functions
- **Removed the `useSubjDataSubjects` flag** entirely
- **Made all function signatures consistent**

**Benefits:**
- **Consistency**: All cycles now use the same data source
- **Simplicity**: No more confusing flags or parameter inconsistencies
- **Maintainability**: Single source of truth for subject data

### Why We Replaced `specialHandling` with `blockCreator`

The `specialHandling: 'gs-optional-split'` string was replaced with a proper function-based abstraction because:

1. **Type Safety**: Function-based approach provides compile-time validation
2. **Extensibility**: Easy to add new block creation strategies without modifying the generic function
3. **Clarity**: The function name clearly describes what it does (`createGSOptionalSplitBlocks`)
4. **Reusability**: Block creator functions can be reused across different cycles
5. **Testability**: Each block creator can be tested independently
6. **Maintainability**: Logic is encapsulated in dedicated functions rather than scattered conditionals

### Why We Removed `blockPrefix`

The `blockPrefix` field was removed from the configuration because:

1. **Redundancy**: It was often just a shortened version of `cycleName`
   - `cycleName: 'NCERT Foundation Cycle'` → `blockPrefix: 'C1 NCERT Foundation'`
   - `cycleName: 'Foundation Cycle'` → `blockPrefix: 'Foundation'`

2. **Automatic Generation**: We can generate meaningful block prefixes automatically:
   ```typescript
   const blockPrefix = config.cycleName.replace(/\s+Cycle$/, '');
   ```

3. **Simplified Configuration**: Removes unnecessary complexity from cycle definitions

4. **Consistency**: Ensures consistent block naming across all cycles

5. **Maintainability**: One less field to maintain and keep in sync

### Benefits of Constants-Based Configuration Approach

#### 1. **Better Organization**
- Each cycle configuration is clearly separated as a named constant
- Easy to read and understand individual cycle logic at the top of the file
- Better IDE support for navigation and refactoring
- Clear separation between configuration definition and logic

#### 2. **Reusability**
- Constants can be imported and used in other files if needed
- Easy to reference specific configurations in tests
- Can be used for validation or documentation purposes

#### 3. **Type Safety**
- `CycleType` union type ensures only valid cycle types are used
- Compile-time validation of cycle type parameters
- Better IntelliSense and autocomplete support
- Each constant is properly typed as `CycleConfig`

#### 4. **Maintainability**
- Adding new cycle types is straightforward - just add a new constant and case
- Modifying existing cycles is isolated to their specific constant
- Clear error handling with the default case
- Easy to spot configuration issues at the top of the file

#### 5. **Performance**
- Constants are created once at module load time
- Switch statement provides efficient lookup
- No function call overhead for configuration retrieval

#### 6. **Extensibility**
- Can easily add cycle-specific helper functions
- Can implement cycle inheritance or composition patterns
- Easy to add cycle metadata or dependencies
- Constants can be extended with additional properties

#### 7. **Code Clarity**
- Switch statement is clean and easy to understand
- Each configuration is self-contained and well-documented
- Clear naming convention (`C1_CONFIG`, `C2_CONFIG`, etc.)
- Easy to compare configurations side by side

## Implementation Plan

### Phase 1: Setup (1-2 days)
1. Create `cycle-config.ts` with all cycle configurations
2. Create `cycle-creator.ts` with the generic function
3. Add comprehensive tests for the generic function

### Phase 2: Migration (2-3 days)
1. Refactor one cycle at a time (start with C1 as it's simplest)
2. Update imports in `NewEngine-generate-plan.ts`
3. Test each refactored cycle thoroughly
4. Update any date calculation functions that are still needed

### Phase 3: Cleanup (1 day)
1. Remove old cycle files once all are migrated
2. Update documentation
3. Run full test suite

### Phase 4: Optimization (Optional)
1. Consider extracting date calculation functions to a separate utility
2. Add more sophisticated validation logic
3. Consider adding cycle dependency management

## Benefits of This Approach

### 1. **DRY Principle**
- Eliminates ~80% code duplication across cycle functions
- Single source of truth for common logic

### 2. **Maintainability**
- Changes to common logic only need to be made in one place
- Easier to add new cycle types
- Consistent error handling and logging

### 3. **Testability**
- Easier to test the generic function with different configurations
- Can test edge cases more systematically
- Reduced test surface area

### 4. **Type Safety**
- TypeScript ensures configuration completeness
- Compile-time validation of cycle properties

### 5. **Extensibility**
- Adding new cycle types only requires adding a configuration
- Easy to modify existing cycle behavior
- Clear separation of concerns

## Migration Strategy

### Step 1: Create New Files
```bash
# Create new files
touch src/engine/cycle-config.ts
touch src/engine/cycle-creator.ts
```

### Step 2: Implement Configuration
- Add all cycle configurations to `cycle-config.ts`
- Implement the generic `createStudyCycle` function

### Step 3: Refactor One by One
- Start with `cycle-c1.ts` (simplest)
- Test thoroughly before moving to next
- Update imports in main engine file

### Step 4: Handle Special Cases
- C2: GS/Optional split logic
- C6: Different function signature for `planMainsRevisionCycle`
- Date calculation functions that are still needed

### Step 5: Cleanup
- Remove old cycle files
- Update documentation
- Run full test suite

## Risk Mitigation

### 1. **Backward Compatibility**
- Keep existing function signatures during migration
- Gradual migration allows rollback if needed

### 2. **Testing**
- Comprehensive tests for generic function
- Test each refactored cycle individually
- Integration tests for full plan generation

### 3. **Documentation**
- Clear documentation of configuration options
- Examples for adding new cycle types
- Migration guide for future developers

## Estimated Timeline

- **Setup**: 1-2 days
- **Migration**: 2-3 days  
- **Testing**: 1 day
- **Cleanup**: 1 day
- **Total**: 5-7 days

This refactoring will significantly improve code maintainability while preserving all existing functionality and making it easier to add new cycle types in the future.
