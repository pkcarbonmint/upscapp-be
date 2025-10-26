# StudentIntake Function-Based Refactoring Plan

## Overview
Convert hardcoded values and formulas in the study plan generation system into functions on the StudentIntake interface. This will centralize logic, improve flexibility, and enable student-specific customization.

## Current Problems
- Hardcoded exam dates scattered across multiple files
- Fixed 8 hours/day assumption ignoring student's actual study capacity
- Hardcoded ratios and percentages that don't adapt to student preferences
- Date calculations duplicated in multiple cycle planning functions
- Difficult to customize for different coaching institutes or study approaches

## Implementation Strategy

**Key Design Decision**: Create a two-layer architecture:
1. **StudentIntake interface** - Contains data fields + calculator instance + function declarations
2. **StudyPlanCalculator interface/class** - Contains all computations, constants, and business logic

This provides:
- **Single Responsibility**: Calculator handles all business logic, StudentIntake handles data
- **Direct Access**: Functions are called directly on the calculator instance
- **Testability**: Can test calculations independently, mock calculator easily
- **Reusability**: StudyPlanCalculator can be used by other components
- **Simplicity**: No delegation layer needed, direct function calls
- **Flexibility**: Can swap calculators without changing interface

### Phase 1: Add Functions to StudentIntake Interface

#### Step 1.1: Update StudentIntake interface to include function declarations
**File**: `src/types/models.ts`

```typescript
// Update existing StudentIntake interface to include calculator and function declarations
export interface StudentIntake {
  // All existing fields remain the same
  subject_confidence: Record<SubjectCode, ConfidenceLevel>;
  study_strategy: StudyStrategy;
  subject_approach?: SubjectApproach;
  target_year?: string;
  start_date: string;
  personal_details?: PersonalDetails;
  preparation_background?: PreparationBackground;
  coaching_details?: CoachingDetails;
  optional_subject?: OptionalSubjectDetails;
  test_experience?: TestExperience;
  syllabus_awareness?: SyllabusAwareness;

  // NEW: Calculator instance for all computations
  calculator: StudyPlanCalculator;

  // NEW FUNCTION DECLARATIONS (these will be implemented as getters that call calculator):

  /**
   * Get daily study hours based on weekly_study_hours from study_strategy
   */
  getDailyStudyHours(): number;

  /**
   * Get weekly study hours from study_strategy
   */
  getWeeklyStudyHours(): number;

  /**
   * Get prelims exam date - can be customized based on coaching institute
   */
  getPrelimsExamDate(): Date;

  /**
   * Get mains exam date - can be customized based on coaching institute
   */
  getMainsExamDate(): Date;

  /**
   * Get C4 (Prelims Revision) start date - Jan 1 of target year
   */
  getC4StartDate(): Date;

  /**
   * Get C5 (Prelims Rapid Revision) start date - Apr 1 of target year
   */
  getC5StartDate(): Date;

  /**
   * Get C6 (Mains Revision) start date - After prelims exam
   */
  getC6StartDate(): Date;

  /**
   * Get C7 (Mains Rapid Revision) start date - Aug 1 of target year
   */
  getC7StartDate(): Date;

  /**
   * Get GS:Optional subject ratio based on study approach
   */
  getGSOptionalRatio(): { gs: number; optional: number };

  /**
   * Get task type ratios for different cycle types
   * Move hardcoded ratios from cycle-utils.ts here
   */
  getTaskTypeRatios(cycleType: CycleType): { study: number; practice: number; revision: number; test: number };

  /**
   * Get confidence factor for different confidence levels
   * Move hardcoded factors from buildConfidenceMap function
   */
  getConfidenceFactor(level: ConfidenceLevel): number;

  /**
   * Get foundation cycle end date - Dec 31 of year before target year
   */
  getFoundationCycleEndDate(): Date;

  /**
   * Get prelims revision period boundaries
   */
  getPrelimsRevisionPeriod(): { start: Date; end: Date };

  /**
   * Get mains revision period boundaries
   */
  getMainsRevisionPeriod(): { start: Date; end: Date };

  /**
   * Get target year as number
   */
  getTargetYear(): number;
}
```

#### Step 1.2: Create StudyPlanCalculator interface and implementation
**File**: `src/types/models.ts`

