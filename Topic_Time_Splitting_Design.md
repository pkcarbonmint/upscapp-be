# Topic-Level Time Splitting Design

## Problem Statement

The current `createBlocksForSubjects()` function allocates time at the subject level, but needs better topic-level distribution within each subject.

**Simple Solution**: Add topic-level baseline hours (optional) with fallback logic.

## Proposed Simple Approach

### 1. Topic-Level Hours Assignment Logic

```typescript
function calculateTopicHours(
  topics: Topic[],
  subjectAllocatedHours: number,
  confidenceMap: Map<string, number>
): Map<string, number> {
  
  const topicHours = new Map<string, number>();
  
  for (const topic of topics) {
    let topicHoursValue: number;
    
    // Method 1: Use topic-level baseline hours if available
    if (topic.baselineHours && topic.baselineHours > 0) {
      const confidenceMultiplier = confidenceMap.get(topic.topicCode) || 1.0;
      topicHoursValue = topic.baselineHours * confidenceMultiplier;
    }
    // Method 2: Calculate from subtopic baseline hours
    else if (topic.subtopics && topic.subtopics.length > 0) {
      const subtopicBaselineSum = topic.subtopics.reduce(
        (sum, subtopic) => sum + (subtopic.baselineHours || 0), 0
      );
      const averageConfidence = calculateAverageConfidence(topic.subtopics, confidenceMap);
      topicHoursValue = subtopicBaselineSum * averageConfidence;
    }
    // Method 3: Equal split (fallback)
    else {
      topicHoursValue = subjectAllocatedHours / topics.length; // Will be adjusted later
    }
    
    topicHours.set(topic.topicCode, topicHoursValue);
  }
  
  // If we have mixed calculation methods (some topics have hours, others defaulted to equal),
  // then normalize by taking the minimum approach for all topics
  if (hasMixedMethods(topicHours)) {
    return normalizeToEqualSplit(topicHours, subjectAllocatedHours);
  }
  
  // Otherwise, scale proportionally to fit within allocated hours
  return scaleToFitAllocation(topicHours, subjectAllocatedHours);
}

// Helper function to check if we have mixed calculation methods
function hasMixedMethods(topicHours: Map<string, number>): boolean {
  const values = Array.from(topicHours.values());
  const hasBaselineHours = values.some(hours => hours !== values[0]); // Different values
  
  // If all equal, then we used equal split (Method 3)
  // If different, then we have baseline hours (Method 1 or 2)
  return hasBaselineHours && values.includes(values[0]); // This indicates we have mixed
}

// Calculate average confidence for a topic's subtopics
function calculateAverageConfidence(
  subtopics: SubTopic[], 
  confidenceMap: Map<string, number>
): number {
  if (subtopics.length === 0) return 1.0;
  
  const confidenceSum = subtopics.reduce(
    (sum, subtopic) => sum + (confidenceMap.get(subtopic.code) || 1.0), 0
  );
  
  return confidenceSum / subtopics.length;
}

// Scale all topic hours proportionally to fit within allocated hours
function scaleToFitAllocation(
  topicHours: Map<string, number>, 
  targetHours: number
): Map<string, number> {
  const totalHours = Array.from(topicHours.values()).reduce((sum, hours) => sum + hours, 0);
  
  if (totalHours === 0) {
    // Fallback to equal split
    const equalHours = targetHours / topicHours.size;
    return new Map(Array.from(topicHours.entries()).map(([topicCode]) => [topicCode, equalHours]));
  }
  
  const scaleFactor = targetHours / totalHours;
  return new Map(
    Array.from(topicHours.entries()).map(([topicCode, hours]) => [
      topicCode, 
      Math.floor(hours * scaleFactor)
    ])
  );
}

// Normalize to equal split when we have mixed methods
function normalizeToEqualSplit(
  topicHours: Map<string, number>, 
  subjectAllocatedHours: number
): Map<string, number> {
  const equalHours = Math.floor(subjectAllocatedHours / topicHours.size);
  return new Map(
    Array.from(topicHours.keys()).map(topicCode => [topicCode, equalHours])
  );
}
```

### 2. Integration with Existing Code & Task Creation

