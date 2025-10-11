# Topic/Subtopic Hours Integration Plan

## Problem Statement

The current weekly planning system has a critical gap: **topic-level and subtopic-level hour allocations are calculated but never used in task creation**. This results in:

1. **Unused `_topicHoursMap`**: The `createEnhancedWeeklyPlan` function receives topic-level hour allocations but ignores them
2. **Generic task creation**: Tasks use fixed priority-based hours instead of calculated topic/subtopic hours
3. **Missing granularity**: Subtopic-level hour calculations (with proper band distribution) are never utilized
4. **Inconsistent task IDs**: Tasks don't reflect the specific topics being studied

## Current State Analysis

### ✅ What's Working
- `calculateTopicHours()` properly calculates topic-level allocations based on confidence and priority
- `SubjectLoader.loadSubtopics()` correctly distributes hours across subtopic bands (A: 50%, B: 30%, C: 15%, D: 5%)
- Topic confidence mapping and hour calculations are accurate

### ❌ What's Broken
- `createEnhancedWeeklyPlan()` ignores `_topicHoursMap` parameter
- `OneWeekPlan.ts` uses generic `getTopicEstimatedHours()` instead of calculated hours
- Subtopic hours are never used in task assignment
- Task IDs are generic (`study-H01-w1-d1`) instead of topic-specific (`study-H01-H0101-w1-d1`)

## Solution Architecture

### Phase 1: Fix Topic Hours Integration
**Goal**: Make `createEnhancedWeeklyPlan` actually use the `_topicHoursMap`

#### 1.1 Modify `createEnhancedWeeklyPlan` Function
- **File**: `study-planner/helios-ts/src/engine/cycle-utils.ts`
- **Changes**:
  - Remove underscore prefix from `_topicHoursMap` parameter
  - Pass `topicHoursMap` to `OneWeekPlan.ts` functions
  - Create topic-aware mock student intake that includes topic hours

#### 1.2 Update `OneWeekPlan.ts` Interface
- **File**: `study-planner/helios-ts/src/engine/OneWeekPlan.ts`
- **Changes**:
  - Modify `createPlanForOneWeek` to accept `topicHoursMap` parameter
  - Update `generateStudyTasks` to use provided topic hours instead of `getTopicEstimatedHours()`
  - Ensure topic-specific task creation with proper hour allocation

### Phase 2: Integrate Subtopic Hours
**Goal**: Use subtopic-level hour calculations for precise task assignment

#### 2.1 Enhance Task Creation Logic
- **File**: `study-planner/helios-ts/src/engine/OneWeekPlan.ts`
- **Changes**:
  - Modify `generateStudyTasks` to accept subtopic hours data
  - Create subtopic-aware task distribution within topics
  - Use subtopic `baselineHours` for precise duration calculations

#### 2.2 Update Data Flow
- **File**: `study-planner/helios-ts/src/engine/cycle-utils.ts`
- **Changes**:
  - Pass subtopic data from `SubjectLoader` to weekly plan creation
  - Ensure subtopic hours are available in task generation context

### Phase 3: Improve Task Granularity
**Goal**: Create topic-specific and subtopic-specific tasks

#### 3.1 Enhanced Task IDs and Titles
- **Current**: `study-H01-w1-d1` (generic)
- **Target**: `study-H01-H0101-w1-d1` (topic-specific)
- **Advanced**: `study-H01-H0101-ST001-w1-d1` (subtopic-specific)

#### 3.2 Task Duration Precision
- Use calculated topic hours instead of fixed priority-based hours
- Distribute subtopic hours proportionally within weekly tasks
- Ensure total task hours match calculated allocations

## Implementation Plan

### Step 1: Core Integration (Priority: High)
**Estimated Time**: 2-3 hours

1. **Modify `createEnhancedWeeklyPlan`**:
   ```typescript
   async function createEnhancedWeeklyPlan(
     durationWeeks: number,
     cycleType: CycleType,
     subjectCode: string,
     topicHoursMap: Map<string, number> // Remove underscore
   ): Promise<WeeklyPlan[]>
   ```

2. **Update `OneWeekPlan.ts` interface**:
   ```typescript
   export async function createPlanForOneWeek(
     blockIndex: number,
     blkSubjects: Subject[],
     studentIntake: StudentIntake,
     archetype: any,
     config: Config,
     weekNum: number,
     blockDurationWeeks: number,
     logger: Logger,
     topicHoursMap?: Map<string, number> // Add optional parameter
   ): Promise<WeeklyPlan>
   ```

3. **Modify `generateStudyTasks`**:
   ```typescript
   async function generateStudyTasks(
     studyHoursPerSubject: number,
     studentIntake: StudentIntake,
     archetype: any,
     studentProfile: any,
     config: Config,
     subject: Subject,
     weekNum: number,
     blockDurationWeeks: number,
     logger: Logger,
     topicHoursMap?: Map<string, number> // Add parameter
   ): Promise<Task[]>
   ```

### Step 2: Subtopic Integration (Priority: Medium)
**Estimated Time**: 3-4 hours

1. **Load subtopic data in `createEnhancedWeeklyPlan`**:
   ```typescript
   const subtopicsResult = SubjectLoader.loadSubtopics([subject]);
   const subtopicsByTopic = new Map<string, Subtopic[]>();
   // Group subtopics by topic code
   ```

2. **Pass subtopic data to task generation**:
   ```typescript
   const tasks = await generateStudyTasks(
     studyHoursPerSubject,
     studentIntake,
     archetype,
     studentProfile,
     config,
     subject,
     weekNum,
     blockDurationWeeks,
     logger,
     topicHoursMap,
     subtopicsByTopic // Add subtopic data
   );
   ```