```typescript
// Interface for study plan calculations
export interface StudyPlanCalculator {
  getDailyStudyHours(weeklyHours: string): number;
  getWeeklyStudyHours(weeklyHours: string): number;
  getPrelimsExamDate(targetYear: string, coachingInstitute?: string): Date;
  getMainsExamDate(targetYear: string, coachingInstitute?: string): Date;
  getC4StartDate(targetYear: string): Date;
  getC5StartDate(targetYear: string): Date;
  getC6StartDate(prelimsDate: Date): Date;
  getC7StartDate(targetYear: string): Date;
  getGSOptionalRatio(studyApproach: StudyPacing): { gs: number; optional: number };
  getTaskTypeRatios(cycleType: CycleType, timeDistribution?: string): { study: number; practice: number; revision: number; test: number };
  getConfidenceFactor(level: ConfidenceLevel): number;
  getFoundationCycleEndDate(targetYear: string): Date;
  getPrelimsRevisionPeriod(targetYear: string): { start: Date; end: Date };
  getMainsRevisionPeriod(targetYear: string): { start: Date; end: Date };
  getTargetYear(targetYear?: string): number;
}

// Implementation of study plan calculations
export class StudyPlanCalculatorImpl implements StudyPlanCalculator {
  // Constants moved from hardcoded values
  private readonly DEFAULT_TARGET_YEAR = '2026';
  private readonly DEFAULT_WEEKLY_HOURS = 56;
  private readonly DEFAULT_DAILY_HOURS = 8;
  
  // Exam date constants
  private readonly PRELIMS_EXAM_DATE_2026 = '05-28';
  private readonly PRELIMS_EXAM_DATE_DEFAULT = '05-20';
  private readonly MAINS_EXAM_DATE_DEFAULT = '08-20';
  
  // Confidence factors
  private readonly CONFIDENCE_FACTORS: Record<ConfidenceLevel, number> = {
    'VeryStrong': 0.7,
    'Strong': 0.8,
    'Moderate': 1.0,
    'Weak': 1.2,
    'VeryWeak': 1.3,
    'NotStarted': 1.3
  };
  
  // Task type ratios for different cycles
  private readonly BASE_TASK_RATIOS: Record<CycleType, { study: number; practice: number; revision: number; test: number }> = {
    'C1': { study: 1.0, practice: 0, revision: 0, test: 0 },
    'C2': { study: 0.6, practice: 0.2, revision: 0.15, test: 0.05 },
    'C3': { study: 0.7, practice: 0.1, revision: 0.2, test: 0 },
    'C4': { study: 0.2, practice: 0.4, revision: 0.3, test: 0.1 },
    'C5': { study: 0.1, practice: 0.5, revision: 0.3, test: 0.1 },
    'C6': { study: 0.2, practice: 0.3, revision: 0.4, test: 0.1 },
    'C7': { study: 0.1, practice: 0.4, revision: 0.4, test: 0.1 },
    'C8': { study: 0.8, practice: 0.1, revision: 0.1, test: 0 }
  };

  getDailyStudyHours(weeklyHours: string): number {
    const hours = parseInt(weeklyHours) || this.DEFAULT_WEEKLY_HOURS;
    return Math.round(hours / 7);
  }

  getWeeklyStudyHours(weeklyHours: string): number {
    return parseInt(weeklyHours) || this.DEFAULT_WEEKLY_HOURS;
  }

  getPrelimsExamDate(targetYear: string, coachingInstitute?: string): Date {
    const year = parseInt(targetYear || this.DEFAULT_TARGET_YEAR);
    
    // Customize based on coaching institute if available
    if (coachingInstitute) {
      const institute = coachingInstitute.toLowerCase();
      if (institute.includes('vajiram')) {
        return new Date(`${year}-05-25`); // Earlier date
      }
      if (institute.includes('vision')) {
        return new Date(`${year}-05-30`); // Later date
      }
    }
    
    // Default based on year
    if (year === 2026) {
      return new Date(`${year}-${this.PRELIMS_EXAM_DATE_2026}`);
    }
    return new Date(`${year}-${this.PRELIMS_EXAM_DATE_DEFAULT}`);
  }

  getMainsExamDate(targetYear: string, coachingInstitute?: string): Date {
    const year = parseInt(targetYear || this.DEFAULT_TARGET_YEAR);
    
    // Customize based on coaching institute if available
    if (coachingInstitute) {
      const institute = coachingInstitute.toLowerCase();
      if (institute.includes('vajiram')) {
        return new Date(`${year}-08-15`); // Earlier date
      }
      if (institute.includes('vision')) {
        return new Date(`${year}-08-25`); // Later date
      }
    }
    
    return new Date(`${year}-${this.MAINS_EXAM_DATE_DEFAULT}`);
  }

  getC4StartDate(targetYear: string): Date {
    const year = parseInt(targetYear || this.DEFAULT_TARGET_YEAR);
    return new Date(`${year}-01-01`);
  }

  getC5StartDate(targetYear: string): Date {
    const year = parseInt(targetYear || this.DEFAULT_TARGET_YEAR);
    return new Date(`${year}-04-01`);
  }

  getC6StartDate(prelimsDate: Date): Date {
    return dayjs(prelimsDate).add(1, 'day').toDate();
  }

  getC7StartDate(targetYear: string): Date {
    const year = parseInt(targetYear || this.DEFAULT_TARGET_YEAR);
    return new Date(`${year}-08-01`);
  }

  getGSOptionalRatio(studyApproach: StudyPacing): { gs: number; optional: number } {
    switch (studyApproach) {
      case 'WeakFirst':
        return { gs: 0.8, optional: 0.2 }; // More focus on GS for weak students
      case 'StrongFirst':
        return { gs: 0.5, optional: 0.5 }; // Balanced approach
      case 'Balanced':
      default:
        return { gs: 0.67, optional: 0.33 }; // Standard 6:3 ratio
    }
  }

  getTaskTypeRatios(cycleType: CycleType, timeDistribution?: string): { study: number; practice: number; revision: number; test: number } {
    let ratios = this.BASE_TASK_RATIOS[cycleType];

    // Adjust based on time_distribution preference
    if (timeDistribution === 'PracticeHeavy') {
      ratios = {
        ...ratios,
        practice: Math.min(0.6, ratios.practice + 0.2),
        study: Math.max(0.1, ratios.study - 0.1)
      };
    } else if (timeDistribution === 'RevisionHeavy') {
      ratios = {
        ...ratios,
        revision: Math.min(0.6, ratios.revision + 0.2),
        study: Math.max(0.1, ratios.study - 0.1)
      };
    }

    return ratios;
  }

  getConfidenceFactor(level: ConfidenceLevel): number {
    return this.CONFIDENCE_FACTORS[level];
  }

  getFoundationCycleEndDate(targetYear: string): Date {
    const year = parseInt(targetYear || this.DEFAULT_TARGET_YEAR);
    return new Date(`${year - 1}-12-31`);
  }

  getPrelimsRevisionPeriod(targetYear: string): { start: Date; end: Date } {
    const year = parseInt(targetYear || this.DEFAULT_TARGET_YEAR);
    return {
      start: new Date(`${year}-01-01`),
      end: new Date(`${year}-03-31`)
    };
  }

  getMainsRevisionPeriod(targetYear: string): { start: Date; end: Date } {
    const year = parseInt(targetYear || this.DEFAULT_TARGET_YEAR);
    return {
      start: new Date(`${year}-06-01`),
      end: new Date(`${year}-07-31`)
    };
  }

  getTargetYear(targetYear?: string): number {
    return parseInt(targetYear || this.DEFAULT_TARGET_YEAR);
  }
}
```