```typescript
// MODIFY: Enhance existing createBlocksForSubjects() logic
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
  subjData?: any,
  subjectApproach?: SubjectApproach
): Promise<Block[]> {
  
  for (const subject of subjects) {
    const allocatedHours = Math.max(4, Math.floor(totalHours / subjects.length));
    
    // NEW: Calculate topic-level hours first
    const topicHoursMap = calculateTopicHours(subject.topics, allocatedHours, confidenceMap);
    
    // Process each topic separately with its allocated hours
    let allSubtopics: any[] = [];
    
    for (const topic of subject.topics) {
      const topicAllocatedHours = topicHoursMap.get(topic.topicCode) || 4;
      
      // Get subtopics for this topic
      let topicSubtopics: any[] = [];
      if (subjData && subjData.subtopics) {
        topicSubtopics = subjData.subtopics.subtopics.filter(
          (st: any) => st.topicCode === topic.topicCode
        );
      } else {
        topicSubtopics = topic.subtopics || [];
      }
      
      // Apply confidence factors to this topic's subtopics
      const adjustedSubtopics = topicSubtopics
        .map(subtopic => ({
          ...subtopic,
          adjustedHours: Math.ceil(subtopic.baselineHours * (confidenceMap.get(subtopic.code) || 1.0))
        }))
        .sort((a, b) => {
          const bandOrder: Record<string, number> = { 'A': 1, 'B': 2, 'C': 3, 'D': 4 };
          return bandOrder[a.band] - bandOrder[b.band];
        });
      
      // Trim subtopics to fit within topic's allocated hours
      const trimmedTopicSubtopics = trimSubtopicsToFit(adjustedSubtopics, topicAllocatedHours);
      
      // ADD TOPIC CONTEXT to each subtopic
      const topicAwareSubtopics = trimmedTopicSubtopics.map(st => ({
        ...st,
        topicCode: topic.topicCode,
        topicName: topic.topicName,
        topicAllocatedHours: topicAllocatedHours
      }));
      
      allSubtopics.push(...topicAwareSubtopics);
    }
    
    // Calculate actual hours from all subtopics across all topics
    const actualHours = allSubtopics.reduce((sum, st) => sum + st.adjustedHours, 0);
    
    // NEW: Pass topic-level hours to weekly plan creation
    const blockDurationWeeks = Math.ceil(actualHours / (8 * 7));
    
    const block: Block = {
      // ... existing block properties
      estimated_hours: allocatedHours,
      actual_hours: actualHours,
      weekly_plan: createTopicAwareWeeklyPlan(
        blockDurationWeeks, 
        cycleType, 
        subject.subjectCode,
        topicHoursMap  // NEW: Pass topic hours for task creation
      ),
      // Store topic-aware subtopics for reference
      topicSubtopics: allSubtopics
    };
  }
}

// NEW: Enhanced weekly plan creation with topic-level allocation
function createTopicAwareWeeklyPlan(
  durationWeeks: number,
  cycleType: CycleType,
  subjectCode: string,
  topicHoursMap: Map<string, number>
): WeeklyPlan[] {
  
  const weeklyPlans: WeeklyPlan[] = [];
  
  // Define study:practice:revision ratios based on cycle type (unchanged)
  const taskRatios: Record<CycleType, { study: number; practice: number; revision: number }> = {
    'FoundationCycle': { study: 0.7, practice: 0.15, revision: 0.15 },
    'PrelimsRevisionCycle': { study: 0.0, practice: 0.4, revision: 0.6 },
    'PrelimsRapidRevisionCycle': { study: 0.0, practice: 0.4, revision: 0.6 },
    'MainsRevisionCycle': { study: 0.0, practice: 0.4, revision: 0.6 },
    'MainsRapidRevisionCycle': { study: 0.0, practice: 0.4, revision: 0.6 }
  };
  
  const ratio = taskRatios[cycleType];
  
  // Convert topic hours map to sorted array for proportional distribution
  const topicEntries = Array.from(topicHoursMap.entries()).sort(([,a], [,b]) => b - a);
  const totalTopicHours = topicEntries.reduce((sum, [, hours]) => sum + hours, 0);
  
  for (let week = 1; week <= durationWeeks; week++) {
    const dailyPlans: DailyPlan[] = [];
    
    // Create 7 days with topic-aware task distribution
    for (let day = 1; day <= 7; day++) {
      const tasks: Task[] = [];
      
      // Create study tasks with topic-specified durations
      if (ratio.study > 0) {
        const dailyStudyHours = 8 * ratio.study;
        const topicStudyTasks = createTopicStudyTasks(
          topicEntries,
          dailyStudyHours,
          subjectCode,
          week,
          day
        );
        tasks.push(...topicStudyTasks);
      }
      
      // Create practice tasks with topic-specified durations
      if (ratio.practice > 0) {
        const dailyPracticeHours = 8 * ratio.practice;
        const topicPracticeTasks = createTopicPracticeTasks(
          topicEntries,
          dailyPracticeHours,
          subjectCode,
          week,
          day
        );
        tasks.push(...topicPracticeTasks);
      }
      
      // Create revision tasks with topic-specified durations
      if (ratio.revision > 0) {
        const dailyRevisionHours = 8 * ratio.revision;
        const topicRevisionTasks = createTopicRevisionTasks(
          topicEntries,
          dailyRevisionHours,
          subjectCode,
          week,
          day
        );
        tasks.push(...topicRevisionTasks);
      }
      
      dailyPlans.push({
        day: day,
        tasks: tasks
      });
    }
    
    weeklyPlans.push({
      week: week,
      daily_plans: dailyPlans
    });
  }
  
  return weeklyPlans;
}

// NEW: Create topic-specific study tasks
function createTopicStudyTasks(
  topicEntries: [string, number][],
  totalDailyHours: number,
  subjectCode: string,
  week: number,
  day: number
): Task[] {
  const tasks: Task[] = [];
  
  for (const [topicCode, topicHours] of topicEntries) {
    // Calculate hours for this topic today (proportionally based on total topics)
    const totalTopicHours = topicEntries.reduce((sum, [,hours]) => sum + hours, 0);
    const topicProportion = topicHours / totalTopicHours;
    const taskHours = Math.floor(totalDailyHours * topicProportion);
    
    if (taskHours > 0) {
      tasks.push({
        task_id: `study-${subjectCode}-${topicCode}-w${week}-d${day}`,
        humanReadableId: `Study ${topicCode} W${week}D${day}`,
        title2: `Study ${subjectCode} - ${topicCode} - Week ${week}, Day ${day}`,
        duration_minutes: taskHours * 60,
        topicCode: topicCode, // NEW: Track which topic this task belongs to
        taskType: 'study'
      });
    }
  }
  
  return tasks;
}

// NEW: Create topic-specific practice tasks (similar to study tasks)
function createTopicPracticeTasks(
  topicEntries: [string, number][],
  totalDailyHours: number,
  subjectCode: string,
  week: number,
  day: number
): Task[] {
  // Similar implementation to createTopicStudyTasks
  // But for practice tasks with different taskType
  return topicEntries.map(([topicCode, topicHours]) => {
    const totalTopicHours = topicEntries.reduce((sum, [,hours]) => sum + hours, 0);
    const topicProportion = topicHours / totalTopicHours;
    const taskHours = Math.floor(totalDailyHours * topicProportion);
    
    return taskHours > 0 ? {
      task_id: `practice-${subjectCode}-${topicCode}-w${week}-d${day}`,
      humanReadableId: `Practice ${topicCode} W${week}D${day}`,
      title2: `Practice ${subjectCode} - ${topicCode} - Week ${week}, Day ${day}`,
      duration_minutes: taskHours * 60,
      topicCode: topicCode,
      taskType: 'practice'
    } : null;
  }).filter(Boolean);
}

// NEW: Create topic-specific revision tasks (similar to practice tasks)
function createTopicRevisionTasks(
  topicEntries: [string, number][],
  totalDailyHours: number,
  subjectCode: string,
  week: number,
  day: number
): Task[] {
  // Similar implementation for revision tasks
  return topicEntries.map(([topicCode, topicHours]) => {
    const totalTopicHours = topicEntries.reduce((sum, [,hours]) => sum + hours, 0);
    const topicProportion = topicHours / totalTopicHours;
    const taskHours = Math.floor(totalDailyHours * topicProportion);
    
    return taskHours > 0 ? {
      task_id: `revision-${subjectCode}-${topicCode}-w${week}-d${day}`,
      humanReadableId: `Revision ${topicCode} W${week}D${day}`,
      title2: `Revision ${subjectCode} - ${topicCode} - Week ${week}, Day ${day}`,
      duration_minutes: taskHours * 60,
      topicCode: topicCode,
      taskType: 'revision'
    } : null;
  }).filter(Boolean);
}
```

