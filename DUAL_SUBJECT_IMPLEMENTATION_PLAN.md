# DualSubject/TripleSubject Implementation Plan

## Overview

This document outlines the implementation strategy for achieving DualSubject and TripleSubject functionality in the study planner. Focus is on adding parallel blocks to cycles, without compression - that will be addressed separately.

## Main Requirements

### 1. Core Functionality Requirements

#### 1.1 SubjectApproach Execution
- **Current State**: SubjectApproach mapping logic exists but doesn't affect block generation
- **Target**: Plans should exhibit different behavior based on SubjectApproach
  - `SingleSubject`: Sequential blocks (current behavior)
  - `DualSubject`: Maintain 2 active parallel blocks continuously  
  - `TripleSubject`: Maintain 3 active parallel blocks continuously

#### 1.2 Interface Preservation
- **Requirement**: Zero breaking changes to existing function signatures
- **Primary Interface**: `generateInitialPlan()` must remain unchanged
```typescript
generateInitialPlan(
  userId: string, _config: Config, _archetypeDetails: Archetype, 
  intake: StudentIntake, logger0?: Logger
): Promise<{ plan: StudyPlan; logs: LogEntry[] }>
```


### 2. Design Constraints Discovered

#### 2.1 Duration Relationships
- **Constraint**: Different subjects have natural, variable durations
- **Implication**: Cannot force equal end dates for parallel subjects
- **Approach**: Compression-based timeline reduction rather than artificial scheduling

#### 2.2 Implementation Complexity
- **Parallel Grouping**: Rejected as "unnecessary complexity with no real benefit"
- **Daily Mixing**: Would require significant architectural changes
- **Accepted**: Timeline compression maintains existing architecture

### 3. Current Symptom Analysis

#### 3.1 JSON Output Evidence
From generated test documents:
```json
// Current: All approaches produce single-subject blocks
{
  "study_strategy": {
    "study_focus_combo": "OneGSPlusOptional"  // Should → DualSubject
  },
  "blocks": [
    {"subjects": ["H01"]},  // ❌ Still single subject
    {"subjects": ["H02"]},  // ❌ Still single subject  
  ]
}
```


## Design Decisions Made

### Decision 1: Continuous Parallel Block Approach
- **Goal**: Maintain continuous parallel execution throughout cycle
- **Approach**: Always keep 2 (DualSubject) or 3 (TripleSubject) active blocks running
- **Rationale**: Maximize concurrent study throughout entire cycle duration

### Decision 2: Implementation Scope
- **Focus**: Foundation cycle parallel blocks only for now
- **Future**: Compression can be added as separate feature later
- **Integration**: Minimal changes to existing block creation pipeline

### Decision 3: Implementation Scope
- **Scope**: Start with Foundation cycle only
- **Integration**: Use existing block creation functions with compression enhancement
- **Testing**: Generate comparison documents showing before/after behavior

## Key Implementation Questions Remaining

1. **Continuous Parallel Block Creation**:
   - How to modify `createBlocksForSubjects()` to maintain 2-3 active blocks?
   - How to schedule blocks to start as soon as any currently active block completes?

2. **Validation Strategy**:
   - How to verify DualSubject/TripleSubject behavior creates parallel blocks?
   - What should the JSON output look like for parallel blocks?

3. **Rollout Strategy**:
   - Feature flags vs immediate implementation?
   - Testing approach for parallel block generation?

## Expected Outcomes

### Successful Implementation Should Show:

#### DualSubject Behavior:
```json
// Before: 8 weeks sequential
{
  "blocks": [
    {"subject": "H01", "block_start_date": "2025-10-01", "block_end_date": "2025-10-14"},
    {"subject": "H02", "block_start_date": "2025-10-15", "block_end_date": "2025-10-28"}, 
    {"subject": "G01", "block_start_date": "2025-10-29", "block_end_date": "2025-11-11"},
    {"subject": "P01", "block_start_date": "2025-11-12", "block_end_date": "2025-11-25"}
  ]
}

// After: DualSubject (maintain 2 parallel throughout)
{
  "blocks": [
    {"subject": "H01", "block_start_date": "2025-10-01", "block_end_date": "2025-10-22", "duration_weeks": 3},
    {"subject": "H02", "block_start_date": "2025-10-01", "block_end_date": "2025-10-14", "duration_weeks": 2}, // Same start!
    {"subject": "G01", "block_start_date": "2025-10-15", "block_end_date": "2025-10-28", "duration_weeks": 2}, // Starts when Block 2 ends
    {"subject": "P01", "block_start_date": "2025-10-29", "block_end_date": "2025-11-11", "duration_weeks": 2}  // Starts when Block 1 ends
  ]
}
```