#### Step 1.3: Create helper function to create StudentIntake with calculator
**File**: `src/types/models.ts`

```typescript
// Helper function to create StudentIntake with calculator
export function createStudentIntake(
  data: Omit<StudentIntake, 'calculator'>, 
  calculator?: StudyPlanCalculator
): StudentIntake {
  const calc = calculator || new StudyPlanCalculatorImpl();
  
  return {
    ...data,
    calculator: calc,
    
    // Implement functions as getters that call calculator
    getDailyStudyHours(): number {
      return this.calculator.getDailyStudyHours(this.study_strategy.weekly_study_hours);
    },

    getWeeklyStudyHours(): number {
      return this.calculator.getWeeklyStudyHours(this.study_strategy.weekly_study_hours);
    },

    getPrelimsExamDate(): Date {
      return this.calculator.getPrelimsExamDate(
        this.target_year || '2026',
        this.coaching_details?.coaching_institute_name
      );
    },

    getMainsExamDate(): Date {
      return this.calculator.getMainsExamDate(
        this.target_year || '2026',
        this.coaching_details?.coaching_institute_name
      );
    },

    getC4StartDate(): Date {
      return this.calculator.getC4StartDate(this.target_year || '2026');
    },

    getC5StartDate(): Date {
      return this.calculator.getC5StartDate(this.target_year || '2026');
    },

    getC6StartDate(): Date {
      const prelimsDate = this.getPrelimsExamDate();
      return this.calculator.getC6StartDate(prelimsDate);
    },

    getC7StartDate(): Date {
      return this.calculator.getC7StartDate(this.target_year || '2026');
    },

    getGSOptionalRatio(): { gs: number; optional: number } {
      return this.calculator.getGSOptionalRatio(this.study_strategy.study_approach);
    },

    getTaskTypeRatios(cycleType: CycleType): { study: number; practice: number; revision: number; test: number } {
      return this.calculator.getTaskTypeRatios(cycleType, this.study_strategy.time_distribution);
    },

    getConfidenceFactor(level: ConfidenceLevel): number {
      return this.calculator.getConfidenceFactor(level);
    },

    getFoundationCycleEndDate(): Date {
      return this.calculator.getFoundationCycleEndDate(this.target_year || '2026');
    },

    getPrelimsRevisionPeriod(): { start: Date; end: Date } {
      return this.calculator.getPrelimsRevisionPeriod(this.target_year || '2026');
    },

    getMainsRevisionPeriod(): { start: Date; end: Date } {
      return this.calculator.getMainsRevisionPeriod(this.target_year || '2026');
    },

    getTargetYear(): number {
      return this.calculator.getTargetYear(this.target_year);
    }
  };
}
```

