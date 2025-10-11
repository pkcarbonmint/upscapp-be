# Subject Structure Analysis for Topic-Level Time Splitting

## Current Data Structure

### 1. **Subjects (`upsc_subjects.json`)**
```json
{
  "name": "History-Ancient",
  "code": "H01", 
  "baseline_hours": 25,
  "topics": [
    {
      "name": "Pre-historic cultures",
      "code": "H01/01",
      "priority": "Essential"
    }
  ]
}
```

### 2. **Topics (within subjects)**
- ✅ **Have**: `name`, `code`, `priority`
- ❌ **Missing**: `baselineHours` (not in JSON)
- ✅ **Have function**: `getTopicEstimatedHours()` based on priority

### 3. **Subtopics (`subtopics.json`)**
```json
{
  "topicCode": "B15",
  "subtopic": "Disasters", 
  "priorityBand": "A",
  "exam": "Mains"
}
```
- ✅ **Have**: `topicCode`, `subtopic`, `priorityBand`, `exam`
- ❌ **Missing**: `baselineHours` (not in data)

## Key Findings

### **Available Data Sources for Topic Hours:**

1. **Method 1: Topic Priority → Estimated Hours**
   ```typescript
   // From Types/Subjects.ts
   function getTopicEstimatedHours(topic: Topic): number {
     switch (topic.priority) {
       case 'EssentialTopic': return 10;
       case 'PriorityTopic': return 6;
       case 'SupplementaryTopic': return 3;
       case 'PeripheralTopic': return 1;
     }
   }
   ```

2. **Method 2: Subtopic Priority Bands**
   ```typescript
   // Subtopics have priorityBand: 'A' | 'B' | 'C' | 'D'
   // Band A = most important, Band D = least important
   ```

3. **Method 3: Equal Split** (our fallback)

### **Implementation Strategy:**

```typescript
function calculateTopicHours(
  subject: Subject, 
  subjectAllocatedHours: number,
  confidenceMultiplier: number
): Map<string, number> {
  const topicHoursMap = new Map<string, number>();
  
  // Method 1: Use priority-based estimated hours
  const topicsWithBaseline = subject.topics.map(topic => ({
    topic,
    baselineHours: getTopicEstimatedHours(topic) // 10/6/3/1 based on priority
  }));
  
  // Apply confidence multiplier
  const weightedTopics = topicsWithBaseline.map(({topic, baselineHours}) => ({
    topic,
    weightedHours: baselineHours * confidenceMultiplier
  }));
  
  // Calculate proportional allocation
  const totalWeightedHours = weightedTopics.reduce((sum, t) => sum + t.weightedHours, 0);
  
  weightedTopics.forEach(({topic, weightedHours}) => {
    const allocatedHours = Math.max(1, Math.floor(
      (subjectAllocatedHours * weightedHours) / totalWeightedHours
    ));
    topicHoursMap.set(topic.topicCode, allocatedHours);
  });
  
  return topicHoursMap;
}
```

## Next Implementation Steps

1. ✅ **Data structure analysis** - Complete
2. 🔄 **Create calculateTopicHours function** - Use priority-based estimation  
3. 🔄 **Integrate into createBlocksForSubjects** - Pass topicHoursMap to Block creation
4. 🔄 **Enhance task creation** - Use topic codes in task IDs and titles
5. 🔄 **Test with real subjects** - Verify H03 topics get more time than H01 topics

## Priority Assignment Strategy

The Topic-Level Time Splitting priority order:
1. **Primary**: Topic priority → estimated hours (Essential=10, Priority=6)

2. **Fallback**: Equal split among topics within subject

3. **Future**: Subtopic bands (A/B/C/D) for even finer granularity

Our implementation will focus on Method 1 (priority-based) since we have rich priority data available!