#### TripleSubject Behavior:
```json
// TripleSubject (maintain 3 parallel throughout)
{
  "blocks": [
    {"subject": "H01", "block_start_date": "2025-10-01", "block_end_date": "2025-10-22", "duration_weeks": 3},
    {"subject": "H02", "block_start_date": "2025-10-01", "block_end_date": "2025-10-14", "duration_weeks": 2}, // All start together!
    {"subject": "G01", "block_start_date": "2025-10-01", "block_end_date": "2025-10-21", "duration_weeks": 3}, // All start together!
    {"subject": "P01", "block_start_date": "2025-10-15", "block_end_date": "2025-10-28", "duration_weeks": 2}, // Starts when H02 ends
    {"subject": "E01", "block_start_date": "2025-10-22", "block_end_date": "2025-11-04", "duration_weeks": 2}  // Starts when H01 ends
  ]
}
```


## Implementation Strategy

### Phase 1: Parallel Block Design

#### 1.1 Parallel Block Scheduling Logic
```typescript
interface ParallelSchedulingContext {
  subjectApproach: SubjectApproach;
  cycleStartDate: string;
  cycleEndDate: string;
  totalHours: number;
}

function createParallelBlocks(
  subjects: Subject[],
  context: ParallelSchedulingContext,
  confidenceMap: Map<string, number>,
  subjData: any,
  blockPrefix: string,
  cycleType: CycleType,
  cycleOrder: number,
  cycleName: string
): Block[] {
  
  const { subjectApproach } = context;
  
  if (subjectApproach === 'SingleSubject') {
    // Sequential: Create blocks one after another
    return createSequentialBlocks(subjects, context, confidenceMap, subjData, blockPrefix, cycleType, cycleOrder, cycleName);
  }
  
  // Continuous parallel: Schedule blocks maintaining constant parallelism
  const numberOfParallelSubjects = subjectApproach === 'DualSubject' ? 2 : 3;
  return createContinuousParallelBlocks(subjects, numberOfParallelSubjects, context, confidenceMap, subjData, blockPrefix, cycleType, cycleOrder, cycleName);

function createContinuousParallelBlocks(
  subjects: Subject[],
  numberOfParallelSubjects: number,
  context: ParallelSchedulingContext,
  confidenceMap: Map<string, number>,
  subjData: any,
  blockPrefix: string,
  cycleType: CycleType,
  cycleOrder: number,
  cycleName: string
): Block[] {
  
  const parallelBlocks: Block[] = [];
  const activeBlockEndDates: Array<{endDate: dayjs.Dayjs, subject: Subject}> = [];
  
  // Use passed numberOfParallelSubjects instead of deriving from SubjectApproach
  
  // Initialize with first N blocks
  const initialBlocks = subjects.slice(0, numberOfParallelSubjects);
  let currentStartDate = dayjs(context.cycleStartDate);
  
  for (let i = 0; i < initialBlocks.length; i++) {
    const subject = initialBlocks[i];
    const subjectHours = context.totalHours / subjects.length;
    
    const block = createSingleSubjectBlock(
      subject.subjectCode,
      currentStartDate.format('YYYY-MM-DD'), // Same start for initial set
      subjectHours,
      confidenceMap,
      subjData,
      blockPrefix,
      cycleType,
      cycleOrder,
      cycleName
    );
    
    parallelBlocks.push(block);
    activeBlockEndDates.push({
      endDate: dayjs(block.block_end_date),
      subject
    });
  }
  
  // Schedule remaining subjects: as soon as ANY block ends, start the next one
  const remainingSubjects = subjects.slice(numberOfParallelSubjects);
  for (const subject of remainingSubjects) {
    // Find the earliest ending block
    const earliestEnding = activeBlockEndDates.reduce((earliest, current) => 
      current.endDate.isBefore(earliest.endDate) ? current : earliest
    );
    
    const subjectHours = context.totalHours / subjects.length;
    const block = createSingleSubjectBlock(
      subject.subjectCode,
      earliestEnding.endDate.add(1, 'day').format('YYYY-MM-DD'), // Start when earliest ends
      subjectHours,
      confidenceMap,
      subjData,
      blockPrefix,
      cycleType,
      cycleOrder,
      cycleName
    );
    
    parallelBlocks.push(block);
    
    // Update the active blocks list: replace ending block with new one
    const endDateIndex = activeBlockEndDates.indexOf(earliestEnding);
    activeBlockEndDates[endDateIndex] = {
      endDate: dayjs(block.block_end_date),
      subject
    };
  }
  
  return parallelBlocks;
}
```