#### Step 1.3: Add dayjs import to models.ts
```typescript
// Add at the top of models.ts
import dayjs from 'dayjs';
```

#### Step 1.4: Usage Pattern
**File**: `src/services/helios.ts` (or wherever StudentIntake is used)

```typescript
// When receiving StudentIntake data, create with calculator:
export async function generatePlan(request: PlanGenerationRequest) {
  // Option 1: Use default calculator
  const intake = createStudentIntake(request.student_intake);
  
  // Option 2: Use custom calculator (for testing or different logic)
  const customCalculator = new StudyPlanCalculatorImpl();
  const intake = createStudentIntake(request.student_intake, customCalculator);
  
  // Now you can call functions directly on the intake
  const dailyHours = intake.getDailyStudyHours();
  const prelimsDate = intake.getPrelimsExamDate();
  
  // Pass the intake to engine functions
  return await generateInitialPlan(
    request.user_id,
    config,
    archetype,
    intake, // Pass StudentIntake with calculator
    logger
  );
}
```

**Architecture Benefits**:
- **StudentIntake** contains data + calculator instance + functions
- **StudyPlanCalculator** contains all business logic and constants
- **Direct access**: Functions call calculator directly (no delegation layer)
- **Easy testing**: Mock the calculator for unit tests
- **Flexible**: Can swap calculators without changing interface
- **Simple**: No separate implementation class needed

### Phase 2: Update Main Engine Function

#### Step 2.1: Update generateInitialPlan function
**File**: `src/engine/NewEngine-generate-plan.ts`

**Changes needed**:

1. **Update function signature**:
```typescript
// CHANGE FROM:
export async function generateInitialPlan(
  userId: string,
  _config: Config,
  _archetypeDetails: Archetype,
  intake: StudentIntake,
  logger0?: Logger
): Promise<{ plan: StudyPlan; logs: LogEntry[] }> {

// CHANGE TO:
export async function generateInitialPlan(
  userId: string,
  _config: Config,
  _archetypeDetails: Archetype,
  intake: StudentIntake, // Keep as interface, not implementation
  logger0?: Logger
): Promise<{ plan: StudyPlan; logs: LogEntry[] }> {
```

2. **Replace hardcoded values with function calls**:
```typescript
// REPLACE THIS (line 87-88):
const targetYear = parseInt(intake.target_year || '2026');
const prelimsExamDate = dayjs(`${targetYear}-05-28`).toDate(); // Default prelims date

// WITH THIS:
const targetYear = intake.getTargetYear();
const prelimsExamDate = intake.getPrelimsExamDate();
```

3. **Update buildFinalPlan call**:
```typescript
// REPLACE THIS (line 511):
targeted_year: parseInt(intake.target_year || '2026'),

// WITH THIS:
targeted_year: intake.getTargetYear(),
```

#### Step 2.2: Update generateCyclesFromSchedule function
**File**: `src/engine/NewEngine-generate-plan.ts`

**Changes needed**:

1. **Update function signature**:
```typescript
// CHANGE FROM:
async function generateCyclesFromSchedule(
  logger: Logger,
  intake: StudentIntake,
  scheduleResult: any,
  subjData: SubjData
): Promise<StudyCycle[]> {

// CHANGE TO:
async function generateCyclesFromSchedule(
  logger: Logger,
  intake: StudentIntake, // Keep as interface
  scheduleResult: any,
  subjData: SubjData
): Promise<StudyCycle[]> {
```

#### Step 2.3: Update generateCycleForSchedule function
**File**: `src/engine/NewEngine-generate-plan.ts`

**Changes needed**:

1. **Update function signature**:
```typescript
// CHANGE FROM:
async function generateCycleForSchedule(
  logger: Logger,
  intake: StudentIntake,
  schedule: any,
  subjData: SubjData
): Promise<StudyCycle | undefined> {

// CHANGE TO:
async function generateCycleForSchedule(
  logger: Logger,
  intake: StudentIntakeImpl,
  schedule: any,
  subjData: SubjData
): Promise<StudyCycle | undefined> {
```

#### Step 2.4: Update buildFinalPlan function
**File**: `src/engine/NewEngine-generate-plan.ts`

**Changes needed**:

1. **Update function signature**:
```typescript
// CHANGE FROM:
async function buildFinalPlan(
  logger: Logger,
  intake: StudentIntake,
  cycles: StudyCycle[],
  scenario?: string
): Promise<StudyPlan> {

// CHANGE TO:
async function buildFinalPlan(
  logger: Logger,
  intake: StudentIntakeImpl,
  cycles: StudyCycle[],
  scenario?: string
): Promise<StudyPlan> {
```

### Phase 3: Update Cycle Planning Functions

#### Step 3.1: Update cycle-foundation.ts
**File**: `src/engine/cycle-foundation.ts`

**Changes needed**:

1. **Update function signature**:
```typescript
// CHANGE FROM:
export async function planFoundationCycle(
  logger: Logger,
  intake: StudentIntake,
  confidenceMap: Map<string, number>,
  startDate: dayjs.Dayjs,
  subjData: SubjData,
  allSubjects: any[]
): Promise<StudyCycle | undefined> {

// CHANGE TO:
export async function planFoundationCycle(
  logger: Logger,
  intake: StudentIntakeImpl,
  confidenceMap: Map<string, number>,
  startDate: dayjs.Dayjs,
  subjData: SubjData,
  allSubjects: any[]
): Promise<StudyCycle | undefined> {
```

2. **Replace hardcoded values**:
```typescript
// REPLACE THIS (line 26-27):
const targetYear = parseInt(intake.target_year || '2026');
const endDate = dayjs(`${targetYear - 1}-12-31`);

// WITH THIS:
const endDate = dayjs(intake.getFoundationCycleEndDate());
```

3. **Replace hardcoded study hours**:
```typescript
// REPLACE THIS (line 38):
const totalHours = durationWeeks * 7 * 8;

// WITH THIS:
const dailyHours = intake.getDailyStudyHours();
const totalHours = durationWeeks * 7 * dailyHours;
```

4. **Replace hardcoded ratios**:
```typescript
// REPLACE THIS (line 45-46):
const gsHours = Math.floor(totalHours * 0.67); // 6/9 = 0.67
const optionalHours = Math.floor(totalHours * 0.33); // 3/9 = 0.33

// WITH THIS:
const ratio = intake.getGSOptionalRatio();
const gsHours = Math.floor(totalHours * ratio.gs);
const optionalHours = Math.floor(totalHours * ratio.optional);
```

#### Step 3.2: Update cycle-utils.ts
**File**: `src/engine/cycle-utils.ts`

**Changes needed**:

1. **Update function signature**:
```typescript
// CHANGE FROM:
export async function createBlocksForSubjects(
  intake: StudentIntake,
  subjects: Subject[],
  totalHours: number,
  confidenceMap: Map<string, number>,
  blockPrefix: string,
  cycleType: CycleType,
  cycleOrder: number,
  cycleName: string,
  cycleStartDate: string,
  cycleEndDate: string,
  subjData: any,
): Promise<Block[]> {

// CHANGE TO:
export async function createBlocksForSubjects(
  intake: StudentIntakeImpl,
  subjects: Subject[],
  totalHours: number,
  confidenceMap: Map<string, number>,
  blockPrefix: string,
  cycleType: CycleType,
  cycleOrder: number,
  cycleName: string,
  cycleStartDate: string,
  cycleEndDate: string,
  subjData: any,
): Promise<Block[]> {
```

2. **Replace hardcoded task ratios**:
```typescript
// REMOVE THIS ENTIRE SECTION (lines 11-20):
const taskRatios: Record<CycleType, { study: number; practice: number; revision: number; test: number }> = {
  'C1': { study: 1.0, practice: 0, revision: 0, test: 0 },
  'C2': { study: 0.6, practice: 0.2, revision: 0.15, test: 0.05 },
  // ... etc
};

// REPLACE WITH:
// Task ratios are now handled by intake.getTaskTypeRatios(cycleType)
```

3. **Update task ratio usage**:
```typescript
// FIND ALL USAGES OF taskRatios[cycleType] AND REPLACE WITH:
const taskRatios = intake.getTaskTypeRatios(cycleType);
```

4. **Replace hardcoded study hours**:
```typescript
// REPLACE THIS (line 129):
const blockDurationWeeks = Math.ceil(allocatedHours / (hoursPerDay * 7)); // 8 hours/day, 7 days/week

// WITH THIS:
const dailyHours = intake.getDailyStudyHours();
const blockDurationWeeks = Math.ceil(allocatedHours / (dailyHours * 7));
```

5. **Replace other hardcoded 8 hours/day references**:
```typescript
// REPLACE THIS (line 167):
const constrainedHours = actualWeeks * 7 * 8; // 8 hours/day

// WITH THIS:
const dailyHours = intake.getDailyStudyHours();
const constrainedHours = actualWeeks * 7 * dailyHours;
```