3. **Create subtopic-aware task distribution**:
   - Calculate subtopic hours within each topic
   - Distribute weekly study time based on subtopic allocations
   - Create tasks with subtopic-specific durations

### Step 3: Enhanced Task Granularity (Priority: Low)
**Estimated Time**: 2-3 hours

1. **Update task ID generation**:
   ```typescript
   // Topic-specific task ID
   const taskId = `study-${subjectCode}-${topicCode}-w${week}-d${day}`;
   
   // Subtopic-specific task ID (optional)
   const subtopicTaskId = `study-${subjectCode}-${topicCode}-${subtopicCode}-w${week}-d${day}`;
   ```

2. **Update task titles**:
   ```typescript
   const title = `Study: ${topic.topicName}`;
   const subtopicTitle = `Study: ${topic.topicName} - ${subtopic.name}`;
   ```

3. **Ensure duration accuracy**:
   - Use calculated topic hours for task duration
   - Distribute subtopic hours proportionally
   - Validate total hours match allocations

## Testing Strategy

### Unit Tests
1. **Test `createEnhancedWeeklyPlan` with topic hours**:
   - Verify `topicHoursMap` is passed to `OneWeekPlan.ts`
   - Ensure topic-specific tasks are created
   - Validate task durations match topic allocations

2. **Test subtopic integration**:
   - Verify subtopic hours are used in task creation
   - Test band-based hour distribution (A: 50%, B: 30%, C: 15%, D: 5%)
   - Ensure total subtopic hours match topic hours

### Integration Tests
1. **End-to-end weekly plan generation**:
   - Test complete flow from `createBlocksForSubjects` to task creation
   - Verify topic and subtopic hours are properly utilized
   - Validate task IDs and titles reflect topic/subtopic specificity

2. **Hour allocation validation**:
   - Ensure calculated hours match actual task durations
   - Test edge cases (single topic, no subtopics, etc.)
   - Validate confidence-based hour adjustments

## Success Criteria

### Phase 1 Success
- [ ] `_topicHoursMap` is no longer unused in `createEnhancedWeeklyPlan`
- [ ] Tasks use calculated topic hours instead of generic priority hours
- [ ] Topic-specific task IDs are generated (`study-H01-H0101-w1-d1`)
- [ ] Task durations reflect topic-level hour allocations

### Phase 2 Success
- [ ] Subtopic hours are used in task creation
- [ ] Band-based hour distribution is respected (A: 50%, B: 30%, C: 15%, D: 5%)
- [ ] Tasks can be created at subtopic level when appropriate
- [ ] Total task hours match calculated subtopic allocations

### Phase 3 Success
- [ ] Task IDs include topic codes (`study-H01-H0101-w1-d1`)
- [ ] Task titles reflect specific topics being studied
- [ ] Subtopic-specific tasks are created when beneficial
- [ ] Hour allocation accuracy is maintained across all levels

## Risk Assessment

### Low Risk
- **Interface changes**: Adding optional parameters to existing functions
- **Backward compatibility**: Existing functionality remains intact
- **Incremental implementation**: Changes can be made in phases

### Medium Risk
- **Data flow complexity**: Ensuring topic/subtopic data is available at all levels
- **Performance impact**: Additional data processing for subtopic calculations
- **Testing complexity**: More complex test scenarios with topic/subtopic combinations

### Mitigation Strategies
1. **Incremental rollout**: Implement changes in phases with testing at each step
2. **Fallback mechanisms**: Maintain existing logic as fallback for edge cases
3. **Comprehensive testing**: Test all combinations of topics, subtopics, and confidence levels
4. **Performance monitoring**: Monitor task generation performance with new logic

## Timeline

### Week 1: Core Integration
- **Day 1-2**: Implement Phase 1 (Topic Hours Integration)
- **Day 3-4**: Testing and debugging Phase 1
- **Day 5**: Code review and refinement

### Week 2: Subtopic Integration
- **Day 1-2**: Implement Phase 2 (Subtopic Integration)
- **Day 3-4**: Testing and debugging Phase 2
- **Day 5**: Integration testing with Phase 1

### Week 3: Enhancement and Polish
- **Day 1-2**: Implement Phase 3 (Enhanced Task Granularity)
- **Day 3-4**: Comprehensive testing and validation
- **Day 5**: Documentation and deployment preparation

## Dependencies

### Required Changes
1. **`cycle-utils.ts`**: Modify `createEnhancedWeeklyPlan` function
2. **`OneWeekPlan.ts`**: Update interfaces and task generation logic
3. **`Subjects.ts`**: Potentially add helper functions for topic/subtopic hour calculations

### External Dependencies
1. **`SubjectLoader.ts`**: Ensure subtopic data is available and properly formatted
2. **Test files**: Update existing tests and add new test cases
3. **Documentation**: Update API documentation for changed interfaces

## Conclusion

This plan addresses the core issue of unused topic/subtopic hours in weekly planning while maintaining system stability and backward compatibility. The phased approach allows for incremental implementation and testing, reducing risk while ensuring all calculated hour allocations are properly utilized in task creation.

The implementation will result in:
- **Accurate task durations** based on calculated topic/subtopic hours
- **Topic-specific task identification** for better tracking and management
- **Proper utilization** of the sophisticated hour calculation logic already in place
- **Enhanced granularity** in study plan generation for better student experience