#### 1.2 Helper Functions (Optional)
```typescript
function chunkList<T>(chunkSize: number, items: T[]): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    chunks.push(items.slice(i, i + chunkSize));
  }
  return chunks;
}

// Helper function to create single subject block
async function createSingleSubjectBlock(
  subjectCode: string,
  startDate: string,
  allocatedHours: number,
  confidenceMap: Map<string, number>,
  subjData: any,
  blockPrefix: string,
  cycleType: CycleType,
  cycleOrder: number,
  cycleName: string
): Promise<Block> {
  
  // Get existing subject block creation logic
  const subject = subjData.subjects.find(s => s.subjectCode === subjectCode);
  if (!subject) throw new Error(`Subject ${subjectCode} not found`);
  
  // Use existing block creation but override start date for parallel scheduling
  const block = await createSequentialSubjectBlock(
    subject, allocatedHours, confidenceMap, subjData,
    blockPrefix, cycleType, cycleOrder, cycleName
  );
  
  // Override dates for parallel execution
  const durationWeeks = block.duration_weeks;
  const endDate = dayjs(startDate).add(durationWeeks * 7 - 1, 'day');
  
  return {
    ...block,
    block_start_date: startDate,
    block_end_date: endDate.format('YYYY-MM-DD'),
    parallel_group_id: `${subjectCode}-group-${cycleOrder}` // Optional metadata
  };
}
```

### Phase 2: Integration Points

#### 2.1 Modified Block Creation Flow
```typescript
// Enhanced createBlocksForSubjects function
export async function createBlocksForSubjects(
  subjects: Subject[],
  totalHours: number,
  confidenceMap: Map<string, number>,
  blockPrefix: string,
  cycleType: CycleType,
  cycleOrder: number,
  cycleName: string,
  cycleStartDate: string,
  cycleEndDate: string,
  subjData?: SubjData,
  subjectApproach?: SubjectApproach  // NEW PARAMETER
): Promise<Block[]> {
  
  if (!subjectApproach || subjectApproach === 'SingleSubject') {
    // Use existing sequential block creation
    return await createSequentialBlocksForSubjects(
      subjects, totalHours, confidenceMap, blockPrefix,
      cycleType, cycleOrder, cycleName, cycleStartDate, cycleEndDate, subjData
    );
  }
  
  // Create parallel blocks for DualSubject/TripleSubject
  const context: ParallelSchedulingContext = {
    subjectApproach,
    cycleStartDate,
    cycleEndDate,
    totalHours
  };
  
  return await createParallelBlocks(subjects, context, confidenceMap, subjData, blockPrefix, cycleType, cycleOrder, cycleName);
}
```