```typescript
// REPLACE THIS (line 397):
const maxPossibleHours = cycleDurationDays * 8; // 8 hours/day

// WITH THIS:
const dailyHours = intake.getDailyStudyHours();
const maxPossibleHours = cycleDurationDays * dailyHours;
```

#### Step 3.3: Update cycle-scheduler.ts
**File**: `src/engine/cycle-scheduler.ts`

**Changes needed**:

1. **Update function signatures to accept StudentIntakeImpl**:
```typescript
// CHANGE FROM:
export function determineCycleSchedule(
  logger: Logger,
  startDate: Date,
  targetYear: number,
  prelimsExamDate: Date
): ScenarioResult {

// CHANGE TO:
export function determineCycleSchedule(
  logger: Logger,
  startDate: Date,
  targetYear: number,
  prelimsExamDate: Date,
  intake?: StudentIntakeImpl
): ScenarioResult {
```

2. **Replace hardcoded exam dates in all scenario functions**:
```typescript
// IN getS1Schedule, getS2Schedule, etc. REPLACE:
const prelimsExamDate = dayjs(`${targetYear}-05-20`);
const mainsExamDate = dayjs(`${targetYear}-08-20`);

// WITH:
const prelimsExamDate = intake ? dayjs(intake.getPrelimsExamDate()) : dayjs(`${targetYear}-05-20`);
const mainsExamDate = intake ? dayjs(intake.getMainsExamDate()) : dayjs(`${targetYear}-08-20`);
```

3. **Update cycle start dates to use intake functions**:
```typescript
// REPLACE HARDCODED DATES WITH FUNCTION CALLS:
// C4 start: dayjs(`${targetYear}-01-01`) -> intake.getC4StartDate()
// C5 start: dayjs(`${targetYear}-04-01`) -> intake.getC5StartDate()
// C6 start: prelimsExamDate -> intake.getC6StartDate()
// C7 start: dayjs(`${targetYear}-08-01`) -> intake.getC7StartDate()
```

#### Step 3.4: Update other cycle planning functions
**Files**: `cycle-c1-ncert.ts`, `cycle-c3-mains-prefoundation.ts`, `cycle-c8-mains-foundation.ts`, `cycle-prelims-revision.ts`, `cycle-prelims-rapid.ts`, `cycle-mains-revision.ts`, `cycle-mains-rapid.ts`

**Changes needed for each file**:

1. **Update function signatures**:
```typescript
// CHANGE FROM:
export async function planXXXCycle(
  logger: Logger,
  intake: StudentIntake,
  // ... other params
): Promise<StudyCycle | undefined> {

// CHANGE TO:
export async function planXXXCycle(
  logger: Logger,
  intake: StudentIntakeImpl,
  // ... other params
): Promise<StudyCycle | undefined> {
```

2. **Replace hardcoded study hours**:
```typescript
// REPLACE ALL INSTANCES OF:
const totalHours = durationWeeks * 7 * 8; // 8 hours/day

// WITH:
const dailyHours = intake.getDailyStudyHours();
const totalHours = durationWeeks * 7 * dailyHours;
```

3. **Replace hardcoded dates**:
```typescript
// REPLACE HARDCODED DATES WITH APPROPRIATE FUNCTION CALLS:
// For dates like `${targetYear}-05-20`, `${targetYear}-08-20`, etc.
// Use intake.getPrelimsExamDate(), intake.getMainsExamDate(), etc.
```

### Phase 4: Update buildConfidenceMap Function

#### Step 4.1: Update buildConfidenceMap in NewEngine-generate-plan.ts
**File**: `src/engine/NewEngine-generate-plan.ts`

**Changes needed**:

1. **Update function signature**:
```typescript
// CHANGE FROM:
function buildConfidenceMap(logger: Logger, intake: StudentIntake, subjData: SubjData): Map<string, number> {

// CHANGE TO:
function buildConfidenceMap(logger: Logger, intake: StudentIntakeImpl, subjData: SubjData): Map<string, number> {
```

2. **Replace hardcoded confidence factors**:
```typescript
// REMOVE THIS SECTION (lines 272-278):
const confidenceFactors: Record<ConfidenceLevel, number> = {
  'VeryStrong': 0.7,
  'Strong': 0.8,
  'Moderate': 1.0,
  'Weak': 1.2,
  'VeryWeak': 1.3,
  'NotStarted': 1.3
};

// REPLACE USAGE WITH:
// intake.getConfidenceFactor(confidenceLevel)
```

3. **Update confidence factor usage**:
```typescript
// REPLACE THIS (line 285):
stretchFactor: confidenceFactors[confidenceLevel],

// WITH THIS:
stretchFactor: intake.getConfidenceFactor(confidenceLevel),
```