### 3. Topic Data Structure Enhancement

```typescript
interface Topic {
  topicCode: string;
  topicName: string;
  baselineHours?: number;  // NEW: Optional topic-level baseline hours
  subtopics?: SubTopic[];
  // ... existing properties
}
```

## Implementation Plan

### Phase 1 (Week 1): Basic Topic Hours Calculation
- [ ] Implement `calculateTopicHours()` function
- [ ] Add helper functions for confidence averaging, scaling, normalization
- [ ] Add support for optional `topic.baselineHours`

### Phase 2 (Week 1): Integration
- [ ] Modify `createBlocksForSubjects()` to use topic-level allocation
- [ ] Process each topic separately with its allocated hours
- [ ] Maintain existing subtopic-level confidence adjustment

### Phase 3 (Week 2): Testing & Configuration
- [ ] Test with subjects that have `topic.baselineHours` set
- [ ] Test with subjects that only have subtopic-level hours
- [ ] Test mixed scenarios (some topics with baseline, others without)
- [ ] Add configuration flag to enable/disable topic-level allocation

## Configuration Options

```typescript
interface TopicAllocationConfig {
  enableTopicLevelAllocation: boolean;  // Enable topic-level allocation
  fallbackStrategy: 'proportional' | 'equal';  // What to do when topic info is missing
}
```

## Expected Benefits

1. **More Accurate Allocation**: Respects topic-specific baseline hours when available
2. **Graceful Degradation**: Falls back to subtopic calculation → equal split → proportional scaling
3. **Confidence Aware**: Applies confidence factors to topic-level hours
4. **Backward Compatible**: Works with existing data structures (optional fields)
5. **Simple Logic**: Clear priority order (topic hours → subtopic sum → equal split → minimum)

This approach is much simpler while providing intelligent topic-level time allocation with proper fallbacks!