#### 2.2 Foundation Cycle Integration
```typescript
// Enhanced planFoundationCycle function
export async function planFoundationCycle(
  logger: Logger,
  intake: StudentIntake,
  confidenceMap: Map<string, number>,
  startDate: dayjs.Dayjs,
  subjData: SubjData,
  allSubjects: any[],
  subjectApproach?: SubjectApproach  // NEW PARAMETER
): Promise<StudyCycle | undefined> {
  
  // Existing date logic unchanged
  const targetYear = parseInt(intake.target_year || '2026');
  const endDate = dayjs(`${targetYear - 1}-12-31`);
  
  if (startDate.isAfter(endDate)) {
    logger.logInfo('Foundation', 'Foundation cycle skipped: late start date');
    return undefined;
  }
  
  // Calculate total hours unchanged
  const totalFoundationHours = endDate.diff(startDate, 'weeks') * 7 * 8;
  
  // Create blocks WITH limited parallel support (first group parallel, rest sequential)
  const blocks = await createBlocksForSubjects(
    allSubjects,
    totalFoundationHours,
    confidenceMap,
    "Foundation",
    "FoundationCycle",
    1,
    "Foundation Cycle",
    startDate.format('YYYY-MM-DD'),
    endDate.format('YYYY-MM-DD'),
    subjData,
    subjectApproach  // Pass SubjectApproach to enable first group parallel
  );
  
  // Existing rescheduling logic unchanged
  const rescheduledBlocks = rescheduleBlocksToFitCycleTimeframe(startDate, endDate, blocks);
  
  const cycle: StudyCycle = {
    cycleId: `foundation-${Date.now()}`,
    cycleType: 'FoundationCycle',
    cycleIntensity: 'Moderate',
    cycleDuration: endDate.diff(startDate, 'weeks'),
    cycleStartWeek: 1,
    cycleOrder: 1,
    cycleName: 'Foundation Cycle',
    cycleBlocks: rescheduledBlocks.filter(block => block.actual_hours > 0)
  };
  
  // Log limited parallel block information
  if (subjectApproach && subjectApproach !== 'SingleSubject') {
    const parallelCount = {
      'DualSubject': 2,
      'TripleSubject': 3
    }[subjectApproach];
    logger.logInfo('Foundation', `Created ${parallelCount} parallel blocks for first group, remaining sequential with ${subjectApproach} approach`);
  }
  
  return cycle;
}
```

#### 2.3 Plan Generation Integration
```typescript
// Modified generateInitialPlan function (NO SIGNATURE CHANGES)
export async function generateInitialPlan(
  userId: string,
  _config: Config,
  _archetypeDetails: Archetype,
  intake: StudentIntake,
  logger0?: Logger
): Promise<{ plan: StudyPlan; logs: LogEntry[] }> {
  
  const logger = logger0 || makeLogger([]);
  
  // Determine SubjectApproach from existing parameters
  const prepMode = determinePrepMode(intake);
  const subjectApproach = getSubjectApproachForMode(prepMode, _archetypeDetails, intake);
  
  logger.logInfo('Engine', `Using ${subjectApproach} approach for plan generation`);
  
  // Existing subject loading unchanged
  const subjects = loadAllSubjects();
  const subjData: SubjData = { subjects, subtopics: loadSubtopics(subjects) };
  
  const startDate = dayjs(intake.start_date || new Date().toISOString().split('T')[0]);
  const confidenceMap = buildConfidenceMap(logger, intake, subjData);
  
  // FOUNDATION CYCLE with limited parallel block support (first group parallel)
  const foundationCycle = await planFoundationCycle(
    logger, intake, confidenceMap, startDate, subjData, 
    subjects, subjectApproach  // Pass SubjectApproach for first group parallel
  );
  
  // Other cycles remain unchanged (sequential blocks)
  const prelimsRevisionStartDate = calculatePrelimsRevisionStartDate(logger, startDate, startDate, intake.target_year);
  const prelimsRevisionCycle = await planPrelimsRevisionCycle(logger, intake, confidenceMap, prelimsRevisionStartDate, subjData);
  
  const prelimsRapidRevisionStartDate = calculatePrelimsRapidRevisionStartDate(logger, startDate, prelimsRevisionStartDate, intake.target_year);
  const prelimsRapidRevisionCycle = await planPrelimsRapidRevisionCycle(logger, intake, confidenceMap, prelimsRapidRevisionStartDate, subjData);
  
  const mainsRapidRevisionStartDate = calculateMainsRapidRevisionStartDate(logger, startDate, prelimsRapidRevisionStartDate, intake.target_year);
  const mainsRapidRevisionCycle = await planMainsRapidRevisionCycle(logger, intake, confidenceMap, mainsRapidRevisionStartDate, subjData);
  
  const plan = await buildFinalPlan(logger, intake, foundationCycle, prelimsRevisionCycle, prelimsRapidRevisionCycle, mainsRapidRevisionCycle);
  
  await sanityCheckPlan(plan, intake);
  return { plan, logs: logger.getLogs() };
}
```