```typescript
// REPLACE THIS (line 301):
const moderateFactor = confidenceFactors['Moderate'];

// WITH THIS:
const moderateFactor = intake.getConfidenceFactor('Moderate');
```

### Phase 5: Update API and Service Layers

#### Step 5.1: Update API layer
**File**: `src/types/API.ts`

**Changes needed**:

1. **Update interface to use StudentIntakeImpl**:
```typescript
// CHANGE FROM:
export interface PlanGenerationRequest {
  user_id: string;
  student_intake: StudentIntake;
}

// CHANGE TO:
export interface PlanGenerationRequest {
  user_id: string;
  student_intake: StudentIntakeImpl;
}
```

#### Step 5.2: Update service layer
**File**: `src/services/helios.ts`

**Changes needed**:

1. **Convert StudentIntake to StudentIntakeImpl**:
```typescript
// ADD CONVERSION LOGIC WHERE STUDENTINTAKE IS RECEIVED:
const intakeImpl = new StudentIntakeImpl(rawIntake);
```

### Phase 6: Update Tests

#### Step 6.1: Create test file for StudyPlanCalculator
**File**: `src/types/__tests__/StudyPlanCalculator.test.ts`

```typescript
import { StudyPlanCalculatorImpl } from '../models';

describe('StudyPlanCalculatorImpl', () => {
  let calculator: StudyPlanCalculatorImpl;

  beforeEach(() => {
    calculator = new StudyPlanCalculatorImpl();
  });

  describe('getDailyStudyHours', () => {
    it('should calculate daily hours from weekly hours', () => {
      expect(calculator.getDailyStudyHours('42')).toBe(6); // 42/7 = 6
    });

    it('should default to 8 hours when weekly hours not provided', () => {
      expect(calculator.getDailyStudyHours('')).toBe(8); // 56/7 = 8
    });
  });

  describe('getPrelimsExamDate', () => {
    it('should return default date for 2026', () => {
      const date = calculator.getPrelimsExamDate('2026');
      expect(date.getFullYear()).toBe(2026);
      expect(date.getMonth()).toBe(4); // May (0-indexed)
      expect(date.getDate()).toBe(28);
    });

    it('should customize date for Vajiram institute', () => {
      const date = calculator.getPrelimsExamDate('2026', 'Vajiram & Ravi');
      expect(date.getDate()).toBe(25); // Earlier date for Vajiram
    });
  });

  describe('getGSOptionalRatio', () => {
    it('should return balanced ratio by default', () => {
      const ratio = calculator.getGSOptionalRatio('Balanced');
      expect(ratio.gs).toBe(0.67);
      expect(ratio.optional).toBe(0.33);
    });

    it('should return weak-first ratio for WeakFirst approach', () => {
      const ratio = calculator.getGSOptionalRatio('WeakFirst');
      expect(ratio.gs).toBe(0.8);
      expect(ratio.optional).toBe(0.2);
    });
  });

  // Add more tests for other functions...
});
```

#### Step 6.2: Create test file for StudentIntake with calculator
**File**: `src/types/__tests__/StudentIntake.test.ts`

```typescript
import { createStudentIntake, StudyPlanCalculatorImpl } from '../models';
import { StudentIntake } from '../models';

describe('StudentIntake with calculator', () => {
  const mockIntakeData = {
    subject_confidence: {},
    study_strategy: {
      study_focus_combo: 'GSPlusOptionalPlusCSAT',
      weekly_study_hours: '42',
      time_distribution: 'Balanced',
      study_approach: 'Balanced',
      revision_strategy: 'Weekly',
      test_frequency: 'Monthly',
      seasonal_windows: [],
      catch_up_day_preference: 'Sunday'
    },
    target_year: '2026',
    start_date: '2024-01-01'
  };

  let intake: StudentIntake;

  beforeEach(() => {
    intake = createStudentIntake(mockIntakeData);
  });

  describe('function calls on calculator', () => {
    it('should call getDailyStudyHours on calculator', () => {
      const result = intake.getDailyStudyHours();
      expect(result).toBe(6); // 42/7 = 6
    });

    it('should call getPrelimsExamDate on calculator', () => {
      const date = intake.getPrelimsExamDate();
      expect(date.getFullYear()).toBe(2026);
      expect(date.getMonth()).toBe(4); // May (0-indexed)
    });
  });

  describe('with custom calculator', () => {
    it('should use custom calculator when provided', () => {
      const mockCalculator = {
        getDailyStudyHours: jest.fn().mockReturnValue(10),
        getWeeklyStudyHours: jest.fn().mockReturnValue(70),
        getPrelimsExamDate: jest.fn().mockReturnValue(new Date('2026-05-25')),
        // ... other methods
      } as any;

      const customIntake = createStudentIntake(mockIntakeData, mockCalculator);
      
      const result = customIntake.getDailyStudyHours();
      expect(mockCalculator.getDailyStudyHours).toHaveBeenCalledWith('42');
      expect(result).toBe(10);
    });
  });

  describe('calculator access', () => {
    it('should have calculator instance accessible', () => {
      expect(intake.calculator).toBeInstanceOf(StudyPlanCalculatorImpl);
    });

    it('should allow direct calculator access', () => {
      const directResult = intake.calculator.getDailyStudyHours('42');
      const methodResult = intake.getDailyStudyHours();
      expect(directResult).toBe(methodResult);
    });
  });
});
```

