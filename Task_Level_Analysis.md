# Task Level Analysis - Do We Have Topic-Level Tasks?

## Current Status: ❌ NO Topic-Level Tasks

Looking at the generated JSON files, the current task creation is still **generic at the subject level**:

### Current Task Creation Pattern:

```
{
  "task_id": "study-H01-w1-d1",
  "humanReadableId": "Study H01 W1D1", 
  "title2": "Study H01 - Week 1, Day 1",
  "duration_minutes": 300
}
```

### What We SHOULD Have (Based on Our Design):

```typescript
// Topic-specific tasks like this:
{
  "task_id": "study-H03-H0301-w1-d1",           // study-H03-[topicCode]-w1-d1
  "humanReadableId": "Study H0301 W1D1",         // Study [topicCode] W1D1  
  "title2": "Study H03 - H0301 - Week 1, Day 1", // Study H03 - [topicCode] - Week 1, Day 1
  "duration_minutes": 1200,                      // Longer for H03 since it gets more hours
}
```

## Issue Analysis:

### 1. **Subject-Level Time Allocation: ✅ WORKING**
- H03 gets 77 hours vs H01 gets 19 hours (4x difference from baseline_hours)
- Our fix is working correctly

### 2. **Task Creation: ❌ NOT IMPLEMENTED**
- Tasks are still generic `study-H01-w1-d1` instead of `study-H01-H0101-w1-d1`
- Tasks don't reflect the topic-level time differences
- All subjects get same task duration (300 minutes = 5 hours)

## Root Cause:

Looking at `/laex/upscapp-be/study-planner/helios-ts/src/engine/cycle-utils.ts` lines 392-400:

```typescript
// CURRENT: Generic subject-level task creation
const studyHours = Math.floor(8 * ratio.study);  // Fixed 8 hours/day logic
if (studyHours > 0) {
  tasks.push({
    task_id: `study-${subjectCode}-w${week}-d${day}`,      // Generic subject title
    humanReadableId: `Study ${subjectCode} W${week}D${day}`, // Generic subject title
    title2: `Study ${subjectCode} - Week ${week}, Day ${day}`, // Generic subject title
    duration_minutes: studyHours * 60                           // Fixed duration
  });
}
```

This creates **fixed-duration tasks** regardless of subject allocation, missing:
1. **Topic-level granularity** (no topicCode in task_id)
2. **Proportional task duration** (300 minutes for all subjects)
3. **Topic-specific titles**

## What's Missing:

### 1. **Topic-Level Task IDs**
Instead of: `study-H01-w1-d1`
Should be: `study-H01-H0101-w1-d1` (subject-topic-week-day)

### 2. **Proportional Task Duration** 
Instead of: Fixed 300 minutes (5 hours) for all subjects
Should be: H03 tasks longer than H01 tasks (reflecting 77h vs 19h allocation)

### 3. **Topic-Specific Task Titles**
Instead of: `"Study H01 - Week 1, Day 1"`
Should be: `"Study H01 - Ancient India - Week 1, Day 1"` (with actual topic name)

## Next Steps:

We need to implement the **Topic-Level Time Splitting** from our design document:

1. **Calculate topic-level hours** within each subject
2. **Create topic-specific task IDs** with topic codes
3. **Distribute task time proportionally** based on topic allocation
4. **Use actual topic names** in task titles

The subject-level allocation is working perfectly, but we haven't implemented the topic-level task creation yet. This is exactly what our Topic-Level Time Splitting design was meant to address!