### Phase 3: Validation Metrics

#### 3.1 Parallel Block Validation
```typescript
function validateParallelBlocks(blocks: Block[], expectedApproach: SubjectApproach): ValidationResult {
  const issues: string[] = [];
  const warnings: string[] = [];
  
  // Check if parallel blocks were created for DualSubject/TripleSubject
  const startDates = [...new Set(blocks.map(b => b.block_start_date))];
  const blocksPerStartDate = startDates.map(date => 
    blocks.filter(b => b.block_start_date === date).length
  );
  
  if (expectedApproach !== 'SingleSubject') {
    const maxParallelBlocks = Math.max(...blocksPerStartDate);
    const expectedParallelBlocks = {
      'DualSubject': 2,
      'TripleSubject': 3
    }[expectedApproach];
    
    if (maxParallelBlocks < expectedParallelBlocks) {
      warnings.push(`Expected at least ${expectedParallelBlocks} parallel blocks in first group but max concurrent is ${maxParallelBlocks}`);
    }
    
    // Ensure subsequent blocks are sequential
    const firstStartDate = Math.min(...startDates.map(d => new Date(d).getTime()));
    const firstGroupBlocks = blocks.filter(b => b.block_start_date === new Date(firstStartDate).toISOString().split('T')[0]);
    if (firstGroupBlocks.length !== expectedParallelBlocks) {
      warnings.push(`First parallel group expected ${expectedParallelBlocks} blocks but found ${firstGroupBlocks.length}`);
    }
  }
  
  // Validate parallel execution
  startDates.forEach((startDate, index) => {
    const blocksOnSameDate = blocks.filter(b => b.block_start_date === startDate);
    if (blocksOnSameDate.length > 1) {
      const subjectCodes = blocksOnSameDate.map(b => b.subjects[0]);
      logger.logInfo('Validation', `Parallel time period ${index + 1}: ${subjectCodes.join(', ')} start simultaneously on ${startDate}`);
    }
  });
  
  return { isValid: issues.length === 0, issues, warnings };
}
```

### Phase 4: Implementation Timeline

#### Week 1: Core Limited Parallel Block Logic
- Implement `groupSubjectsForParallelExecution()` function (first group parallel, rest sequential)
- Create `createParallelBlocks()` utility with limited parallel support 
- Add first-group parallel scheduling logic

#### Week 2: Block Creation Enhancement  
- Modify `createBlocksForSubjects()` to accept SubjectApproach parameter
- Create limited parallel block application logic (first group only)
- Add parallel group metadata to first group blocks

#### Week 3: Foundation Cycle Integration
- Update `planFoundationCycle()` to pass SubjectApproach parameter
- Integrate limited parallel block logic into foundation cycle planning
- Add limited parallel block logging and metrics

#### Week 4: Plan Generation Integration
- Modify `generateInitialPlan()` to determine and pass SubjectApproach
- Ensure limited parallel blocks flow through entire planning pipeline
- Add end-to-end validation for first-group parallel behavior

#### Week 5: Testing and Validation
- Generate test documents showing before/after limited parallel blocks
- Validate DualSubject/TripleSubject behavior in JSON outputs (first group parallel)
- Verify first group parallel blocks are created correctly, rest sequential

## Next Steps

1. **Requirements Validation**: ✅ Complete (this document)
2. **Implementation Planning**: ✅ Design parallel block strategy details (completed above)
3. **Testing Strategy**: Define validation approach for outputs  
4. **Development Phases**: ✅ Break down into implementable tasks (5-week timeline above)

---

*This document now provides detailed implementation strategy for parallel block-based DualSubject/TripleSubject functionality focusing on cycles and blocks.*