### Phase 7: Migration Strategy

#### Step 7.1: Gradual Migration Approach
1. **Create StudentIntakeImpl class** (Phase 1)
2. **Update one cycle function at a time** (Phase 3)
3. **Test each change thoroughly** before moving to next
4. **Keep old hardcoded values as fallbacks** during transition
5. **Remove hardcoded values** only after all functions are updated

#### Step 7.2: Backward Compatibility
```typescript
// Add fallback logic in StudentIntakeImpl functions:
getPrelimsExamDate(): Date {
  const targetYear = parseInt(this.target_year || '2026');
  
  // Try to get from coaching details first
  if (this.coaching_details?.coaching_institute_name) {
    // ... customization logic
  }
  
  // Fallback to default
  return new Date(`${targetYear}-05-28`);
}
```

### Phase 8: Validation and Error Handling

#### Step 8.1: Add validation to StudentIntakeImpl
```typescript
// Add to StudentIntakeImpl constructor:
constructor(data: StudentIntake) {
  Object.assign(this, data);
  this.validate();
}

private validate(): void {
  if (!this.target_year) {
    console.warn('StudentIntake: target_year not provided, using default 2026');
  }
  
  if (!this.study_strategy.weekly_study_hours) {
    console.warn('StudentIntake: weekly_study_hours not provided, using default 56');
  }
  
  // Add more validation as needed
}
```

#### Step 8.2: Add error handling to functions
```typescript
getDailyStudyHours(): number {
  try {
    const weeklyHours = parseInt(this.study_strategy.weekly_study_hours) || 56;
    if (weeklyHours <= 0 || weeklyHours > 168) { // Max 24*7 = 168 hours/week
      console.warn(`Invalid weekly study hours: ${weeklyHours}, using default 56`);
      return 8; // 56/7 = 8
    }
    return Math.round(weeklyHours / 7);
  } catch (error) {
    console.error('Error calculating daily study hours:', error);
    return 8; // Default fallback
  }
}
```

## Testing Strategy

### Unit Tests
- Test each function in StudentIntakeImpl independently
- Test edge cases (missing data, invalid data)
- Test customization logic (coaching institutes, study approaches)

### Integration Tests
- Test full plan generation with StudentIntakeImpl
- Test that generated plans are consistent with student preferences
- Test that exam dates and study hours are properly applied

### Regression Tests
- Ensure existing functionality still works
- Compare generated plans before and after changes
- Verify that hardcoded values are properly replaced

## Success Criteria

1. **No hardcoded values remain** in cycle planning functions
2. **All date calculations** use StudentIntakeImpl functions
3. **Study hours** are calculated from student's actual capacity
4. **Ratios and factors** adapt to student preferences
5. **Tests pass** with both old and new implementations
6. **Performance** is not significantly impacted
7. **Backward compatibility** is maintained during migration

## Rollback Plan

If issues arise during implementation:
1. **Keep old function signatures** as overloads
2. **Use feature flags** to switch between old and new implementations
3. **Maintain separate code paths** during transition period
4. **Gradual rollout** with monitoring

## Timeline Estimate

- **Phase 1-2**: 2-3 days (Core implementation)
- **Phase 3**: 3-4 days (Cycle function updates)
- **Phase 4-5**: 1-2 days (Supporting changes)
- **Phase 6**: 2-3 days (Testing)
- **Phase 7-8**: 1-2 days (Migration and validation)

**Total**: 9-14 days

## Notes for AI Implementation

1. **Start with Phase 1** - create the StudentIntakeImpl class first
2. **Test each phase** before moving to the next
3. **Use TypeScript strict mode** to catch type errors early
4. **Add comprehensive logging** to track function calls
5. **Validate all date calculations** are correct
6. **Ensure all imports are updated** when changing function signatures
7. **Run existing tests** after each change to catch regressions
8. **Use consistent naming** for all new functions
9. **Document any deviations** from this plan
10. **Ask for clarification** if any step is unclear
